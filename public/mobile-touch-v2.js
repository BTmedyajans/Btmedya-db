/* BTMEDYA MOBILE TOUCH MOTION V2 · passive gestures, no scroll hijack */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root||!matchMedia('(max-width:720px)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let startX=0,startY=0,active=false,raf=0;
  const setVars=(x,y,energy=0)=>{
    root.style.setProperty('--bt-touch-x',Math.max(-1,Math.min(1,x)).toFixed(3));
    root.style.setProperty('--bt-touch-y',Math.max(-1,Math.min(1,y)).toFixed(3));
    root.style.setProperty('--bt-touch-energy',Math.max(0,Math.min(1,energy)).toFixed(3));
    root.style.setProperty('--bt-touch-dir',x<0?'-1':'1');
  };
  root.addEventListener('touchstart',e=>{
    const t=e.touches[0];if(!t)return;startX=t.clientX;startY=t.clientY;active=true;root.classList.remove('bt-touch-release');root.classList.add('bt-touch-active');setVars(0,0,.2);
  },{passive:true});
  root.addEventListener('touchmove',e=>{
    if(!active||!e.touches[0])return;const t=e.touches[0];const dx=(t.clientX-startX)/Math.max(1,innerWidth*.42);const dy=(t.clientY-startY)/Math.max(1,innerHeight*.34);const energy=Math.min(1,Math.hypot(dx,dy));
    if(raf)return;raf=requestAnimationFrame(()=>{raf=0;setVars(dx,dy,energy);});
  },{passive:true});
  const release=()=>{if(!active)return;active=false;root.classList.remove('bt-touch-active');root.classList.add('bt-touch-release');setVars(0,0,0);window.setTimeout(()=>root.classList.remove('bt-touch-release'),560);};
  root.addEventListener('touchend',release,{passive:true});root.addEventListener('touchcancel',release,{passive:true});
  document.querySelectorAll('.mobile-quick-nav a').forEach(a=>{
    const ripple=e=>{const r=a.getBoundingClientRect(),t=e.touches?.[0];const x=(t?t.clientX-r.left:r.width/2),y=(t?t.clientY-r.top:r.height/2);a.style.setProperty('--touch-ripple-x',`${x}px`);a.style.setProperty('--touch-ripple-y',`${y}px`);a.classList.remove('touch-ripple');void a.offsetWidth;a.classList.add('touch-ripple');a.classList.add('touch-pressed');setTimeout(()=>a.classList.remove('touch-pressed'),150);};
    a.addEventListener('touchstart',ripple,{passive:true});a.addEventListener('touchend',()=>a.classList.remove('touch-pressed'),{passive:true});
  });
})();
