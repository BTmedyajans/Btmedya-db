/* BTMEDYA Paket Oluşturucu · /hizmetler/ · 2026-10-05
   Neden: BTMEDYA tanıtım dosyasındaki (v2) "Kendi paketini oluştur"
   akışı siteye hiç taşınmamıştı; okur hazır üç paketin dışında bir
   kapsam istediğinde boş bir WhatsApp penceresiyle kalıyordu. Okur
   kalemleri seçer, seçimler WhatsApp mesajına yazılır; teklif konuşması
   bağlamıyla başlar. Fiyat hesaplanmaz: kapsam yazılı teklifte netleşir.

   Betik çalışmazsa düğme genel WhatsApp mesajıyla çalışmaya devam eder
   (HTML'deki href). */
(()=>{
  const kok=document.querySelector('[data-paket-olusturucu]');
  if(!kok)return;
  const kutular=[...kok.querySelectorAll('input[type=checkbox][name=kalem]')];
  const ozet=kok.querySelector('[data-paket-ozet]');
  const sayac=kok.querySelector('[data-paket-sayi]');
  const dugme=kok.querySelector('[data-paket-gonder]');
  const TEL='905416401029';
  const guncelle=()=>{
    const secili=kutular.filter(k=>k.checked).map(k=>k.value);
    sayac.textContent=String(secili.length);
    ozet.textContent=secili.length?secili.join(' · '):'Henüz seçim yapılmadı.';
    const metin=secili.length
      ?'Merhaba BTMEDYA, kendi paketimi oluşturdum: '+secili.join(', ')+'. Markam: '
      :'Merhaba BTMEDYA, kendi paketimi oluşturmak istiyorum. Markam: ';
    dugme.href='https://wa.me/'+TEL+'?text='+encodeURIComponent(metin);
    dugme.classList.toggle('is-hazir',secili.length>0);
  };
  kutular.forEach(k=>k.addEventListener('change',guncelle));
  guncelle();
})();
