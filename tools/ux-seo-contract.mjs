#!/usr/bin/env node
/* Static source-level contract for BTMEDYA homepage responsive UX and SEO. */
import fs from "node:fs";

const index = fs.readFileSync("public/index.html", "utf8");
const css = fs.readFileSync("public/btmedya-responsive-experience-v1.css", "utf8");
const mobileHome = fs.readFileSync("public/mobile-home-experience.css", "utf8");
const offerForm = fs.readFileSync("public/teklif-al/index.html", "utf8");
const offerScript = fs.readFileSync("public/teklif-al.js", "utf8");
const failures = [];
const ok = (message) => console.log("UX_SEO_OK:", message);
const fail = (message) => { failures.push(message); console.error("UX_SEO_FAIL:", message); };

const titleMatch = index.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
const title = (titleMatch ? titleMatch[1] : "").replace(/<[^>]+>/g, "").trim();
const descriptionTag = (index.match(/<meta[^>]+name=["']description["'][^>]*>/i) || [])[0] || "";
const descriptionMatch = descriptionTag.match(/content=["']([^"']*)["']/i);
const description = descriptionMatch ? descriptionMatch[1] : "";
const canonicalTag = (index.match(/<link[^>]+rel=["']canonical["'][^>]*>/i) || [])[0] || "";
const canonicalMatch = canonicalTag.match(/href=["']([^"']*)["']/i);
const canonical = canonicalMatch ? canonicalMatch[1] : "";
const h1s = [...index.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
const h1 = (h1s[0] ? h1s[0][1] : "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

if (title.length >= 30 && title.length <= 65 && /balıkesir/i.test(title) && /btmedya/i.test(title)) ok("homepage title is branded and locally descriptive");
else fail("homepage title should be 30-65 characters and include Balıkesir + BTMEDYA");
if (description.length >= 100 && description.length <= 170 && /balıkesir/i.test(description) && /prodüksiyon/i.test(description)) ok("homepage meta description targets local news and production services");
else fail("homepage meta description should be 100-170 characters and include local/service intent");
if (canonical === "https://btmedya.com.tr/") ok("homepage canonical is consistent");
else fail("homepage canonical must point to https://btmedya.com.tr/");
if (/name=["']viewport["'][^>]*viewport-fit=cover/i.test(index)) ok("mobile viewport and safe-area meta present");
else fail("viewport-fit=cover missing");
if (/name=["']robots["'][^>]*index,follow/i.test(index)) ok("homepage indexing directive allows discovery");
else fail("homepage must allow index and follow");
const h1Normalized = h1.toLocaleLowerCase("tr-TR");
if (h1s.length === 1 && h1Normalized.includes("balıkesir") && h1Normalized.includes("medya") && h1Normalized.includes("prodüksiyon")) ok("one semantic homepage H1 covers local news/media and production");
else fail("homepage needs one meaningful H1 mentioning Balıkesir, media and production");
if (index.includes("/btmedya-responsive-experience-v1.css?v=20261013-1")) ok("responsive stylesheet linked");
else fail("responsive experience stylesheet is not linked");

const routes = ["/haberler/", "/sosyal-medya/", "/video-produksiyon/", "/hizmetler/", "/iletisim/"];
for (const route of routes) {
  if (index.includes('href="' + route + '"') || index.includes("href='" + route + "'")) ok("crawlable primary link " + route);
  else fail("missing primary internal link " + route);
}
const jsonLdMatches = [...index.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
const types = [];
for (const match of jsonLdMatches) {
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed && parsed["@type"]) types.push(parsed["@type"]);
  } catch { fail("homepage contains invalid JSON-LD"); }
}
for (const type of ["NewsMediaOrganization", "WebPage", "WebSite", "OfferCatalog"]) {
  if (types.includes(type)) ok("JSON-LD " + type + " present and parsed");
  else fail("JSON-LD missing type " + type);
}
if (css.includes("@media (min-width:1024px)")) ok("desktop-specific breakpoint");
else fail("desktop-specific breakpoint missing");
if (css.includes("@media (max-width:760px)")) ok("mobile-specific breakpoint");
else fail("mobile-specific breakpoint missing");
if (css.includes("prefers-reduced-motion:reduce")) ok("reduced-motion setting respected");
else fail("reduced-motion support missing");
if (css.includes(":focus-visible")) ok("keyboard focus states visible");
else fail("keyboard focus styles missing");
if (css.includes("env(safe-area-inset-bottom)")) ok("mobile safe-area clearance");
else fail("mobile safe-area clearance missing");
if (css.includes("min-height:44px")) ok("desktop CTA meets minimum touch target");
else fail("primary CTA minimum touch target missing");

/* International SEO and AEO contracts: validate semantics at source, not just tag presence. */
if (index.includes('<html lang="tr">')) ok('homepage language is Turkish');
else fail('homepage html lang must be tr');
const alternateLinks = [...index.matchAll(/<link[^>]*rel=["']alternate["'][^>]*>/gi)].map(m => m[0]);
for (const [lang, href] of [['tr-TR','https://btmedya.com.tr/'],['en','https://btmedya.com.tr/en/'],['x-default','https://btmedya.com.tr/']]) {
  const found = alternateLinks.some(tag => tag.includes('hreflang="' + lang + '"') && tag.includes('href="' + href + '"'));
  if (found) ok('hreflang ' + lang + ' is mapped to the canonical language URL');
  else fail('missing/incorrect hreflang ' + lang);
}
if (types.includes('Person')) ok('homepage declares Buse Tuncay as Person');
else fail('homepage JSON-LD is missing the founder/journalist Person entity');

const sourceDesk = fs.readFileSync('public/kaynak-masasi/index.html', 'utf8');
const servicesPage = fs.readFileSync('public/hizmetler/index.html', 'utf8');
const newsPageSource = fs.readFileSync('src/news-page.js', 'utf8');
const workerSource = fs.readFileSync('src/worker.js', 'utf8');
const homeSource = fs.readFileSync('public/home.js', 'utf8');
function collectSchemaTypes(value, result = []) {
  if (!value || typeof value !== 'object') return result;
  if (typeof value['@type'] === 'string') result.push(value['@type']);
  if (Array.isArray(value)) value.forEach(item => collectSchemaTypes(item, result));
  else Object.values(value).forEach(item => collectSchemaTypes(item, result));
  return result;
}
function schemaTypesFrom(html, label) {
  const result = [];
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try { result.push(...collectSchemaTypes(JSON.parse(match[1]))); }
    catch { fail(label + ' contains invalid JSON-LD'); }
  }
  return result;
}
const sourceTypes = schemaTypesFrom(sourceDesk, 'Source Desk');
if (sourceTypes.includes('ItemList')) ok('Source Desk uses a structured source-directory ItemList');
else fail('Source Desk JSON-LD is missing ItemList');
const serviceTypes = schemaTypesFrom(servicesPage, 'BT STUDIO services');
if (serviceTypes.includes('ProfessionalService') || serviceTypes.includes('LocalBusiness')) ok('BT STUDIO has a LocalBusiness/ProfessionalService entity');
else fail('BT STUDIO is missing LocalBusiness/ProfessionalService JSON-LD');
if (serviceTypes.filter(type => type === 'Product').length >= 3) ok('three service packages have Product structured data');
else fail('BT STUDIO requires Product schema for the three named packages');
if (newsPageSource.includes('"@type":"NewsArticle"')) ok('dynamic news pages use NewsArticle JSON-LD');
else fail('dynamic news rendering is missing NewsArticle JSON-LD');
if (workerSource.includes("url.pathname==='/api/public/live-data'") && homeSource.includes("fetch('/api/public/live-data'")) ok('homepage counters use the D1/static-fallback live-data API');
else fail('live-data API and homepage counter are not connected');
if (css.includes('.story-scroll,.story-progress{display:none!important}')) ok('desktop story scroll cue is removed from compact mobile layout');
else fail('mobile story scroll/progress cue fallback missing');

/* Validate mobile stylesheets when the homepage links them. This stays optional
   on older branches where the refresh layer has not been introduced yet. */
for (const mobile of [
  { path: "public/mobile-home-experience.css", href: "/mobile-home-experience.css", label: "mobile home experience" },
  { path: "public/mobile-refresh-v1.css", href: "/mobile-refresh-v1.css", label: "mobile refresh" },
]) {
  if (!index.includes(mobile.href)) continue;
  if (!fs.existsSync(mobile.path)) {
    fail(mobile.label + " stylesheet is linked but the file is missing");
    continue;
  }
  const mobileCss = fs.readFileSync(mobile.path, "utf8");
  if (/@media\s*\(\s*max-width\s*:\s*\d+px\s*\)/i.test(mobileCss)) ok(mobile.label + " has a narrow-screen breakpoint");
  else fail(mobile.label + " is linked but has no max-width responsive breakpoint");
  if (/prefers-reduced-motion\s*:\s*reduce/i.test(mobileCss)) ok(mobile.label + " respects reduced-motion preferences");
  else fail(mobile.label + " must respect prefers-reduced-motion");
  if (/env\(\s*safe-area-inset-(?:top|bottom)/i.test(mobileCss)) ok(mobile.label + " accounts for device safe areas");
  else fail(mobile.label + " must account for device safe areas");
  if (/min-height\s*:\s*44px/i.test(mobileCss)) ok(mobile.label + " includes 44px touch targets");
  else fail(mobile.label + " must include a minimum 44px touch target");
  if (/body\.ana-sade\.menu-open\s+\.site-menu[^{}]*\{[^}]*pointer-events\s*:\s*none/i.test(mobileCss)) {
    fail(mobile.label + " disables pointer events on the open site menu");
  } else {
    ok(mobile.label + " does not disable clicks on the open site menu");
  }
}


// Offer form accessibility and attribution contracts.
for (const field of ["name", "email", "phone", "company", "service", "message"]) {
  const labelPattern = new RegExp(`<label\\b[^>]*\\bfor=["']${field}["'][^>]*>`, "i");
  const controlPattern = new RegExp(`<(?:input|select|textarea)\\b[^>]*\\bid=["']${field}["'][^>]*\\bname=["']${field}["'][^>]*>`, "i");
  if (labelPattern.test(offerForm) && controlPattern.test(offerForm)) ok(`offer form label and control are associated: ${field}`);
  else fail(`offer form label must target a control with matching id/name: ${field}`);
}

if (/<select\b[^>]*\bname=["']budget["']/i.test(offerForm)) fail("optional budget selector should be removed from the offer form");
else ok("offer form does not require or display the optional budget selector");

if (/q\.get\(['"]kaynak['"]\)/.test(offerScript) && /veri\.sayfa\s*=\s*sayfa/.test(offerScript)) {
  ok("offer form forwards the homepage source attribution to the lead API");
} else {
  fail("offer form must forward the ?kaynak= attribution to the lead API");
}

 // Homepage navigation and conversion contracts.
const topCta = index.match(/<a class="top-cta" href="([^"]+)"/);
if (topCta?.[1].startsWith("/teklif-al/")) ok("top CTA leads to unified offer flow");
else fail("top CTA must lead to /teklif-al/");

const portfolioPos = index.indexOf('id="portfoy"');
const newsPos = index.indexOf('id="news"');
if (portfolioPos >= 0 && newsPos >= 0 && portfolioPos < newsPos) ok("portfolio precedes news on homepage");
else fail("portfolio should precede the main news feed");

const homepageChoices = ["HABER OKU", "SOSYAL MEDYA HİZMETİ AL", "PRODÜKSİYON İNCELE"];
const homepageUpper = index.toLocaleUpperCase("tr-TR");
for (const choice of homepageChoices) {
  if (homepageUpper.includes(choice)) ok("homepage primary choice: " + choice);
  else fail("missing homepage primary choice: " + choice);
}

const categoryDisclosureCount = (index.match(/<details class="giris-v5-altlar">/g) || []).length;
if (categoryDisclosureCount === 3) ok("three collapsible category groups present");
else fail("homepage should have exactly three collapsible category groups");

if (/giris-v5-altlar:not\(\[open\]\)\s*>\s*ul\s*\{\s*display:\s*none\s*!important/i.test(mobileHome)) ok("collapsed category links are hidden");
else fail("collapsed category links must be hidden in mobile CSS");

if (failures.length) process.exit(1);
console.log("UX_SEO_CONTRACT_PASS");
