/* BTMEDYA yönetim çubuğu (11 Ekim, kullanıcı isteği: "admin panelini
   sadeleştirip siteye entegre et; admin panelinden yönetilsin").

   Yönetici siteyi gezerken her sayfada panelin en çok kullanılan kapılarına
   tek dokunuşla ulaşır: haber yaz (bulunduğu kategoriyle), yayın masası,
   otomasyon, sosyal, kaynaklar. Yalnız girişte konan bt_yonetici=1
   bayrağı varsa görünür (src/worker.js YONETICI_BAYRAGI); bayrak gizli bilgi
   taşımaz, bağlantılar yine oturum ister. Giriş filmi sürerken görünmez
   (ekranda yalnız film). */
(() => {
  if (!/(?:^|;\s*)bt_yonetici=1(?:;|$)/.test(document.cookie)) return;
  if (location.pathname.startsWith('/admin')) return;

  // Editördeki kategori seçeneklerinin yazımı (public/admin/editor).
  const EDITOR_KATEGORI = { balikesir: 'Balıkesir', turkiye: 'Türkiye', dunya: 'Dünya', gundem: 'Gündem',
    ekonomi: 'Ekonomi', kultur: 'Kültür · Sanat', egitim: 'Eğitim', saglik: 'Sağlık', spor: 'Spor',
    teknoloji: 'Teknoloji · AI', yasam: 'Yaşam' };
  const kat = (location.pathname.match(/^\/haberler\/([a-z]+)\//) || [])[1] || '';
  const yaz = '/admin/editor/' + (EDITOR_KATEGORI[kat] ? '?kategori=' + encodeURIComponent(EDITOR_KATEGORI[kat]) : '');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/yonetim-cubugu.css?v=20261011-1';
  document.head.appendChild(link);

  const kok = document.createElement('nav');
  kok.className = 'bt-yonetim';
  kok.setAttribute('aria-label', 'BTMEDYA yönetim kısayolları');
  const ogeler = [
    ['/admin/', 'Panel'],
    [yaz, EDITOR_KATEGORI[kat] ? 'Bu kategoriye yaz' : 'Haber yaz'],
    ['/admin/yayin/', 'Yayın masası'],
    ['/admin/autopilot/', 'Otomasyon'],
    ['/admin/social-os/', 'Sosyal'],
    ['/admin/kaynak-masasi/', 'Kaynaklar']
  ];
  kok.innerHTML = '<button type="button" class="bt-yonetim-ac" aria-expanded="false">Yönetim</button>' +
    '<div class="bt-yonetim-liste" hidden>' +
    ogeler.map(([h, ad]) => '<a href="' + h + '">' + ad + '</a>').join('') +
    '<button type="button" class="bt-yonetim-cikis">Çıkış</button></div>';
  document.body.appendChild(kok);

  const ac = kok.querySelector('.bt-yonetim-ac'), liste = kok.querySelector('.bt-yonetim-liste');
  ac.addEventListener('click', () => {
    const acik = liste.hidden;
    liste.hidden = !acik;
    ac.setAttribute('aria-expanded', String(acik));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !liste.hidden) { liste.hidden = true; ac.setAttribute('aria-expanded', 'false'); } });
  kok.querySelector('.bt-yonetim-cikis').addEventListener('click', async () => {
    try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) { /* ağ yoksa da bayrak silinir */ }
    document.cookie = 'bt_yonetici=; Path=/; Max-Age=0; Secure; SameSite=Lax';
    kok.remove();
  });
})();
