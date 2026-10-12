/* BTMEDYA analitik ölçümü.
   Metricool ve ölçüm olayları yalnız açık analitik tercihi sonrasında etkinleşir.
   Tercih yoksa/okunamıyorsa varsayılan güvenli davranış: analitik kapalı. */
(function () {
  'use strict';

  var ANAHTAR = 'btm_cerez_v1';
  var METRICOOL_HASH = 'c8e19cd28971fcef340713b1f1b81555';
  var metricoolYuklendi = false;
  var temasDinleyicisiEklendi = false;
  var stilYuklendi = false;

  function okuTercih() {
    try {
      var raw = localStorage.getItem(ANAHTAR);
      if (!raw) return null;
      var tercih = JSON.parse(raw);
      return tercih && typeof tercih.analitik === 'boolean' ? tercih : null;
    } catch (_) {
      return null;
    }
  }

  function yazTercih(analitik) {
    var tercih = { analitik: !!analitik, tarih: new Date().toISOString() };
    try {
      localStorage.setItem(ANAHTAR, JSON.stringify(tercih));
      return tercih;
    } catch (_) {
      // Tercih saklanamıyorsa onay geçerli sayılmaz; analitik kapalı kalır.
      return null;
    }
  }

  function ekipVeyaBot() {
    try {
      var p = new URLSearchParams(location.search).get('olcum');
      if (p === 'kapat') localStorage.setItem('bt_olcum_kapali', '1');
      if (p === 'ac') localStorage.removeItem('bt_olcum_kapali');
      if (localStorage.getItem('bt_olcum_kapali') === '1') return true;
    } catch (_) {
      return true;
    }
    return !!navigator.webdriver ||
      /HeadlessChrome|bot|crawler|spider|Lighthouse|PageSpeed/i.test(navigator.userAgent || '');
  }

  function metricoolYukle() {
    if (metricoolYuklendi || ekipVeyaBot()) return;
    metricoolYuklendi = true;
    var betik = document.createElement('script');
    betik.src = 'https://tracker.metricool.com/resources/be.js';
    betik.async = true;
    betik.onload = function () {
      if (window.beTracker) window.beTracker.t({ hash: METRICOOL_HASH });
    };
    betik.onerror = function () {
      metricoolYuklendi = false;
    };
    document.head.appendChild(betik);
  }

  function temasOlcumunuEtkinlestir() {
    if (temasDinleyicisiEklendi || ekipVeyaBot()) return;
    temasDinleyicisiEklendi = true;
    document.addEventListener('click', function (olay) {
      var bag = olay.target && olay.target.closest ? olay.target.closest('a[href]') : null;
      if (!bag) return;
      var href = bag.getAttribute('href') || '';
      var kanal = /^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href) ? 'whatsapp'
        : /^tel:/i.test(href) ? 'telefon'
        : /^mailto:/i.test(href) ? 'eposta' : '';
      if (!kanal || !navigator.sendBeacon) return;
      try {
        navigator.sendBeacon('/api/sales/temas', new Blob(
          [JSON.stringify({ kanal: kanal, sayfa: location.pathname })],
          { type: 'application/json' }
        ));
      } catch (_) {
        // Ölçüm bağlantının çalışmasını engellemez.
      }
    }, { capture: true, passive: true });
  }

  function olcumuEtkinlestir() {
    if (ekipVeyaBot()) return;
    metricoolYukle();
    temasOlcumunuEtkinlestir();
  }

  // Satış temasları için ayrı onay varsayılmadı: bu çağrı yalnız analitik tercihi true olduğunda yapılır.


  function stilYukle() {
    if (stilYuklendi) return;
    stilYuklendi = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/cerez-onay.css?v=20261012-1';
    document.head.appendChild(link);
  }

  function seritKaldir() {
    var mevcut = document.querySelector('.cerez-serit');
    if (mevcut) mevcut.remove();
  }

  function seritAc() {
    if (!document.body || !document.createElement) return;
    seritKaldir();
    stilYukle();

    var serit = document.createElement('div');
    serit.className = 'cerez-serit';
    serit.setAttribute('role', 'dialog');
    serit.setAttribute('aria-live', 'polite');
    serit.setAttribute('aria-label', 'Çerez tercihleri');
    serit.innerHTML =
      '<p>Zorunlu tanımlayıcılar sitenin çalışması içindir. Analitik ölçüm yalnız izninizle açılır. ' +
      '<a href="/cerez-politikasi/">Çerez politikası</a></p>' +
      '<div class="cerez-serit-dugmeler">' +
      '<button type="button" data-cerez-red>Yalnızca zorunlu</button>' +
      '<button type="button" data-cerez-kabul>Analitiğe izin ver</button>' +
      '</div>';

    serit.querySelector('[data-cerez-red]').addEventListener('click', function () {
      yazTercih(false);
      seritKaldir();
      // Önceden analitik etkinleştirildiyse geri çekmeyi uygulamak için belgeyi yenile.
      if (metricoolYuklendi || temasDinleyicisiEklendi) location.reload();
    });
    serit.querySelector('[data-cerez-kabul]').addEventListener('click', function () {
      var tercih = yazTercih(true);
      if (!tercih) {
        var mesaj = serit.querySelector('p');
        if (mesaj) mesaj.textContent = 'Tercihiniz kaydedilemedi. Analitik açılmadı; siteyi analitiksiz kullanabilirsiniz.';
        return;
      }
      seritKaldir();
      if (tercih.analitik === true) olcumuEtkinlestir();
    });
    document.body.appendChild(serit);
  }

  function basla() {
    var tercih = okuTercih();
    var ayarDugmeleri = document.querySelectorAll
      ? document.querySelectorAll('[data-cerez-ayar]')
      : [];
    Array.prototype.forEach.call(ayarDugmeleri, function (dugme) {
      if (dugme && typeof dugme.addEventListener === 'function') {
        dugme.addEventListener('click', seritAc);
      }
    });

    if (tercih && tercih.analitik === true) {
      olcumuEtkinlestir();
    } else if (!tercih) {
      seritAc();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', basla, { once: true });
  } else {
    basla();
  }
})();
