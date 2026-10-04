from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITEMAP = ROOT / "public/sitemap.xml"
ARCHIVE = ROOT / "public/data/haberler.json"
MONTHS = {
    "ocak": 1, "şubat": 2, "mart": 3, "nisan": 4, "mayıs": 5, "haziran": 6,
    "temmuz": 7, "ağustos": 8, "eylül": 9, "ekim": 10, "kasım": 11, "aralık": 12,
}

def parse_original(value: str | None) -> str | None:
    if not value:
        return None
    m = re.fullmatch(r"\s*(\d{1,2})\s+([^\s]+)\s+(\d{4})\s*", value, re.I)
    if not m:
        return None
    month = MONTHS.get(m.group(2).casefold())
    if not month:
        return None
    try:
        return date(int(m.group(3)), month, int(m.group(1))).isoformat()
    except ValueError:
        return None

def valid_date(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return value[:10] if re.fullmatch(r"\d{4}-\d{2}-\d{2}(?:T.*)?", value) else None
    except Exception:
        return None

archive = json.loads(ARCHIVE.read_text(encoding="utf-8"))
by_slug = {n.get("slug"): n for n in archive if n.get("slug")}
ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
tree = ET.parse(SITEMAP)
root = tree.getroot()
fixed = 0
for url in root.findall("sm:url", ns):
    loc = url.find("sm:loc", ns)
    lastmod = url.find("sm:lastmod", ns)
    if loc is None or lastmod is None:
        continue
    m = re.search(r"/haberler/([^/?#]+)", loc.text or "")
    if not m:
        continue
    item = by_slug.get(m.group(1))
    candidate = valid_date((item or {}).get("published_at")) or parse_original((item or {}).get("original_date"))
    if candidate and lastmod.text != candidate:
        lastmod.text = candidate
        fixed += 1
    elif not candidate:
        url.remove(lastmod)
        fixed += 1

ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
tree.write(SITEMAP, encoding="utf-8", xml_declaration=True)
print(f"fixed_news_lastmod={fixed}")
