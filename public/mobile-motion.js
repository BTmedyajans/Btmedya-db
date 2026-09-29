/* BTMEDYA Mobile Motion Engine — 2026-09-29 / V2
   Mobile-first hero: no autoplay video download on phones.
   Each scroll scene uses an existing poster/AI visual, while the copy changes.
   This keeps the opening fast and legible on small screens. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root || window.innerWidth>720) return;
  const sticky=root.querySelector('.cinematic-sticky'), videos=[...root.querySelectorAll('.cinematic-video video')];
  const title=root.querySelector('[data-cinematic-title]'),kicker=root.querySelector('[data-cinematic-kicker]'),source=root.querySelector('[data-cinematic-kaynak]'),lead=root.querySelector('[data-cinematic-lead]'),index=root.querySelector('[data-cinematic-index]'),progress=root.querySelector('[data-cinematic-progress]'),label=root.querySelector('[data-cinematic-label]');
  if(!sticky||!title)return;

  root.classList.add('bt-mobile-motion');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scenes=[
    {yuva:'hero-video',k:'01 / GİRİŞ',source:'GERÇEK ÇEKİM · ARŞİV',t:'GERÇEK<br><span>HİKÂYELER.</span>',d:'Balıkesir’den sahaya, içerikten yayına tek üretim zinciri.',bg:'/assets/media/web/hero-story-poster.jpg'},
    {yuva:'kategori-haber',k:'02 / HABER · SAHA',source:'GERÇEK ÇEKİM · ARŞİV',t:'ŞEHRİN<br><span>HİKÂYESİ.</span>',d:'Haber, röportaj ve saha görüntüsü aynı akışta buluşuyor.',bg:'/assets/media/web/poster-state-haber.webp'},
    {yuva:'kategori-medya',k:'03 / MEDYA · İÇERİK',source:'GERÇEK ÇEKİM · ARŞİV',t:'İÇERİĞİ<br><span>HAREKETE GEÇİR.</span>',d:'Fotoğraf, kısa video ve sosyal medya için platforma uygun üretim.',bg:'/assets/media/web/poster-state-medya.webp'},
    {yuva:'kategori-prod',k:'04 / PRODÜKSİYON',source:'GERÇEK ÇEKİM · ARŞİV',t:'KAMERA<br><span>AÇIK.</span>',d:'Kadraj, kurgu ve yayın: fikri görüntüye dönüştürüyoruz.',bg:'/assets/media/web/poster-state-produksiyon.webp'},
    {k:'05 / AI LAB · AÇIK ETİKET',source:'AI ÜRETİMİ · AÇIKÇA ETİKETLİ',t:'YENİ<br><span>ARAÇLAR.</span>',d:'AI video, AI görsel ve otomasyon ayrı, açık ve kontrollü bir üretim alanı.',bg:'/assets/media/ai-lab/ai-portre-studyo.webp'}
  ];

  const state={active:-1,raf:0};

  window.btYuvalar&&window.btYuvalar.then(y=>{
    scenes.forEach((s,i)=>{
      const a=s.yuva&&y&&y[s.yuva];
      if(!a||a.tur!=='video') return;
      s.source=a.gercek?'GERÇEK ÇEKİM · ARŞİV':'AI ÜRETİMİ';
      if(i===state.active&&source) source.textContent=s.source;
    });
  }).catch(()=>{});

  const setScene=(i,force=false)=>{
    if(i<0||i>=scenes.length||(!force&&i===state.active))return;
    state.active=i;
    const s=scenes[i];
    kicker&&(kicker.textContent=s.k);
    source&&(source.textContent=s.source);
    title.innerHTML=s.t;
    lead&&(lead.textContent=s.d);
    index&&(index.textContent=String(i+1).padStart(2,'0'));
    label&&(label.textContent=s.k);
    root.style.setProperty('--mm-bg',"url('"+s.bg+"')");
    root.style.setProperty('--mm-scale','1.02');
    root.classList.remove('beat-haber','beat-medya','beat-produksiyon','beat-ai');
    if(i>0) root.classList.add('beat-'+['hero','haber','medya','produksiyon','ai'][i]);

    if(!window.matchMedia('(max-width:720px)').matches) {
      videos.forEach((v,n)=>{
        const active=n===i;
        v.pause();
        v.style.opacity=active?'1':'0';
        v.style.transform=active?'scale(1.03)':'scale(1.06)';
        if(active&&!reduced){v.currentTime=0;v.play().catch(()=>{});}
      });
    } else {
      // Mobilde poster katmanı kullanılır; data-src'lı videolar indirilmez.
      videos.forEach(v=>{
        v.pause();
        v.style.opacity='0';
        v.style.transform='none';
      });
    }
  };

  const render=(force=false)=>{
    state.raf=0;
    const range=Math.max(1,root.offsetHeight-window.innerHeight);
    const p=Math.max(0,Math.min(1,-root.getBoundingClientRect().top/range));
    const scaled=p*(scenes.length-1);
    const i=Math.min(scenes.length-1,Math.floor(scaled+.0001));
    const local=scaled-i;
    setScene(i,force);
    root.style.setProperty('--mm-progress',p.toFixed(4));
    root.style.setProperty('--hero-progress',p.toFixed(4));
    if(progress)progress.style.width=(p*100)+'%';
    root.style.setProperty('--mm-copy-y',(local*18)+'px');
    root.style.setProperty('--mm-copy-opacity',String(1-Math.min(1,local*2.2)*.24));
    sticky.style.setProperty('--hero-progress',p.toFixed(4));
  };

  const request=(force=false)=>{
    if(!state.raf) state.raf=requestAnimationFrame(()=>render(force));
  };

  root.addEventListener('btsahne',()=>request(true),{passive:true});

  const resize=()=>{
    root.style.height=Math.max(window.innerHeight*5.2,2600)+'px';
    request(true);
  };

  let hint=sticky.querySelector('.cinematic-mobile-hint');
  if(!hint){
    hint=document.createElement('div');
    hint.className='cinematic-mobile-hint';
    hint.textContent='KAYDIR · HİKÂYEYİ KEŞFET';
    sticky.appendChild(hint);
  }

  if(!reduced){
    window.addEventListener('scroll',()=>request(false),{passive:true});
    window.addEventListener('resize',()=>{if(window.innerWidth<=720)resize();},{passive:true});
  }

  resize();
})();