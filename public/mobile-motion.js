/* BTMEDYA Mobile Motion Engine — V4
   Mobilde tek video omurgası: scroll yalnızca hikâye metnini ve ritmini değiştirir;
   görüntü asla posterler arasında kesilmez. Ses kullanıcı etkileşiminden sonra %12 ile açılır. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root || window.innerWidth>720) return;
  const sticky=root.querySelector('.cinematic-sticky'), videos=[...root.querySelectorAll('.cinematic-video video')];
  const title=root.querySelector('[data-cinematic-title]'),kicker=root.querySelector('[data-cinematic-kicker]'),source=root.querySelector('[data-cinematic-kaynak]'),lead=root.querySelector('[data-cinematic-lead]'),index=root.querySelector('[data-cinematic-index]'),progress=root.querySelector('[data-cinematic-progress]'),label=root.querySelector('[data-cinematic-label]'),sound=root.querySelector('[data-hero-ses]');
  if(!sticky||!title)return;

  root.classList.add('bt-mobile-motion');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scenes=[
    {yuva:'hero-video',key:'home',tone:'gold',k:'01 / GİRİŞ',source:'KAYNAK DURUMU DOĞRULANIYOR',t:'GERÇEK<br><span>HİKÂYELER.</span>',d:'Balıkesir’den sahaya, içerikten yayına tek üretim zinciri.',bg:'/assets/media/web/hero-story-poster.jpg'},
    {yuva:'kategori-haber',key:'news',tone:'cyan',k:'02 / HABER · SAHA',source:'KAYNAK DURUMU DOĞRULANIYOR',t:'ŞEHRİN<br><span>HİKÂYESİ.</span>',d:'Haber, röportaj ve saha görüntüsü aynı akışta buluşuyor.',bg:'/assets/media/web/poster-state-haber.webp'},
    {yuva:'kategori-medya',key:'media',tone:'violet',k:'03 / MEDYA · İÇERİK',source:'KAYNAK DURUMU DOĞRULANIYOR',t:'İÇERİĞİ<br><span>HAREKETE GEÇİR.</span>',d:'Fotoğraf, kısa video ve sosyal medya için platforma uygun üretim.',bg:'/assets/media/web/poster-state-medya.webp'},
    {yuva:'kategori-prod',key:'studio',tone:'green',k:'04 / PRODÜKSİYON',source:'KAYNAK DURUMU DOĞRULANIYOR',t:'KAMERA<br><span>AÇIK.</span>',d:'Kadraj, kurgu ve yayın: fikri görüntüye dönüştürüyoruz.',bg:'/assets/media/web/poster-state-produksiyon.webp'},
    {key:'ai',tone:'red',k:'05 / AI LAB · AÇIK ETİKET',source:'AI ÜRETİMİ · AÇIKÇA ETİKETLİ',t:'YENİ<br><span>ARAÇLAR.</span>',d:'AI video, AI görsel ve otomasyon ayrı, açık ve kontrollü bir üretim alanı.',bg:'/assets/media/ai-lab/ai-portre-studyo.webp'}
  ];

  const state={active:-1,raf:0};
  const mobileHero=videos[0];
  const lowVolume=.12;
  const swapText=(el,value,html=false)=>{
    if(!el||el.dataset.mmValue===value)return;
    el.dataset.mmValue=value;
    if(reduced){if(html)el.innerHTML=value;else el.textContent=value;return;}
    el.classList.remove('mm-text-in');
    el.classList.add('mm-text-out');
    window.setTimeout(()=>{
      if(html)el.innerHTML=value;else el.textContent=value;
      el.classList.remove('mm-text-out');
      el.classList.add('mm-text-in');
      window.setTimeout(()=>el.classList.remove('mm-text-in'),360);
    },150);
  };
  const prepareMobileHero=()=>{
    if(!mobileHero) return;
    const source=mobileHero.dataset.mobile || mobileHero.dataset.src;
    if(source && mobileHero.getAttribute('src')!==source){
      mobileHero.src=source;
      mobileHero.setAttribute('preload','metadata');
      mobileHero.load();
    }
    mobileHero.muted=true;
    mobileHero.defaultMuted=true;
    mobileHero.volume=lowVolume;
    mobileHero.playsInline=true;
    mobileHero.loop=true;
  };
  const enableLowSound=()=>{
    if(!mobileHero||reduced)return;
    mobileHero.volume=lowVolume;
    mobileHero.muted=false;
    mobileHero.play().catch(()=>{});
    sound?.removeAttribute('hidden');
    if(sound){sound.setAttribute('aria-pressed','true');sound.querySelector('span')?.replaceChildren('SESİ KAPAT · %12');}
  };
  const disableSound=()=>{
    if(!mobileHero)return;
    mobileHero.muted=true;
    if(sound){sound.setAttribute('aria-pressed','false');sound.querySelector('span')?.replaceChildren('SESİ AÇ · %12');}
  };
  sound?.addEventListener('click',e=>{e.preventDefault();mobileHero?.muted?enableLowSound():disableSound();});

  window.btYuvalar&&window.btYuvalar.then(y=>{
    scenes.forEach((s,i)=>{
      const a=s.yuva&&y&&y[s.yuva];
      if(!a||a.tur!=='video') return;
      s.source=a.gercek?'GERÇEK ÇEKİM':'AI ÜRETİMİ';
      const el=videos[i];
      if(el){
        el.dataset.src=String(a.url||'');
        delete el.dataset.mobile;
        el.removeAttribute('poster');
        if(i===state.active || i===0) prepareMobileHero();
      }
      if(i===state.active&&source) source.textContent=s.source;
    });
  }).catch(()=>{});

  const setScene=(i,force=false)=>{
    if(i<0||i>=scenes.length||(!force&&i===state.active))return;
    state.active=i;
    const s=scenes[i];
    swapText(kicker,s.k);
    swapText(source,s.source);
    swapText(title,s.t,true);
    swapText(lead,s.d);
    index&&(index.textContent=String(i+1).padStart(2,'0'));
    label&&(label.textContent=s.k);
    root.dataset.mmScene=s.key;
    root.style.setProperty('--mm-accent',`var(--mm-${s.tone})`);
    /* Tek video akışında sahne değişimi görsel kesme yapmaz; poster yalnızca
       video yüklenene kadar sabit fallback olarak kalır. */
    root.style.setProperty('--mm-bg',"url('/assets/media/web/hero-story-poster.jpg')");
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
      prepareMobileHero();
      videos.forEach((v,n)=>{
        if(n!==0) v.pause();
        v.style.transform=n===0?'scale(1.02)':'none';
        if(n!==0) v.style.visibility='hidden';
      });
      if(mobileHero && !reduced) mobileHero.play().catch(()=>{});
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
    root.style.setProperty('--mm-video-opacity','1');
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

  prepareMobileHero();
  root.addEventListener('pointerdown',e=>{
    if(e.target.closest('a,button'))return;
    enableLowSound();
  },{passive:true,once:true});
  resize();
  if(!reduced && mobileHero) mobileHero.play().catch(()=>{});
})();

/* BTMEDYA Customer Hero Navigation v1
   Desktop + mobile: three clear customer entry points. The current hero motion
   freezes on selection, the visual layer moves toward the selected direction,
   and the existing cinematic engine receives the same scene signal. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root) return;
  /* Mobile story scroll is the single entry experience. */
  if(window.matchMedia('(max-width:720px)').matches) return;
  const sticky=root.querySelector('.cinematic-sticky');
  if(!sticky) return;
  const choices=[
    {key:'medya',label:'MEDYA',scene:2,direction:'left'},
    {key:'haber',label:'HABER',scene:1,direction:'right'},
    {key:'ai',label:'AI HİZMETLERİ',scene:4,direction:'up'}
  ];
  const rail=document.createElement('nav');
  rail.className='hero-customer-choices';
  rail.setAttribute('aria-label','Müşteri başlangıç seçenekleri');
  rail.innerHTML=choices.map((c,i)=>`<button type="button" data-choice="${c.key}" data-direction="${c.direction}" aria-label="${c.label}" aria-pressed="false">${String(i+1).padStart(2,'0')} <span>${c.label}</span></button>`).join('');
  sticky.appendChild(rail);

  const videos=[...root.querySelectorAll('.cinematic-video video')];
  let busy=false,timer=0,active=0;
  const freeze=()=>videos.forEach(v=>{if(!v.paused)v.pause()});
  const activate=key=>{
    const c=choices.find(x=>x.key===key); if(!c||busy)return;
    busy=true; active=c.scene; freeze();
    rail.querySelectorAll('button').forEach(b=>{const on=b.dataset.choice===key;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on))});
    root.dispatchEvent(new CustomEvent('btsahne',{detail:{choice:key,scene:c.scene}}));
    const dx=c.direction==='left'?-1:c.direction==='right'?1:0;
    const dy=c.direction==='up'?-1:0;
    root.style.setProperty('--choice-x',`${dx*7}vw`);
    root.style.setProperty('--choice-y',`${dy*5}vh`);
    root.classList.remove('choice-left','choice-right','choice-up');
    root.classList.add(`choice-${c.direction}`);
    clearTimeout(timer);
    timer=setTimeout(()=>{
      root.classList.remove('choice-left','choice-right','choice-up');
      root.style.setProperty('--choice-x','0vw');root.style.setProperty('--choice-y','0vh');
      const v=videos[active]; if(v&&!matchMedia('(prefers-reduced-motion: reduce)').matches)v.play().catch(()=>{});
      busy=false;
    },850);
  };
  rail.addEventListener('click',e=>{const b=e.target.closest('button[data-choice]');if(b)activate(b.dataset.choice)});
  sticky.addEventListener('pointerdown',e=>{
    if(e.target.closest('a,button'))return;
    const r=sticky.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
    if(y<.32)activate('ai'); else if(x<.42)activate('medya'); else activate('haber');
  },{passive:true});
  if(matchMedia('(hover:hover)').matches){
    sticky.addEventListener('pointermove',e=>{
      if(busy)return;
      const r=sticky.getBoundingClientRect();
      const x=((e.clientX-r.left)/r.width-.5),y=((e.clientY-r.top)/r.height-.5);
      root.style.setProperty('--cursor-x',`${Math.max(-.5,Math.min(.5,x))*2.2}vw`);
      root.style.setProperty('--cursor-y',`${Math.max(-.5,Math.min(.5,y))*1.8}vh`);
    },{passive:true});
  }
})();

/* Mobile V3 lifecycle: the dedicated controller refreshes its travel distance
   after orientation changes and preserves the lightweight mobile video source. */
(()=>{
  const mq=window.matchMedia('(max-width:720px)');
  const refresh=()=>{
    if(!mq.matches) return;
    const root=document.querySelector('.cinematic-hero');
    const sticky=root?.querySelector('.cinematic-sticky');
    if(!root||!sticky) return;
    root.style.height=Math.max(window.innerHeight*5.2,2600)+'px';
  };
  if(typeof mq.addEventListener==='function') mq.addEventListener('change',refresh);
  else if(typeof mq.addListener==='function') mq.addListener(refresh);
  window.addEventListener('orientationchange',()=>setTimeout(refresh,100),{passive:true});
  window.addEventListener('pageshow',refresh,{passive:true});
  refresh();
})();
