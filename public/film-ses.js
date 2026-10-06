/* BTMEDYA Film Sesi · 2026-10-06
   Neden: ana sayfa giriş filmi okura önce sesli sunulacaktı (kullanıcı
   isteği), ama film her zaman sessiz başlatılıyordu ve ses izi yoktu.
   Artık film sesli (tools/giris-filmi) ve önce SESLİ başlatılmaya çalışılır.
   Tarayıcılar, okur sitede henüz hiçbir şeye dokunmadıysa sesli otomatik
   oynatmayı reddeder (Chrome/Safari autoplay politikası). Bunu kod aşamaz;
   reddedilince film sessiz sürer, ortada "SESLİ İZLE" daveti çıkar ve
   okurun hero içindeki ilk dokunuşu sesi açar. Ses düğmesi her an açar ya
   da kapatır; okurun "kapalı" tercihi hatırlanır.
   Film oynatan kodlar (home.js, mobile-motion.js) window.btFilmOynat ile
   başlatır; bu dosya onlardan önce yüklenir. */
(()=>{
  const root=document.querySelector('.cinematic-hero[data-tek-film]');
  if(!root)return;
  const mobil=matchMedia('(max-width:720px)').matches;
  const film=mobil?root.querySelector('.mfilm-video'):root.querySelector('.cinematic-video-1 video');
  const kap=mobil?root.querySelector('.mfilm-kare'):root.querySelector('.cinematic-sticky');
  if(!film||!kap)return;
  const ANAHTAR='bt-film-ses';
  const tercih=()=>{try{return localStorage.getItem(ANAHTAR)!=='0';}catch(e){return true;}};
  const kaydet=v=>{try{localStorage.setItem(ANAHTAR,v?'1':'0');}catch(e){}};

  const dugme=document.createElement('button');
  dugme.type='button'; dugme.className='film-ses';
  dugme.innerHTML='<i class="film-ses-cubuk" aria-hidden="true"><b></b><b></b><b></b></i><span>SES</span>';
  const davet=document.createElement('button');
  davet.type='button'; davet.className='film-ses-davet'; davet.hidden=true;
  davet.innerHTML='<i aria-hidden="true"></i><span>SESLİ İZLE</span>';
  kap.append(dugme,davet);

  let engellendi=false;
  const guncelle=()=>{
    const acik=!film.muted;
    dugme.setAttribute('aria-pressed',String(acik));
    dugme.setAttribute('aria-label',acik?'Film sesini kapat':'Film sesini aç');
    dugme.querySelector('span').textContent=acik?'SES AÇIK':'SESSİZ';
    dugme.classList.toggle('acik',acik);
    davet.hidden=!(engellendi&&film.muted&&tercih()&&!film.ended);
  };
  window.btFilmOynat=v=>{
    if(v!==film)return v.play();
    // Engel bir kez görüldüyse her görünürlük dönüşünde yeniden denenmez.
    v.muted=!tercih()||engellendi;
    const p=v.play();
    guncelle();
    if(!p||!p.catch||v.muted)return p;
    return p.catch(e=>{
      if(!e||e.name!=='NotAllowedError')throw e;
      engellendi=true; v.muted=true; guncelle();
      return v.play();
    });
  };
  const sesAc=()=>{
    engellendi=false; film.muted=false; kaydet(true);
    if(film.paused&&!film.ended)film.play().catch(()=>{});
    guncelle();
  };
  dugme.addEventListener('click',()=>{ if(film.muted)sesAc(); else {film.muted=true; kaydet(false); guncelle();} });
  davet.addEventListener('click',sesAc);
  // Hero içindeki ilk dokunuş/tuş, kullanıcı etkileşimi sayıldığı için sesi
  // açabilir. Bağlantıya ya da düğmeye basış kendi işini yapar.
  const ilk=e=>{ if(!engellendi||!tercih()||e.target.closest('a,button'))return; sesAc(); };
  root.addEventListener('pointerup',ilk);
  root.addEventListener('keydown',ilk);
  ['volumechange','play','pause','ended'].forEach(o=>film.addEventListener(o,guncelle));
  guncelle();
})();
