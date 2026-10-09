/* BTMEDYA okur ölçümü ve analitik tercihleri.
   Metricool izleyicisi yalnızca açık analitik tercihinden sonra yüklenir. */
(function () {
  'use strict';
  const p = new URLSearchParams(location.search).get('olcum');
  try {
    if (p === 'kapat') localStorage.setItem('bt_olcum_kapali', '1');
    if (p === 'ac') localStorage.removeItem('bt_olcum_kapali');
  } catch (e) { /* Depolama kapalıysa ölçüm varsayılan olarak kapalı kalır. */ }

  /* Kendi testlerimiz ve botlar okur sayısını şişirmesin, banner da otomasyon
     görüntülerinin üzerine gelmesin. Gerçek ziyaretçi tercih ekranını görür. */
  if (navigator.webdriver || /HeadlessChrome|bot|crawler|spider|Lighthouse|PageSpeed/i.test(navigator.userAgent)) return;

  function analitikIzinli() {
    try {
      if (localStorage.getItem('bt_olcum_kapali') === '1') return false;
      const tercih = JSON.parse(localStorage.getItem('btmedya_izleme_tercihleri_v1') || 'null');
      return Boolean(tercih && tercih.surum === 1 && tercih.analitik === true);
    } catch (e) {
      return false;
    }
  }

  /* Satış teması ölçümü de analitik seçimine bağlıdır; reddetmek iletişim
     bağlantılarını veya formu engellemez. Yalnız kanal ve sayfa yolu gönderilir. */
  document.addEventListener('click', function (olay) {
    if (!analitikIzinli()) return;
    const bag = olay.target && olay.target.closest ? olay.target.closest('a[href]') : null;
    if (!bag) return;
    const h = bag.getAttribute('href') || '';
    const kanal = /^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(h) ? 'whatsapp'
      : /^tel:/i.test(h) ? 'telefon' : /^mailto:/i.test(h) ? 'eposta' : '';
    if (!kanal || !navigator.sendBeacon) return;
    try {
      navigator.sendBeacon('/api/sales/temas', new Blob([JSON.stringify({ kanal: kanal, sayfa: location.pathname })], { type: 'application/json' }));
    } catch (e) { /* Ölçüm tıklamayı asla engellemez. */ }
  }, { capture: true, passive: true });

  /* Harici izleme betiği bu sayfada doğrudan çağrılmaz. Tercih arayüzü,
     üçüncü taraf isteğini ancak kullanıcı açıkça kabul ederse başlatır. */
  const yonetici = document.createElement('script');
  yonetici.src = '/cerez-tercihleri.js?v=20261009-1';
  yonetici.defer = true;
  document.head.appendChild(yonetici);
})();
