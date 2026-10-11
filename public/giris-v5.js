/* BTMEDYA giriş filmi v5.

   11 Ekim (ikinci istek): "Bu videoyu ana giriş videosu olarak hiçbir yazı,
   üzerinde menü vs. olmadan oynat; biraz oynadıktan sonra en son üç kategori
   seçeneği gelsin. Seslendirme olmasın, enerjik müzik olsun."

   NEDEN BÖYLE
   - Film sürerken ekranda filmden başka hiçbir şey yok: menü, yazı, ışık
     halkası, başlık parlaması kaldırıldı (önceki sürümde filmin kendi
     etiketlerinin üstüne görünmez dokunma alanları ve ışık efekti
     biniyordu; okur bunları seçenek olarak fark etmiyordu).
   - Filmin son kartına (BTMEDYA logosu) gelince üç net seçenek ekrana gelir:
     Haber & Medya, Sosyal & Dijital, Marka & Prodüksiyon. Hedefler sitenin üç
     ana yoluyla aynıdır (/haberler/, /sosyal-medya/, /video-produksiyon/).
   - Ses: film enerjik, seslendirmesiz bir müzik izi taşır. Tarayıcı sesli
     otomatik oynatmayı izin olmadan engeller: önce sesli denenir, olmazsa
     sessiz başlar; ilk dokunuş/tuş sesi açar.
   - Aynı oturumda ikinci gelişte film baştan oynamaz, son karta atlar.
     Kaydırma, aşağı sürükleme ve Esc de son karta atlar.
   - AGENTS.md: her kare AI ÜRETİMİ etiketi taşır. Film sürerken yazı
     istenmediği için etiket yalnız seçenekler gelince, küçük olarak görünür. */
(()=>{
  const kok=document.querySelector('[data-giris-v5]');
  if(!kok)return;
  const film=kok.querySelector('video');
  if(!film)return;
  const html=document.documentElement, govde=document.body;

  // H.264 çözemeyen tarayıcı (codec'siz Chromium/Firefox) aynı kurgunun
  // WebM kopyasını alır; yoksa film hata verip doğrudan son kareye düşerdi.
  const h264=!!film.canPlayType('video/mp4; codecs="avc1.4D401F, mp4a.40.2"');
  const kaynak=(mp4,webm)=>h264||!webm?mp4:webm;
  // sonKart: filmin logo kartının başladığı saniye; seçenekler o an gelir.
  const PLAN={
    dikey:{src:kaynak(film.dataset.dikey,film.dataset.dikeyWebm), poster:film.dataset.dikeyPoster, sonKart:36.0},
    genis:{src:kaynak(film.dataset.genis,film.dataset.genisWebm), poster:film.dataset.genisPoster, sonKart:36.0}
  };
  const YOLLAR=[
    {href:'/haberler/', no:'01', ad:'HABER & MEDYA', alt:'Haber · röportaj · özel dosya'},
    {href:'/sosyal-medya/', no:'02', ad:'SOSYAL & DİJİTAL', alt:'İçerik · kanallar · AI'},
    {href:'/video-produksiyon/', no:'03', ad:'MARKA & PRODÜKSİYON', alt:'Tanıtım · düğün · marka filmi'}
  ];
  const dikeyMi=()=>innerWidth/innerHeight<0.8;
  let p=dikeyMi()?PLAN.dikey:PLAN.genis;
  const izlendi=(()=>{try{return sessionStorage.getItem('bt-giris-v5')==='1';}catch(e){return false;}})();
  const azHareket=matchMedia('(prefers-reduced-motion: reduce)').matches;

  const etiket=document.createElement('p');
  etiket.className='giris-v5-ai';
  etiket.textContent='AI ÜRETİMİ';
  etiket.hidden=true;
  kok.appendChild(etiket);

  // Üç seçenek: film sürerken DOM'da durur ama görünmez ve odaklanamaz.
  const secim=document.createElement('nav');
  secim.className='giris-v5-secim';
  secim.setAttribute('aria-label','BTMEDYA üç ana yol');
  secim.hidden=true;
  for(const y of YOLLAR){
    const a=document.createElement('a');
    a.className='giris-v5-alan giris-v5-secim-dugme';
    a.href=y.href;
    a.setAttribute('aria-label',y.ad.replace('&','ve')+': '+y.alt);
    a.innerHTML='<span>'+y.no+'</span><b>'+y.ad.replace('&','&amp;')+'</b><small>'+y.alt+'</small>';
    a.addEventListener('click',()=>{try{sessionStorage.setItem('bt-giris-v5','1');}catch(e){}});
    secim.appendChild(a);
  }
  kok.appendChild(secim);

  // Kenarlardan %6'dan fazla kesilecekse (ör. 4:3 tablet) contain'e geçilir;
  // logo kartı kadraj dışına düşmesin.
  const oturt=()=>{
    const W=kok.clientWidth||innerWidth, H=kok.clientHeight||innerHeight;
    const en=film.videoWidth||(p===PLAN.dikey?720:1280), boy=film.videoHeight||(p===PLAN.dikey?1560:720);
    const kapla=Math.max(W/en,H/boy);
    const kesik=1-Math.min(W/(en*kapla),H/(boy*kapla));
    film.style.objectFit=kesik>0.06?'contain':'cover';
  };

  let secimAcik=false;
  const secenekleriAc=()=>{
    if(secimAcik)return;
    secimAcik=true;
    secim.hidden=false;
    etiket.hidden=false;
    requestAnimationFrame(()=>secim.classList.add('is-acik'));
  };
  const zaman=()=>{if((film.currentTime||0)>=p.sonKart)secenekleriAc();};

  let bitti=false;
  const bitir=()=>{
    if(bitti)return;
    bitti=true;
    try{sessionStorage.setItem('bt-giris-v5','1');}catch(e){}
    kok.classList.add('is-bitti');
    html.classList.remove('bt-clean-intro-active');
    govde.classList.remove('bt-clean-intro-active');
    govde.classList.add('film-bitti');
    secenekleriAc();
  };
  const sonaAtla=()=>{
    if(bitti)return;
    try{film.currentTime=Math.max(p.sonKart,(film.duration||p.sonKart+1)-0.05);}catch(e){}
    film.pause();
    bitir();
  };

  const yukle=()=>{
    film.poster=p.poster||'';
    film.src=p.src;
    film.load();
  };
  const oynat=()=>{
    film.muted=false;
    const s=film.play();
    if(s&&s.catch)s.catch(()=>{
      film.muted=true;
      const s2=film.play();
      if(s2&&s2.catch)s2.catch(sonaAtla);
    });
  };

  // Panel bağlantısı: yönetim panelinde "Giriş filmi" (hero-video) yuvasına
  // yeni bir film atanırsa o oynar; seçenekler film bitince gelir.
  // Emekli filmler (panelde eski atama olarak kalan) yok sayılır.
  const EMEKLI=/\/(hero-story(-mobile)?|giris-ai(-genis)?|giris-filmi(-genis)?|btmedya-ai-film(-genis)?|saha-gece)\.(mp4|webm)$/;
  const panelFilmi=y=>{
    const a=y&&y['hero-video'];
    const url=a&&String(a.url||'');
    if(!url||EMEKLI.test(url.split('?')[0])||/btmedya-tanitim-v5/.test(url))return false;
    p={src:url,poster:(y['hero-poster']&&y['hero-poster'].url)||'',sonKart:Infinity};
    for(const k of Object.keys(PLAN))PLAN[k]=p;
    yukle();
    if(izlendi||azHareket){bitti=false;film.addEventListener('loadedmetadata',sonaAtla,{once:true});}
    else oynat();
    return true;
  };

  yukle();
  if(window.btYuvalar&&window.btYuvalar.then)window.btYuvalar.then(panelFilmi).catch(()=>{});
  addEventListener('resize',()=>{
    const yeni=dikeyMi()?PLAN.dikey:PLAN.genis;
    if(yeni!==p&&!bitti&&film.currentTime<1){p=yeni;yukle();oynat();return;}
    oturt();
  },{passive:true});
  film.addEventListener('loadedmetadata',oturt);
  film.addEventListener('timeupdate',zaman);
  film.addEventListener('ended',bitir);
  film.addEventListener('error',()=>{bitir();},{once:true});
  // İlk dokunuş/tuş sesi açar (seçeneğe basılmadıysa).
  const sesAc=e=>{
    if(e&&e.target&&e.target.closest&&e.target.closest('.giris-v5-secim'))return;
    if(film.muted&&!bitti){film.muted=false;film.play().catch(()=>{});}
  };
  kok.addEventListener('pointerup',sesAc);
  addEventListener('keydown',e=>{
    if(e.key==='Escape'){sonaAtla();return;}
    if(e.key==='m'||e.key==='M'){film.muted=!film.muted;return;}
    sesAc(e);
  });
  addEventListener('wheel',e=>{if(!bitti&&e.deltaY>30)sonaAtla();},{passive:true});
  let dokunY=null;
  kok.addEventListener('touchstart',e=>{dokunY=e.touches[0].clientY;},{passive:true});
  kok.addEventListener('touchend',e=>{if(dokunY!==null&&dokunY-e.changedTouches[0].clientY>60)sonaAtla();dokunY=null;},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!bitti&&film.paused)film.play().catch(()=>{});});

  if(izlendi||azHareket){
    if(film.readyState>=1)sonaAtla();
    else film.addEventListener('loadedmetadata',sonaAtla,{once:true});
    return;
  }
  oynat();
})();
