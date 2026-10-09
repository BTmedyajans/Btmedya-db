#!/usr/bin/env node
/**
 * BTMEDYA live SEO smoke test.
 * No third-party dependencies; safe for scheduled GitHub Actions.
 */
const origin = (process.env.BTMEDYA_ORIGIN || "https://btmedya.com.tr").replace(/\/$/, "");
const pages = ["/", "/haberler/", "/hizmetler/", "/sosyal-medya/", "/video-produksiyon/", "/hakkimizda/", "/iletisim/"];
const failures = [];
const warnings = [];
const report = [];

function fail(message) { failures.push(message); console.error("FAIL:", message); }
function warn(message) { warnings.push(message); console.warn("WARN:", message); }
function attr(tag, name) {
  const re = new RegExp("\\b" + name + "\\s*=\\s*([\\x22\\x27])(.*?)\\1", "i");
  return (tag.match(re) || [])[2] || "";
}
function metaContent(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find(t => attr(t, "name").toLowerCase() === key.toLowerCase());
  return tag ? attr(tag, "content").trim() : "";
}
async function get(path) {
  const url = origin + path;
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "BTMEDYA-SEO-Health/1.0 (+https://btmedya.com.tr/)" },
    signal: AbortSignal.timeout(20000)
  });
  const body = await res.text();
  return { url, status: res.status, contentType: res.headers.get("content-type") || "", robots: res.headers.get("x-robots-tag") || "", body, finalUrl: res.url };
}

for (const path of pages) {
  try {
    const r = await get(path);
    if (r.status < 200 || r.status >= 300) {
      fail(`${path} returned HTTP ${r.status}`);
      continue;
    }
    if (!/text\/html/i.test(r.contentType)) fail(`${path} is not served as HTML (${r.contentType})`);
    const title = (r.body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const description = metaContent(r.body, "description");
    const linkTags = r.body.match(/<link\b[^>]*>/gi) || [];
    const canonicalTag = linkTags.find(t => attr(t, "rel").toLowerCase() === "canonical") || "";
    const canonical = attr(canonicalTag, "href");
    const robots = metaContent(r.body, "robots") + " " + r.robots;
    if (title.length < 12) fail(`${path} missing/short title`);
    if (description.length < 40) fail(`${path} missing/short meta description`);
    if (!canonical) fail(`${path} missing canonical URL`);
    else {
      try {
        const c = new URL(canonical, origin);
        if (c.hostname !== new URL(origin).hostname) fail(`${path} canonical points off-site: ${canonical}`);
        if (c.search || c.hash) warn(`${path} canonical contains query/hash: ${canonical}`);
      } catch { fail(`${path} has invalid canonical URL: ${canonical}`); }
    }
    if (/noindex/i.test(robots)) fail(`${path} is marked noindex`);
    if (!/schema\.org/i.test(r.body) || !/application\/ld\+json/i.test(r.body)) warn(`${path} has no visible JSON-LD structured data`);
    report.push({ path, status: r.status, title: title.slice(0, 90), descriptionLength: description.length, canonical });
    console.log(`PASS: ${path} HTTP ${r.status}; title=${title.length}; description=${description.length}; canonical=${Boolean(canonical)}`);
  } catch (e) { fail(`${path} fetch failed: ${e.message}`); }
}

let newsSitemapBody = "";
let rssBody = "";
for (const path of ["/robots.txt", "/sitemap.xml", "/news-sitemap.xml", "/rss.xml"]) {
  try {
    const r = await get(path);
    if (r.status !== 200) { fail(`${path} returned HTTP ${r.status}`); continue; }
    if (path === "/robots.txt") {
      if (!/Sitemap:\s*https:\/\/btmedya\.com\.tr\/sitemap\.xml/i.test(r.body)) fail("robots.txt does not declare sitemap.xml");
      if (!/Disallow:\s*\/admin\//i.test(r.body)) fail("robots.txt does not disallow /admin/");
      if (!/Disallow:\s*\/api\//i.test(r.body)) fail("robots.txt does not disallow /api/");
      console.log("PASS: /robots.txt HTTP 200; sitemap/admin/API directives checked");
    } else if (path === "/sitemap.xml") {
      if (!/urlset/i.test(r.body) || !/<loc>/i.test(r.body)) fail("sitemap.xml is not a populated URL set");
      const urls = [...r.body.matchAll(/<loc>(.*?)<\/loc>/gi)].map(m => m[1].trim());
      if (urls.length < 10) fail(`sitemap.xml contains only ${urls.length} URLs`);
      for (const u of urls) {
        try {
          const parsed = new URL(u);
          if (parsed.hostname !== new URL(origin).hostname) fail(`sitemap contains off-domain URL: ${u}`);
          if (/\/(admin|api)(\/|$)/i.test(parsed.pathname)) fail(`sitemap contains private URL: ${u}`);
        } catch { fail(`sitemap contains invalid URL: ${u}`); }
      }
      console.log(`PASS: /sitemap.xml HTTP 200; ${urls.length} URLs`);
    } else if (path === "/news-sitemap.xml") {
      newsSitemapBody = r.body;
      if (!/<urlset\b/i.test(r.body)) fail("news-sitemap.xml is not a URL set");
      if (!/xmlns:news=["']http:\/\/www\.google\.com\/schemas\/sitemap-news\/0\.9["']/i.test(r.body)) fail("news-sitemap.xml is missing the Google News namespace");
      const count = (r.body.match(/<news:news>/gi) || []).length;
      console.log("PASS: /news-sitemap.xml HTTP 200; recent news entries=" + count);
    } else {
      rssBody = r.body;
      if (!/<rss\b/i.test(r.body) || !/<channel>/i.test(r.body)) fail("rss.xml is not a valid RSS feed");
      console.log("PASS: /rss.xml HTTP 200; RSS markers checked");
    }
  } catch (e) { fail(`${path} fetch failed: ${e.message}`); }
}

// D1'de yakın zamanda yayımlanan haber varsa News sitemap ve RSS bununla eşleşmeli.
try {
  const health = await get("/api/health");
  if (health.status !== 200) fail(`/api/health returned HTTP ${health.status}`);
  else {
    let h;
    try { h = JSON.parse(health.body); } catch { fail("/api/health did not return JSON"); }
    if (h && h.ok !== true) fail("/api/health ok is not true");
    if (h && h.cms !== true) fail("/api/health CMS/D1 is not ready");
    if (h && h.r2 !== true) fail("/api/health R2 is not ready");
    if (h && h.admin !== true) fail("/api/health admin authentication is not configured");
    if (h && h.readiness?.metricool?.userToken !== true) fail("Metricool automation is not ready: Worker secret METRICOOL_USER_TOKEN is missing");
    console.log(`PASS: /api/health HTTP ${health.status}; cms=${Boolean(h?.cms)} r2=${Boolean(h?.r2)} admin=${Boolean(h?.admin)} metricoolToken=${Boolean(h?.readiness?.metricool?.userToken)}`);
  }
} catch (e) { fail(`/api/health fetch failed: ${e.message}`); }

// Admin kapısı: login/Access yönlendirmesi beklenir; 404 veya sunucu hatası kabul edilmez.
try {
  const response = await fetch(origin + "/admin/", {
    redirect: "manual",
    headers: { "user-agent": "BTMEDYA-SEO-Health/1.0" },
    signal: AbortSignal.timeout(15000)
  });
  const location = response.headers.get("location") || "";
  if (response.status === 404 || response.status >= 500) fail(`/admin/ returned HTTP ${response.status}`);
  else if (response.status >= 300 && response.status < 400 && !location) fail("/admin/ redirect has no Location header");
  else if (response.status === 200) {
    const body = await response.text();
    if (!/admin|login|noindex/i.test(body)) fail("/admin/ returned 200 without admin/login/noindex evidence");
  }
  console.log("PASS: /admin/ gate HTTP " + response.status + "; redirect=" + Boolean(location));
} catch (e) { fail(`/admin/ fetch failed: ${e.message}`); }

// Giriş filmi gerçek dosya olarak canlıda açılabilmeli; küçük Range isteğiyle tüm filmi indirmeyiz.
try {
  const videoPath = "/assets/media/web/state-produksiyon.mp4?v=20261008-archive-hero";
  const response = await fetch(origin + videoPath, {
    headers: { "user-agent": "BTMEDYA-SEO-Health/1.0", "range": "bytes=0-0" },
    signal: AbortSignal.timeout(20000)
  });
  const type = response.headers.get("content-type") || "";
  if (![200, 206].includes(response.status)) fail(`hero video HTTP ${response.status}`);
  if (!/^video\\//i.test(type)) fail(`hero video has unexpected content-type: ${type}`);
  console.log("PASS: hero video HTTP " + response.status + "; content-type=" + type);
} catch (e) { fail(`hero video fetch failed: ${e.message}`); }

try {
  const api = await get("/api/news?limit=100&ozet=1");
  if (api.status !== 200) fail(`/api/news HTTP ${api.status}`);
  else {
    let data;
    try { data = JSON.parse(api.body); } catch { fail("/api/news did not return JSON"); }
    const items = Array.isArray(data?.items) ? data.items : [];
    const now = Date.now();
    const recent = items.filter(n => {
      const t = Date.parse(n.published_at || "");
      return Number.isFinite(t) && t <= now + 3600000 && t >= now - 48 * 3600000;
    }).sort((a,b) => Date.parse(b.published_at || "") - Date.parse(a.published_at || ""));
    const latest = recent[0];
    const newsCount = (newsSitemapBody.match(/<news:news>/gi) || []).length;
    if (latest && newsCount === 0) fail("published news is within 48 hours but news-sitemap.xml has zero entries");
    if (latest && !rssBody.includes(latest.slug)) fail(`RSS does not include the latest recent published news: ${latest.slug}`);
    if (!items.length) warn("/api/news returned no items");
    console.log(`PASS: /api/news HTTP ${api.status}; items=${items.length}; recent=${recent.length}; news-sitemap=${newsCount}`);
  }
} catch (e) { fail(`/api/news fetch failed: ${e.message}`); }

console.log(JSON.stringify({ origin, checkedAt: new Date().toISOString(), pagesChecked: report.length, warnings, failures }, null, 2));
if (failures.length) process.exit(1);
