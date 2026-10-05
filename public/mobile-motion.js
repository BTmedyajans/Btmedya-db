/* BTMEDYA Mobil Motion V10.2 · 2026-10-05
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
  if(introKicker) introKicker.textContent='BTMEDYA / GİRİŞ FİLMİ · GERÇEK ÇEKİM';
  // Mobil kalite kapısı bu sahne kaydını katalogla karşılaştırır: GERÇEK ÇEKİM
  // diyen film medya-ozel.json gercek listesinde olmalı.
  const FILM={source:'GERÇEK ÇEKİM · BTMEDYA ARŞİVİ',video:'/assets/media/web/giris-filmi.mp4'};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches, DEFAULT=FILM.video;
  let visible=true, stopped=false, source=DEFAULT;
  const sound=()=>{if(!soundBtn)return;soundBtn.setAttribute('aria-pressed',String(!video.muted));soundBtn.setAttribute('aria-label',video.muted?'Sesi aç':'Sesi kapat');soundBtn.textContent=video.muted?'🔇 Sesi aç':'🔊 Sesi kapat'};
  const load=()=>{if(video.src)return;video.preload='auto';video.muted=true;video.playsInline=true;video.src=source;video.load()};
  const start=()=>{if(stopped||!visible||document.hidden)return;load();const p=video.play();if(p)p.catch(()=>{})};
  playBtn&&playBtn.addEventListener('click',()=>{stopped=false;if(video.ended)video.currentTime=0;start()});
  soundBtn&&soundBtn.addEventListener('click',()=>{video.muted=!video.muted;sound();if(!video.paused)start()});
  video.addEventListener('play',()=>{if(playBtn)playBtn.hidden=true;box.classList.add('mfilm-oynuyor')});
  video.addEventListener('pause',()=>box.classList.remove('mfilm-oynuyor'));
  // Biten film ekrana geri gelince kendiliğinden baştan başlamasın: sonunda
  // seçim sahnesi (secim-sahnesi.js) açık kalır. "Yeniden izle" stopped'u sıfırlar.
  video.addEventListener('ended',()=>{stopped=true;if(playBtn){playBtn.hidden=false;playBtn.textContent='↺ Yeniden izle'}});
  if('IntersectionObserver' in window)new IntersectionObserver(es=>es.forEach(e=>{visible=e.isIntersecting;if(visible&&!reduced)start();else if(!visible)video.pause()}),{threshold:.15}).observe(video);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(!reduced)start()});
  if(label)label.textContent=FILM.source; sound();
  setTimeout(()=>{if(!reduced&&!document.hidden){video.muted=true;start()}},100);
})();
