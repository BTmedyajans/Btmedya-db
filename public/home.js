  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile=()=>window.innerWidth<=720;
  /* Sahne rozeti sahnenin videosunun kendi kaynagini gosterir.
     Varsayilan vitrin videolari bu katmanda GERCEK CEKIM olarak etiketlenir.
     Panelden bir sahneye atanan medya varsa kaynak bayragi kaydin gercek/AI
     alanindan yeniden belirlenir. AI LAB sahnesi daima AI URETIMI olarak kalir.
     Boylece kullaniciya kaynak konusunda yanlis varsayim gosterilmez. */
  const scenes=[
    {key:'hero',yuva:'hero-video',k:'01 / GİRİŞ',kaynak:'AI ÜRETİMİ',t:'GERÇEK<br><span>GÖRÜNTÜ.</span>',d:'Sahadan gelen gerçek hikâyeleri görünür kılıyoruz.'},
    {key:'haber',yuva:'kategori-haber',k:'02 / HABER · SAHA',kaynak:'AI ÜRETİMİ',t:'ŞEHRİN<br><span>HİKÂYESİ.</span>',d:'Haber, röportaj ve saha görüntüsü aynı akışta buluşuyor.'},
    {key:'medya',yuva:'kategori-medya',k:'03 / MEDYA · İÇERİK',kaynak:'AI ÜRETİMİ',t:'İÇERİĞİ<br><span>HAREKETE GEÇİR.</span>',d:'Fotoğraf, video ve sosyal medya için gerçek üretim.'},
    {key:'produksiyon',yuva:'kategori-prod',k:'04 / PRODÜKSİYON',kaynak:'AI ÜRETİMİ',t:'KAMERA<br><span>AÇIK.</span>',d:'Kadraj. Kurgu. Yayın. Fikri görüntüye dönüştürüyoruz.'},
    {key:'ai',k:'05 / AI LAB · AÇIK ETİKET',kaynak:'AI ÜRETİMİ',t:'YENİ<br><span>ARAÇLAR.</span>',d:'AI üretimi ayrı, açık ve şeffaf bir laboratuvar olarak konumlanıyor.'}
  ];
  /* Panel atamalari: sahnenin videosunu ve rozetini degistirir. Atama yoksa
     hicbir sey yapilmaz, sayfa kendi varsayilanlariyla kalir. */
  window.btYuvalar && window.btYuvalar.then(y=>{
    scenes.forEach((s,i)=>{
      const a=s.yuva && y[s.yuva]; if(!a || a.tur!=='video') return;
      s.kaynak=a.gercek?'GERÇEK ÇEKİM':'AI ÜRETİMİ';
      const el=videos[i] && videos[i].querySelector('video'); if(!el) return;