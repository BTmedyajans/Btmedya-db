#!/usr/bin/env python3
"""Repair missing clean cover counterparts referenced by homepage/news cards.

Only regenerates files for planned covers whose base image exists but whose
"-foto.webp" sibling is absent. Uses the same Pillow-based canonical generator
as editorial workflows; it does not download substitute imagery or change
article metadata.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "public" / "data" / "haber-kapak-plani.json"
COVERS = ROOT / "public" / "assets" / "haber-kapak"
GENERATOR = ROOT / "tools" / "haber-kapagi.py"


def main() -> int:
    for required in (PLAN, COVERS, GENERATOR):
        if not required.exists():
            print(f"Required cover repair input is missing: {required.relative_to(ROOT)}", file=sys.stderr)
            return 2

    try:
        plan = json.loads(PLAN.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Could not read cover plan: {exc}", file=sys.stderr)
        return 2
    if not isinstance(plan, list):
        print("Cover plan must be a JSON array.", file=sys.stderr)
        return 2

    slugs: list[str] = []
    invalid = []
    for item in plan:
        if not isinstance(item, dict):
            continue
        slug = item.get("slug")
        if not isinstance(slug, str) or not slug or Path(slug).name != slug or "/" in slug or "\\" in slug:
            if slug:
                invalid.append(str(slug))
            continue
        base = COVERS / f"{slug}.webp"
        clean = COVERS / f"{slug}-foto.webp"
        if base.is_file() and not clean.is_file():
            slugs.append(slug)

    if invalid:
        print("Unsafe slug(s) in cover plan: " + ", ".join(invalid[:5]), file=sys.stderr)
        return 2
    if not slugs:
        print("Clean cover counterparts verified; no repair needed.")
        return 0

    print(f"Repairing {len(slugs)} missing clean cover counterpart(s): " + ", ".join(slugs[:8]))
    cmd = [sys.executable, str(GENERATOR), *slugs]
    proc = subprocess.run(cmd, cwd=ROOT, check=False)
    if proc.returncode:
        print(f"Canonical cover generator failed with exit code {proc.returncode}.", file=sys.stderr)
        return proc.returncode

    still_missing = [slug for slug in slugs if not (COVERS / f"{slug}-foto.webp").is_file()]
    if still_missing:
        print("Clean cover counterpart(s) still missing: " + ", ".join(still_missing[:10]), file=sys.stderr)
        return 1
    print(f"Clean cover repair passed ({len(slugs)} counterpart(s) generated and verified).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
