/* BTMEDYA canonical three-path hero fallback.
   Film-secim.js is the primary runtime. This file remains compatible with
   older templates and never creates a second chooser when the canonical
   film overlay already exists. */
(()=> {
  const root=document.querySelector('.cinematic-hero');
  if(!root || root.querySelector('.film-secim')) return;
  if(root.querySelector('.hero-three-choice')) return;
  const yollar=[
    ['haber','HABER','Balıkesir → Türkiye → Dünya','/haberler/'],
    ['sosyal','SOSYAL MEDYA','İçerik → YouTube → AI → SEO','/sosyal-medya/'],
    ['tanitim','TANITIM','Düğün → Özel gün → Marka filmi','/video-produksiyon/']
  ];
  const nav=document.createElement('nav');
  nav.className='hero-three-choice';
  nav.setAttribute('aria-label','BTMEDYA üç ana yol');
  nav.innerHTML='<small>HANGİ YOLDAN DEVAM?</small>'+yollar.map(([k,a,d,h])=>
    '<a data-choice="'+k+'" href="'+h+'"><b>'+a+'</b><span>'+d+'</span><i aria-hidden="true">↗</i></a>'
  ).join('');
  root.querySelector('.cinematic-sticky')?.appendChild(nav);
  const film=root.querySelector('video');
  const show=()=>nav.classList.add('is-ready');
  film?.addEventListener('ended',show);
  film?.addEventListener('error',show);
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) show();
})();