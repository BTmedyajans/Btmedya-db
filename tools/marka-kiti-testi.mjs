// Marka kiti tutarlılık testi: kit sayfası ve verisi, sitenin ve kapak
// araçlarının gerçekte kullandığı değerlerle aynı kalmalı. Kit elle değil
// tools/marka-kiti.py ile üretilir; bu test kaynak koddaki bir değişikliğin
// kiti sessizce yalancı çıkarmasını yakalar.
// Çalıştır: node tools/marka-kiti-testi.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const oku = p => readFileSync(p, 'utf8');
const kit = JSON.parse(oku('public/data/marka-kiti.json'));
const kapak = oku('tools/haber-kapagi.py');
const css = oku('public/btmedya-brand-system.css') + oku('public/home.css');
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ');

// Renkler kaynağında geçiyor (CSS'te hex, kapak aracında RGB demeti).
// Kapak aracındaki renkler sabit adıyla aranır: aynı değer başka bir
// sabitte de geçebildiği için yalnız değeri aramak değişikliği kaçırıyordu.
const sabit = { 'Haber Kırmızısı': /KIRMIZI_M = \(([^)]*)\)/, 'Manşet Sarısı': /SARI_M = \(([^)]*)\)/, 'Stüdyo Laciverti': /LACIVERT = \(\([^)]*\), \(([^)]*)\)\)/ };
for (const r of kit.renkler) {
  if (r.ad === 'BT Altını') continue; // logodan ölçülür, kodda sabiti yok
  if (sabit[r.ad]) assert.equal((kapak.match(sabit[r.ad]) || [])[1], rgb(r.hex), `${r.ad} ${r.hex} kapak aracındaki sabitle aynı değil`);
  else assert.ok(css.toLowerCase().includes(r.hex.toLowerCase()), `${r.ad} ${r.hex} CSS'te yok`);
}

// JPEG boyutu: SOF işaretçisinden okunur.
const jpegBoyut = p => {
  const b = readFileSync(p);
  for (let i = 2; i < b.length;) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1], uz = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + uz;
  }
  return null;
};
for (const o of kit.olculer) {
  const p = `public/assets/marka-kiti/${o.dosya}`;
  assert.ok(existsSync(p), `${p} yok`);
  assert.deepEqual(jpegBoyut(p), [o.w, o.h], `${o.dosya} ölçüsü ${o.w}x${o.h} değil`);
}
// Proje ölçüleri: kitteki SITE_SLOTS karşılıkları worker.js ile aynı.
const worker = oku('src/worker.js');
for (const [yuva, olcu] of [['hero-poster', '1920x1080'], ['og-image', '1200x630'], ['kategori-haber', '1080x1920']])
  assert.match(worker, new RegExp(`\\['${yuva}',[^\\]]*'${olcu}'`), `${yuva} ölçüsü worker.js'te ${olcu} değil`);

// Sayfa: ölçüm var, satır içi çalışan betik yok (gerileme kuralları 12-13).
const sayfa = oku('public/marka-kiti/index.html');
assert.match(sayfa, /<script src="\/olcum\.js\?v=[^"]+" defer><\/script>/);
assert.ok(!/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(sayfa), 'satır içi betik var');
for (const r of kit.renkler) assert.ok(sayfa.includes(r.hex), `sayfada ${r.hex} yok`);

// Paylaşım görseli: anasayfa yeni marka kartını gösteriyor ve dosya var.
const ana = oku('public/index.html');
const og = (ana.match(/<meta property="og:image" content="https:\/\/btmedya\.com\.tr(\/[^"]+)"/) || [])[1];
// v2: gerçek çekim kareli paylaşım kartı; yeni dosya adı sosyal ağ önizleme önbelleğini yeniler.
assert.equal(og, '/assets/paylasim/btmedya-og-v2.jpg');
assert.deepEqual(jpegBoyut('public' + og), [1200, 630]);
assert.match(worker, /'og-image':\s*'paylasim\/btmedya-og-v2\.jpg'/);

// Haber kapakları kişi fotoğrafı kullanmaz: foto havuzundaki portreler
// BTMEDYA ekibine ait, haberle ilgisi yok (yayın kararı, 2026-10-03).
// Kapak içerikten türetilen vurgu kartı ya da temsili saha karesiyle üretilir.
const plan = JSON.parse(oku('public/data/haber-kapak-plani.json'));
const fotolu = plan.filter(h => h && typeof h === 'object' && 'foto' in h).map(h => h.slug);
assert.deepEqual(fotolu, [], `kişi fotoğraflı kapak planı: ${fotolu.join(', ')}`);
console.log('MARKA KITI TESTI GECTI');
