/* BTMEDYA okur ölçümü (Metricool, marka 6858384).
   Kamuya açık her sayfada yüklenir; haber başına okunma Metricool'da
   "pages" raporunda görünür.

   Ölçüme girmeyenler, çünkü gerçek okur değiller ve rakamı şişirirler:
   - otomatik tarayıcılar (Playwright, Puppeteer, başsız Chrome):
     sitenin kendi denetim ve testleri her gün anasayfayı onlarca kez açıyor;
   - arama/bot kullanıcı ajanları;
   - ?olcum=kapat ile kendini dışarıda bırakan ekip tarayıcıları
     (?olcum=ac geri açar). */
(function () {
  try {
    const p = new URLSearchParams(location.search).get('olcum');
    if (p === 'kapat') localStorage.setItem('bt_olcum_kapali', '1');
    if (p === 'ac') localStorage.removeItem('bt_olcum_kapali');
    if (localStorage.getItem('bt_olcum_kapali') === '1') return;
  } catch (e) { /* Depolama kapalıysa ölçüm sürer. */ }
  if (navigator.webdriver) return;
  if (/HeadlessChrome|bot|crawler|spider|Lighthouse|PageSpeed/i.test(navigator.userAgent)) return;
  const betik = document.createElement('script');
  betik.src = 'https://tracker.metricool.com/resources/be.js';
  betik.async = true;
  betik.onload = function () {
    if (window.beTracker) window.beTracker.t({ hash: 'c8e19cd28971fcef340713b1f1b81555' });
  };
  document.head.appendChild(betik);
})();
