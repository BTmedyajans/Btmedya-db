/* BTMEDYA CLEAN HERO v1
   The first frame is video-only. Category labels appear on the frozen
   end-frame of each of the three story beats. */
(()=>{
  const root=document.querySelector('.cinematic-hero[data-bt-clean-hero]');
  if(!root)return;
  const film=root.querySelector('.bt-clean-hero-video');
  if(!film)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html=document.documentElement;
  const body=document.body;
  /* 9 Ekim (kullanıcı isteği): AI giriş filmi (tools/giris-filmi/giris-v4.sh)
     kimlik kartlarını kendi karesinde taşır; data-kart-gomulu varsa bu
     sabit zamanlı etiketler çift yazı olmasın diye gösterilmez. */
  const categories=film.hasAttribute('data-kart-gomulu')?[]:[
    {n:1,start:4.20,end:5.02,label:'HABER & MEDYA'},
    {n:2,start:10.02,end:10.84,label:'SOSYAL & DİJİTAL'},
    {n:3,start:15.44,end:16.26,label:'MARKA & PRODÜKSİYON'}
  ];
  const finishPanel=document.createElement('div');
  finishPanel.className='bt-clean-finish-panel';
  finishPanel.hidden=true;
  finishPanel.setAttribute('aria-label','BTMEDYA üç ana yol');
  finishPanel.innerHTML='<div class="bt-clean-finish-inner"><p class="bt-clean-finish-kicker">BTMEDYA · ÜÇ ANA YOL</p><h2>Şimdi nereye?</h2><nav aria-label="Film sonu yönlendirme"><a href="/haberler/"><span>01</span><strong>HABER</strong><small>Haber &amp; Medya</small><i aria-hidden="true">↗</i></a><a href="/sosyal-medya/"><span>02</span><strong>SOSYAL MEDYA</strong><small>Sosyal &amp; Dijital</small><i aria-hidden="true">↗</i></a><a href="/video-produksiyon/"><span>03</span><strong>TANITIM</strong><small>Marka &amp; Prodüksiyon</small><i aria-hidden="true">↗</i></a></nav></div>';
  root.appendChild(finishPanel);
  const layer=document.createElement('div');
  layer.className='bt-clean-hero-surface';
  layer.innerHTML=categories.map(c=>'<div class="bt-clean-category" data-scene="'+c.n+'" aria-hidden="true"><strong>'+c.label+'</strong></div>').join('');
  root.appendChild(layer);
  const els=categories.map(c=>({data:c,el:layer.querySelector('[data-scene="'+c.n+'"]')}));
  const src=matchMedia('(max-width:720px)').matches?film.dataset.mobileMp4:film.dataset.desktopMp4;
  const poster=matchMedia('(max-width:720px)').matches?film.dataset.mobilePoster:film.dataset.desktopPoster;
  if(poster)film.poster=poster;
  if(src){film.src=src;film.load();}
  film.muted=true;
  film.defaultMuted=true;
  film.playsInline=true;
  film.autoplay=true;
  const showScene=i=>els.forEach((x,j)=>{
    const on=i===j;
    x.el.classList.toggle('is-visible',on);
    x.el.setAttribute('aria-hidden',String(!on));
  });
  const finish=()=>{
    showScene(-1);
    root.dataset.ended='1';
    html.classList.remove('bt-clean-intro-active');
    body.classList.remove('bt-clean-intro-active');
    body.style.overflow='';
    window.scrollTo(0,0);
    body.classList.add('film-bitti');
    setTimeout(()=>{
      body.classList.add('bt-clean-hero-finished');
      root.classList.add('is-finished');
      finishPanel.hidden=false;
      requestAnimationFrame(()=>finishPanel.classList.add('is-visible'));
    },20);
  };
  const tick=()=>{
    const t=film.currentTime||0;
    let hit=-1;
    for(let i=0;i<categories.length;i++){
      if(t>=categories[i].start && t<categories[i].end){hit=i;break;}
    }
    showScene(hit);
    if(!film.paused && !film.ended)requestAnimationFrame(tick);
  };
  const tryPlay=()=>{
    const p=film.play();
    if(p&&p.catch)p.catch(()=>{
      html.classList.remove('bt-clean-intro-active');
      body.classList.remove('bt-clean-intro-active');
      body.style.overflow='';
      finish();
    });
  };
  film.addEventListener('timeupdate',tick);
  film.addEventListener('play',()=>requestAnimationFrame(tick));
  film.addEventListener('ended',finish);
  film.addEventListener('error',finish,{once:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&html.classList.contains('bt-clean-intro-active'))tryPlay();});
  root.addEventListener('pointerup',()=>{if(film.muted){film.muted=false;film.play().catch(()=>{});}});
  if(reduced){finish();return;}
  tryPlay();
})();
