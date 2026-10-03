#!/usr/bin/env node
/* BTMEDYA Mobile Regression Gate
   Static contract checks for the public/mobile surface. This deliberately
   checks the source-of-truth wiring rather than pretending to be a device
   screenshot test. */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const index = read("public/index.html");
const home = read("public/home.js");
const motion = read("public/mobile-motion.js");
const mobileFixes = read("public/mobile-fixes.css");
const responsive = read("public/btmedya-responsive-v2.css");
const experience = read("public/btmedya-experience-v1.js");
const mobilePolish = read("public/mobile-polish-v4.css");
const metricool = read("public/metricool-izleme.js");

const fail = msg => { console.error("MOBILE_GATE_FAIL:",msg); process.exitCode=1; };
const ok = msg => console.log("MOBILE_GATE_OK:",msg);

const navCount = (index.match(/data-mobile-nav=/g)||[]).length;
if (navCount !== 6) fail(`expected exactly 6 mobile nav links, got ${navCount}`);
else ok("mobile quick navigation has exactly 6 links");

if (/repeat\(5,1fr\)/.test(mobileFixes)) fail("legacy 5-column mobile nav rule still exists");
else ok("no legacy 5-column mobile nav rule");

if (!/\.mobile-quick-nav\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/s.test(mobileFixes)
    && !/\.mobile-quick-nav\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/s.test(mobileFixes)) {
  fail("mobile quick navigation does not declare six-column layout");
} else ok("six-column mobile nav layout present");

if (!/padding-bottom:calc\(88px/.test(responsive)) fail("responsive layer lacks safe bottom clearance");
else ok("safe bottom clearance present");

if (!/floating-whatsapp[\s\S]*bottom:calc\(86px/.test(responsive)) fail("floating WhatsApp clearance missing");
else ok("floating WhatsApp is lifted above fixed nav");

if (!/\.hero-customer-choices,.cinematic-choice-nav\{display:none!important\}/.test(responsive))
  fail("mobile duplicate hero navigator is not disabled");
else ok("duplicate mobile hero navigators disabled");

const heroMarker = home.indexOf("/* ===== CINEMATIC HERO STORY ENGINE =====");
const mobileGuard = home.indexOf("if(window.matchMedia('(max-width:720px)').matches) return;", heroMarker);
if (heroMarker < 0 || mobileGuard < heroMarker) fail("desktop cinematic hero controller still active on mobile");
else ok("desktop cinematic hero controller is gated on mobile");

/* V5 (3 Ekim) mobil hero'yu sahne listesinden besliyor; eski dataset.mobile
   sözleşmesi yok. Asıl korunması gereken: her sahne videosu gerçekten var ve
   "GERÇEK ÇEKİM" diyen sahne katalogda gercek:true işaretli bir dosyayı
   oynatıyor (AGENTS.md: varsayılan AI ÜRETİMİ). V5 ilk sürümünde AI kapaklı
   bir sosyal kart "GERÇEK ÇEKİM · SAHA" diye etiketlenmişti. */
const katalog = JSON.parse(read("public/data/medya-listesi.json"));
const gercekler = new Set((katalog.items || katalog).filter(x => x && x.gercek === true).map(x => x.path));
const sahneler = [...motion.matchAll(/source:'([^']*)'[^}]*?video:'([^']*)'/g)].map(m => ({ etiket: m[1], video: m[2] }));
if (!sahneler.length) fail("mobile hero scene list not found");
let sahneHata = 0;
for (const s of sahneler) {
  if (!fs.existsSync(path.join(root, "public", s.video))) { fail(`mobile hero scene video missing: ${s.video}`); sahneHata++; }
  if (/^GERÇEK ÇEKİM/.test(s.etiket) && !gercekler.has(s.video.replace(/^\/assets\//, ""))) { fail(`scene labelled "${s.etiket}" plays non-verified media: ${s.video}`); sahneHata++; }
}
if (sahneler.length && !sahneHata) ok(`mobile hero scenes: ${sahneler.length} videos present, real-footage labels match catalog`);

if (!/(window\.innerWidth>720\)\s*return|matchMedia\('\(max-width:720px\)'\)\.matches\)\s*return)/.test(motion) || /createElement\([^)]*\)[^;]*(choice|navigator)/i.test(motion))
  fail("mobile-motion is not mobile-only or injects a duplicate navigator");
else ok("mobile-motion is mobile-only and injects no duplicate navigator");

if (!/matchMedia\('\(max-width:720px\)'\)\.matches\)\s*return;/.test(experience))
  fail("experience navigator still injects on mobile");
else ok("experience navigator skips mobile");

if (!/prefers-reduced-motion/.test(mobileFixes) || !/prefers-reduced-motion/.test(responsive) || !/prefers-reduced-motion/.test(motion))
  fail("reduced-motion coverage incomplete");
else ok("reduced-motion coverage present");

if (!/viewport-fit=cover/.test(index)) fail("homepage viewport contract missing");
else ok("homepage viewport contract present");

/* V4 mobile polish contract. */
if (!/\.bt-world-visual\{[^}]*aspect-ratio:4\/5/s.test(mobilePolish)) fail("world visual mobile frame contract missing");
else ok("world visual has bounded mobile frame");
if (!/\.portfoy-grid,.archive-live-grid\{grid-template-columns:1fr 1fr/s.test(mobilePolish)) fail("portfolio/archive mobile two-column contract missing");
else ok("portfolio/archive mobile scan grid present");
if (!/\.offer-grid\{display:grid!important;grid-auto-flow:column/s.test(mobilePolish)) fail("offer rail mobile contract missing");
else ok("offer packages use a mobile swipe rail");
if (!/mobile-polish-v4\.css\?v=20261003-1/.test(metricool)) fail("mobile polish stylesheet is not loaded by homepage UI bootstrap");
else ok("mobile polish stylesheet is loaded last by homepage UI bootstrap");

if (process.exitCode) process.exit();
console.log("MOBILE_GATE_PASS");
