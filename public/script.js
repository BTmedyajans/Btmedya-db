document.addEventListener('DOMContentLoaded',()=>{
  const pre=document.getElementById('preloader');
  setTimeout(()=>pre&&pre.classList.add('done'),450);

  // SAYFA ILERLEME CUBUGU: yalnizca deger degistiginde DOM'a yazar.
  const progressBar=document.querySelector('.page-progress i');
  if(progressBar){
    let lastPct=-1, ticking=false;
    const draw=()=>{
      ticking=false;
      const max=document.documentElement.scrollHeight-window.innerHeight;
      const pct=max>0?Math.round((window.scrollY/max)*1000)/10:0;
      if(pct===lastPct) return;
      lastPct=pct;
      progressBar.style.width=pct+'%';
    };
    addEventListener('scroll',()=>{
      if(ticking) return;
      ticking=true;
      requestAnimationFrame(draw);
    },{passive:true});
    draw();
  }

  // AGIR MEDYA KAPISI: telefon, dikey tablet, yan yatan telefon ve azaltilmis
  // hareket tercihinde hero videosu hic indirilmez, poster gorseli devralir.
  const HEAVY_MEDIA_GATES=[
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  const heavyMediaBlocked=()=>HEAVY_MEDIA_GATES.some(q=>window.matchMedia(q).matches);

  // Bir video etiketini yalnizca gercekten gerektiginde indirir.
  function loadVideo(v){
    if(!v || v.dataset.loaded) return false;
    const src=v.dataset.src;
    if(!src) return false;
    v.dataset.loaded='1';
    v.preload='auto';
    v.src=src;
    v.load();
    return true;
  }

  // INTRO VIDEO ONIZLEME: sayfa girisinde kisa video, sonra hero'ya gecis.
  const intro=document.getElementById('introOverlay');
  if(intro){
    const dismiss=()=>intro.classList.add('done');
    const introVideo=intro.querySelector('video');
    if(heavyMediaBlocked()){
      dismiss();
    }else{
      const t=setTimeout(dismiss,3200);
      if(introVideo){
        introVideo.addEventListener('ended',()=>{clearTimeout(t);dismiss();});
        introVideo.addEventListener('error',()=>{clearTimeout(t);dismiss();},{once:true});
        if(loadVideo(introVideo)) introVideo.play().catch(()=>{});
      }
      intro.addEventListener('click',()=>{clearTimeout(t);dismiss();});
    }
  }

  // HERO HIKAYE VIDEOSU -------------------------------------------------
  // Tek cekim, kesmesiz 9.4 saniyelik film. Masaustunde kaydirma ile kare
  // kare surulur; mobilde normal oynatilir. Her iki durumda da bolum metni
  // videonun zamanina baglidir, slogan videonun uzerinde durur.
  // Video hic inmezse poster ve 01 bolumu oldugu gibi kalir.
  (function(){
    const v=document.getElementById('heroStoryVideo');
    const heroSec=document.querySelector('.hero-scroll');
    const sticky=document.querySelector('.hero-sticky');
    if(!v||!heroSec||!sticky) return;

    const idxEl=document.querySelector('.hero-chapter-idx');
    const textEl=document.querySelector('.hero-chapter-text');

    // Bolumler, kurgudaki gercek anlara denk gelir (bkz. hero master kurgusu).
    const CH=[
      [0.00,'01','Her şey sahadaki bir insanla başlar.'],
      [1.15,'02','Hikâye gücünü oradan alır.'],
      [3.35,'03','Prodüksiyon ona biçim verir.'],
      [5.25,'04','Yapay zekâ ölçeğini büyütür.'],
      [6.90,'05','Ve hikâye yayına çıkar.']
    ];

    const mqReduce=window.matchMedia('(prefers-reduced-motion: reduce)');
    const isSmall=()=>window.innerWidth<=900;

    // Sayaci olcuye vurulmus baglanti: veri tasarrufu ve yavas sebekede inmez.
    function connectionPoor(){
      const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
      if(!c) return false;
      if(c.saveData) return true;
      return /^(slow-2g|2g|3g)$/.test(c.effectiveType||'');
    }
    const lowMemory=()=>(navigator.deviceMemory||8)<4;
    const allowed=()=>!mqReduce.matches && !connectionPoor() && !lowMemory();

    let started=false, raf=0, current=0, last=0, seeking=false, chapter=0;

    // Delta kapisi: bolum degismediyse DOM'a hic yazilmaz.
    function paintChapter(t){
      let i=0;
      for(let k=0;k<CH.length;k++) if(t>=CH[k][0]) i=k;
      if(i===chapter) return;
      chapter=i;
      if(idxEl) idxEl.textContent=CH[i][1];
      if(!textEl) return;
      textEl.classList.remove('in');
      textEl.textContent=CH[i][2];
      void textEl.offsetWidth;
      textEl.classList.add('in');
    }

    function progress(){
      const span=heroSec.offsetHeight-sticky.offsetHeight;
      if(span<=0) return 0;
      const top=heroSec.getBoundingClientRect().top;
      return Math.min(1,Math.max(0,-top/span));
    }

    function tick(now){
      raf=0;
      const dur=v.duration;
      if(!dur||!isFinite(dur)){ last=0; return; }
      const dt=last?Math.min(0.1,(now-last)/1000):1/60;
      last=now;
      const target=progress()*dur;
      current+=(target-current)*(1-Math.pow(0.0001,dt)); // dt ile normalize edilmis yumusatma
      paintChapter(current);
      // Aramayi kapila: yalnizca yarim kareden buyuk fark varsa ve onceki arama bittiyse.
      if(!seeking && Math.abs(current-v.currentTime)>1/48){
        seeking=true;
        try{ v.currentTime=current; }catch(e){ seeking=false; }
      }
      if(Math.abs(target-current)>0.003) schedule(); else last=0;
    }
    function schedule(){ if(!raf) raf=requestAnimationFrame(tick); }

    v.addEventListener('seeked',()=>{seeking=false;});
    v.addEventListener('error',()=>{heroSec.classList.remove('hero-story-on');},{once:true});

    function begin(){
      if(started||!allowed()) return;
      started=true;
      const small=isSmall();
      const src=(small&&v.dataset.srcMobile)?v.dataset.srcMobile:v.dataset.src;
      // preload="none" mirasi kalirsa load() veri cozmez ve loadeddata hic gelmez.
      const attach=url=>{ v.preload='auto'; v.src=url; v.dataset.loaded='1'; v.load(); };

      if(small){
        // Mobilde suruklemek guvenilir degil: video normal oynar, metin zamana bakar.
        v.loop=true;
        v.addEventListener('loadeddata',()=>{
          heroSec.classList.add('hero-story-on');
          v.play().catch(()=>{});
        },{once:true});
        v.addEventListener('timeupdate',()=>paintChapter(v.currentTime));
        attach(src);
        return;
      }

      // Masaustunde Blob olarak indirilir; boylece her arama agi beklemez.
      v.addEventListener('loadeddata',()=>{
        heroSec.classList.add('hero-story-on');
        current=0; last=0;
        try{ v.currentTime=0.001; }catch(e){}
        schedule();
      },{once:true});
      fetch(src,{credentials:'same-origin'})
        .then(r=>r.ok?r.blob():Promise.reject(r.status))
        .then(b=>attach(URL.createObjectURL(b)))
        .catch(()=>attach(src));

      window.addEventListener('scroll',schedule,{passive:true});
      window.addEventListener('resize',()=>{last=0;schedule();},{passive:true});
    }

    // Karakter gorseli ve sahne fotograflari yalnizca video devreye girmezse
    // gorunur. Video acikken hepsi gizli oldugu icin bosuna indirilmesinler.
    const fallbackArt=[document.getElementById('characterVideo'),
                       ...document.querySelectorAll('.scene-img')].filter(Boolean);
    function loadFallbackArt(){
      fallbackArt.forEach(el=>{ if(!el.src && el.dataset.src) el.src=el.dataset.src; });
    }
    v.addEventListener('error',loadFallbackArt,{once:true});

    function applyGate(){
      if(allowed()){ begin(); }
      else{ heroSec.classList.remove('hero-story-on'); loadFallbackArt(); }
    }
    mqReduce.addEventListener('change',applyGate);
    applyGate();
    // Video makul surede acilmadiysa eski sahne kurulumuna don.
    setTimeout(()=>{ if(!heroSec.classList.contains('hero-story-on')) loadFallbackArt(); },4000);
  })();

  // ALT BOLUM VIDEOLARI: gorunur olunca iner ve oynar, ekrandan cikinca durur.
  const lazyVideos=[...document.querySelectorAll('video.lazy-video')];
  if(lazyVideos.length){
    if(!('IntersectionObserver' in window)){
      lazyVideos.forEach(v=>{ if(loadVideo(v)) v.play().catch(()=>{}); });
    }else{
      const lazyIO=new IntersectionObserver(entries=>{
        entries.forEach(en=>{
          const v=en.target;
          if(en.isIntersecting){
            loadVideo(v);
            if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) v.play().catch(()=>{});
          }else if(!v.paused){
            v.pause();
          }
        });
      },{rootMargin:'250px 0px'});
      lazyVideos.forEach(v=>lazyIO.observe(v));
    }
  }

  // CURSOR LOGO — fare ile sayfa başlıkları arasında gezinen BT amblemi
  const reduced0=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHover=window.matchMedia('(hover:hover)').matches;
  if(!reduced0 && hasHover && window.innerWidth>900){
    const logo=document.createElement('div');
    logo.className='cursor-logo';
    logo.textContent='BT';
    document.body.appendChild(logo);
    let mx=window.innerWidth/2, my=window.innerHeight/2, lx=mx, ly=my;
    document.addEventListener('mousemove',e=>{
      mx=e.clientX; my=e.clientY;
      logo.classList.add('show');
    });
    document.addEventListener('mouseleave',()=>logo.classList.remove('show'));
    (function loop(){
      lx+=(mx-lx)*0.16; ly+=(my-ly)*0.16;
      logo.style.left=lx+'px'; logo.style.top=ly+'px';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('h1,h2,.hero-card,.service-card,.archive-card,.category-cover,.showreel-card').forEach(el=>{
      el.addEventListener('mouseenter',()=>logo.classList.add('magnet'));
      el.addEventListener('mouseleave',()=>logo.classList.remove('magnet'));
    });
  }

  const menu=document.querySelector('.menu-toggle');
  const nav=document.querySelector('.site-menu');
  if(menu&&nav){
    menu.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');
      menu.setAttribute('aria-expanded',open?'true':'false');
      menu.setAttribute('aria-label',open?'Menüyü kapat':'Menüyü aç');
    });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
  }

  const cards=[...document.querySelectorAll('.hero-card')];
  const stateVideo=document.getElementById('heroStateVideo');
  const sources={
    haber:'assets/media/web/state-haber.mp4',
    medya:'assets/media/web/state-medya.mp4',
    produksiyon:'assets/media/web/state-produksiyon.mp4'
  };
  let active='medya';
  let stateRequest=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setCategory(cat,play=true){
    if(!sources[cat]) return;
    active=cat;
    cards.forEach(c=>c.classList.toggle('active',c.dataset.category===cat));
    document.documentElement.dataset.heroCategory=cat;
    if(!stateVideo || reduced) return;
    const request=++stateRequest;
    stateVideo.classList.remove('ready');
    stateVideo.style.opacity='0';
    stateVideo.src=sources[cat];
    stateVideo.load();
    const reveal=()=>{
      if(request!==stateRequest) return;
      stateVideo.classList.add('ready');
      stateVideo.style.opacity='1';
      if(play) stateVideo.play().catch(()=>{});
    };
    stateVideo.addEventListener('loadeddata',reveal,{once:true});
    stateVideo.addEventListener('error',()=>{
      if(request!==stateRequest) return;
      stateVideo.style.opacity='0';
      stateVideo.removeAttribute('src');
    },{once:true});
  }

  cards.forEach((card,i)=>{
    const cat=card.dataset.category;
    card.addEventListener('mouseenter',()=>setCategory(cat));
    card.addEventListener('focus',()=>setCategory(cat,false));
    card.addEventListener('click',()=>{
      setCategory(cat);
      const target=document.querySelector(card.dataset.target||'#services');
      if(target) target.scrollIntoView({behavior:reduced?'auto':'smooth'});
    });
    card.addEventListener('touchstart',()=>setCategory(cat,false),{passive:true});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}});
  });
  // Acilista yalnizca aktif kart isaretlenir, kategori videosu ilk etkilesimde iner.
  cards.forEach(c=>c.classList.toggle('active',c.dataset.category==='medya'));
  document.documentElement.dataset.heroCategory='medya';

  const hero=document.querySelector('.hero-scroll');
  const sceneStart=document.querySelector('.scene-still-start');
  const sceneEnd=document.querySelector('.scene-still-end');
  const line=document.querySelector('.scene-line i');
  const label=document.querySelector('.scene-label');
  const rail=document.querySelector('.service-rail');

  if(!reduced && typeof gsap!=='undefined' && typeof ScrollTrigger!=='undefined'){
    gsap.registerPlugin(ScrollTrigger);
    if(hero){
      ScrollTrigger.create({
        trigger:hero,start:'top top',end:'bottom bottom',scrub:true,
        onUpdate:self=>{
          const p=self.progress;
          if(sceneStart) gsap.set(sceneStart,{opacity:Math.max(0,1-p*1.7)});
          if(sceneEnd) gsap.set(sceneEnd,{opacity:Math.max(0,(p-.45)*1.9)});
          gsap.set('.character-wrap',{y:p*-90,scale:1+p*.1});
          // Slogan video boyunca ustte durur, yalnizca son %18'de cekilir.
          gsap.set('.hero-copy',{y:p*-46,opacity:1-Math.min(1,Math.max(0,(p-.82)/.18))});
          gsap.set('.focus-ring',{rotation:p*180,scale:1+p*.5});
          if(line) line.style.width=(p*100)+'%';
          if(label) label.textContent=p<.33?'01 / GİRİŞ':p<.66?'02 / ODAK':'03 / ÇIKIŞ';
        }
      });
    }
    if(rail && window.innerWidth>900){
      gsap.to(rail,{x:()=>-(rail.scrollWidth-window.innerWidth*.58),ease:'none',scrollTrigger:{trigger:'.services-pin',start:'top top',end:'bottom bottom',scrub:1,invalidateOnRefresh:true}});
    }
    gsap.from('.service-card',{y:50,opacity:0,stagger:.08,duration:.8,scrollTrigger:{trigger:'.services-stage',start:'top 75%'}});
    gsap.from('.about-copy',{x:-50,opacity:0,duration:1,scrollTrigger:{trigger:'.about',start:'top 70%'}});
  }

  const newsGrid=document.getElementById('newsGrid');
  if(newsGrid){
    function catClass(cat){
      const c=(cat||'').toLowerCase();
      if(c.includes('ekonomi')||c.includes('emlak')||c.includes('tarim')) return 'cat-ekonomi';
      if(c.includes('spor')||c.includes('muay')) return 'cat-spor';
      if(c.includes('kültür')||c.includes('kultur')||c.includes('zanaat')||c.includes('moda')) return 'cat-kultur';
      if(c.includes('sağlık')||c.includes('saglik')||c.includes('beslenme')||c.includes('bakim')) return 'cat-saglik';
      if(c.includes('yerel')||c.includes('pazar')||c.includes('haber')||c.includes('güncel')) return 'cat-haber';
      return 'cat-default';
    }
    function formatDate(d){if(!d)return '';try{return new Date(d).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});}catch(e){return '';}}
    fetch('/api/news?limit=6').then(r=>{if(!r.ok) throw new Error('news');return r.json();}).then(data=>{
      const items=data.items||[];
      if(!items.length){newsGrid.innerHTML='<p style="color:#657788">Henüz yayınlanmış haber yok.</p>';return;}
      newsGrid.innerHTML=items.map(n=>`
        <article class="news-card">
          ${n.cover_url
            ?`<img class="news-card-img" src="${escapeHtml(n.cover_url)}" alt="${escapeHtml(n.title)}" loading="lazy">`
            :`<div class="news-card-placeholder ${catClass(n.category)}">BT</div>`}
          <div class="news-card-body">
            <small>${escapeHtml((n.category||'HABER').toUpperCase())}</small>
            <h3>${escapeHtml(n.title||'Başlıksız haber')}</h3>
            <p>${escapeHtml(n.excerpt||'').substring(0,120)}${(n.excerpt||'').length>120?'…':''}</p>
            <span class="news-card-date">${escapeHtml(n.author||'')}${n.author&&n.published_at?' · ':''}${formatDate(n.published_at)}</span>
            <a class="section-link" href="/haberler/${encodeURIComponent(n.slug)}">HABERİ AÇ ↗</a>
          </div>
        </article>`).join('');
    }).catch(()=>{
      fetch('data/haberler.json').then(r=>{if(!r.ok) throw new Error('fallback');return r.json();}).then(items=>{
        newsGrid.innerHTML=items.slice(0,6).map(n=>`
          <article class="news-card">
            <div class="news-card-placeholder ${catClass(n.category)}">BT</div>
            <div class="news-card-body">
              <small>${escapeHtml((n.category||'HABER').toUpperCase())}</small>
              <h3>${escapeHtml(n.title||'Başlıksız haber')}</h3>
              <p>${escapeHtml(n.excerpt||'').substring(0,120)}</p>
              <a class="section-link" href="/haberler/${encodeURIComponent(n.slug)}">HABERİ AÇ ↗</a>
            </div>
          </article>`).join('');
      }).catch(()=>{});
    });
  }

  const checks=[...document.querySelectorAll('.package-options input')];
  const count=document.getElementById('packageCount');
  const text=document.getElementById('packageText');
  const wa=document.getElementById('packageWhatsapp');
  function updatePackage(){
    const selected=checks.filter(c=>c.checked).map(c=>c.dataset.package);
    if(count) count.textContent=selected.length;
    if(text) text.textContent=selected.length?selected.join(' • '):'Henüz seçim yapılmadı.';
    if(wa){
      const msg=selected.length?`Merhaba BTMEDYA, kendi paketimi oluşturmak istiyorum. Seçimlerim: ${selected.join(', ')}.`:'Merhaba BTMEDYA, kendi paketimi oluşturmak istiyorum.';
      wa.href='https://wa.me/905416401029?text='+encodeURIComponent(msg);
    }
  }
  checks.forEach(c=>c.addEventListener('change',updatePackage));
  updatePackage();

  // PII-free intent event. No phone, name, email or message content is sent to analytics.
  document.querySelectorAll('a[href*="wa.me"]').forEach(a=>a.addEventListener('click',()=>{
    try{window.dispatchEvent(new CustomEvent('btmedya:whatsapp_intent',{detail:{category:active}}));}catch(e){}
  }));

  // ETKILESIMLI AN: basili tut, hikaye canlansin.
  // Ilerleme basili tutarken artar, birakinca geri soner, aniden sifirlanmaz.
  // Tamamlaninca alttaki icerik acilir. Azaltilmis harekette beklemeden
  // dogrudan son hal gosterilir.
  (function(){
    const sec=document.getElementById('canlandir');
    if(!sec) return;
    const stage=sec.querySelector('.revive-stage');
    const head=sec.querySelector('.revive-headline');
    const btn=sec.querySelector('.revive-btn');
    const label=sec.querySelector('.revive-label');
    const text=sec.querySelector('.revive-sr').textContent.trim();
    const reducedQ=window.matchMedia('(prefers-reduced-motion: reduce)');

    // Tohumlu rastgelelik: dagilma her acilista ayni, yani tasarim tekrarlanabilir.
    let seed=20260911>>>0;
    const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;

    // Harfler kelime kutularinin icine giriyor, yoksa satir sonu kelimeyi ortadan boler.
    head.innerHTML='';
    const words=text.split(' ');
    let idx=0;
    const total=text.length;
    words.forEach((word,wi)=>{
      const w=document.createElement('span');
      w.className='w';
      [...word].forEach(ch=>{
        const sp=document.createElement('span');
        sp.className='c';
        sp.textContent=ch;
        sp.style.setProperty('--th', (idx/total*0.55 + rnd()*0.12).toFixed(3));
        sp.style.setProperty('--jx', ((rnd()-0.5)*140).toFixed(1)+'px');
        sp.style.setProperty('--jy', ((rnd()-0.5)*90).toFixed(1)+'px');
        sp.style.setProperty('--jr', ((rnd()-0.5)*44).toFixed(1)+'deg');
        w.appendChild(sp);
        idx++;
      });
      head.appendChild(w);
      if(wi<words.length-1){ head.appendChild(document.createTextNode(' ')); idx++; }
    });
    const spans=[...head.querySelectorAll('.c')];

    let p=0, target=0, raf=null, last=0, done=false;
    const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

    function paint(){
      stage.style.setProperty('--p', p.toFixed(4));
      spans.forEach(sp=>{
        const th=parseFloat(sp.style.getPropertyValue('--th'))||0;
        sp.style.setProperty('--kc', clamp((p-th)*2.6,0,1).toFixed(3));
      });
      stage.style.setProperty('--after', clamp((p-0.82)*5.5,0,1).toFixed(3));
      if(p>=1 && !done){
        done=true;
        sec.classList.add('done');
        label.textContent='CANLANDI';
      }else if(p<1 && done){
        done=false;
        sec.classList.remove('done');
        label.textContent='BASILI TUTUN';
      }
    }

    function tick(now){
      const dt=Math.min(100, now-(last||now));
      last=now;
      // Dolus yaklasik 1,6 saniye, geri sonme biraz daha yavas.
      const rate = target>p ? dt/1600 : -dt/2200;
      p=clamp(p+rate,0,1);
      paint();
      if((target>p && p<1)||(target<p && p>0)){
        raf=requestAnimationFrame(tick);
      }else{
        raf=null; last=0;
      }
    }
    function drive(t){
      target=t;
      if(raf===null){ last=0; raf=requestAnimationFrame(tick); }
    }

    const hold=e=>{ if(e && e.cancelable) e.preventDefault(); drive(1); };
    const release=()=>drive(0);

    btn.addEventListener('mousedown',hold);
    btn.addEventListener('touchstart',hold,{passive:false});
    addEventListener('mouseup',release);
    addEventListener('touchend',release);
    addEventListener('touchcancel',release);
    btn.addEventListener('mouseleave',release);
    btn.addEventListener('blur',release);
    btn.addEventListener('keydown',e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); hold(); }});
    btn.addEventListener('keyup',e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); release(); }});

    function applyReduced(){
      if(reducedQ.matches){
        if(raf!==null){ cancelAnimationFrame(raf); raf=null; }
        p=1; paint();
        btn.setAttribute('disabled','');
        btn.style.display='none';
      }else{
        btn.removeAttribute('disabled');
        btn.style.display='';
      }
    }
    reducedQ.addEventListener('change',applyReduced);
    applyReduced();
    if(!reducedQ.matches) paint();
  })();

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

  // SEKME GIZLIYKEN DURAKLAT.
  // main dalindan gelen surum video[autoplay] seciyordu; bu dalda hicbir video
  // artik autoplay tasimiyor (hepsi kapiya ve gorunurluge bagli indiriliyor),
  // yani secim bos donuyor ve body.paused hic kurulmuyordu. Ekran disinda
  // duraklatmayi zaten yukaridaki lazy gozlemcisi yapiyor, burada yalnizca
  // sekme gizlenince duraklatma kaliyor. body.paused sinifi CSS tarafinda
  // butun animasyonlari (::before ve ::after dahil) donduruyor.
  (function(){
    const inView=el=>{
      const r=el.getBoundingClientRect();
      return r.bottom>0 && r.top<innerHeight && r.right>0 && r.left<innerWidth;
    };
    const playable=()=>[...document.querySelectorAll('video')]
      .filter(v=>v.dataset.loaded && !v.closest('.intro-overlay'));
    document.addEventListener('visibilitychange',()=>{
      const hidden=document.hidden;
      document.body.classList.toggle('paused',hidden);
      playable().forEach(v=>{
        if(hidden){ v.pause(); return; }
        // Kaydirma ile surulen hero videosu kendi zamanina bagli: oynatilmaz.
        if(v.dataset.scrub){
          if(v.loop && !matchMedia('(prefers-reduced-motion: reduce)').matches) v.play().catch(()=>{});
          return;
        }
        if(inView(v) && !matchMedia('(prefers-reduced-motion: reduce)').matches) v.play().catch(()=>{});
      });
    });
  })();
});

/* =====================================================================
   SİNEMATİK KATMAN
   Tam ekran menünün gövde kilidi, başlık açılışları ve bölüm parallax'ı.
   Mevcut menü kodu .open sınıfını ve aria durumunu zaten yönetiyor; bu
   blok yalnızca onun bıraktığı yerden devam eder, ikinci bir aç/kapa
   mantığı kurmaz.
   ===================================================================== */
(function(){
  var azHareket = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* --- Menü: gövde kaydırma kilidi ve Escape --- */
  var dugme = document.querySelector('.menu-toggle');
  var menu  = document.querySelector('.site-menu');
  if(dugme && menu){
    var esitle = function(){
      document.body.classList.toggle('menu-acik', menu.classList.contains('open'));
    };
    /* Tıklama dinleyicisiyle senkron olmak dinleyici kayıt sırasına bağlı
       kalırdı: mevcut menü kodu DOMContentLoaded içinde kaydoluyor, bu blok
       ise hemen çalışıyor, yani bizimki önce tetiklenip .open'ı eski haliyle
       okuyordu. Sınıfın kendisi izleniyor; sıra artık önemsiz. */
    new MutationObserver(esitle).observe(menu, { attributes:true, attributeFilter:['class'] });
    esitle();
    menu.addEventListener('click', function(ev){
      if(ev.target.tagName === 'A') { menu.classList.remove('open'); esitle(); }
    });
    document.addEventListener('keydown', function(ev){
      if(ev.key === 'Escape' && menu.classList.contains('open')){
        menu.classList.remove('open');
        dugme.setAttribute('aria-expanded','false');
        dugme.setAttribute('aria-label','Menüyü aç');
        esitle();
        dugme.focus();
      }
    });
  }

  if(azHareket.matches || !('IntersectionObserver' in window)) return;

  /* --- Başlık açılışları ---
     Öğeler görünür halde duruyor; sınıf ancak JS çalışıyorsa ekleniyor.
     Böylece script hiç yüklenmezse içerik yine okunur kalır. */
  var hedefler = [];
  document.querySelectorAll('.section-head, .bh, .cta, .about-copy').forEach(function(blok){
    var bas = blok.querySelector('h2, h1');
    var ust = blok.querySelector('.eyebrow, .mono');
    var alt = blok.querySelector('p:not(.eyebrow)');
    if(ust) hedefler.push([ust, '']);
    if(bas) hedefler.push([bas, 'cine-gecik-1']);
    if(alt) hedefler.push([alt, 'cine-gecik-2']);
  });
  hedefler.forEach(function(c){ c[0].classList.add('cine-hazir'); if(c[1]) c[0].classList.add(c[1]); });

  var gozcu = new IntersectionObserver(function(girisler){
    girisler.forEach(function(g){
      if(g.isIntersecting){
        g.target.classList.remove('cine-hazir');
        g.target.classList.add('cine-ac');
        gozcu.unobserve(g.target);
      }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
  hedefler.forEach(function(c){ gozcu.observe(c[0]); });

  /* Güvenlik ağı: gözcü herhangi bir nedenle tetiklenmezse 2.5 sn sonra
     hepsi açılır. Gizli kalmış içerik bırakmayalım. */
  setTimeout(function(){
    document.querySelectorAll('.cine-hazir').forEach(function(e){
      e.classList.remove('cine-hazir'); e.classList.add('cine-ac');
    });
  }, 2500);

  /* --- Parallax ---
     Yalnızca görünür alandaki öğeler hesaplanır; transform ile yapılır,
     düzen tetiklenmez. */
  var katmanlar = [];
  document.querySelectorAll('.portfolio-card img, .category-cover img, .archive-card img').forEach(function(img){
    img.classList.add('par-katman');
    katmanlar.push(img);
  });
  if(!katmanlar.length) return;

  var raf = null, pencereY = window.innerHeight;
  function ciz(){
    raf = null;
    for(var i=0;i<katmanlar.length;i++){
      var e = katmanlar[i], r = e.getBoundingClientRect();
      if(r.bottom < -80 || r.top > pencereY + 80) continue;
      var oran = (r.top + r.height/2 - pencereY/2) / pencereY;  /* -1 … 1 */
      e.style.transform = 'translate3d(0,' + (oran * -14).toFixed(2) + 'px,0) scale(1.06)';
    }
  }
  function plan(){ if(raf === null) raf = requestAnimationFrame(ciz); }
  window.addEventListener('scroll', plan, { passive:true });
  window.addEventListener('resize', function(){ pencereY = window.innerHeight; plan(); }, { passive:true });
  ciz();
})();
