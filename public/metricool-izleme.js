/* Anasayfa arayüz katmanları. Metricool ölçümü buradan /olcum.js'e taşındı:
   o dosya her kamuya açık sayfada yüklenir ve bot ziyaretlerini ayıklar. */
(function () {
  // CSS katmanlarını sırayla yükle. Dinamik <link> etiketleri paralel yüklenirse
  // ağ gecikmesine göre eski bir katman sonradan uygulanıp responsive hiyerarşiyi
  // bozabiliyordu. Mobil katman önce, desktop katmanı en son gelir. Böylece
  // desktop-ux-v1 yalnızca 721px+ alanında son otorite olur; mobil kurallar
  // ise kendi medya sorguları içinde korunur.
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

  (async function () {
    try {
      // BTMEDYA EXPERIENCE V2: hero choices + mobile Sahadan fixes.
      await loadStyle('/btmedya-experience-v1.css?v=20261002-2');

      // BTMEDYA CONTENT GROWTH V3: richer editorial, audience paths and service content.
      await loadStyle('/content-growth-v1.css?v=20261002-3');

      // BTMEDYA MOBILE POLISH V4: mobile composition layer.
      // It is intentionally loaded before desktop UX so the desktop pass can
      // become the final >=721px layer without changing mobile behavior.
      await loadStyle('/mobile-polish-v4.css?v=20261003-2');

      // BTMEDYA DESKTOP UX V1: final desktop editorial hierarchy.
      await loadStyle('/desktop-ux-v1.css?v=20261003-2');

      // Behaviour can start after the visual cascade is deterministic.
      loadScript('/btmedya-experience-v1.js?v=20261002-2');
      loadScript('/content-growth-v1.js?v=20261002-3');
    } catch (error) {
      // A cosmetic layer must never break the page. If one optional stylesheet
      // fails, continue with the remaining scripts and the base HTML/CSS.
      console.warn('[BTMEDYA UX] Katman yükleme uyarısı:', error);
      loadScript('/btmedya-experience-v1.js?v=20261002-2');
      loadScript('/content-growth-v1.js?v=20261002-3');
    }
  })();
})();