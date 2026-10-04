// Haber portalı (/haberler/) V14 testi. Ağ ve Cloudflare gerektirmez.
// Çalıştır: node tools/haber-portali-testi.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { register } from 'node:module';

// Worker 'cloudflare:workers' içe aktarır; Node bu şemayı yükleyemez. Test
// yalnız fetch yolunu çağırdığı için sınıflar boş kabuk olarak verilir.
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, n) { return s.startsWith('cloudflare:') ? { url: 'data:text/javascript,' + encodeURIComponent('export class WorkerEntrypoint{} export class WorkflowEntrypoint{} export class DurableObject{}'), shortCircuit: true } : n(s, c); }
`));
const { default: worker } = await import('../src/worker.js');

// 1) /api/news?ozet=1 haber gövdesini düşürür; parametresiz çağrı aynı kalır.
const satirlar = [
  { id: 1, slug: 'yeni-haber', title: 'Yeni', excerpt: 'Ö', body: 'uzun gövde '.repeat(200), category: 'Spor', status: 'published', published_at: '2026-10-04T05:00:00Z', cover_url: '/assets/haber-kapak/yeni-haber.webp' }
];
const env = {
  DB: { prepare: () => ({ all: async () => ({ results: satirlar }), bind() { return this; } }) },
  ASSETS: { fetch: async () => new Response(JSON.stringify([{ slug: 'arsiv-haber', title: 'Arşiv', body: ['eski gövde'], published_at: '2024-05-02T10:00:00Z' }]), { headers: { 'content-type': 'application/json' } }) }
};
const al = async q => (await (await worker.fetch(new Request('https://btmedya.com.tr/api/news' + q), env, { waitUntil() {} })).json());
const tam = await al('?limit=10');
assert.equal(tam.items.length, 2);
assert.ok(tam.items.every(n => 'body' in n), 'parametresiz yanıt gövdeyi taşımalı');
const ozet = await al('?limit=10&ozet=1');
assert.equal(ozet.items.length, 2);
assert.ok(ozet.items.every(n => !('body' in n)), 'ozet=1 gövdeyi düşürmeli');
assert.equal(ozet.items[0].title, 'Yeni');

// 2) Sayfa: kendi stil ve betiğini yükler, satır içi çalışan betik yok, ölçüm var.
const sayfa = readFileSync('public/haberler/index.html', 'utf8');
assert.match(sayfa, /href="\/haberler\/portal\.css\?v=[^"]+"/);
assert.match(sayfa, /<script src="\/haberler-akisi\.js\?v=[^"]+" defer><\/script>/);
assert.match(sayfa, /<script src="\/olcum\.js\?v=[^"]+" defer><\/script>/);
assert.ok(!/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(sayfa), 'satır içi betik var');
// Sekiz kategori rayda, anasayfadaki anahtarlarla aynı.
for (const k of ['balikesir', 'gundem', 'ekonomi', 'kultur', 'egitim', 'saglik', 'spor', 'teknoloji'])
  assert.match(sayfa, new RegExp(`href="/haberler/\\?kategori=${k}" data-hm-kategori="${k}"`));

// 3) Akış kuralları (kaynak kodda): özet isteği, 3 saat kuralı, kapak üstüne başlık yok.
const betik = readFileSync('public/haberler-akisi.js', 'utf8');
assert.match(betik, /\/api\/news\?limit=100&ozet=1/);
assert.match(betik, /3 \* 3600 \* 1000[\s\S]{0,600}'SON DAKİKA' : 'SON HABERLER'/);
assert.ok(!/ARŞİVDEN BUGÜNE/.test(betik), 'güncel habere arşiv etiketi basılmamalı');

// 4) Kategori eşlemesi: betiğin kendi işleviyle, gerçek kategori yazımlarıyla.
const kum = { document: { querySelector: () => null }, matchMedia: () => ({ matches: false }) };
const kaynak = betik.replace("if (!kok) return;", "if (!kok) { globalThis.kategoriBul = kategori; return; }");
vm.runInNewContext(kaynak, Object.assign(kum, { globalThis: kum }));
const k = (category, title = '') => kum.kategoriBul({ category, title });
assert.equal(k('Yerel · Pazar'), 'balikesir');
assert.equal(k('Yapay Zekâ'), 'teknoloji');
assert.equal(k('Kültür · Zanaat'), 'kultur');
assert.equal(k('Ekonomi · Emlak'), 'ekonomi');
assert.equal(k('Gündem · Asayiş'), 'gundem');
assert.equal(k('Sağlık · Beslenme'), 'saglik');
assert.equal(k('Spor'), 'spor');
assert.equal(k('Eğitim'), 'egitim');
console.log('HABER PORTALI TESTI GECTI');
