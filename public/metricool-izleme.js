/* Metricool web sitesi analitiği (marka 6858384). Satır içi betik yerine
   ayrı dosya: kamuya açık sayfalarda satır içi betik yasak (AGENTS.md).
   Yüklenen tracker.metricool.com betiği CSP'de ayrıca izinli; izin
   yokken tarayıcı betiği engelliyor ve hiç veri gitmiyordu. */
(function () {
  const betik = document.createElement('script');
  betik.src = 'https://tracker.metricool.com/resources/be.js';
  betik.async = true;
  betik.onload = function () {
    if (window.beTracker) window.beTracker.t({ hash: 'c8e19cd28971fcef340713b1f1b81555' });
  };
  document.head.appendChild(betik);
})();
