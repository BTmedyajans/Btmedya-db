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
    {ad:'Haber',ozet:'Kaynaklı yerel ve ulusal gündem; röportaj, program ve arşiv.',alt:[['Tüm haberler','/haberler/'],['Gündem','/haberler/gundem/'],['Balıkesir','/haberler/balikesir/'],['Ekonomi','/haberler/ekonomi/'],['Kültür','/haberler/kultur/'],['Eğitim','/haberler/egitim/'],['Sağlık','/haberler/saglik/'],['Spor','/haberler/spor/'],['Teknoloji','/haberler/teknoloji/'],['Halk Röportajı','/halk-roportaji/'],['Siyah Oda','/siyah-oda/'],['Kaynak Masası','/kaynaklar/'],['Arşiv Merkezi','/arsiv/'],['Dosyalar','/dosyalar/']]},
    {ad:'Sosyal Medya',ozet:'İçerik üretimi, hesap yönetimi ve dijital görünürlük; AI üretimi açık etiketli.',alt:[['Sosyal medya yönetimi','/sosyal-medya/'],['Balıkesir sosyal medya ajansı','/hizmetler/balikesir-sosyal-medya-ajansi/'],['Sosyal profil kiti','/sosyal-medya-kit/'],['AI Lab','/ai-lab/'],['Yapay zekâ ajansı','/hizmetler/balikesir-yapay-zeka-ajansi/'],['Arama stratejisi','/search-strategy/'],['Programatik SEO','/programmatic-seo/']]},
    {ad:'Tanıtım',ozet:'Düğün klibi, tanıtım ve reklam filmi; portföy, referans ve teklif.',alt:[['Video prodüksiyon','/video-produksiyon/'],['Balıkesir tanıtım filmi','/hizmetler/balikesir-tanitim-filmi/'],['Balıkesir video prodüksiyon','/hizmetler/balikesir-video-produksiyon/'],['Reklam ve sponsorluk','/reklam-ve-sponsorluk/'],['Portföy','/portfoy/'],['Buse Tuncay','/portfoy/buse-tuncay/'],['Vaka çalışmaları','/vaka-calismalari/'],['Referanslar','/referanslar/'],['Tüm hizmetler','/hizmetler/'],['Hizmet kataloğu','/whatsapp-katalog/'],['Teklif al','/teklif-al/']]}
  ];
  const KURUMSAL=[['Hakkımızda','/hakkimizda/'],['İletişim','/iletisim/'],['Basın kiti','/basin-kiti/'],['Marka kiti','/marka-kiti/'],['Gizlilik','/gizlilik/'],['English','/en/']];
  const HABER_KATALOG=[['YEREL · Balıkesir','/haberler/balikesir/'],['ULUSAL · Türkiye','/haberler/turkiye/'],['DÜNYA','/haberler/dunya/'],['GÜNDEM','/haberler/gundem/'],['EKONOMİ','/haberler/ekonomi/'],['KÜLTÜR · SANAT','/haberler/kultur/'],['YAŞAM','/haberler/yasam/'],['EĞİTİM','/haberler/egitim/'],['SAĞLIK','/haberler/saglik/'],['SPOR','/haberler/spor/'],['BİLİM · TEKNOLOJİ','/haberler/teknoloji/'],['ÖZEL · Halk Röportajı','/halk-roportaji/'],['ÖZEL · Siyah Oda','/siyah-oda/'],['ARŞİV · Kaynak Masası','/kaynaklar/'],['ARŞİV · Arşiv Merkezi','/arsiv/'],['ARŞİV · Dosyalar','/dosyalar/']];
  const yolu=location.pathname.replace(/index\.html$/,'').replace(/([^/])$/,'$1/');
  // Etkin kategori: sayfanın yolu kategorinin bir bağlantısıyla en uzun eşleşen.
  let etkin=-1,enUzun=0;
  KATEGORILER.forEach((k,i)=>k.alt.forEach(([,y])=>{ if(yolu.startsWith(y)&&y.length>enUzun&&y!=='/'){enUzun=y.length;etkin=i;} }));
  // Haber detay sayfaları (/haber/<slug>/) Haber kategorisindedir.
  if(etkin<0&&yolu.startsWith('/haber/')) etkin=0;
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
  kok.innerHTML='<div class="btkm-perde" data-btkm-kapat></div><div class="btkm-panel">'+
    '<div class="btkm-ust"><a class="btkm-marka" href="/">BTMEDYA</a><button type="button" class="btkm-kapat" data-btkm-kapat aria-label="Menüyü kapat">Kapat ×</button></div>'+
    '<div class="btkm-serit"><div class="btkm-serit-ic"><span class="btkm-imlec" aria-hidden="true"></span>'+
      '<div class="btkm-sekmeler" role="tablist" aria-label="Kategoriler">'+KATEGORILER.map((k,i)=>
        '<button type="button" role="tab" class="btkm-cip" id="btkm-sekme-'+i+'" aria-controls="btkm-pano-'+i+'" aria-selected="false" tabindex="-1" style="--i:'+i+'"><small aria-hidden="true">'+iki(i+1)+'</small>'+yuvarla(k.ad)+'</button>').join('')+
      '</div></div></div>'+
    '<div class="btkm-sahne" data-yon="ileri">'+KATEGORILER.map((k,i)=>
      '<section class="btkm-pano" role="tabpanel" id="btkm-pano-'+i+'" aria-labelledby="btkm-sekme-'+i+'" hidden>'+
        '<div class="btkm-pano-bas"><p class="btkm-sayac"><b>'+iki(i+1)+'</b> / '+iki(KATEGORILER.length)+'</p>'+
        '<h2 class="btkm-baslik"><span class="btkm-maske"><span>'+kac(k.ad)+'</span></span></h2>'+
        '<p class="btkm-ozet">'+kac(k.ozet)+'</p></div>'+
        '<ul class="btkm-baglar">'+(i===0?HABER_KATALOG:k.alt).map(([ad,y],j)=>
          '<li style="--j:'+j+'"><a href="'+y+'"'+(y===yolu?' aria-current="page"':'')+'>'+yuvarla(ad)+'<i aria-hidden="true">↗</i></a></li>').join('')+'</ul>'+
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
  const serit=kok.querySelector('.btkm-serit');
  const imlec=kok.querySelector('.btkm-imlec');
  const sahne=kok.querySelector('.btkm-sahne');
  const sekmeler=[...kok.querySelectorAll('.btkm-cip')];
  const panolar=[...kok.querySelectorAll('.btkm-pano')];

  /* Kategori seçimi: işaretçi seçilen düğmenin altına süzülür, şerit onu
     ortaya kaydırır; yeni sahne geliş yönüne göre kayarak girer (gizliden
     görünüre geçen öğede CSS animasyonu kendiliğinden yeniden başlar). */
  let secili=-1;
  const imleciTasi=()=>{
    const b=sekmeler[secili]; if(!b||!b.offsetWidth)return;
    imlec.style.setProperty('--x',b.offsetLeft+'px');
    imlec.style.setProperty('--w',b.offsetWidth+'px');
  };
  const sec=(i,odakla)=>{
    i=(i+KATEGORILER.length)%KATEGORILER.length;
    if(i===secili){ if(odakla) sekmeler[i].focus(); return; }
    sahne.dataset.yon=(secili<0||i>secili)?'ileri':'geri';
    sekmeler.forEach((b,j)=>{ const s=j===i; b.setAttribute('aria-selected',String(s)); b.tabIndex=s?0:-1; });
    panolar.forEach((p,j)=>{ p.hidden=j!==i; });
    secili=i; imleciTasi();
    const b=sekmeler[i];
    if(b.offsetWidth) serit.scrollTo({left:b.offsetLeft-(serit.clientWidth-b.offsetWidth)/2,behavior:azHareket.matches?'auto':'smooth'});
    if(odakla) b.focus();
  };
  sec(etkin<0?0:etkin);
  sekmeler.forEach((b,i)=>b.addEventListener('click',()=>sec(i)));
  // İnce imleçli cihazda üzerine gelmek de kategoriyi açar; kısa niyet
  // gecikmesi, fare şeritten geçerken sahnenin titremesini önler.
  if(matchMedia('(hover:hover) and (pointer:fine)').matches){
    let niyet=0;
    sekmeler.forEach((b,i)=>{
      b.addEventListener('pointerenter',()=>{ clearTimeout(niyet); niyet=setTimeout(()=>sec(i),140); });
      b.addEventListener('pointerleave',()=>clearTimeout(niyet));
    });
  }
  kok.querySelector('[role=tablist]').addEventListener('keydown',e=>{
    const h={ArrowRight:secili+1,ArrowLeft:secili-1,Home:0,End:KATEGORILER.length-1}[e.key];
    if(h===undefined)return; e.preventDefault(); sec(h,true);
  });
  // Sahnede yatay kaydırma kategori değiştirir; dikey kaydırma serbest kalır.
  let x0=null,y0=0;
  sahne.addEventListener('touchstart',e=>{ const t=e.touches[0]; x0=t.clientX; y0=t.clientY; },{passive:true});
  sahne.addEventListener('touchend',e=>{
    if(x0===null)return; const t=e.changedTouches[0], dx=t.clientX-x0, dy=t.clientY-y0; x0=null;
    if(Math.abs(dx)>56&&Math.abs(dx)>Math.abs(dy)*1.4) sec(secili+(dx<0?1:-1));
  },{passive:true});
  addEventListener('resize',imleciTasi);

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
