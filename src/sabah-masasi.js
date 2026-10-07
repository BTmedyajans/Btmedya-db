/* BTMEDYA Sabah Masası — her gün 08:00 (Europe/Istanbul) çalışan haber +
 * sosyal otomasyonu.
 *
 * Akış: Google Trends TR -> kategori kaynakları -> trend puanı -> kategori
 * başına bir haber -> kaynak metin -> Workers AI ile özgün metin (tüm
 * kategoriler eş zamanlı) -> rakam, özel ad ve kalite denetimi -> lisanslı
 * temsili fotoğraf (Openverse) -> R2 -> yayın ya da taslak -> sosyal zincir
 * (sosyal-otomasyon.js) -> e-posta özeti.
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
/* Model ayarlarda saklanmaz, koddan gelir: llama-3.3 ile yapılan canlı
   denemede başlıklar yarım kalıyor ("Okula Uyumu"), Türkçe ekler bozuluyordu
   ("4-1'lık"). Model değişikliği kalite denetimiyle birlikte kodda yapılır. */
const MODEL = '@cf/openai/gpt-oss-120b';
const VARSAYILAN = Object.freeze({
  etkin: true,
  otomatikYayin: true,
  gunlukAzami: 8,
  kategoriler: null // null: hepsi
});

/* Sitenin 8 kategorisi (public/home.js BTMEDYA_RELEVANCE ile aynı sıra).
   "kategori" haberin D1'deki category alanına yazılan değerdir. */
export const KATEGORILER = [
  { anahtar: 'balikesir', kategori: 'Yerel', kaynaklar: ['balikesir-bel', 'balikesir-valilik', 'btt', 'cumha-balikesir'] },
  { anahtar: 'gundem', kategori: 'Gündem', kaynaklar: ['trt-gundem', 'trt-turkiye', 'balikesir-valilik'] },
  { anahtar: 'ekonomi', kategori: 'Ekonomi', kaynaklar: ['trt-ekonomi', 'balikesir-bel'] },
  // TRT kültür-sanat akışı günde bir-iki haber veriyor; AA, Sabah ve belediye yedek.
  { anahtar: 'kultur', kategori: 'Kültür', kaynaklar: ['trt-kultur', 'aa-kultur', 'sabah-kultur', 'balikesir-bel'] },
  { anahtar: 'egitim', kategori: 'Eğitim', kaynaklar: ['trt-egitim', 'hurriyet-egitim', 'baun'] },
  { anahtar: 'saglik', kategori: 'Sağlık', kaynaklar: ['trt-saglik', 'sabah-saglik', 'balikesir-valilik', 'baun'] },
  // TRT spor akışı günlerce güncellenmeyebiliyor; Hürriyet ve Sabah yedek.
  { anahtar: 'spor', kategori: 'Spor', kaynaklar: ['trt-spor', 'hurriyet-spor', 'sabah-spor', 'baun'] },
  { anahtar: 'teknoloji', kategori: 'Teknoloji', kaynaklar: ['trt-teknoloji', 'hurriyet-teknoloji', 'aa-teknoloji', 'baun'] },
  // 6 Ekim: ulusal haber sitelerindeki Dünya ve Yaşam bölümleri. Yalnız
  // kurumsal yayıncıların RSS akışları; hassas konu ve iddia kapıları aynen geçerli.
  { anahtar: 'dunya', kategori: 'Dünya', kaynaklar: ['trt-dunya', 'hurriyet-dunya', 'sabah-dunya'] },
  { anahtar: 'yasam', kategori: 'Yaşam', kaynaklar: ['trt-yasam', 'sabah-yasam'] }
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
  'hurriyet-teknoloji': { ad: 'Hürriyet', tur: 'rss', url: 'https://www.hurriyet.com.tr/rss/teknoloji' },
  'aa-kultur': { ad: 'Anadolu Ajansı', tur: 'rss', url: 'https://www.aa.com.tr/tr/rss/default?cat=kultur' },
  'aa-teknoloji': { ad: 'Anadolu Ajansı', tur: 'rss', url: 'https://www.aa.com.tr/tr/rss/default?cat=bilim-teknoloji' },
  'sabah-kultur': { ad: 'Sabah', tur: 'rss', url: 'https://www.sabah.com.tr/rss/kultur-sanat.xml' },
  'sabah-saglik': { ad: 'Sabah', tur: 'rss', url: 'https://www.sabah.com.tr/rss/saglik.xml' },
  'trt-dunya': { ad: 'TRT Haber', tur: 'rss', url: 'https://www.trthaber.com/dunya_articles.rss' },
  'hurriyet-dunya': { ad: 'Hürriyet', tur: 'rss', url: 'https://www.hurriyet.com.tr/rss/dunya' },
  'sabah-dunya': { ad: 'Sabah', tur: 'rss', url: 'https://www.sabah.com.tr/rss/dunya.xml' },
  'trt-yasam': { ad: 'TRT Haber', tur: 'rss', url: 'https://www.trthaber.com/yasam_articles.rss' },
  'sabah-yasam': { ad: 'Sabah', tur: 'rss', url: 'https://www.sabah.com.tr/rss/yasam.xml' },
  // Balıkesir yerel radar: kurumların resmi haber/duyuru sayfaları.
  'balikesir-valilik': { ad: 'Balıkesir Valiliği', tur: 'html', url: 'https://www.balikesir.gov.tr/haberler', base: 'https://www.balikesir.gov.tr' },
  'baun': { ad: 'Balıkesir Üniversitesi', tur: 'html', url: 'https://balikesir.edu.tr/', base: 'https://balikesir.edu.tr' },
  'btt': { ad: 'Balıkesir Toplu Taşıma AŞ', tur: 'html', url: 'https://baltus.balikesir.bel.tr/', base: 'https://baltus.balikesir.bel.tr' }
};

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; BTMEDYA-SabahMasasi/1.0; +https://btmedya.com.tr)' };

/* Otomatik akışa alınmayan konular. Tam kelime, Türkçe harfler düzleştirilmiş. */
// Ölüm ve yaralanma haberleri de dışarıda: yakınlara ulaşılmadan ad, yaş ve
// ayrıntı yayınlamak editör kararıdır.
const HASSAS = /\b(chp|akp|ak parti|mhp|dem parti|iyi parti|yeni parti|zafer partisi|erdogan|ozgur ozel|kilicdaroglu|bahceli|imamoglu|yavas|secim|milletvekili|miting|tutuklan\w*|gozalti\w*|sorusturma\w*|iddianame|sanik|cinayet|oldur\w*|bicakla\w*|silahli|taciz|istismar|intihar|feto|teror\w*|casus\w*|olu|oluler\w*|olum|olumu|olumun\w*|olume|olumle|hayatini kaybet\w*|can verdi|ceset\w*|yarali|yaralilar\w*|yaralandi|yaralanan)\b/;

export function duz(s) {
  return String(s || '').toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[âà]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function hassasMi(metin) { return HASSAS.test(duz(metin)); }

/* Tanıtım içerikleri (özel hastane/klinik tanıtımı) haber gibi yayınlanmaz.
   29 Eylül: "Provalı göz kapağı operasyonu" başlıklı yazı bir özel hastanenin
   tanıtımıydı ve Sağlık taslağı olarak çıktı. Metnin başında adı geçen özel
   sağlık markası ya da "Özel ... Hastanesi" varsa aday atlanır. */
const TANITIM = /\b(dunyagoz|acibadem|memorial|medical park|liv hospital|medipol|florence nightingale|anadolu saglik merkezi|medicana|medline|hisar intercontinental|amerikan hastanesi|american hospital|guven hastanesi|istinye universitesi hastanesi|koc universitesi hastanesi|ozel [a-z]{2,20}( [a-z]{2,20}){0,3} (hastanesi|poliklinigi|klinigi|tip merkezi)|estetik (merkezi|klinigi))\b/;
export function tanitimMi(metin) { return TANITIM.test(duz(metin)); }

/* Kulis, iddia ve transfer söylentisi kesin bilgi gibi yazılmaz; kaynağa
   atfedilir. 29 Eylül Spor taslağı bir transfer iddiasını "hedefliyor" diye
   kesinleştirmiş, piyasa değerini "bonservis" yapmıştı. */
const KULIS = /\b(iddia\w*|kulis\w*|gundeminde|bombasi|golcu operasyonu|transfer operasyonu|transfer hamlesi|ilgileniyor|kadrosuna katmak istiyor|masada)\b/;
const ATIF = /\b(gore|iddia\w*|ileri suruldu|one suruldu|haberine|aktardi|yazdi|bildirildi)\b/;
const KESINLIK = /\b(ortaya cikti|belli oldu|kesinlesti|netlesti|gercek ortaya|perde aralandi|aciga cikti)\b/;
export function kulisMi(metin) { return KULIS.test(duz(metin)); }
export function atifVarMi(metin) { return ATIF.test(duz(metin)); }
const SPOR_KELIME = /\b(futbol|mac|maci|milli takim|uefa|super lig|gol|teknik direktor|transfer|basketbol|voleybol|fenerbahce|galatasaray|besiktas|trabzonspor)\b/;

/* ---------- Ayarlar ve rapor ---------- */
export async function sabahAyarlari(env) {
  let k = {};
  const ham = env.KV ? await env.KV.get(AYAR).catch(() => null) : null;
  if (ham) try { k = JSON.parse(ham); } catch {}
  const a = { ...VARSAYILAN, ...k };
  const gecerli = new Set(KATEGORILER.map(x => x.anahtar));
  const secili = Array.isArray(a.kategoriler) ? a.kategoriler.map(String).filter(x => gecerli.has(x)) : null;
  return {
    etkin: a.etkin !== false,
    // Güvenli, kaynak doğrulamalı içerikler otomatik yayınlanabilir; hassas,
    // tanıtım ve denetimden kalmış içerikler kategoriIsle içinde taslak kalır.
    otomatikYayin: env.BTMEDYA_AUTO_PUBLISH === 'true' || a.otomatikYayin === true,
    model: MODEL,
    gunlukAzami: Math.max(1, Math.min(8, Number(a.gunlukAzami) || 8)),
    // Boş seçim "hiçbiri" değil "hepsi" sayılır: yanlışlıkla boşaltılan
    // liste sabah akışını sessizce durdurmasın.
    kategoriler: secili && secili.length ? [...new Set(secili)] : KATEGORILER.map(x => x.anahtar)
  };
}
export async function sabahAyarlariYaz(env, b) {
  if (!env.KV) throw new Error('KV yapılandırılmadı');
  const { model, ...yeni } = { ...(await sabahAyarlari(env)), ...(b || {}) };
  await env.KV.put(AYAR, JSON.stringify(yeni));
  return sabahAyarlari(env);
}
export async function sabahRaporu(env) {
  const ham = env.KV ? await env.KV.get(RAPOR).catch(() => null) : null;
  try { return ham ? JSON.parse(ham) : null; } catch { return null; }
}

/* ---------- Okuma ---------- */
function xml(s) { return String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))); }
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

/* Kurumların RSS vermediği yerel kaynaklar için güvenli HTML listeleyici.
   Yalnız başlık + kurum içi bağlantı toplar; ayrıntılar metinCek'te kaynaktan
   tekrar okunur. Dış bağlantılar ve menü linkleri alınmaz. */
function htmlListeOgeleri(t, base, prefixes) {
  const gorulen = new Set(), out = [];
  const hrefRe = /href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of t.matchAll(hrefRe)) {
    const raw = String(m[1] || '').trim();
    const text = etiketsiz(m[2] || '');
    if (!text || text.length < 12 || text.length > 220) continue;
    let u;
    try { u = new URL(raw, base); } catch { continue; }
    if (u.origin !== new URL(base).origin) continue;
    if (!prefixes.some(p => u.pathname.startsWith(p))) continue;
    if (gorulen.has(u.href)) continue;
    if (/^(duyurular|haberler|anasayfa|iletisim|ara|detay|devamını oku|tümü)$/i.test(text)) continue;
    gorulen.add(u.href);
    out.push({ baslik: text, link: u.href, ozet: '', tarih: '' });
  }
  return out.slice(0, 20);
}

function kaynakGuveni(id) {
  if (['balikesir-bel', 'balikesir-valilik', 'btt', 'baun'].includes(id)) return 4;
  if (id.startsWith('trt-') || id.startsWith('aa-')) return 3;
  if (id.startsWith('hurriyet-') || id.startsWith('sabah-')) return 2;
  return 1;
}

async function kaynakOku(id) {
  const k = KAYNAK[id];
  const t = await getir(k.url);
  const ogeler = k.tur === 'bel'
    ? belediyeOgeleri(t)
    : k.tur === 'html'
      ? htmlListeOgeleri(t, k.base || k.url, k.base?.includes('balikesir.edu.tr') ? ['/haberler/', '/duyurular/'] : ['/haberler/'])
      : rssOgeleri(t);
  return ogeler.slice(0, 25).map(o => ({
    ...o,
    kaynakId: id,
    kaynakAd: k.ad,
    kaynakGuven: kaynakGuveni(id)
  }));
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
    .filter(p => p.length > 60 && !/çerez|cookie|abone ol|tüm hakları|copyright|bu haberde bir hata mı var|okur temsilcimiz/i.test(p));
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
// Cümle başındaki büyük harf ad kanıtı değildir ("Aynı grup...", "Maçta
// gösterilen..."): cümle başında, eksiz ve ardından küçük harfli sözcük gelen
// tek sözcük atlanır. "Mehmet Kaya konuştu" gibi çok sözcüklü adlar ve
// "Balıkesir'de" gibi ek almış adlar yine denetlenir.
function cumleBasiSiradanMi(metin, m) {
  const once = metin.slice(Math.max(0, m.index - 3), m.index);
  const basta = m.index === 0 || /(^|[.!?:…]["”’]?\s+|\n\s*)["“‘]?$/.test(once);
  if (!basta || m[0].includes("'")) return false;
  return /^\s+[a-zçğıöşü]/.test(metin.slice(m.index + m[0].length, m.index + m[0].length + 3));
}
export function adDenetimi(cikti, kaynak) {
  const k = duz(kaynak);
  const metin = String(cikti);
  const adlar = [...new Set([...metin.matchAll(/\b[A-ZÇĞİÖŞÜ][\wçğıöşüâîû]{3,}(?:'[\wçğıöşü]+)?/g)]
    .filter(m => !cumleBasiSiradanMi(metin, m)).map(m => m[0]))];
  const eksik = adlar.filter(a => {
    if (SERBEST.has(a)) return false;
    const kok = duz(a.split("'")[0]);
    const n = Math.max(4, kok.length - 3);
    return !k.includes(kok.slice(0, n));
  });
  return { gecti: eksik.length === 0, eksik: eksik.slice(0, 12) };
}

/* ---------- Kalite denetimi ---------- */
/* Rakam ve ad denetimi doğruluğu korur; bu denetim okunurluğu. llama-3.3
   denemesinde çıkan kusurlar ölçüte çevrildi: yarım başlık, Başlık Gibi Her
   Kelimesi Büyük yazım, kısa spot, iki paragraflık gövde ve kaynağın
   cümlelerini olduğu gibi aktarmak. */
function kelimeSay(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }

function kopyaOrani(paragraflar, kaynakMetin) {
  // 8 kelimelik dizilerin kaynakta aynen geçme oranı.
  const k = ' ' + duz(kaynakMetin).replace(/[^a-z0-9]+/g, ' ') + ' ';
  let toplam = 0, ayni = 0;
  for (const p of paragraflar) {
    const w = duz(p).replace(/[^a-z0-9]+/g, ' ').trim().split(' ');
    for (let i = 0; i + 8 <= w.length; i += 4) {
      toplam++;
      if (k.includes(' ' + w.slice(i, i + 8).join(' ') + ' ')) ayni++;
    }
  }
  return toplam ? ayni / toplam : 0;
}

/* Skor ekleri son sayının okunuşuna uyar: 4-1'lik (bir), 2-3'lük (üç),
   1-0'lık (sıfır), 3-9'luk (dokuz). */
const SKOR_EKI = { 0: "lık", 1: "lik", 2: "lik", 3: "lük", 4: "lük", 5: "lik", 6: "lık", 7: "lik", 8: "lik", 9: "luk" };
export function skorEkiHatasi(metin) {
  for (const m of String(metin).matchAll(/\b(\d{1,2})-(\d)['’](l[ıiuü]k)\b/g)) {
    if (SKOR_EKI[m[2]] !== m[3]) return `${m[0]} → ${m[1]}-${m[2]}'${SKOR_EKI[m[2]]}`;
  }
  return '';
}

/* TDK: belirli tarih bildiren ay adı büyük harfle başlar ("30 Eylül").
   29 Eylül canlı yayında "30 eylül-4 ekim" başlığı çıktı. */
const AYLAR_KUCUK = 'ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık';
export function kucukAyAdi(metin) {
  const m = String(metin).match(new RegExp('\\b\\d{1,2}\\s+(' + AYLAR_KUCUK + ')(?![a-zçğıöşü])', 'u'));
  return m ? m[0] : '';
}

/* Aynı 8 sözcüklük dizinin gövdede ikinci kez geçmesi: modelin dolgu için
   önceki paragrafı yeniden anlatması. */
export function tekrarEdenIfade(paragraflar) {
  const gorulen = new Set();
  for (const p of paragraflar) {
    const w = duz(p).replace(/[^a-z0-9]+/g, ' ').trim().split(' ');
    for (let i = 0; i + 8 <= w.length; i++) {
      const d = w.slice(i, i + 8).join(' ');
      if (gorulen.has(d)) return d;
      gorulen.add(d);
    }
  }
  return '';
}

export function kaliteDenetimi(y, kaynakMetin = '', kaynakOzet = '') {
  const sorun = [];
  const baslik = String(y.baslik || '').trim();
  const spot = String(y.spot || '').trim();
  const govde = (y.paragraflar || []).join(' ');
  if (baslik.length < 40 || kelimeSay(baslik) < 5) sorun.push('başlık kısa veya yarım (en az 40 karakter, 5 kelime)');
  if (baslik.length > 110) sorun.push('başlık 110 karakteri aşıyor');
  const sozcukler = baslik.split(/\s+/).filter(w => /^[a-zçğıöşü]/i.test(w) && w.length > 3);
  const buyuk = sozcukler.filter(w => /^[A-ZÇĞİÖŞÜ]/.test(w)).length;
  if (sozcukler.length >= 4 && buyuk / sozcukler.length > 0.7) sorun.push('başlık Her Kelimesi Büyük biçiminde; cümle düzeninde yazılmalı');
  if (/[!?]$|\b(şok|flaş|son dakika|bomba)\b/i.test(baslik)) sorun.push('başlıkta sansasyon ifadesi');
  if (spot.length < 90) sorun.push('spot 90 karakterden kısa');
  if (spot.length > 300) sorun.push('spot 300 karakteri aşıyor');
  if ((y.paragraflar || []).length < 3) sorun.push('gövde 3 paragraftan az');
  if (govde.length < 650) sorun.push('gövde 650 karakterden kısa');
  const ekHata = skorEkiHatasi(govde + ' ' + baslik + ' ' + spot);
  if (ekHata) sorun.push(`skor eki hatalı: ${ekHata}`);
  if (kulisMi(kaynakOzet || String(kaynakMetin).slice(0, 600)) && !atifVarMi([baslik, spot, (y.paragraflar || [])[0] || ''].join(' '))) {
    sorun.push('kaynak bir iddia/kulis aktarıyor ama başlık, spot ve ilk paragrafta kaynağa atıf yok ("... haberine göre")');
  }
  // İddia aktaran kaynakta başlık kesinlik bildiremez: "nedeni ortaya çıktı"
  // dediğimizde Hürriyet'in "iddia"sını doğrulanmış bilgi gibi sunduk (Kökçü,
  // 3 Ekim). Gövdedeki tek bir "bildirildi" atıf sayıldığı için yukarıdaki
  // kural bunu kaçırdı; başlığın kendisi ya atıf taşımalı ya kesinlik iddia etmemeli.
  if (kulisMi(kaynakOzet || String(kaynakMetin).slice(0, 600)) && KESINLIK.test(duz(baslik)) && !atifVarMi(baslik) && !/^[^:]{2,40}:\s/.test(baslik)) {
    sorun.push('kaynak bir iddia aktarıyor ama başlık bunu kesinleşmiş gibi sunuyor ("ortaya çıktı", "belli oldu"); başlıkta kaynağa atıf yapın ya da kesinlik ifadesini kaldırın');
  }
  const ay = kucukAyAdi([baslik, spot, govde].join(' '));
  if (ay) sorun.push(`tarih bildiren ay adı küçük yazılmış: "${ay}" (TDK: büyük harfle)`);
  const tekrar = tekrarEdenIfade(y.paragraflar || []);
  if (tekrar) sorun.push(`gövdede aynı ifade tekrar ediyor: "${tekrar}"`);
  const oran = kopyaOrani(y.paragraflar || [], kaynakMetin);
  if (oran > 0.4) sorun.push(`gövdenin %${Math.round(oran * 100)}'i kaynaktan aynen alınmış`);
  return { gecti: sorun.length === 0, sorun, kopya: Math.round(oran * 100) / 100 };
}

/* ---------- Yazım (Workers AI) ---------- */
function yonerge(kategori) {
  return [
    'Sen BTMEDYA haber merkezinin kıdemli editörüsün. Görevin, verilen KAYNAK METİN\'den yayına hazır, özgün bir Türkçe haber yazmak.',
    '',
    'DOĞRULUK',
    '1. Yalnız kaynak metinde açıkça yazan bilgiyi kullan. Kaynakta olmayan rakam, tarih, isim, unvan, kurum, alıntı, yorum ya da tahmin ekleme.',
    '2. Kaynaktaki rakamları kaynaktaki biçimiyle yaz (örn. "108 bin 321", "yüzde 24"). Rakamı yazıya çevirme, yuvarlama, hesaplama yapma.',
    '3. Kişi ve kurum adlarını kaynaktaki yazımla ver. Unvanı kaynakta yoksa unvan uydurma.',
    '4. Alıntı yalnız kaynakta tırnak içinde geçiyorsa, kime ait olduğu belirtilerek aynen kullanılabilir.',
    '',
    'DİL VE BİÇİM',
    '5. BAŞLIK: 55-95 karakter, yüklemi olan tam bir haber cümlesi; özne + ne oldu. Cümle düzeninde yaz: yalnız ilk harf ve özel adlar büyük. Ünlem, soru, "şok", "flaş" yok. Başlık merak uyandırsın ama tık tuzağı olmasın; Balıkesir haberinde yerel gelişmenin insanlara, ekonomiye veya dünyadaki benzer gelişmelere neden önemli olduğunu kaynaktaki olgularla hissettirsin. Kötü örnek: "Okula Uyumu". İyi örnek: "Balıkesir\'de tarım fuarı dört günde 108 bin ziyaretçiyi ağırladı".',
    '6. SPOT: 1-2 cümle, 140-260 karakter; başlığı tekrarlamadan haberin en önemli bilgisini ve bağlamını versin.',
    '7. GÖVDE: 4-6 paragraf, her biri 2-4 cümle. İlk paragraf 5N1K\'yı (ne, kim, nerede, ne zaman, nasıl, neden) yanıtlasın; sonrakiler ayrıntı, bağlam ve varsa açıklamaları versin. Kaynağın cümlelerini kopyalama; kendi cümlelerinle yeniden kur.',
    '8. Türkçe ekleri doğru yaz: özel adlara ek kesme işaretiyle (Balıkesir\'de, TRT\'nin); skorlar "4-1\'lik", "2-0\'lık" biçiminde; sayılara gelen ekler okunuşa göre (3\'te, 5\'i, 1990\'lı).',
    '9. Tarafsız, sade, ajans dili. Sıfat yığını, klişe ve pazarlama dili yok.',
    '10. Belirli bir tarih bildiren ay ve gün adları büyük harfle başlar: "30 Eylül", "4 Ekim Cuma"; başlıkta da.',
    '11. Kaynak bir iddia, kulis ya da transfer söylentisi aktarıyorsa bunu kesin bilgi gibi yazma: başlıkta ve ilk paragrafta kaynağa atfet ("Hürriyet\'in haberine göre", "iddia edildi"). Piyasa değeri, bonservis, maaş gibi kavramları birbirine dönüştürme.',
    '12. Kaynakta olmayan değerlendirme ya da sonuç cümlesi ekleme ("bu hamleyle ... amaçlıyor", "... umuyor" gibi). Gövdeyi kaynaktaki bilgi bitince bitir.',
    '',
    'EK ALANLAR',
    '13. vurgu_deger: kaynakta aynen geçen en çarpıcı rakam (örn. "108 bin", "1-4"); yoksa boş bırak. vurgu_etiket: bu rakamın ne olduğu, en fazla 6 kelime.',
    '14. gorsel_anahtar: haberi temsil edecek, İNSAN YÜZÜ İÇERMEYEN bir nesne ya da mekân fotoğrafı için 2-4 kelimelik İNGİLİZCE arama ifadesi (örn. "agricultural fair tractors", "hospital corridor"). Kişi adı, marka, logo yazma.',
    '',
    'Kategori: ' + kategori + '.',
    'YANIT: Yalnız tek bir JSON nesnesi döndür; açıklama, kod bloğu ya da başka metin ekleme. Anahtarlar: "baslik" (metin), "spot" (metin), "paragraflar" (metin dizisi), "vurgu_deger" (metin), "vurgu_etiket" (metin), "gorsel_anahtar" (metin).'
  ].join('\n');
}

/* Workers AI modelleri yanıtı farklı biçimlerde verir: eski modeller
   { response }, Chat Completions { choices[].message.content }, Responses
   { output[].content[].text }. Hepsi tek metne indirilir. */
export function yanitMetni(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r.response === 'string') return r.response;
  if (r.response && typeof r.response === 'object') return JSON.stringify(r.response);
  if (typeof r.output_text === 'string') return r.output_text;
  if (Array.isArray(r.choices) && r.choices[0]) {
    const m = r.choices[0].message || {};
    if (typeof m.content === 'string' && m.content) return m.content;
    if (typeof r.choices[0].text === 'string') return r.choices[0].text;
  }
  if (Array.isArray(r.output)) {
    // Akıl yürütme ("reasoning") bölümü atlanır; yalnız mesaj metni alınır.
    const parca = [];
    for (const o of r.output) {
      if (o && o.type === 'reasoning') continue;
      for (const c of (o && o.content) || []) if (typeof c.text === 'string') parca.push(c.text);
    }
    if (parca.length) return parca.join('\n');
  }
  return '';
}

export function jsonAyikla(metin) {
  const t = String(metin || '').replace(/```(?:json)?/gi, '');
  const bas = t.indexOf('{'), son = t.lastIndexOf('}');
  if (bas < 0 || son <= bas) return null;
  try { return JSON.parse(t.slice(bas, son + 1)); } catch { return null; }
}

function temizle(j) {
  // Model sayılarda bölünmez tire (U+2011) kullanıyor; aramada ve kopyalamada
  // sorun çıkarmasın diye düz tireye çevrilir.
  const tek = s => String(s || '').replace(/[\u2010\u2011\u2012]/g, '-').replace(/\s+/g, ' ').trim();
  return {
    baslik: tek(j.baslik).replace(/[.。]+$/, '').slice(0, 200),
    spot: tek(j.spot).slice(0, 400),
    paragraflar: (Array.isArray(j.paragraflar) ? j.paragraflar : String(j.paragraflar || '').split(/\n{2,}/))
      .map(tek).filter(p => p.length > 30).slice(0, 8),
    vurgu: { deger: tek(j.vurgu_deger).slice(0, 14), etiket: tek(j.vurgu_etiket).slice(0, 60) },
    gorselAnahtar: String(j.gorsel_anahtar || '').replace(/[^a-zA-Z ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
  };
}

/* ---------- İddia doğrulaması (Workers AI) ---------- */
/* 6 Ekim: Fenerbahçe haberinde "Ethan Mbappe Real Madrid altyapısında
   başladı" yazdık; kaynakta Real Madrid ağabeyin kulübü, oyuncunun
   altyapısı PSG'ydi. Ad denetimi geçti çünkü ad kaynakta vardı: yanlış olan
   adın kime bağlandığıydı. Deterministik denetimler ilişki hatasını
   göremediği için taslak, ikinci bir model çağrısında kaynağa karşı tek tek
   sınanır. Doğrulayıcı yanıt veremezse haber taslakta kalır: yanlış
   alarm editöre iş çıkarır, yanlış kabul uydurmayı yayına çıkarır. */
export const DOGRULAMA_YONERGESI = [
  'Sen BTMEDYA haber merkezinin doğrulama editörüsün. KAYNAK METİN ile ondan yazılmış TASLAK verilecek.',
  'TASLAK\'taki her olgusal iddiayı kaynağa karşı sına: kişi, kurum, kulüp, yer, tarih, rakam, unvan ve bunların birbirine bağlanışı (kim, neyi, nerede, ne zaman, hangi kuruma/kişiye ait).',
  'Kaynakta açıkça yazmayan ya da kaynakla çelişen her ifadeyi listele. Kaynakta geçen bir adı ya da bilgiyi başka bir kişiye, kuruma veya zamana bağlamak da desteksizdir (örn. kaynakta ağabeyin kulübü olarak geçen takımı oyuncunun altyapısı gibi yazmak).',
  'Yeniden ifade etme, sıralama, özetleme ve üslup sorun değildir; yalnız olgu hatalarını yaz. Emin değilsen listeleme.',
  'YANIT: Yalnız tek bir JSON nesnesi: {"desteksiz":[{"ifade":"taslaktan kısa alıntı","neden":"kaynakta ne yazıyor"}]}. Sorun yoksa {"desteksiz":[]}.'
].join('\n');

export async function iddiaDenetimi(env, model, y, kaynakMetin) {
  const taslak = [y.baslik, y.spot, ...(y.paragraflar || [])].join('\n');
  try {
    const r = await env.AI.run(model, {
      messages: [
        { role: 'system', content: DOGRULAMA_YONERGESI },
        { role: 'user', content: 'KAYNAK METİN:\n' + String(kaynakMetin).slice(0, 9000) + '\n\nTASLAK:\n' + taslak }
      ],
      max_tokens: 4000, temperature: 0
    });
    const j = jsonAyikla(yanitMetni(r));
    if (!j || !Array.isArray(j.desteksiz)) return { gecti: false, desteksiz: [], hata: 'doğrulayıcı geçerli yanıt vermedi' };
    const desteksiz = j.desteksiz
      .map(d => ({ ifade: String((d && d.ifade) || '').trim().slice(0, 160), neden: String((d && d.neden) || '').trim().slice(0, 200) }))
      .filter(d => d.ifade);
    return { gecti: desteksiz.length === 0, desteksiz: desteksiz.slice(0, 8) };
  } catch (e) {
    return { gecti: false, desteksiz: [], hata: 'doğrulayıcı çalışmadı: ' + String(e && e.message || e).slice(0, 120) };
  }
}

/* Yazar, üç denetimden geçirir; geçemezse sorunları modele geri verip bir
   kez daha (en fazla üç deneme) yazdırır. En iyi (en az sorunlu) deneme döner; yayın kararı
   çağırandadır. */
export async function yaz(env, ayar, kaynak, kategori, denemeSayisi = 3) {
  const kaynakMetin = kaynak.metin + '\n' + kaynak.baslik;
  const girdi = [
    'KAYNAK BAŞLIK: ' + kaynak.baslik,
    'KAYNAK TARİH: ' + (kaynak.tarih || 'belirtilmemiş'),
    'KAYNAK METİN:',
    kaynak.metin.slice(0, 9000)
  ].join('\n');
  const mesajlar = [{ role: 'system', content: yonerge(kategori) }, { role: 'user', content: girdi }];
  let enIyi = null, sonHata = null;
  for (let d = 0; d < denemeSayisi; d++) {
    let y;
    try {
      const r = await env.AI.run(ayar.model, { messages: mesajlar, max_tokens: 6000, temperature: 0.4 });
      const j = jsonAyikla(yanitMetni(r));
      if (!j || !j.baslik) throw new Error('Model geçerli JSON döndürmedi');
      y = temizle(j);
    } catch (e) { sonHata = e; continue; }
    const cikti = [y.baslik, y.spot, ...y.paragraflar, y.vurgu.deger].join('\n');
    y.denetim = {
      rakam: rakamDenetimi(cikti, kaynakMetin),
      ad: adDenetimi(cikti, kaynakMetin + '\n' + (kaynak.kaynakAd || '')),
      kalite: kaliteDenetimi(y, kaynakMetin, kaynak.baslik + ' ' + (kaynak.spot || '') + ' ' + (kaynak.paragraflar || []).slice(0, 3).join(' '))
    };
    y.deneme = d + 1;
    const sorun = [
      ...y.denetim.kalite.sorun,
      ...(y.denetim.rakam.gecti ? [] : ['kaynakta bulunmayan sayılar: ' + y.denetim.rakam.eksik.join(', ')]),
      ...(y.denetim.ad.gecti ? [] : ['kaynakta bulunmayan adlar: ' + y.denetim.ad.eksik.join(', ')])
    ];
    // Doğrulayıcı yalnız deterministik denetimden geçen taslağa çalışır:
    // kalan taslak zaten yeniden yazılacak, ikinci çağrı boşa gitmesin.
    if (!sorun.length) {
      y.denetim.iddia = await iddiaDenetimi(env, ayar.model, y, kaynakMetin);
      if (y.denetim.iddia.hata) sorun.push(y.denetim.iddia.hata);
      for (const d of y.denetim.iddia.desteksiz) sorun.push(`kaynakla desteklenmeyen ifade: "${d.ifade}"${d.neden ? ' (' + d.neden + ')' : ''}`);
    }
    y.sorunSayisi = sorun.length;
    if (!enIyi || y.sorunSayisi < enIyi.sorunSayisi) enIyi = y;
    if (!sorun.length) break;
    mesajlar.push(
      { role: 'assistant', content: JSON.stringify({ baslik: y.baslik, spot: y.spot, paragraflar: y.paragraflar }) },
      { role: 'user', content: 'Bu taslak denetimden geçmedi:\n- ' + sorun.join('\n- ') + '\nSorunları düzelterek haberi baştan yaz. Kaynakta olmayan sayı ya da adı çıkar, yerine başka bilgi uydurma. Yalnız JSON döndür.' }
    );
  }
  if (!enIyi) throw sonHata || new Error('Model yanıt vermedi');
  return enIyi;
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
/* Ücretsiz Workers planında bir çağrı en fazla 50 dış istek yapabilir.
   8 kategorinin kaynak sayfaları, Openverse ve görsel indirmeleri tek
   çağrıda bu sınırı aşıyordu (29 Eylül canlı çalıştırma: "Too many
   subrequests"). Bu yüzden iş ikiye bölünür:
   - Ana çağrı: trendler, RSS akışları ve aday listesi (≈18 dış istek).
   - Kategori başına ayrı çağrı (SABAH_YAZICI servis bağlaması, worker.js
     SabahYazici): kaynak sayfa, yazım, denetim, görsel ve kayıt. Her biri
     kendi 50'lik bütçesiyle, hepsi eş zamanlı çalışır.
   Bağlama yoksa (yerel test) aynı iş bu çağrıda yapılır.

   secenek.kuru: yalnız seçim, yazım yok.
   secenek.deneme: yazar ve denetler ama veritabanına, R2'ye ve e-postaya
   dokunmaz; tam metin rapora konur.
   secenek.kategoriler: yalnız bu anahtarlar (panelden tek kategori denemesi). */
const KATEGORI_BASINA_ADAY = 8;

export async function sabahMasasi(env, secenek = {}) {
  const ayar = await sabahAyarlari(env);
  const kuru = secenek.kuru === true;
  const deneme = !kuru && secenek.deneme === true;
  const istenen = Array.isArray(secenek.kategoriler) && secenek.kategoriler.length ? new Set(secenek.kategoriler.map(String)) : new Set(ayar.kategoriler);
  const rapor = { baslangic: new Date().toISOString(), kuru, deneme, ayar, trendler: [], secilen: [], yayinlanan: 0, taslak: 0, hatalar: [] };
  if (!env.DB) { rapor.hatalar.push('D1 yok'); return rapor; }
  if (!ayar.etkin && !secenek.zorla) { rapor.hatalar.push('Sabah Masası kapalı'); return rapor; }

  try { rapor.trendler = await trendleriOku(); } catch (e) { rapor.hatalar.push('Trendler okunamadı: ' + e.message); }
  const agirlik = trendAgirliklari(rapor.trendler);
  const gunlukLimit = Number.isFinite(Number(secenek.maxHaber)) && Number(secenek.maxHaber)>0
    ? Math.min(Number(secenek.maxHaber), ayar.gunlukAzami)
    : ayar.gunlukAzami;
  const kategoriler = KATEGORILER.filter(k => istenen.has(k.anahtar)).slice(0, gunlukLimit);

  // Kaynakları paralel oku; biri düşerse diğerleri devam eder.
  const idler = [...new Set(kategoriler.flatMap(k => k.kaynaklar))];
  const okunan = await Promise.all(idler.map(id => kaynakOku(id).then(x => [id, x]).catch(e => { rapor.hatalar.push(id + ': ' + e.message); return [id, []]; })));
  const havuz = Object.fromEntries(okunan);

  await env.DB.prepare('CREATE TABLE IF NOT EXISTS kaynak_gorulen (link TEXT PRIMARY KEY, created_at TEXT NOT NULL)').run();
  const gorulmus = async link => Boolean(await env.DB.prepare('SELECT 1 FROM kaynak_gorulen WHERE link=? UNION SELECT 1 FROM news WHERE source_url=? LIMIT 1').bind(link, link).first());

  // Son 4 günün başlıkları: aynı konu farklı kaynaktan ikinci kez girmesin.
  const sonBasliklar = ((await env.DB.prepare("SELECT title FROM news WHERE COALESCE(published_at,updated_at) > ?").bind(new Date(Date.now() - 4 * 86400000).toISOString()).all().catch(() => ({ results: [] }))).results || []).map(x => String(x.title || ''));
  const son = sonBasliklar.map(kokler);
  const tekrarMi = baslik => benzerBaslik(baslik, son);

  // 1) Aday listesi: akış başlığı ve tarihine göre süzülür, puanlanır.
  // Aynı bağlantı iki kategoriye birden verilmez.
  const verilen = new Set();
  const isler = [];
  for (const kat of kategoriler) {
    const sirali = kat.kaynaklar.flatMap(id => havuz[id] || [])
      // Akış tarihi bilinen ve 72 saatten eski haber puanlanmadan elenir:
      // trend eşleşmesi eski bir haberi öne çekmesin.
      .filter(o => { const t = Date.parse(o.tarih); return Number.isNaN(t) || Date.now() - t < 72 * 3600000; })
      // Başka kategorinin haberi (ör. gündem akışındaki maç haberi) buraya girmez.
      .filter(o => kat.anahtar === 'spor' || !SPOR_KELIME.test(duz(o.baslik)))
      // Video/canlı yayın sayfalarında haber metni yok.
      .filter(o => !/\b(izle|canli yayin|video)\b/.test(duz(o.baslik)))
      .filter(o => !o.baslik || (!tekrarMi(o.baslik) && !hassasMi(o.baslik)))
      .map(o => ({ ...o, ...puanla(o, agirlik) }))
      // Eşit trend puanında doğrulanabilirliği yüksek kurumsal kaynak öne alınır.
      .sort((a, b) => b.puan - a.puan || (b.kaynakGuven || 0) - (a.kaynakGuven || 0));
    const adaylar = [];
    for (const o of sirali) {
      if (adaylar.length >= KATEGORI_BASINA_ADAY) break;
      if (verilen.has(o.link) || await gorulmus(o.link)) continue;
      verilen.add(o.link);
      adaylar.push(o);
    }
    isler.push({ kat, adaylar, ayar, kuru, deneme, sonBasliklar });
  }

  // 2) Kategoriler eş zamanlı işlenir; her biri ayrı Worker çağrısında.
  const isle = env.SABAH_YAZICI && typeof env.SABAH_YAZICI.kategoriIsle === 'function'
    ? is => env.SABAH_YAZICI.kategoriIsle(is)
    : is => kategoriIsle(env, is);
  const sonuclar = await Promise.all(isler.map(is => Promise.resolve().then(() => isle(is)).catch(e => ({
    secilen: [{ kategori: is.kat.kategori, anahtar: is.kat.anahtar, durum: 'hata', not: String(e && e.message || e).slice(0, 200) }],
    yayinlanan: 0, taslak: 0, hatalar: [is.kat.kategori + ': ' + String(e && e.message || e).slice(0, 200)]
  }))));
  for (const x of sonuclar) {
    rapor.secilen.push(...(x.secilen || []));
    rapor.yayinlanan += x.yayinlanan || 0;
    rapor.taslak += x.taslak || 0;
    rapor.hatalar.push(...(x.hatalar || []));
  }

  rapor.bitis = new Date().toISOString();
  rapor.sosyal = await sosyalAyarlari(env).then(a => ({ otomatikPlanla: a.otomatikPlanla, aglar: a.aglar })).catch(() => null);
  if (!kuru && !deneme) {
    rapor.eposta = await ozetGonder(env, rapor).catch(() => false);
    if (env.KV) await env.KV.put(RAPOR, JSON.stringify(rapor), { expirationTtl: 60 * 86400 }).catch(() => {});
  }
  return rapor;
}

/* Konu tekrarı sözcük köküyle aranır: "hayvancılık/hayvancılığın",
   "ziyaretçi/ziyaretçiyi" tam sözcükle eşleşmiyordu ve 29 Eylül'de tarım
   fuarı haberi CUMHA'dan ikinci kez girdi. İlk 5 harf Türkçe ekleri
   büyük ölçüde atar; sayılar olduğu gibi kalır. */
// Neredeyse her yerel ve yapay zekâ başlığında geçen kökler konu ayırt
// etmez; bunlar sayılırsa "Balıkesir'in en kalabalık pazarı" ile "Balıkesir
// pazarında helva şovu" aynı konu sanılıyordu.
const GENEL_KOK = new Set(['balik', 'yapay', 'zeka']);
export function kokler(s) { return new Set(kelimeler(s).map(k => /^\d+$/.test(k) ? k : k.slice(0, 5)).filter(k => !GENEL_KOK.has(k))); }
export function benzerBaslik(baslik, son) {
  const a = kokler(baslik);
  return a.size > 2 && son.some(b => { if (b.size < 3) return false; let o = 0; for (const k of a) if (b.has(k)) o++; return o / Math.min(a.size, b.size) >= 0.5; });
}

/* Tek kategori: adayların kaynak sayfasını okur, ilk uygun olanı yazar,
   denetler, görsel ekler ve kaydeder. Ayrı Worker çağrısında çalışabilsin
   diye girdisi ve çıktısı düz nesnedir. */
export async function kategoriIsle(env, { kat, adaylar = [], ayar, kuru = false, deneme = false, sonBasliklar = [] }) {
  const sonuc = { secilen: [], yayinlanan: 0, taslak: 0, hatalar: [] };
  const son = sonBasliklar.map(kokler);
  const gorulduYaz = async link => { if (!deneme && !kuru) await env.DB.prepare('INSERT OR IGNORE INTO kaynak_gorulen(link,created_at) VALUES(?,?)').bind(link, new Date().toISOString()).run(); };
  let secildi = null;
  for (const o of adaylar) {
    let kaynak;
    try { kaynak = await metinCek(o.link); } catch (e) { continue; }
    if (kaynak.paragraflar.length < 2 || kaynak.metin.length < 500) continue;
    if (hassasMi(kaynak.baslik + ' ' + kaynak.spot + ' ' + kaynak.metin.slice(0, 1500))) {
      sonuc.secilen.push({ kategori: kat.kategori, anahtar: kat.anahtar, durum: 'hassas-atlandi', kaynakBaslik: kaynak.baslik || o.baslik, kaynak: o.link });
      await gorulduYaz(o.link);
      continue;
    }
    if (tanitimMi(kaynak.baslik + ' ' + kaynak.spot + ' ' + kaynak.metin.slice(0, 1500))) {
      sonuc.secilen.push({ kategori: kat.kategori, anahtar: kat.anahtar, durum: 'tanitim-atlandi', kaynakBaslik: kaynak.baslik || o.baslik, kaynak: o.link });
      await gorulduYaz(o.link);
      continue;
    }
    if (benzerBaslik(kaynak.baslik, son)) continue;
    if (kat.anahtar !== 'spor' && (duz(kaynak.metin.slice(0, 1500)).match(new RegExp(SPOR_KELIME.source, 'g')) || []).length >= 2) continue;
    // Belediye haberlerinde tarih sayfadan gelir; 4 günden eskisi atlanır.
    const t = Date.parse(kaynak.tarih.replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, '$3-$2-$1'));
    if (!Number.isNaN(t) && Date.now() - t > 4 * 86400000) continue;
    secildi = { o, kaynak: { ...kaynak, kaynakAd: o.kaynakAd } };
    break;
  }
  if (!secildi) { sonuc.secilen.push({ kategori: kat.kategori, anahtar: kat.anahtar, durum: 'uygun-kaynak-yok' }); return sonuc; }
  const kayit = {
    kategori: kat.kategori,
    anahtar: kat.anahtar,
    kaynakBaslik: secildi.kaynak.baslik || secildi.o.baslik,
    kaynak: secildi.o.link,
    kaynakId: secildi.o.kaynakId,
    kaynakGuven: secildi.o.kaynakGuven || 0,
    puan: secildi.o.puan,
    trend: secildi.o.eslesen
  };
  sonuc.secilen.push(kayit);
  if (kuru) { kayit.durum = 'kuru-calisma'; return sonuc; }
  await kategoriYaz(env, ayar, { kat, o: secildi.o, kaynak: secildi.kaynak, kayit, son }, deneme, sonuc);
  return sonuc;
}

async function kategoriYaz(env, ayar, { kat, o, kaynak, kayit, son = [] }, deneme, rapor) {
  try {
    if (!env.AI) throw new Error('Workers AI bağlaması (AI) yok');
    const y = await yaz(env, ayar, kaynak, kat.kategori);
    const { rakam: rd, ad, kalite } = y.denetim;
    const iddia = y.denetim.iddia || { gecti: false, desteksiz: [], hata: 'iddia doğrulaması çalışmadı (önceki denetimler geçmedi)' };
    // Kaynak başlığı farklı olsa da yazılan başlık son günlerdeki bir
    // haberle aynı konuyu anlatıyorsa yayına çıkmaz; editör karar verir.
    const tekrarKonu = benzerBaslik(y.baslik, son);
    const denetimTamam = rd.gecti && ad.gecti && kalite.gecti && iddia.gecti && !tekrarKonu;
    const yayinla = ayar.otomatikYayin && denetimTamam;
    const nedenler = [
      !rd.gecti ? 'rakam: ' + rd.eksik.slice(0, 3).join(', ') : '',
      !ad.gecti ? 'özel ad: ' + ad.eksik.slice(0, 3).join(', ') : '',
      !kalite.gecti ? 'kalite: ' + kalite.sorun.slice(0, 2).join('; ') : '',
      !iddia.gecti && rd.gecti && ad.gecti && kalite.gecti ? 'iddia: ' + (iddia.hata || iddia.desteksiz.slice(0, 2).map(d => d.ifade).join('; ')) : '',
      tekrarKonu ? 'tekrar: son 4 günde benzer başlıklı haber var' : ''
    ].filter(Boolean);
    Object.assign(kayit, {
      baslik: y.baslik, spot: y.spot, vurgu: y.vurgu, deneme: y.deneme,
      kalite: { gecti: kalite.gecti, kopya: kalite.kopya },
      not: nedenler.join(' · ')
    });
    if (deneme) {
      Object.assign(kayit, { durum: denetimTamam ? 'deneme-gecti' : 'deneme-kaldi', paragraflar: y.paragraflar, gorselAnahtar: y.gorselAnahtar });
      return;
    }
    let slug = slugUret(y.baslik);
    if (await env.DB.prepare('SELECT 1 FROM news WHERE slug=?').bind(slug).first()) slug += '-' + Date.now().toString(36).slice(-4);
    /* 3 Ekim 2026 kapak denetimi: Openverse anahtar kelime aramasının ilk
       karesi konuyla ilgisiz çıkıyordu (futbol haberine Amerikan futbolu,
       benzin ÖTV'sine Kore'de gaz sayacı, doğum yardımına tanınabilir kişili
       bir dolandırıcılık şeması, sağlık haberine çocukların klinik fotoğrafı).
       Alakası doğrulanmamış fotoğraf kapak olmaz: varsayılan kapak kategori
       grafiğidir, habere özel manşet kapağını günlük editör/süpervizör turu
       tools/haber-kapagi.py ile üretir. Fotoğraf araması yalnız
       SABAH_FOTOGRAF=acik ile, bilerek açılır. */
    const gorsel = env.SABAH_FOTOGRAF === 'acik' ? await gorselBul(env, y.gorselAnahtar, slug).catch(() => null) : null;
    const not = [
      `Bu haber, ${o.kaynakAd} kaynağındaki bilgilerden BTMEDYA Sabah Masası tarafından yapay zekâ desteğiyle derlenmiştir${yayinla ? ' ve otomatik denetimlerden (rakam, özel ad, kaynakla iddia doğrulaması ve dil kalitesi) geçerek yayımlanmıştır; editör denetiminden geçmemiştir' : ''}.`,
      gorsel ? `Kapaktaki görsel ${gorsel.kunye} lisanslıdır ve olayın kendisini göstermez.` : 'Kapak, BTMEDYA kategori grafiğidir; fotoğraf değildir.',
      !rd.gecti ? `Rakam denetimi: kaynakta bulunmayan ${rd.eksik.join(', ')}.` : '',
      !ad.gecti ? `Özel ad denetimi: kaynakta bulunmayan ${ad.eksik.join(', ')}.` : '',
      !kalite.gecti ? `Kalite denetimi: ${kalite.sorun.join('; ')}.` : '',
      !iddia.gecti && rd.gecti && ad.gecti && kalite.gecti ? `İddia doğrulaması: ${iddia.hata || iddia.desteksiz.map(d => '"' + d.ifade + '"' + (d.neden ? ' (' + d.neden + ')' : '')).join('; ')}.` : '',
      tekrarKonu ? 'Tekrar denetimi: son 4 günde benzer başlıklı bir haber yayınlanmış; yayın kararı editörün.' : ''
    ].filter(Boolean).join(' ');
    const govde = [...y.paragraflar, gorsel ? `Görsel: ${gorsel.kunye}.` : ''].filter(Boolean).join('\n\n');
    const simdi = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO news(slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,source_url,original_date,archive_note,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(slug, y.baslik, y.spot, govde, kat.kategori, 'BTMEDYA Sabah Masası', gorsel ? gorsel.url : `/assets/kategori-kapak/${kat.anahtar}.webp`, '', yayinla ? 'published' : 'draft', yayinla ? simdi : null, o.link, kaynak.tarih || null, not, simdi).run();
    await env.DB.prepare('INSERT OR IGNORE INTO kaynak_gorulen(link,created_at) VALUES(?,?)').bind(o.link, simdi).run();
    Object.assign(kayit, { slug, durum: yayinla ? 'yayinlandi' : 'taslak', gorsel: Boolean(gorsel) });
    if (yayinla) rapor.yayinlanan++; else rapor.taslak++;
  } catch (e) {
    kayit.durum = 'hata'; kayit.not = String(e.message || e).slice(0, 200);
    rapor.hatalar.push(kat.kategori + ': ' + kayit.not);
  }
}
