/* BTMEDYA Hamburger Kategori Menüsü · v4 üç ana yol (Haber, Sosyal Medya, Tanıtım) · 2026-10-06
   Neden: sitede üç ayrı menü vardı. Anasayfada kategorili bir panel, alt
   sayfalarda sekiz bağlantılık düz bir liste vardı; yaklaşık 20 sayfada ise
   hiç menü yoktu. v2 bunları tek kategori listesinde birleştirdi. v3 aynı
   listeyi hareketli bir kategori sistemine çevirir: üstte kayan kategori
   şeridi ve düğmeler arasında süzülen işaretçi, altta seçilen kategorinin
   sahnesi (maskeden yükselen başlık, geliş yönüne göre kayan bağlantılar).
   Sahnede parmakla sağa/sola kaydırmak kategori değiştirir.

   Erişilebilirlik: şerit bir sekme listesidir (ok tuşları, Home/End);
   tüm bağlantılar DOM'dadır, seçili olmayan sekmeler hidden ile kapanır.
   Hareket azaltma tercihinde geçişler ve kayan yazı durur.

   Mevcut hamburger düğmeleri (#menuToggle, .menu-toggle, .hamburger) bu
   çekmeceyi açar; düğmesi olmayan sayfanın başlığına düğme eklenir. Eski
   menülerin statik bağlantıları sayfada kalır (betik çalışmazsa ve arama
   motorları için), yalnız açılmazlar. Haber merkezinin kendi kategori rayı
   ([data-hm-ac]) ayrı bir sayfa içi gezinmedir, ona dokunulmaz. */
(()=>{
  if(document.getElementById('btKategoriMenu'))return;
  /* 6 Ekim (kullanıcı): kategoriler giriş filminin sonundaki üç yolla aynı
     üç başlıkta toplanır: Haber, Sosyal Medya, Tanıtım. Altı sekme okuru
     karar vermeye zorluyordu. Kurumsal sayfalar sekme değil, menünün
     altındaki küçük satırdadır; hiçbir sayfa erişilmez kalmaz. */
  const KATEGORILER=[
    {key:'haber',ad:'HABER',ozet:'Kaynaklı gündem. Önce Balıkesir, ardından Türkiye ve dünya.',groups:[
      {ad:'COĞRAFYA',items:[['Balıkesir','/haberler/balikesir/'],['Türkiye','/haberler/turkiye/'],['Dünya','/haberler/dunya/']]},
      {ad:'GÜNDEM',items:[['Gündem','/haberler/gundem/'],['Ekonomi','/haberler/ekonomi/'],['Kültür · Sanat','/haberler/kultur/'],['Yaşam','/haberler/yasam/'],['Eğitim','/haberler/egitim/'],['Sağlık','/haberler/saglik/'],['Spor','/haberler/spor/'],['Teknoloji','/haberler/teknoloji/']]},
      {ad:'ÖZEL / ARŞİV',items:[['Halk Röportajı','/halk-roportaji/'],['Siyah Oda','/siyah-oda/'],['Kaynak Masası','/kaynaklar/'],['Arşiv Merkezi','/arsiv/'],['Dosyalar','/dosyalar/'],['Tüm haberler','/haberler/']]}
    ]},
    {key:'sosyal',ad:'SOSYAL MEDYA',ozet:'İçerik üretimi, hesap yönetimi ve dijital görünürlük.',groups:[
      {ad:'YÖNETİM',items:[['Sosyal medya yönetimi','/sosyal-medya/'],['Balıkesir sosyal medya ajansı','/hizmetler/balikesir-sosyal-medya-ajansi/'],['Sosyal profil kiti','/sosyal-medya-kit/']]},
      {ad:'AI / İÇERİK',items:[['AI Lab','/ai-lab/'],['Yapay zekâ ajansı','/hizmetler/balikesir-yapay-zeka-ajansi/']]},
      {ad:'ARAMA / GÖRÜNÜRLÜK',items:[['Arama stratejisi','/search-strategy/'],['Programatik SEO','/programmatic-seo/']]}
    ]},
    {key:'tanitim',ad:'TANITIM',ozet:'Prodüksiyon, reklam, portföy ve doğrudan proje yolu.',groups:[
      {ad:'PRODÜKSİYON',items:[['Video prodüksiyon','/video-produksiyon/'],['Düğün çekimleri','/video-produksiyon/'],['Balıkesir tanıtım filmi','/hizmetler/balikesir-tanitim-filmi/'],['Balıkesir video prodüksiyon','/hizmetler/balikesir-video-produksiyon/']]},
      {ad:'MARKA / DAĞITIM',items:[['Reklam ve sponsorluk','/reklam-ve-sponsorluk/'],['Tüm hizmetler','/hizmetler/'],['Hizmet kataloğu','/whatsapp-katalog/'],['Teklif al','/teklif-al/']]},
      {ad:'PORTFÖY',items:[['Portföy','/portfoy/'],['Buse Tuncay','/portfoy/buse-tuncay/'],['Vaka çalışmaları','/vaka-calismalari/'],['Referanslar','/referanslar/']]}
    ]}
  ];
  const KURUMSAL=[['Hakkımızda','/hakkimizda/'],['İletişim','/iletisim/'],['Basın kiti','/basin-kiti/'],['Marka kiti','/marka-kiti/'],['Yayın ilkeleri','/yayin-ilkeleri/'],['Gizlilik','/gizlilik/'],['English','/en/']];
  const HABER_KATALOG=[['YEREL · Balıkesir','/haberler/balikesir/'],['ULUSAL · Türkiye','/haberler/turkiye/'],['DÜNYA','/haberler/dunya/'],['GÜNDEM','/haberler/gundem/'],['EKONOMİ','/haberler/ekonomi/'],['KÜLTÜR · SANAT','/haberler/kultur/'],['YAŞAM','/haberler/yasam/'],['EĞİTİM','/haberler/egitim/'],['SAĞLIK','/haberler/saglik/'],['SPOR','/haberler/spor/'],['BİLİM · TEKNOLOJİ','/haberler/teknoloji/'],['ÖZEL · Halk Röportajı','/halk-roportaji/'],['ÖZEL · Siyah Oda','/siyah-oda/'],['ARŞİV · Kaynak Masası','/kaynaklar/'],['ARŞİV · Arşiv Merkezi','/arsiv/'],['ARŞİV · Dosyalar','/dosyalar/']];
  const yolu=location.pathname.replace(/index\.html$/,'').replace(/([^/])$/,'$1/');
  // Etkin ana yol: üç seçenekten hangisinin içindeki bir bağlantıdaysak onu aç.
  let etkin=0,enUzun=0;
  KATEGORILER.forEach((k,i)=>k.groups.forEach(g=>g.items.forEach(([,y])=>{
    if(yolu.startsWith(y)&&y.length>enUzun&&y!=='/'){enUzun=y.length;etkin=i;}
  })));
  if(yolu.startsWith('/haber/') && etkin===0) etkin=0;
  const kac=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const iki=n=>String(n).padStart(2,'0');
  // Üzerine gelince yukarı yuvarlanan yazı: aynı metin iki kat, ikincisi
  // ekran okuyucudan gizli; okunan ad bir kez okunur.
  const yuvarla=t=>'<span class="btkm-yuvarla"><span>'+kac(t)+'</span><span aria-hidden="true">'+kac(t)+'</span></span>';
  const azHareket=matchMedia('(prefers-reduced-motion: reduce)');

  const kok=document.createElement('div');
  kok.id='btKategoriMenu'; kok.className='btkm'; kok.hidden=true;
  kok.setAttribute('role','dialog'); kok.setAttribute('aria-modal','true'); kok.setAttribute('aria-label','BTMEDYA site menüsü');
  const kayanMetin=KATEGORILER.map(k=>'<span>'+kac(k.ad)+'</span><i>✦</i>').join('');
  const kok=document.createElement('div');
  kok.id='btKategoriMenu'; kok.className='btkm'; kok.hidden=true;
  kok.setAttribute('role','dialog'); kok.setAttribute('aria-modal','true'); kok.setAttribute('aria-label','BTMEDYA site menüsü');
  kok.innerHTML='<div class="btkm-perde" data-btkm-kapat></div><div class="btkm-panel">'+
    '<div class="btkm-ust"><a class="btkm-marka" href="/">BTMEDYA</a><button type="button" class="btkm-kapat" data-btkm-kapat aria-label="Menüyü kapat">Kapat ×</button></div>'+
    '<div class="btkm-yollar" aria-label="Üç ana yol">'+KATEGORILER.map((k,i)=>
      '<section class="btkm-yol" data-yol="'+k.key+'"'+(i===etkin?' data-active="true"':'')+'>'+
        '<button type="button" class="btkm-yol-baslik" aria-expanded="'+(i===etkin?'true':'false')+'" aria-controls="btkm-yol-pano-'+i+'">'+
          '<span class="btkm-yol-no">0'+(i+1)+'</span><span><strong>'+kac(k.ad)+'</strong><small>'+kac(k.ozet)+'</small></span><i aria-hidden="true">+</i>'+
        '</button>'+
        '<div class="btkm-yol-pano" id="btkm-yol-pano-'+i+'"'+(i===etkin?'':' hidden')+'>'+
          k.groups.map((g,gi)=>
            '<section class="btkm-altgrup" data-altgrup="'+i+'-'+gi">'+
              '<h3>'+kac(g.ad)+'</h3><ul>'+g.items.map(([ad,y])=>
                '<li><a href="'+y+'"'+(y===yolu?' aria-current="page"':'')+'>'+yuvarla(ad)+'<i aria-hidden="true">↗</i></a></li>'
              ).join('')+'</ul>'+
            '</section>'
          ).join('')+
        '</div>'+
      '</section>').join('')+
    '</div>'+
    '<div class="btkm-kayan" aria-hidden="true"><div class="btkm-kayan-iz">'+kayanMetin+kayanMetin+'</div></div>'+
    '<nav class="btkm-kurumsal" aria-label="Kurumsal">'+KURUMSAL.map(([ad,y])=>'<a href="'+y+'"'+(y===yolu?' aria-current="page"':'')+'>'+kac(ad)+'</a>').join('')+'</nav>'+
    '<div class="btkm-alt"><a class="btkm-cta" href="/teklif-al/?kaynak=menu">'+yuvarla('Proje anlat ↗')+'</a><a href="https://wa.me/905416401029?text=Merhaba%20BTMEDYA" target="_blank" rel="noopener">WhatsApp</a><a href="tel:+905416401029">+90 541 640 10 29</a></div>'+
    '</div>';
  // body'ye eklenmez: anasayfa body'ye perspective veriyor ve bu, fixed
  // çekmeceyi viewport yerine sayfa yüksekliğine (23.000+ px) bağlıyordu.
  document.documentElement.appendChild(kok);
  const panel=kok.querySelector('.btkm-panel');
  const yollar=[...kok.querySelectorAll('.btkm-yol')];
  const yolButtons=[...kok.querySelectorAll('.btkm-yol-baslik')];
  const setYol=(i,focus=false)=>{
    i=(i+KATEGORILER.length)%KATEGORILER.length;
    yollar.forEach((el,j)=>{
      const on=j===i;
      el.dataset.active=on?'true':'false';
      const b=el.querySelector('.btkm-yol-baslik');
      const p=el.querySelector('.btkm-yol-pano');
      b.setAttribute('aria-expanded',String(on));
      p.hidden=!on;
    });
    if(focus)yolButtons[i].focus();
  };
  yolButtons.forEach((b,i)=>b.addEventListener('click',()=>setYol(i)));
  // Alt grup başlıkları açık kalır; ana üç yol birbirini dışlar.
  // Böylece mobilde önce HABER/SOSYAL/TANITIM, sonra ilgili alt kategori seçilir.
  let tetik=null;
  const TETIKLER='#menuToggle,.menu-toggle,.hamburger,.btkm-dugme';
  const durum=a=>document.querySelectorAll(TETIKLER).forEach(d=>d.setAttribute('aria-expanded',String(a)));
  const ac=t=>{
    tetik=t||null; kok.hidden=false; document.documentElement.classList.add('btkm-acik');
    // Çekmece gizliyken düğme genişliği 0'dır; işaretçi açılınca ölçülür.
    imleciTasi();
    const b=sekmeler[secili]; serit.scrollLeft=b.offsetLeft-(serit.clientWidth-b.offsetWidth)/2;
    requestAnimationFrame(()=>{ kok.classList.add('is-acik'); imleciTasi(); });
    durum(true);
    b.focus({preventScroll:true});
  };
  const kapat=()=>{
    kok.classList.remove('is-acik'); document.documentElement.classList.remove('btkm-acik');
    durum(false);
    setTimeout(()=>{ if(!kok.classList.contains('is-acik')) kok.hidden=true; },300);
    tetik&&tetik.focus();
  };
  kok.addEventListener('click',e=>{ if(e.target.closest('[data-btkm-kapat]')) kapat(); });
  document.addEventListener('keydown',e=>{
    if(kok.hidden)return;
    if(e.key==='Escape'){e.preventDefault();kapat();return;}
    // Odak çekmecede kalır; gizli sekmelerin bağlantıları sayılmaz.
    if(e.key==='Tab'){
      const o=[...panel.querySelectorAll('a,button')].filter(x=>x.offsetParent!==null&&x.tabIndex>=0);
      if(!o.length)return; const ilk=o[0],son=o[o.length-1];
      if(e.shiftKey&&document.activeElement===ilk){e.preventDefault();son.focus();}
      else if(!e.shiftKey&&document.activeElement===son){e.preventDefault();ilk.focus();}
    }
  });

  /* Eski menü düğmeleri: yakalama evresinde dinlenir, eski menünün kendi
     açma kodu çalışmaz; aynı düğme yeni çekmeceyi açar. */
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
