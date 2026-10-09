/* BTMEDYA analitik ölçüm ve gizlilik tercihi.
   Metricool izleyicisi açık bir tercihten önce yüklenmez; site içeriği ve formlar
   analitik tercihinden bağımsız çalışmaya devam eder. */
(function () {
  'use strict';

  if (window.__btmedyaConsentStarted) return;
  window.__btmedyaConsentStarted = true;

  var ANAHTAR = 'btmedya_izleme_tercihleri_v1';
  var IC_OLUM_KAPALI = 'bt_olcum_kapali';
  var METRICOOL_HASH = 'c8e19cd28971fcef340713b1f1b81555';
  var OTURUM_TERCIHI = null;

  function okuTercih() {
    try {
      var deger = JSON.parse(localStorage.getItem(ANAHTAR) || 'null');
      if (deger && deger.surum === 1 && typeof deger.analitik === 'boolean') return deger;
    } catch (e) { /* Depolama kapalıysa varsayılan güvenli tercih kullanılır. */ }
    return null;
  }

  function icOlcumKapali() {
    try { return localStorage.getItem(IC_OLUM_KAPALI) === '1'; }
    catch (e) { return false; }
  }

  function analitikIzinli() {
    if (icOlcumKapali()) return false;
    var deger = okuTercih();
    if (deger) return deger.analitik === true;
    return OTURUM_TERCIHI === true;
  }

  function metricoolYukle() {
    if (!analitikIzinli() || window.__btmedyaMetricoolRequested) return;
    window.__btmedyaMetricoolRequested = true;
    var betik = document.createElement('script');
    betik.src = 'https://tracker.metricool.com/resources/be.js';
    betik.async = true;
    betik.referrerPolicy = 'strict-origin-when-cross-origin';
    betik.onload = function () {
      if (analitikIzinli() && window.beTracker) window.beTracker.t({ hash: METRICOOL_HASH });
    };
    betik.onerror = function () {
      window.__btmedyaMetricoolRequested = false;
    };
    document.head.appendChild(betik);
  }

  function kaydet(analitik) {
    OTURUM_TERCIHI = analitik === true;
    try {
      localStorage.setItem(ANAHTAR, JSON.stringify({
        surum: 1,
        zorunlu: true,
        analitik: OTURUM_TERCIHI,
        guncellendi: new Date().toISOString()
      }));
    } catch (e) { /* Bu sayfada tercih uygulanır; depolama yoksa tekrar sorulur. */ }
    if (OTURUM_TERCIHI) metricoolYukle();
    pencereyiKapat();
    ayarDugmesiniGoster();
  }

  function stilYukle() {
    if (document.querySelector('link[data-btmedya-consent-style]')) return;
    var stil = document.createElement('link');
    stil.rel = 'stylesheet';
    stil.href = '/cerez-tercihleri.css?v=20261009-1';
    stil.setAttribute('data-btmedya-consent-style', 'true');
    document.head.appendChild(stil);
  }

  function elemanOlustur() {
    if (document.getElementById('btmedya-izleme-tercihleri')) return;
    stilYukle();

    var kok = document.createElement('div');
    kok.id = 'btmedya-izleme-tercihleri';
    kok.className = 'bt-consent-root';
    kok.innerHTML =
      '<aside class="bt-consent-banner" id="bt-consent-banner" role="region" aria-labelledby="bt-consent-title" aria-live="polite">' +
        '<div class="bt-consent-copy">' +
          '<p class="bt-consent-eyebrow">BTMEDYA / GİZLİLİK</p>' +
          '<h2 id="bt-consent-title">Analitik ölçüm tercihiniz</h2>' +
          '<p>Siteyi kullanmak için analitik ölçüm gerekli değildir. İzin verirseniz ziyaret ve sayfa görüntüleme ölçümü için Metricool betiği yüklenir. Tercihinizi daha sonra değiştirebilirsiniz.</p>' +
          '<a class="bt-consent-policy" href="/cerez-politikasi/">Ölçüm ve saklama bilgileri</a>' +
        '</div>' +
        '<div class="bt-consent-actions" aria-label="Analitik tercih seçenekleri">' +
          '<button type="button" class="bt-consent-button" data-consent-action="accept">Analitiği kabul et</button>' +
          '<button type="button" class="bt-consent-button" data-consent-action="reject">Reddet</button>' +
          '<button type="button" class="bt-consent-button" data-consent-action="preferences">Tercihler</button>' +
        '</div>' +
      '</aside>' +
      '<section class="bt-consent-preferences" id="bt-consent-preferences" role="region" aria-labelledby="bt-consent-preferences-title" hidden>' +
        '<p class="bt-consent-eyebrow">BTMEDYA / TERCİHLER</p>' +
        '<h2 id="bt-consent-preferences-title">Ölçüm ayarları</h2>' +
        '<p>Zorunlu yerel tercih kaydı site seçiminizi hatırlamak için kullanılır. Analitik ölçüm isteğe bağlıdır ve başlangıçta kapalıdır.</p>' +
        '<label class="bt-consent-option"><input type="checkbox" id="bt-consent-analytics"> <span><strong>Analitik ölçüm</strong><small>Metricool ziyaret ve sayfa görüntüleme ölçümü. Onay verilmezse üçüncü taraf izleme betiği yüklenmez.</small></span></label>' +
        '<div class="bt-consent-actions">' +
          '<button type="button" class="bt-consent-button" data-consent-action="save">Seçimi kaydet</button>' +
          '<button type="button" class="bt-consent-button" data-consent-action="cancel">Geri dön</button>' +
        '</div>' +
        '<a class="bt-consent-policy" href="/gizlilik/">Gizlilik ve KVKK bilgilendirmesi</a>' +
      '</section>' +
      '<button type="button" class="bt-consent-settings" data-consent-action="settings" aria-label="Analitik ölçüm tercihlerini değiştir" hidden>Ölçüm tercihleri</button>';
    document.body.appendChild(kok);

    var banner = document.getElementById('bt-consent-banner');
    var panel = document.getElementById('bt-consent-preferences');
    var ayar = kok.querySelector('[data-consent-action="settings"]');
    var kutu = document.getElementById('bt-consent-analytics');

    function banneriAc() {
      banner.hidden = false;
      panel.hidden = true;
      ayar.hidden = true;
    }
    function paneliAc() {
      var deger = okuTercih();
      kutu.checked = deger ? deger.analitik === true : OTURUM_TERCIHI === true;
      banner.hidden = true;
      panel.hidden = false;
      ayar.hidden = true;
      document.getElementById('bt-consent-preferences-title').focus({ preventScroll: true });
    }
    function pencereyiKapat() {
      banner.hidden = true;
      panel.hidden = true;
    }
    function ayarDugmesiniGoster() {
      ayar.hidden = false;
    }

    kok.addEventListener('click', function (olay) {
      var dugme = olay.target.closest('[data-consent-action]');
      if (!dugme) return;
      var eylem = dugme.getAttribute('data-consent-action');
      if (eylem === 'accept') kaydet(true);
      else if (eylem === 'reject') kaydet(false);
      else if (eylem === 'preferences' || eylem === 'settings') paneliAc();
      else if (eylem === 'save') kaydet(kutu.checked);
      else if (eylem === 'cancel') {
        if (okuTercih()) {
          pencereyiKapat();
          ayarDugmesiniGoster();
        } else {
          banneriAc();
        }
      }
    });

    var kayitli = okuTercih();
    if (kayitli) {
      pencereyiKapat();
      ayarDugmesiniGoster();
      if (kayitli.analitik) metricoolYukle();
    } else {
      banneriAc();
    }
  }

  window.BTMEDYAConsent = {
    allowsAnalytics: analitikIzinli,
    openPreferences: function () {
      var dugme = document.querySelector('[data-consent-action="settings"]');
      if (dugme) dugme.click();
    }
  };

  if (document.body) elemanOlustur();
  else document.addEventListener('DOMContentLoaded', elemanOlustur, { once: true });
})();
