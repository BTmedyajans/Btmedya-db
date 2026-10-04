/* Teklif formu. Satır içi betik yerine ayrı dosya: kamuya açık
   sayfalarda satır içi betik yasak (AGENTS.md, gerileme kuralı 12).

   - ?hizmet=... ilgili hizmeti önceden seçer (haber ve hizmet sayfalarındaki
     "teklif al" bağlantıları bunu kullanır).
   - Talebin başladığı sayfa ("?kaynak=" ya da aynı sitedeki önceki sayfa)
     satış kaydına yazılır; hangi sayfanın müşteri getirdiğini böyle görürüz.
   - Ağ hatası kullanıcıya söylenir; gönderim sürerken düğme kilitlenir. */
(function () {
  const form = document.getElementById('f');
  const mesaj = document.getElementById('m');
  if (!form || !mesaj) return;
  const q = new URLSearchParams(location.search);
  const hizmet = q.get('hizmet');
  const secim = form.querySelector('select[name="service"]');
  if (hizmet && secim) {
    const uygun = [...secim.options].find(o => o.text.toLocaleLowerCase('tr-TR') === hizmet.toLocaleLowerCase('tr-TR'));
    if (uygun) secim.value = uygun.value || uygun.text;
  }
  let sayfa = q.get('kaynak') || '';
  if (!sayfa) {
    try { const r = new URL(document.referrer); if (r.origin === location.origin && r.pathname !== location.pathname) sayfa = r.pathname; } catch (e) { /* Doğrudan giriş. */ }
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dugme = form.querySelector('button');
    const veri = Object.fromEntries(new FormData(form));
    if (!String(veri.email || '').trim() && !String(veri.phone || '').trim()) {
      mesaj.textContent = 'Size dönebilmemiz için e-posta veya telefondan en az birini yazın.';
      return;
    }
    veri.source = 'website-offer';
    veri.sayfa = sayfa;
    veri.consent = veri.consent === 'on';
    if (dugme) dugme.disabled = true;
    mesaj.textContent = 'Gönderiliyor…';
    try {
      const r = await fetch('/api/sales/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(veri)
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        mesaj.textContent = 'Talebiniz alındı. BTMEDYA ekibi genellikle 24 saat içinde sizinle iletişime geçer.';
        form.reset();
      } else {
        mesaj.textContent = d.error || 'Talep gönderilemedi.';
      }
    } catch {
      mesaj.textContent = 'Bağlantı kurulamadı. Lütfen biraz sonra yeniden deneyin.';
    } finally {
      if (dugme) dugme.disabled = false;
    }
  });
})();
