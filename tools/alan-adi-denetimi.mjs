#!/usr/bin/env node
/* BTMEDYA — alan adı ve yönlendirme denetimi
 *
 * Neden var: marka iki alan adı taşıyor (btmedya.com.tr yayında,
 * btmedyaajans.com ikincil) ve main dalına push doğrudan canlı siteyi
 * güncelliyor. Kanonik adresle ilgili bir hata deploy'u bozmaz, site 200
 * dönmeye devam eder; yalnızca arama motoru iki adresi ayrı kaynak sayar.
 * Yani bu sınıf hatanın gürültüsü yok. Bu betik onları push öncesinde
 * yakalar.
 *
 * Kapsam bilerek dar: yalnızca alan adı, kanonik adres ve host yönlendirmesi.
 * Erişilebilirlik, CSS, bağlantılar, mobil ve gerileme kontrolleri ayrı
 * araçlarda (tools/a11y-denetimi.mjs, css-denetimi.mjs, link-denetimi.mjs,
 * mobile-regression-gate.mjs, gerileme-denetimi.mjs).
 *
 * Kullanım:  node tools/alan-adi-denetimi.mjs
 * Çıkış kodu 0 = temiz, 1 = en az bir hata.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const oku = (p) => readFileSync(join(KOK, p), 'utf8');

const hatalar = [];
const notlar = [];
const hata = (baslik, ayrinti) => hatalar.push({ baslik, ayrinti });
const not = (m) => notlar.push(m);

const workerKaynak = oku('src/worker.js');
const wrangler = oku('wrangler.toml');
const robots = oku('public/robots.txt');

/* Kanonik host worker.js'teki tek kaynaktan okunur. Denetimin kendi kopyasını
   tutması, iki yerde birden değiştirme zorunluluğu demek olurdu; o da bu
   betiğin önlemeye çalıştığı hatanın aynısı. */
const kanonikEslesme = workerKaynak.match(/const\s+KANONIK_HOST\s*=\s*['"]([^'"]+)['"]/);
if (!kanonikEslesme) {
  hata('src/worker.js içinde KANONIK_HOST bulunamadı',
       'Sabitin adı değiştiyse bu betikteki okuma da güncellenmeli.');
}
const KANONIK = kanonikEslesme ? kanonikEslesme[1] : null;

const ikincilBlok = workerKaynak.match(/const\s+IKINCIL_HOSTLAR\s*=\s*new Set\(\[([^\]]*)\]\)/);
const IKINCIL = ikincilBlok
  ? [...ikincilBlok[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
  : [];

/* run_worker_first tek satırlık bir dizi; TOML kütüphanesi yok (npm yok). */
const rwfBlok = wrangler.match(/^run_worker_first\s*=\s*\[([^\]]*)\]/m);
if (!rwfBlok) {
  hata('wrangler.toml içinde run_worker_first bulunamadı',
       'Liste çok satıra bölündüyse bu betikteki okuma da güncellenmeli.');
}
const DESENLER = rwfBlok
  ? [...rwfBlok[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
  : [];

/* Cloudflare yol deseni: yalnızca * joker, baştan sona eşleşme. */
const desenEsler = (desen, yol) => {
  const kalip = desen.split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${kalip}$`).test(yol);
};
const kapsiyor = (yol) => DESENLER.some((d) => desenEsler(d, yol));

const sitemapYollari = (() => {
  const cikti = new Set();
  for (const dosya of ['public/sitemap.xml', 'public/news-sitemap.xml']) {
    if (!existsSync(join(KOK, dosya))) continue;
    for (const m of oku(dosya).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      try { cikti.add(new URL(m[1]).pathname); } catch { /* biçim bozuk, aşağıda yakalanır */ }
    }
  }
  return [...cikti];
})();

const htmlDosyalari = (() => {
  const cikti = [];
  const gez = (dizin) => {
    for (const ad of readdirSync(dizin)) {
      const tam = join(dizin, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (ad.endsWith('.html')) cikti.push(relative(KOK, tam));
    }
  };
  gez(join(KOK, 'public'));
  return cikti.sort();
})();

/* ---------- 1) Tek kanonik adres ---------- */
/* Yönlendirme doğru çalışsa bile sitemap, robots ya da sayfa içi canonical
   başka bir host gösteriyorsa arama motoruna çelişen iki kanonik sinyal gider
   ve hangisini seçeceğine kendi karar verir. */
if (KANONIK) {
  const yabanciHostlar = new Set();
  for (const dosya of ['public/sitemap.xml', 'public/news-sitemap.xml']) {
    if (!existsSync(join(KOK, dosya))) continue;
    for (const m of oku(dosya).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      let h = null;
      try { h = new URL(m[1]).hostname; } catch { h = m[1]; }
      if (h !== KANONIK) yabanciHostlar.add(`${dosya}: ${h}`);
    }
  }
  if (yabanciHostlar.size) {
    hata('sitemap kanonik olmayan host içeriyor',
         `Beklenen: ${KANONIK}\n        ${[...yabanciHostlar].join('\n        ')}`);
  }

  const robotsSatirlari = [...robots.matchAll(/^Sitemap:\s*(\S+)/gmi)].map((m) => m[1]);
  if (robotsSatirlari.length === 0) {
    hata('robots.txt içinde Sitemap satırı yok',
         'Google 2023\'ten beri ping ile harita bildirimini kabul etmiyor; robots.txt kalan iki yoldan biri.');
  }
  for (const satir of robotsSatirlari) {
    let h = null;
    try { h = new URL(satir).hostname; } catch { h = satir; }
    if (h !== KANONIK) {
      hata('robots.txt Sitemap satırı kanonik host göstermiyor',
           `Beklenen: ${KANONIK} — bulunan: ${h}`);
    }
  }

  const kotuCanonical = [];
  for (const dosya of htmlDosyalari) {
    const icerik = oku(dosya);
    for (const etiket of icerik.matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi)) {
      const href = etiket[0].match(/href=["']([^"']+)["']/i);
      if (!href) continue;
      let h = null;
      try { h = new URL(href[1], `https://${KANONIK}`).hostname; } catch { continue; }
      if (h !== KANONIK) kotuCanonical.push(`${dosya}: ${h}`);
    }
  }
  if (kotuCanonical.length) {
    hata('sayfa içi canonical kanonik olmayan host gösteriyor',
         `Beklenen: ${KANONIK}\n        ${kotuCanonical.join('\n        ')}`);
  }

  if (!hatalar.length) {
    not(`kanonik adres tutarlı: ${KANONIK} (sitemap + robots.txt + canonical etiketleri).`);
  }
}

/* ---------- 2) run_worker_first, indekslenen her yolu kapsıyor mu ---------- */
/* Statik dosya Worker'dan önce servis edilir. Kapsanmayan bir sayfa için
   Worker hiç çalışmaz; www -> apex 301'i, güvenlik başlıkları ve X-Robots-Tag
   o sayfada sessizce devre dışı kalır, sayfa hem www hem apex adresinde 200
   döner. Bu hata bu depoda daha önce yaşandı. */
if (DESENLER.length && sitemapYollari.length) {
  const kapsamsiz = sitemapYollari.filter((y) => !kapsiyor(y));
  if (kapsamsiz.length) {
    hata('sitemap\'teki bu yollar run_worker_first kapsamında değil',
         `${kapsamsiz.join('\n        ')}\n        Çözüm: wrangler.toml > run_worker_first listesine desen ekleyin.`);
  } else {
    not(`run_worker_first, sitemap'teki ${sitemapYollari.length} yolun tamamını kapsıyor.`);
  }
}

/* ---------- 3) İkincil alan adı Custom Domain olarak bağlanmamış ---------- */
/* İkincil adres yalnızca 301 döndürecek. Custom Domain olarak bağlanırsa her
   istek ücretli bir Worker çağrısına döner ve yönlendirme yine yalnızca
   run_worker_first kapsamındaki yollarda çalışır. Doğru yer zone üzerindeki
   Redirect Rule. */
{
  const rotaDesenleri = [...wrangler.matchAll(/^\s*pattern\s*=\s*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  const yanlisBagli = rotaDesenleri.filter((p) => {
    const host = p.split('/')[0].toLowerCase().replace(/^www\./, '');
    return IKINCIL.includes(host);
  });
  if (yanlisBagli.length) {
    hata('ikincil alan adı wrangler.toml içinde route olarak tanımlı',
         `${yanlisBagli.join(', ')}\n        Yalnızca yönlendirme için Custom Domain açmak her isteği ücretli `
         + 'Worker çağrısına çevirir ve kapsamı run_worker_first ile sınırlar. '
         + 'Zone üzerindeki Redirect Rule kullanın: docs/ALAN-ADI-YAPILANDIRMA.md');
  } else if (rotaDesenleri.length) {
    not(`wrangler.toml rotaları yalnızca kanonik alan adını taşıyor (${rotaDesenleri.length} rota).`);
  }
}

/* ---------- 4) Yönlendirme tablosu gerçekten doğru mu ---------- */
/* Tablo elle okunduğunda doğru görünüp yanlış davranabilir: www eki ile
   ikincil alan adı aynı fonksiyonda çözülüyor ve sıra önemli. Fonksiyon
   kaynaktan olduğu gibi çıkarılıp çalıştırılır; kopyası tutulmaz, yoksa test
   ettiği şey gerçek kod olmaktan çıkar.
   En önemli vaka: www.<ikincil> TEK 301 ile kanonik adrese gitmeli. İki adımda
   giderse (önce ikincil apex, sonra kanonik) zincir oluşur; zincir yavaştır ve
   bazı tarayıcılarda sinyal kaybına yol açar. */
if (KANONIK) {
  let fn = null;
  try {
    const parcalar = [
      workerKaynak.match(/const KANONIK_HOST[\s\S]*?;/)[0],
      workerKaynak.match(/const IKINCIL_HOSTLAR[\s\S]*?;/)[0],
      workerKaynak.match(/function kanonikHedef\(host\)\{[\s\S]*?\n\}/)[0],
    ].join('\n');
    fn = new Function(`${parcalar}; return kanonikHedef;`)();
  } catch {
    hata('kanonikHedef src/worker.js içinden çıkarılamadı',
         'Fonksiyonun adı ya da biçimi değiştiyse bu betikteki okuma da güncellenmeli.');
  }

  if (fn) {
    const vakalar = [
      [KANONIK, null, 'kanonik adres yönlendirilmez'],
      [`www.${KANONIK}`, KANONIK, 'www eki kırpılır'],
      ...IKINCIL.flatMap((ik) => [
        [ik, KANONIK, 'ikincil alan adı kanonike gider'],
        [`www.${ik}`, KANONIK, 'www + ikincil TEK adımda kanonike gider'],
        [ik.toUpperCase(), KANONIK, 'büyük harfli host da yakalanır'],
      ]),
      ['btmedya-db.ornek.workers.dev', null, 'workers.dev önizlemesi yönlendirilmez'],
    ];
    const basarisiz = vakalar.filter(([host, beklenen]) => fn(host) !== beklenen);
    if (basarisiz.length) {
      hata('kanonikHedef beklenen sonucu vermiyor',
           basarisiz.map(([h, b, aciklama]) =>
             `${h} -> ${fn(h)} (beklenen: ${b}) — ${aciklama}`).join('\n        '));
    } else {
      not(`yönlendirme tablosu: ${vakalar.length} host vakası geçti.`);
    }
  }
}

/* ---------- rapor ---------- */
for (const m of notlar) console.log(`  ok  ${m}`);

if (hatalar.length === 0) {
  console.log('\nAlan adı denetimi temiz.');
  process.exit(0);
}

console.error(`\n${hatalar.length} hata:\n`);
for (const { baslik, ayrinti } of hatalar) {
  console.error(`  HATA  ${baslik}`);
  console.error(`        ${ayrinti}\n`);
}
process.exit(1);
