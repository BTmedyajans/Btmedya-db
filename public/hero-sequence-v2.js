/* BTMEDYA HERO SEQUENCE V3 · 2026-10-05
   Intro film -> sound-enabled playback -> end card -> category interactions.
   Audio autoplay is not forced: the first user gesture is used to satisfy browser policy.
   V3: V2 sayfayı film bitene kadar kilitliyor (body overflow:hidden) ve
   mobil gezinmeyi gizliyordu; filmi başlatmayan okur menüye ulaşamıyordu.
   Artık sayfa hiç kilitlenmez, gezinme hep görünür. Kart film başlayınca
   çekilir (film kartın altında kalmıyordu), "Filmi geç" düğmesi vardır ve
   okur hero'yu kaydırıp geçince giriş kendiliğinden tamamlanır. Mobilde
   film denetimi (ses, bölümler, ilerleme) mobile-motion.js'tedir. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile=matchMedia('(max-width:720px)').matches;
  const film=mobile?root.querySelector('.mfilm-video'):root.querySelector('.cinematic-video-1 video');
  if(!film)return;
  const intro= document.createElement('div'); intro.className='bt-hero-intro'; intro.setAttribute('role','region'); intro.setAttribute('aria-label','BTMEDYA giriş filmi');
  intro.innerHTML='<div class="bt-hero-intro-card"><span class="bt-hero-intro-kicker">BTMEDYA / GİRİŞ FİLMİ</span><strong>SAHA · STÜDYO<br><em>PRODÜKSİYON.</em></strong><p>Sesli gerçek arşiv filmi; saha, stüdyo, kamera arkası ve prodüksiyon tek hikâyede.</p><div class="bt-hero-intro-aksiyon"><button type="button" class="bt-hero-start">▶ İzle</button><button type="button" class="bt-hero-gec">Filmi geç</button></div></div>';
  // Mobilde kart kare filmin altında durur, böylece posterin kendi başlığı
  // ("SAHADAN STÜDYOYA") örtülmez.
  // Masaüstü hero birkaç ekran boyunda; kart köke eklenince bu yüksekliğin
  // ortasına düşüp ilk ekranda hiç görünmüyordu. Yapışkan sahneye eklenir.
  const kare=mobile&&root.querySelector('.mfilm-kare');
  if(kare)kare.after(intro);else (root.querySelector('.cinematic-sticky')||root).appendChild(intro);
  const start=intro.querySelector('.bt-hero-start'), gec=intro.querySelector('.bt-hero-gec');
  /* Kartın kaynak satırı oynayacak filmin kaydından gelir (AGENTS.md:
     varsayılan AI ÜRETİMİ). Panel ataması yoksa sayfanın varsayılan filmi
     oynar; o arşiv kurgusu medya-ozel.json gercek listesindedir. */
  const ARSIV_FILMI=/\/giris-filmi(-genis)?(-hq)?\.(mp4|webm)$/;
  const APPROVED_HERO=url=>! /\/giris-ai(?:-genis)?\.(?:mp4|webm)$/i.test(String(url||'').split('?')[0]);
  Promise.resolve(window.btYuvalar).then(y=>{
    // Eski AI filmine (hero-story) yapılmış panel ataması tek filmde yok sayılır (home.js ile aynı kural).
    const a0=y&&y['hero-video'], a=a0&&APPROVED_HERO(a0.url)&&!(root.hasAttribute('data-tek-film')&&/\/(hero-story(-mobile)?|giris-ai(-genis)?)\.mp4$/.test(String(a0.url||'').split('?')[0]))?a0:null, atanmis=a&&a.tur==='video'&&a.url;
    const url=String(atanmis?a.url:(film.dataset.src||'')).split('?')[0];
    const gercek=atanmis?a.gercek===true:ARSIV_FILMI.test(url);
    intro.querySelector('.bt-hero-intro-kicker').textContent='BTMEDYA / GİRİŞ FİLMİ · '+(gercek?'GERÇEK ÇEKİM':'AI ÜRETİMİ');
    if(gercek&&ARSIV_FILMI.test(url))intro.querySelector('p').textContent='BTMEDYA arşivinden 28,6 saniye: saha, stüdyo, kamera arkası ve prodüksiyon.';
  }).catch(()=>{});
  const net=()=>navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const hqIcin = video => {
    const c=net();
    if(!video.dataset.srcHq)return false;
    if(c?.saveData)return false;
    if(c?.effectiveType && /^(slow-2g|2g|3g)$/i.test(c.effectiveType))return false;
    return !c || !c.effectiveType || c.effectiveType==='4g';
  };
  const hedefKaynak = video => hqIcin(video) ? video.dataset.srcHq : video.dataset.src;
  let unlocked=false,started=false;
  const categoryVideos=()=>[...root.querySelectorAll('.cinematic-video video')].filter(v=>v!==film);
  const silenceCategories=()=>categoryVideos().forEach(v=>{v.pause();v.muted=true;v.defaultMuted=true;});
  const kartiKaldir=()=>{intro.setAttribute('aria-hidden','true');intro.inert=true;};
  const unlock=()=>{
    if(unlocked)return; unlocked=true; kartiKaldir();
    root.classList.remove('bt-hero-intro-active','bt-hero-intro-playing');root.classList.add('bt-hero-intro-complete');
    document.querySelectorAll('.mobile-quick-nav a').forEach((a,i)=>a.style.setProperty('--bt-nav-delay',`${i*35}ms`));
  };
  const play=withSound=>{
    silenceCategories();
    started=true; film.loop=false; film.preload='auto'; film.playsInline=true; film.defaultMuted=!withSound; film.muted=!withSound;
    const hedef=hedefKaynak(film);
    film.dataset.heroQuality=(hedef===film.dataset.srcHq?'hq':'standard');
    if(!film.getAttribute('src')&&hedef){film.src=hedef;film.load();}
    const p=film.play();
    if(p&&p.catch)p.catch(()=>{
      if(film.dataset.heroQuality==='hq'&&film.dataset.src){
        film.dataset.heroQuality='standard'; film.removeAttribute('src'); film.src=film.dataset.src; film.load();
        const fb=film.play(); if(fb&&fb.catch)fb.catch(()=>{film.muted=true;film.play().catch(()=>{});});
      }else{film.muted=true;film.play().catch(()=>{});}
    });
    root.classList.add('bt-hero-intro-playing');
    kartiKaldir();
    if(film.currentSrc||film.src)film.dataset.heroIntroSource=film.currentSrc||film.src;
  };
  root.classList.add('bt-hero-intro-active');film.loop=false;
  start.addEventListener('click',e=>{e.preventDefault();play(true);});
  gec.addEventListener('click',e=>{e.preventDefault();unlock();});
  film.addEventListener('click',()=>{if(!started)play(true);});
  film.addEventListener('ended',unlock,{once:true});
  // Tek AI filmi sessiz ve kendiliğinden başlar (home.js / mobile-motion.js);
  // kart başlangıç düğmesini beklemeden çekilir.
  film.addEventListener('play',()=>{started=true;root.classList.add('bt-hero-intro-playing');kartiKaldir();});
  film.addEventListener('error',()=>{
    if(film.dataset.heroQuality==='hq'&&film.dataset.src){
      film.dataset.heroQuality='standard'; film.removeAttribute('src'); film.src=film.dataset.src; film.load();
      film.play().catch(()=>{}); return;
    }
    if(!unlocked){intro.querySelector('p').textContent='Film yüklenemedi; etkileşimli girişe geçiliyor.';setTimeout(unlock,900);}
  });
  if(reduced){intro.querySelector('p').textContent='Düşük hareket tercihiniz nedeniyle statik giriş kullanılıyor.';setTimeout(unlock,100);}
  film.setAttribute('data-video-quality-policy','hq-on-fast-connection');
  // Okur hero'yu kaydırıp geçerse giriş tamamlanmış sayılır; geri döndüğünde kart beklemez.
  if('IntersectionObserver' in window){
    new IntersectionObserver(es=>{if(!es[0].isIntersecting&&!started)unlock();},{threshold:0}).observe(root);
  }
  const sceneMap={haber:'haber',produksiyon:'produksiyon',medya:'medya',ai:'ai'};
  const observer=new MutationObserver(()=>{
    document.querySelectorAll('.cinematic-choice').forEach(btn=>{if(btn.dataset.btBound)return;btn.dataset.btBound='1';const setScene=()=>{if(!unlocked)return;document.body.dataset.heroScene=sceneMap[btn.dataset.choice]||'haber';};btn.addEventListener('mouseenter',setScene);btn.addEventListener('focus',setScene);btn.addEventListener('click',setScene);});
    document.querySelectorAll('.mobile-quick-nav a[data-mobile-nav]').forEach(btn=>{if(btn.dataset.btBound)return;btn.dataset.btBound='1';btn.addEventListener('click',()=>{if(!unlocked)return;const key=btn.dataset.mobileNav;document.body.dataset.heroScene=key==='news'?'haber':key==='portfolio'||key==='media'?'medya':key==='ai'?'ai':'haber';});});
  });
  observer.observe(root,{childList:true,subtree:true});
})();
