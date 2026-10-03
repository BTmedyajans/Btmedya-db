/* BTMEDYA RESILIENCE V1
   Dynamic endpoints are preferred. If a live endpoint is unavailable, keep the
   public page useful with verified static fallbacks already shipped with the site.
   No API credentials or private data are exposed here. */
(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m];
    });
  }

  function boot() {
    /* SOCIAL: never leave an empty block when the public snapshot endpoint is down. */
    var profiles = document.getElementById('socialProfiles');
    var feed = document.getElementById('socialFeedGrid');
    var meta = document.getElementById('socialFeedMeta');
    if (profiles && feed) {
      var hasSocialFallback = document.querySelector('[data-fallback="social"]') ||
        feed.querySelector('.social-feed-fallback-card');
      var socialFailure = /okunamadı|kullanılamıyor|geçici/i.test(feed.textContent || '');
      if (socialFailure || (!hasSocialFallback && !feed.children.length)) {
        profiles.innerHTML = [
          ['INSTAGRAM', 'https://www.instagram.com/btmedyajans/'],
          ['YOUTUBE', 'https://www.youtube.com/@BTmedyaAjans'],
          ['TIKTOK', 'https://www.tiktok.com/@btmedya1010']
        ].map(function (p) {
          return '<article class="social-profile-card"><div><span class="social-platform-tag">' +
            esc(p[0]) + '</span><small>BAĞLI PROFİL</small></div><div><a href="' +
            esc(p[1]) + '" target="_blank" rel="noopener">Profili aç ↗</a></div></article>';
        }).join('');
        if (meta) meta.textContent = 'Canlı sosyal snapshot geçici olarak kapalı. Doğrulanmış kanal bağlantıları açık.';
        if (socialFailure) {
          feed.innerHTML = '<div class="social-feed-empty">Son yayınlar yüklenemedi. Kanallar açık, yeni yayınlar sosyal hesaplardan görülebilir.</div>';
        }
      }
    }

    /* MEDIA VAULT: use the repository's static media catalogue as a visual fallback. */
    var grid = document.getElementById('gercekArsivGrid');
    if (!grid) return;
    var archiveFailure = /okunamadı|yayın akışına düşmedi/i.test(grid.textContent || '');
    if (!archiveFailure || grid.dataset.resilienceLoaded) return;
    grid.dataset.resilienceLoaded = '1';

    fetch('/data/medya-listesi.json', { headers: { accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('catalog ' + r.status); return r.json(); })
      .then(function (items) {
        var list = Array.isArray(items) ? items.filter(function (x) {
          return x && x.path && String(x.category || '') === 'haber';
        }).slice(0, 8) : [];
        if (!list.length) throw new Error('empty catalog');
        grid.innerHTML = list.map(function (item, index) {
          var path = String(item.path).replace(/^\//, '');
          var name = path.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, function (m) { return m.toUpperCase(); });
          var src = '/assets/media/' + path;
          return '<article class="archive-live-card ' + (index === 0 ? 'featured' : '') + '">' +
            '<img class="archive-media" loading="lazy" decoding="async" src="' + esc(src) + '" alt="' + esc(name) + '">' +
            '<div class="archive-overlay"></div><div class="archive-copy">' +
            '<span class="archive-tag">GERÇEK ÇEKİM · HABER ARŞİVİ</span>' +
            '<h3>' + esc(name) + '</h3>' +
            '<p>Kaynak: BTMEDYA arşivi · statik doğrulanmış katalog</p>' +
            '<div class="archive-actions"><a href="/haberler/">Haber arşivine geç ↗</a></div>' +
            '</div></article>';
        }).join('');
      })
      .catch(function () {
        grid.innerHTML = '<div class="archive-live-empty">Arşiv servisi geçici olarak kapalı. Haber arşivi açık: <a href="/haberler/">/haberler/</a></div>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 700); }, { once: true });
  } else {
    setTimeout(boot, 700);
  }
})();
