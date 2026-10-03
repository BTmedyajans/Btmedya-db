#!/usr/bin/env node
/* BTMEDYA Mobile Regression Gate */
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const index=read("public/index.html");
const home=read("public/home.js");
const motion=read("public/mobile-motion.js");
const fixes=read("public/mobile-fixes.css");
const responsive=read("public/btmedya-responsive-v2.css");
const experience=read("public/btmedya-experience-v1.js");

let failed=false;
const check=(condition,message)=>{if(condition){console.log("MOBILE_GATE_OK:",message)}else{console.error("MOBILE_GATE_FAIL:",message);failed=true}};

check((index.match(/data-mobile-nav=/g)||[]).length===6,"exactly 6 mobile navigation links");
check(!/repeat\(5,1fr\)/.test(fixes),"no legacy 5-column quick-nav rule");
check(/grid-template-columns:repeat\(6,minmax\(0,1fr\))/.test(fixes),"six-column quick-nav fallback exists");
check(/padding-bottom:calc\(88px/.test(responsive),"mobile bottom safe-area clearance exists");
check(/\.floating-whatsapp[\s\S]*?bottom:calc\(86px/.test(responsive),"floating WhatsApp is above fixed navigation");
check(/\.hero-customer-choices,.cinematic-choice-nav\{display:none!important\}/.test(responsive),"duplicate mobile hero navigators are hidden");
const heroMarker=home.indexOf("/* ===== CINEMATIC HERO STORY ENGINE =====");
check(heroMarker>=0 && home.indexOf("if(window.matchMedia('(max-width:720px)').matches) return;",heroMarker)>heroMarker,"desktop hero controller is gated on mobile");
check(/const source=mobileHero\.dataset\.mobile \|\| mobileHero\.dataset\.src/.test(motion),"mobile hero uses assigned media source");
check(/window\.matchMedia\('\(max-width:720px\)'\)\.matches\) return;/.test(motion),"mobile customer navigator is gated");
check(/if\(window\.matchMedia\('\(max-width:720px\)'\)\.matches\)return;/.test(experience),"experience navigator skips mobile");
check(/prefers-reduced-motion/.test(fixes)&&/prefers-reduced-motion/.test(responsive)&&/prefers-reduced-motion/.test(motion),"reduced-motion coverage exists");
check(/name=["']viewport["']/.test(index),"homepage viewport metadata exists");
if(failed)process.exit(1);
console.log("MOBILE_GATE_PASS");