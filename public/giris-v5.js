/* BTMEDYA giriş filmi v5 (11 Ekim, kullanıcı isteği):
   "Web sitesi web ve mobilde önce bu tanıtım videosu oynasın, ekranda başka
   hiçbir yazı vb. bulunmasın; video ritmine göre seçenekleri videonun içine
   yerleştir."

   NEDEN BÖYLE
   - Seçenekler ayrı bir panelde yazı olarak çıkmaz: filmin kendi karesindeki
     etiketlerin (01 HABER, GAZETECİ, son karttaki düğmeler...) üstüne,
     o etiket ekrandayken dokunulabilir alan olarak yerleşir. Görünen tek iz
     ince bir ışık halkasıdır; ad, ekran okuyucu için aria-label'dadır.
   - Zamanlar ve konumlar filmin kendisinden ölçüldü (8 kare/sn parlaklık
     taraması); kare yüzdesiyle tutulur ve object-fit hesabıyla ekrana
     eşlenir, böylece her en-boy oranında etiketin tam üstüne düşer.
   - Film otomatik oynatmada sessiz başlar; kullanıcı ilk dokunuşta veya ses
     düğmesinde seslendirmeyi açabilir. Böylece mobil autoplay kuralları korunur.
   - Film son karta girince alttan bölüm paneli açılır: HABER, SOSYAL MEDYA,
     PRODÜKSİYON ve her birinin alt kategori sayfaları (index.html'de
     statik bağlantılar; arama motoru da görür). Panel açılınca filmin
     içindeki dokunma alanlarına gerek kalmaz.
   - Aynı oturumda ikinci gelişte film baştan oynamaz, son karta atlar
     (haberden ana sayfaya dönen okur 40 sn beklemesin).
   - AGENTS.md: her kare AI ÜRETİMİ etiketi taşır. Film sürerken ekranda yazı
     istenmediği için etiket yalnız son karede, küçük olarak görünür. */
(()=>{
  const kok=document.querySelector('[data-giris-v5]');
  if(!kok)return;
  const film=kok.querySelector('video');
  if(!film)return;
  const html=document.documentElement, govde=document.body;

  // Kare yüzdeleri: x,y sol üst; w,h genişlik/yükseklik. sonKart: filmin son
  // kartının başladığı saniye; bölüm paneli o an açılır.
  // H.264 çözemeyen tarayıcı (codec'siz Chromium/Firefox) aynı kurgunun
  // WebM kopyasını alır; yoksa film hata verip doğrudan son kareye düşerdi.
  const h264=!!film.canPlayType('video/mp4; codecs="avc1.4D401F, mp4a.40.2"');
  const kaynak=(mp4,webm)=>h264||!webm?mp4:webm;
  const PLAN={
    dikey:{
      src:kaynak(film.dataset.dikey,film.dataset.dikeyWebm), poster:film.dataset.dikeyPoster, en:720, boy:1560, sonKart:15.4,
      alanlar:[
        {t0:4.2, t1:5.9, x:25, y:51.5, w:50, h:7.5, href:'/haberler/', ad:'Haber'},
        {t0:9.2, t1:10.9, x:25, y:51.5, w:50, h:7.5, href:'/sosyal-medya/', ad:'Medya: sosyal ve dijital'},
        {t0:14.2, t1:14.9, x:20, y:51.5, w:60, h:7.5, href:'/video-produksiyon/', ad:'Prodüksiyon'}
      ]
    },
    genis:{
      src:kaynak(film.dataset.genis,film.dataset.genisWebm), poster:film.dataset.genisPoster, en:1280, boy:720, sonKart:36.0,
      // Dokunma alanı olmayan bölüm başlıkları (kareden ölçüldü, 11 Ekim).
      vurgular:[
        {t0:1.0, t1:3.9, x:6.2, y:76, w:49.5, h:16},
        {t0:9.3, t1:12.0, x:6.2, y:76, w:42, h:16}
      ],
      alanlar:[
        {t0:18.8, t1:21.3, x:14.2, y:76.5, w:12.8, h:9.5, href:'/haberler/', ad:'Haber'},
        {t0:18.8, t1:21.3, x:29.6, y:76.5, w:28.8, h:9.5, href:'/sosyal-medya/', ad:'Sosyal ve dijital'},
        {t0:18.8, t1:21.3, x:61.2, y:76.5, w:24.2, h:9.5, href:'/video-produksiyon/', ad:'Prodüksiyon'},
        {t0:21.6, t1:23.6, x:3, y:75, w:28, h:15, href:'/haberler/', ad:'Gazeteci: haberler'},
        {t0:27.1, t1:29.6, x:3, y:75, w:52, h:15, href:'/sosyal-medya/', ad:'Sosyal medya uzmanı: sosyal ve dijital'},
        {t0:30.0, t1:32.2, x:3, y:75, w:37, h:15, href:'/video-produksiyon/', ad:'Dijital yapımcı: prodüksiyon'},
        {t0:30.4, t1:35.5, x:6, y:24, w:26, h:16, href:'/haberler/', ad:'Haber'},
        {t0:30.4, t1:35.5, x:6, y:41, w:26, h:17, href:'/video-produksiyon/', ad:'Video ve prodüksiyon'},
        {t0:30.4, t1:35.5, x:6, y:59, w:26, h:16, href:'/sosyal-medya/', ad:'Sosyal medya'}
      ]
    }
  };
  const ozelFilm=/btmedya-giris-v(?:6|7)/.test(String(film.dataset.genis||''));
  // Kullanıcı videosunda v5 kurgusunun saniye tabanlı dokunma alanları
  // kullanılmaz; böylece eski CTA kutuları yeni görüntünün üzerine kaymaz.
  if(ozelFilm){
    const dikey={src:film.dataset.dikey,poster:film.dataset.dikeyPoster,en:720,boy:1280,sonKart:Infinity,alanlar:[],vurgular:[]};
    const genis={src:film.dataset.genis,poster:film.dataset.genisPoster,en:1280,boy:720,sonKart:Infinity,alanlar:[],vurgular:[]};
    PLAN.dikey=dikey; PLAN.genis=genis;
  }
  const dikeyMi=()=>innerWidth/innerHeight<0.8;
  let p=dikeyMi()?PLAN.dikey:PLAN.genis;
  const izlendi=(()=>{try{return !ozelFilm&&sessionStorage.getItem('bt-giris-v5')==='1';}catch(e){return false;}})();
  const azHareket=matchMedia('(prefers-reduced-motion: reduce)').matches;

  const katman=document.createElement('div');
  katman.className='giris-v5-katman';
  kok.appendChild(katman);
  const panel=kok.querySelector('.giris-v5-kat');
  const etiket=document.createElement('span');
  etiket.className='giris-v5-ai';
  etiket.textContent='AI ÜRETİMİ';
  etiket.hidden=true;
  // Etiket panelin üst satırında durur; panel yoksa son karenin köşesinde.
  ((panel&&panel.querySelector('.giris-v5-kat-ust'))||kok).appendChild(etiket);
  kok.classList.add('js-hazir');
  let panelAcik=false;
  const panelAc=()=>{
    if(panelAcik)return;
    panelAcik=true;
    etiket.hidden=false;
    if(panel)panel.classList.add('is-acik');
  };

  // Başlık ışığı (11 Ekim, kullanıcı: "ana başlık videoda konusuna göre
  // göründükçe motion yazı efekti olsun"). Filmin kendi başlıkları (SAHADAN,
  // EKRANA, 01 HABER, GAZETECİ...) göründüğü an üstlerinden altın bir ışık
  // geçer. Yeni yazı eklenmez (film sürerken ekranda filmden başka yazı
  // istenmedi); color-dodge yalnız açık renkli harfleri parlatır. Katman
  // z-index almaz ki videoyla aynı grupta karışsın.
  const vurguKutu=document.createElement('div');
  vurguKutu.className='giris-v5-vurgular';
  vurguKutu.setAttribute('aria-hidden','true');
  film.after(vurguKutu);
  let vurgular=[];
  const vurguKur=()=>{
    vurguKutu.textContent='';
    const ayni={};
    vurgular=[...(p.vurgular||[]),...p.alanlar.filter(a=>!a.son)].map(a=>{
      const e=document.createElement('i');
      e.className='giris-v5-vurgu';
      // Aynı anda açılan başlıklarda ışık soldan sağa sırayla geçer.
      const sira=ayni[a.t0]=(ayni[a.t0]||0)+1;
      e.style.setProperty('--gecikme',((sira-1)*0.18)+'s');
      vurguKutu.appendChild(e);
      return {a,d:e};
    });
  };

  let dugmeler=[];
  const kur=()=>{
    vurguKur();
    katman.textContent='';
    dugmeler=p.alanlar.map(a=>{
      const d=document.createElement('a');
      d.className='giris-v5-alan'+(a.son?' is-son':'');
      d.href=a.href;
      d.setAttribute('aria-label',a.ad);
      d.tabIndex=-1;
      if(a.renk)d.style.setProperty('--alan-renk',a.renk);
      d.addEventListener('click',()=>{try{sessionStorage.setItem('bt-giris-v5','1');}catch(e){}});
      katman.appendChild(d);
      return {a,d};
    });
    yerlestir();
  };

  // Video karesi ekrana nasıl oturuyor: kenarlardan %6'dan fazla kesilecekse
  // (ör. 4:3 tablet) etiketler kadraj dışına düşmesin diye contain'e geçilir.
  const oturt=()=>{
    const W=kok.clientWidth||innerWidth, H=kok.clientHeight||innerHeight;
    const kapla=Math.max(W/p.en,H/p.boy), sigdir=Math.min(W/p.en,H/p.boy);
    const kesik=1-Math.min(W/(p.en*kapla),H/(p.boy*kapla));
    const s=kesik>0.06?sigdir:kapla;
    film.style.objectFit=kesik>0.06?'contain':'cover';
    return {s,ox:(W-p.en*s)/2,oy:(H-p.boy*s)/2};
  };
  const yerlestir=()=>{
    const {s,ox,oy}=oturt();
    for(const {a,d} of [...dugmeler,...vurgular]){
      d.style.left=(ox+a.x/100*p.en*s)+'px';
      d.style.top=(oy+a.y/100*p.boy*s)+'px';
      d.style.width=(a.w/100*p.en*s)+'px';
      d.style.height=(a.h/100*p.boy*s)+'px';
    }
  };

  let bitti=false;
  const zaman=()=>{
    const t=film.currentTime||0;
    if(t>=p.sonKart)panelAc();
    for(const {a,d} of dugmeler){
      const acik=t>=a.t0&&(a.son?true:t<a.t1);
      if(acik!==d.classList.contains('is-acik')){
        d.classList.toggle('is-acik',acik);
        d.tabIndex=acik?0:-1;
      }
    }
    for(const {a,d} of vurgular){
      const acik=t>=a.t0&&t<a.t1;
      if(acik!==d.classList.contains('is-acik'))d.classList.toggle('is-acik',acik);
    }
  };
  const dongu=()=>{zaman();if(!film.paused&&!film.ended)requestAnimationFrame(dongu);};

  const bitir=()=>{
    if(bitti)return;
    bitti=true;
    try{sessionStorage.setItem('bt-giris-v5','1');}catch(e){}
    kok.classList.add('is-bitti');
    html.classList.remove('bt-clean-intro-active');
    govde.classList.remove('bt-clean-intro-active');
    govde.classList.add('film-bitti');
    panelAc();
    zaman();
  };
  // Son karta atla: kaydırma/kaydırma hareketi, Esc ya da aynı oturumda dönüş.
  const sonaAtla=()=>{
    if(bitti)return;
    try{film.currentTime=Math.max(p.sonKart,(film.duration||p.sonKart+1)-0.05);}catch(e){}
    film.pause();
    bitir();
  };

  const yukle=()=>{
    film.poster=p.poster||'';
    film.src=p.src;
    film.load();
  };
  const oynat=()=>{
    // Giriş filmi tüm kaynaklarda ses kanalından arındırılmıştır. muted yine
    // zorunlu tutulur; böylece eski bir panel yuvası sesli medya döndürse bile
    // mobil otomatik oynatma ve "ekranda yalnız film" sözleşmesi bozulmaz.
    film.muted=true;
    const s=film.play();
    if(s&&s.catch)s.catch(sonaAtla);
  };

  // Panel bağlantısı: yönetim panelinde "Giriş filmi" (hero-video) yuvasına
  // yeni bir film atanırsa o oynar. Etiket zamanları yalnız v5 kurgusuna ait
  // olduğundan özel filmde dokunma alanları kapanır; film bitince sayfa açılır.
  // Emekli filmler (panelde eski atama olarak kalan) yok sayılır; 11 Ekim'de
  // yuvada hero-story.mp4 duruyordu ve yeni filmi ezerdi.
  const EMEKLI=/\/(hero-story(-mobile)?|giris-ai(-genis)?|giris-filmi(-genis)?|btmedya-ai-film(-genis)?|btmedya-hero-web|btmedya-giris-v6-(genis|dikey)|saha-gece)\.(mp4|webm)$/;
  const panelFilmi=y=>{
    const a=y&&y['hero-video'];
    const url=a&&String(a.url||'');
    if(!url||EMEKLI.test(url.split('?')[0])||/btmedya-tanitim-v5/.test(url))return false;
    p={...p,src:url,poster:(y['hero-poster']&&y['hero-poster'].url)||'',alanlar:[],vurgular:[],sonKart:Infinity};
    for(const k of Object.keys(PLAN))PLAN[k]=p;
    kur();
    yukle();
    if(izlendi||azHareket){bitti=false;film.addEventListener('loadedmetadata',sonaAtla,{once:true});}
    else oynat();
    return true;
  };

  kur();
  yukle();
  if(window.btYuvalar&&window.btYuvalar.then)window.btYuvalar.then(panelFilmi).catch(()=>{});
  addEventListener('resize',()=>{
    const yeni=dikeyMi()?PLAN.dikey:PLAN.genis;
    if(yeni!==p&&!bitti&&film.currentTime<1){p=yeni;kur();yukle();oynat();return;}
    yerlestir();
  },{passive:true});
  film.addEventListener('loadedmetadata',yerlestir);
  film.addEventListener('timeupdate',zaman);
  film.addEventListener('play',()=>requestAnimationFrame(dongu));
  film.addEventListener('ended',bitir);
  film.addEventListener('error',()=>{bitir();},{once:true});
  addEventListener('keydown',e=>{if(e.key==='Escape')sonaAtla();});
  addEventListener('wheel',e=>{if(!bitti&&e.deltaY>30)sonaAtla();},{passive:true});
  let dokunY=null;
  kok.addEventListener('touchstart',e=>{dokunY=e.touches[0].clientY;},{passive:true});
  kok.addEventListener('touchend',e=>{if(dokunY!==null&&dokunY-e.changedTouches[0].clientY>60)sonaAtla();dokunY=null;},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!bitti&&film.paused)film.play().catch(()=>{});});

  if(izlendi||azHareket){
    if(film.readyState>=1)sonaAtla();
    else film.addEventListener('loadedmetadata',sonaAtla,{once:true});
    return;
  }
  oynat();
})();
