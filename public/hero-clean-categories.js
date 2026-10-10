/* BTMEDYA CLEAN HERO v1
   The first frame is video-only. Category labels appear on the frozen
   end-frame of each of the three story beats. */
(()=>{
  const root=document.querySelector('.cinematic-hero[data-bt-clean-hero]');
  if(!root||root.hasAttribute('data-click-to-play'))return;
  const film=root.querySelector('.bt-clean-hero-video');
  if(!film)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html=document.documentElement;
  const body=document.body;
  /* 9 Ekim (kullanıcı isteği): AI giriş filmi (tools/giris-filmi/giris-v4.sh)
     kimlik kartlarını kendi karesinde taşır; data-kart-gomulu varsa bu
     sabit zamanlı etiketler çift yazı olmasın diye gösterilmez. */
  const categories=film.hasAttribute('data-kart-gomulu')?[]:[
    {n:1,start:4.20,end:5.02,label:'HABER & MEDYA'},
    {n:2,start:10.02,end:10.84,label:'SOSYAL & DİJİTAL'},
    {n:3,start:15.44,end:16.26,label:'MARKA & PRODÜKSİYON'}
  ];
  const taxonomyReady=window.BTMEDYA_TAXONOMY?Promise.resolve(window.BTMEDYA_TAXONOMY):new Promise(resolve=>{
    const existing=document.querySelector('script[data-bt-taxonomy-loader]');
    if(existing){existing.addEventListener('load',()=>resolve(window.BTMEDYA_TAXONOMY||null),{once:true});existing.addEventListener('error',()=>resolve(null),{once:true});return;}
    const s=document.createElement('script');s.src='/data/btmedya-taxonomy.js?v=20261010-1';s.dataset.btTaxonomyLoader='1';
    s.onload=()=>resolve(window.BTMEDYA_TAXONOMY||null);s.onerror=()=>resolve(null);document.head.appendChild(s);
  });
  const finishPanel=document.createElement('div');
  finishPanel.className='bt-clean-finish-panel';
  finishPanel.hidden=true;
  finishPanel.setAttribute('aria-label','BTMEDYA üç ana yol');
  const fallbackPaths=[
    {key:'haber',number:'01',label:'HABER & MEDYA',description:'Balıkesir, Türkiye ve dünya gündemi.',publicHref:'/haberler/',groups:[]},
    {key:'sosyal',number:'02',label:'SOSYAL & DİJİTAL',description:'İçerik üretimi, sosyal kanallar ve dijital büyüme.',publicHref:'/sosyal-medya/',groups:[]},
    {key:'tanitim',number:'03',label:'MARKA & PRODÜKSİYON',description:'Marka filmi, etkinlik, fotoğraf ve video üretimi.',publicHref:'/video-produksiyon/',groups:[]}
  ];
  const escapeHtml=v=>String(v??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const renderTaxonomy=T=>{
    const paths=T&&Array.isArray(T.paths)?T.paths:fallbackPaths;
    finishPanel.innerHTML='<div class="bt-clean-finish-inner"><p class="bt-clean-finish-kicker">BTMEDYA · ÜÇ ANA YOL</p><h2>Şimdi nereye?</h2><p class="bt-clean-finish-intro">Önce ana alanı seçin; ardından alt başlıkları açarak ilgili sayfaya geçin.</p><nav class="bt-clean-finish-paths" aria-label="Film sonu üç ana kategori">'+
      paths.map((p,i)=>'<section class="bt-clean-finish-path" data-finish-path="'+escapeHtml(p.key)+'">'+
        '<button type="button" class="bt-clean-finish-path-button" aria-expanded="false" aria-controls="bt-clean-finish-branch-'+i+'"><span class="bt-clean-finish-number">'+escapeHtml(p.number||String(i+1).padStart(2,'0'))+'</span><strong>'+escapeHtml(p.label)+'</strong><small>'+escapeHtml(p.description||'Alt kategorileri görüntüle')+'</small><i aria-hidden="true">＋</i></button>'+
        '<div class="bt-clean-finish-branch" id="bt-clean-finish-branch-'+i+'" hidden>'+
          (p.groups||[]).map((g,j)=>'<section class="bt-clean-finish-group"><button type="button" class="bt-clean-finish-group-button" aria-expanded="false" aria-controls="bt-clean-finish-items-'+i+'-'+j+'"><span>'+escapeHtml(g.label)+'</span><i aria-hidden="true">＋</i></button>'+
            '<ul id="bt-clean-finish-items-'+i+'-'+j+'" hidden>'+((g.items||[]).map(it=>'<li><a href="'+escapeHtml(it.href||p.publicHref||'/')+'"><span>'+escapeHtml(it.label)+'</span><i aria-hidden="true">↗</i></a></li>').join(''))+'</ul></section>').join('')+
          '<a class="bt-clean-finish-all" href="'+escapeHtml(p.publicHref||'/')+'">Tüm '+escapeHtml(p.shortLabel||p.label)+' alanı <span aria-hidden="true">↗</span></a>'+
        '</div></section>').join('')+
      '</nav><div class="bt-clean-finish-actions"><a href="/teklif-al/?kaynak=film-sonu">Proje / teklif oluştur ↗</a><a href="https://wa.me/905416401029?text=Merhaba%20BTMEDYA" target="_blank" rel="noopener">WhatsApp</a></div></div>';
    const mainButtons=[...finishPanel.querySelectorAll('.bt-clean-finish-path-button')];
    const closePath=(section)=>{
      section.querySelector('.bt-clean-finish-path-button').setAttribute('aria-expanded','false');
      section.querySelector('.bt-clean-finish-branch').hidden=true;
      section.classList.remove('is-selected');
    };
    mainButtons.forEach(button=>button.addEventListener('click',()=>{
      const section=button.closest('.bt-clean-finish-path'),opening=button.getAttribute('aria-expanded')!=='true';
      finishPanel.querySelectorAll('.bt-clean-finish-path').forEach(other=>{if(other!==section)closePath(other);});
      button.setAttribute('aria-expanded',String(opening));
      section.querySelector('.bt-clean-finish-branch').hidden=!opening;
      section.classList.toggle('is-selected',opening);
    }));
    finishPanel.querySelectorAll('.bt-clean-finish-group-button').forEach(button=>button.addEventListener('click',()=>{
      const group=button.closest('.bt-clean-finish-group'),opening=button.getAttribute('aria-expanded')!=='true';
      const branch=button.closest('.bt-clean-finish-branch');
      branch.querySelectorAll('.bt-clean-finish-group-button').forEach(other=>{
        const otherGroup=other.closest('.bt-clean-finish-group');
        other.setAttribute('aria-expanded','false');
        otherGroup.querySelector('ul').hidden=true;
        other.querySelector('i').textContent='＋';
      });
      button.setAttribute('aria-expanded',String(opening));group.querySelector('ul').hidden=!opening;
      button.querySelector('i').textContent=opening?'−':'＋';
    }));
    const firstPath=finishPanel.querySelector('.bt-clean-finish-path-button');
    if(firstPath){
      firstPath.setAttribute('aria-expanded','false');
    }
  };
  renderTaxonomy(window.BTMEDYA_TAXONOMY||null);
  taxonomyReady.then(T=>{if(T)renderTaxonomy(T);});
  root.appendChild(finishPanel);
  const layer=document.createElement('div');
  layer.className='bt-clean-hero-surface';
  layer.innerHTML=categories.map(c=>'<div class="bt-clean-category" data-scene="'+c.n+'" aria-hidden="true"><strong>'+c.label+'</strong></div>').join('');
  root.appendChild(layer);
  const els=categories.map(c=>({data:c,el:layer.querySelector('[data-scene="'+c.n+'"]')}));
  const src=matchMedia('(max-width:720px)').matches?film.dataset.mobileMp4:film.dataset.desktopMp4;
  const poster=matchMedia('(max-width:720px)').matches?film.dataset.mobilePoster:film.dataset.desktopPoster;
  if(poster)film.poster=poster;
  if(src){film.src=src;film.load();}
  film.muted=true;
  film.defaultMuted=true;
  film.playsInline=true;
  film.autoplay=true;
  const showScene=i=>els.forEach((x,j)=>{
    const on=i===j;
    x.el.classList.toggle('is-visible',on);
    x.el.setAttribute('aria-hidden',String(!on));
  });
  const finish=()=>{
    showScene(-1);
    root.dataset.ended='1';
    html.classList.remove('bt-clean-intro-active');
    body.classList.remove('bt-clean-intro-active');
    body.style.overflow='';
    window.scrollTo(0,0);
    body.classList.add('film-bitti');
    setTimeout(()=>{
      body.classList.add('bt-clean-hero-finished');
      root.classList.add('is-finished');
      finishPanel.hidden=false;
      requestAnimationFrame(()=>finishPanel.classList.add('is-visible'));
    },20);
  };
  const tick=()=>{
    const t=film.currentTime||0;
    let hit=-1;
    for(let i=0;i<categories.length;i++){
      if(t>=categories[i].start && t<categories[i].end){hit=i;break;}
    }
    showScene(hit);
    if(!film.paused && !film.ended)requestAnimationFrame(tick);
  };
  const tryPlay=()=>{
    const p=film.play();
    if(p&&p.catch)p.catch(()=>{
      html.classList.remove('bt-clean-intro-active');
      body.classList.remove('bt-clean-intro-active');
      body.style.overflow='';
      finish();
    });
  };
  film.addEventListener('timeupdate',tick);
  film.addEventListener('play',()=>requestAnimationFrame(tick));
  film.addEventListener('ended',finish);
  film.addEventListener('error',finish,{once:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&html.classList.contains('bt-clean-intro-active'))tryPlay();});
  root.addEventListener('pointerup',()=>{if(film.muted){film.muted=false;film.play().catch(()=>{});}});
  if(reduced){finish();return;}
  tryPlay();
})();
