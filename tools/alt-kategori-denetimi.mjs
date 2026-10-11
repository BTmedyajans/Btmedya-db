// Alt kategori sistemi denetimi (11 Ekim, kullanıcı: "üç kategori alt
// kategori sayfalarına yönlendirsin; okuyucu bir sayfada konuyla alakalı
// bilgileri görsün").
// Kurallar:
//  1) Taksonomideki her kamu bağlantısı var olan bir sayfaya gider; #çapa
//     varsa hedef sayfada o kimlik bulunur.
//  2) Sosyal Medya ve Prodüksiyon ana sayfaları alt kategori ızgarası taşır;
//     taksonomideki her alt kategori sayfası ızgarada bağlıdır (satış/teklif hariç).
//  3) Ana sayfanın altındaki her alt sayfa: konum izi ana sayfaya bağlı,
//     kardeş şeridi diğer alt sayfaları listeler, canonical kendisi, site
//     haritasında var, alt-kategori.css ve hamburger menüsü yüklü.
//  4) Giriş filmi sonundaki bölüm panelinin bağlantıları var olan sayfalara gider.
// Çalıştır: node tools/alt-kategori-denetimi.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { KATEGORI_ANAHTARLARI, BALIKESIR_ILCELERI } from '../src/kategori-sistemi.js';

const bulgular = [];
const ctx = { window: {} };
vm.runInNewContext(readFileSync('public/data/btmedya-taxonomy.js', 'utf8'), ctx);
const T = ctx.window.BTMEDYA_TAXONOMY;

const sayfaDosyasi = href => {
  const yol = href.split('#')[0].split('?')[0];
  return join('public', yol.endsWith('/') ? yol + 'index.html' : yol);
};
// Haber kategori ve ilçe sayfaları dosya değil, Worker'da üretilir
// (src/worker.js temizKategoriSayfasi); anahtarın tanımlı olması yeterlidir.
const dinamikHaber = yol => {
  const k = yol.match(/^\/haberler\/([a-z]+)\/$/), i = yol.match(/^\/haberler\/balikesir\/([a-z]+)\/$/);
  return (k && KATEGORI_ANAHTARLARI.includes(k[1])) || (i && Object.hasOwn(BALIKESIR_ILCELERI, i[1]));
};
const hedefVar = (href, nereden) => {
  if (!href.startsWith('/')) return;
  if (dinamikHaber(href.split('#')[0].split('?')[0])) return;
  const dosya = sayfaDosyasi(href);
  if (!existsSync(dosya)) { bulgular.push(`${nereden}: ${href} sayfası yok (${dosya}).`); return; }
  const capa = href.split('#')[1];
  if (capa && !readFileSync(dosya, 'utf8').includes(`id="${capa}"`)) bulgular.push(`${nereden}: ${href} çapası hedef sayfada yok.`);
};
const baglantilar = html => [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));

// 1) Taksonomi bağlantıları.
for (const p of T.paths) {
  hedefVar(p.publicHref, `taksonomi ${p.key}`);
  for (const g of p.groups) for (const it of g.items) hedefVar(it.href, `taksonomi ${p.key}/${it.key}`);
}

const harita = readFileSync('public/sitemap.xml', 'utf8');
for (const anahtar of ['sosyal', 'tanitim']) {
  const p = T.paths.find(x => x.key === anahtar);
  const hubDosya = sayfaDosyasi(p.publicHref);
  const hub = readFileSync(hubDosya, 'utf8');
  // 2) Izgara.
  const izgara = (hub.match(/<section class="altk-izgara"[\s\S]*?<\/section>/) || [''])[0];
  if (!izgara) { bulgular.push(`${hubDosya} alt kategori ızgarası taşımıyor.`); continue; }
  const izgaraLink = new Set(baglantilar(izgara).map(h => h.split('#')[0]));
  for (const g of p.groups) for (const it of g.items) {
    const h = it.href.split('#')[0];
    if (it.type === 'sales' || h === p.publicHref) continue;
    if (!izgaraLink.has(h)) bulgular.push(`${hubDosya} ızgarası "${it.label}" (${h}) alt kategorisine bağlanmıyor.`);
  }
  // 3) Ana sayfanın altındaki alt sayfalar.
  const kokDizin = join('public', p.publicHref);
  const altlar = readdirSync(kokDizin, { withFileTypes: true }).filter(d => d.isDirectory() && existsSync(join(kokDizin, d.name, 'index.html')))
    .map(d => p.publicHref + d.name + '/');
  if (!altlar.length) bulgular.push(`${p.publicHref} altında alt kategori sayfası yok.`);
  for (const yol of altlar) {
    const dosya = sayfaDosyasi(yol);
    const t = readFileSync(dosya, 'utf8');
    if (!izgaraLink.has(yol)) bulgular.push(`${hubDosya} ızgarası ${yol} sayfasına bağlanmıyor.`);
    const iz = (t.match(/<nav class="altk-iz"[\s\S]*?<\/nav>/) || [''])[0];
    if (!baglantilar(iz).includes(p.publicHref)) bulgular.push(`${dosya} konum izi ${p.publicHref} ana sayfasına bağlanmıyor.`);
    const kardes = (t.match(/<nav class="altk-kardes"[\s\S]*?<\/nav>/) || [''])[0];
    const kardesLink = new Set(baglantilar(kardes));
    for (const diger of altlar) if (!kardesLink.has(diger)) bulgular.push(`${dosya} kardeş şeridinde ${diger} yok.`);
    if (!/aria-current="page"/.test(kardes)) bulgular.push(`${dosya} kardeş şeridinde geçerli sayfa işaretli değil.`);
    if (!t.includes(`<link rel="canonical" href="https://btmedya.com.tr${yol}">`)) bulgular.push(`${dosya} canonical kendisi değil.`);
    if (!harita.includes(`<loc>https://btmedya.com.tr${yol}</loc>`)) bulgular.push(`public/sitemap.xml ${yol} sayfasını listelemiyor.`);
    if (!t.includes('/alt-kategori.css')) bulgular.push(`${dosya} alt-kategori.css yüklemiyor.`);
    if (!t.includes('/kategori-menu.js')) bulgular.push(`${dosya} hamburger menüsünü (kategori-menu.js) yüklemiyor.`);
    if ((t.match(/<h1\b/g) || []).length !== 1) bulgular.push(`${dosya} tek h1 taşımalı.`);
    if (/<img(?![^>]*\bwidth=)[^>]*>/.test(t.slice(t.indexOf('<main')))) bulgular.push(`${dosya} ölçüsüz görsel içeriyor (mobilde kayma yapar).`);
  }
}

// 4) Giriş filmi sonu bölüm paneli.
const ana = readFileSync('public/index.html', 'utf8');
const panel = (ana.match(/<nav class="giris-v5-kat"[\s\S]*?<\/nav>/) || [''])[0];
if (ana.includes('data-giris-v5')) {
  if (!panel) bulgular.push('public/index.html giriş filmi sonu bölüm paneli (giris-v5-kat) yok.');
  const pl = baglantilar(panel);
  for (const h of ['/haberler/', '/sosyal-medya/', '/video-produksiyon/']) if (!pl.includes(h)) bulgular.push(`Giriş filmi bölüm paneli ${h} ana bölümüne bağlanmıyor.`);
  for (const h of pl) hedefVar(h, 'giriş filmi bölüm paneli');
  if (pl.length < 12) bulgular.push('Giriş filmi bölüm paneli alt kategori bağlantısı taşımıyor.');
}

if (bulgular.length) { console.error('ALT KATEGORI DENETIMI BASARISIZ\n- ' + bulgular.join('\n- ')); process.exit(1); }
console.log('ALT KATEGORI DENETIMI GECTI');
