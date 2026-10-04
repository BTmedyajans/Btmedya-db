/* /haberler/ BTMEDYA Haber Merkezi V14 · 2026-10-04
   Ulusal kanalların sırası: son haber şeridi → numaralı manşet → sürmanşet →
   kategori blokları. ?kategori=<anahtar> aynı sayfada kategori sayfasına
   döner; adres geçmişe yazılır, geri tuşu çalışır.
   Kurallar:
   - Bir haber anasayfa akışında bir kez görünür (manşetteki tekrar etmez).
   - Kapakta başlık zaten basılı; manşette ikinci bir başlık katmanı yok.
   - "SON DAKİKA" yalnız son 3 saatte yayımlanmış haber varsa yazar.
   - Kategoriler anasayfadaki (home.js CATS) sekiz anahtarla aynıdır. */
(function () {
  'use strict';

  var KATEGORILER = [
    ['balikesir', 'Balıkesir', /\b(yerel|balikesir|altieylul|karesi|bandirma|edremit|ayvalik|burhaniye|gonen|susurluk|pazar|altyapi)\b/],
    ['gundem', 'Gündem', /\b(gundem|asayis|yangin|afet|guvenlik|trafik)\b/],
    ['ekonomi', 'Ekonomi', /\b(ekonomi|emlak|esnaf|tarim|ticaret|fiyat)\b/],
    ['kultur', 'Kültür Sanat', /\b(kultur|zanaat|sanat|gastronomi|turizm|insan hikayesi|yasam|moda|etkinlik)\b/],
    ['egitim', 'Eğitim', /\b(egitim|universite|okul|sinav)\b/],
    ['saglik', 'Sağlık', /\b(saglik|beslenme|bakim|hastane)\b/],
    ['spor', 'Spor', /\b(spor|futbol|basketbol|turnuva)\b/],
    ['teknoloji', 'Teknoloji', /\b(yapay zeka|teknoloji|yazilim|dijital|ai)\b/]
  ];
  var AD = {}; KATEGORILER.forEach(function (k) { AD[k[0]] = k[1]; });

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); }
  function norm(s) { return String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function bul(t) { var k = KATEGORILER.find(function (x) { return x[2].test(t); }); return k ? k[0] : null; }
  function kategori(n) {
    var c = String(n.category || '');
    return bul(norm(c.split('·')[0])) || bul(norm(c)) || bul(norm(n.title + ' ' + (n.excerpt || ''))) || 'gundem';
  }
  function kapak(n) { return n.cover_url || ''; }
  // Kartlarda metinsiz/sade kare; manşette başlığı basılı tam kapak.
  function kare(n) { return kapak(n).replace(/(\/assets\/haber-kapak\/[^/]+)\.webp$/, '$1-foto.webp'); }
  function adres(n) { return '/haberler/' + encodeURIComponent(n.slug); }
  function zaman(n) { var t = Date.parse(n.published_at || ''); return isNaN(t) ? null : t; }
  function onceYaz(n) {
    var t = zaman(n); if (!t) return '';
    var fark = (Date.now() - t) / 60000;
    if (fark < 1) return 'Az önce';
    if (fark < 60) return Math.round(fark) + ' dk önce';
    if (fark < 1440) return Math.round(fark / 60) + ' saat önce';
    if (fark < 2880) return 'Dün';
    return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  }
  function tamTarih(n) { var t = zaman(n); return t ? new Date(t).toISOString() : ''; }
  var gorselTuru = {};
  function kaynakEtiketi(n) {
    var k = gorselTuru[n.slug];
    return k === 'gercek' ? 'Gerçek çekim' : k === 'arsiv' ? 'Arşiv fotoğrafı' : k === 'grafik' ? 'BTMEDYA grafik' : k === 'harita' ? 'Harita' : 'Temsili görsel';
  }

  // Yardımcılar yukarıda: test, kategori eşlemesini sayfa olmadan çalıştırır.
  var kok = document.querySelector('.hm');
  if (!kok) return;
  var azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Kart kalıpları ---- */
  function kart(n, s, sinif) {
    var k = n._kat;
    return '<a class="hm-kart hm-gor ' + (sinif || '') + '" style="--s:' + (s || 0) + '" data-kat="' + k + '" href="' + adres(n) + '">' +
      '<figure><img src="' + esc(kare(n)) + '" alt="" loading="lazy" decoding="async" width="600" height="450"><span class="hm-kaynak">' + esc(kaynakEtiketi(n)) + '</span></figure>' +
      '<span class="hm-ust-bilgi"><span class="hm-kat">' + esc(AD[k]) + '</span><time class="hm-zaman" datetime="' + tamTarih(n) + '">' + esc(onceYaz(n)) + '</time></span>' +
      '<h3>' + esc(n.title) + '</h3></a>';
  }
  function satir(n, s) {
    return '<a class="hm-satir hm-gor" style="--s:' + (s || 0) + '" data-kat="' + n._kat + '" href="' + adres(n) + '">' +
      '<img src="' + esc(kare(n)) + '" alt="" loading="lazy" decoding="async" width="96" height="72">' +
      '<span><h3>' + esc(n.title) + '</h3><time class="hm-zaman" datetime="' + tamTarih(n) + '">' + esc(onceYaz(n)) + '</time></span></a>';
  }

  /* ---- Bölümler ---- */
  function serit(liste) {
    var yer = kok.querySelector('[data-hm-serit]'); if (!yer) return;
    var son = liste.slice(0, 8);
    var taze = son.length && Date.now() - zaman(son[0]) < 3 * 3600 * 1000;
    var parca = son.map(function (n) {
      var t = zaman(n), saat = t ? new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
      return '<a href="' + adres(n) + '"><time datetime="' + tamTarih(n) + '">' + esc(saat) + '</time>' + esc(n.title) + '</a>';
    }).join('');
    yer.innerHTML = '<b>' + (taze ? 'SON DAKİKA' : 'SON HABERLER') + '</b><div class="hm-serit-pencere"><div class="hm-serit-iz" style="--sure:' + (son.length * 9) + 's">' +
      parca + '<span aria-hidden="true" style="display:contents">' + parca.replace(/<a /g, '<a tabindex="-1" ') + '</span></div></div>';
  }

  var mansetZamanlayici = null;
  function manset(liste) {
    var yer = kok.querySelector('[data-hm-manset]'); if (!yer) return;
    var adet = liste.length;
    yer.innerHTML = '<div class="hm-manset-iz" tabindex="0" aria-roledescription="manşet" aria-label="Manşet haberleri">' + liste.map(function (n, i) {
      return '<a class="hm-manset-kart" data-kat="' + n._kat + '" href="' + adres(n) + '" aria-label="' + (i + 1) + '. manşet: ' + esc(n.title) + '">' +
        '<img src="' + esc(kapak(n)) + '" alt="' + esc(n.title) + '" width="1200" height="675" ' + (i ? 'loading="lazy"' : 'fetchpriority="high"') + ' decoding="async">' +
        '<span class="hm-manset-alt"><span class="hm-kat">' + esc(AD[n._kat]) + '</span><p>' + esc(n.excerpt || '') + '</p><time class="hm-zaman" datetime="' + tamTarih(n) + '">' + esc(onceYaz(n)) + '</time></span></a>';
    }).join('') + '</div><div class="hm-sayac" style="--adet:' + adet + '" role="group" aria-label="Manşet numaraları">' +
      liste.map(function (n, i) { return '<button type="button" aria-label="' + (i + 1) + '. manşet" ' + (i ? '' : 'aria-current="true"') + '>' + (i + 1) + '</button>'; }).join('') + '</div>';
    var iz = yer.querySelector('.hm-manset-iz'), dugmeler = yer.querySelectorAll('.hm-sayac button'), sira = 0, bekle = 6000;
    yer.style.setProperty('--bekle', bekle / 1000 + 's');
    function isaretle(i) {
      if (i === sira && dugmeler[i].getAttribute('aria-current')) return;
      sira = i;
      dugmeler.forEach(function (d, j) { if (j === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    }
    function git(i) { iz.scrollTo({ left: i * iz.clientWidth, behavior: azHareket ? 'auto' : 'smooth' }); isaretle(i); }
    dugmeler.forEach(function (d, i) { d.addEventListener('click', function () { durdur(); git(i); }); });
    // Parmakla kaydırma: hangi kart ortadaysa numarası işaretlenir.
    var bekleyen = 0;
    iz.addEventListener('scroll', function () {
      cancelAnimationFrame(bekleyen);
      bekleyen = requestAnimationFrame(function () { isaretle(Math.round(iz.scrollLeft / Math.max(1, iz.clientWidth))); });
    }, { passive: true });
    function dongu() {
      clearInterval(mansetZamanlayici);
      if (azHareket || adet < 2) return;
      yer.classList.remove('durdu');
      mansetZamanlayici = setInterval(function () { git((sira + 1) % adet); }, bekle);
    }
    function durdur() { clearInterval(mansetZamanlayici); mansetZamanlayici = null; yer.classList.add('durdu'); }
    ['pointerdown', 'focusin', 'mouseenter'].forEach(function (o) { yer.addEventListener(o, durdur); });
    yer.addEventListener('mouseleave', dongu);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) dongu(); else durdur(); }); }, { threshold: .4 }).observe(yer);
    else dongu();
    document.addEventListener('visibilitychange', function () { if (document.hidden) durdur(); });
  }

  // Masaüstünde manşetin yanındaki saatli akış (mobilde gizli; şerit aynı işi görür).
  function akis(liste) {
    var yer = kok.querySelector('[data-hm-akis]'); if (!yer) return;
    yer.innerHTML = liste.map(function (n) {
      var t = zaman(n), saat = t ? new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
      return '<li data-kat="' + n._kat + '"><a href="' + adres(n) + '"><time datetime="' + tamTarih(n) + '">' + esc(saat) + '</time><span class="hm-kat">' + esc(AD[n._kat]) + '</span><b>' + esc(n.title) + '</b></a></li>';
    }).join('');
  }

  function surmanset(liste) {
    var yer = kok.querySelector('[data-hm-sur]'); if (!yer) return;
    yer.innerHTML = liste.map(function (n, i) { return kart(n, i % 4); }).join('');
  }

  function bloklar(gruplar) {
    var yer = kok.querySelector('[data-hm-bloklar]'); if (!yer) return;
    var sira = 0;
    yer.innerHTML = KATEGORILER.filter(function (k) { return gruplar[k[0]].length; }).map(function (k) {
      var l = gruplar[k[0]], ilk = l[0], gerisi = l.slice(1, 5);
      return '<section class="hm-blok" data-kat="' + k[0] + '" aria-labelledby="hm-b-' + k[0] + '">' +
        '<div class="hm-bolum-bas"><div><span class="hm-no" aria-hidden="true">' + ('0' + (++sira)).slice(-2) + '</span><h2 id="hm-b-' + k[0] + '">' + esc(k[1]) + '</h2></div><a href="/haberler/?kategori=' + k[0] + '" data-hm-kategori="' + k[0] + '">Tümü →</a></div>' +
        '<div class="hm-blok-ic">' + kart(ilk, 0, 'hm-buyuk') + (gerisi.length ? '<div class="hm-satirlar">' + gerisi.map(function (n, i) { return satir(n, i + 1); }).join('') + '</div>' : '') + '</div></section>';
    }).join('');
  }

  /* ---- Kategori sayfası ---- */
  var tumHaberler = [];
  function kategoriGoster(anahtar, gecmis) {
    var gecerli = AD[anahtar] ? anahtar : '';
    kok.classList.toggle('kategori-modu', !!gecerli);
    rayIsaretle(gecerli || 'tumu');
    var bas = document.querySelector('title');
    if (gecerli) {
      var l = tumHaberler.filter(function (n) { return n._kat === gecerli; });
      var yer = kok.querySelector('[data-hm-katsayfa]');
      yer.setAttribute('data-kat', gecerli);
      yer.innerHTML = '<div class="hm-kat-bas"><h2 aria-label="' + esc(AD[gecerli]) + '">' + esc(AD[gecerli]) + '<span class="hm-golge" aria-hidden="true">' + esc(AD[gecerli]) + '</span></h2><p>' + l.length + ' haber · en yeniden eskiye</p></div>' +
        (l.length ? '<div class="hm-izgara">' + l.map(function (n, i) { return kart(n, i % 3); }).join('') + '</div>' : '<p class="hm-bos">Bu kategoride henüz yayımlanmış haber yok.</p>');
      if (bas) bas.textContent = AD[gecerli] + ' Haberleri | BTMEDYA Haber Merkezi';
      gozle(yer);
    } else if (bas) bas.textContent = 'BTMEDYA Haber Merkezi | Balıkesir ve Türkiye Gündemi';
    if (gecmis) {
      history.pushState({ kategori: gecerli }, '', gecerli ? '/haberler/?kategori=' + gecerli : '/haberler/');
      window.scrollTo({ top: 0, behavior: azHareket ? 'auto' : 'smooth' });
    }
  }
  var ray = kok.querySelector('.hm-ray-iz'), imlec = kok.querySelector('.hm-imlec');
  function rayIsaretle(anahtar) {
    document.querySelectorAll('.hm-cekmece-liste a').forEach(function (a) {
      if (a.getAttribute('data-hm-kategori') === anahtar) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var etiket = kok.querySelector('[data-hm-etkin]');
    if (etiket) { etiket.textContent = anahtar === 'tumu' ? 'Tümü' : AD[anahtar] || 'Tümü'; etiket.parentNode.setAttribute('data-kat', anahtar); }
    if (!ray) return;
    var etkin = null;
    ray.querySelectorAll('a').forEach(function (a) {
      var bu = a.getAttribute('data-hm-kategori') === anahtar;
      if (bu) { a.setAttribute('aria-current', 'page'); etkin = a; } else a.removeAttribute('aria-current');
    });
    if (etkin && imlec) {
      imlec.style.setProperty('--x', etkin.offsetLeft + 'px');
      imlec.style.setProperty('--w', etkin.offsetWidth + 'px');
      imlec.style.setProperty('--kat', getComputedStyle(etkin).getPropertyValue('--kat'));
      var hedef = etkin.offsetLeft - ray.clientWidth / 2 + etkin.offsetWidth / 2;
      ray.scrollTo({ left: hedef, behavior: azHareket ? 'auto' : 'smooth' });
    }
  }
  function kategoriTik(e) {
    var a = e.target.closest('[data-hm-kategori]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (!tumHaberler.length) return; // Veri gelmediyse bağlantı normal sayfa yüklemesi yapar.
    e.preventDefault();
    cekmeceKapat();
    var k = a.getAttribute('data-hm-kategori');
    kategoriGoster(k === 'tumu' ? '' : k, true);
  }
  kok.addEventListener('click', kategoriTik);
  /* Mobil kategori çekmecesi (hamburger). Açıkken sayfa kaymaz, Esc kapatır,
     odak çekmeceye girer ve kapanınca düğmeye döner. */
  var cekmece = kok.querySelector('.hm-cekmece'), acDugme = kok.querySelector('[data-hm-ac]');
  // Üst çubuk kendi katmanında; çekmece body'ye taşınınca her şeyin üstünde açılır.
  if (cekmece) {
    document.body.appendChild(cekmece);
    cekmece.addEventListener('click', function (e) { if (e.target.closest('[data-hm-kapat]') || e.target === cekmece) { cekmeceKapat(); return; } kategoriTik(e); });
  }
  function cekmeceAc() {
    if (!cekmece) return;
    cekmece.hidden = false; acDugme.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    var etkin = cekmece.querySelector('a[aria-current]') || cekmece.querySelector('a'); if (etkin) etkin.focus();
  }
  function cekmeceKapat() {
    if (!cekmece || cekmece.hidden) return;
    cekmece.hidden = true; acDugme.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = ''; acDugme.focus();
  }
  if (acDugme) acDugme.addEventListener('click', cekmeceAc);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cekmeceKapat(); });

  window.addEventListener('popstate', function () { kategoriGoster(new URLSearchParams(location.search).get('kategori') || '', false); });

  /* ---- Hareket: görünür olunca belirme ---- */
  var gozcu = null;
  function gozle(alan) {
    if (azHareket || !('IntersectionObserver' in window)) return;
    if (!gozcu) gozcu = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('gorundu'); gozcu.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    (alan || kok).querySelectorAll('.hm-gor:not(.gorundu)').forEach(function (el) { gozcu.observe(el); });
  }
  // Scroll timeline olmayan tarayıcılar için ilerleme çubuğu.
  var cubuk = document.querySelector('.hm-ilerleme');
  if (cubuk && !(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'))) {
    var cizim = 0;
    window.addEventListener('scroll', function () {
      cancelAnimationFrame(cizim);
      cizim = requestAnimationFrame(function () {
        var h = document.documentElement.scrollHeight - innerHeight;
        cubuk.style.setProperty('--hm-oran', h > 0 ? Math.min(1, scrollY / h) : 0);
      });
    }, { passive: true });
  }
  // Yapışkan ray üst çubuğun hemen altında dursun (62/72 px, temaya göre değişebilir).
  var ust = document.querySelector('.topbar');
  if (ust) document.documentElement.style.setProperty('--hm-ust', ust.getBoundingClientRect().height + 'px');
  // Yayın saati: kanal ekranlarındaki köşe saati; dakika değişince güncellenir.
  var saat = kok.querySelector('[data-hm-saat]');
  function saatYaz() { if (saat) saat.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
  saatYaz(); setInterval(saatYaz, 15000);
  var tarih = kok.querySelector('[data-hm-tarih]');
  if (tarih) tarih.textContent = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* ---- Akışın kurulması ---- */
  async function yukle() {
    var cevap = await fetch('/api/news?limit=100&ozet=1', { headers: { Accept: 'application/json' } });
    if (!cevap.ok) return;
    var veri = await cevap.json();
    try { var g = await fetch('/data/haber-kapak-kaynagi.json', { headers: { Accept: 'application/json' } }); if (g.ok) gorselTuru = await g.json(); } catch (e) { /* etiket varsayılana düşer */ }
    // Arşiv (2024) aşağıda statik bölümde; akış yalnız güncel yayınları alır.
    var guncel = (Array.isArray(veri.items) ? veri.items : []).filter(function (n) { return n.status === 'published' && n.cover_url && String(n.published_at || '') >= '2026'; });
    if (!guncel.length) return;
    guncel.forEach(function (n) { n._kat = kategori(n); });
    guncel.sort(function (a, b) { return (zaman(b) || 0) - (zaman(a) || 0); });
    tumHaberler = guncel;

    // Manşet: en yeni 10 haber, bir kategoriden en fazla 3 (tek konu manşeti doldurmasın).
    var sayac = {}, mansetler = [];
    guncel.forEach(function (n) { if (mansetler.length < 10 && (sayac[n._kat] || 0) < 3) { mansetler.push(n); sayac[n._kat] = (sayac[n._kat] || 0) + 1; } });
    var kalan = guncel.filter(function (n) { return mansetler.indexOf(n) < 0; });
    var surler = kalan.slice(0, 8);
    var gruplar = {}; KATEGORILER.forEach(function (k) { gruplar[k[0]] = []; });
    kalan.slice(8).forEach(function (n) { gruplar[n._kat].push(n); });
    // Bloğu boş kalan kategoriye sürmanşet dışındaki en yeni haberleri ver; yine de tekrar etme.
    KATEGORILER.forEach(function (k) { if (!gruplar[k[0]].length) gruplar[k[0]] = kalan.filter(function (n) { return n._kat === k[0] && surler.indexOf(n) < 0; }); });

    document.querySelectorAll('[data-hm-sayi]').forEach(function (el) {
      var k = el.getAttribute('data-hm-sayi');
      el.textContent = (k === 'tumu' ? guncel.length : guncel.filter(function (n) { return n._kat === k; }).length) + ' haber';
    });
    serit(guncel);
    akis(guncel.slice(0, 7));
    manset(mansetler);
    surmanset(surler);
    bloklar(gruplar);
    var yedek = kok.querySelector('[data-hm-yedek]'); if (yedek) yedek.remove();
    if (!azHareket) document.documentElement.classList.add('hm-hareket');
    gozle();
    kategoriGoster(new URLSearchParams(location.search).get('kategori') || '', false);
  }
  rayIsaretle(new URLSearchParams(location.search).get('kategori') || 'tumu');
  yukle().catch(function (e) { console.warn('Haber akışı yüklenemedi', e); });

  /* ---- Arşiv araması ---- */
  var ara = document.getElementById('archiveSearch');
  if (ara) {
    var kartlar = Array.prototype.slice.call(document.querySelectorAll('[data-arsiv]'));
    var sayi = document.querySelector('[data-arsiv-sayi]');
    ara.addEventListener('input', function () {
      var q = norm(ara.value.trim()), gorunen = 0;
      kartlar.forEach(function (x) { var u = !q || norm(x.textContent + ' ' + x.getAttribute('data-arsiv')).indexOf(q) > -1; x.hidden = !u; if (u) gorunen++; });
      if (sayi) sayi.textContent = gorunen + ' arşiv haberi';
    });
  }
})();
