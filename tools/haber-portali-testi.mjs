// Haber portalı (/haberler/) V14 testi. Ağ ve Cloudflare gerektirmez.
// Çalıştır: node tools/haber-portali-testi.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { register } from 'node:module';

// Worker 'cloudflare:workers' içe aktarır; Node bu şemayı yükleyemez. Test
// yalnız fetch yolunu çağırdığı için sınıflar boş kabuk olarak verilir.
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(s, c, n) { return s.startsWith('cloudflare:') ? { url: 'data:text/javascript,' + encodeURIComponent('export class WorkerEntrypoint{} export class WorkflowEntrypoint{} export class DurableObject{}'), shortCircuit: true } : n(s, c); }
`));
const { default: worker } = await import('../src/worker.js');

// 1) /api/news?ozet=1 haber gövdesini düşürür; parametresiz çağrı aynı kalır.
const satirlar = [
  { id: 1, slug: 'yeni-haber', title: 'Yeni', excerpt: 'Ö', body: 'uzun gövde '.repeat(200), category: 'Spor', status: 'published', published_at: '2026-10-04T05:00:00Z', cover_url: '/assets/haber-kapak/yeni-haber.webp' },
  // Sabah Masası plakası + üretilmiş kapak var: kapak gösterilmeli.
  { id: 2, slug: 'plakali', title: 'Plakalı', excerpt: '', body: 'x', category: 'Spor', status: 'published', published_at: '2026-10-04T04:00:00Z', cover_url: '/assets/kategori-kapak/spor.webp' },
  // Panelden seçilmiş otomasyon karesi: kapak olsa bile dokunulmaz.
  { id: 3, slug: 'panel-secimi', title: 'Panel', excerpt: '', body: 'x', category: 'Spor', status: 'published', published_at: '2026-10-04T03:00:00Z', cover_url: '/gorsel/otomasyon/kare.webp' },
  // Plaka ama üretilmiş kapak yok: plaka kalır.
  { id: 4, slug: 'kapaksiz', title: 'Kapaksız', excerpt: '', body: 'x', category: 'Spor', status: 'published', published_at: '2026-10-04T02:00:00Z', cover_url: '/assets/paylasim/haberler.webp' }
];
const env = {
  DB: { prepare: () => ({ all: async () => ({ results: satirlar }), bind() { return this; } }) },
  ASSETS: { fetch: async (r) => new Response(JSON.stringify(new URL(r.url).pathname === '/data/haber-kapak-kaynagi.json'
    ? { plakali: 'temsili', 'panel-secimi': 'temsili' }
    : [{ slug: 'arsiv-haber', title: 'Arşiv', body: ['eski gövde'], published_at: '2024-05-02T10:00:00Z' }]), { headers: { 'content-type': 'application/json' } }) }
};
const al = async q => (await (await worker.fetch(new Request('https://btmedya.com.tr/api/news' + q), env, { waitUntil() {} })).json());
const tam = await al('?limit=10');
assert.equal(tam.items.length, 5);
assert.ok(tam.items.every(n => 'body' in n), 'parametresiz yanıt gövdeyi taşımalı');
const ozet = await al('?limit=10&ozet=1');
assert.equal(ozet.items.length, 5);
const kapak = slug => ozet.items.find(n => n.slug === slug).cover_url;
assert.equal(kapak('plakali'), '/assets/haber-kapak/plakali.webp', 'üretilmiş kapak plakanın önüne geçmeli');
assert.equal(kapak('panel-secimi'), '/gorsel/otomasyon/kare.webp', 'panel seçimi değişmemeli');
assert.equal(kapak('kapaksiz'), '/assets/paylasim/haberler.webp', 'kapağı olmayan plaka kalmalı');
assert.ok(ozet.items.every(n => !('body' in n)), 'ozet=1 gövdeyi düşürmeli');
assert.equal(ozet.items[0].title, 'Yeni');

// 2) Sayfa: kendi stil ve betiğini yükler, satır içi çalışan betik yok, ölçüm var.
const sayfa = readFileSync('public/haberler/index.html', 'utf8');
assert.match(sayfa, /href="\/haberler\/portal\.css\?v=[^"]+"/);
assert.match(sayfa, /<script src="\/haberler-akisi\.js\?v=[^"]+" defer><\/script>/);
assert.match(sayfa, /<script src="\/olcum\.js\?v=[^"]+" defer><\/script>/);
assert.ok(!/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(sayfa), 'satır içi betik var');
// Sekiz kategori rayda, anasayfadaki anahtarlarla aynı. 4 Ekim'den beri
// kategoriler sunucuda işlenen temiz adreslerde (/haberler/spor/);
// ?kategori= biçimi 301 ile oraya yönlenir.
for (const k of ['balikesir', 'turkiye', 'dunya', 'gundem', 'ekonomi', 'kultur', 'yasam', 'egitim', 'saglik', 'spor', 'teknoloji'])
  assert.match(sayfa, new RegExp(`href="/haberler/${k}/" data-hm-kategori="${k}"`));

// 3) Akış kuralları (kaynak kodda): özet isteği, 3 saat kuralı, kapak üstüne başlık yok.
const betik = readFileSync('public/haberler-akisi.js', 'utf8');
assert.match(betik, /\/api\/news\?limit=100&ozet=1/);
assert.match(betik, /3 \* 3600 \* 1000[\s\S]{0,600}'SON DAKİKA' : 'SON HABERLER'/);
assert.ok(!/ARŞİVDEN BUGÜNE/.test(betik), 'güncel habere arşiv etiketi basılmamalı');
// Temiz kategori adresi istemcide de tanınmalı: 4 Ekim'de regex sonuna
// kaçışlı '\\$' yazılmış, '/haberler/spor/' hiç eşleşmiyordu.
const yolKalibi = betik.match(/location\.pathname\.match\((\/.*\/)\);/);
assert.ok(yolKalibi, 'kategori yol kalıbı bulunamadı');
assert.ok(eval(yolKalibi[1]).test('/haberler/spor/'), 'temiz kategori adresi eşleşmiyor');
assert.ok(!/href="\/haberler\/\?kategori=' \+/.test(betik), 'blok bağlantısı eski ?kategori= biçiminde');

// 4) Kategori eşlemesi: betiğin kendi işleviyle, gerçek kategori yazımlarıyla.
const kum = { document: { querySelector: () => null }, matchMedia: () => ({ matches: false }) };
const kaynak = betik.replace("if (!kok) return;", "if (!kok) { globalThis.kategoriBul = kategori; return; }");
vm.runInNewContext(kaynak, Object.assign(kum, { globalThis: kum }));
const k = (category, title = '') => kum.kategoriBul({ category, title });
assert.equal(k('Yerel · Pazar'), 'balikesir');
assert.equal(k('Ekonomi', 'Balıkesir’de yeni pazar düzenlemesi'), 'balikesir');
assert.equal(k('Teknoloji', 'Balıkesir’de yeni dijital portal hizmete girdi'), 'balikesir');
assert.equal(k('Yapay Zekâ'), 'teknoloji');
assert.equal(k('Kültür · Zanaat'), 'kultur');
assert.equal(k('Ekonomi · Emlak'), 'ekonomi');
assert.equal(k('Gündem · Asayiş'), 'gundem');
assert.equal(k('Sağlık · Beslenme'), 'saglik');
assert.equal(k('Spor'), 'spor');
assert.equal(k('Eğitim'), 'egitim');
// 6 Ekim: açık kategori alanı esastır; metindeki "dünya" spor haberini taşımaz.
assert.equal(k('Dünya'), 'dunya');
assert.equal(k('Yaşam'), 'yasam');
assert.equal(k('Türkiye'), 'turkiye');
assert.equal(k('Spor', 'Milli güreşçi dünya şampiyonu oldu'), 'spor');
assert.equal(k('', 'Balıkesir Büyükşehir yeni hat açtı'), 'balikesir');
// Genel kelime yer adı değildir: başka şehrin belediyesi, "pazar" (piyasa ya
// da gün) ve "ulaşım" geçen ulusal haber Balıkesir etiketi almaz.
assert.equal(k('Eğitim', 'Büyükçekmece Belediyesi bilim şenliği düzenledi'), 'egitim');
assert.equal(k('Ekonomi', 'Küresel pazar rafineri kapasitesini tartışıyor'), 'ekonomi');
assert.equal(k('Dünya', 'Zirve pazar günü toplanacak'), 'dunya');
assert.equal(k('Türkiye', 'Bakanlık şehirler arası ulaşım planını açıkladı'), 'turkiye');
assert.equal(k('Yerel · Pazar'), 'balikesir');
// İlgili haberler kartı görselli: kapak varsa metinsiz "-foto" kare ve kaynak
// etiketi basılır; kapaksız haber kırık <img> değil yazılı kart olur.
const { renderNewsPage } = await import('../src/news-page.js');
const ilgili = renderNewsPage({ slug: 'ana', title: 'Ana haber', body: 'g' }, 'https://btmedya.com.tr', null, [
  { slug: 'a', title: 'A', category: 'Spor', cover_url: '/assets/haber-kapak/a.webp', kapak_turu: 'arsiv' },
  { slug: 'b', title: 'B', category: 'Spor', cover_url: '/assets/kategori-kapak/spor.webp', kapak_turu: '' },
  { slug: 'c', title: 'C', category: 'Spor', cover_url: null },
]).match(/<section class="related-news"[\s\S]*?<\/section>/)[0];
assert.match(ilgili, /src="\/assets\/haber-kapak\/a-foto\.webp"[^>]*loading="lazy"/);
assert.match(ilgili, /Arşiv fotoğrafı/);
assert.match(ilgili, /src="\/assets\/kategori-kapak\/spor\.webp"[\s\S]*?BTMEDYA grafik/);
assert.equal((ilgili.match(/<img/g) || []).length, 2, 'kapaksız ilgili habere görsel basılmamalı');
// API hata/boş sonuç halinde manşet yer tutucuları kalıcı olmamalı; RSS ve arşiv erişilebilir kalmalı.
assert.ok(betik.includes('function akisYuklenemedi()'), 'akış yedek fonksiyonu eksik');
assert.ok(betik.includes('href="/rss.xml"'), 'RSS yedek bağlantısı eksik');
assert.ok(betik.includes('if (!cevap.ok) { akisYuklenemedi(); return; }'), 'API hatası yedek duruma geçmiyor');
assert.ok(betik.includes('if (!guncel.length) { akisYuklenemedi(); return; }'), 'boş haber listesi yedek duruma geçmiyor');
assert.ok(betik.includes("yukle().catch(function (e) { akisYuklenemedi();"), 'beklenmeyen hata yedek duruma geçmiyor');
console.log('HABER PORTALI TESTI GECTI');
