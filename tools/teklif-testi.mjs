// Teklif hattı birim testi: /api/sales/lead. Ağ ve Cloudflare gerektirmez.
// Çalıştır: node tools/teklif-testi.mjs
import { salesApi } from '../src/sales-router.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const kayitlar = [];
const DB = { prepare: sql => ({ bind: (...a) => ({ run: async () => { if (/INSERT INTO sales_leads/.test(sql)) kayitlar.push(a); return { meta: {} }; } }) }) };
const kv = new Map();
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const mektuplar = [];
globalThis.fetch = async (u, o) => { mektuplar.push({ u, govde: JSON.parse(o.body) }); return new Response('{}', { status: 200 }); };
const env = { DB, KV, RESEND_API_KEY: 'test', RESEND_TO: 'ekip@ornek.test' };
const bekleyen = [];
const ctx = { waitUntil: p => bekleyen.push(p) };
let ipNo = 0;
const gonder = async (govde, ip) => {
  const r = await salesApi(new Request('https://btmedya.com.tr/api/sales/lead', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip || `10.0.0.${++ipNo}` }, body: JSON.stringify(govde) }), env, new URL('https://btmedya.com.tr/api/sales/lead'), ctx);
  await Promise.all(bekleyen.splice(0));
  return { durum: r.status, veri: await r.json() };
};
const tam = { name: 'Ayşe Yılmaz', phone: '0555 000 00 00', message: 'Kafemiz için tanıtım filmi', service: 'Video prodüksiyon', source: 'website-offer', sayfa: '/haberler/ornek-haber', consent: true };

// Bot tuzağı: başarı görünür ama kayıt ve e-posta yok.
let r = await gonder({ ...tam, _honey: 'http://spam' });
assert.equal(r.durum, 201); assert.equal(kayitlar.length, 0); assert.equal(mektuplar.length, 0);

// Dönüş için iletişim bilgisi zorunlu; hatalı e-posta reddedilir.
r = await gonder({ ...tam, phone: '', email: '' });
assert.equal(r.durum, 400); assert.match(r.veri.error, /e-posta veya telefon/);
r = await gonder({ ...tam, email: 'gecersiz' });
assert.equal(r.durum, 400); assert.equal(kayitlar.length, 0);

// Geçerli talep: kaydedilir, kaynak sayfası yazılır, ekibe e-posta gider.
r = await gonder(tam);
assert.equal(r.durum, 201); assert.equal(kayitlar.length, 1);
assert.equal(kayitlar[0][9], 'website-offer · /haberler/ornek-haber', 'geldiği sayfa kayda yazılmalı');
assert.ok(kayitlar[0][13], 'ilk dönüş için takip zamanı atanmalı');
assert.equal(mektuplar.length, 1);
assert.equal(mektuplar[0].u, 'https://api.resend.com/emails');
assert.deepEqual(mektuplar[0].govde.to, ['ekip@ornek.test']);
assert.match(mektuplar[0].govde.subject, /Yeni teklif: Video prodüksiyon — Ayşe Yılmaz/);
assert.match(mektuplar[0].govde.html, /\/haberler\/ornek-haber/);

// Kaynak sayfası temizlenir: HTML/betik kayda girmez.
r = await gonder({ ...tam, sayfa: '/x"><script>' });
assert.ok(!/[<>"]/.test(kayitlar.at(-1)[9]));

// Hız sınırı: aynı IP saatte en fazla 5 talep.
const ip = '203.0.113.9';
for (let i = 0; i < 5; i++) assert.equal((await gonder(tam, ip)).durum, 201);
r = await gonder(tam, ip);
assert.equal(r.durum, 429);

// Resend yoksa talep yine kaydedilir.
const once = kayitlar.length;
delete env.RESEND_API_KEY; mektuplar.length = 0;
assert.equal((await gonder(tam)).durum, 201); assert.equal(kayitlar.length, once + 1); assert.equal(mektuplar.length, 0);

// Sitede formun bulunabilirliği: haber şablonu ve hizmet sayfaları teklif formuna bağlanır.
assert.ok(readFileSync('src/news-page.js', 'utf8').includes('/teklif-al/?hizmet='));
for (const s of ['hizmetler', 'video-produksiyon', 'sosyal-medya', 'reklam-ve-sponsorluk'])
  assert.ok(readFileSync(`public/${s}/index.html`, 'utf8').includes('href="/teklif-al/'), `${s} teklif formuna bağlanmıyor`);
console.log('TEKLIF TESTLERI GECTI');
