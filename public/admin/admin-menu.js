/* BTMEDYA Yönetim Paneli · Hamburger Kategori Menüsü · 2026-10-05
   Neden: panel dokuz ayrı modülden oluşuyor ve her modülün gezinmesi
   farklıydı. Süpervizörde 13 maddelik düz bir hamburger listesi vardı;
   Autopilot ve Editör yalnız "Admin" bağlantısı veriyordu; Satış, Yayın ve
   Merak Radarı'ndan diğer modüllere geçiş yoktu. Bu betik her modülde aynı
   kategorili çekmeceyi kurar: mevcut menü düğmesi (#adminMenuToggle,
   .menu-toggle) onu açar; düğmesi olmayan modülün başlığına düğme eklenir.
   Site menüsüyle (/kategori-menu.js) aynı davranış: Esc kapatır, odak
   çekmecede kalır, bulunulan modül işaretlidir. */
(()=>{
  if(document.getElementById('btAdminMenu'))return;
  const KATEGORILER=[
    {ad:'Merkez',alt:[['Süpervizör','/admin/agency-os/','Alarm · aksiyon · ölçüm'],['Site OS','/admin/site-os/','Müşteri siteleri · sağlık · web operasyon'],['Autopilot','/admin/autopilot/','Haber radarı · trend · yayın']]},
    {ad:'İçerik',alt:[['Haber editörü','/admin/editor/','Haber · AI taslak · kaynak'],['Kaynak Masası','/admin/kaynak-masasi/','Araştırma · doğrulama · proje hafızası'],['SEO','/admin/editor/#seo','Teknik SEO · sitemap'],['Yayın ve sosyal medya','/admin/yayin/','Instagram · YouTube · TikTok'],['Halkın Merak Radarı','/admin/merak-radari/','Arama · rakip · haber fırsatı']]},
    {ad:'Müşteri & Satış',alt:[['Müşteri ve içerik merkezi','/admin/client-hub/','Firma · önizleme · onay'],['Satış hunisi','/admin/sales/','Web · WhatsApp · teklif']]},
    {ad:'Medya',alt:[['Medya kasası','/admin/app.html','Fotoğraf · video · gerçek iş arşivi']]},
    {ad:'Canlı Site',alt:[['Anasayfa','/','Yayındaki site'],['Haber merkezi','/haberler/','Yayındaki haberler'],['Reklam ve sponsorluk','/reklam-ve-sponsorluk/','Satış sayfası'],['Siyah Oda','/siyah-oda/','Program sayfası'],['Portföy','/portfoy/','Belgesel · kısa film']]}
  ];
  const kac=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const burasi=location.pathname+location.hash;
  // Bulunulan modül: yolu en uzun eşleşen bağlantı (#seo gibi çapalar dahil).
  let etkinYol='',enUzun=0;
  KATEGORILER.forEach(k=>k.alt.forEach(([,y])=>{ if(y!=='/'&&burasi.startsWith(y)&&y.length>enUzun){enUzun=y.length;etkinYol=y;} }));

  const kok=document.createElement('div');
  kok.id='btAdminMenu'; kok.className='bam'; kok.hidden=true;
  kok.setAttribute('role','dialog'); kok.setAttribute('aria-modal','true'); kok.setAttribute('aria-label','BTMEDYA yönetim menüsü');
  kok.innerHTML='<div class="bam-perde" data-bam-kapat></div><div class="bam-panel">'+
    '<div class="bam-ust"><span class="bam-marka">BTMEDYA <b>YÖNETİM</b></span><button type="button" class="bam-kapat" data-bam-kapat aria-label="Menüyü kapat">Kapat ×</button></div>'+
    '<nav class="bam-liste" aria-label="Yönetim kategorileri">'+KATEGORILER.map(k=>
      '<section class="bam-grup"><h2>'+kac(k.ad)+'</h2><ul>'+k.alt.map(([ad,y,acik])=>
        '<li><a href="'+y+'"'+(y===etkinYol?' aria-current="page"':'')+'><b>'+kac(ad)+'</b><small>'+kac(acik)+'</small></a></li>').join('')+'</ul></section>').join('')+
    '</nav></div>';
  // body'ye değil html'e: bazı modüller body'ye transform/perspective verebilir.
  document.documentElement.appendChild(kok);
  const panel=kok.querySelector('.bam-panel');

  let tetik=null;
  const TETIKLER='#adminMenuToggle,.menu-toggle,.bam-dugme';
  const durum=a=>document.querySelectorAll(TETIKLER).forEach(d=>d.setAttribute('aria-expanded',String(a)));
  const ac=t=>{ tetik=t||null; kok.hidden=false; document.documentElement.classList.add('bam-acik'); requestAnimationFrame(()=>kok.classList.add('is-acik')); durum(true); (kok.querySelector('[aria-current]')||kok.querySelector('a')).focus(); };
  const kapat=()=>{ kok.classList.remove('is-acik'); document.documentElement.classList.remove('bam-acik'); durum(false); setTimeout(()=>{ if(!kok.classList.contains('is-acik')) kok.hidden=true; },240); tetik&&tetik.focus(); };
  kok.addEventListener('click',e=>{ if(e.target.closest('[data-bam-kapat]')) kapat(); else if(e.target.closest('a')) kapat(); });
  document.addEventListener('keydown',e=>{
    if(kok.hidden)return;
    if(e.key==='Escape'){e.preventDefault();kapat();return;}
    if(e.key==='Tab'){
      const o=[...panel.querySelectorAll('a,button')]; if(!o.length)return;
      const ilk=o[0],son=o[o.length-1];
      if(e.shiftKey&&document.activeElement===ilk){e.preventDefault();son.focus();}
      else if(!e.shiftKey&&document.activeElement===son){e.preventDefault();ilk.focus();}
    }
  });
  // Eski menü düğmeleri yakalama evresinde bu çekmeceye yönlenir; eski
  // menünün (agency-hamburger-v3) kendi açma kodu çalışmaz.
  document.addEventListener('click',e=>{
    const t=e.target.closest(TETIKLER); if(!t)return;
    e.preventDefault(); e.stopImmediatePropagation();
    kok.hidden?ac(t):kapat();
  },true);
  document.querySelectorAll(TETIKLER).forEach(d=>{d.setAttribute('aria-controls','btAdminMenu');d.setAttribute('aria-haspopup','dialog');});
  if(!document.querySelector(TETIKLER)){
    const d=document.createElement('button');
    d.type='button'; d.className='bam-dugme'; d.setAttribute('aria-expanded','false');
    d.setAttribute('aria-controls','btAdminMenu'); d.setAttribute('aria-haspopup','dialog');
    d.innerHTML='<span aria-hidden="true">☰</span> Menü';
    const baslik=document.querySelector('header');
    if(baslik) baslik.appendChild(d); else { d.classList.add('bam-dugme-sabit'); document.body.appendChild(d); }
  }
})();
