// Satış temasları ve sabah satış özeti birim testi. Ağ ve Cloudflare gerektirmez.
// Çalıştır: node tools/temas-testi.mjs
import { salesApi, satisOzeti, temasSayfasi } from '../src/sales-router.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Sahte D1: sales_touches upsert'lerini sayar, özet sorgularına hazır cevap verir.
const temaslar = new Map();
const cevap = { yeni: [], geciken: [], dun: [] };
const DB = { prepare: sql => ({
  run: async () => ({ meta: {} }),
  bind: (...a) => ({
    run: async () => {
      if (/INSERT INTO sales_touches/.test(sql)) { const k = a.join('|'); temaslar.set(k, (temaslar.get(k) || 0) + 1); }
      return { meta: {} };
    },
    all: async () => {
      if (/FROM sales_leads WHERE created_at/.test(sql)) return { results: cevap.yeni };
      if (/FROM sales_leads WHERE stage IN/.test(sql)) return { results: cevap.geciken };
      if (/FROM sales_touches WHERE gun=\?/.test(sql)) return { results: cevap.dun };
      return { results: [] };
    }
  })
}) };
const kv = new Map();
const KV = { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } };
const mektuplar = [];
globalThis.fetch = async (u, o) => { mektuplar.push({ u, govde: JSON.parse(o.body) }); return new Response('{}', { status: 200 }); };
const env = { DB, KV, RESEND_API_KEY: 'test', RESEND_TO: 'ekip@ornek.test', ADMIN_SESSION_SECRET_SECRET: 'x' };

const istek = async (yontem, govde, ip = '198.51.100.1', yol = '/api/sales/temas') => {
  const u = new URL('https://btmedya.com.tr' + yol);
  const r = await salesApi(new Request(u, { method: yontem, headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: govde ? JSON.stringify(govde) : undefined }), env, u, { waitUntil() {} });
  return r.status;
};

// Geçerli temas kaydedilir; aynı gün/kanal/sayfa tek satırda toplanır.
assert.equal(await istek('POST', { kanal: 'whatsapp', sayfa: '/hizmetler/' }), 204);
assert.equal(await istek('POST', { kanal: 'whatsapp', sayfa: '/hizmetler/' }), 204);
const gun = new Date().toISOString().slice(0, 10);
assert.equal(temaslar.get(`${gun}|whatsapp|/hizmetler/`), 2);

// Bilinmeyen kanal reddedilir; sayfa yolu temizlenir (sorgu, HTML, dış adres girmez).
assert.equal(await istek('POST', { kanal: 'reklam', sayfa: '/' }), 400);
assert.equal(temasSayfasi('/haberler/x?utm=1#a'), '/haberler/x');
assert.equal(temasSayfasi('/x"><script>'), '/xscript');
assert.equal(temasSayfasi('https://kotu.ornek/'), '/');

// IP başına günde 30 temas: tek kişi tabloyu şişiremez.
for (let i = 0; i < 30; i++) await istek('POST', { kanal: 'telefon', sayfa: '/' }, '203.0.113.7');
await istek('POST', { kanal: 'telefon', sayfa: '/' }, '203.0.113.7');
assert.equal(temaslar.get(`${gun}|telefon|/`), 30);

// Temas raporu yalnız oturumlu panelden okunur.
assert.equal(await istek('GET', null, '198.51.100.1', '/api/sales/temas'), 401);

// Sabah özeti: söylenecek bir şey yoksa e-posta gitmez.
let s = await satisOzeti(env);
assert.equal(s.gonderildi, false); assert.equal(s.neden, 'bos'); assert.equal(mektuplar.length, 0);

// Veri varsa tek e-posta: yeni talep, geciken dönüş ve dünkü temaslar; HTML kaçışlı.
cevap.yeni = [{ name: 'Ali <b>', service: 'Video prodüksiyon', source: 'website-offer · /', phone: '0555' }];
cevap.geciken = [{ name: 'Veli', service: 'Haber / röportaj', next_action_at: '2026-10-01T09:00:00Z' }];
cevap.dun = [{ kanal: 'whatsapp', sayfa: '/hizmetler/', sayi: 4 }];
s = await satisOzeti(env);
assert.equal(s.gonderildi, true); assert.equal(mektuplar.length, 1);
const m = mektuplar[0].govde;
assert.deepEqual(m.to, ['ekip@ornek.test']);
assert.match(m.subject, /Satış özeti: 1 yeni, 1 geciken/);
assert.match(m.html, /Ali &lt;b&gt;/); assert.ok(!m.html.includes('Ali <b>'));
assert.match(m.html, /Veli/); assert.match(m.html, /whatsapp · \/hizmetler\/ — <b>4<\/b>/);

// Resend anahtarı yoksa özet sessizce atlanır.
assert.equal((await satisOzeti({ DB })).gonderildi, false);

// Sabah görevi özeti Sabah Masası ile birlikte çalıştırır.
const worker = readFileSync('src/worker.js', 'utf8');
assert.match(worker, /import \{[^}]*satisOzeti[^}]*\} from "\.\/sales-router\.js"/);
assert.match(worker, /cron==="0 5 \* \* \*"[ \t\S]{0,900}satisOzeti\(env\)/);

// olcum.js: WhatsApp / tel / mailto tıklaması sinyal gönderir, diğer bağlantılar göndermez.
const kaynak = readFileSync('public/olcum.js', 'utf8');
const calistir = ({ webdriver = false } = {}) => {
  const sinyaller = []; let dinleyici = null;
  const sb = {
    URLSearchParams, Blob, JSON,
    location: { search: '', pathname: '/hizmetler/' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { webdriver, userAgent: 'Mozilla/5.0 (iPhone) Safari', sendBeacon: (u, b) => { sinyaller.push({ u, b }); return true; } },
    document: { addEventListener: (t, f) => { if (t === 'click') dinleyici = f; }, createElement: () => ({}), head: { appendChild() {} } },
    window: {}
  };
  vm.runInNewContext(kaynak, sb);
  const tikla = href => dinleyici && dinleyici({ target: { closest: () => ({ getAttribute: () => href }) } });
  return { sinyaller, tikla, dinleyici: () => dinleyici };
};
const o = calistir();
o.tikla('https://wa.me/905416401029?text=Merhaba');
o.tikla('tel:+905416401029');
o.tikla('mailto:info@btmedya.com.tr');
o.tikla('/hizmetler/');
o.tikla('https://www.instagram.com/btmedyajans/');
assert.equal(o.sinyaller.length, 3);
assert.equal(o.sinyaller[0].u, '/api/sales/temas');
const govdeler = await Promise.all(o.sinyaller.map(x => x.b.text()));
assert.deepEqual(govdeler.map(t => JSON.parse(t).kanal), ['whatsapp', 'telefon', 'eposta']);
assert.equal(JSON.parse(govdeler[0]).sayfa, '/hizmetler/');
// Otomatik tarayıcılar (sitenin kendi denetimleri) temas saymaz.
assert.equal(calistir({ webdriver: true }).dinleyici(), null);

// Anasayfa teklif formuna bağlanır; panel temas tablosunu gösterir.
assert.ok(readFileSync('public/index.html', 'utf8').includes('href="/teklif-al/'), 'anasayfa teklif formuna bağlanmıyor');
assert.ok(readFileSync('public/admin/sales/index.html', 'utf8').includes('/api/sales/temas'));
console.log('TEMAS TESTLERI GECTI');
