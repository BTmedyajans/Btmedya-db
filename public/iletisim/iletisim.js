/* İletişim formu. CSP script-src 'self' altında çalışsın diye
   sayfadan buraya taşındı; davranış birebir aynı. */
document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('contactForm');
  const msg=document.getElementById('cf-msg');
  const btn=document.getElementById('cf-submit');
  if(!form) return;
  form.addEventListener('submit',async(e)=>{
    e.preventDefault();
    btn.disabled=true;
    btn.textContent='GÖNDERİLİYOR...';
    msg.className='form-msg';
    msg.textContent='';
    const data={
      name:form.name.value.trim(),
      email:form.email.value.trim(),
      phone:form.phone.value.trim(),
      subject:form.subject.value,
      message:form.message.value.trim(),
      consent:form.consent.checked,
      _honey:form._honey.value
    };
    try{
      const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const j=await r.json();
      if(j.ok){
        msg.className='form-msg ok';
        msg.textContent='Mesajınız başarıyla gönderildi. En kısa sürede dönüş yapacağız!';
        form.reset();
      }else{
        msg.className='form-msg err';
        msg.textContent=j.error||'Bir hata oluştu.';
      }
    }catch(err){
      msg.className='form-msg err';
      msg.textContent='Bağlantı hatası. Lütfen tekrar deneyin.';
    }
    btn.disabled=false;
    btn.textContent='MESAJ GÖNDER';
  });
});
