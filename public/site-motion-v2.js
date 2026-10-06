/* BTMEDYA MOTION SYSTEM V2 · no dependencies, progressive enhancement */
(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow=matchMedia('(max-width:720px)').matches;
  document.body.classList.add('bt-motion-ready');

  // Dynamic page transition for same-origin document links; modifier keys and downloads stay native.
  const pathLabel=href=>{
    try{const p=new URL(href,location.href).pathname.split('/').filter(Boolean).pop()||'BTMEDYA';return p.replace(/[-_]/g,' ').toUpperCase();}catch{return 'BTMEDYA';}
  };
  const transition=document.createElement('div');
  transition.className='bt-page-transition';transition.setAttribute('aria-hidden','true');
  transition.innerHTML='<div class="bt-transition-inner"><div><div class="bt-transition-kicker">BTMEDYA / NEXT SCENE</div><div class="bt-transition-title">YENİ<br>SAHNE.</div></div><div class="bt-transition-index">01</div></div>';
  document.body.appendChild(transition);
  const title=transition.querySelector('.bt-transition-title'),index=transition.querySelector('.bt-transition-index');
  let leaving=false;
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]'); if(!a||leaving||e.defaultPrevented)return;
    if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank'||a.hasAttribute('download'))return;
    let u;try{u=new URL(a.href,location.href)}catch{return;}
    if(u.origin!==location.origin||u.pathname===location.pathname&&u.hash)return;
    if(a.getAttribute('href').startsWith('#'))return;
    // Sayfa içinde kendi geçişini yapan bağlantılar (haber merkezi kategori
    // rayı) tam sayfa yüklemesine çevrilmez; yoksa 380 ms sonra sayfa yenilenir.
    if(a.closest('[data-hm-kategori],[data-bt-gecissiz]'))return;
    e.preventDefault();leaving=true;
    title.innerHTML=`${pathLabel(u.href)}<br><span style="color:var(--bt-motion-lime)">AKIŞI.</span>`;
    index.textContent=String((document.querySelectorAll('a[href^="/"]').length%9)+1).padStart(2,'0');
    transition.classList.add('is-active');transition.setAttribute('aria-hidden','false');
    setTimeout(()=>{location.href=u.href},reduced?80:380);
  },{capture:true});
  window.addEventListener('pageshow',()=>{transition.classList.remove('is-active');transition.setAttribute('aria-hidden','true');leaving=false});

  if(reduced||narrow)return;
  let raf=0;
  const updatePointer=e=>{
    if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;document.body.style.setProperty('--bt-mx',x.toFixed(3));document.body.style.setProperty('--bt-my',y.toFixed(3));document.body.style.setProperty('--bt-tilt-x',`${(y*-12).toFixed(2)}deg`);document.body.style.setProperty('--bt-tilt-y',`${(x*16).toFixed(2)}deg`);document.body.style.setProperty('--bt-tilt-z',`${(x*y*7).toFixed(2)}deg`);});
  };
  window.addEventListener('pointermove',updatePointer,{passive:true});
  const onScroll=()=>{document.body.style.setProperty('--bt-scroll',Math.min(1,scrollY/Math.max(1,innerHeight*2)).toFixed(3));};
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
})();
