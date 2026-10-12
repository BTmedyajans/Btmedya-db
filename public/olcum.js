/* BTMEDYA okur ölçümü (Metricool, marka 6858384).
   Üçüncü taraf analitik betiği yalnız açık analitik izni sonrası yüklenir.
   Tercih verilmemişse kullanıcıya eşit görünürlükte ret/kabul seçenekleri gösterilir.
   Satış temas ölçümü yalnız kanal + sayfa yolunu gönderir ve tanımlayıcı kullanmaz. */
(function () {
  'use strict';

  const ANAHTAR = 'btm_cerez_v1';
  const METRICOOL_HASH = 'c8e19cd28971fcef340713b1f1b81555';
  let yuklendi = false;
  let stilYuklendi = false;

  function okuTercih() {
    try {
      const raw = localStorage.getItem(ANAHTAR);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function yazTercih(analitik) {
    try {
      localStorage.setItem(ANAHTAR, JSON.stringify({
        analitik: !!analitik,
        tarih: new Date().toISOString()
      }));
    } catch (_) {
      // Depolama engelliyse onay bu sayfa için geçerli olur; varsayılan ret.
    }
    return { analitik: !!analitik };
  }

  function metricoolYukle() {
    if (yuklendi) return;
    yuklendi = true;
    const betik = document.createElement('script');
    betik.src = 'https://tracker.metricool.com/resources/be.js';
    betik.async = true;
    betik.onload = function () {
      if (window.beTracker) window.beTracker.t({ hash: METRICOOL_HASH });
    };
    betik.onerror = function () {
      yuklendi = false;
    };
    document.head.appendChild(betik);
  }

  function stilYukle() {
    if (stilYuklendi) return;
    stilYuklendi = true;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = '/cerez-onay.css?v=20261012-1';
    document.head.appendChild(l);
  }

  function seritKaldir() {
    const mevcut = document.querySelector('.cerez-serit');
    if (mevcut) mevcut.remove();
  }

  function seritAc() {
    if (!document.body) return;
    seritKaldir();
    stilYukle();

    const d = document.createElement('div');
    d.className = 'cerez-serit';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-live', 'polite');
    d.setAttribute('aria-label', 'Çerez tercihleri');
    d.innerHTML =
      '<p>Zorunlu tanımlayıcılar sitenin çalışması içindir. Okunma istatistikleri için analitik ölçümü yalnız izninizle açarız. ' +
      '<a href="/cerez-politikasi/">Çerez politikası</a></p>' +
      '<div class="cerez-serit-dugmeler">' +
      '<button type="button" data-cerez-red>Yalnızca zorunlu</button>' +
      '<button type="button" data-cerez-kabul>Analitiğe izin ver</button>' +
      '</div>';

    d.querySelector('[data-cerez-kabul]').addEventListener('click', function () {
      const tercih = yazTercih(true);
      seritKaldir();
      if (tercih.analitik) metricoolYukle();
    });
    d.querySelector('[data-cerez-red]').addEventListener('click', function () {
      yazTercih(false);
      seritKaldir();
      // Önceden analitik kabul edildiyse üçüncü taraf betiğini süreçten çıkarmak için yenile.
      if (yuklendi) location.reload();
    });
    document.body.appendChild(d);
  }

  // Ekip ve otomatik tarayıcıları analitik dışı bırak; kullanıcı tercihi yine de değiştirilebilir.
  let olcumDisi = false;
  try {
    const p = new URLSearchParams(location.search).get('olcum');
    if (p === 'kapat') localStorage.setItem('bt_olcum_kapali', '1');
    if (p === 'ac') localStorage.removeItem('bt_olcum_kapali');
    olcumDisi = localStorage.getItem('bt_olcum_kapali') === '1';
  } catch (_) {
    olcumDisi = true; // Onay tercihi okunamıyorsa üçüncü taraf analitik varsayılan olarak kapalı.
  }

  // Sales contact beacon transmits only channel and page path, not a cookie or identity.
  if (!olcumDisi && !navigator.webdriver &&
      !/HeadlessChrome|bot|crawler|spider|Lighthouse|PageSpeed/i.test(navigator.userAgent)) {
    document.addEventListener('click', function (olay) {
      const bag = olay.target && olay.target.closest ? olay.target.closest('a[href]') : null;
      if (!bag) return;
      const h = bag.getAttribute('href') || '';
      const kanal = /^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(h) ? 'whatsapp'
        : /^tel:/i.test(h) ? 'telefon'
        : /^mailto:/i.test(h) ? 'eposta' : '';
      if (!kanal || !navigator.sendBeacon) return;
      try {
        navigator.sendBeacon('/api/sales/temas', new Blob(
          [JSON.stringify({ kanal: kanal, sayfa: location.pathname })],
          { type: 'application/json' }
        ));
      } catch (_) { /* Ölçüm bağlantının çalışmasını engellemez. */ }
    }, { capture: true, passive: true });
  }

  function basla() {
    const tercih = okuTercih();
    const dugmeler = document.querySelectorAll
      ? document.querySelectorAll('[data-cerez-ayar]')
      : [];
    Array.from(dugmeler).forEach(function (b) {
      if (b && typeof b.addEventListener === 'function') {
        b.addEventListener('click', seritAc);
      }
    });

    if (tercih && tercih.analitik === true) {
      if (!olcumDisi) metricoolYukle();
      return;
    }
    // Ret veya önceki tercih yoksa asla üçüncü taraf analitik yükleme.
    if (!tercih) seritAc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', basla, { once: true });
  } else {
    basla();
  }
})();
