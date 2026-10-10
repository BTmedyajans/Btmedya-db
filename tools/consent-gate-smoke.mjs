import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const requiredVersion = '20261010-consent-1';
const errors = [];
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.html?$/i.test(entry.name)) htmlFiles.push(file);
  }
}
walk(publicRoot);

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  const scripts = [...content.matchAll(/<script\b[^>]*\bsrc=["']([^"']*\/olcum\.js(?:\?[^"']*)?)["'][^>]*>/gi)];
  for (const match of scripts) {
    if (!match[1].includes(`v=${requiredVersion}`)) {
      errors.push(`${relative}: stale or unversioned /olcum.js reference: ${match[1]}`);
    }
  }
  if (/rel=["']preconnect["'][^>]+tracker\.metricool\.com/i.test(content)) {
    errors.push(`${relative}: tracker preconnect bypasses the consent-first loading path`);
  }
}

const requiredFiles = [
  'public/olcum.js',
  'public/cerez-tercihleri.js',
  'public/cerez-tercihleri.css',
  'public/cerez-politikasi/index.html',
];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required consent resource: ${file}`);
}

const measurement = fs.readFileSync(path.join(root, 'public/olcum.js'), 'utf8');
if (!measurement.includes('/cerez-tercihleri.js')) errors.push('public/olcum.js does not load the consent-preference UI');
if (!measurement.includes('analitik === true')) errors.push('public/olcum.js must require explicit analytics consent');
const sitemap = fs.readFileSync(path.join(publicRoot, 'sitemap.xml'), 'utf8');
if (!sitemap.includes('/cerez-politikasi')) errors.push('sitemap.xml does not include the cookie policy');
const home = fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8');
if (!home.includes('href="/cerez-politikasi/"')) errors.push('Homepage footer does not link the cookie policy');
const generatedNews = fs.readFileSync(path.join(root, 'src/news-page.js'), 'utf8');
if (!generatedNews.includes(`/olcum.js?v=${requiredVersion}`)) errors.push('Generated news pages still use an old measurement cache key');

if (errors.length) {
  console.error('Consent-gated analytics regression failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`PASS: consent UI, policy/sitemap links, and analytics version verified across ${htmlFiles.length} public HTML files.`);
