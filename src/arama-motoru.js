/* BTMEDYA arama motoru bildirim katmanı (10 Ekim, kullanıcı isteği:
 * "eklediğimiz işlemleri aynı anda arama motorlarında da yapacak bir denetim
 * sistemi kur").
 *
 * NEDEN
 * IndexNow yayımlanan bir adresi Bing, Yandex, Seznam, Naver gibi protokolü
 * kullanan arama motorlarına anında bildirir (tek POST hepsine dağıtılır).
 * Önceden yalnız admin panelinden yayımlanan haberler bildiriliyordu; Sabah
 * Masası ve Autopilot D1'e doğrudan INSERT ettiği için otomatik yayınlanan
 * haberler bildirilmiyordu. Bu modül hem admin hem otomasyon tarafından
 * kullanılan tek bildirim yoludur (tekrar/kopya yok).
 *
 * Google IndexNow kullanmaz; Google için dinamik site haritası
 * (/sitemap.xml, /news-sitemap.xml) ve Search Console geçerlidir — bu
 * depoda zaten dinamik üretiliyor ve GSC workflow'u ile denetleniyor.
 *
 * Anahtar kamuya açıktır (protokol gereği /{anahtar}.txt olarak yayında);
 * gizli değil, alan adının sahipliğini kanıtlar. Bildirim başarısız olursa
 * yayın etkilenmez.
 */
export const INDEXNOW_ANAHTAR = '57fb863171638cffa9cdfb3913627b57';
const INDEXNOW_UC = 'https://api.indexnow.org/indexnow';

/* slug listesinden haber adreslerini IndexNow'a toplu bildirir.
 * ctx: Worker yürütme bağlamı (waitUntil); yoksa fetch await edilmeden döner.
 * origin: yayın kaynağı; yalnız production (btmedya.com.tr) bildirir.
 * slugs: tekil string ya da string dizisi. */
export function aramaMotoruBildir(ctx, origin, slugs) {
  const liste = (Array.isArray(slugs) ? slugs : [slugs]).filter(Boolean);
  if (!liste.length) return;
  let host;
  try { host = new URL(origin).host; } catch { return; }
  if (host !== 'btmedya.com.tr') return; // yerel/önizleme ortamından bildirim gitmesin
  // IndexNow tek istekte 10000 adrese izin verir; otomasyon turu birkaç
  // haber üretir, tek POST yeterli.
  const urlList = liste.slice(0, 10000).map(s => `https://${host}/haberler/${encodeURIComponent(s)}`);
  const istek = fetch(INDEXNOW_UC, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: INDEXNOW_ANAHTAR, keyLocation: `https://${host}/${INDEXNOW_ANAHTAR}.txt`, urlList }),
    signal: AbortSignal.timeout(5000),
  }).then(r => { if (!r.ok && r.status !== 202) console.error('[indexnow]', r.status, urlList.length, 'adres'); })
    .catch(e => console.error('[indexnow]', e?.message || e));
  if (ctx?.waitUntil) ctx.waitUntil(istek);
  return istek;
}
