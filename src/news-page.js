/* =====================================================================
 * DINAMIK HABER SAYFASI
 * Panelden girilen haberler depoda dosya olusturmadigi icin adresleri
 * 404 donuyordu. Bu modul D1'deki kaydi ayni tasarimla sayfaya cevirir.
 * Statik dosyasi olan 27 haber degismez: onceligi her zaman dosya alir.
 *
 * AGIRLIK ILKESI
 * - YouTube videosu gomulu oynaticiyla degil, kapak karesi + dugme ile
 *   gosterilir. Ziyaretci tiklayana kadar YouTube'dan tek bayt inmez.
 *   (Gomulu oynatici ~900 KB betik yukler; kapak karesi ~15-40 KB.)
 * - Kapak gorseli lazy yuklenir ve olculeri pesinen yazilir, boylece
 *   sayfa akarken zipla olusmaz.
 * ===================================================================== */

// Kapak karesinin kaynagi (data/haber-kapak-kaynagi.json); kategori
// sayfasindaki etiketlerle ayni.
const KAPAK_TURU = { gercek: 'Gerçek çekim', arsiv: 'Arşiv fotoğrafı', grafik: 'BTMEDYA grafik', harita: 'Harita', temsili: 'Temsili görsel' };
const esc = s => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

/* YouTube kimligini her bicimden cikarir: tam adres, kisa adres, gomme
   adresi, shorts ya da dogrudan kimligin kendisi. */
export function youtubeId(v){
  const s=String(v||'').trim();
  if(!s) return '';
  if(/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m=s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?m[1]:'';
}

const AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function trTarih(iso){
  if(!iso) return '';
  const d=new Date(iso);
  if(isNaN(d)) return String(iso);
  return `${String(d.getUTCDate()).padStart(2,'0')} ${AYLAR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function isoTarih(iso){
  if(!iso) return '';
  const d=new Date(iso);
  return isNaN(d)?String(iso):d.toISOString().slice(0,10);
}
/* Google yayin tarihinde saat ve saat dilimi ister; yoksa kendi saat
   dilimini varsayar ve haber bir gun kayik gorunebilir. Kayitta saat varsa
   (panel "2026-09-25T09:00:00+03:00" yazar) oldugu gibi verilir; yalniz
   gun bilinen arsiv kayitlarina uydurma saat eklenmez. */
function isoTam(iso){
  const s=String(iso||'').trim();
  if(!s) return '';
  return /T\d{2}:\d{2}/.test(s)&&!isNaN(new Date(s))?s:isoTarih(s);
}
/* Arama sonucu snippet'i ~160 karakterde kesilir; kesimi kelime sinirinda
   biz yapariz ki cumle ortasindan bolunmesin. Tam metin og ve JSON-LD'de kalir. */
function temizBaslik(s){
  return String(s||'').replace(/[<>]+$/,'').replace(/\s+/g,' ').trim();
}
function kisaOzet(s, sinir=158){
  const t=String(s||'').replace(/\s+/g,' ').trim();
  if(t.length<=sinir) return t;
  const k=t.slice(0,sinir);
  return k.slice(0,Math.max(k.lastIndexOf(' '),sinir-30)).replace(/[\s,;:.–-]+$/,'')+'…';
}
/* JSON-LD script etiketinin icinde "</script>" gecerse etiket erken kapanir;
   "<" kacislanir, JSON anlami degismez. */
const ldYaz = o => JSON.stringify(o).replace(/</g,'\\u003c');

/* Kapak mobilde de 16:9 kalir: kapaklar basligi ve kunyeyi gorselin
   icinde tasiyan kanal kartlari; 4:3'e kirpmak basligi iki yandan kesiyordu.
   Govde: bos satirla ayrilmis paragraflar. HTML girilmisse oldugu gibi
   birakilmaz; panelden gelen metin her zaman kacisli yazilir. */
function govde(body){
  const t=String(body||'').trim();
  if(!t) return '';
  return t.split(/\n{2,}/).map(p=>`<p>${esc(p.trim()).replace(/\n/g,'<br>')}</p>`).join('');
}

export function renderNewsPage(n, origin, vlib, related=[]){
  const url=`${origin}/haberler/${encodeURIComponent(n.slug)}`;
  const baslik=temizBaslik(n.title);
  // Kutuphane kaydi varsa etkin kimlik oradan gelir: video kendi kanalimiza
  // tasindiginda haber kaydina dokunmadan yonlendirme degisir.
  const kaynakVid=youtubeId(n.video_url);
  const vid=(vlib&&(vlib.own_youtube_id||vlib.youtube_id))||kaynakVid;
  const kanal=vlib?(vlib.own_youtube_id?'BTMEDYA':(vlib.source_channel||'')):'';
  const kapak=n.cover_url || `${origin}/assets/haber-kapak/${encodeURIComponent(n.slug)}.webp`;
  // Sabah Masası özgün tarihi ISO yazıyor; ham görünmesin.
  const tarihTr=(/^\d{4}-\d{2}-\d{2}T/.test(String(n.original_date||''))?trTarih(n.original_date):n.original_date)||trTarih(n.published_at);
  const tarihIso=isoTam(n.published_at);
  const guncelIso=isoTam(n.updated_at)||tarihIso;
  const durumNotu=String(n.archive_note||'');
  const arsiv = /2024|2023|2022/.test(String(n.original_date || '')) ||
    (/arşiv|arsiv|geçmiş|gecmis/i.test(durumNotu) && !/güncel|guncel/i.test(durumNotu));
  const okunma = Math.max(1, Math.ceil(String(n.body || '').trim().split(/\s+/).filter(Boolean).length / 220));
  const ozet=(n.excerpt||'').trim()||String(n.body||'').slice(0,155);
  // maxresdefault her videoda bulunmaz (kaynak dusuk cozunurlukse 404 doner);
  // hqdefault her zaman vardir, paylasim kapagi bos kalmasin.
  // Paylasim kapagi sirasi: haberin kendi kapagi > video kucuk resmi >
  // o haber icin uretilmis plaka > kurumsal jenerik gorsel.
  const plaka = `${origin}/assets/haber-kapak/${n.slug}.webp`;
  const mutlak = (y) => !y ? '' : (/^https?:\/\//.test(y) ? y : origin + (y.startsWith('/') ? y : '/' + y));
  const ogImg = mutlak(kapak) || (vid?`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`:plaka);

  const ld={
    "@context":"https://schema.org","@type":"NewsArticle",
    headline:baslik, description:ozet, url,
    ...(tarihIso?{datePublished:tarihIso,dateModified:guncelIso}:{}),
    author:(n.author&&/buse\s+tuncay/i.test(n.author))?{"@type":"Person",name:n.author,url:`${origin}/portfoy/buse-tuncay/`,sameAs:["https://tr.linkedin.com/in/buse-tuncay-6b217623","https://www.instagram.com/busetuncayy10/","https://www.youtube.com/@BTmedyaAjans"]}:{"@type":"Organization",name:n.author||'BTMEDYA',url:origin,sameAs:["https://www.instagram.com/btmedyajans/","https://www.youtube.com/@BTmedyaAjans","https://www.tiktok.com/@btmedya1010"],logo:{"@type":"ImageObject",url:`${origin}/assets/logo/bt-amblem-256.png`}},
    publisher:{"@type":"Organization",name:"BTMEDYA",url:origin,
      sameAs:["https://www.instagram.com/btmedyajans/","https://www.youtube.com/@BTmedyaAjans","https://www.tiktok.com/@btmedya1010"],
      logo:{"@type":"ImageObject",url:`${origin}/assets/logo/bt-amblem-256.png`}},
    ...(n.category?{articleSection:n.category}:{}),
    ...(ogImg?{image:ogImg}:{}),
    mainEntityOfPage:{"@type":"WebPage","@id":url},
    inLanguage:"tr-TR", wordCount:String(n.body||"").trim().split(/\s+/).filter(Boolean).length
  };
  const relatedHtml = Array.isArray(related) && related.length
    ? '<section class="related-news" aria-labelledby="related-news-title"><h2 id="related-news-title">İlgili haberler</h2><div class="related-news-grid">' +
      related.slice(0,3).map(x => {
        // Kartta, anasayfadaki gibi kapagin metinsiz "-foto" varyanti; kapak
        // yoksa kart yazili kalir (kirik gorsel basilmaz).
        const gorsel = String(x.cover_url || '').replace(/(\/assets\/haber-kapak\/[^/]+)\.webp$/, '$1-foto.webp');
        const tur = KAPAK_TURU[x.kapak_turu] || (/\/kategori-kapak\//.test(gorsel) ? 'BTMEDYA grafik' : 'Temsili görsel');
        const resim = gorsel ? '<figure><img src="' + esc(gorsel) + '" alt="' + esc(x.title || '') + '" loading="lazy" decoding="async" width="640" height="360"><span>' + esc(tur) + '</span></figure>' : '';
        return '<a href="/haberler/' + encodeURIComponent(x.slug || '') + '"' + (resim ? ' class="has-img"' : '') + '>' + resim + '<div><small>' + esc(x.category || 'HABER') + '</small><strong>' + esc(x.title || '') + '</strong></div></a>';
      }).join('') +
      '</div></section>'
    : '';
  const breadcrumbLd={
    "@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"BTMEDYA","item":origin+"/"},
      {"@type":"ListItem","position":2,"name":"Haberler","item":origin+"/haberler/"},
      {"@type":"ListItem","position":3,"name":n.title,"item":url}
    ]
  };

  /* Kapak karesi YouTube'un kendi CDN'inden gelir; oynatici yuklenmez. */
  const videoBlok = vid ? `
<div class="yt-lite" data-yt="${esc(vid)}">
  <img src="https://i.ytimg.com/vi/${esc(vid)}/hqdefault.jpg" alt="${esc(baslik)} — video kapağı" loading="lazy" width="480" height="360">
  <button type="button" class="yt-play" aria-label="Videoyu oynat">▶</button>
  <noscript><a href="https://www.youtube.com/watch?v=${esc(vid)}" target="_blank" rel="noopener">Videoyu YouTube'da izleyin ↗</a></noscript>
</div>
${kanal?`<p class="video-credit">Video ${esc(kanal)} kanalında yayında. <a href="https://www.youtube.com/watch?v=${esc(vid)}" target="_blank" rel="noopener">YouTube'da aç ↗</a></p>`:''}` : '';

  const kapakBlok = kapak ? `
<figure class="article-cover-wrap">
  <img class="article-cover" src="${esc(kapak)}" alt="${esc(baslik)}" loading="eager" decoding="async" width="1200" height="675">
  <figcaption>BTMEDYA · Haber: ${esc(n.author||"BTMEDYA")}</figcaption>
</figure>` : '';

  // Videolu haberler icin VideoObject: Google video aramasinda gorunur olur.
  const videoLd = vid ? {
    "@context":"https://schema.org","@type":"VideoObject",
    name:baslik, description:ozet,
    thumbnailUrl:[`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`],
    ...(tarihIso?{uploadDate:tarihIso}:{}),
    embedUrl:`https://www.youtube-nocookie.com/embed/${vid}`,
    contentUrl:`https://www.youtube.com/watch?v=${vid}`,
    publisher:{"@type":"Organization",name:"BTMEDYA"},
    ...(kanal?{creditText:`${kanal} kanalında yayında`}:{})
  } : null;

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#02070d"/>
<title>${esc(baslik.length>55?baslik:`${baslik} — BTMEDYA Haber`)}</title>
<meta name="description" content="${esc(kisaOzet(ozet))}"/>
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>
<link rel="canonical" href="${esc(url)}"/>
<link rel="alternate" type="text/markdown" href="${esc(url)}.md" title="Markdown (AI ajanları için)"/>
<link rel="alternate" type="application/rss+xml" title="BTMEDYA Haber" href="/rss.xml"/>
<meta property="og:site_name" content="BTMEDYA"/>
<meta property="og:locale" content="tr_TR"/>
<meta property="og:type" content="article"/>
${tarihIso?`<meta property="article:published_time" content="${esc(tarihIso)}"/>
<meta property="article:modified_time" content="${esc(guncelIso)}"/>`:''}
${n.category?`<meta property="article:section" content="${esc(n.category)}"/>`:''}
<meta property="og:title" content="${esc(baslik)}"/>
<meta property="og:description" content="${esc(ozet)}"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:image" content="${esc(ogImg)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="675"/>
<meta property="og:image:alt" content="${esc(baslik)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(baslik)}"/>
<meta name="twitter:description" content="${esc(kisaOzet(ozet))}"/>
<meta name="twitter:image" content="${esc(ogImg)}"/>
<meta name="twitter:image:alt" content="${esc(baslik)}"/>
<meta name="twitter:url" content="${esc(url)}"/>
<link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/bricolage-latin-ext.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="icon" href="/assets/favicon.png" type="image/png"/>
<link rel="manifest" href="/site.webmanifest"/>
<link rel="stylesheet" href="/styles.css"/><style>.teklif-cta{margin:40px 0 8px;padding:20px 22px;border:1px solid #2a2a2a;border-left:3px solid #d9ff3f;background:#0d0d0d}.teklif-cta span{display:block;font-size:11px;letter-spacing:.14em;opacity:.65;margin-bottom:8px}.teklif-cta p{margin:0 0 14px;font-size:16px;line-height:1.5}.teklif-cta a{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;background:#d9ff3f;color:#050505;font-weight:800;text-decoration:none}.article-page{max-width:920px;margin:auto;padding:56px 20px 90px}.article-page h1{font-family:"Bricolage Grotesque","Space Grotesk",sans-serif;font-size:clamp(2.7rem,7vw,6.5rem);line-height:.92;letter-spacing:-.065em;margin:14px 0 22px}.article-eyebrow{color:#ff6d64;font-size:.72rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.article-meta{display:flex;flex-wrap:wrap;gap:12px;color:#8e99a8;font-size:.82rem;margin-bottom:18px}.article-meta span:first-child{color:#dce3ec}.article-lead{font-size:1.18rem;line-height:1.7;color:#c6ced8;border-left:3px solid #ff4038;padding-left:18px;margin:28px 0}.article-cover-wrap{margin:28px 0}.article-cover{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;object-position:50% 26%;border-radius:14px;margin:0}.article-cover-wrap figcaption{color:#7e8b9a;font:11px "Manrope",sans-serif;letter-spacing:.06em;margin-top:9px}.article-body{max-width:760px;margin:34px auto}.article-body p{font-size:1.08rem;line-height:1.85;color:#d1d8e1;margin:0 0 1.3em}.article-tools{display:flex;flex-wrap:wrap;gap:9px;margin:24px 0;border-top:1px solid #ffffff18;border-bottom:1px solid #ffffff18;padding:14px 0}.article-tools a{color:#dfe7ef;text-decoration:none;border:1px solid #ffffff18;padding:8px 11px;border-radius:999px;font-size:.75rem}.archive-badge{display:inline-block;color:#ffb0ab;border:1px solid #ff403833;border-radius:999px;padding:6px 10px;font-size:.68rem;font-weight:800;letter-spacing:.08em}.yt-lite{position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:14px;background:#080b10;margin:28px 0;cursor:pointer}.yt-lite img{width:100%;height:100%;object-fit:cover}.yt-lite:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent,#05070aaa)}.yt-play{position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:50%;border:1px solid #ffffff66;background:#05070acc;color:#fff;font-size:1.35rem}.article-byline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.video-credit{color:#91a2b2;font:12px "Manrope",sans-serif;line-height:1.6;margin:8px 0 18px}.article-body,.article-lead{font-family:"Manrope",sans-serif}.article-body p{font-family:"Manrope",sans-serif}.related-news{margin:44px auto 0;max-width:760px;border-top:1px solid #ffffff18;padding-top:24px}.related-news h2{font:800 .72rem "Manrope",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8e99a8;margin:0 0 12px}.related-news-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.related-news a{display:block;padding:14px;border:1px solid #ffffff12;border-radius:12px;color:#e9eef5;text-decoration:none;background:#ffffff04}.related-news a:hover,.related-news a:focus-visible{border-color:#ffffff30;background:#ffffff08}.related-news small{display:block;color:#ff8179;font:700 .62rem "Manrope",sans-serif;letter-spacing:.1em;text-transform:uppercase;margin-bottom:7px}.related-news strong{display:block;font:700 .88rem/1.3 "Manrope",sans-serif}.related-news a.has-img{padding:0;overflow:hidden;display:flex;flex-direction:column}.related-news a.has-img>div{padding:12px 14px 14px}.related-news figure{position:relative;margin:0;background:#080b10}.related-news figure img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;object-position:50% 62%;transition:transform .5s ease}.related-news figure img[src*="/kategori-kapak/"]{object-position:0 100%}.related-news a.has-img:hover img,.related-news a.has-img:focus-visible img{transform:scale(1.04)}.related-news figure span{position:absolute;left:8px;top:8px;background:#05070acc;color:#dfe7ef;font:700 .58rem "Manrope",sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:4px 7px;border-radius:999px}@media(prefers-reduced-motion:reduce){.related-news figure img{transition:none}}@media(max-width:680px){.related-news-grid{grid-template-columns:1fr}.related-news a{padding:13px}.related-news a.has-img{flex-direction:row;align-items:stretch;padding:0}.related-news a.has-img figure{flex:0 0 42%}.related-news a.has-img figure img{height:100%;min-height:96px}.related-news a.has-img>div{padding:11px 12px;align-self:center}.related-news figure span{left:6px;top:6px;font-size:.5rem;padding:3px 6px}}</style>
<script type="application/ld+json">
${ldYaz(ld)}
</script>
<script type="application/ld+json">
${ldYaz(breadcrumbLd)}
</script>
${videoLd?`<script type="application/ld+json">
${ldYaz(videoLd)}
</script>`:''}
<link rel="stylesheet" href="/mobil-tipografi.css?v=20261005-1">
<link rel="stylesheet" href="/kategori-menu.css?v=20261005-3">
<script src="/kategori-menu.js?v=20261005-3" defer></script>
</head>
<body>
<a class="skip-link" href="#main">İçeriğe geç</a>
<div class="noise" aria-hidden="true"></div>
<header class="topbar">
  <a class="brand" href="/" aria-label="BTMEDYA ana sayfa"><img class="brand-logo" src="/assets/logo/btmedya-logo-baslik.webp" alt="BTMEDYA" width="154" height="37" decoding="async">
  </a>
  <button class="menu-toggle" type="button" aria-label="Menüyü aç" aria-expanded="false" aria-controls="anaMenu">☰</button>
  <a class="quote" href="/haberler/">HABER ARŞİVİ ↗</a>
</header>

<!-- Menü .topbar'ın DIŞINDA: header üzerindeki backdrop-filter, içindeki
     position:fixed öğeler için kuşatan blok oluşturuyor ve menüyü 72px'lik
     şeride hapsediyor. Panelden yayımlanan haberlerde daha önce hiç menü
     yoktu; okuyucu siteye geri dönemiyordu. -->
<nav id="anaMenu" class="site-menu" aria-label="Ana menü">
  <a href="/">Ana Sayfa</a>
  <a href="/#services">Hizmetler</a>
  <a href="/#portfolio">Portföy</a>
  <a href="/#ai-lab">AI LAB</a>
  <a href="/#packages">Paketler</a>
  <a href="/haberler/">Haberler</a>
  <a href="/hakkimizda/">Hakkımızda</a>
  <a href="/iletisim/">İletişim</a>
  <div class="site-menu-alt">
    <a href="tel:+905416401029">+90 541 640 10 29</a>
    <a href="https://wa.me/905416401029?text=Merhaba%20BTMEDYA%2C%20bir%20proje%20i%C3%A7in%20teklif%20almak%20istiyorum." target="_blank" rel="noopener">WhatsApp</a>
    <a href="https://www.instagram.com/btmedyajans/" target="_blank" rel="noopener">Instagram</a>
    <a href="https://www.youtube.com/@BTmedyaAjans" target="_blank" rel="noopener">YouTube</a>
    <a href="https://www.tiktok.com/@btmedya1010" target="_blank" rel="noopener">TikTok</a>
    <span>Balıkesir · Türkiye</span>
  </div>
</nav>
<main id="main" tabindex="-1">
<article class="article-page">
<a class="article-back" href="/haberler/">← HABER ARŞİVİ</a>
${n.category?`<p class="article-eyebrow">${esc(vid?'VİDEO HABER · '+n.category:n.category)}</p>`:''}
<h1>${esc(n.title)}</h1>
<div class="article-byline"><div class="article-meta">  <span>${esc(n.author||'BTMEDYA')}</span>
  ${tarihTr?`<time datetime="${esc(tarihIso)}">${esc(tarihTr)}</time>`:''}
  <span>${okunma} dk okuma</span>
</div>${arsiv?`<span class="archive-badge">ARŞİV · GEÇMİŞ İÇERİK</span>`:''}</div>
${videoBlok}${kapakBlok}
<div class="article-tools"><a href="https://wa.me/?text=${encodeURIComponent(n.title+" "+url)}" target="_blank" rel="noopener">WhatsApp ↗</a><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">Facebook ↗</a><a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(n.title)}" target="_blank" rel="noopener">X ↗</a></div>${ozet?`<p class="article-lead">${esc(ozet)}</p>`:""}<div class="article-body">
${govde(n.body)}
</div>
${(n.archive_note||n.source_url)?`<div class="article-note">${esc(n.archive_note||'')}${
  n.source_url?`<p class="article-source">Kaynak: <a href="${esc(n.source_url)}" target="_blank" rel="noopener nofollow">${esc(n.source_url)}</a></p>`:''
}</div>`:''}
<aside class="teklif-cta" aria-label="BTMEDYA hizmeti"><span>BTMEDYA HİZMETİ · HABERDEN AYRIDIR</span><p>Kurumunuz ya da markanız için haber, röportaj ve kısa video üretiyoruz.</p><a href="/teklif-al/?hizmet=${encodeURIComponent('Haber / röportaj')}&amp;kaynak=${encodeURIComponent('/haberler/'+(n.slug||''))}">Teklif al ↗</a></aside>
${relatedHtml}</article>
</main>
<footer class="final-footer">
  <div class="footer-brand">
    <img class="footer-logo" src="/assets/logo/btmedya-logo-imza.webp" alt="BTMEDYA — Hikâyeleri yaşatıyoruz" width="231" height="55" loading="lazy" decoding="async">
    <div><span>Balıkesir · Haber, prodüksiyon, yapay zekâ</span></div>
  </div>
  <div class="footer-contact"><a href="/iletisim/">İletişim</a><a href="/hakkimizda/">Hakkımızda</a></div>
  <div class="footer-legal">© ${new Date().getUTCFullYear()} BTMEDYA</div>
</footer>
<script>
/* MENU — bu sayfa script.js yuklemiyor; anasayfanin tum davranisini buraya
   tasimak gereksiz agirlik olurdu. Menunun ihtiyaci olan kadari burada. */
(function(){
  var d=document.querySelector('.menu-toggle'), m=document.getElementById('anaMenu');
  if(!d||!m)return;
  function ayarla(acik){
    m.classList.toggle('open',acik);
    d.setAttribute('aria-expanded',acik?'true':'false');
    d.setAttribute('aria-label',acik?'Menüyü kapat':'Menüyü aç');
    document.body.classList.toggle('menu-acik',acik);
  }
  d.addEventListener('click',function(){ ayarla(!m.classList.contains('open')); });
  m.addEventListener('click',function(e){ if(e.target.tagName==='A') ayarla(false); });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&m.classList.contains('open')){ ayarla(false); d.focus(); }
  });
})();

/* Kapak karesine dokununca gercek oynatici gelir; oncesinde YouTube'dan
   hicbir sey inmez. autoplay=1 yalnizca kullanici tikladigi icin verilir. */
document.querySelectorAll('.yt-lite').forEach(function(el){
  el.addEventListener('click',function(){
    var id=el.dataset.yt; if(!id||el.dataset.on)return; el.dataset.on='1';
    var f=document.createElement('iframe');
    f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';
    f.title='Haber videosu';
    f.allow='accelerometer; autoplay; encrypted-media; picture-in-picture';
    f.allowFullscreen=true; f.loading='lazy';
    el.replaceChildren(f);
  });
});
</script>
<script src="/editorial-cover-system.js?v=20261004-1" defer></script>
<script src="/olcum.js?v=20261003-2" defer></script></body>
</html>`;
}
