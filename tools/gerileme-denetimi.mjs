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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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

/* 5) GERCEK CEKIM etiketi gercekten gercek bir kareye bakmali.
      24 Eylul 2026: anasayfanin 01/HABER sekmesi "GERCEK CEKIM · BUSE TUNCAY"
      diyordu ama gosterdigi kare yapay zeka uretimi bir yuzdu — ustelik
      muhabirin kendi yuzu bile degildi. Bir haber markasinda bu dogrudan
      yanlis beyan. Dogruluk kaynagi public/data/medya-ozel.json. */
{
  const ozelYol = 'public/data/medya-ozel.json';
  const ozel = existsSync(ozelYol) ? JSON.parse(readFileSync(ozelYol, 'utf8')) : {};
  const gercek = new Set(ozel.gercek || []);
  for (const sayfa of ['public/index.html']) {
    if (!existsSync(sayfa)) continue;
    const metin = readFileSync(sayfa, 'utf8');
    const dugme = /data-image="\/assets\/([^"]+)"[^>]*?data-source="([^"]*)"/g;
    let m;
    while ((m = dugme.exec(metin))) {
      const [, yol, kaynak] = m;
      if (!/GERÇEK ÇEKİM/.test(kaynak)) continue;
      if (!gercek.has(yol)) {
        bulgular.push(`${sayfa}: "${kaynak}" etiketi /assets/${yol} karesine basiliyor ` +
          `ama bu kare ${ozelYol} gercek listesinde yok (varsayilan AI URETIMI).`);
      }
    }
  }
}

/* 6) Haber kapaklarinin kaynak kaydi plandan turemeli; elle yazilirsa
      kapak karesi degistiginde rozet eski kaynagi gostermeye devam eder. */
{
  const planYol = 'public/data/haber-kapak-plani.json';
  const havuzYol = 'public/data/kapak-fotograflari.json';
  const kaynakYol = 'public/data/haber-kapak-kaynagi.json';
  if (existsSync(planYol) && existsSync(havuzYol) && existsSync(kaynakYol)) {
    const plan = JSON.parse(readFileSync(planYol, 'utf8'));
    const havuz = Object.fromEntries(JSON.parse(readFileSync(havuzYol, 'utf8')).map(k => [k.ad, k]));
    const kaynak = JSON.parse(readFileSync(kaynakYol, 'utf8'));
    for (const h of plan) {
      const kare = havuz[h.foto || ''];
      const olmasiGereken = kare && kare.gercek ? 'gercek' : 'ai';
      if (kaynak[h.slug] !== olmasiGereken) {
        bulgular.push(`${kaynakYol}: "${h.slug}" ${kaynak[h.slug] ?? 'kayitsiz'} yaziyor, ` +
          `plandaki kare "${h.foto}" ise ${olmasiGereken}. ` +
          '"python3 tools/haber-kapagi.py" calistirin.');
      }
    }
  }
}

/* 7) Vitrin disi birakma ve elle yazilmis baslik veride durmali.
      Ikisi de bir donem kodda sabitti: home.js icinde dosya adi arayan bir
      regex, worker'da her basligi dosya adindan ureten bir satir. Kayit
      degisince kod da duzenlenmek zorunda kaliyordu. */
{
  const home = existsSync('public/home.js') ? readFileSync('public/home.js', 'utf8') : '';
  const m = home.match(/const arsivDisi\s*=\s*[^;]+;/);
  if (m && /showreel|\.mp4|\.webp|portfoy\//i.test(m[0])) {
    bulgular.push('public/home.js arsivDisi() dosya adi sabitlemis. ' +
      'Vitrin disi kayitlar public/data/medya-ozel.json vitrinDisi listesinden gelmeli.');
  }
  if (worker.includes("source:'github-static'") && !worker.includes('title:x.baslik||')) {
    bulgular.push("src/worker.js statik besleyicide baslik yalnizca dosya adindan turuyor. " +
      'Elle yazilmis baslik medya-ozel.json baslik haritasindan gelmeli (x.baslik).');
  }
}

if (bulgular.length) {
  console.error('GERILEME BULUNDU:\n');
  bulgular.forEach((b, i) => console.error(`  ${i + 1}. ${b}\n`));
  process.exit(1);
}
console.log('Gerileme denetimi temiz: medya listesi uretilen dosyadan okunuyor, ' +
  'regex kacislari dogru, kaynak etiketi oge basina turuyor, TikTok hesabi guncel, ' +
  'GERCEK CEKIM etiketleri gercek karelere basiyor.');
