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

if (!/const source=mobileHero\.dataset\.mobile \|\| mobileHero\.dataset\.src/.test(motion))
  fail("mobile hero does not honor assigned source fallback");
else ok("mobile hero honors mobile or assigned source");

if (!/window\.matchMedia\('\(max-width:720px\)'\)\.matches\) return;/.test(motion))
  fail("duplicate mobile customer navigator is not gated");
else ok("mobile-motion duplicate navigator is gated");

if (!/if\(window\.matchMedia\('\(max-width:720px\)'\)\.matches\)return;/.test(experience))
  fail("experience navigator still injects on mobile");
else ok("experience navigator skips mobile");

if (!/prefers-reduced-motion/.test(mobileFixes) || !/prefers-reduced-motion/.test(responsive) || !/prefers-reduced-motion/.test(motion))
  fail("reduced-motion coverage incomplete");
else ok("reduced-motion coverage present");

if (!/viewport-fit=cover/.test(index)) fail("homepage viewport contract missing");
else ok("homepage viewport contract present");

if (process.exitCode) process.exit();
console.log("MOBILE_GATE_PASS");
