/* /haberler/ sayfasinin canli akisi.

   Statik HTML, JS calismazsa gorunen yedektir; bu dosya onu panelde
   yayinlanan haberlerle degistirir. Satir ici <script> yerine ayri dosya:
   kamuya acik sayfalarda satir ici betik eklenmiyor (AGENTS.md). */
(function () {
  'use strict';
  var grid = document.querySelector('#son-dakika');
  var yerelListe = document.querySelector('#balikesir .latest-list');
  var guncelListe = document.querySelector('#guncel-list');
  var guncelTarih = document.querySelector('#guncel-tarih');

  function kartGorseli(yol) { return String(yol || '').replace(/(\/assets\/haber-kapak\/[^/]+)\.webp$/, '$1-foto.webp'); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  /* Yerel haber tanimi ana sayfadaki "BALIKESİR" ve "GÜNDEM" filtreleriyle
     ayni; iki sayfa ayni haberi farkli bolume koymasin. */
  function yerelMi(n) { return /(yerel|pazar|alisveris|altyapi|balikesir|gundem|asayis|yangin|afet)/.test(norm(n.category)); }
  function anaKategori(n) { return norm(String(n.category || '').split(/[·/]/)[0]).trim(); }
  function kaynakAdi(n) {
    try { return n.source_url ? new URL(n.source_url).hostname.replace(/^www\./, '') : 'BTMEDYA'; } catch (e) { return 'BTMEDYA'; }
  }
  function tarih(n) {
    var t = n.published_at ? new Date(n.published_at) : null;
    return t && !isNaN(t) ? t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }

  function satir(n) {
    var img = n.cover_url ? '<span class="latest-kapak"><img src="' + esc(kartGorseli(n.cover_url)) + '" alt="" loading="lazy" decoding="async"></span>' : '';
    return '<a class="latest-item' + (img ? ' kapakli' : '') + '" href="/haberler/' + encodeURIComponent(n.slug) + '">' + img +
      '<span class="latest-metin"><small>' + esc(n.category || 'HABER') + '</small><h3>' + esc(n.title) + '</h3><p>' + esc(n.excerpt || '') +
      '</p><span class="news-meta">' + esc(tarih(n)) + ' · <span class="source">Kaynak: ' + esc(kaynakAdi(n)) + '</span></span></span></a>';
  }

  function kart(n, buyuk) {
    var gorsel = n.cover_url ? '<img class="kart-gorsel" src="' + esc(kartGorseli(n.cover_url)) + '" alt="" loading="' + (buyuk ? 'eager' : 'lazy') + '" decoding="async">' : '';
    var baslik = buyuk ? '<h2>' + esc(n.title) + '</h2>' : '<h3>' + esc(n.title) + '</h3>';
    return gorsel + '<div class="veil"></div><div class="inner"><span class="news-tag">' + esc(n.category || 'HABER') + '</span>' + baslik +
      '<p>' + esc(n.excerpt || '') + '</p><div class="news-meta">' + esc(tarih(n)) + ' · ' + esc(n.author || 'BTMEDYA Haber Merkezi') + '</div></div>';
  }

  /* Vitrin: en yeni yerel haber one cikar (BTMEDYA Balikesir merkezli bir
     yayin), yanindaki iki kart farkli ana kategorilerden secilir ki ust
     bant tek konuya kilitlenmesin. Onceki surum video tasiyan ilk haberi
     seciyordu ve bu hep 2024 arsivine dusuyordu. */
  function vitrinSec(guncel) {
    var ana = guncel.filter(yerelMi)[0] || guncel[0];
    var secilen = [ana];
    guncel.forEach(function (n) {
      if (secilen.length >= 3 || secilen.indexOf(n) > -1) return;
      if (secilen.every(function (s) { return anaKategori(s) !== anaKategori(n); })) secilen.push(n);
    });
    guncel.forEach(function (n) { if (secilen.length < 3 && secilen.indexOf(n) < 0) secilen.push(n); });
    return secilen;
  }

  async function yukle() {
    var r = await fetch('/api/news?limit=100', { headers: { Accept: 'application/json' } });
    if (!r.ok) return;
    var j = await r.json();
    var yayinda = (Array.isArray(j.items) ? j.items : []).filter(function (n) { return n.status === 'published'; });
    /* Arsiv (2024-2025 saha haberleri) kendi bolumunde kalir. archive_note
       alani guncel haberlerde de kaynak notu olarak dolu, bu yuzden ayrim
       yil uzerinden yapilir. */
    var guncel = yayinda.filter(function (n) { return /^2026/.test(String(n.published_at || '')) && !/202[0-5]/.test(String(n.original_date || '')); });
    if (!guncel.length) return;

    var vitrin = vitrinSec(guncel);
    if (grid) {
      var kartlar = grid.querySelectorAll('.news-card');
      vitrin.forEach(function (n, i) {
        var el = kartlar[i];
        if (!el) return;
        el.href = '/haberler/' + encodeURIComponent(n.slug);
        el.removeAttribute('aria-label');
        el.classList.remove('video-card');
        el.classList.add('gorselli');
        el.innerHTML = kart(n, i === 0);
      });
    }
    var gosterilen = vitrin.slice();
    var yerel = guncel.filter(function (n) { return yerelMi(n) && gosterilen.indexOf(n) < 0; }).slice(0, 6);
    gosterilen = gosterilen.concat(yerel);
    var diger = guncel.filter(function (n) { return gosterilen.indexOf(n) < 0; }).slice(0, 9);
    if (yerelListe && yerel.length) yerelListe.innerHTML = yerel.map(satir).join('');
    if (guncelListe && diger.length) guncelListe.innerHTML = diger.map(satir).join('');
    if (guncelTarih) guncelTarih.textContent = 'Son güncelleme: ' + tarih(guncel[0]);
  }

  yukle().catch(function (e) { console.warn('Canlı haber akışı kullanılamadı', e); });

  var ara = document.getElementById('archiveSearch');
  var arsiv = Array.prototype.slice.call(document.querySelectorAll('.archive-card'));
  if (ara) ara.addEventListener('input', function () {
    var q = ara.value.toLocaleLowerCase('tr-TR').trim();
    arsiv.forEach(function (x) { x.hidden = !!q && !String(x.dataset.search || '').includes(q); });
  });
})();
