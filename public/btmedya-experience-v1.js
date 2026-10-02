/* BTMEDYA EXPERIENCE V1 · 2026-10-02 */
(function(){
  const ready=()=>{
    const root=document.querySelector('.cinematic-hero');
    if(!root) return;
    const copy=root.querySelector('.cinematic-copy');
    if(!copy || root.querySelector('.cinematic-choice-nav')) return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const choices=[
      {key:'haber',label:'HABER',title:'Medya Haber',desc:'Sahadan güncel yayın',progress:.30,direction:-1},
      {key:'medya',label:'MEDYA',title:'Medya & Prodüksiyon',desc:'Çekim, video, sosyal içerik',progress:.52,direction:1},
      {key:'ai',label:'AI',title:'AI Hizmetleri',desc:'AI LAB ve dijital çözümler',progress:.82,direction:1}
    ];
    const nav=document.createElement('div');
    nav.className='cinematic-choice-nav';
    nav.setAttribute('aria-label','BTMEDYA hizmet seçimi');
    nav.innerHTML=choices.map((c,i)=>`<button class="cinematic-choice${i===0?' is-active':''}" type="button" data-choice="${c.key}"><small>0${i+1} / ${c.label}</small><strong>${c.title}</strong><span>${c.desc}</span></button>`).join('');
    copy.appendChild(nav);

    const targetTop=progress=>{
      const rect=root.getBoundingClientRect();
      const travel=Math.max(1,root.offsetHeight-window.innerHeight);
      return Math.max(0,window.scrollY+rect.top+travel*progress);
    };
    const activate=choice=>{
      const btn=nav.querySelector(`[data-choice="${choice.key}"]`);
      nav.querySelectorAll('.cinematic-choice').forEach(x=>x.classList.toggle('is-active',x===btn));
      const active=root.querySelector('.cinematic-video.is-active');
      const video=active?.querySelector('video');
      if(video && !video.paused) video.pause();
      root.classList.add('choice-moving');
      if(active && !reduced){
        active.style.transform=`translate3d(${choice.direction*24}vw,0,0) scale(.985)`;
        active.style.opacity='.25';
      }
      window.setTimeout(()=>{
        window.scrollTo({top:targetTop(choice.progress),behavior:reduced?'auto':'smooth'});
        window.setTimeout(()=>{
          if(active){active.style.transform='';active.style.opacity='';}
          root.classList.remove('choice-moving');
        },reduced?50:520);
      },reduced?0:260);
    };
    nav.addEventListener('click',e=>{
      const btn=e.target.closest('.cinematic-choice');
      if(!btn) return;
      const choice=choices.find(x=>x.key===btn.dataset.choice);
      if(choice) activate(choice);
    });

    // Mouse direction adds a subtle directional cue without moving the actual identity.
    if(!reduced && matchMedia('(hover:hover)').matches){
      root.addEventListener('pointermove',e=>{
        const r=root.getBoundingClientRect();
        root.style.setProperty('--choice-mx',(((e.clientX-r.left)/r.width)-.5).toFixed(3));
        root.style.setProperty('--choice-my',(((e.clientY-r.top)/r.height)-.5).toFixed(3));
      },{passive:true});
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true}); else ready();
})();
