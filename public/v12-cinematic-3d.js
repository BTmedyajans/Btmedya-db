/* BTMEDYA V12 cinematic interaction layer */
(function(){
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch=window.matchMedia('(hover:none)').matches;
  const root=document.documentElement;
  const nav=document.querySelector('.bt3d-nav');
  const cursor=document.querySelector('.bt-cursor');
  if(!nav)return;
  let tx=0,ty=0,x=0,y=0,raf=0;
  function frame(){
    raf=0;
    x+=(tx-x)*.1;y+=(ty-y)*.1;
    root.style.setProperty('--btmx',x.toFixed(3));
    root.style.setProperty('--btmy',y.toFixed(3));
    if(!reduce){
      nav.style.transform='translate3d('+(-x*10).toFixed(1)+'px,'+(-y*8).toFixed(1)+'px,0) translateY(-50%)';
      nav.querySelector('.bt3d-orbit').style.transform='rotateX('+(62-y*8).toFixed(2)+'deg) rotateZ('+(-8+x*5).toFixed(2)+'deg)';
    }
  }
  if(!touch&&!reduce){
    window.addEventListener('pointermove',e=>{
      tx=(e.clientX/innerWidth-.5)*2;ty=(e.clientY/innerHeight-.5)*2;
      if(cursor){cursor.style.transform='translate3d('+e.clientX+'px,'+e.clientY+'px,0)';cursor.classList.add('on');}
      if(!raf)raf=requestAnimationFrame(frame);
    },{passive:true});
    document.addEventListener('pointerleave',()=>cursor&&cursor.classList.remove('on'));
    document.querySelectorAll('a,button,.bt3d-node').forEach(el=>{
      el.addEventListener('mouseenter',()=>cursor&&cursor.classList.add('hot'));
      el.addEventListener('mouseleave',()=>cursor&&cursor.classList.remove('hot'));
    });
  }
  const links=nav.querySelectorAll('a[href^="#"]');
  links.forEach(a=>a.addEventListener('click',e=>{
    const id=a.getAttribute('href');const target=document.querySelector(id);
    if(!target)return;
    e.preventDefault();
    target.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
  }));
  const hero=document.querySelector('.hero');
  if(hero&&!reduce){
    window.addEventListener('scroll',()=>{
      const p=Math.min(1,Math.max(0,scrollY/Math.max(1,hero.offsetHeight)));
      hero.style.setProperty('--bt-hero-scroll',p.toFixed(3));
      nav.style.opacity=String(Math.max(.25,1-p*1.5));
    },{passive:true});
  }
  document.querySelectorAll('.display').forEach(h=>{
    const text=h.textContent.trim();
    if(!text||h.children.length>0)return;
    h.innerHTML='<span class="bt3d-word">'+text.replace(/\n/g,' ')+'</span>';
  });
  if(!reduce&&!touch){
    document.querySelectorAll('.news-card,.portfoy-kart,.archive-live-card,.service-grid article').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
        card.style.transform='perspective(900px) rotateX('+(-py*3).toFixed(2)+'deg) rotateY('+(px*4).toFixed(2)+'deg) translateY(-3px)';
      });
      card.addEventListener('pointerleave',()=>card.style.removeProperty('transform'));
    });
  }
})();
