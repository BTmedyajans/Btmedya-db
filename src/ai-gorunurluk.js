/* BTMEDYA AI görünürlüğü (Answer Engine Optimization).
 *
 * Kaynak: BTmedyajans/btmedya-agent-visibility deposundaki Cloudflare
 * "AI Agent Visibility" şablonu. Şablon aynı içeriği yapay zekâ ajanlarının
 * ve tarayıcıların aradığı her biçimde sunar; burada içerik deposu D1'deki
 * yayındaki haberlerdir:
 *
 *   /llms.txt            llms.txt dizini (statik giriş + son haberler)
 *   /llms-full.txt       tam içerik (statik rehber + son haberlerin metni)
 *   /index.json          tipli JSON dizin
 *   /jsonld              schema.org WebSite + haber listesi
 *   /haberler/<slug>.md      haberin Markdown hâli (alıntı ve dayanak için)
 *   /haberler/<slug>.jsonld  haberin NewsArticle kaydı
 *
 * Şablondan bilinçli farklar:
 * - Şablon özet, anahtar nokta ve konu etiketlerini Workers AI ile üretir.
 *   Haber sitesinde model özeti haberde olmayan bilgi ekleyebilir; burada
 *   özet haberin kendi spotu, anahtar noktalar da paragrafların ilk
 *   cümleleridir. Uydurma riski yok, çıktı her istekte aynıdır.
 * - Yapay zekâ desteğiyle derlenen haberler (Sabah Masası) her yüzeyde
 *   açıkça işaretlenir; kaynak adresi ve arşiv notu korunur.
 * - Veritabanına ulaşılamazsa null döner; public/ altındaki statik
 *   llms.txt / llms-full.txt yedek olarak servis edilir.
 */

// Arama ve yapay zekâ yanıtlarında alıntıya izin, model eğitimine izin yok.
// Değer BTmedyajans/btmedya-agent-visibility wrangler.jsonc CONTENT_SIGNAL.
export const ICERIK_SINYALI = 'ai-input=yes, search=yes, ai-train=no';
const PROTOKOL = 'agent-visibility/0.1';
const SITE_ADI = 'BTMEDYA';
const SITE_ACIKLAMA = "BTMEDYA, Balıkesir merkezli; güncel haber, özgün gazetecilik, medya prodüksiyonu ve yapay zekâ destekli dijital medya üretimi yapan haber ve medya ajansıdır.";
const LLMS_LISTE = 60;
const LLMS_TAM = 30;

const BOLUMLER = [
  ['haberler', '/haberler/', 'Haber arşivi', 'BTMEDYA haberleri; kategori, yazar, yayın tarihi, özgün tarih, kaynak adresi ve arşiv notuyla.'],
  ['kaynak-masasi', '/kaynak-masasi/', 'Kaynak Masası', 'Resmî, katalog, arşiv ve açık lisanslı kaynakların editoryal rehberi; kaynağın yerine geçmez.'],
  ['portfoy', '/portfoy/buse-tuncay/', 'Gazeteci portföyü', 'Buse Tuncay: saha muhabirliği, haber editörlüğü, video ve görsel üretim.'],
  ['hizmetler', '/hizmetler/', 'Hizmetler', 'Video prodüksiyon, sosyal medya içerik üretimi ve yerel haber hizmetleri.'],
  ['hakkimizda', '/hakkimizda/', 'Hakkımızda', 'Kurum ve editoryal geçmiş.'],
  ['iletisim', '/iletisim/', 'İletişim', 'İletişim ve teklif talebi.']
];

const YUZEYLER = new Set(['/llms.txt', '/llms-full.txt', '/index.json', '/jsonld']);
const HABER_YUZEYI = /^\/haberler\/([^/]+)\.(md|jsonld)$/;

export function aiGorunurlukYolu(pathname) {
  return YUZEYLER.has(pathname) || HABER_YUZEYI.test(pathname);
}

/* İstek bu katmana aitse yanıt, değilse ya da veri okunamazsa null döner. */
export async function aiGorunurluk(request, env, url) {
  if (!aiGorunurlukYolu(url.pathname)) return null;
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  if (!env.DB) return null;
  const kok = url.origin;
  try {
    const m = url.pathname.match(HABER_YUZEYI);
    if (m) {
      const slug = decodeURIComponent(m[1]);
      const n = await env.DB.prepare(`SELECT ${ALANLAR} FROM news WHERE slug=? AND status='published'`).bind(slug).first();
      if (!n) return null;
      const k = kayit(n, kok);
      return m[2] === 'md'
        ? yanit(request, haberMd(k, kok), 'text/markdown; charset=utf-8', { link: `<${k.url}>; rel="canonical"` })
        : yanit(request, JSON.stringify(haberLd(k, kok), null, 2), 'application/ld+json; charset=utf-8', { link: `<${k.url}>; rel="canonical"` });
    }
    const liste = await sonHaberler(env, url.pathname === '/llms-full.txt' ? LLMS_TAM : LLMS_LISTE);
    const kayitlar = liste.map(n => kayit(n, kok));
    if (url.pathname === '/index.json') return yanit(request, JSON.stringify(dizin(kayitlar, kok), null, 2), 'application/json; charset=utf-8');
    if (url.pathname === '/jsonld') return yanit(request, JSON.stringify(siteLd(kayitlar, kok), null, 2), 'application/ld+json; charset=utf-8');
    const giris = await statikMetin(env, kok, url.pathname);
    const metin = url.pathname === '/llms.txt' ? llmsTxt(giris, kayitlar, kok) : llmsFull(giris, kayitlar, kok);
    return yanit(request, metin, 'text/plain; charset=utf-8');
  } catch (e) {
    console.error('[ai-gorunurluk]', url.pathname, e?.message || e);
    return null;
  }
}

const ALANLAR = 'slug,title,excerpt,body,category,author,cover_url,published_at,updated_at,source_url,original_date,archive_note';

async function sonHaberler(env, limit) {
  const r = await env.DB.prepare(
    `SELECT ${ALANLAR} FROM news WHERE status='published' ORDER BY COALESCE(published_at,updated_at) DESC LIMIT ?`
  ).bind(limit).all();
  return r.results || [];
}

/* Statik llms dosyası editoryal girişi taşır (içerik modeli, güven ve atıf
   kuralları); tek kaynak orada kalsın diye çalışma anında okunur. */
async function statikMetin(env, kok, yol) {
  if (!env.ASSETS) return '';
  try {
    const r = await env.ASSETS.fetch(new Request(kok + yol));
    return r.ok ? (await r.text()).trim() : '';
  } catch { return ''; }
}

function yanit(request, govde, tur, ek = {}) {
  return new Response(request.method === 'HEAD' ? null : govde, {
    headers: {
      'content-type': tur,
      'cache-control': 'public, max-age=300',
      'content-signal': ICERIK_SINYALI,
      // Makine yüzeyleri arama sonucunda HTML sayfalarla yarışmasın;
      // noindex okumayı engellemez, yalnız dizine eklemeyi.
      'x-robots-tag': 'noindex',
      'x-content-type-options': 'nosniff',
      'access-control-allow-origin': '*',
      ...ek
    }
  });
}

/* ---------- Kayıt ---------- */
function duzMetin(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').trim();
}
function paragraflar(body) {
  return duzMetin(String(body || '').replace(/<\/p>|<br\s*\/?>/gi, '\n\n')).split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
}
function ilkCumle(s) {
  const t = String(s || '').trim();
  const m = t.match(/^.{20,}?[.!?](?=\s+["“'A-ZÇĞİÖŞÜ0-9]|$)/);
  return (m ? m[0] : t).trim();
}
function isoOku(s) {
  const d = new Date(String(s || ''));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
function trTarih(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const tr = new Date(d.getTime() + 3 * 3600000);
  return `${tr.getUTCDate()} ${AYLAR[tr.getUTCMonth()]} ${tr.getUTCFullYear()}`;
}
function mutlak(kok, yol) {
  if (!yol) return '';
  return /^https?:\/\//.test(yol) ? yol : kok + (yol.startsWith('/') ? yol : '/' + yol);
}

export function kayit(n, kok) {
  const para = paragraflar(n.body);
  const ozet = duzMetin(n.excerpt) || (para[0] ? ilkCumle(para[0]) : '');
  const not = String(n.archive_note || '');
  return {
    slug: n.slug,
    url: `${kok}/haberler/${encodeURIComponent(n.slug)}`,
    title: duzMetin(n.title),
    summary: ozet,
    keyPoints: para.slice(0, 3).map(ilkCumle).filter(p => p && p !== ozet),
    topics: [n.category].filter(Boolean),
    category: n.category || null,
    author: n.author || SITE_ADI,
    publishedAt: isoOku(n.published_at),
    updatedAt: isoOku(n.updated_at) || isoOku(n.published_at),
    originalDate: n.original_date || null,
    sourceUrl: n.source_url || null,
    aiAssisted: /yapay zekâ desteğiyle|yapay zeka desteğiyle/i.test(not) || n.author === 'BTMEDYA Sabah Masası',
    archiveNote: not || null,
    image: mutlak(kok, n.cover_url) || `${kok}/assets/haber-kapak/${encodeURIComponent(n.slug)}.webp`,
    paragraphs: para
  };
}

/* ---------- Yüzeyler ---------- */
export function haberMd(k, kok) {
  const s = [];
  s.push(`# ${k.title}`, '');
  const meta = [k.category && `Kategori: ${k.category}`, k.publishedAt && `Yayın: ${trTarih(k.publishedAt)}`, k.author && `Yazar: ${k.author}`].filter(Boolean);
  if (meta.length) s.push(`*${meta.join(' · ')}*`, '');
  if (k.aiAssisted) s.push('> Bu haber yapay zekâ desteğiyle derlenmiştir; ayrıntı aşağıdaki künyede.', '');
  if (k.summary) s.push(k.summary, '');
  if (k.keyPoints.length) { s.push('## Öne çıkanlar', ''); for (const p of k.keyPoints) s.push(`- ${p}`); s.push(''); }
  if (k.paragraphs.length) { s.push('## Haber metni', ''); for (const p of k.paragraphs) s.push(p, ''); }
  s.push('## Kaynak ve künye', '');
  s.push(`- Kanonik adres: ${k.url}`);
  if (k.sourceUrl) s.push(`- Özgün kaynak: ${k.sourceUrl}`);
  if (k.originalDate) s.push(`- Özgün tarih: ${k.originalDate}`);
  if (k.archiveNote) s.push(`- Not: ${k.archiveNote}`);
  s.push(`- Tipli kayıt: ${kok}/index.json`, `- Kullanım sinyali: ${ICERIK_SINYALI}`, '');
  return s.join('\n');
}

export function haberLd(k, kok) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: k.title,
    description: k.summary || undefined,
    abstract: k.keyPoints.length ? k.keyPoints.join(' ') : undefined,
    articleSection: k.category || undefined,
    keywords: k.topics.join(', ') || undefined,
    url: k.url,
    mainEntityOfPage: k.url,
    image: k.image,
    datePublished: k.publishedAt || undefined,
    dateModified: k.updatedAt || undefined,
    inLanguage: 'tr-TR',
    author: { '@type': 'Organization', name: k.author, url: kok },
    publisher: { '@type': 'NewsMediaOrganization', name: SITE_ADI, url: kok, logo: { '@type': 'ImageObject', url: `${kok}/assets/logo/bt-amblem-256.png` } },
    isBasedOn: k.sourceUrl || undefined,
    creditText: k.archiveNote || undefined,
    isPartOf: { '@type': 'WebSite', name: SITE_ADI, url: kok }
  };
}

export function siteLd(kayitlar, kok) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_ADI,
    description: SITE_ACIKLAMA,
    url: kok + '/',
    inLanguage: 'tr-TR',
    publisher: { '@type': 'NewsMediaOrganization', name: SITE_ADI, url: kok },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: kayitlar.map((k, i) => ({ '@type': 'ListItem', position: i + 1, url: k.url, name: k.title }))
    }
  };
}

export function dizin(kayitlar, kok) {
  let son = 0;
  for (const k of kayitlar) { const t = Date.parse(k.updatedAt || ''); if (t > son) son = t; }
  return {
    protocol: PROTOKOL,
    site: { name: SITE_ADI, description: SITE_ACIKLAMA, url: kok + '/', language: 'tr-TR', contentSignal: ICERIK_SINYALI },
    // Duvar saatinden değil son güncellemeden türer: aynı içerik aynı çıktı.
    generatedAt: new Date(son).toISOString(),
    surfaces: {
      llmsTxt: `${kok}/llms.txt`,
      llmsFullTxt: `${kok}/llms-full.txt`,
      json: `${kok}/index.json`,
      jsonld: `${kok}/jsonld`,
      pageMarkdown: `${kok}/haberler/{slug}.md`,
      pageJsonLd: `${kok}/haberler/{slug}.jsonld`,
      robots: `${kok}/robots.txt`,
      rss: `${kok}/rss.xml`,
      newsSitemap: `${kok}/news-sitemap.xml`
    },
    sections: BOLUMLER.map(([slug, yol, baslik, ozet]) => ({ slug, url: kok + yol, title: baslik, summary: ozet })),
    pages: kayitlar.map(k => ({
      slug: k.slug, url: k.url, title: k.title, summary: k.summary, keyPoints: k.keyPoints,
      topics: k.topics, category: k.category, author: k.author,
      publishedAt: k.publishedAt, updatedAt: k.updatedAt, originalDate: k.originalDate,
      aiAssisted: k.aiAssisted, sourceUrl: k.sourceUrl,
      sources: { markdown: `${k.url}.md`, jsonld: `${k.url}.jsonld`, canonical: k.url }
    }))
  };
}

export function llmsTxt(giris, kayitlar, kok) {
  const s = [];
  s.push(giris || `# ${SITE_ADI}\n\n> ${SITE_ACIKLAMA}`, '');
  s.push('## Machine-readable surfaces / Makine yüzeyleri', '');
  s.push(`- [Full content](${kok}/llms-full.txt)`, `- [Typed JSON index](${kok}/index.json)`, `- [JSON-LD](${kok}/jsonld)`, `- Per-story Markdown: ${kok}/haberler/{slug}.md`, `- Content-Signal: ${ICERIK_SINYALI}`, '');
  s.push('## Son haberler', '');
  for (const k of kayitlar) {
    const ek = [k.category, trTarih(k.publishedAt), k.aiAssisted ? 'yapay zekâ destekli' : ''].filter(Boolean).join(' · ');
    s.push(`- [${k.title}](${k.url}.md)${k.summary ? ` — ${ilkCumle(k.summary)}` : ''}${ek ? ` (${ek})` : ''}`);
  }
  s.push('');
  return s.join('\n');
}

export function llmsFull(giris, kayitlar, kok) {
  const s = [];
  s.push(giris || `# ${SITE_ADI}\n\n> ${SITE_ACIKLAMA}`, '', '---', '');
  for (const k of kayitlar) s.push(haberMd(k, kok), '---', '');
  return s.join('\n');
}
