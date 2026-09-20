(() => {
  const d = document;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = window.matchMedia('(hover:hover)').matches;

  const menu = d.getElementById('siteMenu');
  const toggle = d.getElementById('menuToggle');
  const close = d.getElementById('menuClose');
  const setMenu = (open) => {
    if (!menu || !toggle) return;
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    d.body.classList.toggle('menu-open', open);
  };
  toggle?.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  close?.addEventListener('click', () => setMenu(false));
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  d.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

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
  const cardMedia = n => {
    const cover = n.cover_url || '';
    const yt = String(n.video_url || '').match(/(?:youtube\\.com\\/(?:watch\\?(?:.*&)?v=|embed\\/|shorts\\/|live\\/)|youtu\\.be\\/)([A-Za-z0-9_-]{11})/);
    if (yt) return `<div class="news-media news-video"><img src="https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg" alt="${esc(n.title)} — video kapağı" loading="lazy"><div class="news-scrim"></div><span class="video-badge">▶ VİDEO</span></div>`;
    if (cover) return `<div class="news-media"><img src="${esc(cover)}" alt="${esc(n.title)}" loading="lazy" decoding="async"><div class="news-scrim"></div></div><span class="reference-note">GERÇEK ARŞİV GÖRSELİ</span>`;
    return `<div class="news-media news-no-cover"><div class="news-archive-mark"><span>BTMEDYA / ARŞİV</span><b>GERÇEK HABER</b></div><div class="news-scrim"></div></div><span class="reference-note">KAPAK BEKLİYOR</span>`;
  };
  const youtubeId = v => {
    const m = String(v || '').match(/(?:youtube\\.com\\/(?:watch\\?(?:.*&)?v=|embed\\/|shorts\\/|live\\/)|youtu\\.be\\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  };
  const renderVideoArchive = (items) => {
    const grid = d.getElementById('videoArchiveGrid');
    if (!grid) return;
    const videos = items.filter(n => youtubeId(n.video_url)).slice(0, 6);
    grid.innerHTML = videos.length ? videos.map(n => {
      const id = youtubeId(n.video_url);
      const article = '/haberler/' + encodeURIComponent(n.slug);
      const source = n.source_url || '';
      return `<article class="video-archive-card">
        <a class="video-archive-thumb" href="${esc(article)}" aria-label="${esc(n.title)} haberini aç">
          <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${esc(n.title)} video kapağı" loading="lazy" decoding="async">
          <span class="video-play">▶</span>
          <span class="video-label">GERÇEK SAHA VİDEOSU</span>
        </a>
        <div class="video-archive-copy">
          <small>${esc(n.category || 'HABER')} · ${esc(dateText(n))}</small>
          <h3>${esc(n.title || '')}</h3>
          <div class="video-archive-links">
            <a href="${esc(article)}">HABERİ AÇ ↗</a>
            <a href="${esc(n.video_url)}" target="_blank" rel="noopener">VİDEOYU İZLE ↗</a>
            ${source ? `<a href="${esc(source)}" target="_blank" rel="noopener nofollow">KAYNAK ↗</a>` : ''}
          </div>
        </div>
      </article>`).join('') : '<p class="section-side">Arşivde henüz doğrulanmış video kaydı yok.</p>';
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
    observeReveal();
  };

  const loadNews = async () => {
    try {
      const r = await fetch('/api/news?limit=20', {headers:{accept:'application/json'}});
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
    renderVideoArchive(allNews);
  };

  filterBar?.addEventListener('click', e => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    filterBar.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b === btn));
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

  const hero = d.querySelector('.hero');
  if (hero && !reduced) {
    d.addEventListener('scroll', () => {
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, hero.offsetHeight - window.innerHeight)));
      hero.style.setProperty('--scroll-p', p.toFixed(3));
    }, {passive:true});
  }
})();