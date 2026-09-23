#!/usr/bin/env node
/* =====================================================================
 * GERILEME DENETIMI
 *
 * Bu depoda ayni dort hata birden fazla kez geri geldi. Sonuncusunda
 * medya kasasi 78 kayittan 51'e dustu, silinmis filigranli karelerin
 * kirik baglantilari geri geldi ve butun ogeler yeniden "GERCEK CEKIM"
 * etiketi almaya basladi. Hicbiri gozle fark edilmedi.
 *
 * Bu betik o dordunu kod duzeyinde sabitler. main'e her push'ta calisir.
 *
 * Kullanim: node tools/gerileme-denetimi.mjs
 * ===================================================================== */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const bulgular = [];
const worker = readFileSync('src/worker.js', 'utf8');

/* 1) Medya kasasinin kaynagi dosya sistemi olmali.
      Elle yazili dizi geri gelirse depoya konan dosya sitede gorunmez. */
if (/const\s+STATIC_REAL_MEDIA\s*=/.test(worker)) {
  bulgular.push('src/worker.js elle yazili STATIC_REAL_MEDIA dizisini tasiyor. ' +
    'Medya listesi public/data/medya-listesi.json dosyasindan okunmali (PR #72).');
}
if (!/async function medyaListesi\(/.test(worker) || !/await medyaListesi\(/.test(worker)) {
  bulgular.push('src/worker.js icinde medyaListesi() tanimi yada cagrisi yok. ' +
    'Medya kasasi uretilen listeden beslenmeli (PR #72).');
}

/* 2) Regex literalinde \\. TERS BOLU arar, nokta degil. Bu hata once mime
      tespitini, sonra baslik uretimini bozdu; ikisi de sessizce. */
for (const kalip of worker.match(/\/[^/\n]*\\\\\.[^/\n]*\/[gimsuy]*/g) || []) {
  bulgular.push(`src/worker.js regex literalinde \\\\. var: ${kalip.slice(0, 60)} ` +
    '— bu nokta degil ters bolu arar.');
}

/* 3) Kaynak etiketi ogenin kendi kaydindan turemeli. Sabit 'gercek' /
      ai_generated:false her kareyi GERCEK CEKIM gosterir; AGENTS.md
      varsayilani AI URETIMIdir. */
if (/tags:\['BTMEDYA','gercek','arsiv'\]/.test(worker) ||
    /source:'github-static',ai_generated:false/.test(worker)) {
  bulgular.push("src/worker.js statik besleyicide kaynak etiketini sabitlemis. " +
    "tags ve ai_generated ogenin kendi 'gercek' alanindan turemeli (PR #56).");
}

/* 4) @btcraft10 TikTok hesabi acilmiyor; dogrulanmis hesap @btmedya1010. */
const tara = (dizin) => {
  for (const g of readdirSync(dizin, { withFileTypes: true })) {
    const y = join(dizin, g.name);
    if (g.isDirectory()) { if (g.name !== '.git' && g.name !== 'node_modules') tara(y); }
    else if (/\.(html|js|json|md|toml)$/i.test(g.name) && readFileSync(y, 'utf8').includes('btcraft10')) {
      bulgular.push(`${y} olu TikTok hesabini (@btcraft10) gosteriyor; dogrusu @btmedya1010.`);
    }
  }
};
tara('public'); tara('src');

if (bulgular.length) {
  console.error('GERILEME BULUNDU:\n');
  bulgular.forEach((b, i) => console.error(`  ${i + 1}. ${b}\n`));
  process.exit(1);
}
console.log('Gerileme denetimi temiz: medya listesi uretilen dosyadan okunuyor, ' +
  'regex kacislari dogru, kaynak etiketi oge basina turuyor, TikTok hesabi guncel.');
