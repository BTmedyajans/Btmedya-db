/* BTMEDYA Film Seçimi · 2026-10-06
   Neden: kullanıcı isteği. Film sesli bir süre oynadıktan sonra üç yol
   (Haber / Sosyal Medya / Tanıtım) motion yazılarla filmin ÜSTÜNDE gelir;
   düğmeler siyah-gri saydam cam. Önceki karakterli seçim sahnesi filmi
   gizleyip ayrı bir sahne açıyordu; tek film modunda o sahne kapalıdır
   (secim-sahnesi.js), film arkada sonuna kadar oynar.
   Zamanlama: filmin son ESIK saniyesi (çarpışma anı) başlar; son kare
   kurguda 1,2 sn durur (tools/giris-filmi/kurgu.sh), seçenekler o karede
   tamamlanır. Seçenekler gerçek bağlantılardır; harf harf açılan başlık
   ekran okuyucuya tek parça okunur. */
(()=>{
  const root=document.querySelector('.cinematic-hero[data-tek-film]');
  if(!root)return;
  const mobil=matchMedia('(max-width:720px)').matches;
  const film=mobil?root.querySelector('.mfilm-video'):root.querySelector('.cinematic-video-1 video');
  const kap=mobil?root.querySelector('.mfilm-kare'):root.querySelector('.cinematic-sticky');
  if(!film||!kap)return;
  const azHareket=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ESIK=3.6;
  const SECENEKLER=[
    {anahtar:'haber',no:'01',ad:'HABER',alt:'Kaynaklı gündem · Balıkesir ve Türkiye',yol:'/haberler/'},
    {anahtar:'sosyal',no:'02',ad:'SOSYAL MEDYA',alt:'İçerik · hesap yönetimi · reels',yol:'/sosyal-medya/'},
    {anahtar:'tanitim',no:'03',ad:'TANITIM',alt:'Düğün çekimleri · tanıtım filmi · reklam',yol:'/video-produksiyon/'}
  ];
  const kac=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let sira=0;
  const harfler=s=>[...s].map(c=>'<span class="fs-h" style="--i:'+(sira++)+'">'+(c===' '?'&nbsp;':kac(c))+'</span>').join('');

  const katman=document.createElement('div');
  katman.className='film-secim'; katman.hidden=true;
  katman.setAttribute('role','region'); katman.setAttribute('aria-label','Hangi yoldan devam etmek istiyorsun?');
  katman.innerHTML=
    '<div class="fs-perde" aria-hidden="true"></div>'+
    '<div class="fs-icerik">'+
      '<p class="fs-ust" aria-hidden="true"><span>BTMEDYA</span><i></i><span>ÜÇ YOL</span></p>'+
      '<h2 class="fs-baslik" aria-label="Hangi yoldan devam?"><span class="fs-satir" aria-hidden="true">'+harfler('HANGİ YOLDAN')+'</span><span class="fs-satir" aria-hidden="true">'+harfler('DEVAM?')+'</span></h2>'+
      '<nav class="fs-liste" aria-label="BTMEDYA hizmetleri">'+
        SECENEKLER.map((s,i)=>'<a class="fs-secenek" href="'+s.yol+'" data-secim="'+s.anahtar+'" style="--s:'+i+'"><span class="fs-no" aria-hidden="true">'+s.no+'</span><span class="fs-ad"><b>'+kac(s.ad)+'</b><small>'+kac(s.alt)+'</small></span><span class="fs-ok" aria-hidden="true">↗</span></a>').join('')+
      '</nav>'+
      '<div class="fs-alt"><button type="button" class="btkm-dugme fs-kategori" aria-expanded="false"><span aria-hidden="true">☰</span> Tüm kategoriler</button><button type="button" class="fs-tekrar">↺ Yeniden izle</button></div>'+
      // Film başında ekranda yazı yok (kullanıcı isteği); görüntülerin kaynağı
      // film bitince burada, küçük ve soft yazılır (AGENTS.md: etiket zorunlu).
      '<p class="fs-not">Film, BTMEDYA gerçek saha arşivi ile AI üretimi planlardan kurgulanmıştır.</p>'+
    '</div>';
  kap.appendChild(katman);

  let acik=false;
  // Masaüstü sahne 100vh ama üst şeritlerin altında başlıyor; alt kısmı ilk
  // ekranda görünmüyor. Seçenekler bu taşma kadar yukarıda durur.
  const tasmaOlc=()=>{ if(mobil)return; const r=kap.getBoundingClientRect(); katman.style.setProperty('--fs-tasma',Math.max(0,Math.round(r.bottom-innerHeight))+'px'); };
  addEventListener('resize',()=>acik&&tasmaOlc(),{passive:true});
  addEventListener('scroll',()=>acik&&tasmaOlc(),{passive:true});
  const goster=()=>{
    if(acik)return; acik=true; tasmaOlc();
    katman.hidden=false; root.classList.add('film-secim-acik'); document.body.classList.add('film-bitti');
    // İki kare beklenir: gizliden görünüre geçiş animasyonu atlanmasın.
    requestAnimationFrame(()=>requestAnimationFrame(()=>katman.classList.add('is-acik')));
  };
  const gizle=()=>{
    if(!acik)return; acik=false;
    katman.classList.remove('is-acik'); root.classList.remove('film-secim-acik'); document.body.classList.remove('film-bitti');
    setTimeout(()=>{ if(!acik)katman.hidden=true; },500);
  };
  film.addEventListener('timeupdate',()=>{ if(!acik&&film.duration&&film.currentTime>=film.duration-ESIK)goster(); });
  film.addEventListener('ended',goster);
  film.addEventListener('error',goster);
  film.addEventListener('seeked',()=>{ if(acik&&film.duration&&film.currentTime<film.duration-ESIK)gizle(); });
  katman.querySelector('.fs-tekrar').addEventListener('click',()=>{
    gizle(); film.currentTime=0;
    const p=(window.btFilmOynat||(v=>v.play()))(film); if(p&&p.catch)p.catch(()=>{});
  });
  // "Filmi geç" (hero-sequence-v2.js) filmi beklemeden seçeneklere götürür.
  document.addEventListener('click',e=>{ if(e.target.closest('.bt-hero-gec')){ film.pause(); goster(); } });
  // Düşük hareket tercihinde film kendiliğinden oynamaz; yollar hemen görünür.
  if(azHareket)goster();

  // İmleç ışığı: cam düğmenin üstünde fareyi izleyen yumuşak parıltı.
  katman.addEventListener('pointermove',e=>{
    const a=e.target.closest('.fs-secenek'); if(!a)return;
    const r=a.getBoundingClientRect();
    a.style.setProperty('--mx',(e.clientX-r.left)+'px'); a.style.setProperty('--my',(e.clientY-r.top)+'px');
  },{passive:true});
})();
