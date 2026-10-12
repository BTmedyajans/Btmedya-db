/* BTMEDYA mobile title motion · 2026-10-13
   Progressive enhancement only: category links stay usable if JS fails. */
(()=> {
  const root=document.querySelector('body.ana-sade #hero .giris-v5-kat');
  if(!root)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const headings=[...root.querySelectorAll('.giris-v5-kat-ana b')];
  headings.forEach((heading,index)=>{
    heading.dataset.btMotionText=heading.textContent.trim();
    heading.setAttribute('aria-label',heading.dataset.btMotionText);
    heading.setAttribute('aria-hidden','true');
    heading.innerHTML=[...heading.dataset.btMotionText].map((ch,i)=>
      ch===' '?'<span class="bt-mobile-letter bt-mobile-space" style="--letter:'+i+'"> </span>':
      '<span class="bt-mobile-letter" style="--letter:'+i+'">'+ch.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</span>'
    ).join('');
    const link=heading.closest('a');
    if(link&&!link.querySelector('.bt-mobile-sr')) {
      const sr=document.createElement('span');sr.className='bt-mobile-sr';sr.textContent=heading.dataset.btMotionText;
      sr.style.cssText='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';
      link.appendChild(sr);
    }
  });
  const style=document.createElement('style');
  style.textContent='.bt-mobile-letter{display:inline-block;opacity:1;transform:none}.bt-mobile-sr{position:absolute!important}@media(max-width:720px){body.ana-sade #hero .giris-v5-kat.is-acik .bt-mobile-letter{animation:btMobileLetter .48s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(.08s + var(--letter)*.025s)}.bt-mobile-space{width:.24em}}@keyframes btMobileLetter{from{opacity:0;transform:translateY(.45em);filter:blur(5px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}@media(prefers-reduced-motion:reduce){.bt-mobile-letter{animation:none!important}}';
  document.head.appendChild(style);
  if(reduce)return;
  // On return visits, the existing intro controller opens the category panel;
  // re-trigger letter motion when it becomes visible, without restarting video.
  const observer=new MutationObserver(()=>{
    if(root.classList.contains('is-acik')) headings.forEach(h=>{
      h.querySelectorAll('.bt-mobile-letter').forEach(el=>{el.style.animation='none';void el.offsetWidth;el.style.removeProperty('animation')});
    });
  });
  observer.observe(root,{attributes:true,attributeFilter:['class']});
})();