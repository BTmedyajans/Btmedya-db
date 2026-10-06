/* BTMEDYA Mobil Motion V11 · 2026-10-06
   V11: tek AI giriş filmi (9:16), film sonu Haber / Sosyal Medya / Tanıtım.
   Mobil giriş filmi (gerçek çekim arşiv kurgusu) + hero kaynak köprüsü.
   V10.2: yanlış etiketli "Sahadan" rayı kaldırıldı (aşağıda); bitmiş film
   kendiliğinden baştan başlamaz, sonunda seçim sahnesi açık kalır. */
(()=>{
  const heroStory=document.getElementById('heroStoryVideo');
  if(heroStory&&!heroStory.dataset.srcMobile&&heroStory.dataset.mobile) heroStory.dataset.srcMobile=heroStory.dataset.mobile;

  /* 5 Ekim: burada "SAHADAN HABERLER" adlı bir video rayı enjekte ediliyordu.
     Raydaki üç dosya (assets/sosyal/*-dikey.mp4) saha çekimi değil, üzerinde
     "AI ÜRETİMİ GÖRSEL" yazan grafik kartlardı; ray onlara GERÇEK ÇEKİM
     diyor, "temsili görsel kullanılmaz" yazıyor ve arama motorlarına
     VideoObject olarak bildiriyordu. AGENTS.md: AI karesine GERÇEK ÇEKİM
     etiketi basılmaz. Ray kaldırıldı; gerçek saha videoları panelden
     gercek:true ile geldiğinde ayrı ve doğru etiketli bir bölüm kurulur. */

  const root=document.querySelector('.cinematic-hero'); if(!root||window.innerWidth>720)return;
  const box=root.querySelector('[data-mfilm]'), video=box&&box.querySelector('video'); if(!video)return;
  const label=box.querySelector('[data-mfilm-etiket]'), playBtn=box.querySelector('[data-mfilm-oynat]'), soundBtn=box.querySelector('[data-mfilm-ses]');
  const introKicker=root.querySelector('.bt-hero-intro-kicker');
  if(introKicker) introKicker.textContent='BTMEDYA / GİRİŞ FİLMİ · AI ÜRETİMİ';
  // Mobil kalite kapısı bu sahne kaydını katalogla karşılaştırır: GERÇEK ÇEKİM
  // diyen film medya-ozel.json gercek listesinde olmalı.
  // 6 Ekim: giriş filmi gerçek BTMEDYA arşiv kurgusuna alındı; ses izi korunur.
  const FILM={source:'AI ÜRETİMİ VE SAHA ARŞİVİ · BTMEDYA TANITIM FİLMİ',video:'/assets/media/web/giris-ai.mp4'};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, DEFAULT=FILM.video;
  const net=()=>navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const hqAllowed=()=>{const c=net(); if(!video.dataset.srcHq)return false; if(c?.saveData)return false; if(c?.effectiveType&&/^(slow-2g|2g|3g)$/i.test(c.effectiveType))return false; return !c||!c.effectiveType||c.effectiveType==='4g';};
  let visible=true, stopped=false, source=DEFAULT;
  const sound=()=>{if(!soundBtn)return;soundBtn.setAttribute('aria-pressed',String(!video.muted));soundBtn.setAttribute('aria-label',video.muted?'Sesi aç':'Sesi kapat');soundBtn.textContent=video.muted?'🔇 Sesi aç':'🔊 Sesi kapat'};
  // H.264 çözemeyen tarayıcıda (codec'siz Chromium/Firefox) MP4 hata 4 verip
  // film hiç başlamıyordu; aynı kurgunun WebM kopyası data-webm'de duruyor.
  const kaynak=()=>source===DEFAULT&&video.dataset.webm&&!video.canPlayType('video/mp4; codecs="avc1.42E01E"')?video.dataset.webm:source;
  const load=()=>{if(video.src)return;video.preload='auto';video.playsInline=true;const hq=hqAllowed();const src=hq&&video.dataset.srcHq?video.dataset.srcHq:kaynak();video.dataset.heroQuality=(src===video.dataset.srcHq?'hq':'standard');video.src=src;video.load()};
  // 6 Ekim: film önce sesli denenir; ses kararı film-ses.js'te (btFilmOynat).
  const start=()=>{if(stopped||!visible||document.hidden)return;load();const p=(window.btFilmOynat||(v=>v.play()))(video);if(p&&p.catch)p.catch(()=>{})};
  playBtn&&playBtn.addEventListener('click',()=>{stopped=false;if(video.ended)video.currentTime=0;start()});
  soundBtn&&soundBtn.addEventListener('click',()=>{video.muted=!video.muted;sound();if(!video.paused)start()});
  video.addEventListener('play',()=>{if(playBtn)playBtn.hidden=true;box.classList.add('mfilm-oynuyor')});
  video.addEventListener('pause',()=>box.classList.remove('mfilm-oynuyor'));
  // Film tek sefer oynar; bitince yeniden oynat düğmesi görünür ve otomatik döngü yoktur.
  // Biten film ekrana geri gelince kendiliğinden baştan başlamasın: sonunda
  // seçim sahnesi (secim-sahnesi.js) açık kalır. "Yeniden izle" stopped'u sıfırlar.
  video.addEventListener('ended',()=>{stopped=true;if(playBtn){playBtn.hidden=false;playBtn.textContent='↺ Yeniden izle'}});
  video.addEventListener('error',()=>{if(video.dataset.heroQuality==='hq'&&DEFAULT){video.dataset.heroQuality='standard';video.removeAttribute('src');video.src=(hqAllowed()&&video.dataset.srcHq?video.dataset.srcHq:kaynak());video.load();video.play().catch(()=>{});}});
  if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>{visible=e.isIntersecting;if(visible&&!reduced)start();else if(!visible)video.pause()}),{threshold:.15}).observe(video);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(!reduced)start()});
  if(label)label.textContent=FILM.source; sound();
  video.setAttribute('data-video-quality-policy','hq-on-fast-connection');
  setTimeout(()=>{if(!reduced&&!document.hidden)start()},100);
})();
