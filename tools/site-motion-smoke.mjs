#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const exists = p => fs.existsSync(path.join(root, p));
const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(full);
  return [full];
});
const allHtml = walk('public').filter(p => p.endsWith('.html'));
const visitorHtml = allHtml.filter(p => !/(^|\/)(admin|social-studio|client-hub|client)(\/|$)/.test(p) && !/google[^/]*\.html$/i.test(p));
assert(visitorHtml.length >= 20, `Expected broad visitor-page coverage, found ${visitorHtml.length} templates`);

for (const file of visitorHtml) {
  const html = read(file);
  assert(html.includes('/btmedya-site-motion.css?v=20261002-1'), `${file} is missing the site-wide motion stylesheet`);
  assert(html.includes('/btmedya-site-motion.js?v=20261002-1'), `${file} is missing the site-wide motion script`);
  assert(!/<video\b[^>]*\bautoplay\b/i.test(html), `${file} contains a video autoplay attribute`);
  for (const match of html.matchAll(/\b(?:poster|src)=["'](\/assets\/[^"']+)['"]/gi)) {
    const asset = match[1].split(/[?#]/)[0];
    assert(exists(`public${asset}`), `${file} references missing local asset ${asset}`);
  }
}
for (const file of allHtml.filter(p => !visitorHtml.includes(p))) {
  const html = read(file);
  assert(!html.includes('btmedya-site-motion.css'), `${file} is an internal/verification page and must not be changed`);
  assert(!html.includes('btmedya-site-motion.js'), `${file} is an internal/verification page and must not be changed`);
}

const worker = read('src/worker.js');
assert(worker.includes('function publicMotionAssets(res, pathname, method)'), 'Public motion response wrapper is missing');
assert(worker.includes("method === 'HEAD'"), 'HEAD requests must not be body-transformed');
assert(worker.includes("!type.toLowerCase().startsWith('text/html')"), 'Only HTML responses may be transformed');
assert(worker.includes("![200,404].includes(res.status)"), 'Only successful and custom-404 HTML responses may be transformed');
assert(worker.includes("/^\\/(?:admin|api|social-studio)(?:\\/|$)/"), 'Admin/API/social routes must be excluded');
assert(worker.includes('return servisEt(request, env, publicMotionAssets(new Response(renderNewsPage('), 'Worker-rendered article pages must use the shared serving pipeline');
assert(worker.includes('}), url.pathname, request.method));'), 'Worker article insertion must emit valid HTML only');
assert(worker.includes('return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });'), 'Static response pipeline must preserve its current headers unchanged');

const helper = read('public/btmedya-site-motion.js');
const style = read('public/btmedya-site-motion.css');
const playClick = helper.indexOf("button.addEventListener('click'");
assert(playClick >= 0, 'Video playback must require an explicit play-button action');
assert(helper.indexOf('video.src=source', playClick) > playClick, 'Video source must be attached only after the play button click');
assert(helper.indexOf('video.play().then', playClick) > playClick, 'Explicit play action must start playback');
assert(!helper.includes('autoplay=true'), 'Shared helper must not enable autoplay');
assert(helper.includes("['ArrowLeft','ArrowRight']"), 'Horizontal rails must support keyboard arrow navigation');
assert(helper.includes('MutationObserver'), 'Dynamically rendered public content must receive motion controls');
assert(helper.includes("'.pf .grid'"), 'Portfolio card catalogs must receive horizontal controls');
assert(helper.includes("'.ai-page .ai-grid'"), 'AI LAB card catalogs must receive horizontal controls');
assert(style.includes('scroll-snap-type:x mandatory'), 'Horizontal catalogs must use snap behavior');
assert(/prefers-reduced-motion\s*:\s*reduce/.test(style), 'Motion layer must honor reduced-motion preference');
assert(style.includes(':focus-visible'), 'New controls need visible keyboard focus');

for (const file of ['public/btmedya-site-motion.js','public/home.js','public/mobile-motion.js','public/script.js','public/arsiv/app.js']) {
  try {
    execFileSync(process.execPath, ['--check', file], { cwd: root, stdio: 'ignore' });
  } catch {
    assert.fail(`${file} failed node --check`);
  }
}

const homepage = read('public/index.html');
assert(homepage.includes('<link rel="canonical" href="https://btmedya.com.tr/">'), 'Homepage canonical was changed or removed');
assert(homepage.includes('application/ld+json'), 'Homepage structured-data contract must remain');
assert(homepage.includes('poster="/assets/media/web/hero-story-poster.jpg"'), 'Homepage must retain the real hero poster');
const news = read('public/haberler/index.html');
assert(news.includes('<link rel="canonical" href="https://btmedya.com.tr/haberler/">'), 'News canonical was changed or removed');
assert(news.includes('balikesir-pazarinda-canli-helva-sovu.webp'), 'Archive card must retain its real local poster');
assert(news.includes('balikesir-pazarinda-canli-helva-sovu-dikey.mp4'), 'Archive card must retain its existing local video source');

console.log(`BTMEDYA site-motion smoke: OK · ${visitorHtml.length} visitor HTML templates · video source/play only on click · SEO/internal-route/production bindings preserved`);
