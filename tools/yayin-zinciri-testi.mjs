// Günlük yayın zinciri durumu birim testi (src/yayin-zinciri.js).
// Çalıştır: node tools/yayin-zinciri-testi.mjs
import assert from 'node:assert/strict';
import { zincirDurumu } from '../src/yayin-zinciri.js';

const SIMDI = Date.parse('2026-10-11T08:00:00Z');
const saatOnce = h => new Date(SIMDI - h * 3600000).toISOString();

function ortam({ rapor, haberler = [], sosyal = [], kapaklar = {}, metricool = true }) {
  const kv = new Map([['sabah:ayarlar', JSON.stringify({ etkin: true, otomatikYayin: true, gunlukAzami: 8 })]]);
  if (rapor) kv.set('sabah:son', JSON.stringify(rapor));
  return {
    KV: { get: async k => kv.get(k) ?? null, put: async () => {} },
    DB: { prepare: sql => ({ bind: () => ({ all: async () => ({ results: /FROM news/.test(sql) ? haberler : /FROM social_posts/.test(sql) ? sosyal : [] }) }) }) },
    ASSETS: { fetch: async () => new Response(JSON.stringify(kapaklar), { status: 200 }) },
    METRICOOL_USER_TOKEN: metricool ? 'x' : ''
  };
}
const halka = (d, a) => d.halkalar.find(h => h.anahtar === a);

// Sağlıklı gün: rapor taze, kapaklar üretilmiş, Metricool bağlı.
let d = await zincirDurumu(ortam({
  rapor: { bitis: saatOnce(3), trendler: [1, 2], secilen: [{ durum: 'yayinlandi' }, { durum: 'taslak' }], yayinlanan: 5, taslak: 1, hatalar: [] },
  haberler: [{ slug: 'a', title: 'A', cover_url: '/assets/kategori-kapak/spor.webp', published_at: saatOnce(3) }],
  kapaklar: { a: 'ai' },
  sosyal: [{ status: 'planlandi', n: 3 }]
}), SIMDI);
assert.equal(halka(d, 'sabah').durum, 'tamam');
assert.equal(halka(d, 'yayin').durum, 'tamam');
assert.equal(halka(d, 'kapak').durum, 'tamam', 'üretilmiş kapak varsa plaka sayılmaz');
assert.equal(halka(d, 'metricool').durum, 'tamam');
// Bölüm dönüşü: Balıkesir her gün başta, günlük azami kadar, yarın farklı.
assert.equal(d.bolumler.bugun[0].anahtar, 'balikesir');
assert.equal(d.bolumler.bugun.length, 8);
assert.notDeepEqual(d.bolumler.bugun, d.bolumler.yarin);

// Kopukluklar: rapor 30 saat önce (Sabah çalışmadı), kapak 10 saattir bekliyor,
// Metricool anahtarı yok.
d = await zincirDurumu(ortam({
  rapor: { bitis: saatOnce(30), trendler: [], secilen: [], yayinlanan: 0, taslak: 0, hatalar: [] },
  haberler: [{ slug: 'b', title: 'B', cover_url: '/assets/kategori-kapak/ekonomi.webp', published_at: saatOnce(10) },
    { slug: 'c', title: 'C', cover_url: '/gorsel/otomasyon/c.jpg', published_at: saatOnce(2) }],
  metricool: false
}), SIMDI);
assert.equal(halka(d, 'sabah').durum, 'eksik');
assert.equal(halka(d, 'kapak').durum, 'eksik');
assert.deepEqual(halka(d, 'kapak').bekleyen.map(x => x.slug), ['b'], 'panelden seçilmiş görsel kapak beklemez');
assert.equal(halka(d, 'metricool').durum, 'eksik');

// Yeni kapak 3 saattir bekliyor: sıradaki GitHub turunu bekler, kopukluk değil.
d = await zincirDurumu(ortam({ rapor: { bitis: saatOnce(3) }, haberler: [{ slug: 'e', title: 'E', cover_url: '', published_at: saatOnce(3) }] }), SIMDI);
assert.equal(halka(d, 'kapak').durum, 'bekliyor');

// Hiç rapor yoksa eksik görünür, hata atmaz.
d = await zincirDurumu(ortam({}), SIMDI);
assert.equal(halka(d, 'sabah').durum, 'eksik');
console.log('YAYIN ZINCIRI TESTI GECTI');
