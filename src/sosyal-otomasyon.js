/* BTMEDYA sosyal yayin otomasyonu.
 *
 * Zincir: haber yayinlanir -> cron taslak hazirlar -> (otomatik planlama
 * aciksa) bir sonraki bos saat yuvasina "planlandi" olarak yerlesir ->
 * metricool-scheduler.js Metricool'a teslim eder -> saati gecince panelde
 * "yayinlandi" olur.
 *
 * Ayarlar panelden degisir ve KV'de tutulur; kod degisikligi ve dagitim
 * gerektirmez. Metricool anahtari yoksa otomatik planlama yapilmaz:
 * teslim edilemeyecek bir gonderiyi takvime koymak panelde sahte bir
 * "planlandi" gosterirdi.
 */

const AYAR_ANAHTARI = 'social:ayarlar';
const VARSAYILAN = Object.freeze({
  // 29 Eylül 2026 Metricool Brand denetimi: TikTok yayın bağlantısı doğrulandı; Instagram/Facebook henüz doğrulanmadı.\n  aglar: ['tiktok'],
  otomatikPlanla: true,
  // Metricool'un TikTok verisine gore zirve saatler (Europe/Istanbul).
  saatler: ['10:00', '12:00', '18:00'],
  // Arsiv haberleri otomatik paylasilmasin: yalniz bu kadar saat icinde
  // yayinlanan haberler otomatik planlanir, eskiler onaya duser.
  tazelikSaat: 72
});
const AG_SLUG = { instagram: 'instagram-post', facebook: 'facebook-post', tiktok: 'tiktok' };
// Turkiye 2016'dan beri yaz saati uygulamiyor; UTC+3 sabit.
const TR_OFSET_DK = 180;

export async function ayarlariOku(env) {
  let kayit = {};
  if (env.KV) {
    const ham = await env.KV.get(AYAR_ANAHTARI).catch(() => null);
    if (ham) try { kayit = JSON.parse(ham); } catch {}
  }
  return temizle({ ...VARSAYILAN, ...kayit });
}

export async function ayarlariYaz(env, b) {
  if (!env.KV) throw new Error('KV yapılandırılmadı');
  const yeni = temizle({ ...(await ayarlariOku(env)), ...(b || {}) });
  await env.KV.put(AYAR_ANAHTARI, JSON.stringify(yeni));
  return yeni;
}

function temizle(a) {
  const aglar = [...new Set((Array.isArray(a.aglar) ? a.aglar : []).map(x => String(x).toLowerCase()))]
    .filter(x => AG_SLUG[x]);
  const saatler = [...new Set((Array.isArray(a.saatler) ? a.saatler : [])
    .map(x => String(x).trim()).filter(x => /^([01]\d|2[0-3]):[0-5]\d$/.test(x)))].sort().slice(0, 8);
  const tazelik = Number(a.tazelikSaat);
  return {
    aglar,
    otomatikPlanla: a.otomatikPlanla === true,
    saatler: saatler.length ? saatler : [...VARSAYILAN.saatler],
    tazelikSaat: Number.isFinite(tazelik) && tazelik > 0 ? Math.min(tazelik, 720) : VARSAYILAN.tazelikSaat
  };
}

export function platformSluglari(ayar) {
  return ayar.aglar.map(x => AG_SLUG[x]);
}

/* Bir sonraki bos yuva. Ayni saat dilimine (+-30 dk) planlanmis baska
   gonderi varsa atlanir; boylece gunde en fazla saat sayisi kadar
   paylasim cikar ve akis spam gibi gorunmez. */
export async function sonrakiYuva(env, ayar, simdi = new Date()) {
  const esik = simdi.getTime() + 20 * 60 * 1000;
  const yerelBugun = new Date(simdi.getTime() + TR_OFSET_DK * 60000);
  for (let gun = 0; gun < 30; gun++) {
    for (const saat of ayar.saatler) {
      const [s, d] = saat.split(':').map(Number);
      const t = Date.UTC(yerelBugun.getUTCFullYear(), yerelBugun.getUTCMonth(), yerelBugun.getUTCDate() + gun, s, d) - TR_OFSET_DK * 60000;
      if (t < esik) continue;
      const alt = new Date(t - 30 * 60000).toISOString(), ust = new Date(t + 30 * 60000).toISOString();
      const dolu = await env.DB.prepare(
        "SELECT 1 FROM social_posts WHERE status IN ('planlandi','yayinlandi') AND scheduled_at BETWEEN ? AND ? LIMIT 1"
      ).bind(alt, ust).first().catch(() => null);
      if (!dolu) return new Date(t).toISOString();
    }
  }
  return null;
}

const ETIKETLER = [
  [/(balikesir|altieylul|karesi|bandirma|edremit|ayvalik|burhaniye|gonen|susurluk|dikili|yerel)/, ['#Balıkesir', '#BalıkesirHaber']],
  [/(gundem|asayis|yangin|afet|itfaiye)/, ['#Gündem']],
  [/(ekonomi|emlak|esnaf|tarim|ticaret|fiyat|fuar)/, ['#Ekonomi']],
  [/(kultur|zanaat|sanat|gastronomi|kutuphane)/, ['#Kültür']],
  [/(egitim|universite|okul|lise)/, ['#Eğitim']],
  [/(saglik|beslenme|bakim|hastane)/, ['#Sağlık']],
  [/(spor|boks|judo|triatlon|futbol)/, ['#Spor']],
  [/(yapay zeka|teknoloji|yazilim|dijital|openai|anthropic|claude)/, ['#YapayZekâ', '#Teknoloji']]
];

function duz(s) {
  return String(s || '').toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a').replace(/î/g, 'i');
}

/* Paylasim metni: baslik, spot, haber adresi, gorsel kunyesi ve etiketler.
   Etiketler haberin kategori/baslik metninden turer; elle yazilmaz. */
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function altyazi(n, kunye, simdi = new Date()) {
  const t = duz([n.category, n.title].join(' '));
  const etiket = ['#BTMEDYA'];
  for (const [re, e] of ETIKETLER) if (re.test(t)) etiket.push(...e);
  // 30 gunden eski haber bugun olmus gibi paylasilmasin: tarih acikca yazilir.
  const yayin = new Date(n.published_at || '');
  const arsiv = !Number.isNaN(yayin.getTime()) && simdi - yayin > 30 * 86400000
    ? `📌 Arşiv haberi · ${AYLAR[yayin.getUTCMonth()]} ${yayin.getUTCFullYear()}` : '';
  const parca = [
    String(n.title || '').trim(),
    arsiv,
    String(n.excerpt || '').replace(/\s+/g, ' ').trim(),
    `Haberin tamamı: btmedya.com.tr/haberler/${n.slug}`
  ];
  if (kunye) parca.push(`Görsel: ${kunye}`);
  parca.push([...new Set(etiket)].join(' '));
  return parca.filter(Boolean).join('\n\n').slice(0, 2200);
}

async function varlikJson(env, yol) {
  if (!env.ASSETS) return null;
  try {
    const r = await env.ASSETS.fetch(new Request('https://btmedya.internal' + yol));
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export async function varlikVar(env, yol) {
  if (!env.ASSETS) return false;
  try {
    const r = await env.ASSETS.fetch(new Request('https://btmedya.internal' + yol, { method: 'HEAD' }));
    return r.ok;
  } catch { return false; }
}

/* Temsili fotograflarda CC lisansi atif ister; kart gorselinde basili ama
   metinde de yer alsin (paylasimda gorsel kirpilabilir). */
export async function kapakKunyesi(env, slug) {
  const k = await varlikJson(env, '/data/kapak-foto-kaynaklari.json');
  const t = k && k[slug];
  if (!t) return '';
  const tur = { arsiv: 'arşiv fotoğrafı', harita: 'harita' }[t.rozet] || 'temsili fotoğraf';
  const lisans = t.lisans === 'cc0' ? 'CC0' : t.lisans === 'pdm' ? 'kamu malı' : `CC ${String(t.lisans || '').toUpperCase()} ${t.lisans_surum || ''}`.trim();
  return `${tur} — ${t.yazar || 'anonim'} / ${t.kaynak || 'Wikimedia Commons'}, ${lisans}`;
}

/* Kart gorselinin kaynagi. Sosyal kart ve haber kapagi ayni haberin
   karesinden uretilir; tur haber-kapak-kaynagi.json'da. Instagram ve
   TikTok'a yanlis "AI uretimi" beyani gitmesin diye medya kasasi disindaki
   statik gorseller buradan okunur. */
export async function statikGorselAiMi(env, key) {
  const m = String(key || '').match(/^static\/(?:sosyal-kart|haber-kapak)\/(.+?)(?:-foto)?\.(?:jpg|webp)$/);
  if (!m) return null;
  const k = await varlikJson(env, '/data/haber-kapak-kaynagi.json');
  if (!k || !(m[1] in k)) return null;
  return k[m[1]] === 'ai';
}

/* Metricool'a teslim edilmis ve saati gecmis gonderiler "yayinlandi" olur.
   Yayini Metricool yapar; bu durum "Metricool'a teslim edildi ve saati
   geldi" anlamina gelir. Metricool tarafinda sonradan dusen gonderi
   Metricool planlayicisinda gorunur. */
export async function yayinlananlariIsaretle(env) {
  if (!env.DB) return 0;
  const once = new Date(Date.now() - 10 * 60000).toISOString();
  const r = await env.DB.prepare(
    `UPDATE social_posts SET status='yayinlandi', updated_at=?
      WHERE status='planlandi' AND scheduled_at IS NOT NULL AND scheduled_at < ?
        AND id IN (SELECT post_id FROM metricool_gonderim WHERE durum='planlandi')`
  ).bind(new Date().toISOString(), once).run().catch(() => null);
  return Number(r?.meta?.changes || 0);
}

/* Anahtar varken saati kacmis ve teslim edilmemis "planlandi" gonderiler
   (ornegin anahtar sonradan eklendiyse) bir sonraki bos yuvaya kayar. */
export async function gecikenleriKaydir(env, ayar, limit = 5) {
  if (!env.DB || !env.METRICOOL_USER_TOKEN) return 0;
  const simdi = new Date().toISOString();
  const rows = (await env.DB.prepare(
    `SELECT p.id FROM social_posts p LEFT JOIN metricool_gonderim g ON g.post_id=p.id
      WHERE p.status='planlandi' AND (p.scheduled_at IS NULL OR p.scheduled_at < ?)
        AND (g.post_id IS NULL OR (g.durum='hata' AND COALESCE(g.retryable,1)=1 AND COALESCE(g.attempts,0)<5))
      ORDER BY p.scheduled_at LIMIT ?`
  ).bind(simdi, limit).all().catch(() => ({ results: [] }))).results || [];
  let n = 0;
  for (const r of rows) {
    const yuva = await sonrakiYuva(env, ayar);
    if (!yuva) break;
    await env.DB.prepare('UPDATE social_posts SET scheduled_at=?, updated_at=? WHERE id=?').bind(yuva, simdi, r.id).run();
    n++;
  }
  return n;
}
