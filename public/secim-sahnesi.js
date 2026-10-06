/* BTMEDYA Seçim Sahnesi · 2026-10-05
   Neden: giriş filmi bitince okur "şimdi ne yapayım?" sorusuyla kalıyordu;
   seçenekler ayrı bir menüde, filmin dünyasından kopuktu. Film bitince
   (ya da "Filmi geç" ile) filmin karakteri sahneye gelir, kollarını açar
   ve üç yolu sırayla eliyle gösterir: Haber, Sosyal Medya, Tanıtım. Okurun
   faresi ya da parmağı karakteri yönlendirir: karakter imlece doğru döner,
   ışık en yakın seçeneğe akar. Seçenekler gerçek bağlantılardır; klavye ve
   ekran okuyucu için sırayla gezilebilir, ışık süs olduğu için gizlidir.

   Karakter yalnız onu içeren filmden sonra çıkar (KARAKTERLI_FILMLER):
   karakter AI ÜRETİMİ giriş filminden kesildi (hero-story.mp4, 1,2. sn)
   ve etiketi öyle yazar. Gerçek çekim arşiv filminden sonra kimseye
   yapmadığı bir hareket yaptırılmaz; seçenekler karaktersiz gelir. */
(()=>{
  const root=document.querySelector('.cinematic-hero');
  // 6 Ekim: tek film modunda seçenekler filmin üstünde açılır (film-secim.js).
  if(!root||root.hasAttribute('data-tek-film'))return;
  const mobil=matchMedia('(max-width:720px)').matches;
  const film=mobil?root.querySelector('.mfilm-video'):root.querySelector('.cinematic-video-1 video');
  const yuva=mobil?root.querySelector('[data-mfilm]'):root.querySelector('.cinematic-sticky');
  if(!film||!yuva)return;
  const azHareket=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 6 Ekim: giriş filmi aynı AI karakterinin kurgusu (giris-ai*).
  const KARAKTERLI_FILMLER=/\/(hero-story(-mobile)?|giris-ai(-genis)?)\.(mp4|webm)$/;

  /* Konumlar sahnenin yüzdesi. Karakter görselinde (1043x614) sol el
     x=0 y=490, sağ el x=1043 y=510, saç tepesi x=511 y=40; sahnede
     görsel tam genişlikte ve alta yaslı. */
  const SECENEKLER=[
    // 6 Ekim (kullanıcı): üç ana yol; hamburger kategorileri de bu üçü altında.
    {anahtar:'haber',ad:'HABER',alt:'Kaynaklı gündem',yol:'/haberler/',x:18,y:46,kaynak:'solEl',yon:'sol'},
    {anahtar:'sosyal',ad:'SOSYAL MEDYA',alt:'İçerik · yönetim · reels',yol:'/sosyal-medya/',x:50,y:20,kaynak:'tepe',yon:'ust'},
    {anahtar:'tanitim',ad:'TANITIM',alt:'Düğün klibi · tanıtım · reklam',yol:'/video-produksiyon/',x:82,y:46,kaynak:'sagEl',yon:'sag'}
  ];

  const sahne=document.createElement('section');
  sahne.className='secim-sahnesi';
  sahne.hidden=true;
  sahne.setAttribute('aria-label','BTMEDYA: hangi yoldan devam etmek istiyorsun?');
  sahne.innerHTML=
    '<div class="secim-zemin" aria-hidden="true"></div>'+
    '<img class="secim-karakter" src="/assets/media/web/secim-karakter.webp" alt="" aria-hidden="true" width="1043" height="614" decoding="async" loading="lazy">'+
    '<span class="secim-isik" aria-hidden="true"></span>'+
    '<svg class="secim-isin" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="" vector-effect="non-scaling-stroke"/><circle r="1.2"/></svg>'+
    '<p class="secim-soru">HANGİ YOLDAN DEVAM?</p>'+
    '<nav class="secim-liste" aria-label="BTMEDYA hizmetleri">'+
      SECENEKLER.map((s,i)=>'<a class="secim-secenek" href="'+s.yol+'" data-secim="'+s.anahtar+'" data-yon="'+s.yon+'" style="--x:'+s.x+'%;--y:'+s.y+'%;--sira:'+i+'"><b>'+s.ad+'</b><small>'+s.alt+'</small></a>').join('')+
    '</nav>'+
    '<div class="secim-alt"><span class="secim-etiket" title="Karakter AI ÜRETİMİ giriş filminden">AI ÜRETİMİ · KARAKTER</span><button type="button" class="secim-tekrar" aria-label="Filmi yeniden izle">↺ Yeniden izle</button></div>';
  if(mobil){
    const kareEl=root.querySelector('.mfilm-kare');
    if(kareEl?.parentElement) kareEl.parentElement.insertBefore(sahne,kareEl.nextSibling);
    else yuva.appendChild(sahne);
  }else{
    yuva.appendChild(sahne);
  }

  const kutu=mobil?root.querySelector('[data-mfilm]'):root;
  const karakter=sahne.querySelector('.secim-karakter');
  const yol=sahne.querySelector('.secim-isin path');
  const nokta=sahne.querySelector('.secim-isin circle');
  const secenekler=[...sahne.querySelectorAll('.secim-secenek')];
  const etiket=sahne.querySelector('.secim-etiket');

  /* Işık kaynakları: karakterin elleri ve saç tepesi. Konum karakter
     görselinin ekrandaki gerçek kutusundan ölçülür (mobilde alta yaslı,
     masaüstünde yukarıda; fareyle dönerken de kayar). Karaktersiz sürümde
     ışık sahnenin altından çıkar. */
  const kaynakNoktasi=ad=>{
    const r=sahne.getBoundingClientRect(), g=karakter.getBoundingClientRect();
    if(!r.width||!g.width)return {x:50,y:96};
    const p={solEl:[0.02,490],sagEl:[0.98,510],tepe:[0.49,40]}[ad];
    return {x:(g.left+p[0]*g.width-r.left)/r.width*100,y:(g.top+p[1]/614*g.height-r.top)/r.height*100};
  };

  let hedef=0, dongu=0, sonEtkilesim=0, kare=0, acik=false, karakterli=false;
  const isinCiz=i=>{
    const s=SECENEKLER[i], k=karakterli?kaynakNoktasi(s.kaynak):{x:6,y:96};
    // Hedef, kartın gerçek konumundan: kenara yaslı kartların merkezi s.x değil.
    const r=sahne.getBoundingClientRect(), c=secenekler[i].getBoundingClientRect();
    const tx=r.width?((c.left+c.width/2-r.left)/r.width*100):s.x, ty=r.height?((c.bottom-r.top)/r.height*100):s.y+6;
    // Kavis el ile kart arasında yukarı doğru; ışık "atılmış" gibi durur.
    const cx=(k.x+tx)/2, cy=Math.min(k.y,ty)-10;
    yol.setAttribute('d','M'+k.x.toFixed(1)+' '+k.y.toFixed(1)+' Q'+cx.toFixed(1)+' '+cy.toFixed(1)+' '+tx.toFixed(1)+' '+ty.toFixed(1));
    secenekler.forEach((a,j)=>a.classList.toggle('is-hedef',j===i));
    sahne.style.setProperty('--isik-x',k.x+'%'); sahne.style.setProperty('--isik-y',k.y+'%');
    hedef=i;
    if(azHareket){nokta.style.display='none';return;}
    // Işık noktası yol boyunca bir kez akar.
    const uz=yol.getTotalLength(), bas=performance.now();
    cancelAnimationFrame(kare);
    const ak=t=>{const o=Math.min(1,(t-bas)/650), p=yol.getPointAtLength(uz*(1-Math.pow(1-o,3)));
      nokta.setAttribute('cx',p.x);nokta.setAttribute('cy',p.y);if(o<1)kare=requestAnimationFrame(ak);};
    kare=requestAnimationFrame(ak);
    yol.style.animation='none'; void yol.getBoundingClientRect(); yol.style.animation='';
  };
  const donguBaslat=()=>{
    clearInterval(dongu);
    if(azHareket)return;
    dongu=setInterval(()=>{ if(Date.now()-sonEtkilesim>2600) isinCiz((hedef+1)%SECENEKLER.length); },1900);
  };

  /* Fare/parmak: karakter imlece döner, zemin ters yöne kayar (derinlik),
     ışık imlece en yakın seçeneğe gider. Kaydırma engellenmez. */
  const yonlendir=(cx,cy)=>{
    if(!acik)return;
    const r=sahne.getBoundingClientRect();
    const px=((cx-r.left)/r.width)*2-1, py=((cy-r.top)/r.height)*2-1;
    sahne.style.setProperty('--px',Math.max(-1,Math.min(1,px)).toFixed(3));
    sahne.style.setProperty('--py',Math.max(-1,Math.min(1,py)).toFixed(3));
    sonEtkilesim=Date.now();
    const x=(px+1)*50, y=(py+1)*50;
    let en=0,enU=1e9; SECENEKLER.forEach((s,i)=>{const u=(s.x-x)**2+(s.y-y)**2; if(u<enU){enU=u;en=i;}});
    if(en!==hedef) isinCiz(en);
  };
  if(!azHareket){
    sahne.addEventListener('pointermove',e=>yonlendir(e.clientX,e.clientY),{passive:true});
    sahne.addEventListener('touchmove',e=>{const t=e.touches[0]; if(t) yonlendir(t.clientX,t.clientY);},{passive:true});
    sahne.addEventListener('pointerleave',()=>{sahne.style.setProperty('--px','0');sahne.style.setProperty('--py','0');});
  }
  secenekler.forEach((a,i)=>{
    a.addEventListener('focus',()=>{sonEtkilesim=Date.now(); isinCiz(i);});
    a.addEventListener('pointerenter',()=>{sonEtkilesim=Date.now(); isinCiz(i);});
  });

  const goster=()=>{
    if(acik)return;
    karakterli=KARAKTERLI_FILMLER.test(String(film.currentSrc||film.getAttribute('src')||film.dataset.src||'').split('?')[0]);
    sahne.classList.toggle('karaktersiz',!karakterli);
    if(karakterli) karakter.loading='eager';
    etiket.hidden=!karakterli;
    acik=true; sahne.hidden=false;
    kutu.classList.add('secim-acik');
    requestAnimationFrame(()=>{sahne.classList.add('is-acik'); isinCiz(0);});
    // Eliyle sırayla gösterir: sol, üst, sağ; sonra kendi döngüsüne geçer.
    if(!azHareket){ setTimeout(()=>acik&&isinCiz(1),900); setTimeout(()=>acik&&isinCiz(2),1800); setTimeout(donguBaslat,2600); }
  };
  const kapat=()=>{
    acik=false; clearInterval(dongu); cancelAnimationFrame(kare);
    sahne.classList.remove('is-acik'); kutu.classList.remove('secim-acik');
    setTimeout(()=>{ if(!acik) sahne.hidden=true; },420);
  };
  sahne.querySelector('.secim-tekrar').addEventListener('click',()=>{
    kapat(); film.currentTime=0; const p=film.play(); if(p&&p.catch)p.catch(()=>{});
  });
  film.addEventListener('ended',goster);
  film.addEventListener('play',()=>{ if(acik) kapat(); });
  // "Filmi geç" filmi beklemeden seçim sahnesine götürür.
  document.addEventListener('click',e=>{ if(e.target.closest('.bt-hero-gec')){ film.pause(); goster(); } });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) clearInterval(dongu); else if(acik) donguBaslat(); });
})();
