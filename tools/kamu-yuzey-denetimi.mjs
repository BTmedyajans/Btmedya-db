// Kamu yüzeyi denetimi: okurun gördüğü sayfalarda geri gelmemesi gerekenler.
//
// Neden ayrı bir denetim: 1 Ekim'de /admin/ bağlantıları "kaldırıldı" denip
// birleştirilen bir PR'dan sonra anasayfada yine "YÖNETİM ↗" ve altbilgide
// "Yönetim ↗" duruyordu; altyapı adları (R2 / ASSETS, Metricool snapshot,
// LIVE DESK) okura metin olarak basılıyordu; Metricool çerez onayı olmadan
// yükleniyordu. Bunlar tek tek küçük, ama bir haber markası için güven kaybı.
//
// Kullanım: node tools/kamu-yuzey-denetimi.mjs
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Yönetim ve müşteri alanları okura açık sayfa sayılmaz.
const KAPALI = new Set(['admin', 'social-studio', 'client', 'portal', 'android-admin']);

// Okura altyapı ya da iç süreç adı olarak görünmemesi gereken terimler.
const IC_TERIM = ['GELİR MOTORU', 'PARA AKIŞI', 'PROOF ENGINE', 'R2 / ASSETS', 'Metricool snapshot',
  'MEDIA VAULT', 'LIVE DESK', 'SCROLL TO EXPLORE', 'STORY ENGINE', 'SOCIAL DESK', 'NATIVE / FALLBACK', 'R2 / PUBLIC MEDIA'];

const YASAL = ['/kunye/', '/gizlilik/', '/cerez-politikasi/'];

const dosyalar = [];
(function gez(k) {
  for (const a of readdirSync(k)) {
    const p = join(k, a);
    if (statSync(p).isDirectory()) { if (!KAPALI.has(a)) gez(p); }
    else if (/\.html$/.test(p)) dosyalar.push(p);
  }
})('public');

let hata = 0;
const bildir = (f, m) => { console.error(`✗ ${f}: ${m}`); hata++; };

for (const f of dosyalar) {
  const t = readFileSync(f, 'utf8');
  if (/href=["'](?:https:\/\/(?:www\.)?btmedya\.com\.tr)?\/(?:admin|social-studio)\b/i.test(t)) bildir(f, 'kamuya açık yönetim bağlantısı');
  for (const x of IC_TERIM) if (t.includes(x)) bildir(f, `iç terim: ${x}`);
  // Metricool yalnız olcum.js üzerinden, onaydan sonra yüklenmeli.
  if (/tracker\.metricool\.com\/resources\/be\.js/.test(t)) bildir(f, 'Metricool betiği onaysız doğrudan yükleniyor');
}

// Anasayfa ve haber şablonu altbilgisi yasal sayfalara bağlanmalı.
const anasayfa = readFileSync('public/index.html', 'utf8');
const haber = readFileSync('src/news-page.js', 'utf8');
for (const y of YASAL) {
  if (!anasayfa.includes(`href="${y}"`)) bildir('public/index.html', `eksik yasal bağlantı ${y}`);
  if (!haber.includes(`href="${y}"`)) bildir('src/news-page.js', `eksik yasal bağlantı ${y}`);
  const dosya = join('public', y, 'index.html');
  if (!existsSync(dosya)) bildir(dosya, 'yasal sayfa yok');
}
if (!/data-cerez-ayar/.test(anasayfa)) bildir('public/index.html', 'altbilgide "Çerez tercihleri" düğmesi yok');

// Onay mekanizması: Metricool yükleyicisi onay kontrolünün arkasında olmalı.
const olcum = readFileSync('public/olcum.js', 'utf8');
if (!/btm_cerez_v1/.test(olcum) || !/tercih && tercih\.analitik\) metricoolYukle\(\)/.test(olcum)) {
  bildir('public/olcum.js', 'Metricool çerez onayına bağlı değil');
}

// Yeni üst düzey HTML sayfası Worker'dan geçmeli (CSP ve kanonik host).
const wrangler = readFileSync('wrangler.toml', 'utf8');
for (const y of YASAL) {
  const desen = `"${y.replace(/\/$/, '')}*"`;
  if (!wrangler.includes(desen)) bildir('wrangler.toml', `run_worker_first içinde ${desen} yok`);
}

if (hata) { console.error(`KAMU YÜZEYİ: ${hata} sorun`); process.exit(1); }
console.log(`KAMU YÜZEYİ TEMİZ (${dosyalar.length} sayfa)`);
