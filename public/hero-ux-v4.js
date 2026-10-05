/* BTMEDYA HERO UX/UI V4 · 2026-10-05
   Makes the intro film ambient rather than a modal gate.
   Video autoplays muted when possible, while audio remains opt-in. */
(() => {
  const root=document.querySelector('.cinematic-hero'); if(!root)return;
  const mobile=matchMedia('(max-width:720px)').matches;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const film=mobile?root.querySelector('.mfilm-video'):root.querySelector('.cinematic-video-1 video');
  if(!film)return;
  const intro=root.querySelector('.bt-hero-intro');
  const soundBtn=mobile?root.querySelector('.mfilm-ses'):root.querySelector('[data-hero-ses]');
  const source=film.dataset.src||film.dataset.srcMobile||'';
  const setSource=()=>{if(!film.getAttribute('src')&&source){film.setAttribute('src',source);film.load();}};
  const hideGate=()=>{if(intro){intro.setAttribute('aria-hidden','true');intro.inert=true}root.classList.add('bt-hero-ux-ready')};
  const revealGate=()=>{if(intro){intro.removeAttribute('aria-hidden');intro.inert=false}};
  const autoplay=async()=>{if(reduced)return;setSource();film.muted=true;film.defaultMuted=true;film.playsInline=true;film.loop=false;try{await film.play();hideGate()}catch{revealGate()}};
  const toggleSound=async()=>{setSource();film.muted=!film.muted;film.defaultMuted=film.muted;try{await film.play()}catch{};if(soundBtn){soundBtn.setAttribute('aria-pressed',String(!film.muted));soundBtn.setAttribute('aria-label',film.muted?'Sesi aç':'Sesi kapat');const span=soundBtn.querySelector('span');if(span)span.textContent=film.muted?'SESİ AÇ':'SESİ KAPAT'}};
  if(soundBtn&&soundBtn.dataset.btUxBound!=='1'){soundBtn.dataset.btUxBound='1';soundBtn.addEventListener('click',toggleSound);soundBtn.hidden=false}
  const startButton=root.querySelector('.bt-hero-start');
  if(startButton&&startButton.dataset.btUxBound!=='1'){startButton.dataset.btUxBound='1';startButton.addEventListener('click',async e=>{e.preventDefault();setSource();film.muted=false;film.defaultMuted=false;try{await film.play()}catch{}hideGate()})}
  const skipButton=root.querySelector('.bt-hero-gec');
  if(skipButton&&skipButton.dataset.btUxBound!=='1'){skipButton.dataset.btUxBound='1';skipButton.addEventListener('click',()=>{film.pause();root.classList.add('bt-hero-ux-skipped');const scene=root.querySelector('.secim-sahnesi');if(scene)scene.hidden=false})}
  film.addEventListener('ended',()=>{root.classList.add('bt-hero-ux-ended');hideGate()});
  setTimeout(autoplay,mobile?120:180);
})();
