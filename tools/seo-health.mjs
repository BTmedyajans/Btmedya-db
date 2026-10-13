#!/usr/bin/env node
/**
 * BTMEDYA live SEO smoke test.
 * No third-party dependencies; safe for scheduled GitHub Actions.
 */
const origin = (process.env.BTMEDYA_ORIGIN || "https://btmedya.com.tr").replace(/\/$/, "");
const pages = ["/", "/haberler/", "/hizmetler/", "/sosyal-medya/", "/video-produksiyon/", "/ai-lab/", "/hakkimizda/", "/iletisim/"];
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
    if (path === "/") {
      if (title !== "Balıkesir Haber, Medya ve Prodüksiyon | BTMEDYA") fail(`homepage live title mismatch: ${title || "(empty)"}`);
      else console.log("PASS: homepage live title matches the current UX/SEO release");
      const h1Matches = [...r.body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
      const h1Text = (h1Matches[0]?.[1] || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
      if (h1Matches.length !== 1 || !h1Text.includes("balıkesir") || !h1Text.includes("medya") || !h1Text.includes("prodüksiyon")) fail(`homepage live H1 missing or mismatched: ${h1Text || "(empty)"}`);
      else console.log("PASS: homepage live H1 matches the local news/media/production intent");
      const responsiveLink = (r.body.match(/<link\\b[^>]*href=["']([^"']*btmedya-responsive-experience-v1\\.css(?:\\?[^"']*)?)["'][^>]*>/i) || [])[1] || "";
      if (!responsiveLink) fail("homepage live HTML is missing the responsive experience stylesheet");
      else console.log("PASS: responsive experience stylesheet is linked in live HTML: " + responsiveLink);
    }
    report.push({ path, status: r.status, title: title.slice(0, 90), descriptionLength: description.length, canonical });
    console.log(`PASS: ${path} HTTP ${r.status}; title=${title.length}; description=${description.length}; canonical=${Boolean(canonical)}`);
  } catch (e) { fail(`${path} fetch failed: ${e.message}`); }
}

try {
  const home = await get("/");
  const homeLink = (home.body.match(/<link\\b[^>]*href=["']([^"']*btmedya-responsive-experience-v1\\.css(?:\\?[^"']*)?)["'][^>]*>/i) || [])[1] || "";
  if (!homeLink) throw new Error("Homepage does not declare the responsive experience stylesheet");
  const cssPath = new URL(homeLink, origin).pathname + new URL(homeLink, origin).search;
  const r = await get(cssPath);
  if (r.status !== 200 || !/text\/css/i.test(r.contentType)) fail(`responsive experience stylesheet unavailable: HTTP ${r.status} ${r.contentType}`);
  else if (!/@media\s*\(min-width:\s*1024px\)/i.test(r.body) || !/@media\s*\(max-width:\s*760px\)/i.test(r.body)) fail("live stylesheet is missing dedicated desktop/mobile rules");
  else console.log("PASS: responsive experience stylesheet HTTP 200; desktop/mobile rules checked: " + cssPath);
} catch (e) { fail(`responsive experience stylesheet fetch failed: ${e.message}`); }

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
      if (!/urlset/i.test(r.body)) fail("news-sitemap.xml is not a URL set");
      const count = (r.body.match(/<news:news>/gi) || []).length;
      if (!count) warn("news-sitemap.xml has no recent news entries; check that published news is updated within Google's news-sitemap window");
      console.log(`PASS: /news-sitemap.xml HTTP 200; recent news entries=${count}`);
    } else {
      if (!/<rss\b/i.test(r.body) || !/<channel>/i.test(r.body)) fail("rss.xml is not a valid RSS feed");
      console.log("PASS: /rss.xml HTTP 200; RSS markers checked");
    }
  } catch (e) { fail(`${path} fetch failed: ${e.message}`); }
}

console.log(JSON.stringify({ origin, checkedAt: new Date().toISOString(), pagesChecked: report.length, warnings, failures }, null, 2));
if (failures.length) process.exit(1);
