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

/* Govde: bos satirla ayrilmis paragraflar. HTML girilmisse oldugu gibi
   birakilmaz; panelden gelen metin her zaman kacisli yazilir. */
function govde(body){
  const t=String(body||'').trim();
  if(!t) return '';
  return t.split(/\n{2,}/).map(p=>`<p>${esc(p.trim()).replace(/\n/g,'<br>')}</p>`).join('');
}

export function renderNewsPage(n, origin, vlib){
  const url=`${origin}/haberler/${encodeURIComponent(n.slug)}`;
  // Kutuphane kaydi varsa etkin kimlik oradan gelir: video kendi kanalimiza
  // tasindiginda haber kaydina dokunmadan yonlendirme degisir.
  const kaynakVid=youtubeId(n.video_url);
  const vid=(vlib&&(vlib.own_youtube_id||vlib.youtube_id))||kaynakVid;
  const kanal=vlib?(vlib.own_youtube_id?'BTMEDYA':(vlib.source_channel||'')):'';
  const kapak=n.cover_url || `${origin}/assets/haber-kapak/${encodeURIComponent(n.slug)}.webp`;
  const tarihTr=n.original_date||trTarih(n.published_at);
  const tarihIso=isoTarih(n.published_at);
  const arsiv = !!n.archive_note || /2024|2023|2022/.test(String(n.original_date || ''));
  const okunma = Math.max(1, Math.ceil(String(n.body || '').trim().split(/\\s+/).filter(Boolean).length / 220));
  const ozet=(n.excerpt||'').trim()||String(n.body||'').slice(0,155);
  // maxresdefault her videoda bulunmaz (kaynak dusuk cozunurlukse 404 doner);
  // hqdefault her zaman vardir, paylasim kapagi bos kalmasin.
  // Paylasim kapagi sirasi: haberin kendi kapagi > video kucuk resmi >
  // o haber icin uretilmis plaka > kurumsal jenerik gorsel.
  const plaka = `${origin}/assets/haber-kapak/${n.slug}.webp`;
  const ogImg = kapak || (vid?`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`:plaka);

  const ld={
    "@context":"https://schema.org","@type":"NewsArticle",
    headline:n.title, description:ozet, url,
    ...(tarihIso?{datePublished:tarihIso,dateModified:isoTarih(n.updated_at)||tarihIso}:{}),
    author:{"@type":"Person",name:n.author||'BTMEDYA'},
    publisher:{"@type":"Organization",name:"BTMEDYA",
      logo:{"@type":"ImageObject",url:`${origin}/assets/btmedya-emblem-derived.png`}},
    ...(n.category?{articleSection:n.category}:{}),
    ...(ogImg?{image:ogImg}:{}),
    mainEntityOfPage:{"@type":"WebPage","@id":url},
    inLanguage:"tr-TR", wordCount:String(n.body||"").trim().split(/\\s+/).filter(Boolean).length
  };

  /* Kapak karesi YouTube'un kendi CDN'inden gelir; oynatici yuklenmez. */
  const videoBlok = vid ? `
<div class="yt-lite" data-yt="${esc(vid)}">
  <img src="https://i.ytimg.com/vi/${esc(vid)}/hqdefault.jpg" alt="${esc(n.title)} — video kapağı" loading="lazy" width="480" height="360">
  <button type="button" class="yt-play" aria-label="Videoyu oynat">▶</button>
  <noscript><a href="https://www.youtube.com/watch?v=${esc(vid)}" target="_blank" rel="noopener">Videoyu YouTube'da izleyin ↗</a></noscript>
</div>
${kanal?`<p class="video-credit">Video ${esc(kanal)} kanalında yayında. <a href="https://www.youtube.com/watch?v=${esc(vid)}" target="_blank" rel="noopener">YouTube'da aç ↗</a></p>`:''}` : '';

  const kapakBlok = kapak ? `
<img class="article-cover" src="${esc(kapak)}" alt="${esc(n.title)}" loading="lazy" decoding="async">` : '';

  // Videolu haberler icin VideoObject: Google video aramasinda gorunur olur.
  const videoLd = vid ? {
    "@context":"https://schema.org","@type":"VideoObject",
    name:n.title, description:ozet,
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
<title>${esc(n.title)} — BTMEDYA Haber</title>
<meta name="description" content="${esc(ozet)}"/>
<link rel="canonical" href="${esc(url)}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(n.title)}"/>
<meta property="og:description" content="${esc(ozet)}"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:image" content="${esc(ogImg)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="icon" href="/assets/favicon.png" type="image/png"/>
<link rel="manifest" href="/site.webmanifest"/>
<link rel="stylesheet" href="/styles.css"/><style>.article-page{max-width:920px;margin:auto;padding:56px 20px 90px}.article-page h1{font-family:"Space Grotesk",sans-serif;font-size:clamp(2.7rem,7vw,6.5rem);line-height:.92;letter-spacing:-.065em;margin:14px 0 22px}.article-eyebrow{color:#ff6d64;font-size:.72rem;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.article-meta{display:flex;flex-wrap:wrap;gap:12px;color:#8e99a8;font-size:.82rem;margin-bottom:18px}.article-meta span:first-child{color:#dce3ec}.article-lead{font-size:1.18rem;line-height:1.7;color:#c6ced8;border-left:3px solid #ff4038;padding-left:18px;margin:28px 0}.article-cover{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:14px;margin:28px 0}.article-body{max-width:760px;margin:34px auto}.article-body p{font-size:1.08rem;line-height:1.85;color:#d1d8e1;margin:0 0 1.3em}.article-tools{display:flex;flex-wrap:wrap;gap:9px;margin:24px 0;border-top:1px solid #ffffff18;border-bottom:1px solid #ffffff18;padding:14px 0}.article-tools a{color:#dfe7ef;text-decoration:none;border:1px solid #ffffff18;padding:8px 11px;border-radius:999px;font-size:.75rem}.archive-badge{display:inline-block;color:#ffb0ab;border:1px solid #ff403833;border-radius:999px;padding:6px 10px;font-size:.68rem;font-weight:800;letter-spacing:.08em}.yt-lite{position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:14px;background:#080b10;margin:28px 0;cursor:pointer}.yt-lite img{width:100%;height:100%;object-fit:cover}.yt-lite:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent,#05070aaa)}.yt-play{position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:50%;border:1px solid #ffffff66;background:#05070acc;color:#fff;font-size:1.35rem}.article-byline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}</style>
<script type="application/ld+json">
${JSON.stringify(ld,null,0)}
</script>
${videoLd?`<script type="application/ld+json">
${JSON.stringify(videoLd,null,0)}
</script>`:''}
</head>
<body>
<a class="skip-link" href="#main">İçeriğe geç</a>
<div class="noise" aria-hidden="true"></div>
<header class="topbar">
  <a class="brand" href="/" aria-label="BTMEDYA ana sayfa">
    <img src="/assets/btmedya-emblem-derived.png" alt="BTMEDYA" class="brand-emblem">
    <span class="brand-mark">BT</span><span class="brand-word">MEDYA</span>
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
    <a href="https://www.instagram.com/btmedya10/" target="_blank" rel="noopener">Instagram</a>
    <a href="https://www.youtube.com/@BTmedyaAjans" target="_blank" rel="noopener">YouTube</a>
    <a href="https://www.tiktok.com/@btmedya1010" target="_blank" rel="noopener">TikTok</a>
    <span>Balıkesir · Türkiye</span>
  </div>
</nav>
<main id="main" tabindex="-1">
<article class="article-page">
<a class="article-back" href="/haberler/">← HABER ARŞİVİ</a>
${n.category?`<p class="article-eyebrow">${esc(n.category)}</p>`:''}
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
</article>
</main>
<footer class="final-footer">
  <div class="footer-brand">
    <img src="/assets/btmedya-emblem-derived.png" alt="">
    <div><strong>BTMEDYA</strong><span>Balıkesir · Haber, prodüksiyon, yapay zekâ</span></div>
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
</body>
</html>`;
}
