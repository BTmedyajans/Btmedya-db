#!/usr/bin/env python3
import json, os, sys
from google.oauth2 import service_account
from googleapiclient.discovery import build

PROPERTY = os.environ.get("GOOGLE_PROPERTY", "https://btmedya.com.tr/").strip()
raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
if not raw:
    raise SystemExit("GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON is not configured.")

info = json.loads(raw)
creds = service_account.Credentials.from_service_account_info(
    info,
    scopes=["https://www.googleapis.com/auth/webmasters"],
)
service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

feeds = [
    "https://btmedya.com.tr/sitemap.xml",
    "https://btmedya.com.tr/news-sitemap.xml",
]
for feed in feeds:
    service.sitemaps().submit(siteUrl=PROPERTY, feedpath=feed).execute()
    print(f"SUBMITTED {feed}")

urls = [
    "https://btmedya.com.tr/",
    "https://btmedya.com.tr/haberler/",
    "https://btmedya.com.tr/hizmetler/",
    "https://btmedya.com.tr/portfoy/buse-tuncay/",
]
for url in urls:
    result = service.urlInspection().index().inspect(
        body={"inspectionUrl": url, "siteUrl": PROPERTY}
    ).execute()
    inspection = result.get("inspectionResult", {})
    index = inspection.get("indexStatusResult", {})
    print(json.dumps({
        "url": url,
        "verdict": inspection.get("verdict"),
        "coverageState": index.get("coverageState"),
        "robotsTxtState": index.get("robotsTxtState"),
        "indexingState": index.get("indexingState"),
        "pageFetchState": index.get("pageFetchState"),
    }, ensure_ascii=False))

print("Google Search Console automation completed.")
