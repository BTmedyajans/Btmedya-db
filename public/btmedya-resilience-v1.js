/* BTMEDYA RESILIENCE V2
   Live public endpoints remain primary. Verified repository snapshots/catalogues
   keep the public site useful when a live API is unavailable. */
(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m];
    });
  }

  function boot() {
    /* SOCIAL: recover from the verified Metricool snapshot instead of showing an empty/error state. */
    var profiles = document.getElementById('socialProfiles');
    var feed = document.getElementById('socialFeedGrid');
    var meta = document.getElementById('socialFeedMeta');
    if (profiles && feed) {
      var socialFailure = /okunamadı|kullanılamıyor|geçici/i.test(
        (feed.textContent || '') + ' ' + (meta ? meta.textContent || '' : '')
      );
      if (socialFailure) {
        fetch('/data/social-feed.json', { headers: { accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error('social snapshot ' + r.status); return r.json(); })
          .then(function (data) {
            var ps = Array.isArray(data.profiles) ? data.profiles : [];
            var items = Array.isArray(data.items) ? data.items : [];
            profiles.innerHTML = ps.map(function (p) {
              var status = {
                publishing_verified: 'YAYIN DOĞRULANDI',
                connected_identity: 'KANAL BAĞLI',
                profile_link: 'PROFİL',
                verification_pending: 'DOĞRULAMA BEKLİYOR'
              }[p.status] || p.status || '';
              var action = p.url
                ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.label || 'Platform') + ' ↗</a>'
                : '<span class="is-disabled">' + esc(p.label || 'Platform') + ' · URL bekleniyor</span>';
              return '<article class="social-profile-card"><div><span class="social-platform-tag">' +
                esc(p.label || 'Platform') + '</span><small>' + esc(status) +
                '</small></div><div>' + action + '</div></article>';
            }).join('');
            meta.textContent = 'Kaynak: ' + String(data.source || 'Metricool') +
              ' · ' + items.length + ' doğrulanmış yayın snapshotı · ' +
              String(data.generated_at || '');
            feed.innerHTML = items.length ? items.map(function (item) {
              return '<article class="social-feed-card"><div class="social-feed-card-top"><span>' +
                esc(item.platform) + '</span><time datetime="' + esc(item.date) + '">' +
                esc(item.date) + '</time></div><h3>' + esc(item.title) + '</h3><p>' +
                esc(item.archive_context || '') + '</p><a href="' + esc(item.url) +
                '" target="_blank" rel="noopener">Yayını aç ↗</a></article>';
            }).join('') : '<div class="social-feed-empty">Doğrulanmış yayın kaydı yok.</div>';
          })
          .catch(function () {
            meta.textContent = 'Sosyal snapshot geçici olarak kullanılamıyor.';
          });
      }
    }

    /* MEDIA VAULT: use the repository catalogue with the correct public asset root. */
    var grid = document.getElementById('gercekArsivGrid');
    if (!grid) return;
    var archiveFailure = /okunamadı|yayın akışına düşmedi/i.test(grid.textContent || '');
    if (!archiveFailure || grid.dataset.resilienceLoaded) return;
    grid.dataset.resilienceLoaded = '1';

    fetch('/data/medya-listesi.json', { headers: { accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('catalog ' + r.status); return r.json(); })
      .then(function (items) {
        var list = Array.isArray(items) ? items.filter(function (x) {
          return x && x.path && x.gercek !== false && ['haber', 'portfoy', 'sosyal'].indexOf(String(x.category || '')) >= 0;
        }).sort(function (a, b) {
          return (Number.isFinite(a.sira) ? a.sira : 99) - (Number.isFinite(b.sira) ? b.sira : 99);
        }).slice(0, 8) : [];
        if (!list.length) throw new Error('empty catalog');

        grid.innerHTML = list.map(function (item, index) {
          var path = String(item.path).replace(/^\/+/, '');
          var src = '/assets/' + path;
          var title = item.baslik || path.split('/').pop().replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
          var isVideo = /\.(mp4|webm)$/i.test(path);
          var media = isVideo
            ? '<video class="archive-media" muted loop playsinline preload="metadata" src="' + esc(src) + '"></video>'
            : '<img class="archive-media" loading="lazy" decoding="async" src="' + esc(src) + '" alt="' + esc(title) + '">';
          return '<article class="archive-live-card ' + (index === 0 ? 'featured' : '') + '">' +
            media + '<div class="archive-overlay"></div><div class="archive-copy">' +
            '<span class="archive-tag">GERÇEK ÇEKİM · ' + esc(String(item.category || 'ARŞİV').toUpperCase()) + '</span>' +
            '<h3>' + esc(title) + '</h3><p>Kaynak: BTMEDYA arşivi · statik doğrulanmış katalog</p>' +
            '<div class="archive-actions"><a href="/haberler/">Haber arşivine geç ↗</a><a href="/portfoy/">Portföy ↗</a></div>' +
            '</div></article>';
        }).join('');

        grid.querySelectorAll('video').forEach(function (v) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting) v.play().catch(function () {});
              else v.pause();
            });
          }, { rootMargin: '120px' });
          io.observe(v);
        });
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