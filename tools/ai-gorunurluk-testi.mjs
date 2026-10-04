// AI görünürlüğü birim testi: llms.txt, index.json, JSON-LD, haber Markdown'ı
// ve robots.txt. Ağ ve Cloudflare gerektirmez.
// Çalıştır: node tools/ai-gorunurluk-testi.mjs
import * as A from '../src/ai-gorunurluk.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const haberler = [
  { slug: 'toki-46-ilde-383-arsa', title: "TOKİ, 46 ilde 383 arsayı açık artırmayla satacak", excerpt: 'TOKİ 46 ilde 383 arsayı satışa çıkardı.', body: 'Birinci paragraf burada bitiyor. İkinci cümle.\n\nİkinci paragrafın ilk cümlesi yeterince uzun. Devamı.', category: 'Ekonomi', author: 'BTMEDYA Sabah Masası', cover_url: '/gorsel/otomasyon/x.jpg', published_at: '2026-09-29T06:14:00.000Z', updated_at: '2026-09-29T06:15:00.000Z', source_url: 'https://www.trthaber.com/haber/ekonomi/x.html', original_date: '2026-09-28T13:00:00+03:00', archive_note: 'Bu haber, TRT Haber kaynağındaki bilgilerden BTMEDYA Sabah Masası tarafından yapay zekâ desteğiyle derlenmiştir.' },
  { slug: 'elle-yazilan', title: 'Elle yazılan haber', excerpt: '', body: '<p>Saha haberinin ilk cümlesi burada yer alıyor.</p><p>Devam paragrafı.</p>', category: 'Yerel', author: 'Buse Tuncay', cover_url: '', published_at: '2026-09-20T10:00:00.000Z', updated_at: '2026-09-20T10:00:00.000Z', source_url: '', original_date: '', archive_note: '' }
];
const DB = { prepare: sql => ({ bind: (...a) => ({
  first: async () => haberler.find(h => h.slug === a[0]) || null,
  all: async () => ({ results: haberler.slice(0, a[0]) })
}) }) };
const statikler = [{ slug: 'yalniz-depoda', title: 'Yalnız depoda duran haber', excerpt: 'Özet.', body: ['İlk paragraf.', 'İkinci paragraf.'], category: 'Yerel', published_at: '2026-09-24T00:00:00+03:00', source_url: 'https://balikesir.bel.tr/x' }];
const ASSETS = { fetch: async req => {
  const yol = new URL(req.url).pathname;
  if (yol === '/llms.txt') return new Response('# BTMEDYA\n\n> Statik giriş.');
  if (yol === '/data/haberler.json') return new Response(JSON.stringify(statikler));
  return new Response('yok', { status: 404 });
} };
const env = { DB, ASSETS };
const iste = async (yol, method = 'GET') => A.aiGorunurluk(new Request('https://btmedya.com.tr' + yol, { method }), env, new URL('https://btmedya.com.tr' + yol));

// Kapsam dışı yollar null döner; haber sayfası rotasına dokunulmaz.
assert.equal(await iste('/haberler/toki-46-ilde-383-arsa'), null);
assert.equal(await iste('/'), null);
assert.equal(await iste('/haberler/olmayan.md'), null, 'yayında olmayan haber statik/404 yoluna düşmeli');

// D1'de olmayıp depodaki haberler.json'da duran haberin .md ve .jsonld'si de
// verilir (HTML sayfası bu dosyadan çizildiği için bağlantı 404 olmamalı).
{
  const md = await iste('/haberler/yalniz-depoda.md');
  assert.ok(md, 'statik haberin Markdown hâli dönmeli');
  const mt = await md.text();
  assert.ok(mt.startsWith('# Yalnız depoda duran haber'));
  assert.ok(mt.includes('İkinci paragraf.'));
  const ld = await iste('/haberler/yalniz-depoda.jsonld');
  assert.equal(JSON.parse(await ld.text()).headline, 'Yalnız depoda duran haber');
}

// llms.txt: statik giriş korunur, haberler .md bağlantısıyla listelenir.
let r = await iste('/llms.txt');
assert.equal(r.headers.get('content-type'), 'text/plain; charset=utf-8');
assert.equal(r.headers.get('content-signal'), 'ai-input=yes, search=yes, ai-train=no');
assert.equal(r.headers.get('x-robots-tag'), 'noindex');
let t = await r.text();
assert.ok(t.startsWith('# BTMEDYA\n\n> Statik giriş.'));
assert.ok(t.includes('(https://btmedya.com.tr/haberler/toki-46-ilde-383-arsa.md)'));
assert.ok(t.includes('yapay zekâ destekli'), 'Sabah Masası haberi işaretlenmeli');

// Haber Markdown'ı: kanonik bağlantı, özgün kaynak, AI notu.
r = await iste('/haberler/toki-46-ilde-383-arsa.md');
assert.equal(r.headers.get('content-type'), 'text/markdown; charset=utf-8');
assert.equal(r.headers.get('link'), '<https://btmedya.com.tr/haberler/toki-46-ilde-383-arsa>; rel="canonical"');
t = await r.text();
assert.ok(t.startsWith('# TOKİ, 46 ilde 383 arsayı açık artırmayla satacak'));
assert.ok(t.includes('> Bu haber yapay zekâ desteğiyle derlenmiştir'));
assert.ok(t.includes('- Özgün kaynak: https://www.trthaber.com/haber/ekonomi/x.html'));
assert.ok(t.includes('## Öne çıkanlar') && t.includes('- Birinci paragraf burada bitiyor.'));

// HTML gövde düz metne iner; elle yazılan haber AI olarak işaretlenmez.
t = await (await iste('/haberler/elle-yazilan.md')).text();
assert.ok(!t.includes('<p>') && t.includes('Saha haberinin ilk cümlesi'));
assert.ok(!t.includes('yapay zekâ desteğiyle'));

// index.json: tipli dizin, protokol ve kaynak bağlantıları.
const j = await (await iste('/index.json')).json();
assert.equal(j.protocol, 'agent-visibility/0.1');
assert.equal(j.pages.length, 2);
assert.equal(j.pages[0].sources.markdown, 'https://btmedya.com.tr/haberler/toki-46-ilde-383-arsa.md');
assert.equal(j.pages[0].aiAssisted, true);
assert.equal(j.pages[1].aiAssisted, false);
assert.equal(j.generatedAt, '2026-09-29T06:15:00.000Z', 'duvar saatinden değil içerikten türemeli');

// JSON-LD.
const ld = await (await iste('/haberler/toki-46-ilde-383-arsa.jsonld')).json();
assert.equal(ld['@type'], 'NewsArticle');
assert.equal(ld.isBasedOn, 'https://www.trthaber.com/haber/ekonomi/x.html');
assert.equal((await (await iste('/jsonld')).json()).mainEntity.itemListElement.length, 2);

// HEAD gövdesiz.
r = await iste('/index.json', 'HEAD');
assert.equal(await r.text(), '');

// Veritabanı hatası: null (statik yedek devreye girer).
const bozuk = { DB: { prepare: () => { throw new Error('D1 yok'); } } };
assert.equal(await A.aiGorunurluk(new Request('https://btmedya.com.tr/llms.txt'), bozuk, new URL('https://btmedya.com.tr/llms.txt')), null);

// robots.txt: her ajan grubu yasak yolları ve içerik sinyalini tekrarlar.
// Belirli bir User-agent grubu "*" grubunu geçersiz kıldığı için tekrar zorunlu.
const gruplar = readFileSync('public/robots.txt', 'utf8').split(/\n(?=User-agent:)/).filter(g => g.startsWith('User-agent:'));
assert.ok(gruplar.length >= 10);
for (const g of gruplar) {
  for (const y of ['/admin/', '/api/', '/social-studio/']) assert.ok(g.includes(`Disallow: ${y}`), `${g.split('\n')[0]} ${y} yasağı yok`);
  assert.ok(g.includes('Content-Signal: ai-input=yes, search=yes, ai-train=no'));
}
console.log('AI GORUNURLUK TESTLERI GECTI');
