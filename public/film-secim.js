/* BTMEDYA Film Sonu Paneli · 2026-10-07 (v2: dallanan panel)
   v2 (kullanıcı isteği): film bitince tek bir ana başlık gelir ve ondan
   dallanılır: ana başlık (Haber / Sosyal medya / Tanıtım) -> alt başlık ->
   onun alt başlıkları. Sade, müşteriye dönük; yazı ve renk yumuşak.
   Aşağıdaki notlar v1'den kalan zamanlama ve mimari kararlarıdır.
   BTMEDYA Film Seçimi · 2026-10-07
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
  const film=root.querySelector('.mfilm-video');
  const kap=root.querySelector('.bt-home-hero-video')||root;
  if(!film||!kap)return;
  const azHareket=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ESIK=3.6;
  // Ana sayfası ve müşteriye dönük kısa vaadi olan üç yol. Alt başlıklar
  // hamburger menüyle aynı ağaçtan gelir (kategori-menu.js, btKategoriler);
  // o dosya yüklenmediyse panel üç ana bağlantıyla yine çalışır.
  const SECENEKLER=[
    {anahtar:'haber',no:'01',ad:'Haber',alt:'Balıkesir, Türkiye ve dünya gündemi',yol:'/haberler/',tumu:'Tüm haberler'},
    {anahtar:'sosyal',no:'02',ad:'Sosyal medya',alt:'İçerik üretimi, YouTube ve görünürlük',yol:'/sosyal-medya/',tumu:'Sosyal medya hizmeti'},
    {anahtar:'tanitim',no:'03',ad:'Tanıtım',alt:'Düğün, özel gün ve marka filmi',yol:'/video-produksiyon/',tumu:'Video prodüksiyon hizmeti'}
  ];
  const kac=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // Menü verisi BÜYÜK HARF tutulur; panel yumuşak okunsun diye cümle düzenine
  // çevrilir. Türkçe i/İ kuralı için 'tr' yereli şart; kısaltmalar korunur.
  const yumusat=s=>{const k=String(s).toLocaleLowerCase('tr');return (k.charAt(0).toLocaleUpperCase('tr')+k.slice(1)).replace(/(^|[^a-zçğıöşü])ai(?![a-zçğıöşü])/g,'$1AI').replace(/(^|[^a-zçğıöşü])seo(?![a-zçğıöşü])/g,'$1SEO');};
  const agac=window.btKategoriler||[];
  const dal=(s,i)=>{
    const k=agac.find(x=>x.key===s.anahtar);
    const gruplar=k?k.groups:[];
    return '<div class="fs-dal" id="fs-dal-'+i+'" hidden>'+
      (gruplar.length?
        '<div class="fs-altlar" role="group" aria-label="'+kac(s.ad)+' alt başlıkları">'+
          gruplar.map((g,j)=>'<button type="button" class="fs-alt-dugme" aria-expanded="'+(j===0)+'" aria-controls="fs-oge-'+i+'-'+j+'">'+kac(yumusat(g.ad))+'</button>').join('')+
        '</div>'+
        gruplar.map((g,j)=>'<ul class="fs-ogeler" id="fs-oge-'+i+'-'+j+'"'+(j===0?'':' hidden')+'>'+
          g.items.map(([ad,y])=>'<li><a href="'+kac(y)+'"><span>'+kac(ad)+'</span><i aria-hidden="true">→</i></a></li>').join('')+
        '</ul>').join('')
      :'')+
      '<a class="fs-tumu" href="'+s.yol+'" data-secim="'+s.anahtar+'">'+kac(s.tumu)+' <span aria-hidden="true">→</span></a>'+
    '</div>';
  };

  const katman=document.createElement('div');
  katman.className='film-secim'; katman.hidden=true;
  katman.setAttribute('role','region'); katman.setAttribute('aria-label','BTMEDYA: size nasıl yardımcı olalım?');
  katman.innerHTML=
    '<div class="fs-perde" aria-hidden="true"></div>'+
    '<div class="fs-icerik">'+
      '<p class="fs-ust">BTMEDYA · Balıkesir</p>'+
      '<h2 class="fs-baslik">Size nasıl yardımcı olalım?</h2>'+
      '<p class="fs-spot">Bir başlık seçin, alt başlıkları açılsın.</p>'+
      '<div class="fs-agac">'+
        SECENEKLER.map((s,i)=>'<section class="fs-yol" data-yol="'+s.anahtar+'" style="--s:'+i+'">'+
          '<button type="button" class="fs-yol-dugme" aria-expanded="false" aria-controls="fs-dal-'+i+'"><span class="fs-no" aria-hidden="true">'+s.no+'</span><span class="fs-ad"><b>'+kac(s.ad)+'</b><small>'+kac(s.alt)+'</small></span><i class="fs-ok" aria-hidden="true"></i></button>'+
          dal(s,i)+
        '</section>').join('')+
      '</div>'+
      '<div class="fs-alt"><a class="fs-teklif" href="/teklif-al/?kaynak=film-sonu">Teklif al</a><a class="fs-ikincil" href="https://wa.me/905416401029?text=Merhaba%20BTMEDYA" target="_blank" rel="noopener">WhatsApp’tan yazın</a><button type="button" class="fs-ikincil fs-tekrar">Filmi yeniden izle</button></div>'+
      // Film başında ekranda yazı yok (kullanıcı isteği); görüntülerin kaynağı
      // film bitince burada, küçük ve soft yazılır (AGENTS.md: etiket zorunlu).
      '<p class="fs-not"></p>'+
    '</div>';
  kap.appendChild(katman);
  // Kaynak notu oynayan filme göre yazılır: varsayılan giriş filmi yalnız
  // gerçek arşiv çekimidir (medya-ozel.json); panelden başka film atanırsa
  // AGENTS.md gereği varsayılan etiket AI üretimidir.
  const notYaz=()=>{ const u=String(film.currentSrc||film.dataset.src||'').split('?')[0];
    katman.querySelector('.fs-not').textContent=/\/giris-filmi(-genis)?\.(mp4|webm)$/.test(u)?'Film, BTMEDYA arşivi ve AI showreel görüntülerinin sinematik kurgusudur.':'Film, BTMEDYA gerçek saha arşivi ile AI üretimi planlardan kurgulanmıştır.'; };
  notYaz(); film.addEventListener('loadedmetadata',notYaz);

  // Dallanma: bir anda tek ana başlık ve onun altında tek alt başlık açıktır.
  // Masaüstünde ilk yol açık gelir ki üç kademe ilk bakışta görünsün; mobilde
  // ekran dar olduğu için önce yalnız üç ana başlık durur.
  const yollar=[...katman.querySelectorAll('.fs-yol')];
  const yolAc=(hedef,odak)=>{
    yollar.forEach(y=>{
      const d=y.querySelector('.fs-yol-dugme'), p=y.querySelector('.fs-dal'), ac=y===hedef;
      d.setAttribute('aria-expanded',String(ac)); p.hidden=!ac; y.classList.toggle('is-acik',ac);
    });
    katman.classList.toggle('dal-acik',!!hedef);
    if(hedef&&odak){ const ilk=hedef.querySelector('.fs-dal a,.fs-dal button'); ilk&&ilk.focus({preventScroll:true}); hedef.scrollIntoView({block:'nearest',behavior:azHareket?'auto':'smooth'}); }
  };
  yollar.forEach(y=>y.querySelector('.fs-yol-dugme').addEventListener('click',()=>{
    // Mobilde açık başlığa yeniden dokunmak onu kapatır (akordeon); masaüstünde bir yol hep açık kalır.
    if(y.classList.contains('is-acik')){ if(mobil)yolAc(null); return; }
    yolAc(y,mobil);
  }));
  katman.addEventListener('click',e=>{
    const b=e.target.closest('.fs-alt-dugme'); if(!b)return;
    const d=b.closest('.fs-dal');
    d.querySelectorAll('.fs-alt-dugme').forEach(x=>{ const ac=x===b; x.setAttribute('aria-expanded',String(ac)); document.getElementById(x.getAttribute('aria-controls')).hidden=!ac; });
  });
  if(!mobil)yolAc(yollar[0]);

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

})();
