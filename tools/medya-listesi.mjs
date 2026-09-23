#!/usr/bin/env node
/* =====================================================================
 * MEDYA LISTESI URETICISI
 *
 * Medya kasasinin listesi src/worker.js icinde elle yazili duruyordu.
 * Depoya yeni bir dosya konunca kodu da duzenlemek gerekiyordu; bu yuzden
 * "GitHub'a yukle, sitede gorunsun" akisi kopuktu. Ornegin bu urcetici
 * yazilmadan once diskte 65 medya dosyasi varken listede 49 tanesi vardi.
 *
 * Artik kaynak gercek dosya sisteminin kendisi. Bu betik public/assets
 * altini tarar ve public/data/medya-listesi.json dosyasini uretir; Worker
 * o dosyayi ASSETS uzerinden okur.
 *
 * Kullanim:
 *   node tools/medya-listesi.mjs           listeyi uretir
 *   node tools/medya-listesi.mjs --kontrol  uretmeden fark var mi bakar
 * ===================================================================== */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const VARLIK_KOK = 'public/assets';
const CIKTI = 'public/data/medya-listesi.json';
const OZEL = 'public/data/medya-ozel.json';

const MEDYA_UZANTISI = /\.(?:mp4|webm|mov|m4v|webp|jpe?g|png|mp3|wav|m4a)$/i;

// Medya kasasina giren icerik klasorleri. Varlik kokundeki diger dosyalar
// site arayuzune aittir (favicon, amblem, sosyal paylasim gorseli, poster
// kareleri) ve kasada listelenmemelidir.
const ICERIK_KLASORLERI = ['media', 'haber-kapak', 'sosyal'];

// Kokte yalnizca hero varliklari icerik sayilir; kokteki diger dosyalar
// (favicon, amblem, marka gorselleri) site arayuzune aittir.
const KOK_ICERIK = /^hero-/i;
const POSTER = /^poster-/i;

function* dosyalar(dizin) {
  for (const girdi of readdirSync(dizin, { withFileTypes: true })) {
    const yol = join(dizin, girdi.name);
    if (girdi.isDirectory()) yield* dosyalar(yol);
    else yield yol;
  }
}

/** Dosya medya kasasina girmeli mi? */
export function kasayaGirer(gorecelYol) {
  if (!MEDYA_UZANTISI.test(gorecelYol)) return false;
  if (POSTER.test(gorecelYol.split('/').pop())) return false;
  const parca = gorecelYol.split('/');
  if (parca.length > 1) return ICERIK_KLASORLERI.includes(parca[0]);
  return KOK_ICERIK.test(parca[0]);
}

// media/ alt klasorlerinin kategori karsiligi. Worker'in R2 anahtarlari
// icin kullandigi mediaCategoryFromKey kuralayla ayni hizada tutulur.
const MEDYA_ALT = {
  portfoy: 'portfoy',
  'ai-lab': 'ai-lab',
  kurumsal: 'medya',
  podcast: 'medya',
  web: 'video',
};

export function kategori(gorecelYol) {
  const parca = gorecelYol.split('/');
  if (parca.length === 1) return 'hero';
  const p = parca[0].toLowerCase();
  if (p === 'haber-kapak') return 'haber';
  if (p === 'sosyal') return 'sosyal';
  return MEDYA_ALT[String(parca[1] || '').toLowerCase()] || 'video';
}

export function listeUret(kok = VARLIK_KOK, ozelYol = OZEL) {
  const ozel = existsSync(ozelYol) ? JSON.parse(readFileSync(ozelYol, 'utf8')) : {};
  const gercekler = new Set(ozel.gercek || []);
  const disarida = new Set(ozel.haric || []);

  const yollar = [...dosyalar(kok)]
    .map((y) => relative(kok, y).split('\\').join('/'))
    .filter((y) => kasayaGirer(y) && !disarida.has(y))
    .sort();

  return yollar.map((yol, i) => ({
    path: yol,
    id: `static-${i + 1}`,
    category: kategori(yol),
    ...(gercekler.has(yol) ? { gercek: true } : {}),
  }));
}

const kontrol = process.argv.includes('--kontrol');
const liste = listeUret();
const metin = JSON.stringify(liste, null, 1) + '\n';
const eski = existsSync(CIKTI) ? readFileSync(CIKTI, 'utf8') : '';

if (kontrol) {
  if (metin !== eski) {
    console.error(`${CIKTI} guncel degil. "node tools/medya-listesi.mjs" calistirin.`);
    process.exit(1);
  }
  console.log(`${CIKTI} guncel (${liste.length} kayit).`);
} else {
  writeFileSync(CIKTI, metin);
  const gercek = liste.filter((x) => x.gercek).length;
  console.log(`${CIKTI} yazildi: ${liste.length} kayit (${gercek} gercek cekim).`);
}
