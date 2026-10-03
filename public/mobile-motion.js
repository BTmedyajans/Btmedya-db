/* BTMEDYA Mobile Motion Engine V7 · continuous story
   Tek video omurgası: mobilde scroll video kaynağını DEĞİŞTİRMEZ.
   Hikâye metni ve seçimler videonun üst katmanında akar.
   Performans: tek <video>, metadata preload, lazy olmayan tek hero kaynağı,
   requestAnimationFrame scroll, reduced-motion desteği.
   Kategori tıklaması video oynatımını kesmez; seçim animasyonundan sonra ilgili yüzeye gider. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root || window.innerWidth>720)return;
  const sticky=root.querySelector('.cinematic-sticky');
  const mobileHero=root.querySelector('.cinematic-video-1 video');
  const title=root.querySelector('[data-cinematic-title]');
  const kicker=root.querySelector('[data-cinematic-kicker]');
  const source=root.querySelector('[data-cinematic-kaynak]');
  const lead=root.querySelector('[data-cinematic-lead]');
  const index=root.querySelector('[data-cinematic-index]');
  const progress=root.querySelector('[data-cinematic-progress]');
  const label=root.querySelector('[data-cinematic-label]');
  const sound=root.querySelector('[data-hero-ses]');
  if(!sticky||!mobileHero||!title)return;

  root.classList.add('bt-mobile-motion','bt-mobile-story-v7');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowVolume=.12;
  const storyVideo='/assets/media/web/btmedya-mobile-story-v7.mp4';
  const fallbackVideo=mobileHero.dataset.mobile||mobileHero.dataset.src||'';

  /* One source only. Never replace src during scroll. */
  mobileHero.muted=true;
  mobileHero.defaultMuted=true;
  mobileHero.playsInline=true;
  mobileHero.loop=true;
  mobileHero.preload='metadata';
  mobileHero.setAttribute('playsinline','');
  mobileHero.setAttribute('webkit-playsinline','');
  mobileHero.poster=mobileHero.getAttribute('poster')||'/assets/media/web/hero-story-poster.jpg';
  mobileHero.style.visibility='visible';
  mobileHero.src=storyVideo;

  const choices=[
    {key:'haber',n:'01',label:'HABER',title:'SAHADAN HABERLER',desc:'Saha görüntüsü, haber, röportaj ve özel dosya.',href:'/haberler/',tone:'cyan'},
    {key:'produksiyon',n:'02',label:'PRODÜKSİYON',title:'KAMERA AÇIK',desc:'Fikirden çekime, çekimden yayına gerçek prodüksiyon.',href:'/video-produksiyon/',tone:'green'},
    {key:'medya',n:'03',label:'MEDYA',title:'İÇERİĞİ HAREKETE GEÇİR',desc:'Fotoğraf, kısa video, Reels ve sosyal içerik üretimi.',href:'/portfoy/',tone:'violet'},
    {key:'ai',n:'04',label:'AI LAB',title:'YENİ NESİL ÜRETİM',desc:'AI video, görsel, otomasyon ve web deneyimleri.',href:'/ai-lab/',tone:'red'}
  ];

  const swap=(el,value,html=false)=>{
    if(!el)return;
    if(reduced){html?el.innerHTML=value:el.textContent=value;return;}
    el.classList.remove('mm-text-in');
    el.classList.add('mm-text-out');
    window.setTimeout(()=>{
      html?el.innerHTML=value:el.textContent=value;
      el.classList.remove('mm-text-out');
      el.classList.add('mm-text-in');
      window.setTimeout(()=>el.classList.remove('mm-text-in'),360);
    },120);
  };

  /* Replace the old three CTAs with large, thumb-friendly category choices. */
  const actions=root.querySelector('.cinematic-actions');
  if(actions){
    actions.setAttribute('aria-label','BTMEDYA kategori seçimi');
    actions.innerHTML=choices.map(c=>`
      <button class="mm-choice" type="button" data-mm-choice="${c.key}" data-href="${c.href}" aria-label="${c.label}: ${c.title}">
        <span class="mm-choice-index">${c.n}</span>
        <span class="mm-choice-copy"><b>${c.label}</b><strong>${c.title}</strong><small>${c.desc}</small></span>
        <span class="mm-choice-arrow" aria-hidden="true">↗</span>
      </button>`).join('');
  }

  const setChoice=(choice,focus=false)=>{
    root.dataset.mmChoice=choice.key;
    root.style.setProperty('--mm-accent',`var(--mm-${choice.tone})`);
    root.classList.remove('choice-haber','choice-produksiyon','choice-medya','choice-ai');
    root.classList.add('choice-'+choice.key);
    root.querySelectorAll('.mm-choice').forEach(btn=>{
      const active=btn.dataset.mmChoice===choice.key;
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-pressed',String(active));
    });
    if(focus){
      root.classList.remove('choice-pulse');
      void root.offsetWidth;
      root.classList.add('choice-pulse');
    }
  };

  actions?.querySelectorAll('.mm-choice').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const choice=choices.find(x=>x.key===btn.dataset.mmChoice);
      if(!choice)return;
      setChoice(choice,true);
      if(navigator.vibrate&&!reduced)navigator.vibrate(8);
      window.setTimeout(()=>{
        /* Keep the hero video playing while moving to the selected destination. */
        const target=choice.href.startsWith('#')?document.querySelector(choice.href):null;
        if(target)target.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
        else window.location.href=choice.href;
      },reduced?0:260);
    },{passive:true});
  });

  const enableSound=()=>{
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
  sound?.addEventListener('click',e=>{e.preventDefault();mobileHero.muted?enableSound():disableSound();});

  /* If the panel has a verified hero slot, it may override the prepared story once.
     No network media swap is allowed after the video has started. */
  window.btYuvalar&&window.btYuvalar.then(y=>{
    const a=y?.['hero-video'];
    if(a?.tur==='video'&&a.url&&mobileHero.paused&&mobileHero.currentTime<0.05){
      const url=String(a.url);
      if(url&&url!==storyVideo){mobileHero.src=url;mobileHero.load();}
    }
  }).catch(()=>{});

  const setIntro=()=>{
    swap(kicker,'01 / GİRİŞ');
    swap(source,'GERÇEK ÇEKİM · BTMEDYA ARŞİVİ');
    swap(title,'GERÇEK<br><span>HİKÂYELER.</span>',true);
    swap(lead,'Balıkesir’den sahaya, içerikten yayına tek üretim zinciri.');
    index&&(index.textContent='01');
    label&&(label.textContent='KAYDIR · HİKÂYEYİ KEŞFET');
  };

  const state={raf:0,started:false};
  const render=()=>{
    state.raf=0;
    const range=Math.max(1,root.offsetHeight-window.innerHeight);
    const p=Math.max(0,Math.min(1,-root.getBoundingClientRect().top/range));
    root.style.setProperty('--mm-progress',p.toFixed(4));
    root.style.setProperty('--hero-progress',p.toFixed(4));
    if(progress)progress.style.width=(p*100)+'%';
    if(p<.20){setIntro();setChoice(choices[0],false);}
    root.style.setProperty('--mm-copy-y',`${Math.min(14,p*28)}px`);
    sticky.style.setProperty('--hero-progress',p.toFixed(4));
  };
  const request=()=>{if(!state.raf)state.raf=requestAnimationFrame(render);};

  const resize=()=>{
    root.style.height=Math.max(window.innerHeight*4.8,2400)+'px';
    request();
  };

  let hint=sticky.querySelector('.cinematic-mobile-hint');
  if(!hint){hint=document.createElement('div');hint.className='cinematic-mobile-hint';hint.textContent='KAYDIR · HİKÂYEYİ KEŞFET';sticky.appendChild(hint);}

  mobileHero.addEventListener('loadedmetadata',()=>{
    root.classList.add('story-video-ready');
    mobileHero.currentTime=0;
    if(!reduced)mobileHero.play().then(()=>{state.started=true;}).catch(()=>{});
  },{once:true});
  mobileHero.addEventListener('error',()=>{
    /* Never leave a broken hero: fall back to the existing archive video. */
    if(mobileHero.src.endsWith(storyVideo)&&fallbackVideo&&fallbackVideo!==storyVideo){
      mobileHero.src=fallbackVideo;mobileHero.load();
    }
  },{once:true});

  if(!reduced){
    window.addEventListener('scroll',request,{passive:true});
    window.addEventListener('resize',()=>{if(window.innerWidth<=720)resize();},{passive:true});
  }
  root.addEventListener('pointerdown',e=>{if(e.target.closest('a,button'))return;enableSound();},{passive:true,once:true});

  setIntro();
  setChoice(choices[0],false);
  resize();
})();

/* Mobile lifecycle: preserve cinematic travel distance across rotation/pageshow. */
(()=>{
  const mq=matchMedia('(max-width:720px)');
  const refresh=()=>{if(!mq.matches)return;const root=document.querySelector('.cinematic-hero');if(root)root.style.height=Math.max(window.innerHeight*4.8,2400)+'px';};
  if(typeof mq.addEventListener==='function')mq.addEventListener('change',refresh);else if(typeof mq.addListener==='function')mq.addListener(refresh);
  window.addEventListener('orientationchange',()=>setTimeout(refresh,100),{passive:true});
  window.addEventListener('pageshow',refresh,{passive:true});
  refresh();
})();
