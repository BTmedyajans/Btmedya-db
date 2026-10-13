#!/usr/bin/env python3
"""Fail when public source files reference missing local /assets files."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1] / "public"
args = set(sys.argv[1:])
allow_generated_hero = "--allow-generated-hero" in args
require_generated_hero = "--require-generated-hero" in args
generated_hero = {
    "assets/media/web/btmedya-hero-mobile-poster.jpg",
    "assets/media/web/btmedya-hero-mobile.mp4",
    "assets/media/web/btmedya-hero-mobile.webm",
    "assets/media/web/btmedya-hero-web-poster.jpg",
    "assets/media/web/btmedya-hero-web.mp4",
    "assets/media/web/btmedya-hero-web.webm",
}
refs = set()
for source in root.rglob("*"):
    if source.suffix.lower() not in {".html", ".css", ".js", ".xml", ".txt"}:
        continue
    text = source.read_text(errors="ignore")
    refs.update(
        match.lstrip("/")
        for match in re.findall(r"/assets/[A-Za-z0-9_./-]+", text)
        if "..." not in match
    )

missing = sorted(
    path for path in refs
    if not (root / path).exists()
    and not (allow_generated_hero and path in generated_hero)
)
if require_generated_hero:
    missing.extend(path for path in sorted(generated_hero) if not (root / path).exists())
    missing = sorted(set(missing))
if missing:
    print("Missing local production assets:")
    print("\n".join(missing))
    sys.exit(1)

required = ["assets/media/web/showreel-action.mp4", "assets/media/web/hero-story-poster.jpg"]
missing_required = [path for path in required if not (root / path).exists()]
if missing_required:
    print("Missing required production media:")
    print("\n".join(missing_required))
    sys.exit(1)

print(f"Production asset references OK ({len(refs)} local asset references checked).")
