/* Ana sayfa arayüz katmanları.
   Üçüncü taraf analitik bu dosyada başlatılmaz; yalnız /olcum.js içindeki
   açık rıza kontrolünden sonra yüklenebilir. */
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
