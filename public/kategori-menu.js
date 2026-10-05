/* BTMEDYA Hamburger Kategori Menüsü · 2026-10-05
   Neden: sitede üç ayrı menü vardı. Anasayfada kategorili bir panel, alt
   sayfalarda sekiz bağlantılık düz bir liste vardı; yaklaşık 20 sayfada ise
   hiç menü yoktu. Okur sayfadan sayfaya geçince gezinme değişiyor, bazı
   bölümlere menüden hiç ulaşılamıyordu. Bu betik tek bir kategori listesinden
   her sayfada aynı hamburger çekmecesini kurar.

   Mevcut hamburger düğmeleri (#menuToggle, .menu-toggle, .hamburger) bu
   çekmeceyi açar; düğmesi olmayan sayfanın başlığına düğme eklenir. Eski
   menülerin statik bağlantıları sayfada kalır (betik çalışmazsa ve arama
   motorları için), yalnız açılmazlar. Haber merkezinin kendi kategori rayı
   ([data-hm-ac]) ayrı bir sayfa içi gezinmedir, ona dokunulmaz. */
(()=>{
  if(document.getElementById('btKategoriMenu'))return;
  const KATEGORILER=[
    {ad:'Haber',yol:'/haberler/',alt:[['Tüm haberler','/haberler/'],['Gündem','/haberler/gundem/'],['Balıkesir','/haberler/balikesir/'],['Ekonomi','/haberler/ekonomi/'],['Kültür','/haberler/kultur/'],['Eğitim','/haberler/egitim/'],['Sağlık','/haberler/saglik/'],['Spor','/haberler/spor/'],['Teknoloji','/haberler/teknoloji/']]},
    {ad:'Hizmetler',yol:'/hizmetler/',alt:[['Tüm hizmetler','/hizmetler/'],['Video prodüksiyon','/video-produksiyon/'],['Sosyal medya','/sosyal-medya/'],['Reklam ve sponsorluk','/reklam-ve-sponsorluk/'],['Teklif al','/teklif-al/']]},
    {ad:'Programlar & Portföy',yol:'/portfoy/',alt:[['Portföy','/portfoy/'],['Buse Tuncay','/portfoy/buse-tuncay/'],['Siyah Oda','/siyah-oda/'],['Halk Röportajı','/halk-roportaji/'],['Vaka çalışmaları','/vaka-calismalari/'],['Referanslar','/referanslar/']]},
    {ad:'AI Lab',yol:'/ai-lab/',alt:[['AI Lab','/ai-lab/'],['Arama stratejisi','/search-strategy/'],['Programatik SEO','/programmatic-seo/']]},
    {ad:'Kaynak & Arşiv',yol:'/kaynaklar/',alt:[['Kaynak Masası','/kaynaklar/'],['Kaynaklar','/kaynaklar/'],['Arşiv Merkezi','/arsiv/'],['Dosyalar','/dosyalar/']]},
    {ad:'Kurumsal',yol:'/hakkimizda/',alt:[['Hakkımızda','/hakkimizda/'],['İletişim','/iletisim/'],['Basın kiti','/basin-kiti/'],['Marka kiti','/marka-kiti/'],['Sosyal profil kiti','/sosyal-medya-kit/'],['WhatsApp katalog','/whatsapp-katalog/'],['Gizlilik','/gizlilik/'],['English','/en/']]}
  ];
  const yolu=location.pathname.replace(/index\.html$/,'').replace(/([^/])$/,'$1/');
  // Etkin kategori: sayfanın yolu kategorinin bir bağlantısıyla en uzun eşleşen.
  let etkin=-1,enUzun=0;
  KATEGORILER.forEach((k,i)=>k.alt.forEach(([,y])=>{ if(yolu.startsWith(y)&&y.length>enUzun&&y!=='/'){enUzun=y.length;etkin=i;} }));
  // Haber detay sayfaları (/haber/<slug>/) Haber kategorisindedir.
  if(etkin<0&&yolu.startsWith('/haber/')) etkin=0;
  const kac=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const kok=document.createElement('div');
  kok.id='btKategoriMenu'; kok.className='btkm'; kok.hidden=true;
  kok.setAttribute('role','dialog'); kok.setAttribute('aria-modal','true'); kok.setAttribute('aria-label','BTMEDYA site menüsü');
  kok.innerHTML='<div class="btkm-perde" data-btkm-kapat></div><div class="btkm-panel">'+
    '<div class="btkm-ust"><a class="btkm-marka" href="/">BTMEDYA</a><button type="button" class="btkm-kapat" data-btkm-kapat aria-label="Menüyü kapat">Kapat ×</button></div>'+
    '<nav class="btkm-liste" aria-label="Kategoriler">'+KATEGORILER.map((k,i)=>
      '<details class="btkm-grup"'+(i===etkin?' open':'')+'><summary><span>'+kac(k.ad)+'</span><i aria-hidden="true"></i></summary><ul>'+
      k.alt.map(([ad,y])=>'<li><a href="'+y+'"'+(y===yolu?' aria-current="page"':'')+'>'+kac(ad)+'</a></li>').join('')+'</ul></details>').join('')+
    '</nav>'+
    '<div class="btkm-alt"><a class="btkm-cta" href="/teklif-al/?kaynak=menu">Proje anlat ↗</a><a href="https://wa.me/905416401029?text=Merhaba%20BTMEDYA" target="_blank" rel="noopener">WhatsApp</a><a href="tel:+905416401029">+90 541 640 10 29</a></div>'+
    '</div>';
  // body'ye eklenmez: anasayfa body'ye perspective veriyor ve bu, fixed
  // çekmeceyi viewport yerine sayfa yüksekliğine (23.000+ px) bağlıyordu.
  document.documentElement.appendChild(kok);
  const panel=kok.querySelector('.btkm-panel');
  const gruplar=[...kok.querySelectorAll('.btkm-grup')];
  const genis=matchMedia('(min-width:900px)');
  // Geniş ekranda tüm kategoriler açık bir ızgara; dar ekranda tek tek açılır.
  const yerlesim=()=>gruplar.forEach((g,i)=>{ g.open=genis.matches||i===etkin; });
  yerlesim(); genis.addEventListener?.('change',yerlesim);
  // Dar ekranda bir kategori açılınca diğerleri kapanır (akordeon).
  gruplar.forEach(g=>g.addEventListener('toggle',()=>{
    if(genis.matches){ if(!g.open) g.open=true; return; }
    if(g.open) gruplar.forEach(o=>{ if(o!==g) o.open=false; });
  }));

  let tetik=null;
  const ac=t=>{
    tetik=t||null; kok.hidden=false; document.documentElement.classList.add('btkm-acik');
    requestAnimationFrame(()=>kok.classList.add('is-acik'));
    document.querySelectorAll('#menuToggle,.menu-toggle,.hamburger,.btkm-dugme').forEach(d=>d.setAttribute('aria-expanded','true'));
    (kok.querySelector('.btkm-grup[open] a')||kok.querySelector('summary')).focus();
  };
  const kapat=()=>{
    kok.classList.remove('is-acik'); document.documentElement.classList.remove('btkm-acik');
    document.querySelectorAll('#menuToggle,.menu-toggle,.hamburger,.btkm-dugme').forEach(d=>d.setAttribute('aria-expanded','false'));
    setTimeout(()=>{ if(!kok.classList.contains('is-acik')) kok.hidden=true; },260);
    tetik&&tetik.focus();
  };
  kok.addEventListener('click',e=>{ if(e.target.closest('[data-btkm-kapat]')) kapat(); });
  document.addEventListener('keydown',e=>{
    if(kok.hidden)return;
    if(e.key==='Escape'){e.preventDefault();kapat();return;}
    // Odak çekmecede kalır.
    if(e.key==='Tab'){
      const o=[...panel.querySelectorAll('a,button,summary')].filter(x=>x.offsetParent!==null);
      if(!o.length)return; const ilk=o[0],son=o[o.length-1];
      if(e.shiftKey&&document.activeElement===ilk){e.preventDefault();son.focus();}
      else if(!e.shiftKey&&document.activeElement===son){e.preventDefault();ilk.focus();}
    }
  });

  /* Eski menü düğmeleri: yakalama evresinde dinlenir, eski menünün kendi
     açma kodu çalışmaz; aynı düğme yeni çekmeceyi açar. */
  const TETIKLER='#menuToggle,.menu-toggle,.hamburger,.btkm-dugme';
  document.addEventListener('click',e=>{
    const t=e.target.closest(TETIKLER); if(!t)return;
    e.preventDefault(); e.stopImmediatePropagation();
    kok.hidden?ac(t):kapat();
  },true);
  document.querySelectorAll(TETIKLER).forEach(d=>{d.setAttribute('aria-controls','btKategoriMenu');d.setAttribute('aria-haspopup','dialog');});
  /* Eski menü panelleri artık hiç açılmıyor ama ekran dışında duran
     bağlantıları (anasayfada 64 tane) Tab ile hâlâ odaklanabiliyordu.
     inert onları odak sırasından ve erişilebilirlik ağacından çıkarır;
     bağlantılar HTML'de kalır. */
  document.querySelectorAll('#siteMenu,#anaMenu,.site-menu,.menu-panel').forEach(e=>{ if(!kok.contains(e)) e.inert=true; });

  // Hamburger düğmesi olmayan sayfaya başlığın sonuna düğme eklenir.
  if(!document.querySelector(TETIKLER)){
    const d=document.createElement('button');
    d.type='button'; d.className='btkm-dugme'; d.setAttribute('aria-expanded','false');
    d.setAttribute('aria-controls','btKategoriMenu'); d.setAttribute('aria-haspopup','dialog');
    d.innerHTML='<span aria-hidden="true">☰</span> Menü';
    const baslik=document.querySelector('body>header,header');
    if(baslik) baslik.appendChild(d); else { d.classList.add('btkm-dugme-sabit'); document.body.appendChild(d); }
  }
})();
