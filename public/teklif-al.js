/* Teklif formu: ağ hatasını görünür kılar ve çift gönderimi engeller. */
(function () {
  const form = document.getElementById('f');
  const mesaj = document.getElementById('m');
  if (!form || !mesaj) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dugme = form.querySelector('button');
    const veri = Object.fromEntries(new FormData(form));
    veri.source = 'website-offer';
    veri.consent = veri.consent === 'on';
    if (dugme) dugme.disabled = true;
    mesaj.textContent = 'Gönderiliyor…';
    try {
      const r = await fetch('/api/sales/lead', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(veri) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { mesaj.textContent='Talebiniz alındı. BTMEDYA ekibi sizinle iletişime geçecek.'; form.reset(); }
      else mesaj.textContent=d.error||'Talep gönderilemedi.';
    } catch { mesaj.textContent='Bağlantı kurulamadı. Lütfen biraz sonra yeniden deneyin.'; }
    finally { if (dugme) dugme.disabled=false; }
  });
})();
