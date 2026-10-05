/* BTMEDYA Mobile UX V4
   Scroll-aware thumb navigation: active section follows the visible content.
   No scroll hijacking, no synthetic gestures, no dependency on external APIs. */
(()=> {
  const nav=document.querySelector('.mobile-quick-nav');
  if(!nav || !window.matchMedia('(max-width:720px)').matches) return;
  const links=[...nav.querySelectorAll('a[data-mobile-nav]')];
  const targets=links.map(a=> {
    const href=a.getAttribute('href')||'';
    if(!href.startsWith('#')) return null;
    const id=href.slice(1);
    return id ? document.getElementById(id) : null;
  });
  const setActive=(link)=>{
    links.forEach(a=>a.removeAttribute('aria-current'));
    if(link) link.setAttribute('aria-current','location');
  };
  const home=links.find(a=>a.dataset.mobileNav==='home');
  const observers=[];
  if('IntersectionObserver' in window){
    targets.forEach((el,i)=>{
      if(!el) return;
      const obs=new IntersectionObserver(entries=>{
        if(entries[0]?.isIntersecting) setActive(links[i]);
      },{rootMargin:'-22% 0px -60% 0px',threshold:[0,.15,.35]});
      obs.observe(el); observers.push(obs);
    });
  }
  let ticking=false;
  const updateHome=()=>{
    ticking=false;
    if(window.scrollY < 80) setActive(home);
  };
  window.addEventListener('scroll',()=>{
    if(ticking) return;
    ticking=true; requestAnimationFrame(updateHome);
  },{passive:true});
  updateHome();
  window.addEventListener('pagehide',()=>observers.forEach(o=>o.disconnect()),{once:true});
})();
