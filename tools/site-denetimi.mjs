#!/usr/bin/env node
/* =====================================================================
 * CANLI SITE DENETIMI
 *
 * 24-26 Eylul 2026'da canli sitede su hatalar bulundu; hicbiri bir hata
 * mesaji uretmedi, hepsi elle gezilerek bulundu:
 *
 *   - haberler.json'a eklenen dort haberin kapagi yoktu (404)
 *   - on sayfada og:image yoktu; sosyal paylasimlar gorselsiz dusuyordu
 *   - CSP, Cloudflare Analytics'i engelliyordu; olcum hic toplanmiyordu
 *   - ic operasyon araci /social-studio/ sitemap'teydi
 *   - robots.txt'nin gosterdigi security.txt 404 donuyordu
 *   - worker.js yeniden yazilirken vitrin alanlari (sira, poster) dustu;
 *     vitrin sessizce alfabetik siraya dondu
 *   - iki birlestirme bos commit olarak dustu, icerik canliya hic ulasmadi
 *
 * Bu betik ayni soruları canli siteye her calistiginda yeniden sorar.
 * Tarayici gerektirmez; yalnizca Node 22'nin yerlesik fetch'i kullanilir,
 * boylece GitHub Actions'ta npm kurulumu olmadan calisir (AGENTS.md).
 *
 * Kullanim:
 *   node tools/site-denetimi.mjs
 *   SITE=https://btmedya.com.tr node tools/site-denetimi.mjs
 * ===================================================================== */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const SITE = (process.env.SITE || 'https://btmedya.com.tr').replace(/\/$/, '');
const hatalar = [];   // kirmizi: gercek bozukluk
const uyarilar = [];  // sari: bilinen, karar bekleyen durum
const notlar = [];    // bilgi

// Dagitim birlestirmeden sonra birkac dakika surebiliyor (24 Eylul'de
// 35 dakika surdu). Bu surenin icinde canli ile depo arasindaki fark
// arizaya degil kuyruga isaret eder.
const GRACE_DK = 60;

async function getir(yol, secenek = {}) {
  const hamUrl = yol.startsWith('http') ? yol : SITE + yol;
  // CDN/Workers cache'inden eski HTML okunmasını önlemek için denetim isteklerini benzersizleştir.
  const u = new URL(hamUrl);
  u.searchParams.set('__btmedya_audit', `${process.env.GITHUB_SHA || 'local'}-${Date.now()}`);
  const url = u.toString();
  for (let deneme = 1; deneme <= 3; deneme++) {
    try {
      const r = await fetch(url, { redirect: 'follow', ...secenek,
        headers: { 'user-agent': 'BTMEDYA-site-denetimi/1.0', 'cache-control': 'no-cache, no-store', 'pragma': 'no-cache', ...(secenek.headers || {}) } });
      return r;
    } catch (e) {
      if (deneme === 3) return { ok: false, status: 0, hata: String(e), headers: new Headers(), text: async () => '', arrayBuffer: async () => new ArrayBuffer(0) };
      await new Promise((c) => setTimeout(c, 1500 * deneme));
    }
  }
}

// Ayni anda en fazla N istek; siteye yuk bindirmemek icin.
async function sinirli(isler, n = 6) {
  const sonuc = new Array(isler.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < isler.length) { const k = i++; sonuc[k] = await isler[k](); }
  }));
  return sonuc;
}

const ozet = (b) => createHash('sha256').update(Buffer.from(b)).digest('hex');

function commitYasiDk() {
  try {
    const t = Number(execSync('git log -1 --format=%ct', { encoding: 'utf8' }).trim());
    return Math.round((Date.now() / 1000 - t) / 60);
  } catch { return Infinity; }
}

/* ---------- 1. Sitemap: her adres acilmali, ic araclar icinde olmamali ---------- */
async function sitemapDenetimi() {
  const r = await getir('/sitemap.xml');
  if (!r.ok) { hatalar.push(`sitemap.xml acilmadi (${r.status})`); return []; }
  const xml = await r.text();
  const adresler = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (!adresler.length) { hatalar.push('sitemap.xml bos'); return []; }

  for (const a of adresler) {
    if (/\/(admin|api|social-studio)(\/|$)/.test(new URL(a).pathname)) {
      hatalar.push(`sitemap ic araci listeliyor: ${a}`);
    }
  }
  const durumlar = await sinirli(adresler.map((a) => async () => [a, (await getir(a)).status]));
  for (const [a, s] of durumlar) if (s !== 200) hatalar.push(`sitemap adresi ${s} donuyor: ${a}`);
  notlar.push(`sitemap: ${adresler.length} adres, ${durumlar.filter(([, s]) => s === 200).length} tanesi 200`);
  return adresler;
}

/* ---------- 2. Paylasim etiketleri: og:image var mi, gercekten aciliyor mu ---------- */
async function paylasimDenetimi(adresler) {
  // Haber detay sayfalari haber kapagini og:image yapar; hepsini tek tek
  // cekmek yerine bolum sayfalarina ve ornek iki habere bakilir.
  const bolum = adresler.filter((a) => !/\/haberler\/.+/.test(new URL(a).pathname));
  const haber = adresler.filter((a) => /\/haberler\/.+/.test(new URL(a).pathname)).slice(0, 2);
  const sayfalar = [...bolum, ...haber];

  const sonuc = await sinirli(sayfalar.map((a) => async () => {
    const r = await getir(a);
    const html = await r.text();
    const og = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
    const tw = /<meta name="twitter:card"/.test(html);
    return { a, og, tw };
  }));

  let tamam = 0;
  const gorseller = new Map();
  for (const { a, og, tw } of sonuc) {
    const yol = new URL(a).pathname;
    if (!og) { hatalar.push(`og:image yok: ${yol}`); continue; }
    if (!tw) uyarilar.push(`twitter:card yok: ${yol}`);
    gorseller.set(og, yol);
  }
  const acilis = await sinirli([...gorseller.keys()].map((g) => async () => {
    const r = await getir(g);
    const tip = r.headers.get('content-type') || '';
    return { g, ok: r.status === 200 && tip.startsWith('image/'), s: r.status, tip };
  }));
  for (const { g, ok, s, tip } of acilis) {
    if (ok) tamam++;
    else hatalar.push(`og:image acilmiyor (${s} ${tip}): ${g} — sayfa ${gorseller.get(g)}`);
  }
  notlar.push(`paylasim gorseli: ${sayfalar.length} sayfa denetlendi, ${tamam}/${gorseller.size} gorsel aciliyor`);
}

/* ---------- 2b. SEO ve sosyal paylaşım etiketleri ---------- */
async function seoMetaDenetimi(adresler) {
  const secilecek = [
    SITE + '/',
    SITE + '/haberler/',
    SITE + '/sosyal-medya/',
    SITE + '/sosyal-medya-kit/',
    SITE + '/portfoy/buse-tuncay/',
    ...adresler.filter((a) => /\/haberler\/.+/.test(new URL(a).pathname)).slice(0, 2),
  ];
  const sonuc = await sinirli(secilecek.map((a) => async () => {
    const r = await getir(a);
    const html = await r.text();
    return {
      a,
      status: r.status,
      title: /<title>[^<]+<\/title>/i.test(html),
      description: /<meta\s+name=["']description["'][^>]+content=["'][^"']+/i.test(html),
      canonical: /<link\s+rel=["']canonical["'][^>]+href=["']https:\/\/btmedya\.com\.tr\//i.test(html),
      og: /<meta\s+property=["']og:image["'][^>]+content=["']https:\/\//i.test(html),
      tw: /<meta\s+name=["']twitter:card["'][^>]+content=/i.test(html),
      twTitle: /<meta\s+name=["']twitter:title["'][^>]+content=/i.test(html),
      twImage: /<meta\s+name=["']twitter:image["'][^>]+content=/i.test(html),
      article: /"@type"\s*:\s*"NewsArticle"/.test(html),
      linkedin: html.includes("tr.linkedin.com/in/buse-tuncay-6b217623"),
      instagram: html.includes("https://www.instagram.com/btmedyajans/"),
      youtube: html.includes("https://www.youtube.com/@BTmedyaAjans"),
      tiktok: html.includes("https://www.tiktok.com/@btmedya1010"),
    };
  }));
  for (const x of sonuc) {
    const yol = new URL(x.a).pathname;
    if (x.status !== 200) { hatalar.push(`SEO sayfası ${x.status} dönüyor: ${yol}`); continue; }
    if (!x.title) hatalar.push(`title yok: ${yol}`);
    if (!x.description) hatalar.push(`meta description yok: ${yol}`);
    if (!x.canonical) hatalar.push(`canonical yok/yanlış: ${yol}`);
    if (!x.og) hatalar.push(`og:image yok/HTTPS değil: ${yol}`);
    if (!x.tw) uyarilar.push(`twitter:card yok: ${yol}`);
    const isArticle = /\/haberler\/[^/]+\/?$/.test(new URL(x.a).pathname);
    if (isArticle) {
      if (!x.article) hatalar.push(`NewsArticle structured data yok: ${yol}`);
      if (!x.twTitle || !x.twImage) uyarilar.push(`haber sosyal meta eksik: ${yol}`);
    }
    if (yol === '/') {
      if (!x.linkedin) uyarilar.push('anasayfa Buse Tuncay LinkedIn kimliği eksik');
      if (!x.instagram || !x.youtube || !x.tiktok) uyarilar.push('anasayfa sosyal kanal kimliklerinden biri eksik');
    }
    if (yol === '/portfoy/buse-tuncay/') {
      if (!x.linkedin) hatalar.push('Buse Tuncay portföyünde LinkedIn kimliği eksik');
      if (!x.instagram || !x.youtube) uyarilar.push('Buse Tuncay portföyünde doğrulanmış sosyal kanal bağlantısı eksik');
    }
  }
  notlar.push(`SEO: ${sonuc.length} sayfa temel meta + paylaşım etiketi açısından denetlendi`);
}

/* ---------- 2c. Kritik ticari/icerik rotalari: sitemap disi yol regressions ---------- */
async function kritikRotaDenetimi() {
  const yollar = [
    '/en/',
    '/hizmetler/',
    '/sosyal-medya/',
    '/video-produksiyon/',
    '/whatsapp-katalog/',
    '/vaka-calismalari/',
    '/reklam-ve-sponsorluk/',
    '/sosyal-medya-kit/',
    '/arsiv/',
  ];
  const sonuc = await sinirli(yollar.map((yol) => async () => ({
    yol,
    status: (await getir(yol)).status,
  })));
  for (const x of sonuc) {
    if (x.status !== 200) hatalar.push(`kritik rota ${x.status} donuyor: ${x.yol}`);
  }
  notlar.push(`kritik rotalar: ${sonuc.filter((x) => x.status === 200).length}/${sonuc.length} canli 200`);
}

/* ---------- 3. Haber kapaklari: her haberin kapagi depoda ve canlida olmali ---------- */
async function kapakDenetimi() {
  const haberler = JSON.parse(readFileSync('public/data/haberler.json', 'utf8'));
  const yas = commitYasiDk();
  const isler = haberler.filter((h) => h.slug && !h.cover_url).map((h) => async () => {
    const dosya = `public/assets/haber-kapak/${h.slug}-foto.webp`;
    const depoda = existsSync(dosya);
    const r = await getir(`/assets/haber-kapak/${encodeURIComponent(h.slug)}-foto.webp`);
    return { slug: h.slug, depoda, canli: r.status };
  });
  const sonuc = await sinirli(isler);
  let tamam = 0;
  for (const { slug, depoda, canli } of sonuc) {
    if (!depoda) {
      hatalar.push(`kapagi olmayan haber: ${slug} — haber-kapak-plani.json'a ekleyip "python3 tools/haber-kapagi.py ${slug}" calistirin`);
    } else if (canli !== 200) {
      (yas < GRACE_DK ? notlar : hatalar).push(`kapak depoda var, canlida ${canli}: ${slug}` +
        (yas < GRACE_DK ? ` (commit ${yas} dk once, dagitim kuyrukta olabilir)` : ''));
    } else tamam++;
  }
  notlar.push(`haber kapaklari: ${tamam}/${sonuc.length} canlida`);
}

/* ---------- 4. Dagitim kaymasi: canli dosyalar main ile ayni mi ---------- */
async function dagitimDenetimi() {
  const yas = commitYasiDk();
  const farkli = [];
  for (const f of ['home.css', 'home.js', 'styles.css']) {
    if (!existsSync(`public/${f}`)) continue;
    const r = await getir(`/${f}`);
    const canli = ozet(await r.arrayBuffer());
    if (canli !== ozet(readFileSync(`public/${f}`))) farkli.push(f);
  }
  if (!farkli.length) { notlar.push('dagitim: canli dosyalar main ile ayni'); return; }
  const mesaj = `canli surum main'in gerisinde (${farkli.join(', ')}); son commit ${yas} dk once`;
  if (yas < GRACE_DK) notlar.push(mesaj + ' — kuyrukta olabilir');
  else hatalar.push(mesaj + ". Cloudflare: Workers & Pages > btmedya-db > Builds");
}

/* ---------- 5. Guvenlik ve altyapi yuzeyleri ---------- */
async function altyapiDenetimi() {
  const ana = await getir('/');
  const csp = ana.headers.get('content-security-policy') || '';
  if (!csp) hatalar.push('anasayfada Content-Security-Policy basligi yok');
  else if (!csp.includes('static.cloudflareinsights.com')) {
    hatalar.push('CSP Cloudflare Analytics betigine izin vermiyor; olcum toplanmaz');
  }

  const sec = await getir('/.well-known/security.txt');
  if (sec.status !== 200) hatalar.push(`security.txt ${sec.status} donuyor (robots.txt onu gosteriyor)`);

  const robots = await (await getir('/robots.txt')).text();
  for (const m of robots.matchAll(/^Sitemap:\s*(\S+)/gim)) {
    const s = (await getir(m[1])).status;
    if (s !== 200) hatalar.push(`robots.txt'deki sitemap ${s} donuyor: ${m[1]}`);
  }

  const saglik = await getir('/api/health');
  const govde = await saglik.text();
  if (saglik.status !== 200 || !/"ok"\s*:\s*true/.test(govde)) {
    hatalar.push(`/api/health saglikli degil (${saglik.status})`);
  }

  // Admin API'leri oturum istemeli. 401/403 disinda bir yanit veri sizintisi demek.
  for (const u of ['/api/admin/news', '/api/admin/media', '/api/admin/messages']) {
    const s = (await getir(u)).status;
    if (s !== 401 && s !== 403) hatalar.push(`${u} oturumsuz ${s} donuyor — yetki kontrolu calismiyor olabilir`);
  }

  // /admin/ sayfasi Cloudflare Access arkasindaysa 302 doner. 26 Eylul'de
  // 200 donuyordu; karar kullanicida oldugu icin uyari, hata degil.
  const admin = await getir('/admin/', { redirect: 'manual' });
  if (admin.status === 200) {
    uyarilar.push('/admin/ herkese acik (200). Cloudflare Access arkasinda degil; tek savunma parola + hiz siniri.');
  }
}

/* ---------- 5b. Canonical alan adi: www ayni icerigi ikinci kez sunmamali ---------- */
async function canonicalAlanAdiDenetimi() {
  const r = await getir('https://www.btmedya.com.tr/', { redirect: 'manual' });
  const location = r.headers.get('location') || '';
  let hedef;
  try { hedef = new URL(location); } catch { hedef = null; }
  const canonical = hedef && hedef.protocol === 'https:' && hedef.hostname === 'btmedya.com.tr' && hedef.pathname === '/';
  if (![301, 308].includes(r.status) || !canonical) {
    hatalar.push(`www canonical yonlendirmesi bozuk (${r.status} -> ${location || 'Location yok'})`);
  } else {
    notlar.push('canonical alan adi: www -> https://btmedya.com.tr/ kalici yonlendirme');
  }
}

/* ---------- 6. Vitrin alanlari: depodaki veri API yanitina ulasiyor mu ---------- */
async function vitrinDenetimi() {
  const liste = JSON.parse(readFileSync('public/data/medya-listesi.json', 'utf8'));
  const beklenen = {
    sira: liste.filter((x) => x.sira !== undefined).length,
    poster: liste.filter((x) => x.poster).length,
    baslik: liste.filter((x) => x.baslik).length,
  };
  const r = await getir('/api/public/media?limit=200');
  if (!r.ok) { hatalar.push(`/api/public/media ${r.status} donuyor`); return; }
  const ogeler = (await r.json().catch(() => ({}))).items || [];
  const statik = ogeler.filter((x) => x.source === 'github-static');
  const gelen = {
    sira: statik.filter((x) => typeof x.sira === 'number').length,
    poster: statik.filter((x) => x.poster).length,
  };
  // 26 Eylul: worker.js yeniden yazilirken bu alanlar dustu, hata cikmadi,
  // vitrin sessizce alfabetik siraya dondu.
  if (beklenen.sira && !gelen.sira) hatalar.push(`vitrin sirasi API'ye ulasmiyor (depoda ${beklenen.sira}, API'de 0) — worker.js statik besleyiciyi kontrol edin`);
  if (beklenen.poster && !gelen.poster) hatalar.push(`video posteri API'ye ulasmiyor (depoda ${beklenen.poster}, API'de 0)`);
  notlar.push(`vitrin: ${statik.length} statik kayit, ${gelen.sira} sirali, ${gelen.poster} posterli`);
}

/* ---------- calistir ---------- */
const baslangic = Date.now();
console.log(`BTMEDYA canli site denetimi — ${SITE}\n`);
const adresler = await sitemapDenetimi();
await paylasimDenetimi(adresler);
await seoMetaDenetimi(adresler);
await kritikRotaDenetimi();
await kapakDenetimi();
await dagitimDenetimi();
await altyapiDenetimi();
await canonicalAlanAdiDenetimi();
await vitrinDenetimi();
const sure = ((Date.now() - baslangic) / 1000).toFixed(1);

const satirlar = [
  ...hatalar.map((h) => `HATA   ${h}`),
  ...uyarilar.map((u) => `UYARI  ${u}`),
  ...notlar.map((n) => `  ok   ${n}`),
];
console.log(satirlar.join('\n'));
console.log(`\n${hatalar.length} hata, ${uyarilar.length} uyari — ${sure} sn`);

// GitHub Actions ozet sekmesi: kirmizi/yesil ne oldugu tek bakista gorunsun.
if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [
    `## BTMEDYA canlı site denetimi`,
    hatalar.length ? `**${hatalar.length} hata**` : '**Hata yok**',
    '',
    ...hatalar.map((h) => `- ❌ ${h}`),
    ...uyarilar.map((u) => `- ⚠️ ${u}`),
    ...notlar.map((n) => `- ✅ ${n}`),
  ].join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
}
for (const u of uyarilar) console.log(`::warning::${u}`);
for (const h of hatalar) console.log(`::error::${h}`);
process.exit(hatalar.length ? 1 : 0);
