/* BTMEDYA public-page motion and catalog controls.
   No analytics, remote calls, media playback, or generated content live here. */
(()=>{
  'use strict';
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerFine=window.matchMedia('(hover: hover) and (pointer: fine)');
  const railSelectors=[
    '.editorial-compass-grid','.news-grid','#newsGrid',
    '.city-radar-grid','.service-grid','.source-grid','.archive-live-grid',
    '.portfoy-grid','.portfolio-grid','.portfolio-rail','.social-profiles',
    '.related-news-grid','.pf .grid','.ai-page .ai-grid','.ai-page .ai-rules'
  ];
  const cardSelectors=[
    '.editorial-compass-card','.news-card','.story-card','.city-radar-card',
    '.service-grid > article','.source-grid > a','.archive-live-card',
    '.portfoy-grid > *','.portfolio-grid > *','.portfolio-rail > *',
    '.social-profiles > *','.related-news-grid > *','.latest-list > a',
    '.pf .grid > *','.ai-page .ai-grid > *','.ai-page .ai-rules > *'
  ].join(',');
  const depthSelectors=['.bt-world-visual','.hero-img','.founder-photo','.ai-visual'];
  let revealObserver=null;
  let generatedId=0;

  function labelFor(el){
    const section=el.closest('section,main,article')||el.parentElement;
    const heading=section&&section.querySelector('h1,h2,h3');
    const text=(heading&&heading.textContent||section&&section.getAttribute('aria-label')||'İçerik kataloğu').replace(/\s+/g,' ').trim();
    return text.slice(0,100);
  }
  function reveal(el,title=false){
    if(!el||el.hasAttribute('data-bt-motion-ready'))return;
    el.setAttribute('data-bt-motion-ready','');
    el.classList.add('bt-motion-reveal');
    if(title)el.classList.add('bt-motion-title');
    if(!reduce.matches&&revealObserver)revealObserver.observe(el);
    else el.classList.add('bt-motion-visible');
  }
  function updateControls(rail,prev,next){
    const max=Math.max(0,rail.scrollWidth-rail.clientWidth);
    prev.disabled=rail.scrollLeft<=2;
    next.disabled=rail.scrollLeft>=max-2;
  }
  function makeRail(rail){
    if(!rail||rail.classList.contains('bt-motion-rail')||rail.children.length<2)return;
    const children=[...rail.children].filter(el=>el.nodeType===1&&!el.matches('.bt-motion-rail-controls,[data-bt-motion-tools]'));
    if(children.length<2)return;
    rail.classList.add('bt-motion-rail');
    if(!rail.id)rail.id='bt-motion-rail-'+(++generatedId);
    if(!rail.hasAttribute('tabindex'))rail.tabIndex=0;
    if(!rail.hasAttribute('role'))rail.setAttribute('role','region');
    if(!rail.hasAttribute('aria-label'))rail.setAttribute('aria-label',labelFor(rail)+' — yatay katalog');

    const tools=document.createElement('div');
    tools.className='bt-motion-rail-controls';
    tools.dataset.btMotionTools='';
    tools.setAttribute('role','group');
    tools.setAttribute('aria-label',labelFor(rail)+' katalog gezinme');
    const prev=document.createElement('button');
    prev.type='button';prev.setAttribute('aria-label','Önceki kartlar');prev.setAttribute('aria-controls',rail.id);prev.textContent='←';
    const next=document.createElement('button');
    next.type='button';next.setAttribute('aria-label','Sonraki kartlar');next.setAttribute('aria-controls',rail.id);next.textContent='→';
    tools.append(prev,next);
    rail.parentNode.insertBefore(tools,rail);
    const behavior=reduce.matches?'auto':'smooth';
    const step=()=>Math.max(240,Math.round(rail.clientWidth*.78));
    prev.addEventListener('click',()=>rail.scrollBy({left:-step(),behavior:reduce.matches?'auto':'smooth'}));
    next.addEventListener('click',()=>rail.scrollBy({left:step(),behavior:reduce.matches?'auto':'smooth'}));
    rail.addEventListener('scroll',()=>updateControls(rail,prev,next),{passive:true});
    rail.addEventListener('keydown',event=>{
      if(event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight'].includes(event.key))return;
      if(event.target.closest('input,textarea,select,button,[contenteditable="true"]'))return;
      event.preventDefault();
      rail.scrollBy({left:(event.key==='ArrowRight'?1:-1)*step(),behavior:reduce.matches?'auto':'smooth'});
    });
    if('ResizeObserver'in window)new ResizeObserver(()=>updateControls(rail,prev,next)).observe(rail);
    requestAnimationFrame(()=>updateControls(rail,prev,next));
    children.forEach((el,index)=>{
      el.style.setProperty('--bt-motion-delay',Math.min(index,4)*55+'ms');
      reveal(el);
    });
  }
  function addDepth(el){
    if(!el||el.hasAttribute('data-bt-depth-ready'))return;
    const images=[...el.querySelectorAll('img')];
    if(!images.length)return;
    el.setAttribute('data-bt-depth-ready','');
    el.classList.add('bt-motion-depth');
    images.forEach(img=>img.classList.add('bt-motion-depth-image'));
    if(reduce.matches||!pointerFine.matches)return;
    let queued=false,lastX=0,lastY=0;
    const paint=()=>{
      queued=false;
      const rect=el.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const nx=Math.max(-1,Math.min(1,(lastX-rect.left)/rect.width*2-1));
      const ny=Math.max(-1,Math.min(1,(lastY-rect.top)/rect.height*2-1));
      const dx=(nx*-3.5).toFixed(2),dy=(ny*-3.5).toFixed(2);
      const angle=(Math.hypot(nx,ny)*.72).toFixed(2);
      const ax=(-ny/(Math.hypot(nx,ny)||1)).toFixed(3),ay=(nx/(Math.hypot(nx,ny)||1)).toFixed(3);
      el.style.setProperty('--bt-motion-dx',dx+'px');
      el.style.setProperty('--bt-motion-dy',dy+'px');
      el.style.setProperty('--bt-motion-rotation',angle==='0.00'?'0deg':`${ax} ${ay} 0 ${angle}deg`);
    };
    el.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch')return;
      lastX=event.clientX;lastY=event.clientY;
      if(!queued){queued=true;requestAnimationFrame(paint);}
    },{passive:true});
    el.addEventListener('pointerleave',()=>{
      el.style.setProperty('--bt-motion-dx','0px');
      el.style.setProperty('--bt-motion-dy','0px');
      el.style.setProperty('--bt-motion-rotation','0deg');
    },{passive:true});
  }
  function setupVideo(video){
    if(!video||video.hasAttribute('data-bt-video-ready'))return;
    video.setAttribute('data-bt-video-ready','');
    video.removeAttribute('autoplay');
    video.autoplay=false;
    video.loop=false;
    video.preload='none';
    const scene=video.closest('.cinematic-video');
    const deferred=!video.getAttribute('src')&&!video.querySelector('source[src]')&&(video.dataset.src||video.dataset.mobile);
    if(!deferred){video.controls=true;return;}
    const host=scene||video.parentElement;
    if(!host)return;
    const button=document.createElement('button');
    button.type='button';
    button.className='bt-motion-video-play';
    button.setAttribute('aria-label','Videoyu oynat');
    button.innerHTML='<span aria-hidden="true">▶</span><span>Videoyu oynat</span>';
    if(!scene){
      host.classList.add('bt-motion-video-host');
      video.controls=false;
    } else {
      video.controls=false;
      const label=host.getAttribute('data-video')||'video';
      button.setAttribute('aria-label',label+' videosunu oynat');
    }
    button.addEventListener('click',()=>{
      if(!video.getAttribute('src')){
        const source=window.innerWidth<=720?(video.dataset.mobile||video.dataset.src):video.dataset.src;
        if(!source){button.disabled=true;button.textContent='Video kaynağı yok';return;}
        video.src=source;
        video.dataset.loaded='1';
        video.load();
      }
      video.controls=true;
      video.muted=true;
      video.play().then(()=>{
        video.closest('.hero-scroll')?.classList.add('hero-story-on');
        button.remove();
      }).catch(()=>{
        button.setAttribute('aria-label','Oynatıcıyı açmayı tekrar dene');
        video.controls=true;
      });
    });
    host.appendChild(button);
  }
  function scan(root=document){
    root.querySelectorAll?.('main h1,main h2,main h3,article h1,article h2').forEach(el=>reveal(el,true));
    root.querySelectorAll?.(cardSelectors).forEach(el=>reveal(el));
    railSelectors.forEach(selector=>root.querySelectorAll?.(selector).forEach(makeRail));
    depthSelectors.forEach(selector=>root.querySelectorAll?.(selector).forEach(addDepth));
    root.querySelectorAll?.('video').forEach(setupVideo);
  }
  function start(){
    if(!reduce.matches&&'IntersectionObserver'in window){
      revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('bt-motion-visible');revealObserver.unobserve(entry.target);}
      }),{rootMargin:'0px 0px -7% 0px',threshold:.08});
      document.documentElement.classList.add('bt-motion-enhanced');
    }
    scan();
    if('MutationObserver'in window){
      let scheduled=false;
      const observer=new MutationObserver(records=>{
        if(scheduled||!records.some(record=>[...record.addedNodes].some(n=>n.nodeType===1)))return;
        scheduled=true;
        requestAnimationFrame(()=>{scheduled=false;scan();});
      });
      observer.observe(document.body,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
