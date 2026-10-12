/* BTMEDYA okur ölçümü (Metricool, marka 6858384) ve çerez onayı.
   Kamuya açık her sayfada yüklenir; haber başına okunma Metricool'da
   "pages" raporunda görünür.

   Neden onay şart: Metricool üçüncü taraf bir analitik betiğidir ve
   tarayıcıda tanımlayıcı tutar. KVKK Çerez Uygulamaları Rehberi'ne göre
   zorunlu olmayan (analitik/pazarlama) çerezler açık rıza ister. Bu yüzden
   Metricool yalnız okur "Analitiğe izin ver" dedikten sonra yüklenir.
   Reddetmek kabul etmek kadar kolaydır (eşit iki düğme). Tercih yalnız bu
   tarayıcıda, 'btm_cerez_v1' anahtarında tutulur; altbilgideki
   "Çerez tercihleri" düğmesi ([data-cerez-ayar]) şeridi yeniden açar.

   Ölçüme girmeyenler, çünkü gerçek okur değiller ve rakamı şişirirler:
   - otomatik tarayıcılar (Playwright, Puppeteer, başsız Chrome):
     sitenin kendi denetim ve testleri her gün anasayfayı onlarca kez açıyor;
   - arama/bot kullanıcı ajanları;
   - ?olcum=kapat ile kendini dışarıda bırakan ekip tarayıcıları
     (?olcum=ac geri açar). */
(function () {
  const ANAHTAR = 'btm_cerez_v1';
  const oku = function () {
    try { return JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); } catch (e) { return null; }
  };
  const yaz = function (analitik) {
    try { localStorage.setItem(ANAHTAR, JSON.stringify({ analitik: !!analitik, tarih: new Date().toISOString() })); } catch (e) { /* Depolama kapalıysa tercih bu sayfada geçerli kalır. */ }
  };

  let olcumDisi = false;
  try {
    const p = new URLSearchParams(location.search).get('olcum');
    if (p === 'kapat') localStorage.setItem('bt_olcum_kapali', '1');
    if (p === 'ac') localStorage.removeItem('bt_olcum_kapali');
    if (localStorage.getItem('bt_olcum_kapali') === '1') olcumDisi = true;
  } catch (e) { /* Depolama kapalıysa ölçüm kararı onaya kalır. */ }
  const otomatik = !!navigator.webdriver ||
    /HeadlessChrome|bot|crawler|spider|Lighthouse|PageSpeed/i.test(navigator.userAgent);
  if (olcumDisi || otomatik) return;

  /* Satış temasları: WhatsApp / telefon / e-posta bağlantısına tıklayan
     okur hangi sayfadaydı? Yalnız kanal ve sayfa yolu gider; çerez ve
     kişisel veri yok, bu yüzden onaydan bağımsızdır. sendBeacon sayfa
     değişse de isteği tamamlar. */
  document.addEventListener('click', function (olay) {
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

  let yuklendi = false;
  const metricoolYukle = function () {
    if (yuklendi) return;
    yuklendi = true;
    const betik = document.createElement('script');
    betik.src = 'https://tracker.metricool.com/resources/be.js';
    betik.async = true;
    betik.onload = function () {
      if (window.beTracker) window.beTracker.t({ hash: 'c8e19cd28971fcef340713b1f1b81555' });
    };
    document.head.appendChild(betik);
  };

  /* Şerit stili ayrı dosyada: kamuya açık sayfalarda CSP satır içi
     betiğe izin vermez; stil dosyası da ancak şerit gerekince yüklenir. */
  let stilVar = false;
  const stilYukle = function () {
    if (stilVar) return;
    stilVar = true;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = '/cerez-onay.css?v=20261011-1';
    document.head.appendChild(l);
  };

  const seritAc = function () {
    if (!document.body || !document.querySelector) return;
    const eski = document.querySelector('.cerez-serit');
    if (eski) eski.remove();
    stilYukle();
    const d = document.createElement('div');
    d.className = 'cerez-serit';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-live', 'polite');
    d.setAttribute('aria-label', 'Çerez tercihleri');
    d.innerHTML = '<p>Zorunlu çerezler sitenin çalışması içindir. Okunma istatistikleri için analitik çerezleri yalnız izninizle açarız. <a href="/cerez-politikasi/">Çerez politikası</a></p>' +
      '<div class="cerez-serit-dugmeler"><button type="button" data-cerez-red>Yalnızca zorunlu</button>' +
      '<button type="button" data-cerez-kabul>Analitiğe izin ver</button></div>';
    d.querySelector('[data-cerez-kabul]').addEventListener('click', function () { yaz(true); metricoolYukle(); d.remove(); });
    d.querySelector('[data-cerez-red]').addEventListener('click', function () {
      yaz(false); d.remove();
      /* Daha önce izin verilip Metricool yüklendiyse geri çekme ancak
         yeniden yüklemede tam geçerli olur; betik bellekte kalmasın. */
      if (yuklendi) location.reload();
    });
    document.body.appendChild(d);
  };

  const basla = function () {
    try {
      const tercih = oku();
      if (document.querySelector('[data-cerez-ayar]')) stilYukle();
      if (tercih && tercih.analitik) metricoolYukle();
      else if (!tercih) seritAc();
      document.querySelectorAll('[data-cerez-ayar]').forEach(function (b) {
        b.addEventListener('click', seritAc);
      });
    } catch (e) { /* Onay arayüzü sayfanın geri kalanını asla bozmaz. */ }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla);
  else basla();
})();
