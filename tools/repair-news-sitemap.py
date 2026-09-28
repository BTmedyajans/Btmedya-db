from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, register_namespace, tostring

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

# NEDEN ELLE YAZIM: ElementTree bos kok ogesini "<urlset ... />" olarak
# kapatir ve kullanilmayan news: ad alanini hic bildirmez. Worker eski
# surumde "</urlset>" arayip ekleme yaptigi icin bu bicim haritayi hep bos
# birakiyordu. Canli harita artik Worker'da D1'den uretilir; bu dosya
# yalniz yedek olarak her zaman acik/kapali etiketle ve iki ad alaniyla yazilir.
govde = "".join(tostring(u, encoding="unicode") + "\n" for u in root)
OUT.write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
    'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n'
    + govde + "</urlset>\n",
    encoding="utf-8",
)
print(f"news_items={len(items)} cutoff={cutoff.isoformat()}")
