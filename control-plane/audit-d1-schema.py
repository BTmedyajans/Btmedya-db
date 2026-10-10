#!/usr/bin/env python3
"""Read-only Cloudflare D1/Worker readiness audit for BTMEDYA production.

This script never writes to D1, changes Worker settings, or modifies secrets.
It exits non-zero when the application schema is behind the migrations in Git.
Missing third-party credentials are reported as warnings without exposing values.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.cloudflare.com/client/v4"
EXPECTED_MIGRATIONS = [f"00{i:02d}_{name}.sql" for i, name in [
    (22, "client_site_os"),
    (23, "direct_social"),
    (24, "social_workspace_scope"),
    (25, "native_social_job_metadata"),
    (26, "content_taxonomy"),
    (27, "client_project_delivery"),
    (28, "site_os_schema_integrity"),
    (29, "news_taxonomy_backfill"),
]]
REQUIRED_TABLES = ("client_projects", "client_publications", "client_reports")
REQUIRED_INDEXES = (
    "idx_client_sites_client",
    "idx_client_sites_health",
    "idx_client_site_checks_site",
    "idx_client_site_jobs_due",
    "idx_client_projects_client",
    "idx_client_projects_due",
    "idx_client_content_project",
    "idx_client_publications_client",
)
BLOCKERS: list[str] = []
WARNINGS: list[str] = []


def request_json(method: str, path: str, payload: dict | None = None) -> dict:
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not token:
        raise RuntimeError("CLOUDFLARE_API_TOKEN is not configured in GitHub Actions.")
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Authorization": "Bearer " + token, "Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"Cloudflare API returned HTTP {exc.code}: {detail}") from exc
    if not result.get("success", False):
        raise RuntimeError("Cloudflare API error: " + json.dumps(result.get("errors", []), ensure_ascii=False))
    return result


def d1_query(account_id: str, database_id: str, sql: str) -> list[dict]:
    payload = request_json(
        "POST",
        f"/accounts/{account_id}/d1/database/{database_id}/query",
        {"sql": sql},
    )
    result = payload.get("result") or []
    if not result or not isinstance(result, list):
        return []
    return result[0].get("results") or []


def mark(condition: bool, message: str, *, warning: bool = False) -> None:
    if condition:
        print("PASS: " + message)
    elif warning:
        print("WARN: " + message)
        WARNINGS.append(message)
    else:
        print("BLOCKER: " + message)
        BLOCKERS.append(message)


def main() -> int:
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    database_id = os.environ.get("CLOUDFLARE_D1_DATABASE_ID", "").strip()
    worker_name = os.environ.get("CLOUDFLARE_WORKER_NAME", "btmedya-db").strip()
    if not account_id or not database_id:
        print("BLOCKER: CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_D1_DATABASE_ID is missing.")
        return 2

    print("BTMEDYA PRODUCTION D1 AUDIT — read-only")
    try:
        tables = {r["name"] for r in d1_query(
            account_id, database_id,
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        )}
        mark("d1_migrations" in tables, "D1 migration ledger exists")
        if "d1_migrations" not in tables:
            print("BLOCKER: Cannot continue without d1_migrations.")
            return 1

        applied = {r["name"] for r in d1_query(
            account_id, database_id,
            "SELECT name FROM d1_migrations ORDER BY name",
        )}
        missing_migrations = [m for m in EXPECTED_MIGRATIONS if m not in applied]
        mark(not missing_migrations,
             "migrations 0022–0029 are recorded as applied" if not missing_migrations
             else "pending migration ledger entries: " + ", ".join(missing_migrations))

        for table in REQUIRED_TABLES:
            mark(table in tables, f"required table exists: {table}")

        columns = {r["name"] for r in d1_query(
            account_id, database_id, "SELECT name FROM pragma_table_info('client_content')"
        )}
        mark("project_id" in columns, "client_content.project_id column exists")

        for table, expected_parent in (
            ("client_sites", "client_workspaces"),
            ("client_site_checks", "client_sites"),
            ("client_site_jobs", "client_sites"),
        ):
            if table not in tables:
                mark(False, f"Site OS table exists: {table}")
                continue
            parents = {r.get("table") for r in d1_query(
                account_id, database_id, f"SELECT \"table\" FROM pragma_foreign_key_list('{table}')"
            )}
            mark(expected_parent in parents, f"{table} foreign key references {expected_parent}")

        existing_indexes = {r["name"] for r in d1_query(
            account_id, database_id, "SELECT name FROM sqlite_master WHERE type='index'"
        )}
        missing_indexes = [index for index in REQUIRED_INDEXES if index not in existing_indexes]
        mark(not missing_indexes,
             "required Site OS/project indexes exist" if not missing_indexes
             else "missing indexes: " + ", ".join(missing_indexes))

        if "news" in tables and "content_taxonomy" in tables:
            rows = d1_query(
                account_id, database_id,
                "SELECT COUNT(*) AS total, "
                "SUM(CASE WHEN t.entity_id IS NOT NULL THEN 1 ELSE 0 END) AS mapped, "
                "SUM(CASE WHEN t.entity_id IS NULL THEN 1 ELSE 0 END) AS unmapped "
                "FROM news n LEFT JOIN content_taxonomy t "
                "ON t.entity_type='news' AND t.entity_id=n.slug "
                "WHERE COALESCE(n.slug,'') <> ''",
            )
            metrics = rows[0] if rows else {"total": 0, "mapped": 0, "unmapped": 0}
            total = int(metrics.get("total") or 0)
            mapped = int(metrics.get("mapped") or 0)
            unmapped = int(metrics.get("unmapped") or 0)
            mark(unmapped == 0, f"news taxonomy mapped: {mapped}/{total}; unmapped: {unmapped}")
        else:
            mark(False, "news and content_taxonomy tables are available for backfill verification")

        # Secret metadata contains names/types only; no secret values are requested or printed.
        try:
            secret_response = request_json(
                "GET", f"/accounts/{account_id}/workers/scripts/{worker_name}/secrets"
            )
            secret_names = {item.get("name") for item in (secret_response.get("result") or [])}
            for secret_name in ("METRICOOL_USER_TOKEN", "WINDSOR_API_KEY"):
                mark(secret_name in secret_names, f"Worker secret is configured: {secret_name}", warning=True)
        except Exception as exc:
            WARNINGS.append("Worker secret metadata could not be checked: " + str(exc))
            print("WARN: Worker secret metadata could not be checked: " + str(exc))

    except Exception as exc:
        detail = str(exc)
        if ("7403" in detail or "not authorized to access this service" in detail
                or "CLOUDFLARE_API_TOKEN is not configured" in detail):
            print("BLOCKER: GitHub Actions D1 audit credential is missing or lacks D1 access.")
            print("ACTION REQUIRED: Add GitHub Actions secret CLOUDFLARE_D1_API_TOKEN with Cloudflare Account > D1 > Read permission for the configured account.")
            print("The existing deploy/diagnostic token is not necessarily authorized for D1. No production data was modified by this audit.")
        else:
            print("BLOCKER: Audit could not complete: " + detail)
        return 2

    print(f"SUMMARY: {len(BLOCKERS)} blocker(s), {len(WARNINGS)} warning(s).")
    if BLOCKERS:
        print("No production data or Worker configuration was modified.")
        return 1
    print("No blocking schema drift found. No production data or Worker configuration was modified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
