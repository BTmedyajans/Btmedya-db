/* BTMEDYA Sabah Masası — her gün 08:00 (Europe/Istanbul) çalışan haber +
 * sosyal otomasyonu.
 *
 * Akış: Google Trends TR -> kategori kaynakları -> trend puanı -> kategori
 * başına bir haber -> kaynak metin -> Workers AI ile özgün metin -> rakam ve
 * özel ad denetimi -> lisanslı temsili fotoğraf (Openverse) -> R2 ->
 * yayın ya da taslak -> sosyal zincir (sosyal-otomasyon.js) -> e-posta özeti.
 *
 * EDİTORYAL SINIRLAR (AGENTS.md "Uydurmayın")
 * - Model yalnız kaynak metindeki bilgiyi kullanabilir. Çıktıdaki her rakam
 *   ve her özel ad kaynakta aranır; bulunamayan bir tane bile varsa haber
 *   yayına çıkmaz, "taslak" kalır ve nedeni panelde görünür.
 * - Siyasi aktörler, soruşturma/gözaltı ve suç haberleri otomatik akışa hiç
 *   alınmaz: hukuki risk ve taraf tutma riski editör kararı ister.
 * - Kaynağın fotoğrafı kullanılmaz (telif). Görsel, CC lisanslı temsili bir
 *   karedir; künyesi hem metne hem kapak kaydına yazılır.
 * - Otomatik yayınlanan her haberin notunda yapay zekâ desteğiyle
 *   derlendiği ve editör denetiminden geçmediği açıkça yazılır.
 */

import { ayarlariOku as sosyalAyarlari } from './sosyal-otomasyon.js';

const AYAR = 'sabah:ayarlar';
const RAPOR = 'sabah:son';
const VARSAYILAN = Object.freeze({
  etkin: true,
  otomatikYayin: true,
  model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  gunlukAzami: 8
});

/* Sitenin 8 kategorisi (public/home.js BTMEDYA_RELEVANCE ile aynı sıra).
   "kategori" haberin D1'deki category alanına yazılan değerdir. */
export const KATEGORILER = [
  { anahtar: 'balikesir', kategori: 'Yerel', kaynaklar: ['balikesir-bel', 'cumha-balikesir'] },
  { anahtar: 'gundem', kategori: 'Gündem', kaynaklar: ['trt-gundem', 'trt-turkiye'] },
  { anahtar: 'ekonomi', kategori: 'Ekonomi', kaynaklar: ['trt-ekonomi'] },
  { anahtar: 'kultur', kategori: 'Kültür', kaynaklar: ['trt-kultur'] },
  { anahtar: 'egitim', kategori: 'Eğitim', kaynaklar: ['trt-egitim', 'hurriyet-egitim'] },
  { anahtar: 'saglik', kategori: 'Sağlık', kaynaklar: ['trt-saglik'] },
  // TRT spor akışı günlerce güncellenmeyebiliyor; Hürriyet ve Sabah yedek.
  { anahtar: 'spor', kategori: 'Spor', kaynaklar: ['trt-spor', 'hurriyet-spor', 'sabah-spor'] },
  { anahtar: 'teknoloji', kategori: 'Yapay Zekâ', kaynaklar: ['trt-teknoloji', 'hurriyet-teknoloji'] }
];

const KAYNAK = {
  'balikesir-bel': { ad: 'Balıkesir Büyükşehir Belediyesi', tur: 'bel', url: 'https://balikesir.bel.tr/haberler' },
  'cumha-balikesir': { ad: 'CUMHA', tur: 'rss', url: 'https://cumha.com.tr/rss/lokasyon/balikesir' },
  'trt-gundem': { ad: 'TRT Haber', tur: 'rss', url: 'https://www.trthaber.com/gundem_articles.rss' },
  'trt-turkiye': { ad: 'TRT Haber', tur: 'rss', url: 'https://www.trthaber.com/turkiye_articles.rss' },
  'trt-ekonomi': { ad: 'TRT Haber', tur: 'rss', url: 'https://www.trthaber.com/ekonomi_articles.rss' },
  'trt-kultur': { ad: 'TRT Haber', tur: 'rss', url: 'https://www.trthaber.com/kultur_sanat_articles.rss' },
  'trt-egitim': { ad: 'TRT Haber', tur: 'rss', url: 'https://www.trthaber.com/egitim_articles.rss' },
  'trt-saglik': { ad: 'TRT Haber', tur: 'rss', url: 'https://www.trthaber.com/saglik_articles.rss' },
  'trt-spor': { ad: 'TRT Haber', tur: 'rss', url: 'https://www.trthaber.com/spor_articles.rss' },
  'trt-teknoloji': { ad: 'TRT Haber', tur: 'rss', url: 'https://www.trthaber.com/bilim_teknoloji_articles.rss' },
  'hurriyet-spor': { ad: 'Hürriyet', tur: 'rss', url: 'https://www.hurriyet.com.tr/rss/spor' },
  'sabah-spor': { ad: 'Sabah', tur: 'rss', url: 'https://www.sabah.com.tr/rss/spor.xml' },
  'hurriyet-egitim': { ad: 'Hürriyet', tur: 'rss', url: 'https://www.hurriyet.com.tr/rss/egitim' },
  'hurriyet-teknoloji': { ad: 'Hürriyet', tur: 'rss', url: 'https://www.hurriyet.com.tr/rss/teknoloji' }
};

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; BTMEDYA-SabahMasasi/1.0; +https://btmedya.com.tr)' };

/* Otomatik akışa alınmayan konular. Tam kelime, Türkçe harfler düzleştirilmiş. */
const HASSAS = /\b(chp|akp|ak parti|mhp|dem parti|iyi parti|yeni parti|zafer partisi|erdogan|ozgur ozel|kilicdaroglu|bahceli|imamoglu|yavas|secim|milletvekili|miting|tutuklan\w*|gozalti\w*|sorusturma\w*|iddianame|sanik|cinayet|oldur\w*|bicakla\w*|silahli|taciz|istismar|intihar|feto|teror\w*|casus\w*)\b/;

export function duz(s) {
  return String(s || '').toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[âà]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function hassasMi(metin) { return HASSAS.test(duz(metin)); }
const SPOR_KELIME = /\b(futbol|mac|maci|milli takim|uefa|super lig|gol|teknik direktor|transfer|basketbol|voleybol|fenerbahce|galatasaray|besiktas|trabzonspor)\b/;

/* ---------- Ayarlar ve rapor ---------- */
export async function sabahAyarlari(env) {
  let k = {};
  const ham = env.KV ? await env.KV.get(AYAR).catch(() => null) : null;
  if (ham) try { k = JSON.parse(ham); } catch {}
  const a = { ...VARSAYILAN, ...k };
  return {
    etkin: a.etkin !== false,
    otomatikYayin: a.otomatikYayin === true,
    model: /^@cf\/[\w.\/-]+$/.test(String(a.model)) ? String(a.model) : VARSAYILAN.model,
    gunlukAzami: Math.max(1, Math.min(8, Number(a.gunlukAzami) || 8))
  };
}
export async function sabahAyarlariYaz(env, b) {
  if (!env.KV) throw new Error('KV yapılandırılmadı');
  const yeni = { ...(await sabahAyarlari(env)), ...(b || {}) };
  await env.KV.put(AYAR, JSON.stringify(yeni));
  return sabahAyarlari(env);
}
export async function sabahRaporu(env) {
  const ham = env.KV ? await env.KV.get(RAPOR).catch(() => null) : null;
  try { return ham ? JSON.parse(ham) : null; } catch { return null; }
}

/* ---------- Okuma ---------- */
function xml(s) { return String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)); }
function etiketsiz(s) { return xml(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }
function al(blok, tag) { const m = blok.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i')); return m ? xml(m[1]).trim() : ''; }

async function getir(url, ms = 15000) {
  const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  return r.text();
}

/* Google Trends günlük akışı: sorgu, tahmini trafik ve haber başlıkları. */
export async function trendleriOku() {
  const t = await getir('https://trends.google.com/trending/rss?geo=TR');
  return (t.match(/<item>[\s\S]*?<\/item>/g) || []).map(b => ({
    sorgu: etiketsiz(al(b, 'title')),
    trafik: parseInt(String(al(b, 'ht:approx_traffic')).replace(/\D/g, ''), 10) || 100,
    basliklar: (b.match(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g) || []).map(x => etiketsiz(x.replace(/<\/?ht:news_item_title>/g, '')))
  })).filter(x => x.sorgu);
}

function rssOgeleri(t) {
  return (t.match(/<item\b[\s\S]*?<\/item>/gi) || []).map(b => ({
    baslik: etiketsiz(al(b, 'title')),
    link: etiketsiz(al(b, 'link')),
    ozet: etiketsiz(al(b, 'description')).slice(0, 600),
    tarih: etiketsiz(al(b, 'pubDate'))
  })).filter(x => x.baslik && /^https?:\/\//.test(x.link));
}

/* Belediyenin RSS'i yok; haber listesi sayfasından bağlantılar okunur. */
function belediyeOgeleri(t) {
  const gorulen = new Set(), out = [];
  for (const m of t.matchAll(/href="(?:https:\/\/balikesir\.bel\.tr)?(\/haberler\/[a-z0-9-]{8,})"/g)) {
    if (gorulen.has(m[1])) continue;
    gorulen.add(m[1]);
    out.push({ baslik: '', link: 'https://balikesir.bel.tr' + m[1], ozet: '', tarih: '' });
  }
  return out.slice(0, 12);
}

async function kaynakOku(id) {
  const k = KAYNAK[id];
  const t = await getir(k.url);
  const ogeler = k.tur === 'bel' ? belediyeOgeleri(t) : rssOgeleri(t);
  return ogeler.slice(0, 25).map(o => ({ ...o, kaynakId: id, kaynakAd: k.ad }));
}

/* Haber sayfasından başlık, tarih ve paragraflar. Genel ayrıştırıcı:
   script/stil/menü atılır, 60 karakterden uzun <p>'ler toplanır. */
export async function metinCek(url) {
  let t = await getir(url, 20000);
  const baslik = etiketsiz((t.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || (t.match(/<meta property="og:title" content="([^"]*)"/i) || [])[1] || '');
  const tarih = (t.match(/"datePublished"\s*:\s*"([^"]+)"/) || t.match(/(\d{2}\.\d{2}\.20\d{2})/) || [])[1] || '';
  const spot = etiketsiz((t.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || '');
  t = t.replace(/<(script|style|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, ' ');
  // Bazı siteler (CUMHA) tüm metni kapatılmamış tek <p> içinde, satır
  // sonlarıyla verir; paragraflar satırlardan da ayrılır ve etiket/ilgili
  // haber listesi başladığında kesilir.
  const satirlar = [];
  for (const m of t.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const ham = xml(m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<\/(div|h\d|li)>/gi, '\n').replace(/<[^>]*>/g, ' '));
    for (const satir of ham.split(/\n+/)) {
      const x = satir.replace(/\s+/g, ' ').trim();
      if (/^(Etiketler|Diğer Gönderiler|İlgili Haberler|Benzer Haberler)\b/i.test(x)) break;
      satirlar.push(x);
    }
  }
  const paragraflar = satirlar
    .filter(p => p.length > 60 && !/çerez|cookie|abone ol|tüm hakları|copyright/i.test(p));
  const benzersiz = [...new Set(paragraflar)].slice(0, 30);
  return { baslik, tarih, spot, paragraflar: benzersiz, metin: [spot, ...benzersiz].join('\n') };
}

/* ---------- Puanlama ---------- */
// Genel kelimeler trend eşleşmesi sayılmaz ("Türkiye'nin", "ilk", "milli"
// her haberde geçer ve alakasız haberleri öne çekiyordu).
const DURAK = new Set(('ve ile icin bir bu da de ki mi en daha olan olarak gibi sonra kadar yeni son her tum ise ama veya hem cok yil yilin gun '
  + 'nin nun dan den tan ten ile turkiye turk ilk milli oldu dedi yillik bin milyon genel baskani baskan buyuk iki uc 2025 2026 2027 aciklama acikladi haber '
  + 'devam sure yer aldi karar gore icin uzere edildi edildigi edilen geldi gelen etti eden oldu olan yapti yapildi verdi aldi dedi etti oldugu yeniden').split(' '));
function kelimeler(s) { return duz(s).split(/[^a-z0-9]+/).filter(w => w.length > 2 && !DURAK.has(w)); }

export function trendAgirliklari(trendler) {
  const w = new Map();
  for (const t of trendler) {
    const g = Math.log10(Math.max(100, t.trafik));
    for (const k of kelimeler(t.sorgu)) w.set(k, (w.get(k) || 0) + 2 * g);
    for (const b of t.basliklar) for (const k of kelimeler(b)) w.set(k, (w.get(k) || 0) + 0.5 * g);
  }
  return w;
}

export function puanla(oge, agirlik, simdi = Date.now()) {
  const ks = new Set(kelimeler(oge.baslik + ' ' + oge.ozet));
  let p = 0; const eslesen = [];
  for (const k of ks) if (agirlik.has(k)) { p += agirlik.get(k); eslesen.push(k); }
  const t = Date.parse(oge.tarih);
  if (!Number.isNaN(t)) { const saat = (simdi - t) / 3600000; p += saat < 24 ? 3 : saat < 48 ? 1.5 : saat < 96 ? 0 : -5; }
  return { puan: Math.round(p * 10) / 10, eslesen: eslesen.slice(0, 6) };
}

/* ---------- Denetimler ---------- */
/* Çıktıdaki her sayı kaynakta geçmeli. Binlik ayırıcı (179.779 / 179 779)
   ve ondalık (18,9) yazımları normalleştirilir. */
export function rakamDenetimi(cikti, kaynak) {
  const norm = s => String(s).replace(/(\d)[.\s](?=\d{3}\b)/g, '$1');
  const kaynakN = norm(kaynak);
  const sayilar = [...new Set((norm(cikti).match(/\d+(?:,\d+)?/g) || []))];
  const eksik = sayilar.filter(s => !new RegExp('(^|[^\\d])' + s.replace(',', '[,.]') + '(?!\\d)').test(kaynakN));
  return { gecti: eksik.length === 0, eksik };
}

/* Büyük harfle başlayan her ad (cümle başı dahil) kaynakta kök olarak
   aranır. Türkçe ekler kesme işaretinden sonra atılır; kök için ilk
   max(4, n-3) harf yeterli sayılır. Yanlış alarm haberi taslakta tutar,
   yanlış kabul ise uydurma bir adı yayına çıkarır: bu yüzden katı. */
const SERBEST = new Set(['BTMEDYA', 'Haberin', 'Görsel', 'Kaynak', 'Açıklamada', 'Açıklamaya', 'Ayrıca', 'Bu', 'Bunun', 'Böylece', 'Öte', 'Buna', 'Ancak', 'Söz', 'Türkiye', 'Türkiye\'de']);
export function adDenetimi(cikti, kaynak) {
  const k = duz(kaynak);
  const adlar = [...new Set((String(cikti).match(/\b[A-ZÇĞİÖŞÜ][\wçğıöşüâîû]{3,}(?:'[\wçğıöşü]+)?/g) || []))];
  const eksik = adlar.filter(a => {
    if (SERBEST.has(a)) return false;
    const kok = duz(a.split("'")[0]);
    const n = Math.max(4, kok.length - 3);
    return !k.includes(kok.slice(0, n));
  });
  return { gecti: eksik.length === 0, eksik: eksik.slice(0, 12) };
}

/* ---------- Yazım (Workers AI) ---------- */
const SEMA = {
  type: 'object',
  properties: {
    baslik: { type: 'string' },
    spot: { type: 'string' },
    paragraflar: { type: 'array', items: { type: 'string' } },
    vurgu_deger: { type: 'string' },
    vurgu_etiket: { type: 'string' },
    gorsel_anahtar: { type: 'string' }
  },
  required: ['baslik', 'spot', 'paragraflar', 'gorsel_anahtar']
};

function yonerge(kategori) {
  return [
    'Sen BTMEDYA haber merkezinin kıdemli editörüsün. Görevin, verilen KAYNAK METİN\'i kullanarak özgün bir Türkçe haber yazmak.',
    'KURALLAR:',
    '1. Yalnız kaynak metinde açıkça yazan bilgiyi kullan. Kaynakta olmayan hiçbir rakam, tarih, isim, unvan, alıntı veya yorum ekleme.',
    '2. Kaynağın cümlelerini kopyalama; yeniden yaz. Alıntıları tırnak içinde ve kime ait olduğunu belirterek aynen koruyabilirsin.',
    '3. 5N1K: ilk paragraf ne, kim, nerede, ne zaman sorularını yanıtlasın.',
    '4. Sansasyon, ünlem, "şok", "flaş" gibi ifadeler yok. Tarafsız, sade haber dili.',
    '5. Başlık en fazla 90 karakter; spot 1-2 cümle, en fazla 260 karakter; gövde 3-6 paragraf.',
    '6. vurgu_deger: haberin en çarpıcı, kaynakta aynen geçen rakamı (örn. "179.779", "1-4", "401."). Yoksa kısa bir ifade. vurgu_etiket: bu rakamın ne olduğu, en fazla 6 kelime.',
    '7. gorsel_anahtar: haberi temsil edecek, İNSAN YÜZÜ İÇERMEYEN bir nesne ya da mekân fotoğrafı için 2-4 kelimelik İNGİLİZCE arama ifadesi (örn. "cigarette ashtray", "football stadium night"). Kişi adı, marka, logo yazma.',
    '8. Kategori: ' + kategori + '. Yanıtı yalnız istenen JSON biçiminde ver.'
  ].join('\n');
}

export async function yaz(env, ayar, kaynak, kategori) {
  const girdi = [
    'KAYNAK BAŞLIK: ' + kaynak.baslik,
    'KAYNAK TARİH: ' + (kaynak.tarih || 'belirtilmemiş'),
    'KAYNAK METİN:',
    kaynak.metin.slice(0, 9000)
  ].join('\n');
  const r = await env.AI.run(ayar.model, {
    messages: [{ role: 'system', content: yonerge(kategori) }, { role: 'user', content: girdi }],
    response_format: { type: 'json_schema', json_schema: SEMA },
    max_tokens: 1800,
    temperature: 0.3
  });
  let j = r && r.response;
  if (typeof j === 'string') { try { j = JSON.parse(j.slice(j.indexOf('{'), j.lastIndexOf('}') + 1)); } catch { j = null; } }
  if (!j || !j.baslik || !Array.isArray(j.paragraflar)) throw new Error('Model geçerli JSON döndürmedi');
  return {
    baslik: String(j.baslik).trim().slice(0, 200),
    spot: String(j.spot || '').trim().slice(0, 400),
    paragraflar: j.paragraflar.map(p => String(p).trim()).filter(p => p.length > 30).slice(0, 8),
    vurgu: { deger: String(j.vurgu_deger || '').slice(0, 14), etiket: String(j.vurgu_etiket || '').slice(0, 60) },
    gorselAnahtar: String(j.gorsel_anahtar || '').replace(/[^a-zA-Z ]/g, ' ').trim().slice(0, 60)
  };
}

/* ---------- Görsel ---------- */
const LISANS_AD = { by: 'CC BY', 'by-sa': 'CC BY-SA', cc0: 'CC0', pdm: 'kamu malı' };

/* Openverse'ten ticari kullanıma ve değişikliğe açık, yeterli çözünürlükte
   bir kare seçer, R2'ye kopyalar. Kaynak sunucular botları sınırlayabilir;
   görsel bulunamazsa haber görselsiz (bilgi grafiği yedeğiyle) çıkar. */
export async function gorselBul(env, anahtar, slug) {
  if (!anahtar || !env.MEDIA) return null;
  const u = 'https://api.openverse.org/v1/images/?' + new URLSearchParams({ q: anahtar, page_size: '15', license_type: 'commercial,modification', mature: 'false' });
  const d = await (await fetch(u, { headers: UA, signal: AbortSignal.timeout(15000) })).json().catch(() => ({}));
  const adaylar = (d.results || []).filter(x => (x.width || 0) >= 900 && (x.height || 0) >= 500 && ['by', 'by-sa', 'cc0', 'pdm'].includes(x.license) && /\.(jpe?g)(\?|$)/i.test(x.url));
  for (const x of adaylar.slice(0, 4)) {
    let url = x.url;
    const commons = url.match(/upload\.wikimedia\.org\/wikipedia\/commons\/(.+)$/);
    if (commons && x.width > 1600) { const ad = commons[1].split('/').pop(); url = `https://upload.wikimedia.org/wikipedia/commons/thumb/${commons[1]}/1600px-${ad}`; }
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
      const tip = r.headers.get('content-type') || '';
      if (!r.ok || !/image\/jpe?g/.test(tip)) continue;
      const govde = await r.arrayBuffer();
      if (govde.byteLength < 30000 || govde.byteLength > 9000000) continue;
      const key = `otomasyon/${slug}.jpg`;
      await env.MEDIA.put(key, govde, { httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' } });
      const lisans = x.license === 'cc0' || x.license === 'pdm' ? LISANS_AD[x.license] : `${LISANS_AD[x.license]} ${x.license_version || ''}`.trim();
      return {
        key, url: '/gorsel/' + key,
        kunye: `temsili fotoğraf — ${(x.creator || 'anonim').slice(0, 60)} / ${x.source === 'wikimedia' ? 'Wikimedia Commons' : x.source === 'flickr' ? 'Flickr' : x.source}, ${lisans}`,
        kaynak_url: x.foreign_landing_url || ''
      };
    } catch {}
  }
  return null;
}

/* ---------- Slug ---------- */
export function slugUret(baslik) {
  return duz(baslik).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90).replace(/-+$/, '') || 'haber';
}

/* ---------- E-posta özeti ---------- */
async function ozetGonder(env, rapor) {
  if (!env.RESEND_API_KEY || !env.RESEND_TO) return false;
  const satir = rapor.secilen.map(s => `<li><b>${s.kategori}</b> — ${s.durum === 'yayinlandi' ? '✅ yayında' : s.durum === 'taslak' ? '📝 taslak' : '⏭ ' + s.durum}: ${escapeHtml(s.baslik || s.kaynakBaslik || '')}${s.not ? ` <i>(${escapeHtml(s.not)})</i>` : ''}</li>`).join('');
  const trend = rapor.trendler.slice(0, 10).map(t => escapeHtml(t.sorgu)).join(' · ');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.RESEND_FROM || 'BTMEDYA <noreply@btmedya.com.tr>',
      to: [env.RESEND_TO],
      subject: `BTMEDYA Sabah Masası · ${rapor.yayinlanan} yayında, ${rapor.taslak} taslak`,
      html: `<p>Bugünün trendleri: ${trend}</p><ul>${satir}</ul><p>Taslakları onaylamak için: <a href="https://btmedya.com.tr/admin/">Yönetim paneli</a></p>`
    })
  }).catch(() => null);
  return Boolean(r && r.ok);
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ---------- Ana akış ---------- */
export async function sabahMasasi(env, secenek = {}) {
  const ayar = await sabahAyarlari(env);
  const kuru = secenek.kuru === true;
  const rapor = { baslangic: new Date().toISOString(), kuru, ayar, trendler: [], secilen: [], yayinlanan: 0, taslak: 0, hatalar: [] };
  if (!env.DB) { rapor.hatalar.push('D1 yok'); return rapor; }
  if (!ayar.etkin && !secenek.zorla) { rapor.hatalar.push('Sabah Masası kapalı'); return rapor; }

  try { rapor.trendler = await trendleriOku(); } catch (e) { rapor.hatalar.push('Trendler okunamadı: ' + e.message); }
  const agirlik = trendAgirliklari(rapor.trendler);

  // Kaynakları paralel oku; biri düşerse diğerleri devam eder.
  const idler = [...new Set(KATEGORILER.flatMap(k => k.kaynaklar))];
  const okunan = await Promise.all(idler.map(id => kaynakOku(id).then(x => [id, x]).catch(e => { rapor.hatalar.push(id + ': ' + e.message); return [id, []]; })));
  const havuz = Object.fromEntries(okunan);

  await env.DB.prepare('CREATE TABLE IF NOT EXISTS kaynak_gorulen (link TEXT PRIMARY KEY, created_at TEXT NOT NULL)').run();
  const gorulmus = async link => Boolean(await env.DB.prepare('SELECT 1 FROM kaynak_gorulen WHERE link=? UNION SELECT 1 FROM news WHERE source_url=? LIMIT 1').bind(link, link).first());

  // Son 4 günün başlıkları: aynı konu farklı kaynaktan ikinci kez girmesin.
  const son = ((await env.DB.prepare("SELECT title FROM news WHERE COALESCE(published_at,updated_at) > ?").bind(new Date(Date.now() - 4 * 86400000).toISOString()).all().catch(() => ({ results: [] }))).results || []).map(x => new Set(kelimeler(x.title)));
  const tekrarMi = baslik => { const a = new Set(kelimeler(baslik)); return a.size > 2 && son.some(b => { let o = 0; for (const k of a) if (b.has(k)) o++; return o / Math.min(a.size, b.size) >= 0.5; }); };

  let islenen = 0;
  for (const kat of KATEGORILER) {
    if (islenen >= ayar.gunlukAzami) break;
    const adaylar = kat.kaynaklar.flatMap(id => havuz[id] || [])
      // Akış tarihi bilinen ve 72 saatten eski haber puanlanmadan elenir:
      // trend eşleşmesi eski bir haberi öne çekmesin.
      .filter(o => { const t = Date.parse(o.tarih); return Number.isNaN(t) || Date.now() - t < 72 * 3600000; })
      // Başka kategorinin haberi (ör. gündem akışındaki maç haberi) buraya girmez.
      .filter(o => kat.anahtar === 'spor' || !SPOR_KELIME.test(duz(o.baslik)))
      // Video/canlı yayın sayfalarında haber metni yok.
      .filter(o => !/\b(izle|canli yayin|video)\b/.test(duz(o.baslik)))
      .filter(o => !o.baslik || !tekrarMi(o.baslik))
      .map(o => ({ ...o, ...puanla(o, agirlik) }))
      .sort((a, b) => b.puan - a.puan);
    let secildi = null;
    for (const o of adaylar.slice(0, 15)) {
      if (await gorulmus(o.link)) continue;
      let kaynak;
      try { kaynak = await metinCek(o.link); } catch (e) { continue; }
      if (kaynak.paragraflar.length < 2 || kaynak.metin.length < 500) continue;
      if (hassasMi(kaynak.baslik + ' ' + kaynak.spot + ' ' + kaynak.metin.slice(0, 1500))) {
        rapor.secilen.push({ kategori: kat.kategori, durum: 'hassas-atlandi', kaynakBaslik: kaynak.baslik || o.baslik, kaynak: o.link });
        await env.DB.prepare('INSERT OR IGNORE INTO kaynak_gorulen(link,created_at) VALUES(?,?)').bind(o.link, new Date().toISOString()).run();
        continue;
      }
      if (tekrarMi(kaynak.baslik)) continue;
      if (kat.anahtar !== 'spor' && (duz(kaynak.metin.slice(0, 1500)).match(new RegExp(SPOR_KELIME.source, 'g')) || []).length >= 2) continue;
      // Belediye haberlerinde tarih sayfadan gelir; 4 günden eskisi atlanır.
      const t = Date.parse(kaynak.tarih.replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, '$3-$2-$1'));
      if (!Number.isNaN(t) && Date.now() - t > 4 * 86400000) continue;
      secildi = { o, kaynak };
      break;
    }
    if (!secildi) { rapor.secilen.push({ kategori: kat.kategori, durum: 'uygun-kaynak-yok' }); continue; }
    islenen++;
    const { o, kaynak } = secildi;
    const kayit = { kategori: kat.kategori, kaynakBaslik: kaynak.baslik || o.baslik, kaynak: o.link, puan: o.puan, trend: o.eslesen };
    rapor.secilen.push(kayit);
    if (kuru) { kayit.durum = 'kuru-calisma'; continue; }
    try {
      if (!env.AI) throw new Error('Workers AI bağlaması (AI) yok');
      const y = await yaz(env, ayar, kaynak, kat.kategori);
      const cikti = [y.baslik, y.spot, ...y.paragraflar, y.vurgu.deger].join('\n');
      const rd = rakamDenetimi(cikti, kaynak.metin + '\n' + kaynak.baslik);
      const ad = adDenetimi(cikti, kaynak.metin + '\n' + kaynak.baslik + '\n' + o.kaynakAd);
      let slug = slugUret(y.baslik);
      if (await env.DB.prepare('SELECT 1 FROM news WHERE slug=?').bind(slug).first()) slug += '-' + Date.now().toString(36).slice(-4);
      const gorsel = await gorselBul(env, y.gorselAnahtar, slug).catch(() => null);
      const yayinla = ayar.otomatikYayin && rd.gecti && ad.gecti;
      const not = [
        `Bu haber, ${o.kaynakAd} kaynağındaki bilgilerden BTMEDYA Sabah Masası tarafından yapay zekâ desteğiyle derlenmiştir${yayinla ? ' ve otomatik denetimlerden (rakam ve özel ad) geçerek yayımlanmıştır; editör denetiminden geçmemiştir' : ''}.`,
        gorsel ? `Kapaktaki görsel ${gorsel.kunye} lisanslıdır ve olayın kendisini göstermez.` : 'Kapak, BTMEDYA kategori grafiğidir; fotoğraf değildir.',
        !rd.gecti ? `Rakam denetimi: kaynakta bulunmayan ${rd.eksik.join(', ')}.` : '',
        !ad.gecti ? `Özel ad denetimi: kaynakta bulunmayan ${ad.eksik.join(', ')}.` : ''
      ].filter(Boolean).join(' ');
      const govde = [...y.paragraflar, gorsel ? `Görsel: ${gorsel.kunye}.` : ''].filter(Boolean).join('\n\n');
      const simdi = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO news(slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,source_url,original_date,archive_note,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(slug, y.baslik, y.spot, govde, kat.kategori, 'BTMEDYA Sabah Masası', gorsel ? gorsel.url : `/assets/kategori-kapak/${kat.anahtar}.webp`, '', yayinla ? 'published' : 'draft', yayinla ? simdi : null, o.link, kaynak.tarih || null, not, simdi).run();
      await env.DB.prepare('INSERT OR IGNORE INTO kaynak_gorulen(link,created_at) VALUES(?,?)').bind(o.link, simdi).run();
      Object.assign(kayit, { slug, baslik: y.baslik, durum: yayinla ? 'yayinlandi' : 'taslak', gorsel: Boolean(gorsel), vurgu: y.vurgu, not: [!rd.gecti ? 'rakam' : '', !ad.gecti ? 'özel ad: ' + ad.eksik.slice(0, 3).join(', ') : ''].filter(Boolean).join(' · ') });
      if (yayinla) rapor.yayinlanan++; else rapor.taslak++;
    } catch (e) {
      kayit.durum = 'hata'; kayit.not = String(e.message || e).slice(0, 200);
      rapor.hatalar.push(kat.kategori + ': ' + kayit.not);
    }
  }
  rapor.bitis = new Date().toISOString();
  rapor.sosyal = await sosyalAyarlari(env).then(a => ({ otomatikPlanla: a.otomatikPlanla, aglar: a.aglar })).catch(() => null);
  if (!kuru) {
    rapor.eposta = await ozetGonder(env, rapor).catch(() => false);
    if (env.KV) await env.KV.put(RAPOR, JSON.stringify(rapor), { expirationTtl: 60 * 86400 }).catch(() => {});
  }
  return rapor;
}
