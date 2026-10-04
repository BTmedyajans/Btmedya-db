#!/usr/bin/env node
/* BTMEDYA — yapılandırma doğrulaması
 *
 * Neden var: main dalına push DOĞRUDAN canlı siteyi günceller. Araya hiçbir
 * deploy adımı girmediği için, yanlış bir yapılandırma ancak siteye bakan biri
 * fark ederse ortaya çıkar. Bu betik, AGENTS.md'de "sessizce bozan tuzaklar"
 * başlığı altında yazılı olan ve geçmişte gerçekten yaşanmış dört hatayı push
 * öncesinde yakalar.
 *
 * Kapsam dışı: görsel doğrulama. Kontrast, perde, video oynatma gözle
 * denetlenir (AGENTS.md > Doğrulama). Burada yalnızca makineyle kesin
 * söylenebilecek şeyler var.
 *
 * Kullanım:  node tools/dogrula.mjs
 * Çıkış kodu 0 = temiz, 1 = en az bir hata.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const oku = (p) => readFileSync(join(KOK, p), 'utf8');

const hatalar = [];
const notlar = [];
const hata = (baslik, ayrinti) => hatalar.push({ baslik, ayrinti });
const not = (m) => notlar.push(m);

/* ---------- ortak okumalar ---------- */

const workerKaynak = oku('src/worker.js');
const wrangler = oku('wrangler.toml');
const robots = oku('public/robots.txt');
const sitemap = oku('public/sitemap.xml');

/* Kanonik host, worker.js'teki tek kaynaktan okunur. Doğrulamanın kendi
   kopyasını tutmak, iki yerde birden değiştirme zorunluluğu demek olurdu;
   o da bu betiğin önlemeye çalıştığı hatanın aynısı. */
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

/* run_worker_first = ["/", "/haberler/*", ...] — TOML kütüphanesi yok (npm yok),
   tek satırlık dizi olduğu için düz okuma yeterli. */
const rwfBlok = wrangler.match(/^run_worker_first\s*=\s*\[([^\]]*)\]/m);
if (!rwfBlok) {
  hata('wrangler.toml içinde run_worker_first bulunamadı',
       'Liste çok satıra bölündüyse bu betikteki okuma da güncellenmeli.');
}
const DESENLER = rwfBlok
  ? [...rwfBlok[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
  : [];

/* Cloudflare yol deseni: yalnızca * joker. Baştan sona eşleşme aranır. */
const desenEsler = (desen, yol) => {
  const kalip = desen.split('*').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${kalip}$`).test(yol);
};
const kapsiyor = (yol) => DESENLER.some((d) => desenEsler(d, yol));

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

/* public/index.html -> "/", public/haberler/index.html -> "/haberler/" */
const yolaCevir = (dosya) =>
  '/' + dosya.replace(/^public\//, '').replace(/index\.html$/, '');

/* ---------- 1) Tek kanonik adres ---------- */
/* Tuzak: sitemap ya da robots ikincil alan adını gösterirse, 301 doğru
   çalışsa bile arama motoruna iki farklı kanonik sinyal gider. */
if (KANONIK) {
  const sitemapAdresleri = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (sitemapAdresleri.length === 0) {
    hata('public/sitemap.xml içinde <loc> yok', 'Sitemap boş ya da biçimi bozuk.');
  }
  const yabanci = [...new Set(
    sitemapAdresleri.map((u) => { try { return new URL(u).hostname; } catch { return u; } })
      .filter((h) => h !== KANONIK)
  )];
  if (yabanci.length) {
    hata('sitemap.xml kanonik olmayan host içeriyor',
         `Beklenen: ${KANONIK} — bulunan: ${yabanci.join(', ')}`);
  }

  const robotsSitemap = robots.match(/^Sitemap:\s*(\S+)/mi);
  if (!robotsSitemap) {
    hata('robots.txt içinde Sitemap satırı yok', 'Arama motoru sitemap\'i bulamaz.');
  } else {
    let rh = null;
    try { rh = new URL(robotsSitemap[1]).hostname; } catch { /* biçim bozuk */ }
    if (rh !== KANONIK) {
      hata('robots.txt Sitemap satırı kanonik host göstermiyor',
           `Beklenen: ${KANONIK} — bulunan: ${rh || robotsSitemap[1]}`);
    }
  }

  /* Sayfa içi <link rel="canonical"> de aynı hostu göstermeli. */
  for (const dosya of htmlDosyalari) {
    const icerik = oku(dosya);
    for (const m of icerik.matchAll(/<link[^>]+rel=["']canonical["'][^>]*>/gi)) {
      const href = m[0].match(/href=["']([^"']+)["']/i);
      if (!href) continue;
      let ch = null;
      try { ch = new URL(href[1], `https://${KANONIK}`).hostname; } catch { /* biçim bozuk */ }
      if (ch && ch !== KANONIK) {
        hata(`${dosya}: canonical kanonik olmayan host gösteriyor`,
             `Beklenen: ${KANONIK} — bulunan: ${ch}`);
      }
    }
  }

  /* İkincil alan adı kanonik listede olmamalı: sonsuz 301 döngüsü olur.
     Worker'daki karşılaştırma bunu zaten keser, hata yine de burada bildirilir. */
  if (IKINCIL.includes(KANONIK)) {
    hata('KANONIK_HOST aynı zamanda IKINCIL_HOSTLAR içinde',
         'Bu, kanonik adresi kendisine yönlendirme girişimi demek.');
  }
}

/* ---------- 2) run_worker_first, indekslenen her yolu kapsıyor mu ---------- */
/* Tuzak (gerçekten yaşandı): statik dosya Worker'dan önce servis edilir.
   Kapsanmayan bir sayfa için Worker hiç çalışmaz, dolayısıyla www -> apex 301'i
   ve güvenlik başlıkları o sayfada sessizce devre dışı kalır; sayfa hem www hem
   apex adresinde 200 döner (yinelenen içerik). */
if (KANONIK && DESENLER.length) {
  const sitemapYollari = [...new Set(
    [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
      .map((m) => { try { return new URL(m[1]).pathname; } catch { return null; } })
      .filter(Boolean)
  )];
  const kapsamsiz = sitemapYollari.filter((y) => !kapsiyor(y));
  if (kapsamsiz.length) {
    hata('sitemap\'teki bu yollar run_worker_first kapsamında değil',
         `${kapsamsiz.join('\n    ')}\n  Çözüm: wrangler.toml > run_worker_first listesine desen ekleyin.`);
  } else {
    not(`run_worker_first, sitemap'teki ${sitemapYollari.length} yolun tamamını kapsıyor.`);
  }
}

/* ---------- 3) CSP: kapsanan sayfalarda çalıştırılabilir satır içi script ---------- */
/* Tuzak: kamuya açık sayfalarda script-src 'self' + nonce. Nonce'suz satır içi
   script konsolda hata bile vermeden çalışmaz. application/ld+json hariç:
   tarayıcı onu çalıştırmaz, CSP de engellemez.
   Yalnızca run_worker_first kapsamındaki sayfalar denetlenir; kapsam dışındaki
   sayfalarda Worker'ın CSP'si hiç uygulanmaz. */
for (const dosya of htmlDosyalari) {
  const yol = yolaCevir(dosya);
  if (!kapsiyor(yol)) continue;
  if (yol.startsWith('/admin')) continue;        // panelde 'unsafe-inline' açık

  const icerik = oku(dosya);
  const suclu = [...icerik.matchAll(/<script\b([^>]*)>/gi)]
    .map((m) => m[1])
    .filter((attrs) => !/\bsrc\s*=/i.test(attrs)
                    && !/type\s*=\s*["']?application\/(ld\+json|json)/i.test(attrs)
                    && !/\bnonce\s*=/i.test(attrs));
  if (suclu.length) {
    hata(`${dosya}: nonce'suz satır içi <script> (${suclu.length})`,
         'Kamuya açık CSP bunu çalıştırmaz. Kodu ayrı bir .js dosyasına taşıyın.');
  }

  const olay = [...icerik.matchAll(/\son(?:click|load|error|change|submit|input)\s*=/gi)];
  if (olay.length) {
    hata(`${dosya}: satır içi olay özniteliği (${olay.length})`,
         "script-src 'self' bunları çalıştırmaz. addEventListener kullanın.");
  }
}

/* ---------- 4) Migration numaraları ---------- */
/* Tuzak: aynı numara iki kez kullanıldığında wrangler d1 migrations apply
   tökezler. */
{
  const dosyalar = readdirSync(join(KOK, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  const numaralar = dosyalar.map((f) => {
    const m = f.match(/^(\d{4})_/);
    if (!m) hata(`migrations/${f}: ad 0000_ kalıbına uymuyor`, 'Sıralama bozulur.');
    return m ? Number(m[1]) : null;
  }).filter((n) => n !== null);

  const tekrar = numaralar.filter((n, i) => numaralar.indexOf(n) !== i);
  if (tekrar.length) {
    hata('migration numarası tekrarlanmış', `Tekrar eden: ${[...new Set(tekrar)].join(', ')}`);
  }
  for (let i = 0; i < numaralar.length; i++) {
    if (numaralar[i] !== i + 1) {
      hata('migration numaraları aralıksız sıralı değil',
           `Beklenen ${String(i + 1).padStart(4, '0')}, bulunan ${String(numaralar[i]).padStart(4, '0')} (${dosyalar[i]})`);
      break;
    }
  }
  if (numaralar.length) not(`${numaralar.length} migration, numaralar sıralı.`);
}

/* ---------- 5) wrangler.toml: routes bilerek kapalı ---------- */
/* Alan adları panelden Custom Domain olarak bağlı. routes burada açılırsa
   wrangler paneldeki bağlantıların tek yetkilisi olur ve mevcut ayarları ezer. */
if (/^\s*routes\s*=/m.test(wrangler) || /^\s*\[\[routes\]\]/m.test(wrangler)) {
  hata('wrangler.toml içinde routes tanımlı',
       'Alan adları panelden Custom Domain ile bağlı; routes bu bağlantıları ezer. '
       + 'Bilinçli bir karar ise bu kontrolü kaldırın.');
}

/* ---------- 6) Yönlendirme tablosu gerçekten doğru mu ---------- */
/* Tablo elle okunduğunda doğru görünüp yanlış davranabilir: www eki ile ikincil
   alan adı aynı fonksiyonda çözülüyor ve sıralama önemli. Fonksiyon kaynaktan
   olduğu gibi çıkarılıp çalıştırılır; kopyası tutulmaz, yoksa test ettiği şey
   gerçek kod olmaktan çıkar.
   Önemli vaka: www.<ikincil> tek 301 ile kanonik adrese gitmeli. İki adımda
   giderse (önce ikincil apex, sonra kanonik) zincir oluşur; zincir hem yavaştır
   hem bazı tarayıcı ve tarayıcı botlarında sinyal kaybına yol açar. */
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
  console.log('\nDoğrulama temiz.');
  process.exit(0);
}

console.error(`\n${hatalar.length} hata:\n`);
for (const { baslik, ayrinti } of hatalar) {
  console.error(`  HATA  ${baslik}`);
  console.error(`        ${ayrinti}\n`);
}
process.exit(1);
