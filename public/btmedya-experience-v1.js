/* BTMEDYA EXPERIENCE V2 · 2026-10-02
   Homepage: 3 müşteri girişi + yönlü sahne geçişi + mobil Sahadan fixes. */
(function(){
  const ready=()=>{
    const root=document.querySelector('.cinematic-hero');
    if(!root)return;
    /* Mobile uses the dedicated scroll motion layer. Do not inject a second
       hero choice navigator into the same interaction surface. */
    if(window.matchMedia('(max-width:720px)').matches)return;
    const copy=root.querySelector('.cinematic-copy');
    if(!copy || root.querySelector('.cinematic-choice-nav'))return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const choices=[
      {key:'haber',label:'HABER',title:'Saha Haberleri',desc:'Kaynaklı haber, röportaj ve özel dosya',direction:-1,target:'haber',progress:.30,link:'/haberler/'},
      {key:'medya',label:'MEDYA',title:'Medya & Prodüksiyon',desc:'Fikirden çekime, kurgudan yayına',direction:1,target:'medya',progress:.52,link:'/hizmetler/'},
      {key:'ai',label:'AI',title:'AI Hizmetleri',desc:'AI LAB, otomasyon ve dijital deneyimler',direction:1,target:'ai',progress:.82,link:'/ai-lab/'}
    ];
    const nav=document.createElement('div');
    nav.className='cinematic-choice-nav';
    nav.setAttribute('aria-label','BTMEDYA hizmet seçimi');
    nav.innerHTML=choices.map((c,i)=>`<button class="cinematic-choice${i===0?' is-active':''}" type="button" data-choice="${c.key}"><small>0${i+1} / ${c.label}</small><strong>${c.title}</strong><span>${c.desc}</span></button>`).join('');
    copy.appendChild(nav);

    const title=root.querySelector('[data-cinematic-title]');
    const kicker=root.querySelector('[data-cinematic-kicker]');
    const source=root.querySelector('[data-cinematic-kaynak]');
    const lead=root.querySelector('[data-cinematic-lead]');
    let activeKey='haber';
    let timer=0;
    const visualFor=key=>key==='ai'?root.querySelector('.cinematic-ai-visual'):root.querySelector(`.cinematic-video[data-video="${key}"]`);
    const setCopy=choice=>{
      if(kicker)kicker.textContent=`0${choice.progress===.30?1:choice.progress===.52?2:3} / ${choice.label}`;
      if(source)source.textContent=choice.key==='ai'?'AI LAB · AÇIKÇA ETİKETLİ':choice.key==='haber'?'GERÇEK ÇEKİM · SAHA':'GERÇEK ÇEKİM · PRODÜKSİYON';
      if(title){const words=choice.title.split(' ');title.innerHTML=words.slice(0,-1).join(' ')+'<br><span>'+words.slice(-1).join(' ')+'</span>';}
      if(lead)lead.textContent=choice.key==='haber'?'Balıkesir ve çevresinden kaynaklı haber, saha röportajı, video haber ve derinlikli özel dosyalar.':choice.key==='medya'?'Tanıtım filmi, düğün klibi, marka filmi, sosyal içerik, Siyah Oda, belgesel ve kısa film için uçtan uca prodüksiyon.':'AI video, görsel, otomasyon ve etkileşimli web deneyimlerini gerçek medya üretiminin yanında, açık etiketle kullan.';
      const cta=copy.querySelector('.button-dark');if(cta)cta.href=choice.link;
    };
    const loadVideo=el=>{const v=el?.querySelector('video');if(!v)return;if(!v.src&&v.dataset.src){v.src=v.dataset.src;v.load();}if(!reduced)v.play?.().catch(()=>{});};
    const activate=choice=>{
      if(!choice||choice.key===activeKey)return;
      const current=visualFor(activeKey),next=visualFor(choice.key);if(!next)return;
      nav.querySelectorAll('.cinematic-choice').forEach(x=>x.classList.toggle('is-active',x.dataset.choice===choice.key));
      root.classList.add('choice-moving');root.dataset.choice=choice.key;root.dataset.choiceDirection=choice.direction<0?'left':choice.key==='ai'?'up':'right';
      current?.classList.add('is-choice-current');next.classList.add('is-choice-next');current?.querySelector('video')?.pause?.();next.querySelector?.('video')?.play?.().catch?.(()=>{});loadVideo(next);
      root.querySelectorAll('.cinematic-video,.cinematic-ai-visual').forEach(x=>x.classList.remove('is-active'));next.classList.add('is-active');setCopy(choice);activeKey=choice.key;
      window.clearTimeout(timer);timer=window.setTimeout(()=>{root.querySelectorAll('.is-choice-current,.is-choice-next').forEach(x=>x.classList.remove('is-choice-current','is-choice-next'));root.classList.remove('choice-moving');},reduced?80:560);
    };
    nav.addEventListener('click',e=>{const btn=e.target.closest('.cinematic-choice');if(!btn)return;activate(choices.find(x=>x.key===btn.dataset.choice));});
    if(!reduced&&matchMedia('(hover:hover)').matches){
      root.addEventListener('pointermove',e=>{const r=root.getBoundingClientRect();root.style.setProperty('--choice-mx',(((e.clientX-r.left)/r.width)-.5).toFixed(3));root.style.setProperty('--choice-my',(((e.clientY-r.top)/r.height)-.5).toFixed(3));},{passive:true});
      nav.querySelectorAll('.cinematic-choice').forEach(btn=>btn.addEventListener('mouseenter',()=>{const choice=choices.find(x=>x.key===btn.dataset.choice),current=visualFor(activeKey);if(current&&choice)current.style.setProperty('--choice-preview-x',String(choice.direction*0.012));}));
    }
    setCopy(choices[0]);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();