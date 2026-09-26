#!/usr/bin/env node
/* =====================================================================
 * PAYLASIM ETIKETI YERLESTIRICI
 *
 * 26 Eylul 2026 denetimi: 10 sayfada og:image hic yoktu, kullanan iki
 * sayfa ise 175x202 pikselik bir logoyu gosteriyordu. Facebook, WhatsApp
 * ve X bu boyutu onizleme olarak kabul etmiyor; bir medya ajansinin
 * baglantilari sosyalde gorselsiz dusuyordu.
 *
 * Bu betik public/data/paylasim-kartlari.json'daki her kayit icin
 * ilgili sayfaya og:image ve twitter kart etiketlerini yazar. Etiketler
 * varsa guncellenir, yoksa og blogunun sonuna eklenir.
 *
 * Kullanim:
 *   node tools/paylasim-etiketi.mjs            etiketleri yazar
 *   node tools/paylasim-etiketi.mjs --kontrol  yazmadan eksik var mi bakar
 * ===================================================================== */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const KOK = 'https://btmedya.com.tr';
const PLAN = 'public/data/paylasim-kartlari.json';

// Kart adi -> sayfa dosyasi. Kart adi dosya adi olarak da kullanildigi
// icin tek istisna portfoy; onun yolu ic ice.
const SAYFA = {
  'portfoy-buse-tuncay': 'public/portfoy/buse-tuncay/index.html',
};
const sayfaYolu = (ad) => SAYFA[ad] || `public/${ad}/index.html`;
const kartYolu = (ad) => `/assets/paylasim/${ad}.webp`;

const kontrol = process.argv.includes('--kontrol');
const plan = JSON.parse(readFileSync(PLAN, 'utf8'));
const eksik = [];
let yazilan = 0;

for (const k of plan) {
  const yol = sayfaYolu(k.ad);
  if (!existsSync(yol)) { eksik.push(`${yol} yok`); continue; }
  if (!existsSync('public' + kartYolu(k.ad))) {
    eksik.push(`${kartYolu(k.ad)} uretilmemis — "python3 tools/paylasim-kapagi.py"`);
    continue;
  }

  let metin = readFileSync(yol, 'utf8');
  const gorsel = KOK + kartYolu(k.ad);
  const baslik = (metin.match(/<title>([^<]*)<\/title>/) || [, k.baslik])[1];
  const aciklama = (metin.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1];

  // Var olan etiketler once temizlenir; boylece betik tekrar tekrar
  // calistirilinca etiket cogalmaz.
  metin = metin.replace(
    /\s*<meta (?:property="og:image[^"]*"|name="twitter:(?:card|title|description|image)") content="[^"]*"\s*\/?>/g, '');

  const etiketler = [
    `<meta property="og:image" content="${gorsel}">`,
    `<meta property="og:image:secure_url" content="${gorsel}">`,
    `<meta property="og:image:type" content="image/webp">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="675">`,
    `<meta property="og:image:alt" content="${k.baslik} — BTMEDYA">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${baslik}">`,
    ...(aciklama ? [`<meta name="twitter:description" content="${aciklama}">`] : []),
    `<meta name="twitter:image" content="${gorsel}">`,
  ].join('');

  // og blogunun sonuna; yoksa description'dan sonra. Ikisi de yoksa
  // </head> oncesine, ki etiket hicbir durumda dusmesin.
  let yeni;
  if (/<meta property="og:url" content="[^"]*"\s*\/?>/.test(metin)) {
    yeni = metin.replace(/(<meta property="og:url" content="[^"]*"\s*\/?>)/, `$1${etiketler}`);
  } else if (/<meta name="description" content="[^"]*"\s*\/?>/.test(metin)) {
    yeni = metin.replace(/(<meta name="description" content="[^"]*"\s*\/?>)/, `$1${etiketler}`);
  } else {
    yeni = metin.replace('</head>', `${etiketler}</head>`);
  }

  if (yeni === readFileSync(yol, 'utf8')) continue;
  if (kontrol) { eksik.push(`${yol} guncel degil`); continue; }
  writeFileSync(yol, yeni);
  yazilan++;
  console.log(`  ${k.ad.padEnd(22)} -> ${kartYolu(k.ad)}`);
}

if (eksik.length) {
  console.error('\nEKSIK:\n' + eksik.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(kontrol ? 'Paylasim etiketleri guncel.' : `\n  ${yazilan} sayfaya paylasim etiketi yazildi.`);
