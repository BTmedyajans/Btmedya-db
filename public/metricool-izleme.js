/* Metricool web sitesi analitiği (marka 6858384). */
(function () {
  const betik = document.createElement('script');
  betik.src = 'https://tracker.metricool.com/resources/be.js';
  betik.async = true;
  betik.onload = function () {
    if (window.beTracker) window.beTracker.t({ hash: 'c8e19cd28971fcef340713b1f1b81555' });
  };
  document.head.appendChild(betik);

  // BTMEDYA EXPERIENCE V2: homepage hero choices + mobile Sahadan fixes.
  const css=document.createElement('link');
  css.rel='stylesheet'; css.href='/btmedya-experience-v1.css?v=20261002-2';
  document.head.appendChild(css);
  const ux=document.createElement('script');
  ux.src='/btmedya-experience-v1.js?v=20261002-2'; ux.defer=true;
  document.head.appendChild(ux);

  // BTMEDYA CONTENT GROWTH V1: richer editorial/service content.
  const contentCss=document.createElement('link');
  contentCss.rel='stylesheet'; contentCss.href='/content-growth-v1.css?v=20261002-1';
  document.head.appendChild(contentCss);
  const contentJs=document.createElement('script');
  contentJs.src='/content-growth-v1.js?v=20261002-1'; contentJs.defer=true;
  document.head.appendChild(contentJs);
})();
