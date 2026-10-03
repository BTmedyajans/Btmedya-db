/* BTMEDYA Mobile Motion Engine V5 · 2026-10-03
   Mobilde tek video omurgası: her sahne kendi gerçek arşiv videosunu kullanır.
   AI LAB ayrı ve açıkça etiketli görsel yüzeydir. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root || window.innerWidth>720)return;
  const sticky=root.querySelector('.cinematic-sticky');
  const videos=[...root.querySelectorAll('.cinematic-video video')];
  const title=root.querySelector('[data-cinematic-title]'),kicker=root.querySelector('[data-cinematic-kicker]'),source=root.querySelector('[data-cinematic-kaynak]'),lead=root.querySelector('[data-cinematic-lead]'),index=root.querySelector('[data-cinematic-index]'),progress=root.querySelector('[data-cinematic-progress]'),label=root.querySelector('[data-cinematic-label]'),sound=root.querySelector('[data-hero-ses]'),aiVisual=root.querySelector('.cinematic-ai-visual');
  if(!sticky||!title||!videos[0])return;
  root.classList.add('bt-mobile-motion');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileHero=videos[0];
  const lowVolume=.12;
  const scenes=[
    {key:'home',tone:'gold',k:'01 / GİRİŞ',source:'GERÇEK ÇEKİM · BTMEDYA ARŞİVİ',t:'GERÇEK<br><span>HİKÂYELER.</span>',d:'Balıkesir’den sahaya, içerikten yayına tek üretim zinciri.',video:'/assets/media/web/hero-story-mobile.mp4',bg:'/assets/media/web/hero-story-poster.jpg'},
    {key:'haber',tone:'cyan',k:'02 / HABER · SAHA',source:'AI ÜRETİMİ GÖRSEL · HABER KARTI',t:'ŞEHRİN<br><span>HİKÂYESİ.</span>',d:'Haber, röportaj ve sosyal kart aynı akışta buluşuyor.',video:'/assets/sosyal/balikesir-in-en-kalabalik-pazari-dikey.mp4',bg:'/assets/media/web/poster-state-haber.webp'},
    {key:'medya',tone:'violet',k:'03 / MEDYA · İÇERİK',source:'GERÇEK ÇEKİM · BTMEDYA ARŞİVİ',t:'İÇERİĞİ<br><span>HAREKETE GEÇİR.</span>',d:'Gerçek çekim, kısa video, fotoğraf ve sosyal içerik üretimi.',video:'/assets/media/portfoy/btmedya-saha-showreel.mp4',bg:'/assets/media/web/poster-state-medya.webp'},
    {key:'produksiyon',tone:'green',k:'04 / PRODÜKSİYON',source:'GERÇEK ÇEKİM · BTMEDYA PRODÜKSİYON',t:'KAMERA<br><span>AÇIK.</span>',d:'Kadraj, kurgu ve yayın: fikri görüntüye dönüştürüyoruz.',video:'/assets/media/web/showreel-action.mp4',bg:'/assets/media/web/poster-state-produksiyon.webp'},
    {key:'ai',tone:'red',k:'05 / AI LAB · AÇIK ETİKET',source:'AI ÜRETİMİ · AÇIKÇA ETİKETLİ',t:'YENİ<br><span>ARAÇLAR.</span>',d:'AI video, AI görsel, otomasyon ve web deneyimleri ayrı ve şeffaf bir laboratuvar.',video:null,bg:'/assets/media/ai-lab/ai-portre-studyo.webp'}
  ];
  const state={active:-1,raf:0};
  const swapText=(el,value,html=false)=>{
    if(!el)return;
    if(reduced){html?el.innerHTML=value:el.textContent=value;return;}
    el.classList.remove('mm-text-in');el.classList.add('mm-text-out');
    window.setTimeout(()=>{html?el.innerHTML=value:el.textContent=value;el.classList.remove('mm-text-out');el.classList.add('mm-text-in');window.setTimeout(()=>el.classList.remove('mm-text-in'),360);},150);
  };
  const setVideo=(scene)=>{
    if(scene.video){
      aiVisual?.classList.remove('is-active');
      mobileHero.style.visibility='visible';
      if(mobileHero.dataset.mmSource!==scene.video){
        mobileHero.dataset.mmSource=scene.video;
        mobileHero.src=scene.video;
        mobileHero.load();
      }
      mobileHero.muted=true;mobileHero.defaultMuted=true;mobileHero.volume=lowVolume;mobileHero.playsInline=true;mobileHero.loop=true;
    }else{
      mobileHero.pause();mobileHero.style.visibility='hidden';
      if(aiVisual){aiVisual.classList.add('is-active');aiVisual.style.visibility='visible';}
    }
  };
  const enableLowSound=()=>{if(!mobileHero||reduced)return;mobileHero.volume=lowVolume;mobileHero.muted=false;mobileHero.play().catch(()=>{});sound?.removeAttribute('hidden');if(sound){sound.setAttribute('aria-pressed','true');sound.querySelector('span')?.replaceChildren('SESİ KAPAT · %12');}};
  const disableSound=()=>{if(!mobileHero)return;mobileHero.muted=true;if(sound){sound.setAttribute('aria-pressed','false');sound.querySelector('span')?.replaceChildren('SESİ AÇ · %12');}};
  sound?.addEventListener('click',e=>{e.preventDefault();mobileHero?.muted?enableLowSound():disableSound();});

  window.btYuvalar&&window.btYuvalar.then(y=>{
    const map={home:'hero-video',haber:'kategori-haber',medya:'kategori-medya',produksiyon:'kategori-prod'};
    scenes.forEach(s=>{const a=map[s.key]&&y?.[map[s.key]];if(a?.tur==='video'&&a.url)s.video=String(a.url);if(a?.tur==='video'&&a.gercek)s.source='GERÇEK ÇEKİM';});
  }).catch(()=>{});

  const setScene=(i,force=false)=>{
    if(i<0||i>=scenes.length||(!force&&i===state.active))return;
    state.active=i;const s=scenes[i];
    swapText(kicker,s.k);swapText(source,s.source);swapText(title,s.t,true);swapText(lead,s.d);
    index&&(index.textContent=String(i+1).padStart(2,'0'));label&&(label.textContent=s.k);
    root.dataset.mmScene=s.key;root.style.setProperty('--mm-accent',`var(--mm-${s.tone})`);root.style.setProperty('--mm-bg',`url('${s.bg}')`);
    root.style.setProperty('--mm-scale',s.key==='ai'?'1.00':'1.025');
    root.classList.remove('beat-haber','beat-medya','beat-produksiyon','beat-ai');
    if(i>0)root.classList.add('beat-'+s.key);
    setVideo(s);
    if(!reduced&&s.video)mobileHero.play().catch(()=>{});
  };
  const render=(force=false)=>{
    state.raf=0;
    const range=Math.max(1,root.offsetHeight-window.innerHeight);
    const p=Math.max(0,Math.min(1,-root.getBoundingClientRect().top/range));
    const scaled=p*(scenes.length-1),i=Math.min(scenes.length-1,Math.floor(scaled+.0001)),local=scaled-i;
    setScene(i,force);root.style.setProperty('--mm-progress',p.toFixed(4));root.style.setProperty('--hero-progress',p.toFixed(4));
    if(progress)progress.style.width=(p*100)+'%';
    root.style.setProperty('--mm-copy-y',(local*18)+'px');root.style.setProperty('--mm-copy-opacity',String(1-Math.min(1,local*2.2)*.24));sticky.style.setProperty('--hero-progress',p.toFixed(4));
  };
  const request=(force=false)=>{if(!state.raf)state.raf=requestAnimationFrame(()=>render(force));};
  const resize=()=>{root.style.height=Math.max(window.innerHeight*5.2,2600)+'px';request(true);};
  let hint=sticky.querySelector('.cinematic-mobile-hint');
  if(!hint){hint=document.createElement('div');hint.className='cinematic-mobile-hint';hint.textContent='KAYDIR · HİKÂYEYİ KEŞFET';sticky.appendChild(hint);}
  if(!reduced){window.addEventListener('scroll',()=>request(false),{passive:true});window.addEventListener('resize',()=>{if(window.innerWidth<=720)resize();},{passive:true});}
  root.addEventListener('pointerdown',e=>{if(e.target.closest('a,button'))return;enableLowSound();},{passive:true,once:true});
  resize();setScene(0,true);if(!reduced)mobileHero.play().catch(()=>{});
})();

/* Mobile lifecycle: orientation changes preserve the cinematic travel distance. */
(()=>{
  const mq=matchMedia('(max-width:720px)');
  const refresh=()=>{if(!mq.matches)return;const root=document.querySelector('.cinematic-hero');if(root)root.style.height=Math.max(window.innerHeight*5.2,2600)+'px';};
  if(typeof mq.addEventListener==='function')mq.addEventListener('change',refresh);else if(typeof mq.addListener==='function')mq.addListener(refresh);
  window.addEventListener('orientationchange',()=>setTimeout(refresh,100),{passive:true});window.addEventListener('pageshow',refresh,{passive:true});refresh();
})();
