from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, ElementTree, register_namespace

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "public/data/haberler.json"
OUT = ROOT / "public/news-sitemap.xml"

# Google News sitemap: yalnızca gerçek published_at tarihli son 2 gün.
now = datetime.now(timezone.utc)
cutoff = now - timedelta(days=2)
archive = json.loads(ARCHIVE.read_text(encoding="utf-8"))
items = []
for n in archive:
    raw = n.get("published_at")
    if not raw:
        continue
    try:
        published = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        continue
    if published < cutoff or published > now + timedelta(days=1):
        continue
    items.append((published, n))
items.sort(reverse=True, key=lambda pair: pair[0])

register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
register_namespace("news", "http://www.google.com/schemas/sitemap-news/0.9")
root = Element("{http://www.sitemaps.org/schemas/sitemap/0.9}urlset")
for published, n in items[:1000]:
    url = SubElement(root, "{http://www.sitemaps.org/schemas/sitemap/0.9}url")
    SubElement(url, "{http://www.sitemaps.org/schemas/sitemap/0.9}loc").text = "https://btmedya.com.tr/haberler/" + str(n["slug"])
    news = SubElement(url, "{http://www.google.com/schemas/sitemap-news/0.9}news")
    publication = SubElement(news, "{http://www.google.com/schemas/sitemap-news/0.9}publication")
    SubElement(publication, "{http://www.google.com/schemas/sitemap-news/0.9}name").text = "BTMEDYA"
    SubElement(publication, "{http://www.google.com/schemas/sitemap-news/0.9}language").text = "tr"
    SubElement(news, "{http://www.google.com/schemas/sitemap-news/0.9}publication_date").text = published.isoformat()
    SubElement(news, "{http://www.google.com/schemas/sitemap-news/0.9}title").text = str(n.get("title", "")).strip()

ElementTree(root).write(OUT, encoding="utf-8", xml_declaration=True)
print(f"news_items={len(items)} cutoff={cutoff.isoformat()}")
