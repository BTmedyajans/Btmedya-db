/* PANEL -> SITE BAGLANTISI
   Yonetim panelindeki "Site Durumu" ekraninda bir yuvaya atanan dosya
   anasayfada burada devreye girer. Once panel ve site birbirinden
   habersizdi: "Bu yere bagla" dugmesi canli sitede hicbir seyi
   degistirmiyordu. Tek istek, sayfanin geri kalanini bekletmez; basarisiz
   olursa bos nesne doner ve sayfa kendi varsayilanlariyla kalir. */
window.btYuvalar = fetch('/api/public/slots', {headers:{accept:'application/json'}})
  .then(r => r.ok ? r.json() : {})
  .then(j => (j && j.yuvalar) || {})
  .catch(() => ({}));

(() => {
  const d = document;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = window.matchMedia('(hover:hover)').matches;

  const menu = d.getElementById('siteMenu');
  const toggle = d.getElementById('menuToggle');
  const close = d.getElementById('menuClose');
  let menuPreviousFocus = null;
  const setMenu = (open) => {
    if (!menu || !toggle) return;
    if (open) menuPreviousFocus = d.activeElement;
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    menu.inert = !open;
    const main = d.querySelector('main');
    const footer = d.querySelector('footer');
    if (main) main.inert = open;
    if (footer) footer.inert = open;
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    d.body.classList.toggle('menu-open', open);
    if (open) {
      requestAnimationFrame(() => (close || menu.querySelector('a'))?.focus());
    } else if (menuPreviousFocus && typeof menuPreviousFocus.focus === 'function') {
      menuPreviousFocus.focus();
      menuPreviousFocus = null;
    }
  };
  toggle?.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  close?.addEventListener('click', () => setMenu(false));
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  d.addEventListener('keydown', e => {
    if (!menu?.classList.contains('open')) return;
    if (e.key === 'Escape') setMenu(false);
    if (e.key !== 'Tab') return;
    const focusable = [...menu.querySelectorAll('a,button')].filter(el => !el.hasAttribute('disabled'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  if (!reduced) {
    if (hover) d.body.classList.add('parallax-ready');
    /* ---------- PORTFÖY: YouTube kanalındaki gerçek işler ----------
     Veri public/data/youtube-portfoy.json dosyasından okunur; izlenme ve
     süre kanaldan alınmış sabit değerlerdir, uydurma yoktur. Önizleme
     yalnızca tıklamayla açılır: sayfa açılışında 14 iframe yüklemek hem
     mobil veriyi hem de ilk boyama süresini gereksiz yere harcar. */
  const sayi = n => Number(n || 0).toLocaleString('tr-TR');

  const portfoyKarti = (x) => {
    const b = esc(x.baslik || '');
    return '<article class="portfoy-kart" data-kategori="' + esc(x.kategori || '') + '">' +
      '<button class="portfoy-oynat" type="button" data-video="' + esc(x.id || '') + '"' +
      ' aria-label="' + b + ' — önizlemeyi oynat">' +
      '<img class="portfoy-kapak" loading="lazy" decoding="async" src="' + esc(x.kapak || '') + '" alt="' + b + '">' +
      '<span class="portfoy-rozet" aria-hidden="true"></span>' +
      '<span class="portfoy-sure">' + esc(x.sure || '') + '</span></button>' +
      '<div class="portfoy-metin"><h3>' + b + '</h3>' +
      '<p>' + sayi(x.izlenme) + ' izlenme · ' + esc(String(x.tarih || '').slice(0, 4)) + '</p>' +
      '<a href="https://www.youtube.com/watch?v=' + encodeURIComponent(x.id || '') + '"' +
      ' target="_blank" rel="noopener">YouTube’da aç ↗</a></div></article>';
  };

  const loadPortfoy = async () => {
    const grid = d.getElementById('portfoyGrid');
    if (!grid) return;
    const filtre = d.getElementById('portfoyFiltre');
    const kanalKutu = d.getElementById('portfoyKanal');
    let veri;
    try {
      const r = await fetch('/data/youtube-portfoy.json', {headers:{accept:'application/json'}});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      veri = await r.json();
    } catch (err) {
      grid.innerHTML = '<div class="portfoy-bos">Portföy şu anda okunamadı. Kanal yine açık: ' +
        '<a href="https://www.youtube.com/@BTmedyaAjans" target="_blank" rel="noopener">YouTube ↗</a></div>';
      return;
    }
    const isler = Array.isArray(veri.isler) ? veri.isler : [];
    if (!isler.length) { grid.innerHTML = '<div class="portfoy-bos">Portföy kaydı yok.</div>'; return; }

    const k = veri.kanal || {};
    if (kanalKutu && k.ad) {
      kanalKutu.innerHTML =
        '<span><b>' + sayi(k.abone) + '</b>abone</span>' +
        '<span><b>' + sayi(k.izlenme) + '</b>toplam izlenme</span>' +
        '<span><b>' + sayi(k.video) + '</b>video</span>' +
        '<span class="portfoy-kanal-ad">' + esc(k.ad) + ' · YouTube</span>';
    }

    grid.innerHTML = isler.map(portfoyKarti).join('');
    grid.setAttribute('aria-busy','false');

    if (filtre) {
      const kategoriler = [{ad:'', etiket:'TÜMÜ'}].concat(
        (veri.kategoriler || []).filter(c => isler.some(x => x.kategori === c.ad)));
      filtre.innerHTML = kategoriler.map((c, i) =>
        // Sekme degil filtre: tabpanel yok, ayni izgarayi daraltiyor. Bu yuzden
        // role="tab" yerine basili/basili degil durumu bildiren dugme.
        '<button class="portfoy-sekme' + (i === 0 ? ' secili' : '') + '" type="button"' +
        ' aria-pressed="' + (i === 0) + '" data-kategori="' + esc(c.ad) + '">' + esc(c.etiket) + '</button>'
      ).join('');
      filtre.addEventListener('click', e => {
        const b = e.target.closest('.portfoy-sekme');
        if (!b) return;
        const sec = b.dataset.kategori || '';
        filtre.querySelectorAll('.portfoy-sekme').forEach(x => {
          const aktif = x === b;
          x.classList.toggle('secili', aktif);
          x.setAttribute('aria-pressed', String(aktif));
        });
        grid.querySelectorAll('.portfoy-kart').forEach(kart => {
          kart.hidden = !!sec && kart.dataset.kategori !== sec;
        });
      });
    }

    /* Tıklanan kartın kapağı yerine gömülü oynatıcı gelir. Kart başına en
       fazla bir iframe açılır; youtube-nocookie CSP'de zaten izinli. */
    grid.addEventListener('click', e => {
      const b = e.target.closest('.portfoy-oynat');
      if (!b) return;
      const id = b.dataset.video;
      if (!id) return;
      const cerceve = d.createElement('iframe');
      cerceve.className = 'portfoy-cerceve';
      cerceve.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
        '?autoplay=1&rel=0&modestbranding=1';
      cerceve.title = b.getAttribute('aria-label') || 'BTMEDYA portföy videosu';
      cerceve.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      cerceve.setAttribute('allowfullscreen', '');
      cerceve.loading = 'lazy';
      b.replaceWith(cerceve);
    });
  };
  loadPortfoy();

  const hero = d.querySelector('.hero');
    let raf = 0;
    let tx = 0, ty = 0, x = 0, y = 0;
    d.addEventListener('pointermove', e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = (e.clientX / window.innerWidth - .5) * 2;
      ty = (e.clientY / window.innerHeight - .5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        x += (tx - x) * .18;
        y += (ty - y) * .18;
        d.querySelectorAll('[data-parallax]').forEach(el => {
          const depth = Number(el.dataset.parallax || 0);
          el.style.transform = `translate3d(${x * depth * 38}px,${y * depth * 24}px,0)`;
        });
        if (hero) hero.style.setProperty('--mx', x.toFixed(3));
        if (hero) hero.style.setProperty('--my', y.toFixed(3));
      });
    }, {passive:true});
  }

  /* Hero videolari hero motoruna aittir (sahneye gore ya da hic yuklenir);
     burada yuklenirse ust uste duran dort video sahneden bagimsiz hepsi
     birden iner (masaustunde ~14 MB, mobilde panel atamasiyla ~13 MB). */
  const lazy = [...d.querySelectorAll('video[data-src]')].filter(v => !v.closest('.cinematic-hero'));
  const loadVideo = v => {
    if (v.dataset.loaded) return;
    v.src = v.dataset.src;
    v.dataset.loaded = '1';
    v.load();
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const v = en.target;
        if (en.isIntersecting) {
          loadVideo(v);
          if (!reduced) v.play().catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, {rootMargin:'220px 0px'});
    lazy.forEach(v => io.observe(v));
  } else lazy.forEach(loadVideo);

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  /* NFD: "Zekâ" ve "İ" gibi isaretli harfler de duz harfe iner; yoksa filtre "yapay zeka" ile eslesmez. */
  const norm = s => String(s || '').toLowerCase().replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  /* Filtre dugmeleri veriden degil bu sabit listeden gelir: panelde
     "Ekonomi · Emlak", "Gündem · Yangın" gibi alt basliklar serbest
     yaziliyor ve veriden turetilen dugmeler ayni konuyu uc dugmeye
     boluyordu. Her ana baslik kendi alt basliklarini da yakalar. */
  // Tek siniflandirma kurali: BTMEDYA_RELEVANCE (dosyanin sonunda tanimli,
  // sayfa yuklenirken esit zamanli calisir; haberler geldiginde hazirdir).
  const sinif = n => (window.BTMEDYA_RELEVANCE ? window.BTMEDYA_RELEVANCE.category(n) : 'diger');
  const catMatch = (n, wanted) => wanted === 'all' || sinif(n) === wanted;

  const staticReference = {
    'balikesir-in-en-kalabalik-pazari':'https://gazetemerhaba.com/balikesirin-en-kalabalik-pazari',
    'balikesir-in-son-kalaycisi-ilyas-baykal':'https://gazetemerhaba.com/balikesirin-son-kalaycisi-ilyas-baykal',
    'balikesir-pazarinda-canli-helva-sovu':'https://gazetemerhaba.com/balikesir-pazarinda-canli-helva-sovu',
    'beydonoglu-yaprak-satarken-festival-yonetiyor':'https://gazetemerhaba.com/beydonoglu-yaprak-satarken-festival-yonetiyor'
  };

  const newsGrid = d.getElementById('newsGrid');
  const filterBar = d.getElementById('newsFilter');
  let allNews = [];
  /* Kapak karesinin kaynagi (gercek cekim / AI uretimi). Uretici
     tools/haber-kapagi.py bu dosyayi kapak havuzundan turetir; rozet
     kodda sabit durmadigi icin kare degisince etiket de degisir. */
  let kapakKaynagi = {};

  /* Sabah Masasi kaynak tarihini ISO olarak yaziyor ("2026-09-28T13:00:00+03:00");
     kartta ham gorunuyordu. ISO olan tarih okunur bicime cevrilir, elle
     yazilmis tarih ("27 Eylul 2026") oldugu gibi kalir. */
  const tarihOku = s => {
    const t = String(s || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}/.test(t)) return t;
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? t : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
  };
  const dateText = item => tarihOku(item.original_date) || (item.published_at ? tarihOku(item.published_at) : '');
  /* Kapak kurali haber detay sayfasiyla ayni olmali (src/news-page.js:57).
     Haberlerin cogunda cover_url bos ama kapak gorseli
     /assets/haber-kapak/<slug>.webp olarak zaten depoda duruyor; slug'dan
     turetmezsek 27 gercek kapak hic kullanilmaz ve kart "KAPAK BEKLIYOR"
     kutusunda kalir. */
  const kapakYolu = n => n.cover_url || (n.slug ? '/assets/haber-kapak/' + encodeURIComponent(n.slug) + '.webp' : '');
  /* Haber kapaginin metinsiz kart varyanti. Uretici her kapagin yaninda
     bir de "-foto" dosyasi biraktigi icin yol turetmek yeterli. */
  const kartGorseli = (yol) => String(yol || '').replace(/(\/assets\/haber-kapak\/[^/]+)\.webp$/, '$1-foto.webp');
  const cardMedia = (n, featured = false) => {
    const cover = kapakYolu(n);
    const yt = String(n.video_url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (yt) return `<div class="news-media news-video"><img src="https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg" alt="${esc(n.title)} — video kapağı" loading="lazy"><div class="news-scrim"></div><span class="video-badge">▶ VİDEO</span></div>`;
    /* data-kapak-yedegi: gorsel gercekten yoksa kirik <img> yerine arsiv
       kutusu gosterilir (bkz. kapakYedegiKur). Satir ici onerror kullanilmiyor;
       kamuya acik sayfalarda CSP script-src 'self' (cspKur, src/worker.js). */
    /* Bileşik paylaşım kapağı ile kart fotoğrafı ayrıdır: paylaşım kapağı
       BTMEDYA'nın kendi gerçek fotoğrafından üretilen başlık/künye grafiğidir.
       Kartlarda metinsiz gerçek fotoğraf kullanılır; kaynak etiketi veriden gelir. */
    /* Kartta bestelenmis kapak degil, metinsiz kart gorseli kullanilir:
       kapagin uzerindeki baslik kartin kendi basligiyla ust uste binip
       ikisini de okunmaz hale getiriyordu. Bestelenmis kapak paylasim
       gorseli (og:image) ve makale sayfasi kunyesi olarak kaliyor. */
    if (cover) {
      const kaynak = kapakKaynagi[n.slug] === 'ai' ? 'AI ÜRETİMİ'
        : kapakKaynagi[n.slug] === 'gercek' ? 'GERÇEK ÇEKİM'
        : kapakKaynagi[n.slug] === 'grafik' ? 'BTMEDYA GRAFİK'
        : kapakKaynagi[n.slug] === 'temsili' ? 'TEMSİLİ FOTOĞRAF'
        : kapakKaynagi[n.slug] === 'arsiv' ? 'ARŞİV FOTOĞRAFI'
        : kapakKaynagi[n.slug] === 'harita' ? 'HARİTA'
        : '';
      /* Öne çıkan kart da metinsiz kart görselini kullanır. Başlıklı
         paylaşım kapağı burada kartın kendi başlığıyla iki kez basılıyor ve
         geniş kutuda kırpılınca kategori etiketi kesiliyordu. Başlıklı kapak
         og:image ve makale sayfası künyesi olarak kalır. */
      const src = kartGorseli(cover);
      const badge = kaynak ? `<span class="news-kaynak">${esc(kaynak)}</span>` : '';
      const overlay = '';
      const grafik = kapakKaynagi[n.slug] === 'grafik' ? ' news-media-grafik' : '';
      return `<div class="news-media${featured?' news-media-editorial':''}${grafik}"><img src="${esc(src)}" alt="${esc(n.title)}" loading="${featured?'eager':'lazy'}" decoding="async" data-kapak-yedegi="1"><div class="news-scrim"></div>${badge}${overlay}</div>`;
    }
    return `<div class="news-media news-no-cover"><div class="news-archive-mark"><span>BTMEDYA / ARŞİV</span><b>GERÇEK HABER</b></div><div class="news-scrim"></div></div><span class="reference-note">KAPAK BEKLİYOR</span>`;
  };
  const storyMedia = n => {
    const yt = String(n.video_url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : kartGorseli(kapakYolu(n));
  };
  const renderStoryLab = items => {
    const root = d.getElementById('storyCards');
    if (!root || !items.length) return;
    const [main, side] = items.slice(0, 2);
    // Yan kart %34 opakliga soldurulmus dekor katmani; ayni haber akisinda
    // zaten listelendigi icin ekran okuyucudan ve klavye sirasindan cikarilir.
    const card = (n, extra) => `<article class="story-card ${extra}"${extra === 'story-card-side' ? ' aria-hidden="true" inert' : ''}>
      <img src="${esc(storyMedia(n))}" alt="${esc(n.title || 'BTMEDYA haber görseli')}" loading="lazy" decoding="async">
      <div class="story-card-copy"><small>${esc(n.category || 'HABER')} · ${esc(dateText(n))}</small><h3>${esc(n.title || '')}</h3><p>${esc(String(n.excerpt || '').replace(/\s+/g, ' ').slice(0, 150))}</p><a href="/haberler/${encodeURIComponent(n.slug)}">Haberi aç ↗</a></div>
    </article>`;
    root.innerHTML = card(main, 'story-card-main') + (side ? card(side, 'story-card-side') : '');
  };
  const render = (items) => {
    const list = items.slice(0, 9);
    newsGrid.innerHTML = list.map((n, i) => {
      const ref = staticReference[n.slug] || n.source_url || '';
      const cls = i === 0 ? 'news-card featured' : 'news-card';
      const excerpt = String(n.excerpt || '').replace(/\s+/g,' ').slice(0,180);
      return `<article class="${cls} reveal" data-category="${esc(norm(n.category || 'haber'))}">
        ${cardMedia(n, i === 0)}
        <div class="news-body">
          <small>${esc(n.category || 'HABER')}</small>
          <h3>${esc(n.title || '')}</h3>
          <p>${esc(excerpt)}${excerpt.length>=180?'…':''}</p>
          <div class="news-meta"><span>${esc(dateText(n))}</span><span>${esc(n.author || 'BTMEDYA')}</span></div>
          <a class="news-open" href="/haberler/${encodeURIComponent(n.slug)}">HABERİ AÇ ↗</a>
          ${ref?`<a class="news-open" href="${esc(ref)}" target="_blank" rel="noopener nofollow">KAYNAK ↗</a>`:''}
        </div>
      </article>`;
    }).join('');
    newsGrid.setAttribute('aria-busy','false');
    kapakYedegiKur(newsGrid);
    observeReveal();
  };

  /* Kapak dosyasi gercekten yoksa kirik <img> gosterilmez: kart, kapaksiz
     haberlerle ayni arsiv kutusuna dondurulur. Gorsel kaynak notu da
     kaldirilir, cunku ortada gorsel yok ve o etiket yanlis beyan olurdu. */
  const kapakYedegiKur = (kok) => {
    kok.querySelectorAll('img[data-kapak-yedegi]').forEach(img => {
      img.addEventListener('error', () => {
        const kutu = img.closest('.news-media');
        if (!kutu) return;
        const not = kutu.nextElementSibling;
        if (not && not.classList.contains('reference-note')) not.remove();
        kutu.classList.add('news-no-cover');
        kutu.innerHTML = '<div class="news-archive-mark"><span>BTMEDYA / ARŞİV</span><b>GERÇEK HABER</b></div><div class="news-scrim"></div>';
      }, {once:true});
    });
  };

  const loadNews = async () => {
    try {
      const r = await fetch('/data/haber-kapak-kaynagi.json', {headers:{accept:'application/json'}});
      if (r.ok) kapakKaynagi = await r.json();
    } catch { kapakKaynagi = {}; }
    try {
      const r = await fetch('/api/news?limit=100', {headers:{accept:'application/json'}});
      if (!r.ok) throw new Error('api');
      const data = await r.json();
      allNews = data.items || [];
    } catch {
      try {
        const r = await fetch('/data/haberler.json');
        allNews = await r.json();
      } catch {
        allNews = [];
      }
    }
    const categories = (window.BTMEDYA_RELEVANCE ? window.BTMEDYA_RELEVANCE.categories : [])
      .filter(k => allNews.some(n => sinif(n) === k.key)).map(k => [k.key, k.label]);
    if (filterBar) {
      filterBar.innerHTML = [['all', 'TÜMÜ'], ...categories].map(([cat, label], i) =>
        '<button class="filter' + (i === 0 ? ' active' : '') + '" type="button" role="tab" aria-selected="' + (i === 0 ? 'true' : 'false') + '" data-cat="' + esc(cat) + '">' + esc(label) + '</button>'
      ).join('');
    }
    render(allNews);
    renderStoryLab(allNews);
  };

  filterBar?.addEventListener('click', e => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    filterBar.querySelectorAll('.filter').forEach(b => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
      b.setAttribute('tabindex', active ? '0' : '-1');
    });
    render(allNews.filter(n => catMatch(n, btn.dataset.cat)));
  });
  loadNews();

  const revealTargets = () => [...d.querySelectorAll('.section-head,.media-card,.ai-rail article,.digital-wrap,.contact-card')];
  const observeReveal = () => {
    const targets = d.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { targets.forEach(t => t.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, {threshold:.08});
    targets.forEach(t => io.observe(t));
  };
  revealTargets().forEach(el => el.classList.add('reveal'));
  observeReveal();

  /* ---------------- GERÇEK ARŞİV bölümü ----------------
     Bu bölümün çizicisi script.js içindeydi, ama anasayfa yalnızca home.js
     yüklüyor. Sonuç: #gercekArsivGrid canlıda kalıcı olarak "Arşiv
     yükleniyor…" kutusunda takılı kaldı — bölüm hiç çalışmadı.
     script.js'i anasayfaya eklemek çözüm değil: o dosya da #newsGrid'i
     çiziyor ve buradaki çiziciyle çakışırdı. O yüzden blok buraya taşındı. */
  const arsivSlug = yol => (String(yol || '').split('/').pop() || '').replace(/\.[^.]+$/, '');
  const arsivBaslik = yol => arsivSlug(yol).replace(/[-_]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
  const arsivVideoMu = o => /^video\//i.test(String(o.mime || ''));
  /* Vitrin disi birakilan kayitlar artik public/data/medya-ozel.json'da
     duruyor; Worker bunu vitrin:false olarak gonderiyor. Once burada
     sabit bir regex'ti — icerik bilgisi kodda durmaz, veride durur.
     R2'den gelen kayitlarda alan yok; o zaman vitrinde kalirlar. */
  const arsivDisi = o => o && o.vitrin === false;

  const arsivKarti = (o, i) => {
    const video = arsivVideoMu(o);
    const baslik = esc(o.title || arsivBaslik(o.key || o.original_name));
    const kat = esc(String(o.category || 'arşiv').replace(/-/g, ' '));
    const url = String(o.url || '');
    const kaynak = String(o.source || '');
    let detay = '';
    if (o.category === 'haber') {
      detay = '<a href="/haberler/' + encodeURIComponent(arsivSlug(o.key || o.original_name)) + '">Haberi aç ↗</a>';
    } else if (video && url) {
      detay = '<a href="' + esc(url) + '" target="_blank" rel="noopener">Videoyu aç ↗</a>';
    }
    const yt = '<a href="https://www.youtube.com/@BTmedyaAjans" target="_blank" rel="noopener">YouTube ↗</a>';
    const medya = video
      /* Poster olmadan kart, video metadata'si gelene kadar siyah duruyordu.
         Adres data-src'de bekler: bolum sayfanin cok asagisinda ve showreel
         4,7 MB; sayfa acilir acilmaz on yukleme mobil veriyi harciyordu. */
      ? '<video class="archive-media" muted loop playsinline preload="none"' +
        (o.poster ? ' poster="' + esc(String(o.poster)) + '"' : '') +
        ' data-src="' + esc(url) + '"></video>'
      : '<img class="archive-media" loading="lazy" src="' + esc(url) + '" alt="' + baslik + '">';
    return '<article class="archive-live-card ' + (i === 0 ? 'featured' : '') + '">' + medya +
      '<div class="archive-overlay"></div><div class="archive-copy">' +
      '<span class="archive-tag">' + (o.ai_generated === false ? 'GERÇEK ÇEKİM' : 'AI ÜRETİMİ') + ' · ' + kat + '</span><h3>' + baslik + '</h3>' +
      '<p>Kaynak: ' + esc(kaynak === 'github-static' ? 'BTMEDYA arşivi' : 'Media Vault') + '</p>' +
      '<div class="archive-actions">' + detay + yt + '</div></div></article>';
  };

  const loadArsiv = async () => {
    const grid = d.getElementById('gercekArsivGrid');
    if (!grid) return;
    try {
      const r = await fetch('/api/public/media?limit=40', {headers:{accept:'application/json'}});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      const ogeler = (Array.isArray(data.items) ? data.items : [])
        .filter(x => x && !x.ai_generated && !arsivDisi(x))
        .filter(x => ['saha','haber','video','portfoy','hero','sosyal','arsiv','medya'].includes(String(x.category || '')))
        .sort((a, b) => {
          /* Once medya-ozel.json'daki acik vitrin sirasi. Alfabetik dizilis
             ayni cekimden bes portreyi ust uste getiriyor, saha roportaji ve
             studyo kareleri ilk sekize hic giremiyordu. */
          const acik = x => (typeof x.sira === 'number' ? x.sira : 999);
          if (acik(a) !== acik(b)) return acik(a) - acik(b);
          const kat = x => ({saha:0, haber:1, video:2, portfoy:3, hero:4}[x.category] ?? 9);
          return kat(a) - kat(b);
        })
        .slice(0, 8);
      if (!ogeler.length) {
        grid.innerHTML = '<div class="archive-live-empty">Gerçek arşiv kaydı henüz yayın akışına düşmedi.</div>';
        return;
      }
      grid.innerHTML = ogeler.map(arsivKarti).join('');
      grid.setAttribute('aria-busy','false');
      /* Videolar yalnızca ekrandayken oynar: mobil veri ve pil için. */
      grid.querySelectorAll('video').forEach(v => {
        const io = new IntersectionObserver(
          es => es.forEach(e => {
            if (e.isIntersecting) {
              if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); }
              v.play().catch(() => {});
            } else v.pause();
          }),
          {rootMargin:'120px'}
        );
        io.observe(v);
      });
    } catch (err) {
      grid.innerHTML = '<div class="archive-live-empty">Arşiv akışı şu anda okunamadı. Haber arşivi yine açık: <a href="/haberler/">/haberler/</a></div>';
    }
  };
  loadArsiv();

  const hero = d.querySelector('.hero');
  if (hero && !reduced) {
    d.addEventListener('scroll', () => {
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight - window.innerHeight)));
      hero.style.setProperty('--scroll-p', p.toFixed(3));
    }, {passive:true});
  }

  const storyLab = d.querySelector('.story-lab');
  if (storyLab && !reduced) {
    let storyRaf = 0;
    const updateStory = () => {
      storyRaf = 0;
      const rect = storyLab.getBoundingClientRect();
      const travel = Math.max(1, storyLab.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      storyLab.style.setProperty('--story-progress', progress.toFixed(3));
      storyLab.style.setProperty('--story-x', ((progress - .5) * 2).toFixed(3));
      storyLab.style.setProperty('--story-y', (progress * 2 - 1).toFixed(3));
    };
    const requestStory = () => { if (!storyRaf) storyRaf = requestAnimationFrame(updateStory); };
    window.addEventListener('scroll', requestStory, {passive:true});
    window.addEventListener('resize', requestStory, {passive:true});
    requestStory();
  }

  /* Sinematik kimlik: sembol, imlecin yönünü takip eden küçük bir 3D obje
     gibi davranır; dokunmatik ve reduced-motion cihazlarda pasif kalır. */
  const logo = d.querySelector('[data-logo-3d]');
  if (logo && !reduced && hover) {
    logo.addEventListener('pointermove', e => {
      const r = logo.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5;
      const py = (e.clientY - r.top) / r.height - .5;
      logo.style.transform = `perspective(260px) rotateX(${(-py * 28).toFixed(2)}deg) rotateY(${(px * 32).toFixed(2)}deg) scale3d(1.12,1.12,1.12)`;
    });
    logo.addEventListener('pointerleave', () => { logo.style.transform = ''; });
  }

  /* Bento yüzeyleri: referans videodaki havada duran kart hissi. Hareket
     yalnızca gerçek mouse cihazında çalışır ve kartın kendi sınırlarında
     kalır; dokunmatik ve reduced-motion akışları sabit kalır. */
  if (!reduced && hover) {
    d.querySelectorAll('.news-card,.media-card,.archive-live-card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5;
        const py = (e.clientY - r.top) / r.height - .5;
        card.style.setProperty('--card-rx', `${(-py * 5).toFixed(2)}deg`);
        card.style.setProperty('--card-ry', `${(px * 7).toFixed(2)}deg`);
      }, {passive:true});
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--card-rx');
        card.style.removeProperty('--card-ry');
      });
    });
  }

  /* Storybeat: iç sayfa linkleri kapak gibi kapanır ve yeni sayfa açılır;
     aynı sayfadaki anchor linkleri doğal scroll akışını korur. */
  const transition = (href) => {
    if (reduced) { window.location.href = href; return; }
    d.body.classList.add('story-leave');
    window.setTimeout(() => { window.location.href = href; }, 520);
  };
  d.querySelectorAll('a[href^="/"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href === '/' || href.startsWith('/#') || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      transition(href);
    });
  });

  /* Bölüm geçişlerinde renk tonu ve story etiketi güncellenir; bu, uzun ana
     sayfada kullanıcıya haber → medya → AI akışını sürekli hissettirir. */
  const beats = [...d.querySelectorAll('main > section[id]')];
  if ('IntersectionObserver' in window && beats.length) {
    const beatObserver = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      d.body.dataset.story = en.target.id;
      const accent = en.target.id === 'ai-lab' ? '#ff3040' : en.target.id === 'digital' ? '#35d6ff' : '#35d6ff';
      d.body.style.setProperty('--story-accent', accent);
    }), {threshold:.45});
    beats.forEach(section => beatObserver.observe(section));
  }
})();

/* ===== SOCIAL DESK / METRICOOL SNAPSHOT ===== */
(function(){
  function escSocial(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function profileCardSocial(p){
    const statusMap={publishing_verified:'YAYIN DOĞRULANDI',connected_identity:'KANAL BAĞLI',profile_link:'PROFİL',verification_pending:'DOĞRULAMA BEKLİYOR'};
    const label=escSocial(p.label||'Platform'), status=escSocial(statusMap[p.status]||p.status||'');
    const action=p.url ? '<a href="'+escSocial(p.url)+'" target="_blank" rel="noopener">'+label+' ↗</a>' : '<span class="is-disabled">'+label+' · URL bekleniyor</span>';
    return '<article class="social-profile-card"><div><span class="social-platform-tag">'+label+'</span><small>'+status+'</small></div><div>'+action+'</div></article>';
  }
  function feedCardSocial(item){
    const title=escSocial(item.title), platform=escSocial(item.platform), date=escSocial(item.date);
    return '<article class="social-feed-card"><div class="social-feed-card-top"><span>'+platform+'</span><time datetime="'+date+'">'+date+'</time></div><h3>'+title+'</h3><p>'+escSocial(item.archive_context||'')+'</p><a href="'+escSocial(item.url)+'" target="_blank" rel="noopener">Yayını aç ↗</a></article>';
  }
  async function loadSocialFeedHome(){
    /* Bu blok ana IIFE'nin disinda; oradaki 'const d = document' burada yok.
       'd' ile yazildiginda sayfa ReferenceError verip sosyal akisi hic yuklemiyordu. */
    const profiles=document.getElementById('socialProfiles'), meta=document.getElementById('socialFeedMeta'), grid=document.getElementById('socialFeedGrid');
    const markReady=()=>{profiles?.setAttribute('aria-busy','false');grid?.setAttribute('aria-busy','false')};
    if(!profiles||!meta||!grid)return;
    try{
      const r=await fetch('/api/public/social-feed',{headers:{accept:'application/json'}});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const data=await r.json();
      profiles.innerHTML=(Array.isArray(data.profiles)?data.profiles:[]).map(profileCardSocial).join('');
      const count=Array.isArray(data.items)?data.items.length:0;
      meta.textContent='Kaynak: '+String(data.source||'Metricool')+' · '+count+' doğrulanmış yayın snapshotı · '+String(data.generated_at||'');
      grid.innerHTML=count ? data.items.map(feedCardSocial).join('') : '<div class="social-feed-empty">Doğrulanmış yayın kaydı yok.</div>';
      markReady();
    }catch(err){
      profiles.innerHTML='';
      meta.textContent='Sosyal profil bağlantıları korunuyor; son yayın snapshotı şu anda okunamadı.';
      grid.innerHTML='<div class="social-feed-empty">Sosyal akış geçici olarak kullanılamıyor.</div>';
      markReady();
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadSocialFeedHome,{once:true});else loadSocialFeedHome();
})();

/* BT WORLD NAVIGATOR */
(function(){
  const stage=document.querySelector('[data-world-stage]');
  if(!stage) return;
  const frame=stage.querySelector('[data-world-image]');
  const kicker=stage.querySelector('[data-world-kicker]');
  const title=stage.querySelector('[data-world-title]');
  const source=stage.querySelector('[data-world-source]');
  const detail=stage.querySelector('[data-world-detail]');
  const tabs=[...stage.querySelectorAll('[data-world]')];
  function activate(tab){
    tabs.forEach(t=>{const active=t===tab;t.classList.toggle('is-active',active);t.setAttribute('aria-selected',active?'true':'false');});
    stage.dataset.world=tab.dataset.world;
    stage.querySelector('.bt-world-visual').classList.add('is-changing');
    window.setTimeout(()=>{
      frame.style.backgroundImage='url("'+tab.dataset.image+'")';
      kicker.textContent=tab.dataset.kicker||'';
      title.textContent=tab.dataset.title||'';
      source.textContent=tab.dataset.source||'';
      detail.textContent=tab.dataset.desc||'';
      stage.querySelector('.bt-world-visual').classList.remove('is-changing');
    },180);
  }
  activate(tabs[0]);
  /* Panelden "Sahada calisirken kare" yuvasina atanan gorsel 01/HABER
     sekmesine gecer. Kaynak satiri da atanan dosyanin kaydindan turer. */
  window.btYuvalar && window.btYuvalar.then(y=>{
    tabs.forEach(tab=>{
      const a=tab.dataset.slotImage && y[tab.dataset.slotImage];
      if(!a || a.tur!=='image') return;
      tab.dataset.image=a.url;
      tab.dataset.source=(a.gercek?'GERÇEK ÇEKİM':'AI ÜRETİMİ')+' · BUSE TUNCAY';
      if(tab.classList.contains('is-active')){
        frame.style.backgroundImage='url("'+a.url+'")';
        source.textContent=tab.dataset.source;
      }
    });
  });
  tabs.forEach(tab=>{
    tab.addEventListener('mouseenter',()=>activate(tab));
    tab.addEventListener('focus',()=>activate(tab));
    tab.addEventListener('click',()=>{
      const link=tab.dataset.link;
      if(link && link.startsWith('#')) document.querySelector(link)?.scrollIntoView({behavior:'smooth',block:'start'});
      else if(link) window.location.href=link;
    });
  });
})();

/* ===== CINEMATIC HERO STORY ENGINE ===== */
(function(){
  const root=document.querySelector('.cinematic-hero');
  if(!root) return;
  const sticky=root.querySelector('.cinematic-sticky');
  const videos=[...root.querySelectorAll('.cinematic-video')];
  const ai=root.querySelector('.cinematic-ai-visual');
  const title=root.querySelector('[data-cinematic-title]');
  const kicker=root.querySelector('[data-cinematic-kicker]');
  const kaynakEl=root.querySelector('[data-cinematic-kaynak]');
  const lead=root.querySelector('[data-cinematic-lead]');
  const index=root.querySelector('[data-cinematic-index]');
  const progressEl=root.querySelector('[data-cinematic-progress]');
  const label=root.querySelector('[data-cinematic-label]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile=()=>window.innerWidth<=720;
  /* Kompakt mod: sahne CSS'te sabitlenmiyorsa (mobil, cinematic-overrides.css)
     kaydirma ilerlemesi sahne secemez; kapsayici tek ekran oldugu icin hafif
     bir kaydirma bile son sahneye atlatirdi. Bu modda sahneler zamanla doner.
     Veri tasarrufu: afisi olan ara sahnelerin videosu indirilmez, afis gosterilir. */
  const kompakt=()=>!!sticky && getComputedStyle(sticky).position!=='sticky';
  /* Sahne rozeti sahnenin videosunun kendi kaynagini gosterir.
     Varsayilan dort video (hero-story, state-haber, state-medya,
     state-produksiyon) yapay zeka uretimi: medya-ozel.json gercek listesinde
     yoklar ve karelerine bakildi (robot zirh, patlama, sehir ustunde ucus).
     a3e79e2 dosyalara dokunmadan bu etiketleri "GERCEK CEKIM" yapmisti.
     Panelden bir sahneye gercek cekim atanirsa etiket asagidaki kancayla
     kendiliginden degisir; elle yazilmaz. */
  const scenes=[
    {key:'hero',yuva:'hero-video',k:'01 / GİRİŞ',kaynak:'AI ÜRETİMİ',t:'GERÇEK<br><span>GÖRÜNTÜ.</span>',d:'Sahadan gelen gerçek hikâyeleri görünür kılıyoruz.'},
    {key:'haber',yuva:'kategori-haber',k:'02 / HABER · SAHA',kaynak:'AI ÜRETİMİ',t:'ŞEHRİN<br><span>HİKÂYESİ.</span>',d:'Haber, röportaj ve saha görüntüsü aynı akışta buluşuyor.'},
    {key:'medya',yuva:'kategori-medya',k:'03 / MEDYA · İÇERİK',kaynak:'AI ÜRETİMİ',t:'İÇERİĞİ<br><span>HAREKETE GEÇİR.</span>',d:'Fotoğraf, video ve sosyal medya için üretim.'},
    {key:'produksiyon',yuva:'kategori-prod',k:'04 / PRODÜKSİYON',kaynak:'AI ÜRETİMİ',t:'KAMERA<br><span>AÇIK.</span>',d:'Kadraj. Kurgu. Yayın. Fikri görüntüye dönüştürüyoruz.'},
    {key:'ai',k:'05 / AI LAB · AÇIK ETİKET',kaynak:'AI ÜRETİMİ',t:'YENİ<br><span>ARAÇLAR.</span>',d:'AI üretimi ayrı, açık ve şeffaf bir laboratuvar olarak konumlanıyor.'}
  ];
  /* Panel atamalari: sahnenin videosunu ve rozetini degistirir. Atama yoksa
     hicbir sey yapilmaz, sayfa kendi varsayilanlariyla kalir. */
  window.btYuvalar && window.btYuvalar.then(y=>{
    scenes.forEach((s,i)=>{
      const a=s.yuva && y[s.yuva]; if(!a || a.tur!=='video') return;
      s.kaynak=a.gercek?'GERÇEK ÇEKİM':'AI ÜRETİMİ';
      const el=videos[i] && videos[i].querySelector('video'); if(!el) return;
      el.dataset.src=a.url; delete el.dataset.mobile;
      // Varsayilan poster eski videonun karesi; yeni videoyla uyusmaz.
      if(i>0) el.removeAttribute('poster');
      if(el.dataset.loaded){ el.src=a.url; el.load(); if(i===active && i>0) el.play().catch(()=>{}); }
      if(i===active && kaynakEl) kaynakEl.textContent=s.kaynak;
    });
    const poster=y['hero-poster'], hv=videos[0] && videos[0].querySelector('video');
    if(poster && poster.tur==='image' && hv) hv.setAttribute('poster',poster.url);
  });
  let active=-1, raf=0;

  /* KARE DIZISI (masaustu). Hero videosu (AI uretimi, assets/hero-scrub.mp4)
     93 kareye bolundu; kaydirma ilerlemesi kareyi secer, video oynatilmaz.
     Apple urun sayfalarindaki teknik: video decode'u kaydirmaya yetismez,
     hazir kare aninda cizilir. Kareler asamali iner: once ilk kare, sonra
     her 8. kare (iskelet), sonra aradakiler; eksik karede en yakin inmis
     kare cizilir. Panelden sahneye video atanirsa dizi devreden cikar;
     panel atamasi her zaman onceliklidir. Mobil (kompakt) ve hareket
     azaltmada kullanilmaz. */
  const KARE_SAYISI=93;
  // Dizi bu cekimden uretildi; panel bu dosyalardan birini secmisse dizi
  // ayni icerigi gosterir ve devrede kalir.
  const KARE_KAYNAKLARI=['/assets/hero-scrub.mp4','/assets/hero-scrub.webm','/assets/hero-mobil.mp4'];
  const kareYolu=i=>'/assets/hero-kare/'+String(i+1).padStart(3,'0')+'.webp';
  let kareAktif=false, tuval=null, cizer=null, kareler=[], sonKare=-1;
  function tuvalBoyut(){
    if(!tuval) return;
    const o=Math.min(window.devicePixelRatio||1,1.5), r=sticky.getBoundingClientRect();
    tuval.width=Math.round(r.width*o); tuval.height=Math.round(r.height*o); sonKare=-1;
  }
  function enYakinKare(i){
    for(let d=0; d<KARE_SAYISI; d++){
      if(kareler[i-d] && kareler[i-d].hazir) return i-d;
      if(kareler[i+d] && kareler[i+d].hazir) return i+d;
    }
    return -1;
  }
  function kareCiz(p){
    if(!cizer) return;
    const k=enYakinKare(Math.round(Math.min(1,Math.max(0,p))*(KARE_SAYISI-1)));
    if(k<0 || k===sonKare) return;
    sonKare=k;
    const im=kareler[k], W=tuval.width, H=tuval.height;
    const olcek=Math.max(W/im.naturalWidth,H/im.naturalHeight), w=im.naturalWidth*olcek, h=im.naturalHeight*olcek;
    cizer.drawImage(im,(W-w)/2,(H-h)/2,w,h);
  }
  /* Hero'nun sonunda sahne daireye kapanir ve sonraki bolum acilir. */
  function perde(p){
    const t=Math.max(0,(p-.9)/.1);
    sticky.style.clipPath=t>0?`circle(${(150-t*128).toFixed(1)}% at 50% 50%)`:'';
  }
  function kareYukle(sira){
    let n=0;
    const tek=()=>{
      while(n<sira.length && kareler[sira[n]]) n++;
      if(n>=sira.length || !tuval) return;
      const i=sira[n++], im=new Image(); im.decoding='async'; kareler[i]=im;
      im.onload=()=>{ im.hazir=true; if(i===0 && tuval) tuval.classList.add('hazir'); sonKare=-1; request(); tek(); };
      im.onerror=tek; im.src=kareYolu(i);
    };
    for(let k=0;k<4;k++) tek();
  }
  function kareKur(){
    if(reduced || kompakt() || tuval || !sticky) return;
    tuval=document.createElement('canvas');
    tuval.className='cinematic-kare'; tuval.setAttribute('aria-hidden','true');
    sticky.insertBefore(tuval, sticky.querySelector('.cinematic-vignette'));
    cizer=tuval.getContext('2d',{alpha:false});
    kareAktif=true; tuvalBoyut();
    // Kareler panel atamasi okunduktan sonra iner; baska bir video atanmissa
    // hic indirilmez.
    Promise.resolve(window.btYuvalar||{}).then(y=>{
      const yabanci=scenes.some(sc=>{ const a=sc.yuva && y[sc.yuva];
        return a && a.tur==='video' && !KARE_KAYNAKLARI.includes(String(a.url||'').split('?')[0]); });
      if(yabanci){ kareKapat(); return; }
      const sira=[0]; for(let i=8;i<KARE_SAYISI;i+=8) sira.push(i);
      for(let i=1;i<KARE_SAYISI;i++) if(!sira.includes(i)) sira.push(i);
      kareYukle(sira);
    });
  }
  function kareKapat(){
    if(!tuval) return;
    kareAktif=false; tuval.remove(); tuval=null; cizer=null; sticky.style.clipPath='';
    active=-1; request();
  }
  /* Panel atamasi okunmadan video yuklenmez: once varsayilan video inip
     sonra atanan videoyla degistiriliyordu (mobilde ~1,1 MB bosa). Bu
     sirada video afisi gorunur. */
  let yuvalarOkundu=false; const bekleyen=new Set();
  Promise.resolve(window.btYuvalar||{}).finally(()=>{ yuvalarOkundu=true; bekleyen.forEach(v=>{ loadVideo(v); const el=v.querySelector('video'); if(el && videos.indexOf(v)===active && (active>0||kompakt()) && !reduced) el.play().catch(()=>{}); }); bekleyen.clear(); });
  function loadVideo(v){
    if(!v) return;
    if(!yuvalarOkundu){ bekleyen.add(v); return; }
    const el=v.querySelector('video');
    if(!el || el.dataset.loaded) return;
    let src=mobile() && el.dataset.mobile ? el.dataset.mobile : el.dataset.src;
    // hero-scrub 1280x720 ve 8,7 MB; ayni cekimin dikey kesimi 0,9 MB.
    if(mobile() && /\/hero-scrub\.(?:mp4|webm)$/.test(src||'')) src='/assets/hero-mobil.mp4';
    if(!src) return;
    el.dataset.loaded='1'; el.src=src; el.load();
  }
  function setScene(i,p){
    const scene=scenes[i];
    if(!scene) return;
    if(i!==active){
      active=i;
      // Ses katmani (hero-ses) sahne gecislerini bu olaydan duyar.
      root.dispatchEvent(new CustomEvent('btsahne',{detail:{sahne:i}}));
      root.classList.remove('beat-haber','beat-medya','beat-produksiyon','beat-ai');
      if(scene.key!=='hero') root.classList.add('beat-'+scene.key);
      // Varsayilan AI URETIMI (AGENTS.md): kaynagi bilinmeyen kare gercek sayilmaz.
      if(kaynakEl) kaynakEl.textContent=scene.kaynak||'AI ÜRETİMİ';
      if(title){title.innerHTML=scene.t;title.animate([{opacity:.35,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.2,.75,.2,1)'})}
      if(kicker) kicker.textContent=scene.k;
      if(lead) lead.textContent=scene.d;
      if(index) index.textContent=String(i+1).padStart(2,'0');
      if(label) label.textContent=(i===0&&!kompakt())?'SCROLL TO EXPLORE':scene.k;
      videos.forEach((v,n)=>{
        if(n===i && !kareAktif) {
          const el=v.querySelector('video');
          const sadeceAfis=kompakt() && i>0 && el && el.getAttribute('poster') && !el.dataset.loaded;
          if(!sadeceAfis){ loadVideo(v); if(el && (i>0 || kompakt()) && !reduced) el.play().catch(()=>{}); }
        }
        const el=v.querySelector('video');
        if(el && n!==i) el.pause();
      });
      if(i===4 && ai) ai.animate([{opacity:0,transform:'scale(1.08)'},{opacity:1,transform:'scale(1)'}],{duration:600,fill:'forwards',easing:'cubic-bezier(.2,.75,.2,1)'});
    }
    const seg=Math.min(0.999,Math.max(0,p))*scenes.length;
    const local=seg-i;
    videos.forEach((v,n)=>{
      if(n>=scenes.length-1) return;
      const target=n===i ? Math.max(.0,1-local*1.35) : n===i-1 ? Math.min(1,Math.max(0,(local-.05)*1.35)) : (n===0&&i===0?1:0);
      v.style.opacity=n===i ? String(target) : (n===i-1?String(target):'0');
      v.style.transform='scale('+(n===i ? (1.045-local*.045) : 1.06)+')';
      v.classList.toggle('is-active',n===i);
    });
    if(ai) ai.style.opacity=i===4?String(Math.min(1,Math.max(0,(local-.02)*1.5))):'0';
    if(kareAktif){
      kareCiz(p); perde(p);
      // Ilk kare cizilene kadar video afisi gorunur kalir; siyah bosluk olusmaz.
      if(tuval.classList.contains('hazir')){ videos.forEach(v=>{v.style.opacity='0';}); if(ai) ai.style.opacity='0'; }
    }
    if(progressEl){
      progressEl.style.width=(p*100)+'%';
      const progressBar=progressEl.closest('[role="progressbar"]');
      if(progressBar) progressBar.setAttribute('aria-valuenow',String(Math.round(p*100)));
    }
    root.style.setProperty('--hero-progress',p.toFixed(3));
  }
  function tick(){
    raf=0;
    if(kompakt()) return;
    const rect=root.getBoundingClientRect();
    const travel=Math.max(1,root.offsetHeight-window.innerHeight);
    const p=Math.min(1,Math.max(0,-rect.top/travel));
    const scene=Math.min(scenes.length-1,Math.floor(p*scenes.length));
    setScene(scene,p);
    const x=parseFloat(root.style.getPropertyValue('--hero-mx')||0);
    const y=parseFloat(root.style.getPropertyValue('--hero-my')||0);
    if(sticky && !reduced) sticky.style.setProperty('--hero-mx',x.toFixed(3)),sticky.style.setProperty('--hero-my',y.toFixed(3));
  }
  const request=()=>{if(!raf) raf=requestAnimationFrame(tick)};
  if(!reduced){
    window.addEventListener('scroll',request,{passive:true});
    window.addEventListener('resize',request,{passive:true});
    sticky.addEventListener('pointermove',e=>{
      const r=sticky.getBoundingClientRect();
      root.style.setProperty('--hero-mx',(((e.clientX-r.left)/r.width)-.5).toFixed(3));
      root.style.setProperty('--hero-my',(((e.clientY-r.top)/r.height)-.5).toFixed(3));
    },{passive:true});
    sticky.addEventListener('pointerleave',()=>{root.style.setProperty('--hero-mx','0');root.style.setProperty('--hero-my','0')},{passive:true});
  } else {
    root.style.height='100vh';
    loadVideo(videos[0]);
  }
  kareKur();
  window.addEventListener('resize',()=>{
    if(kompakt()) kareKapat();
    else if(!tuval) { kareKur(); active=-1; }
    tuvalBoyut(); request();
  },{passive:true});
  setScene(0,0);
  request();

  /* setScene opakligi kaydirma ilerlemesinden hesaplar; zamanli modda
     yalniz etkin sahne tam gorunur, AI sahnesinde gorsel acilir. */
  function kompaktGorunum(i){
    videos.forEach((v,n)=>{v.style.opacity=n===i?'1':'0';v.style.transform='none';});
    if(ai) ai.style.opacity=i===4?'1':'0';
  }
  if(kompakt()) kompaktGorunum(0);
  let gorunur=true, dongu=0;
  if('IntersectionObserver' in window) new IntersectionObserver(es=>{gorunur=es[0].isIntersecting;}).observe(root);
  function donguAyarla(){
    const gerekli=kompakt() && !reduced;
    if(gerekli && !dongu){
      dongu=setInterval(()=>{
        if(document.hidden || !gorunur || !kompakt()) return;
        const i=(active+1)%scenes.length;
        setScene(i,i/scenes.length);
        kompaktGorunum(i);
      },5200);
    } else if(!gerekli && dongu){ clearInterval(dongu); dongu=0; request(); }
    if(gerekli && label) label.textContent=scenes[Math.max(0,active)].k;
  }
  donguAyarla();
  window.addEventListener('resize',donguAyarla,{passive:true});
})();

/* Kurulus hikayesi portresi (panel yuvasi: portre-buse).
   Varsayilan gorsel gercek fotograf. Panelden AI uretimi bir gorsel atanirsa
   AGENTS.md geregi uzerinde AI URETIMI etiketi gorunur; etiketsiz kalmaz. */
(function(){
  const img=document.querySelector('img[data-slot="portre-buse"]');
  if(!img || !window.btYuvalar) return;
  window.btYuvalar.then(y=>{
    const a=y['portre-buse']; if(!a || a.tur!=='image') return;
    img.src=a.url;
    const kutu=img.parentElement;
    const eski=kutu.querySelector('.portre-kaynak'); if(eski) eski.remove();
    if(!a.gercek){
      const r=document.createElement('span');
      r.className='portre-kaynak'; r.textContent='AI ÜRETİMİ';
      kutu.appendChild(r);
    }
  });
})();

/* Canli rakamlar (manifesto). Sayilar elle yazilmaz: haber sayisi yayin
   API'sinden, medya ve video sayisi uretilen medya listesinden, kanal
   sayisi sayfadaki gercek sosyal baglantilardan gelir. Veri alinamazsa
   "—" kalir; tahmini rakam gosterilmez. Ekrana girince sayarak dolar. */
(function(){
  const kutu=document.querySelector('.canli-sayac');
  if(!kutu) return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const yaz=(ad,deger)=>{
    const el=kutu.querySelector('[data-sayac="'+ad+'"]');
    if(!el || !(deger>0)) return;
    if(reduced){ el.textContent=deger.toLocaleString('tr-TR'); return; }
    const bas=performance.now(), sure=1400;
    const adim=t=>{ const k=Math.min(1,(t-bas)/sure), e=1-Math.pow(1-k,3);
      el.textContent=Math.round(deger*e).toLocaleString('tr-TR'); if(k<1) requestAnimationFrame(adim); };
    requestAnimationFrame(adim);
  };
  async function doldur(){
    const [haber,medya]=await Promise.all([
      fetch('/api/news?limit=500',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch('/data/medya-listesi.json').then(r=>r.ok?r.json():null).catch(()=>null)
    ]);
    if(haber && Array.isArray(haber.items)) yaz('haber',haber.items.filter(n=>n.status==='published').length);
    if(Array.isArray(medya)){
      yaz('medya',medya.length);
      yaz('video',medya.filter(m=>/\.mp4$/i.test(m.path||'')).length);
    }
    const kanallar=new Set([...document.querySelectorAll('a[href*="instagram.com/"],a[href*="youtube.com/@"],a[href*="tiktok.com/@"]')]
      .map(a=>{ try{ const u=new URL(a.href); return u.hostname.replace(/^www\./,'')+u.pathname.split('/').slice(0,2).join('/'); }catch(e){ return ''; } })
      .filter(Boolean));
    yaz('kanal',kanallar.size);
  }
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)){ io.disconnect(); doldur(); } },{rootMargin:'0px 0px -15% 0px'});
    io.observe(kutu);
  } else doldur();
})();

/* ===== HERO SES KATMANI =====
   Ses dosyasi yok: Web Audio API ile tarayicida anlik uretilir (0 KB indirme)
   ve kaydirmaya gercek zamanli tepki verir. Ses tasarimi hero videosundaki
   hikayeyi izler: kontrol odasi ugultusu -> sahne gecisinde ruzgar ->
   haber/medya/produksiyon panellerinde dokunus -> enerji kuresinde
   yukselen gerilim -> AI/studyo sahnesinde derin vurus ve parilti ->
   dairesel perde kapanirken inen gecis.
   Varsayilan ACIK (kullanici istegi). Tarayicilar ziyaretci etkilesiminden
   once ses calmayi engeller; bu yuzden ses ilk dokunus/tiklama/tusta
   kendiliginden baslar (mobilde kaydirmaya baslayan ilk dokunus yeter).
   Ziyaretci kapatirsa tercih hatirlanir. Hero ekrandan cikinca susar. */
(function(){
  const root=document.querySelector('.cinematic-hero');
  const dugme=root && root.querySelector('[data-hero-ses]');
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!root || !dugme || !AC) return;
  dugme.hidden=false;
  const yazi=dugme.querySelector('span');
  let ac=null, ana=null, yatak=null, filtre=null, gerilim=null, gerilimFiltre=null, gurultu=null;
  let acik=false, gorunurluk=1, sonP=0, perdeCaldi=false;
  const oku=()=>{ try{ return localStorage.getItem('bt-hero-ses')!=='0'; }catch(e){ return true; } };
  let bekliyor=false, clickYut=false;
  const yaz=v=>{ try{ localStorage.setItem('bt-hero-ses',v?'1':'0'); }catch(e){} };

  function gurultuTamponu(){
    const b=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    return b;
  }
  function kur(){
    ac=new AC();
    ana=ac.createGain(); ana.gain.value=0; ana.connect(ac.destination);
    gurultu=gurultuTamponu();
    // Kontrol odasi yatagi: iki kaydirilmis testere + alt bas, alcak geciren filtre.
    filtre=ac.createBiquadFilter(); filtre.type='lowpass'; filtre.frequency.value=420; filtre.Q.value=.7;
    yatak=ac.createGain(); yatak.gain.value=.055; filtre.connect(yatak); yatak.connect(ana);
    [55.0,55.4,110.2].forEach((f,i)=>{ const o=ac.createOscillator(); o.type=i<2?'sawtooth':'sine'; o.frequency.value=f; const g=ac.createGain(); g.gain.value=i<2?.35:.5; o.connect(g); g.connect(filtre); o.start(); });
    const lfo=ac.createOscillator(), lfoG=ac.createGain(); lfo.frequency.value=.08; lfoG.gain.value=160; lfo.connect(lfoG); lfoG.connect(filtre.frequency); lfo.start();
    // Enerji gerilimi: surekli calan gurultu + ton, seviyesi kaydirmayla acilir.
    const n=ac.createBufferSource(); n.buffer=gurultu; n.loop=true;
    gerilimFiltre=ac.createBiquadFilter(); gerilimFiltre.type='bandpass'; gerilimFiltre.frequency.value=600; gerilimFiltre.Q.value=4;
    gerilim=ac.createGain(); gerilim.gain.value=0;
    n.connect(gerilimFiltre); gerilimFiltre.connect(gerilim); gerilim.connect(ana); n.start();
  }
  function ruzgar(asagi){
    const t=ac.currentTime, s=ac.createBufferSource(); s.buffer=gurultu;
    const f=ac.createBiquadFilter(); f.type='bandpass'; f.Q.value=1.4;
    f.frequency.setValueAtTime(asagi?3200:280,t); f.frequency.exponentialRampToValueAtTime(asagi?180:3400,t+.7);
    const g=ac.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.22,t+.22); g.gain.exponentialRampToValueAtTime(.001,t+.85);
    s.connect(f); f.connect(g); g.connect(ana); s.start(t); s.stop(t+.9);
  }
  function dokunus(){
    const t=ac.currentTime+.18;
    [[880,0],[1320,.07]].forEach(([fr,d])=>{ const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.value=fr;
      g.gain.setValueAtTime(0,t+d); g.gain.linearRampToValueAtTime(.08,t+d+.01); g.gain.exponentialRampToValueAtTime(.001,t+d+.22);
      o.connect(g); g.connect(ana); o.start(t+d); o.stop(t+d+.25); });
  }
  function vurus(){
    const t=ac.currentTime+.1, o=ac.createOscillator(), g=ac.createGain();
    o.type='sine'; o.frequency.setValueAtTime(92,t); o.frequency.exponentialRampToValueAtTime(34,t+1.1);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.5,t+.02); g.gain.exponentialRampToValueAtTime(.001,t+1.3);
    o.connect(g); g.connect(ana); o.start(t); o.stop(t+1.35);
    [1046.5,1318.5,1568].forEach((fr,i)=>{ const p=ac.createOscillator(), pg=ac.createGain(); p.type='triangle'; p.frequency.value=fr;
      pg.gain.setValueAtTime(0,t+.15+i*.06); pg.gain.linearRampToValueAtTime(.035,t+.25+i*.06); pg.gain.exponentialRampToValueAtTime(.001,t+1.8);
      p.connect(pg); pg.connect(ana); p.start(t+.15+i*.06); p.stop(t+1.85); });
  }
  function seviye(){
    if(!ac) return;
    const hedef=acik ? .9*gorunurluk : 0;
    ana.gain.cancelScheduledValues(ac.currentTime); ana.gain.setTargetAtTime(hedef,ac.currentTime,.35);
  }
  function ilerleme(){
    if(!ac || !acik) return;
    const p=parseFloat(root.style.getPropertyValue('--hero-progress'))||0;
    // Enerji kuresi videonun %55-%80 araliginda; gerilim o bolgede acilir.
    const e=Math.max(0,1-Math.abs(p-.68)/.16);
    gerilim.gain.setTargetAtTime(e*.12,ac.currentTime,.12);
    gerilimFiltre.frequency.setTargetAtTime(500+e*2600,ac.currentTime,.15);
    filtre.frequency.setTargetAtTime(380+p*520,ac.currentTime,.3);
    if(p>.9 && sonP<=.9 && !perdeCaldi){ ruzgar(true); perdeCaldi=true; }
    if(p<.85) perdeCaldi=false;
    sonP=p;
  }
  async function ac_(){
    if(!ac) kur();
    if(ac.state==='suspended') await ac.resume().catch(()=>{});
    acik=true; yaz(true); dugme.setAttribute('aria-pressed','true'); yazi.textContent='SESİ KAPAT'; dugme.classList.add('acik'); dugme.classList.remove('bekliyor');
    seviye(); ilerleme();
  }
  function kapat(){
    acik=false; yaz(false); dugme.setAttribute('aria-pressed','false'); yazi.textContent='SESİ AÇ'; dugme.classList.remove('acik');
    seviye();
  }
  // Bekleme durumunda dugmeye ilk basis sesi baslatir, kapatmaz.
  // Sesi baslatan dokunus dugmenin kendisindeyse, ayni dokunusun click
  // olayi sesi geri kapatmasin (bir kez yutulur).
  dugme.addEventListener('click',()=>{ if(clickYut){ clickYut=false; return; } if(bekliyor) return; acik?kapat():ac_(); });
  root.addEventListener('btsahne',e=>{
    if(!ac || !acik) return;
    const i=e.detail.sahne;
    ruzgar(false);
    if(i>=1 && i<=3) dokunus();
    if(i===4) vurus();
  });
  window.addEventListener('scroll',()=>requestAnimationFrame(ilerleme),{passive:true});
  if('IntersectionObserver' in window){
    new IntersectionObserver(es=>{ gorunurluk=es[0].isIntersecting?1:0; seviye(); },{threshold:[0,.01]}).observe(root);
  }
  document.addEventListener('visibilitychange',()=>{ if(ac){ document.hidden?ac.suspend():(acik&&ac.resume()); } });
  // Hatirlanan tercih: tarayici ilk etkilesimi bekler.
  if(oku()){
    bekliyor=true;
    const olaylar=['pointerdown','touchend','keydown','click'];
    const ilk=e=>{ olaylar.forEach(o=>window.removeEventListener(o,ilk,true));
      clickYut=e.type!=='click' && dugme.contains(e.target); bekliyor=false; ac_(); };
    olaylar.forEach(o=>window.addEventListener(o,ilk,true));
    dugme.setAttribute('aria-pressed','true'); dugme.classList.add('acik','bekliyor'); yazi.textContent='SES AÇIK';
  }
})();

/* BTMEDYA NextGen Relevance Layer — 2026-09-29 */
(()=>{
 const d=document;
 const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 // Sinif once editoryal kategori alanindan okunur, ancak alan hicbir
 // hatta uymazsa baslik/spot metnine bakilir. Onceki surum tum metinde
 // alt dizi ariyordu: "Balikesir" gecen 61/80 haber BALIKESIR'e, "raporu"
 // icindeki "spor" yuzunden bir yapay zeka haberi SPOR'a dusuyordu.
 const CATS=[['balikesir','BALIKESİR',/\b(yerel|balikesir|altieylul|karesi|bandirma|edremit|ayvalik|burhaniye|gonen|susurluk|pazar|altyapi)\b/],['gundem','GÜNDEM',/\b(gundem|asayis|yangin|afet|guvenlik|trafik)\b/],['ekonomi','EKONOMİ',/\b(ekonomi|emlak|esnaf|tarim|ticaret|fiyat)\b/],['kultur','KÜLTÜR',/\b(kultur|zanaat|sanat|gastronomi|turizm|insan hikayesi|yasam|moda|etkinlik)\b/],['egitim','EĞİTİM',/\b(egitim|universite|okul|sinav)\b/],['saglik','SAĞLIK',/\b(saglik|beslenme|bakim|hastane)\b/],['spor','SPOR',/\b(spor|futbol|basketbol|turnuva)\b/],['teknoloji','TEKNOLOJİ / AI',/\b(yapay zeka|teknoloji|yazilim|dijital|ai)\b/]];
 const bul=t=>(CATS.find(x=>x[2].test(t))||[null])[0];
 const cat=n=>{const k=String(n&&n.category||'');return bul(norm(k.split('·')[0]))||bul(norm(k))||bul(norm([n&&n.title,n&&n.excerpt].join(' ')))||'diger'};
 const quality=n=>Number(!!n&&n.source_url)*2+Number(!!n&&n.cover_url)*2+Number(!!n&&n.author)+Number(String(n&&n.body||'').length>=500)+Number(String(n&&n.published_at||'').slice(0,4)===String(new Date().getFullYear()))*2+Number(n&&n.ai_generated===true);
 window.BTMEDYA_RELEVANCE={categories:CATS.map(x=>({key:x[0],label:x[1]})),category:cat,quality};
 // Sekmeleri ve izgarayi yalniz haber filtresi (yukarida, loadNews) cizer.
 // Burada ikinci bir cizici vardi: iki kod ayni /api/news'i cekip ayni
 // izgaraya yaziyordu; sayfa hangi istek once donerse ona gore 9 ya da 3
 // kartla aciliyordu.
})();


/* BTMEDYA Vitrine health layer — 29 Sep 2026 */
(()=>{const healthEl=document.querySelector('[data-vitrine-health]'),mediaEl=document.querySelector('[data-vitrine-media]'),socialEl=document.querySelector('[data-vitrine-social]');const set=(el,t)=>{if(el)el.textContent=t};Promise.all([fetch('/api/health',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():{}).catch(()=>({})),fetch('/api/public/social-feed',{headers:{accept:'application/json'}}).then(r=>r.ok?r.json():{}).catch(()=>({}))]).then(([h,s])=>{set(healthEl,h.ok?'CANLI':'KONTROL GEREKLİ');set(mediaEl,h.r2?'R2 / ASSETS':'ASSETS');set(socialEl,s.source==='Metricool'?'METRICOOL':'SOCIAL FEED')})})();

/* BTMEDYA · International Growth Bridge */
(function(){
  function bootGrowthBridge(){
    if(document.querySelector('.growth-bridge') || !document.querySelector('.ticker')) return;
    if(!document.querySelector('link[data-growth-bridge-css]')){
      var l=document.createElement('link');
      l.rel='stylesheet';
      l.href='/growth-bridge.css?v=20260930-1';
      l.dataset.growthBridgeCss='1';
      document.head.appendChild(l);
    }
    var el=document.createElement('section');
    el.className='growth-bridge';
    el.id='global-desk';
    el.setAttribute('aria-label','BTMEDYA uluslararası medya ve hizmet masası');
    el.innerHTML=[
      '<div class="growth-bridge-inner">',
      '<div class="growth-bridge-head">',
      '<div><p class="kicker">05 / INTERNATIONAL MEDIA DESK</p><h2 class="display">BALIKESİR\'DEN<br><span>DÜNYAYA.</span></h2></div>',
      '<p class="growth-bridge-lead">Haber, görsel hikâye, video prodüksiyon ve sosyal dağıtımı tek üretim zincirinde buluşturuyoruz. Gerçek çekim ve doğrulanabilir kaynaklar ana omurga; AI üretimleri yalnızca açıkça etiketlenmiş AI LAB içinde yer alır.</p>',
      '</div>',
      '<div class="growth-bridge-grid">',
      '<a class="growth-card" href="/haberler/"><span class="growth-card-index">01 / NEWSROOM</span><h3>Haber ve saha içeriği</h3><p>Balıkesir odaklı gündem, röportaj, ekonomi, kültür ve özel dosyalar. Kaynak ve tarih görünür tutulur.</p><span class="growth-card-meta">HABER AKIŞI ↗</span></a>',
      '<a class="growth-card" href="/video-produksiyon/"><span class="growth-card-index">02 / PRODUCTION</span><h3>Marka için hareketli hikâye</h3><p>Tanıtım filmi, belgesel, reklam, röportaj ve sosyal video üretimini aynı görsel dilde planlıyoruz.</p><span class="growth-card-meta">PRODÜKSİYON ↗</span></a>',
      '<a class="growth-card" href="/sosyal-medya/"><span class="growth-card-index">03 / DISTRIBUTION</span><h3>Webden sosyal yayına</h3><p>İçerik fikrini platforma göre varyantlıyor, yayın planını ölçüyor ve uygun ağlara dağıtıyoruz.</p><span class="growth-card-meta">SOSYAL MEDYA ↗</span></a>',
      '</div>',
      '<div class="growth-bridge-foot"><small>GERÇEK MEDYA ÖNCELİKLİ · AI LAB AÇIK ETİKETLİ · TÜRKİYE / AVRUPA / ORTA DOĞU</small><div class="growth-bridge-actions"><a href="/en/">International desk</a><a class="primary" href="/iletisim/">Proje anlat ↗</a></div></div>',
      '</div>'
    ].join('');
    document.querySelector('.ticker').before(el);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootGrowthBridge,{once:true});
  else bootGrowthBridge();
})();