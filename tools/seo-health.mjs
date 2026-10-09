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
  const re = new RegExp("\\b" + name + "\\s*=\\s*([\\\"'])(.*?)\\1", "i");
  return (tag.match(re) || [])[2] || "";
}
function metaContent(html, key) {
  const tags = html.match(/<meta\\b[^>]*>/gi) || [];
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
    if (!r.status || r.status < 200 || r.status >= 300) {
      fail(`${path} returned HTTP ${r.status}`);
      continue;
    }
    if (!/text\\/html/i.test(r.contentType)) fail(`${path} is not served as HTML (${r.contentType})`);
    const title = (r.body.match(/<title\\b[^>]*>([\\s\\S]*?)<\\/title>/i) || [])[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const description = metaContent(r.body, "description");
    const canonicalTag = (r.body.match(/<link\\b(?=[^>]*\\brel=[\\\"']canonical[\\\"'])[^>]*>/i) || [])[0] || "";
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
    if (!/schema\\.org/i.test(r.body) || !/application\\/ld\\+json/i.test(r.body)) warn(`${path} has no visible JSON-LD structured data`);
    report.push({ path, status: r.status, title: title.slice(0, 90), descriptionLength: description.length, canonical });
    console.log(`PASS: ${path} HTTP ${r.status}; title=${title.length}; description=${description.length}; canonical=${Boolean(canonical)}`);
  } catch (e) { fail(`${path} fetch failed: ${e.message}`); }
}

for (const path of ["/robots.txt", "/sitemap.xml", "/news-sitemap.xml", "/rss.xml"]) {
  try {
    const r = await get(path);
    if (r.status !== 200) { fail(`${path} returned HTTP ${r.status}`); continue; }
    if (path === "/robots.txt") {
      if (!/Sitemap:\\s*https:\\/\\/btmedya\\.com\\.tr\\/sitemap\\.xml/i.test(r.body)) fail("robots.txt does not declare sitemap.xml");
      if (!/Disallow:\\s*\\/admin\\//i.test(r.body)) fail("robots.txt does not disallow /admin/");
      if (!/Disallow:\\s*\\/api\\//i.test(r.body)) fail("robots.txt does not disallow /api/");
      console.log("PASS: /robots.txt HTTP 200; sitemap/admin/API directives checked");
    } else if (path === "/sitemap.xml") {
      if (!/urlset/i.test(r.body) || !/<loc>/i.test(r.body)) fail("sitemap.xml is not a populated URL set");
      const urls = [...r.body.matchAll(/<loc>(.*?)<\\/loc>/gi)].map(m => m[1].trim());
      if (urls.length < 10) fail(`sitemap.xml contains only ${urls.length} URLs`);
      for (const u of urls) {
        try {
          const parsed = new URL(u);
          if (parsed.hostname !== new URL(origin).hostname) fail(`sitemap contains off-domain URL: ${u}`);
          if (/\\/(admin|api)(\\/|$)/i.test(parsed.pathname)) fail(`sitemap contains private URL: ${u}`);
        } catch { fail(`sitemap contains invalid URL: ${u}`); }
      }
      console.log(`PASS: /sitemap.xml HTTP 200; ${urls.length} URLs`);
    } else if (path === "/news-sitemap.xml") {
      if (!/urlset/i.test(r.body)) fail("news-sitemap.xml is not a URL set");
      const count = (r.body.match(/<news:news>/gi) || []).length;
      if (!count) warn("news-sitemap.xml has no recent news entries; check that published news is updated within Google's news-sitemap window");
      console.log(`PASS: /news-sitemap.xml HTTP 200; recent news entries=${count}`);
    } else {
      if (!/<rss\\b/i.test(r.body) || !/<channel>/i.test(r.body)) fail("rss.xml is not a valid RSS feed");
      console.log("PASS: /rss.xml HTTP 200; RSS markers checked");
    }
  } catch (e) { fail(`${path} fetch failed: ${e.message}`); }
}

console.log(JSON.stringify({ origin, checkedAt: new Date().toISOString(), pagesChecked: report.length, warnings, failures }, null, 2));
if (failures.length) process.exit(1);
