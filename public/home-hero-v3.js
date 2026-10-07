(()=> {
  const hero=document.getElementById('hero');
  if(!hero || !hero.hasAttribute('data-bt-home-hero-v3')) return;

  const vids=[...hero.querySelectorAll('.bt-home-hero-layer')];
  const film=vids[0];
  if(!film) return;

  const isMobile=()=>window.matchMedia('(max-width:720px)').matches;
  const prefersReduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const connection=()=>navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const saveData=()=>connection()?.saveData===true;

  let currentMode=null;
  let activeSrc='';
  let started=false;

  function chooseSources(){
    const mobile=isMobile();
    const mp4=mobile?film.dataset.mobileMp4:film.dataset.desktopMp4;
    const webm=mobile?film.dataset.mobileWebm:film.dataset.desktopWebm;
    const poster=mobile
      ?'/assets/media/web/giris-filmi-poster.jpg'
      :'/assets/media/web/giris-filmi-genis-poster.jpg';

    return {mobile,mp4,webm,poster};
  }

  function canPlayWebm(){
    return film.canPlayType('video/webm; codecs="vp9,opus"') || film.canPlayType('video/webm');
  }

  function setSource(force=false){
    const s=chooseSources();
    const mode=s.mobile?'mobile':'desktop';
    if(!force && mode===currentMode && film.currentSrc) return;

    currentMode=mode;
    film.poster=s.poster;

    const preferred=saveData()?s.mp4:(canPlayWebm()?s.webm:s.mp4);
    activeSrc=preferred;
    film.src=preferred;
    film.load();
    film.dataset.heroSource=preferred;
    film.dataset.heroLayout=mode;
  }

  function play(){
    if(prefersReduced()) return;
    const p=film.play();
    if(p?.catch) p.catch(()=>{});
  }

  function start(){
    setSource();
    film.muted=true;
    film.playsInline=true;
    play();
  }

  film.addEventListener('loadeddata',()=>play(),{passive:true});
  film.addEventListener('ended',()=>{
    // Film sonuna geldiğinde film-secim.js dallanan üçlü menüyü açar.
    film.currentTime=Math.max(0,film.duration-0.05);
  });
  film.addEventListener('error',()=>{
    const s=chooseSources();
    const fallback=s.mp4;
    if(film.src!==fallback){
      activeSrc=fallback;
      film.src=fallback;
      film.load();
      play();
    }
  });

  let resizeTimer;
  addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      const mode=isMobile()?'mobile':'desktop';
      if(mode!==currentMode){
        film.pause();
        setSource(true);
        play();
      }
    },180);
  },{passive:true});

  // Page Visibility: pause network-heavy video in background and resume on return.
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) film.pause();
    else if(started) play();
  });

  started=true;
  start();
})();