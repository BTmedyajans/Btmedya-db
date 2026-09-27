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

/* 2) Regex literalinde iki ters bolu (\\.) ters bolu arar, nokta degil.
      Bu hata once mime tespitini, sonra baslik uretimini bozdu; ikisi de sessizce.
      Kaynak metnini dogrudan kontrol ediyoruz; onceki regex denetimi tek ters
      boluyu de esleyerek gecerli /\./ kaliplarini yanlis bildiriyordu. */
for (const satir of worker.split('\n')) {
  if (!satir.includes('\\\\.')) continue;
  bulgular.push(`src/worker.js regex literalinde \\\\. var: ${satir.trim().slice(0, 60)} ` +
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
      // Vurgu alanı olan kapaklar fotoğraf değil bilgi kartıdır; üretici
      // bunları "grafik" olarak kaydeder. Temsili/arsiv fotoğraflarda ise
      // doğruluk etiketi plan kaydındaki rozetten gelir; havuzdaki "gercek"
      // alanı yalnızca ajansın kendi fotoğrafları için geçerlidir.
      const olmasiGereken = h.temsili?.rozet || (h.vurgu ? 'grafik' : kare && kare.gercek ? 'gercek' : 'ai');
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
  /* 25-26 Eylul 2026: worker.js'in statik besleyici satiri iki kez bastan
     yazildi ve her seferinde alan kaybetti. Once x.baslik dustu (19b747e
     geri koydu), sonra vitrin, sira ve poster dustu. Hicbiri hata vermedi:
     home.js undefined okuyup sessizce eski davranisa donuyor, vitrin
     alfabetik siralanip ayni cekimden bes portre yan yana diziliyor, video
     karti siyah kaliyor. Bu yuzden kontrol tek alana degil, arayuzun
     okudugu her alana bakar. */
  // Besleyici tek satirda duruyor; satirin tamami alinir. source:'...' den
  // sonrasini almak yetmez, title alani o isaretin oncesinde geliyor.
  const besleyici = (worker.split('\n').find((l) => l.includes("source:'github-static'")) || '');
  const alanlar = [
    ['baslik', /\bo?\.?baslik\b|x\.baslik/, 'title:x.baslik||', 'elle yazilmis baslik'],
    ['vitrin', /\bo\.vitrin\b/, 'vitrin:', 'vitrin disi birakma'],
    ['sira', /\bx\.sira\b/, 'sira:', 'vitrin sirasi'],
    ['poster', /\bo\.poster\b/, 'poster:', 'video kapak karesi'],
  ];
  if (worker.includes("source:'github-static'")) {
    for (const [ad, arayuzKalibi, workerKalibi, ne] of alanlar) {
      if (arayuzKalibi.test(home) && !besleyici.includes(workerKalibi)) {
        bulgular.push(`src/worker.js statik besleyicisi "${ad}" alanini gondermiyor ` +
          `ama public/home.js onu okuyor (${ne}). Alan dustugunde hata cikmaz, ` +
          'arayuz sessizce eski davranisa doner.');
      }
    }
  }
}

/* 8) Giris filmi sahne rozetleri dosyanin gercek kaynagini gostermeli.
      24 Eylul 2026 (a3e79e2): dort sahnenin etiketi, videolar degismeden
      "GERCEK CEKIM" yapildi. Videolar yapay zeka uretimi (robot zirh,
      patlama, sehir ustunde ucus); medya-ozel.json gercek listesinde yoklar.
      Kural: bir sahne GERCEK CEKIM diyorsa videosu gercek listesinde olmali. */
{
  const home = existsSync('public/home.js') ? readFileSync('public/home.js', 'utf8') : '';
  const index = existsSync('public/index.html') ? readFileSync('public/index.html', 'utf8') : '';
  const ozel = existsSync('public/data/medya-ozel.json') ? JSON.parse(readFileSync('public/data/medya-ozel.json', 'utf8')) : {};
  const gercek = new Set(ozel.gercek || []);
  // Sahne -> yuva, yuva -> index.html'deki data-src
  const sahneler = [...home.matchAll(/\{key:'([a-z]+)',yuva:'([a-z-]+)',k:'[^']*',kaynak:'([^']*)'/g)];
  for (const [, key, yuva, kaynak] of sahneler) {
    const m = index.match(new RegExp(`data-slot="${yuva}"[^>]*data-src="/assets/([^"]+)"`));
    const dosya = m && m[1];
    if (kaynak === 'GERÇEK ÇEKİM' && (!dosya || !gercek.has(dosya))) {
      bulgular.push(`public/home.js giris filmi "${key}" sahnesi GERCEK CEKIM diyor ama videosu ` +
        `(${dosya || 'bulunamadi'}) medya-ozel.json gercek listesinde yok. Gercek cekim panelden ` +
        'yuvaya atanirsa rozet kendiliginden degisir; etiketi elle yazmayin.');
    }
  }
  if (/scene\.kaynak\s*\|\|\s*'GERÇEK ÇEKİM'/.test(home)) {
    bulgular.push("public/home.js sahne rozetinin varsayilani GERCEK CEKIM. AGENTS.md: varsayilan AI URETIMI.");
  }
  const ilk = sahneler[0] && sahneler[0][3];
  const htmlRozet = (index.match(/data-cinematic-kaynak>([^<]*)</) || [])[1];
  if (ilk && htmlRozet && ilk !== htmlRozet) {
    bulgular.push(`index.html giris rozeti "${htmlRozet}" ama ilk sahne "${ilk}" diyor; sayfa acilirken yanlis etiket gorunur.`);
  }
}

/* 9) Panel yuvalari sitede gercek bir yere bagli olmali.
      26 Eylul 2026: bes yuva eski tasarimdan kalmisti, sitede yeri yoktu;
      "Bu yere bagla" hicbir sey degistirmiyordu. Varsayilan dosyalar da
      index.html ile ayni olmali, yoksa panel sitenin kullanmadigi bir dosyayi
      "su an" diye gosterir. og-image sunucuda (HTMLRewriter) uygulanir. */
{
  const index = existsSync('public/index.html') ? readFileSync('public/index.html', 'utf8') : '';
  const slotBlok = (worker.match(/const SITE_SLOTS=\[([\s\S]*?)\];/) || [, ''])[1];
  const sluglar = [...slotBlok.matchAll(/\['([a-z0-9-]+)'/g)].map((m) => m[1]);
  for (const slug of sluglar) {
    if (slug === 'og-image') continue;
    if (!new RegExp(`data-slot(?:-[a-z]+)?="${slug}"`).test(index)) {
      bulgular.push(`panel yuvasi "${slug}" public/index.html'de hicbir yere bagli degil (data-slot yok); atama sitede hicbir sey degistirmez.`);
    }
  }
  const varsBlok = (worker.match(/const SITE_SLOT_VARSAYILAN=\{([\s\S]*?)\};/) || [, ''])[1];
  for (const [, slug, yol] of varsBlok.matchAll(/'([a-z0-9-]+)':\s*'([^']+)'/g)) {
    if (!index.includes('/assets/' + yol)) {
      bulgular.push(`SITE_SLOT_VARSAYILAN["${slug}"] = ${yol} ama index.html bu dosyayi kullanmiyor; panel yanlis "su an" gosterir.`);
    }
  }
}

if (bulgular.length) {
  console.error('GERILEME BULUNDU:\n');
  bulgular.forEach((b, i) => console.error(`  ${i + 1}. ${b}\n`));
  process.exit(1);
}
console.log('Gerileme denetimi temiz: medya listesi uretilen dosyadan okunuyor, ' +
  'regex kacislari dogru, kaynak etiketi oge basina turuyor, TikTok hesabi guncel, ' +
  'GERCEK CEKIM etiketleri gercek karelere basiyor, panel yuvalari siteye bagli.');
