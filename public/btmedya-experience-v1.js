/* BTMEDYA EXPERIENCE V3 · 2026-10-03
   Desktop hero: gerçek arşiv videosu + 4 üretim dünyası + editorial motion. */
(function(){
  const ready=()=>{
    const root=document.querySelector('.cinematic-hero');
    if(window.matchMedia('(max-width:720px)').matches)return;
    if(!root)return;
    const copy=root.querySelector('.cinematic-copy');
    if(!copy || root.querySelector('.cinematic-choice-nav'))return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const choices=[
      {key:'haber',label:'HABER',title:'Saha Haberleri',desc:'Kaynaklı haber, röportaj ve özel dosya',direction:-1,link:'/haberler/',source:'GERÇEK ÇEKİM · SAHA',video:'/assets/sosyal/balikesir-in-en-kalabalik-pazari-dikey.mp4'},
      {key:'produksiyon',label:'PRODÜKSİYON',title:'Kamera Açık',desc:'Fikirden çekime, kurgudan yayına',direction:1,link:'/video-produksiyon/',source:'GERÇEK ÇEKİM · BTMEDYA PRODÜKSİYON',video:'/assets/media/web/showreel-action.mp4'},
      {key:'medya',label:'MEDYA',title:'İçeriği Harekete Geçir',desc:'Fotoğraf, kısa video ve sosyal içerik',direction:1,link:'/portfoy/',source:'GERÇEK ÇEKİM · BTMEDYA ARŞİVİ',video:'/assets/media/portfoy/btmedya-saha-showreel.mp4'},
      {key:'ai',label:'AI LAB',title:'Yeni Nesil Üretim',desc:'AI video, görsel, otomasyon ve web',direction:1,link:'/ai-lab/',source:'AI ÜRETİMİ · AÇIKÇA ETİKETLİ',video:null}
    ];
    const nav=document.createElement('div');
    nav.className='cinematic-choice-nav';
    nav.setAttribute('aria-label','BTMEDYA üretim dünyası seçimi');
    nav.innerHTML=choices.map((c,i)=>`<button class="cinematic-choice${i===0?' is-active':''}" type="button" data-choice="${c.key}" aria-pressed="${i===0?'true':'false'}"><small>0${i+1} / ${c.label}</small><strong>${c.title}</strong><span>${c.desc}</span></button>`).join('');
    copy.appendChild(nav);
    const style=document.createElement('style');
    style.textContent=`
      .cinematic-choice-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:22px;max-width:980px;position:relative;z-index:5}
      .cinematic-choice{appearance:none;border:1px solid rgba(255,255,255,.18);background:rgba(8,8,8,.42);backdrop-filter:blur(12px);color:#fff;text-align:left;padding:12px 13px;min-height:86px;cursor:pointer;transition:transform .35s ease,border-color .35s ease,background .35s ease}
      .cinematic-choice small{display:block;font:600 10px/1.2 ui-monospace,monospace;letter-spacing:.12em;opacity:.65;margin-bottom:7px}
      .cinematic-choice strong{display:block;font-size:14px;line-height:1.1;letter-spacing:.02em}
      .cinematic-choice span{display:block;font-size:11px;line-height:1.35;opacity:.68;margin-top:7px}
      .cinematic-choice:hover,.cinematic-choice.is-active{transform:translateY(-4px);border-color:rgba(255,255,255,.58);background:rgba(255,255,255,.09)}
      .cinematic-hero.choice-moving .cinematic-copy{transform:translate3d(var(--choice-x,0),var(--choice-y,0),0);transition:transform .56s cubic-bezier(.22,.8,.2,1)}
      .cinematic-hero.choice-moving .cinematic-grid{opacity:.85;transition:opacity .35s ease}
      @media (max-width:980px){.cinematic-choice-nav{grid-template-columns:repeat(2,minmax(0,1fr));max-width:680px}.cinematic-choice{min-height:74px}}
      @media (max-width:720px){.cinematic-choice-nav{display:none}}
    `;
    document.head.appendChild(style);
    const title=root.querySelector('[data-cinematic-title]');
    const kicker=root.querySelector('[data-cinematic-kicker]');
    const source=root.querySelector('[data-cinematic-kaynak]');
    const lead=root.querySelector('[data-cinematic-lead]');
    let activeKey='haber';
    let timer=0;
    const visualFor=key=>key==='ai'?root.querySelector('.cinematic-ai-visual'):root.querySelector(`.cinematic-video[data-video="${key}"]`);
    const setSource=choice=>{
      const video=visualFor(choice.key)?.querySelector('video');
      if(video&&choice.video){
        if(video.dataset.src!==choice.video){video.dataset.src=choice.video;video.removeAttribute('src');video.load();}
        video.setAttribute('aria-label',choice.label+' gerçek çekim videosu');
      }
    };
    const setCopy=choice=>{
      if(kicker)kicker.textContent=`0${choices.indexOf(choice)+1} / ${choice.label}`;
      if(source)source.textContent=choice.source;
      if(title){const words=choice.title.split(' ');title.innerHTML=words.slice(0,-1).join(' ')+'<br><span>'+words.slice(-1).join(' ')+'</span>';}
      if(lead)lead.textContent=choice.key==='haber'?'Balıkesir ve çevresinden kaynaklı haber, saha röportajı, video haber ve derinlikli özel dosyalar.':choice.key==='produksiyon'?'Tanıtım filmi, belgesel, reklam, kamera, kurgu ve yayın için uçtan uca gerçek prodüksiyon.':choice.key==='medya'?'Gerçek çekim, kısa video, fotoğraf, Reels ve marka içeriklerini platforma göre üretiyoruz.':'AI video, görsel, otomasyon ve etkileşimli web deneyimlerini gerçek medya üretiminin yanında, açık etiketle kullan.';
      const cta=copy.querySelector('.button-dark');if(cta)cta.href=choice.link;
      setSource(choice);
    };
    const loadVideo=el=>{const v=el?.querySelector('video');if(!v)return;if(!v.src&&v.dataset.src){v.src=v.dataset.src;v.load();}if(!reduced)v.play?.().catch(()=>{});};
    const activate=choice=>{
      if(!choice||choice.key===activeKey)return;
      const current=visualFor(activeKey),next=visualFor(choice.key);if(!next)return;
      nav.querySelectorAll('.cinematic-choice').forEach(x=>{const on=x.dataset.choice===choice.key;x.classList.toggle('is-active',on);x.setAttribute('aria-pressed',String(on));});
      root.classList.add('choice-moving');root.dataset.choice=choice.key;root.dataset.choiceDirection=choice.direction<0?'left':choice.key==='ai'?'up':'right';
      current?.classList.add('is-choice-current');next.classList.add('is-choice-next');current?.querySelector('video')?.pause?.();
      setSource(choice);loadVideo(next);
      root.querySelectorAll('.cinematic-video,.cinematic-ai-visual').forEach(x=>x.classList.remove('is-active'));next.classList.add('is-active');
      setCopy(choice);activeKey=choice.key;
      window.clearTimeout(timer);timer=window.setTimeout(()=>{root.querySelectorAll('.is-choice-current,.is-choice-next').forEach(x=>x.classList.remove('is-choice-current','is-choice-next'));root.classList.remove('choice-moving');},reduced?80:560);
    };
    nav.addEventListener('click',e=>{const btn=e.target.closest('.cinematic-choice');if(btn)activate(choices.find(x=>x.key===btn.dataset.choice));});
    if(!reduced&&matchMedia('(hover:hover)').matches){
      root.addEventListener('pointermove',e=>{const r=root.getBoundingClientRect();root.style.setProperty('--choice-mx',(((e.clientX-r.left)/r.width)-.5).toFixed(3));root.style.setProperty('--choice-my',(((e.clientY-r.top)/r.height)-.5).toFixed(3));},{passive:true});
      nav.querySelectorAll('.cinematic-choice').forEach(btn=>btn.addEventListener('mouseenter',()=>{const choice=choices.find(x=>x.key===btn.dataset.choice),current=visualFor(activeKey);if(current&&choice)current.style.setProperty('--choice-preview-x',String(choice.direction*0.012));}));
    }
    setCopy(choices[0]);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
