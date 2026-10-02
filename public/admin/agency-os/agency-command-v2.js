/* BTMEDYA Agency OS v2: make the panel task-first */
(() => {
  const root = document.querySelector('.shell');
  if (!root) return;
  const hero = root.querySelector('.hero');
  if (!hero || root.querySelector('.admin-commandbar')) return;
  const bar = document.createElement('section');
  bar.className = 'admin-commandbar';
  bar.setAttribute('aria-label','Öncelikli yönetim işlemleri');
  bar.innerHTML = `
    <a href="/admin/editor/"><small>İÇERİK</small><b>Haber / AI Editör ↗</b></a>
    <a href="/admin/app.html"><small>MEDYA</small><b>Fotoğraf / Video Yükle ↗</b></a>
    <a href="/social-studio/"><small>SOSYAL</small><b>Instagram · Facebook · YouTube ↗</b></a>
    <a href="/admin/client-hub/"><small>MÜŞTERİ</small><b>Brief / Teklif / İşler ↗</b></a>`;
  hero.insertAdjacentElement('afterend', bar);
})();
