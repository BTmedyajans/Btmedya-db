/* Anasayfa arayüz katmanları. Metricool ölçümü buradan /olcum.js'e taşındı:
   o dosya her kamuya açık sayfada yüklenir ve bot ziyaretlerini ayıklar. */
(function () {

  // BTMEDYA EXPERIENCE V2: homepage hero choices + mobile Sahadan fixes.
  const css=document.createElement('link');
  css.rel='stylesheet'; css.href='/btmedya-experience-v1.css?v=20261002-2';
  document.head.appendChild(css);
  const ux=document.createElement('script');
  ux.src='/btmedya-experience-v1.js?v=20261002-2'; ux.defer=true;
  document.head.appendChild(ux);

  // BTMEDYA CONTENT GROWTH V3: richer editorial, audience paths and service content.
  const contentCss=document.createElement('link');
  contentCss.rel='stylesheet'; contentCss.href='/content-growth-v1.css?v=20261002-3';
  document.head.appendChild(contentCss);
  const contentJs=document.createElement('script');
  contentJs.src='/content-growth-v1.js?v=20261002-3'; contentJs.defer=true;
  document.head.appendChild(contentJs);

  // BTMEDYA DESKTOP UX V1: desktop-only editorial hierarchy.
  // Loaded before the mobile layer so mobile remains the final responsive authority.
  const desktopCss=document.createElement('link');
  desktopCss.rel='stylesheet';
  desktopCss.href='/desktop-ux-v1.css?v=20261003-1';
  document.head.appendChild(desktopCss);

  // BTMEDYA MOBILE POLISH V4: final mobile composition layer.
  // Loaded last so it wins over older responsive overrides without changing
  // the desktop/editorial system.
  const mobileCss=document.createElement('link');
  mobileCss.rel='stylesheet';
  mobileCss.href='/mobile-polish-v4.css?v=20261003-1';
  document.head.appendChild(mobileCss);
})();
