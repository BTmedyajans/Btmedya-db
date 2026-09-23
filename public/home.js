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

  const dateText = item => item.original_date || (item.published_at ? new Date(item.published_at).toLocaleDateString('tr-TR') : '');
  /* Kapak kurali haber detay sayfasiyla ayni olmali (src/news-page.js:57).
     Haberlerin cogunda cover_url bos ama kapak gorseli
     /assets/haber-kapak/<slug>.webp olarak zaten depoda duruyor; slug'dan
     turetmezsek 27 gercek kapak hic kullanilmaz ve kart "KAPAK BEKLIYOR"
     kutusunda kalir. */
  const kapakYolu = n => n.cover_url || (n.slug ? '/assets/haber-kapak/' + encodeURIComponent(n.slug) + '.webp' : '');
  const cardMedia = n => {
    const cover = kapakYolu(n);
    const yt = String(n.video_url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (yt) return `<div class="news-media news-video"><img src="https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg" alt="${esc(n.title)} — video kapağı" loading="lazy"><div class="news-scrim"></div><span class="video-badge">▶ VİDEO</span></div>`;
    /* data-kapak-yedegi: gorsel gercekten yoksa kirik <img> yerine arsiv
       kutusu gosterilir (bkz. kapakYedegiKur). Satir ici onerror kullanilmiyor;
       kamuya acik sayfalarda CSP script-src 'self' (cspKur, src/worker.js). */
    /* Kapaklar saha fotografi degil, tasarlanmis grafik kart; bu yuzden
       AGENTS.md'deki varsayilan geregi AI URETIMI etiketi tasirlar. */
    if (cover) return `<div class="news-media"><img src="${esc(cover)}" alt="${esc(n.title)}" loading="lazy" decoding="async" data-kapak-yedegi="1"><div class="news-scrim"></div></div><span class="reference-note">AI ÜRETİMİ GÖRSEL</span>`;
    return `<div class="news-media news-no-cover"><div class="news-archive-mark"><span>BTMEDYA / ARŞİV</span><b>GERÇEK HABER</b></div><div class="news-scrim"></div></div><span class="reference-note">KAPAK BEKLİYOR</span>`;
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
    render(allNews);
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
  const arsivDisi = o => /showreel-fantasy|showreel-flying-reporter/.test(String(o.path || o.original_name || '').toLowerCase());

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
      ? '<video class="archive-media" muted loop playsinline preload="metadata" src="' + esc(url) + '"></video>'
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
          const sira = x => ({saha:0, haber:1, video:2, portfoy:3, hero:4}[x.category] ?? 9);
          return sira(a) - sira(b);
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
})();
