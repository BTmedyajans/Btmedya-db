#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const html = readFileSync('public/index.html', 'utf8');
const css = readFileSync('public/hero-restore-v1.css', 'utf8');
const js = readFileSync('public/hero-restore-v1.js', 'utf8');
const legacy = readFileSync('public/hero-clean-categories.js', 'utf8');
const section = html.match(/<section class="cinematic-hero[^>]*data-click-to-play[\s\S]*?<\/section>/)?.[0] || '';
const video = section.match(/<video\b[^>]*>/)?.[0] || '';
const errs = [];
const check = (condition, message) => condition ? console.log(`OK ${message}`) : errs.push(message);

check(Boolean(section), 'click-to-play hero section exists');
check((section.match(/<video\b/g) || []).length === 1 && /class="[^"]*bt-clean-hero-video/.test(video), 'exactly one dedicated hero video exists');
check(/data-slot="hero-video"/.test(video) && /\bmuted\b/.test(video) && /\bplaysinline\b/.test(video), 'hero retains the existing slot contract and starts muted/inline');
check(!/\bautoplay\b/i.test(video) && /preload="none"/.test(video) && !/\bsrc=/.test(video), 'hero does not autoplay, eagerly preload or eagerly assign a video source');
check(/data-kendi-sesi/.test(video), 'generated hero-music layer is explicitly disabled');
check(/media="\(max-width: 720px\)" srcset="\/assets\/hero\/btmedya-hero-mobile-poster\.jpg"/.test(section) && /<img src="\/assets\/hero\/btmedya-hero-web-poster\.jpg"/.test(section), 'responsive poster sources switch at 720px');
check(/AI ÜRETİMİ · KONSEPT TANITIMI · TEMSİLİ GÖRSELLER/.test(section), 'concept/representational imagery label is visible');
check(/<h1 id="hero-review-title">Haber, medya ve/.test(section) && /aria-labelledby="hero-review-title"/.test(section), 'hero exposes one labeled primary heading');
check(/id="heroToggle"[^>]*aria-controls="heroVideo"[^>]*aria-describedby="heroVideoDescription"[^>]*hidden/.test(section), 'no-JS fallback keeps the control hidden and links accessible description to playback');
check(/id="heroStatus" role="status" aria-live="polite"/.test(section) && /Haber: Güncel, doğrulanmış, anında[\s\S]*Medya:[\s\S]*Prodüksiyon:/.test(section), 'screen-reader service descriptions and live status exist');
check(/href="\/iletisim\/"/.test(section), 'hero retains the internal contact CTA');
check(html.includes('/hero-restore-v1.css') && html.includes('/hero-restore-v1.js'), 'scoped stylesheet and external controller are loaded by the homepage');
check(/min-height:48px/.test(css) && /:focus-visible/.test(css) && /prefers-reduced-motion:reduce/.test(css), 'keyboard focus, 48px targets and reduced motion are styled');
check(/max-width:720px/.test(css) && /env\(safe-area-inset-bottom\)/.test(css), 'mobile layout and safe area are covered');
check(/matchMedia\('\(max-width: 720px\)'\)/.test(js) && /matchMedia\('\(prefers-reduced-motion: reduce\)'\)/.test(js), 'controller reads responsive and reduced-motion preferences');
check(/button\.addEventListener\('click'[\s\S]*?video\.src = selected\.video;/.test(js), 'video source is assigned only in the explicit button click handler');
check(/video\.muted = true/.test(js) && /video\.defaultMuted = true/.test(js) && /video\.playsInline = true/.test(js), 'controller enforces silent inline playback');
check(/video\.pause\(\)/.test(js) && /visibilitychange/.test(js) && /IntersectionObserver/.test(js), 'video pauses on user request, hidden tab and leaving the hero');
check(/data-click-to-play/.test(legacy) && /hasAttribute\('data-click-to-play'\)/.test(legacy), 'legacy autoplay controller exits for the restored hero');
for (const path of [
  'public/assets/hero/btmedya-hero-web-v2.mp4',
  'public/assets/hero/btmedya-hero-mobile-v2.mp4',
  'public/assets/hero/btmedya-hero-web-poster.jpg',
  'public/assets/hero/btmedya-hero-mobile-poster.jpg',
]) check(existsSync(path) && statSync(path).size > 1000, `${path} exists and is non-empty`);

if (errs.length) {
  console.error(`\n${errs.length} homepage hero contract failure(s):\n- ${errs.join('\n- ')}`);
  process.exit(1);
}
console.log('Homepage hero review contract passed.');
