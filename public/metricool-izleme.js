/* Anasayfa arayüz katmanları. Metricool ölçümü buradan /olcum.js'e taşındı:
   o dosya her kamuya açık sayfada yüklenir ve bot ziyaretlerini ayıklar. */
(function () {
  function loadStyle(href) {
    return new Promise(function (resolve, reject) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    var script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
    return script;
  }

  /* Resilience katmanı ilk sırada yüklenir. Canlı public endpoint kısa süreli
     4xx/5xx verse bile Social Desk ve Media Vault doğrulanmış snapshot/catalog
     katmanına dönebilir. */
  loadScript('/btmedya-resilience-v1.js?v=20261004-1');

  (async function () {
    try {
      await loadStyle('/btmedya-experience-v1.css?v=20261002-2');
      await loadStyle('/content-growth-v1.css?v=20261002-3');
      await loadStyle('/mobile-polish-v4.css?v=20261003-2');
      await loadStyle('/desktop-ux-v1.css?v=20261003-2');

      loadScript('/btmedya-experience-v1.js?v=20261005-1');
      loadScript('/content-growth-v1.js?v=20261002-3');
    } catch (error) {
      console.warn('[BTMEDYA UX] Katman yükleme uyarısı:', error);
      loadScript('/btmedya-experience-v1.js?v=20261005-1');
      loadScript('/content-growth-v1.js?v=20261002-3');
    }
  })();
})();
