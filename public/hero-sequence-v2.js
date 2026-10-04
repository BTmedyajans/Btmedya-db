/* BTMEDYA HERO SEQUENCE V2
   Intro film -> sound-enabled playback -> end card -> category interactions.
   Audio autoplay is not forced: the first user gesture is used to satisfy browser policy. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile=matchMedia('(max-width:720px)').matches;
  const film=mobile?root.querySelector('.mfilm-video'):root.querySelector('.cinematic-video-1 video');
  if(!film)return;
  const intro= document.createElement('div'); intro.className='bt-hero-intro'; intro.setAttribute('role','dialog'); intro.setAttribute('aria-label','BTMEDYA giriş filmi');
  intro.innerHTML='<div class="bt-hero-intro-card"><span class="bt-hero-intro-kicker">BTMEDYA / FULL INTRO</span><strong>ÖNCE<br><em>HİKÂYE.</em></strong><p>Giriş filmi tamamlandıktan sonra üretim dünyaları ve kategori seçimleri açılır.</p><button type="button" class="bt-hero-start">Sesi aç ve filmi başlat ↗</button><small class="bt-hero-intro-note">Tarayıcı kuralı nedeniyle ses, ilk dokunuşunuzla açılır.</small></div>';
  root.appendChild(intro);
  const start=intro.querySelector('.bt-hero-start');
  let unlocked=false,started=false;
  const categoryVideos=()=>[...root.querySelectorAll('.cinematic-video video')].filter(v=>v!==film);
  const silenceCategories=()=>categoryVideos().forEach(v=>{v.pause();v.muted=true;v.defaultMuted=true;});
  const unlock=()=>{
    if(unlocked)return; unlocked=true; silenceCategories(); document.body.classList.remove('bt-hero-intro-lock');root.classList.remove('bt-hero-intro-active');root.classList.add('bt-hero-intro-complete');intro.setAttribute('aria-hidden','true');
    document.querySelectorAll('.mobile-quick-nav a').forEach((a,i)=>a.style.setProperty('--bt-nav-delay',`${i*35}ms`));
  };
  const play=withSound=>{
    if(!film)return;
    silenceCategories();
    started=true; film.loop=false; film.preload='auto'; film.playsInline=true; film.defaultMuted=!withSound; film.muted=!withSound?true:false;
    const source=film.currentSrc||film.src||film.dataset.src;
    if(!film.src&&film.dataset.src){film.src=film.dataset.src;film.load();}
    const p=film.play();
    if(p&&p.catch)p.catch(()=>{film.muted=true;film.play().catch(()=>{});});
    intro.classList.add('is-playing');
    start.textContent=withSound?'Film oynuyor · ses açık':'Film oynuyor · sessiz';
    if(source)film.dataset.heroIntroSource=source;
  };
  const begin=e=>{e?.preventDefault();play(true);};
  document.body.classList.add('bt-hero-intro-lock');root.classList.add('bt-hero-intro-active');film.loop=false;film.pause();film.muted=true;
  start.addEventListener('click',begin);
  film.addEventListener('click',()=>{if(!started)play(true);});
  film.addEventListener('ended',unlock,{once:true});
  film.addEventListener('error',()=>{if(!unlocked){intro.querySelector('p').textContent='Film yüklenemedi; etkileşimli girişe geçiliyor.';setTimeout(unlock,900);}}, {once:true});
  if(reduced){intro.querySelector('p').textContent='Düşük hareket tercihiniz nedeniyle statik giriş kullanılıyor.';setTimeout(unlock,100);}
  const sceneMap={haber:'haber',produksiyon:'produksiyon',medya:'medya',ai:'ai'};
  const observer=new MutationObserver(()=>{
    document.querySelectorAll('.cinematic-choice').forEach(btn=>{if(btn.dataset.btBound)return;btn.dataset.btBound='1';const setScene=()=>{if(!unlocked)return;document.body.dataset.heroScene=sceneMap[btn.dataset.choice]||'haber';};btn.addEventListener('mouseenter',setScene);btn.addEventListener('focus',setScene);btn.addEventListener('click',setScene);});
    document.querySelectorAll('.mobile-quick-nav a[data-mobile-nav]').forEach(btn=>{if(btn.dataset.btBound)return;btn.dataset.btBound='1';btn.addEventListener('click',()=>{if(!unlocked)return;const key=btn.dataset.mobileNav;document.body.dataset.heroScene=key==='news'?'haber':key==='portfolio'||key==='media'?'medya':key==='ai'?'ai':'haber';});});
  });
  observer.observe(root,{childList:true,subtree:true});
})();
