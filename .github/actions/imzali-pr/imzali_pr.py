#!/usr/bin/env python3
"""Publish generated files as signed commits on a controlled automation branch.

By default, writes to the canonical repository's configured automation branch.
For cross-repository publishing, set PUBLISH_REPO to a fork that is writable by
the configured token. The fork branch is based on the exact checked-out commit
and a PR is opened back into the canonical repository. No protected canonical
branch is force-updated.

Only Python standard-library modules are required. Never print token values.
"""
from __future__ import annotations

import base64
import json
import os
import shlex
import subprocess
import sys
import urllib.error
import urllib.request
from urllib.parse import quote, urlencode

API = os.environ.get("GITHUB_API_URL", "https://api.github.com")
GRAPHQL = os.environ.get("GITHUB_GRAPHQL_URL", "https://api.github.com/graphql")
REPO = os.environ["GITHUB_REPOSITORY"]
TOKEN = os.environ["GH_TOKEN"]
DAL = os.environ["DAL"].strip("/")
PUBLISH_REPO = os.environ.get("PUBLISH_REPO", REPO).strip()
YOLLAR = shlex.split(os.environ["YOLLAR"])
MESAJ = os.environ.get("MESAJ", "chore: otomasyon çıktısı")
PR_BASLIK = os.environ.get("PR_BASLIK", MESAJ)
PR_GOVDE = os.environ.get("PR_GOVDE", "")
RUN_ID = os.environ.get("GITHUB_RUN_ID", "").strip()
RUN_SHA = os.environ.get("GITHUB_SHA", "").strip()
PARCA_BAYT = 3 * 1024 * 1024


def istek(yontem: str, url: str, govde: dict | None = None) -> tuple[int, dict]:
    veri = None if govde is None else json.dumps(govde).encode()
    req = urllib.request.Request(url, data=veri, method=yontem, headers={
        "Authorization": "Bearer " + TOKEN,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as yanit:
            ham = yanit.read()
            return yanit.status, json.loads(ham) if ham else {}
    except urllib.error.HTTPError as hata:
        ham = hata.read().decode("utf-8", "replace")[:1200]
        try:
            return hata.code, json.loads(ham)
        except ValueError:
            return hata.code, {"message": ham}


def degisenler() -> tuple[list[str], list[str]]:
    cikti = subprocess.run(
        ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", *YOLLAR],
        check=True, capture_output=True,
    ).stdout.decode()
    eklenen, silinen = [], []
    parcalar = cikti.split("\0")
    i = 0
    while i < len(parcalar):
        kayit = parcalar[i]
        i += 1
        if not kayit:
            continue
        durum, yol = kayit[:2], kayit[3:]
        if "R" in durum or "C" in durum:
            eski = parcalar[i]
            i += 1
            if "R" in durum:
                silinen.append(eski)
        (silinen if "D" in durum else eklenen).append(yol)
    return eklenen, silinen


def current_sha() -> str:
    sha = subprocess.run(
        ["git", "rev-parse", "HEAD"], check=True, capture_output=True, text=True
    ).stdout.strip()
    if not sha:
        sys.exit("::error::Mevcut kaynak commit'i belirlenemedi; yayın durduruldu.")
    return sha


def repo_bilgisi(repository: str) -> dict:
    code, payload = istek("GET", f"{API}/repos/{repository}")
    if code != 200 or payload.get("full_name", "").lower() != repository.lower():
        sys.exit(f"::error::Yayın deposu doğrulanamadı ({repository}, HTTP {code}).")
    return payload


def find_existing_cross_pr(prefix: str) -> str | None:
    """Reuse only a cross-fork branch whose open PR targets this canonical main."""
    params = urlencode({"state": "open", "base": "main", "per_page": 100})
    code, items = istek("GET", f"{API}/repos/{REPO}/pulls?{params}")
    if code != 200 or not isinstance(items, list):
        sys.exit(f"::error::Açık PR'lar doğrulanamadı (HTTP {code}); yeni dal oluşturulmadı.")
    for item in items:
        head = item.get("head") or {}
        repo = head.get("repo") or {}
        branch = head.get("ref") or ""
        if repo.get("full_name", "").lower() == PUBLISH_REPO.lower() and (
            branch == prefix or branch.startswith(prefix + "-")
        ):
            print(f"Açık otomasyon PR'ı #{item.get('number')} yeniden kullanılacak: {branch}")
            return branch
    return None


def unique_branch(prefix: str, sha: str) -> str:
    # A fresh suffix avoids writing into stale/diverged fork automation branches.
    suffix = RUN_ID or RUN_SHA[:12] or sha[:12]
    suffix = "".join(ch for ch in suffix if ch.isalnum() or ch in "-_")
    return f"{prefix}-{suffix}"


def dal_hazirla(taban: str) -> tuple[str, str]:
    """Return (branch_name, expected_head_oid), never force-reset a branch."""
    if PUBLISH_REPO == REPO:
        ref_url = f"{API}/repos/{REPO}/git/ref/heads/{quote(DAL, safe='')}"
        code, payload = istek("GET", ref_url)
        if code == 200:
            oid = (payload.get("object") or {}).get("sha")
            if oid:
                print(f"Var olan otomasyon dalı korunuyor: {DAL} @ {oid[:12]}")
                return DAL, oid
            sys.exit(f"::error::{DAL} dalı bulundu ancak commit SHA alınamadı.")
        if code != 404:
            sys.exit(f"::error::{DAL} dalı okunamadı (HTTP {code}): {payload.get('message', '')}")

        code, payload = istek("POST", f"{API}/repos/{REPO}/git/refs",
                              {"ref": f"refs/heads/{DAL}", "sha": taban})
        if code == 201:
            print(f"Otomasyon dalı oluşturuldu: {DAL} @ {taban[:12]}")
            return DAL, taban
        if code in (404, 422):
            check, existing = istek("GET", ref_url)
            oid = ((existing.get("object") or {}).get("sha") or "") if check == 200 else ""
            if oid:
                print(f"Eşzamanlı çalıştırmanın dalı kullanılıyor: {DAL} @ {oid[:12]}")
                return DAL, oid
        sys.exit(f"::error::{DAL} dalı hazırlanamadı (HTTP {code}): "
                 f"{payload.get('message', '')}. Mevcut dallar değiştirilmedi.")

    # Fork publication needs a write-capable token and a repository that is an
    # actual fork of the canonical repository. Fail closed; no silent fallback.
    target = repo_bilgisi(PUBLISH_REPO)
    if not target.get("fork") or (target.get("parent") or {}).get("full_name", "").lower() != REPO.lower():
        sys.exit(f"::error::{PUBLISH_REPO} kanonik deponun doğrulanmış fork'u değil.")
    permissions = target.get("permissions") or {}
    if permissions.get("push") is not True:
        sys.exit(f"::error::{PUBLISH_REPO} için tokenın push izni yok. "
                 "BTMEDYA_AUTOMATION_TOKEN yetkisini kontrol edin; gizli değeri loglamayın.")

    check, commit = istek("GET", f"{API}/repos/{PUBLISH_REPO}/commits/{taban}")
    if check != 200 or commit.get("sha") != taban:
        sys.exit(f"::error::Kaynak commit {taban} yayın fork'unda doğrulanamadı; "
                 "eski fork geçmişine dayalı otomatik yayın yapılmadı.")

    existing = find_existing_cross_pr(DAL)
    branch = existing or unique_branch(DAL, taban)
    ref_url = f"{API}/repos/{PUBLISH_REPO}/git/ref/heads/{quote(branch, safe='')}"
    check, current = istek("GET", ref_url)
    if existing:
        if check != 200:
            sys.exit(f"::error::Mevcut PR dalı okunamadı ({branch}, HTTP {check}).")
        oid = (current.get("object") or {}).get("sha")
        if not oid:
            sys.exit(f"::error::Mevcut PR dalında commit SHA yok ({branch}).")
        return branch, oid

    if check == 200:
        sys.exit(f"::error::Benzersiz otomasyon dalı zaten var: {branch}. "
                 "Mevcut dalı sıfırlamadım; sonraki çalıştırmada yeni GITHUB_RUN_ID kullanın.")
    if check != 404:
        sys.exit(f"::error::Fork dalı kontrol edilemedi (HTTP {check}).")

    code, payload = istek(
        "POST", f"{API}/repos/{PUBLISH_REPO}/git/refs",
        {"ref": f"refs/heads/{branch}", "sha": taban},
    )
    if code != 201:
        sys.exit(f"::error::Fork otomasyon dalı oluşturulamadı (HTTP {code}): "
                 f"{payload.get('message', '')}. Kanonik repo ve mevcut dallar değiştirilmedi.")
    print(f"Fork otomasyon dalı oluşturuldu: {PUBLISH_REPO}:{branch} @ {taban[:12]}")
    return branch, taban


def commit_at(onceki: str, branch: str, eklenen: list[str], silinen: list[str], baslik: str) -> str:
    sorgu = """mutation($girdi: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $girdi) { commit { oid url } } }"""
    girdi = {
        "branch": {"repositoryNameWithOwner": PUBLISH_REPO, "branchName": branch},
        "message": {"headline": baslik},
        "expectedHeadOid": onceki,
        "fileChanges": {
            "additions": [
                {"path": yol, "contents": base64.b64encode(open(yol, "rb").read()).decode()}
                for yol in eklenen
            ],
            "deletions": [{"path": yol} for yol in silinen],
        },
    }
    code, payload = istek("POST", GRAPHQL, {"query": sorgu, "variables": {"girdi": girdi}})
    commit = ((payload.get("data") or {}).get("createCommitOnBranch") or {}).get("commit")
    if code != 200 or not commit:
        errors = "; ".join(item.get("message", "") for item in payload.get("errors", [])) or payload.get("message", "")
        sys.exit(f"::error::İmzalı commit yazılamadı (HTTP {code}): {errors}")
    print(f"İmzalı commit: {commit['oid'][:12]} ({len(eklenen)} dosya, {len(silinen)} silme)")
    return commit["oid"]


def pr_ac(branch: str) -> None:
    owner = PUBLISH_REPO.split("/")[0]
    params = urlencode({"state": "open", "base": "main", "per_page": 100})
    code, open_prs = istek("GET", f"{API}/repos/{REPO}/pulls?{params}")
    if code != 200 or not isinstance(open_prs, list):
        sys.exit(f"::error::Kanonik depodaki açık PR'lar doğrulanamadı (HTTP {code}).")
    for item in open_prs:
        head = item.get("head") or {}
        repo = head.get("repo") or {}
        if (repo.get("full_name", "").lower() == PUBLISH_REPO.lower()
                and head.get("ref") == branch and (item.get("base") or {}).get("ref") == "main"):
            print(f"Açık kanonik PR #{item.get('number')} mevcut: {item.get('html_url')}")
            return

    head_value = f"{owner}:{branch}" if PUBLISH_REPO != REPO else branch
    request = {"title": PR_BASLIK, "head": head_value, "base": "main", "body": PR_GOVDE}
    if PUBLISH_REPO != REPO:
        request["head_repo"] = PUBLISH_REPO
    code, payload = istek("POST", f"{API}/repos/{REPO}/pulls", request)
    if code == 201:
        print(f"Kanonik PR açıldı: #{payload['number']} {payload.get('html_url', '')}")
    else:
        print(f"::error::Kanonik PR açılamadı (HTTP {code}: {payload.get('message', '')}). "
              f"İmzalı çıktı {PUBLISH_REPO}:{branch} dalında kaldı; main değiştirilmedi.")
        sys.exit(1)


def main() -> None:
    added, deleted = degisenler()
    if not added and not deleted:
        print("Yazılacak değişiklik yok; akış güncel.")
        return
    source_sha = current_sha()
    branch, head_oid = dal_hazirla(source_sha)
    chunks, chunk, size = [], [], 0
    for path in added:
        size_now = os.path.getsize(path)
        if chunk and size + size_now > PARCA_BAYT:
            chunks.append(chunk)
            chunk, size = [], 0
        chunk.append(path)
        size += size_now
    if chunk:
        chunks.append(chunk)
    if not chunks:
        chunks = [[]]
    for number, paths in enumerate(chunks, 1):
        headline = MESAJ if len(chunks) == 1 else f"{MESAJ} ({number}/{len(chunks)})"
        head_oid = commit_at(head_oid, branch, paths, deleted if number == 1 else [], headline)
    pr_ac(branch)


if __name__ == "__main__":
    main()
