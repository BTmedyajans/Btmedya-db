/* BTMEDYA Mobil Giriş Filmi V8 · 2026-10-05
   Neden: V5 mobil girişi kaydırmayla sahne değiştiren, kırpılıp büyütüldüğü
   için bulanık görünen bir yapıydı; V6-V7 filmi kendi en-boy oranında,
   okur başlatınca oynayan bloğa çevirdi. V8: film BTMEDYA arşivinden gerçek
   çekimle yeniden kuruldu (tools/giris-filmi.py, 28,6 sn, kare 720x720).
   Okur başlatınca SESLİ oynar; tarayıcılar sesi yalnız dokunuşla açtığı
   için ses kendiliğinden açılmaz. Ses düğmesi, bölüm düğmeleri ve ilerleme
   çubuğu eklendi. Film döngüye girmez: bitince "Yeniden izle" çıkar ve
   giriş katmanı (hero-sequence-v2.js) 'ended' olayıyla açılır.

   Kaynak: panelde hero-video yuvası atanmışsa o oynar, etiketi kaydın
   gercek alanından gelir (AGENTS.md: varsayılan AI ÜRETİMİ). Atama yoksa
   varsayılan film oynar; o dosya medya-ozel.json gercek listesindedir.
   Panel geniş (16:9) giriş filmini atamışsa mobilde aynı filmin kare
   kesimi oynar: dikey ekranda 16:9 film küçük kalıyordu. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  if(!root || window.innerWidth>720)return;
  const kutu=root.querySelector('[data-mfilm]');
  const video=kutu&&kutu.querySelector('video');
  if(!video)return;
  const etiket=kutu.querySelector('[data-mfilm-etiket]');
  const oynatDugme=kutu.querySelector('[data-mfilm-oynat]');
  const sesDugme=kutu.querySelector('[data-mfilm-ses]');
  const dolu=kutu.querySelector('[data-mfilm-dolu]');
  const bolumler=[...kutu.querySelectorAll('[data-mfilm-bolumler] [data-t]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const VARSAYILAN={source:'GERÇEK ÇEKİM · BTMEDYA ARŞİVİ',video:'/assets/media/web/giris-filmi.mp4'};
  const KARE_KESIMI={'/assets/media/web/giris-filmi-genis.mp4':VARSAYILAN.video};
  root.classList.add('bt-mobile-film');
  root.style.removeProperty('height');

  let gorunur=true, kullaniciDurdurdu=false, kullaniciBaslatti=false, bekleyenUrl='';
  const oranUygula=()=>{
    if(video.videoWidth&&video.videoHeight) kutu.style.setProperty('--mfilm-oran',video.videoWidth+' / '+video.videoHeight);
    kutu.classList.toggle('mfilm-dikey',video.videoHeight>video.videoWidth);
  };
  const dugmeYaz=metin=>{if(oynatDugme){oynatDugme.hidden=false;oynatDugme.textContent=metin;}};
  const sesGoster=()=>{
    if(!sesDugme)return;
    const acik=!video.muted;
    sesDugme.setAttribute('aria-pressed',String(acik));
    sesDugme.setAttribute('aria-label',acik?'Sesi kapat':'Sesi aç');
    sesDugme.innerHTML=acik?'<span aria-hidden="true">🔊</span> Sesi kapat':'<span aria-hidden="true">🔇</span> Sesi aç';
  };
  const oynat=()=>{
    if(!kullaniciBaslatti||kullaniciDurdurdu||!gorunur||document.hidden)return;
    const p=video.play();
    if(p&&p.catch)p.then(()=>{oynatDugme&&(oynatDugme.hidden=true);}).catch(()=>{
      if(!video.muted){video.muted=true;sesGoster();oynat();return;}
      dugmeYaz('▶ Filmi oynat');
    });
  };
  const mobilKaynak=url=>{
    const yol=String(url).split('?')[0];
    const kare=KARE_KESIMI[yol]||yol;
    if(kare===VARSAYILAN.video && video.dataset.webm && !video.canPlayType('video/mp4; codecs="avc1.42E01E"')) return video.dataset.webm;
    return kare;
  };
  const kaynakKoy=(url,etiketMetni)=>{
    if(!url)return;
    if(etiket)etiket.textContent=etiketMetni;
    bekleyenUrl=mobilKaynak(url);
    kutu.classList.toggle('mfilm-damgali',/\/giris-filmi\.(mp4|webm)$/.test(bekleyenUrl));
    video.dataset.src=bekleyenUrl;
    dugmeYaz('▶ Filmi oynat');
  };
  const yukle=()=>{
    if(!video.getAttribute('src')&&bekleyenUrl){
      video.preload='auto';video.loop=false;video.playsInline=true;
      video.src=bekleyenUrl;video.load();
    }
  };
  const baslat=(sesli=true)=>{
    kullaniciBaslatti=true;kullaniciDurdurdu=false;gorunur=true;
    if(sesli){video.muted=false;video.defaultMuted=false;sesGoster();}
    yukle();
    if(video.readyState>=2)oynat();else video.addEventListener('canplay',oynat,{once:true});
  };
  video.addEventListener('loadedmetadata',oranUygula);
  video.addEventListener('volumechange',sesGoster);
  video.addEventListener('play',()=>{kullaniciBaslatti=true;sesGoster();oynatDugme&&(oynatDugme.hidden=true);kutu.classList.add('mfilm-oynuyor','mfilm-basladi');});
  video.addEventListener('pause',()=>kutu.classList.remove('mfilm-oynuyor'));
  video.addEventListener('ended',()=>{kutu.classList.remove('mfilm-oynuyor');dugmeYaz('↺ Yeniden izle');});
  video.addEventListener('timeupdate',()=>{
    const s=video.duration||0, t=video.currentTime;
    if(dolu&&s)dolu.style.transform='scaleX('+Math.min(1,t/s).toFixed(4)+')';
    let etkin=null;
    for(const b of bolumler) if(t+0.05>=Number(b.dataset.t)) etkin=b;
    for(const b of bolumler) b.toggleAttribute('aria-current',b===etkin);
  });
  oynatDugme&&oynatDugme.addEventListener('click',()=>{
    if(video.ended)video.currentTime=0;
    baslat(!kutu.dataset.sessizSecildi);
  });
  sesDugme&&sesDugme.addEventListener('click',()=>{
    const acilacak=video.muted;
    video.muted=!acilacak;video.defaultMuted=!acilacak;
    if(acilacak)delete kutu.dataset.sessizSecildi;else kutu.dataset.sessizSecildi='1';
    sesGoster();
    if(acilacak&&video.paused&&!video.ended)baslat(true);
  });
  bolumler.forEach(b=>b.addEventListener('click',()=>{
    const t=Number(b.dataset.t)||0;
    const git=()=>{video.currentTime=t;};
    baslat(!kutu.dataset.sessizSecildi);
    if(video.readyState>=1)git();else video.addEventListener('loadedmetadata',git,{once:true});
  }));
  video.addEventListener('click',()=>{
    if(video.paused){baslat(!kutu.dataset.sessizSecildi);}
    else{kullaniciDurdurdu=true;video.pause();dugmeYaz('▶ Filmi sürdür');}
  });

  if('IntersectionObserver' in window){
    new IntersectionObserver(es=>es.forEach(e=>{gorunur=e.isIntersecting;if(gorunur){if(!reduced)oynat();}else if(!video.paused){video.pause();}}),{threshold:.15}).observe(video);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(!reduced)oynat();});
  sesGoster();

  Promise.resolve(window.btYuvalar).then(y=>{
    const a=y&&y['hero-video'];
    if(a&&a.tur==='video'&&a.url)kaynakKoy(String(a.url),a.gercek===true?'GERÇEK ÇEKİM · BTMEDYA':'AI ÜRETİMİ · GİRİŞ FİLMİ');
    else kaynakKoy(VARSAYILAN.video,VARSAYILAN.source);
  }).then(()=>{
    // Mobilde seçilen gerçek giriş filmi görünür olur: otomatik oynatma sessiz,
    // ses ise yalnızca kullanıcı dokunuşuyla açılır. Reduced-motion tercihi korunur.
    if(!reduced)baslat(false);
  }).catch(()=>{
    kaynakKoy(VARSAYILAN.video,VARSAYILAN.source);
    if(!reduced)baslat(false);
  });
})();
