// Kategori sistemi v3: üretici + tutarlılık kapısı. Ağ gerektirmez.
//   node tools/kategori-sistemi.mjs --yaz      public/data/kategoriler.json üretir
//   node tools/kategori-sistemi.mjs --kontrol  CI: dosya güncel mi, tüm yüzeyler aynı mı
// Tek kaynak src/kategori-sistemi.js'tir. Bu betik, kategori listesini ayrıca
// taşıyan her yüzeyin (portal HTML'i, portal betiği, renkler, Sabah Masası,
// menü sözlüğü, kapak aracı) o kaynakla aynı kaldığını denetler.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  KATEGORILER, KATEGORI_ANAHTARLARI, BALIKESIR_ILCELERI, kategoriCoz, kategoriVerisi
} from '../src/kategori-sistemi.js';

const HEDEF = 'public/data/kategoriler.json';
const metin = JSON.stringify(kategoriVerisi(), null, 2) + '\n';
const kip = process.argv[2] || '--kontrol';

if (kip === '--yaz') {
  writeFileSync(HEDEF, metin);
  console.log('yazıldı', HEDEF, KATEGORILER.length, 'kategori');
  process.exit(0);
}

// 1) Üretilen veri dosyası güncel.
let mevcut = '';
try { mevcut = readFileSync(HEDEF, 'utf8'); } catch {}
assert.equal(mevcut, metin, HEDEF + ' güncel değil: node tools/kategori-sistemi.mjs --yaz');

// 2) Portal rayı ve çekmece: aynı anahtarlar, aynı sıra.
const sayfa = readFileSync('public/haberler/index.html', 'utf8');
const ray = sayfa.slice(sayfa.indexOf('<div class="hm-ray-iz">'), sayfa.indexOf('</nav>', sayfa.indexOf('<div class="hm-ray-iz">')));
const rayAnahtarlari = [...ray.matchAll(/data-hm-kategori="([a-z]+)"/g)].map(m => m[1]).filter(k => k !== 'tumu');
assert.deepEqual(rayAnahtarlari, KATEGORI_ANAHTARLARI, 'portal rayı kategori sırası tek kaynakla aynı olmalı');
for (const k of KATEGORI_ANAHTARLARI) assert.match(sayfa, new RegExp(`<small data-hm-sayi="${k}"></small>`), 'çekmecede sayaç eksik: ' + k);

// 3) Bölüm renkleri portal.css'te tanımlı ve aynı.
const css = readFileSync('public/haberler/portal.css', 'utf8');
for (const k of KATEGORILER) assert.ok(css.includes(`[data-kat=${k.anahtar}]{--kat:${k.renk}}`), 'renk ayrışmış: ' + k.anahtar);

// 4) Portal betiği: adlar ve sıra aynı; yedek sınıflandırıcı tek kaynakla uyumlu.
const betik = readFileSync('public/haberler-akisi.js', 'utf8');
const kum = { document: { querySelector: () => null }, matchMedia: () => ({ matches: false }) };
vm.runInNewContext(betik.replace('if (!kok) return;', 'if (!kok) { globalThis.kategoriBul = kategori; globalThis.KAT = KATEGORILER; globalThis.SIRA = KATEGORI_SIRA; return; }'), Object.assign(kum, { globalThis: kum }));
assert.deepEqual(Array.from(kum.KAT, k => k[0]), KATEGORI_ANAHTARLARI, 'portal betiği anahtarları');
assert.deepEqual(Array.from(kum.KAT, k => k[1]), KATEGORILER.map(k => k.ad), 'portal betiği adları');
assert.deepEqual(Array.from(kum.SIRA), KATEGORI_ANAHTARLARI, 'portal betiği sırası');
const ilceKaynak = betik.match(/var ILCELER = (\{[^}]+\});/);
assert.ok(ilceKaynak, 'portal betiğinde ilçe listesi yok');
assert.deepEqual(JSON.parse(JSON.stringify(vm.runInNewContext('(' + ilceKaynak[1] + ')'))), BALIKESIR_ILCELERI, 'ilçe listesi ayrışmış');

// Kabul örnekleri: tek kaynak ve tarayıcı yedeği aynı sonucu verir.
const ornekler = [
  ['Yerel · Pazar', ''], ['Ekonomi', 'Balıkesir’de yeni pazar düzenlemesi'], ['Teknoloji', 'Balıkesir’de yeni dijital portal hizmete girdi'],
  ['Yapay Zekâ', ''], ['Kültür · Zanaat', ''], ['Ekonomi · Emlak', ''], ['Gündem · Asayiş', ''], ['Sağlık · Beslenme', ''],
  ['Spor', ''], ['Eğitim', ''], ['Dünya', ''], ['Yaşam', ''], ['Türkiye', ''], ['Spor', 'Milli güreşçi dünya şampiyonu oldu'],
  ['', 'Balıkesir Büyükşehir yeni hat açtı'], ['Eğitim', 'Büyükçekmece Belediyesi bilim şenliği düzenledi'],
  ['Ekonomi', 'Küresel pazar rafineri kapasitesini tartışıyor'], ['Dünya', 'Zirve pazar günü toplanacak'],
  ['Türkiye', 'Bakanlık şehirler arası ulaşım planını açıkladı'], ['Tarım · Ekonomi', 'Altıeylül’de hasat başladı']
];
for (const [category, title] of ornekler) {
  assert.equal(kategoriCoz({ category, title }).ana, kum.kategoriBul({ category, title }), `yedek ayrıştı: ${category} | ${title}`);
}

// 5) v3 modeli: ikincil bölüm ve alt konu.
const yerelEkonomi = kategoriCoz({ category: 'Ekonomi · Emlak', title: 'Edremit’te kira artışı' });
assert.equal(yerelEkonomi.ana, 'balikesir');
assert.deepEqual(yerelEkonomi.ikincil, ['ekonomi'], 'yerel ekonomi haberi Ekonomi bölümünde de listelenmeli');
assert.equal(yerelEkonomi.alt, 'Edremit', 'Balıkesir haberinde alt konu ilçedir');
assert.equal(kategoriCoz({ category: 'Ekonomi · Emlak', title: 'Konut satışları arttı' }).alt, 'Emlak');
assert.equal(kategoriCoz({ category: 'Tarım · Etkinlik · Video', title: 'Hasat şenliği' }).alt, 'Etkinlik', 'biçim sözcüğü alt konu olmaz');
assert.equal(kategoriCoz({ category: 'Yerel', title: 'Sarımsaklı’da dans festivali: 5 ülkeden 300 dansçı' }).ana, 'balikesir', 'Yerel yazımı Balıkesir’dir');
assert.equal(kategoriCoz({ category: '', title: 'Büyükçekmece Belediyesi konser verdi' }).ana, 'gundem', 'genel kelime (belediye) yer adı sayılmaz');
assert.equal(kategoriCoz({ category: 'Gündem', title: 'İvrindi’de yangın' }).ana, 'balikesir', 'İvrindi yer adıdır');

// 6) Sabah Masası yalnız tanımlı bölümlere yazar.
const sabah = readFileSync('src/sabah-masasi.js', 'utf8');
const sabahAnahtarlar = [...sabah.slice(sabah.indexOf('export const KATEGORILER = ['), sabah.indexOf('];', sabah.indexOf('export const KATEGORILER = ['))).matchAll(/anahtar: '([a-z]+)'/g)].map(m => m[1]);
assert.ok(sabahAnahtarlar.length >= 10, 'Sabah Masası kategorileri okunamadı');
for (const k of sabahAnahtarlar) assert.ok(KATEGORI_ANAHTARLARI.includes(k), 'Sabah Masası tanımsız bölüm: ' + k);

// 7) Menü sözlüğündeki haber bölümü bağlantıları geçerli bölümlere gider.
const menu = readFileSync('public/data/btmedya-taxonomy.js', 'utf8');
for (const m of menu.matchAll(/href:"\/haberler\/([a-z]+)\/"/g)) assert.ok(KATEGORI_ANAHTARLARI.includes(m[1]), 'menüde tanımsız bölüm: ' + m[1]);

// 8) Kapak aracı plakaları tek kaynaktan okur.
const kapak = readFileSync('tools/haber-kapagi.py', 'utf8');
assert.match(kapak, /kategoriler\.json/, 'haber-kapagi.py kategori plakalarını kategoriler.json’dan okumalı');

// 9) Worker eski kopyaları taşımıyor.
const worker = readFileSync('src/worker.js', 'utf8');
assert.ok(!/function haberKategoriAnahtari/.test(worker), 'worker kendi sınıflandırıcısını taşımamalı');
assert.ok(!/const BALIKESIR_ILCELERI\s*=/.test(worker), 'worker kendi ilçe listesini taşımamalı');

console.log('KATEGORI SISTEMI TUTARLI:', KATEGORI_ANAHTARLARI.length, 'bölüm,', Object.keys(BALIKESIR_ILCELERI).length, 'ilçe');
