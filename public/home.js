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

  if (!reduced && hover) {
    d.body.classList.add('parallax-ready');
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

    if (filtre) {
      const kategoriler = [{ad:'', etiket:'TÜMÜ'}].concat(
        (veri.kategoriler || []).filter(c => isler.some(x => x.kategori === c.ad)));
      filtre.innerHTML = kategoriler.map((c, i) =>
        '<button class="portfoy-sekme' + (i === 0 ? ' secili' : '') + '" type="button" role="tab"' +
        ' aria-selected="' + (i === 0) + '" data-kategori="' + esc(c.ad) + '">' + esc(c.etiket) + '</button>'
      ).join('');
      filtre.addEventListener('click', e => {
        const b = e.target.closest('.portfoy-sekme');
        if (!b) return;
        const sec = b.dataset.kategori || '';
        filtre.querySelectorAll('.portfoy-sekme').forEach(x => {
          const aktif = x === b;
          x.classList.toggle('secili', aktif);
          x.setAttribute('aria-selected', String(aktif));
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

  const lazy = [...d.querySelectorAll('video[data-src]')];
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
  const norm = s => String(s || '').toLowerCase().replace(/ı/g,'i').replace(/ğ/g,'g').replace(/ş/g,'s').replace(/ç/g,'c').replace(/ö/g,'o').replace(/ü/g,'u');
  const catMatch = (cat, wanted) => {
    if (wanted === 'all') return true;
    const c = norm(cat);
    return wanted === 'kultur' ? /(kultur|zanaat|moda)/.test(c) :
           wanted === 'yerel' ? /(yerel|pazar)/.test(c) :
           wanted === 'ekonomi' ? /(ekonomi|emlak|tarim|esnaf)/.test(c) :
           wanted === 'spor' ? /spor|muay/.test(c) :
           wanted === 'saglik' ? /(saglik|bakim|beslenme)/.test(c) : true;
  };

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

  const dateText = item => item.original_date || (item.published_at ? new Date(item.published_at).toLocaleDateString('tr-TR') : '');
  /* Kapak kurali haber detay sayfasiyla ayni olmali (src/news-page.js:57).
     Haberlerin cogunda cover_url bos ama kapak gorseli
     /assets/haber-kapak/<slug>.webp olarak zaten depoda duruyor; slug'dan
     turetmezsek 27 gercek kapak hic kullanilmaz ve kart "KAPAK BEKLIYOR"
     kutusunda kalir. */
  const kapakYolu = n => n.cover_url || (n.slug ? '/assets/haber-kapak/' + encodeURIComponent(n.slug) + '.webp' : '');
  /* Haber kapaginin metinsiz kart varyanti. Uretici her kapagin yaninda
     bir de "-foto" dosyasi biraktigi icin yol turetmek yeterli. */
  const kartGorseli = (yol) => String(yol || '').replace(/(\/assets\/haber-kapak\/[^/]+)\.webp$/, '$1-foto.webp');
  const cardMedia = n => {
    const cover = kapakYolu(n);
    const yt = String(n.video_url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (yt) return `<div class="news-media news-video"><img src="https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg" alt="${esc(n.title)} — video kapağı" loading="lazy"><div class="news-scrim"></div><span class="video-badge">▶ VİDEO</span></div>`;
    /* data-kapak-yedegi: gorsel gercekten yoksa kirik <img> yerine arsiv
       kutusu gosterilir (bkz. kapakYedegiKur). Satir ici onerror kullanilmiyor;
       kamuya acik sayfalarda CSP script-src 'self' (cspKur, src/worker.js). */
    /* Kapaklar saha fotografi degil, tasarlanmis grafik kart; bu yuzden
       AGENTS.md'deki varsayilan geregi AI URETIMI etiketi tasirlar. */
    /* Kartta bestelenmis kapak degil, metinsiz kart gorseli kullanilir:
       kapagin uzerindeki baslik kartin kendi basligiyla ust uste binip
       ikisini de okunmaz hale getiriyordu. Bestelenmis kapak paylasim
       gorseli (og:image) ve makale sayfasi kunyesi olarak kaliyor. */
    if (cover) {
      const kaynak = kapakKaynagi[n.slug] === 'ai' ? 'AI ÜRETİMİ'
        : kapakKaynagi[n.slug] === 'gercek' ? 'GERÇEK ÇEKİM'
        : '';  /* Kayit yoksa rozet basilmaz: bilmedigimizi uydurmaktansa susariz. */
      return `<div class="news-media"><img src="${esc(kartGorseli(cover))}" alt="${esc(n.title)}" loading="lazy" decoding="async" data-kapak-yedegi="1"><div class="news-scrim"></div>${kaynak?`<span class="news-kaynak">${esc(kaynak)}</span>`:''}</div>`;
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
    const card = (n, extra) => `<article class="story-card ${extra}">
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
      return `<article class="${cls} reveal">
        ${cardMedia(n)}
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
    const categories = [...new Set(allNews.map(n => String(n.category || '').trim()).filter(Boolean))].slice(0, 10);
    if (filterBar) {
      const labels = {yerel:'YEREL', ekonomi:'EKONOMİ', kultur:'KÜLTÜR', spor:'SPOR', saglik:'SAĞLIK', gundem:'GÜNDEM'};
      filterBar.innerHTML = ['all', ...categories].map((cat, i) => {
        const label = cat === 'all' ? 'TÜMÜ' : (labels[norm(cat)] || cat.toUpperCase());
        return '<button class="filter' + (i === 0 ? ' active' : '') + '" type="button" role="tab" aria-selected="' + (i === 0 ? 'true' : 'false') + '" data-cat="' + esc(cat) + '">' + esc(label) + '</button>';
      }).join('');
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
    render(allNews.filter(n => catMatch(n.category, btn.dataset.cat)));
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
      /* Poster olmadan kart, video metadata'si gelene kadar siyah duruyordu. */
      ? '<video class="archive-media" muted loop playsinline preload="metadata"' +
        (o.poster ? ' poster="' + esc(String(o.poster)) + '"' : '') +
        ' src="' + esc(url) + '"></video>'
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
        .filter(x => ['saha','haber','video','portfoy','hero','sosyal'].includes(String(x.category || '')))
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
      /* Videolar yalnızca ekrandayken oynar: mobil veri ve pil için. */
      grid.querySelectorAll('video').forEach(v => {
        const io = new IntersectionObserver(
          es => es.forEach(e => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }),
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
  const scenes=[
    {key:'hero',k:'01 / GİRİŞ',kaynak:'AI ÜRETİMİ',t:'GERÇEK<br><span>GÖRÜNTÜ.</span>',d:'Sahadan gelen gerçek hikâyeleri görünür kılıyoruz.'},
    {key:'haber',k:'02 / HABER · SAHA',kaynak:'AI ÜRETİMİ',t:'ŞEHRİN<br><span>HİKÂYESİ.</span>',d:'Haber, röportaj ve saha görüntüsü aynı akışta buluşuyor.'},
    {key:'medya',k:'03 / MEDYA · İÇERİK',kaynak:'AI ÜRETİMİ',t:'İÇERİĞİ<br><span>HAREKETE GEÇİR.</span>',d:'Fotoğraf, video ve sosyal medya için gerçek üretim.'},
    {key:'produksiyon',k:'04 / PRODÜKSİYON',kaynak:'AI ÜRETİMİ',t:'KAMERA<br><span>AÇIK.</span>',d:'Kadraj. Kurgu. Yayın. Fikri görüntüye dönüştürüyoruz.'},
    {key:'ai',k:'05 / AI LAB · AÇIK ETİKET',kaynak:'AI ÜRETİMİ',t:'YENİ<br><span>ARAÇLAR.</span>',d:'AI üretimi ayrı, açık ve şeffaf bir laboratuvar olarak konumlanıyor.'}
  ];
  let active=-1, raf=0;
  function loadVideo(v){
    if(!v) return;
    const el=v.querySelector('video');
    if(!el || el.dataset.loaded) return;
    const src=mobile() && el.dataset.mobile ? el.dataset.mobile : el.dataset.src;
    if(!src) return;
    el.dataset.loaded='1'; el.src=src; el.load();
  }
  function setScene(i,p){
    const scene=scenes[i];
    if(!scene) return;
    if(i!==active){
      active=i;
      root.classList.remove('beat-haber','beat-medya','beat-produksiyon','beat-ai');
      if(scene.key!=='hero') root.classList.add('beat-'+scene.key);
      if(kaynakEl) kaynakEl.textContent=scene.kaynak||'AI ÜRETİMİ';
      if(title){title.innerHTML=scene.t;title.animate([{opacity:.35,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.2,.75,.2,1)'})}
      if(kicker) kicker.textContent=scene.k;
      if(lead) lead.textContent=scene.d;
      if(index) index.textContent=String(i+1).padStart(2,'0');
      if(label) label.textContent=i===0?'SCROLL TO EXPLORE':scene.k;
      videos.forEach((v,n)=>{
        if(n===i) loadVideo(v);
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
    if(progressEl) progressEl.style.width=(p*100)+'%';
    root.style.setProperty('--hero-progress',p.toFixed(3));
  }
  function tick(){
    raf=0;
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
  setScene(0,0);
  request();
})();
