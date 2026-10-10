/* BTMEDYA UX Discovery · public quick search */
(() => {
  'use strict';
  const boot = () => {
    if (document.getElementById('btUxSearch')) return;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const norm = value => String(value || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const links = [
      ['/haberler/', 'Haber Merkezi', 'Güncel haberler, kategoriler ve arşiv'],
      ['/haberler/balikesir/', 'Balıkesir haberleri', 'Şehir, ilçe ve saha gündemi'],
      ['/haberler/ekonomi/', 'Ekonomi haberleri', 'Esnaf, tarım, fiyat ve iş dünyası'],
      ['/haberler/teknoloji/', 'Teknoloji ve AI', 'Dijital dönüşüm ve yapay zekâ'],
      ['/dosyalar/', 'Özel Dosyalar', 'Rehber, analiz ve üretim süreçleri'],
      ['/portfoy/', 'Portföy', 'Gerçek işler, video ve medya arşivi'],
      ['/hizmetler/', 'Hizmetler', 'Sosyal medya, video ve marka üretimi'],
      ['/teklif-al/', 'Teklif başlat', 'Projenizi anlatın, kapsamı netleştirelim']
    ];
    const root = document.createElement('div');
    root.id = 'btUxSearch';
    root.className = 'bt-ux-search';
    root.hidden = true;
    root.innerHTML = '<div class="bt-ux-backdrop" data-ux-close></div>' +
      '<section class="bt-ux-panel" role="dialog" aria-modal="true" aria-labelledby="btUxSearchTitle">' +
      '<div class="bt-ux-head"><div><span class="bt-ux-kicker">BTMEDYA / KEŞİF</span><h2 id="btUxSearchTitle">Aradığını hızlıca bul.</h2></div><button type="button" class="bt-ux-close" data-ux-close aria-label="Aramayı kapat">Esc</button></div>' +
      '<label class="bt-ux-input-wrap"><span aria-hidden="true">⌕</span><input id="btUxSearchInput" type="search" autocomplete="off" placeholder="Haber, konu, şehir, hizmet…" aria-label="Site içinde ara"><kbd>Ctrl K</kbd></label>' +
      '<p class="bt-ux-status" id="btUxSearchStatus" aria-live="polite">Bir konu yazın veya aşağıdan bir yol seçin.</p>' +
      '<div class="bt-ux-results" id="btUxSearchResults"></div>' +
      '<div class="bt-ux-foot"><span>↑ ↓ seç</span><span>Enter aç</span><span>Esc kapat</span></div>' +
      '</section>';
    document.body.appendChild(root);
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'bt-ux-trigger';
    trigger.setAttribute('aria-label', 'Site içinde ara');
    trigger.innerHTML = '<span aria-hidden="true">⌕</span><b>Ara</b><kbd>⌘K</kbd>';
    document.body.appendChild(trigger);
    const input = root.querySelector('#btUxSearchInput');
    const results = root.querySelector('#btUxSearchResults');
    const status = root.querySelector('#btUxSearchStatus');
    let previous = null;
    let news = [];
    let loading = null;
    const render = query => {
      const q = norm(query);
      const staticResults = links.filter(x => !q || norm(x[1] + ' ' + x[2]).includes(q));
      const newsResults = q.length < 2 ? [] : news.filter(x => norm([x.title, x.excerpt, x.category].join(' ')).includes(q)).slice(0, 8);
      const total = staticResults.length + newsResults.length;
      results.innerHTML = (staticResults.length ? '<div class="bt-ux-group"><strong>HIZLI YOLLAR</strong>' + staticResults.map(x => '<a class="bt-ux-result" href="' + esc(x[0]) + '"><span class="bt-ux-icon">↗</span><span><b>' + esc(x[1]) + '</b><small>' + esc(x[2]) + '</small></span></a>').join('') + '</div>' : '') +
        (newsResults.length ? '<div class="bt-ux-group"><strong>HABERLER</strong>' + newsResults.map(x => '<a class="bt-ux-result" href="/haberler/' + encodeURIComponent(x.slug || '') + '"><span class="bt-ux-icon">01</span><span><b>' + esc(x.title) + '</b><small>' + esc(x.category || 'Haber') + (x.published_at ? ' · ' + esc(String(x.published_at).slice(0, 10)) : '') + '</small></span></a>').join('') + '</div>' : '') +
        (!total ? '<p class="bt-ux-empty">Eşleşen sonuç bulunamadı. Farklı bir kelime veya kategori deneyin.</p>' : '');
      status.textContent = q ? (total ? total + ' sonuç bulundu.' : 'Sonuç bulunamadı.') : 'Bir konu yazın veya aşağıdan bir yol seçin.';
    };
    const loadNews = () => {
      if (loading) return loading;
      loading = fetch('/api/news?limit=100&ozet=1', {headers:{accept:'application/json'}}).then(r => r.ok ? r.json() : {}).then(j => {
        news = Array.isArray(j.items) ? j.items.filter(x => x.status === 'published' && x.slug && x.title) : [];
      }).catch(() => {}).finally(() => { loading = null; render(input.value); });
      return loading;
    };
    const close = () => {
      root.classList.remove('is-open');
      document.documentElement.classList.remove('bt-ux-search-open');
      setTimeout(() => { if (!root.classList.contains('is-open')) root.hidden = true; }, 160);
      if (previous && previous.focus) previous.focus();
    };
    const open = () => {
      previous = document.activeElement;
      root.hidden = false;
      requestAnimationFrame(() => root.classList.add('is-open'));
      document.documentElement.classList.add('bt-ux-search-open');
      input.value = new URLSearchParams(location.search).get('q') || '';
      render(input.value);
      input.focus();
      loadNews();
    };
    trigger.addEventListener('click', open);
    root.addEventListener('click', e => { if (e.target.closest('[data-ux-close]')) close(); });
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    root.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const focusable = [...root.querySelectorAll('input,button,a')].filter(x => !x.hidden);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); root.hidden || !root.classList.contains('is-open') ? open() : close(); return; }
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '') && !e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); open(); }
      if (e.key === 'Escape' && root.classList.contains('is-open')) close();
    });
    render('');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
