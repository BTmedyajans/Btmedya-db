/* BTMEDYA Mobil Giriş Filmi V7 · 2026-10-04
   Neden: V5 mobil girişi 5,2 ekran boyunda sabitlenmiş, kaydırmayla sahne
   değiştiren bir yapıydı. Film ancak okur kaydırdıkça ilerliyor, 1152x648
   yatay kaynak dikey ekrana kırpılıp ~2,5 kat büyütüldüğü için bulanık
   görüyor. V7: film poster ile görünür; kullanıcı açıkça başlatmadan video
   oynar; kendi en-boy oranında gösterilir, kırpılmaz, bulanıklık yok.
   kaynağı yüklenmez ve oynatılmaz. Kullanıcı başlatırsa ekran dışına çıkınca
   durur ve geri gelince devam eder.

   Etiket: giriş filmi AI üretimidir (zırha dönüşen kişi, robotlar, patlama).
   Panel yuvası gercek:true derse GERÇEK ÇEKİM yazar; varsayılan AI ÜRETİMİ
   (AGENTS.md). Mobil kalite kapısı aşağıdaki listeyi katalogla karşılaştırır. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root || window.innerWidth>720)return;
  const kutu=root.querySelector('[data-mfilm]');
  const video=kutu&&kutu.querySelector('video');
  if(!video)return;
  const etiket=kutu.querySelector('[data-mfilm-etiket]');
  const oynatDugme=kutu.querySelector('[data-mfilm-oynat]');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const filmler=[
    {source:'AI ÜRETİMİ · GİRİŞ FİLMİ',video:'/assets/media/web/hero-story.mp4'}
  ];
  root.classList.add('bt-mobile-film');
  root.style.removeProperty('height');

  let gorunur=true, kullaniciDurdurdu=false, kullaniciBaslatti=false, bekleyenUrl='';
  const oranUygula=()=>{
    if(video.videoWidth&&video.videoHeight) kutu.style.setProperty('--mfilm-oran',video.videoWidth+' / '+video.videoHeight);
    kutu.classList.toggle('mfilm-dikey',video.videoHeight>video.videoWidth);
  };
  const oynat=()=>{
    if(!kullaniciBaslatti||kullaniciDurdurdu||!gorunur||document.hidden)return;
    const p=video.play();
    if(p&&p.catch)p.then(()=>{oynatDugme&&(oynatDugme.hidden=true);}).catch(()=>{
      /* iPhone Düşük Güç Modu ve bazı tarayıcılar otomatik oynatmayı engeller. */
      oynatDugme&&(oynatDugme.hidden=false);
    });
  };
  const kaynakKoy=(url,gercek)=>{
    if(!url)return;
    if(etiket)etiket.textContent=gercek?'GERÇEK ÇEKİM · BTMEDYA':filmler[0].source;
    if(video.dataset.yuklu===url)return;
    bekleyenUrl=url;
    if(oynatDugme){oynatDugme.hidden=false;oynatDugme.textContent='▶ Filmi oynat';}
  };
  const yukleVeOynat=()=>{
    kullaniciBaslatti=true;
    if(!video.src&&bekleyenUrl){
      video.preload='auto';video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;
      video.src=bekleyenUrl;video.load();
      video.addEventListener('canplay',oynat,{once:true});
    }else oynat();
  };
  video.addEventListener('loadedmetadata',oranUygula);

  oynatDugme&&oynatDugme.addEventListener('click',()=>{kullaniciDurdurdu=false;gorunur=true;yukleVeOynat();});
  video.addEventListener('click',()=>{if(video.paused){kullaniciDurdurdu=false;yukleVeOynat();}else{kullaniciDurdurdu=true;video.pause();if(oynatDugme){oynatDugme.hidden=false;oynatDugme.textContent='▶ Filmi sürdür';}}});

  if('IntersectionObserver' in window){
    new IntersectionObserver(es=>es.forEach(e=>{gorunur=e.isIntersecting;if(gorunur){if(!reduced)oynat();}else video.pause();}),{threshold:.15}).observe(video);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(!reduced)oynat();});

  /* Panelden atanmış giriş filmi varsa onu oynat; yoksa varsayılan film. */
  const varsayilan=video.dataset.src||filmler[0].video;
  Promise.resolve(window.btYuvalar).then(y=>{
    const a=y&&y['hero-video'];
    if(a&&a.tur==='video'&&a.url)kaynakKoy(String(a.url),a.gercek===true);else kaynakKoy(varsayilan,false);
  }).catch(()=>kaynakKoy(varsayilan,false));
})();
