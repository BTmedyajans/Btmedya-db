/* BTMEDYA public navigation · canonical taxonomy driven */
(function(){
  function boot(){
    if(document.getElementById('btKategoriMenu')) return;
    const T=window.BTMEDYA_TAXONOMY;
    if(!T||!Array.isArray(T.paths)) return;

    const KATEGORILER=T.paths.map(p=>({
      key:p.key,
      ad:p.label,
      ozet:p.description,
      groups:p.groups.map(g=>({
        ad:g.label,
        items:g.items.map(i=>[i.label,i.href])
      }))
    }));

    const KURUMSAL=[
      ['Hakkımızda','/hakkimizda/'],['İletişim','/iletisim/'],['Basın kiti','/basin-kiti/'],
      ['Marka kiti','/marka-kiti/'],['Yayın ilkeleri','/yayin-ilkeleri/'],['Künye','/kunye/'],
      ['Gizlilik','/gizlilik/'],['English','/en/']
    ];
    const yolu=location.pathname.replace(/index\.html$/,'').replace(/([^/])$/,'/');
    const kac=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const yuvarla=t=>'<span class="btkm-yuvarla"><span>'+kac(t)+'</span><span aria-hidden="true">'+kac(t)+'</span></span>';

    let etkin=0,enUzun=0;
    KATEGORILER.forEach((k,i)=>k.groups.forEach(g=>g.items.forEach(([,y])=>{
      if(y!=='/'&&yolu.startsWith(y)&&y.length>enUzun){enUzun=y.length;etkin=i;}
    })));
    if(yolu.startsWith('/haber/')) etkin=0;

    window.btKategoriler=KATEGORILER;

    const kok=document.createElement('div');
    kok.id='btKategoriMenu';kok.className='btkm';kok.hidden=true;
    kok.setAttribute('role','dialog');kok.setAttribute('aria-modal','true');
    kok.setAttribute('aria-label','BTMEDYA site menüsü');

    kok.innerHTML=
      '<div class="btkm-perde" data-btkm-kapat></div>'+
      '<div class="btkm-panel">'+
        '<div class="btkm-ust"><a class="btkm-marka" href="/">BTMEDYA</a><button type="button" class="btkm-kapat" data-btkm-kapat aria-label="Menüyü kapat">Kapat ×</button></div>'+
        '<div class="btkm-yollar" aria-label="Üç ana yol">'+
          KATEGORILER.map((k,i)=>
            '<section class="btkm-yol" data-yol="'+k.key+'" data-active="'+(i===etkin?'true':'false')+'">'+
              '<button type="button" class="btkm-yol-baslik" aria-expanded="'+(i===etkin?'true':'false')+'" aria-controls="btkm-yol-pano-'+i+'">'+
                '<span class="btkm-yol-no">0'+(i+1)+'</span>'+
                '<span><strong>'+kac(k.ad)+'</strong><small>'+kac(k.ozet)+'</small></span>'+
                '<i aria-hidden="true">+</i>'+
              '</button>'+
              '<div class="btkm-yol-pano" id="btkm-yol-pano-'+i+'"'+(i===etkin?'':' hidden')+'>'+
                k.groups.map((g,gi)=>{
                  const aktifGrup=g.items.some(([,y])=>y!=='/'&&yolu.startsWith(y));
                  const grupId='btkm-altgrup-'+i+'-'+gi;
                  return '<section class="btkm-altgrup" data-expanded="'+(aktifGrup?'true':'false')+'">'+
                    '<button type="button" class="btkm-altgrup-baslik" aria-expanded="'+(aktifGrup?'true':'false')+'" aria-controls="'+grupId+'"><span>'+kac(g.ad)+'</span><i aria-hidden="true">'+(aktifGrup?'−':'+')+'</i></button>'+
                    '<ul id="'+grupId+'"'+(aktifGrup?'':' hidden')+'>'+
                      g.items.map(([ad,y])=>
                        '<li><a href="'+y+'"'+(y===yolu?' aria-current="page"':'')+'>'+yuvarla(ad)+'<i aria-hidden="true">↗</i></a></li>'
                      ).join('')+
                    '</ul></section>';
                }).join('')+
              '</div>'+
            '</section>'
          ).join('')+
        '</div>'+
        '<nav class="btkm-kurumsal" aria-label="Kurumsal">'+KURUMSAL.map(([ad,y])=>'<a href="'+y+'"'+(y===yolu?' aria-current="page"':'')+'>'+kac(ad)+'</a>').join('')+'</nav>'+
        '<div class="btkm-alt"><a class="btkm-cta" href="/teklif-al/?kaynak=menu">'+yuvarla('Proje anlat ↗')+'</a><a href="https://wa.me/905416401029?text=Merhaba%20BTMEDYA" target="_blank" rel="noopener">WhatsApp</a><a href="tel:+905416401029">+90 541 640 10 29</a></div>'+
      '</div>';

    document.documentElement.appendChild(kok);
    const panel=kok.querySelector('.btkm-panel');
    const yollar=[...kok.querySelectorAll('.btkm-yol')];
    const yolButtons=[...kok.querySelectorAll('.btkm-yol-baslik')];

    const setYol=(i,focus=false)=>{
      i=(i+KATEGORILER.length)%KATEGORILER.length;
      yollar.forEach((el,j)=>{
        const on=j===i;el.dataset.active=on?'true':'false';
        const b=el.querySelector('.btkm-yol-baslik'),p=el.querySelector('.btkm-yol-pano');
        b.setAttribute('aria-expanded',String(on));p.hidden=!on;
      });
      if(focus)yolButtons[i].focus();
    };
    yolButtons.forEach((b,i)=>b.addEventListener('click',()=>setYol(i)));
    kok.querySelectorAll('.btkm-altgrup-baslik').forEach(b=>b.addEventListener('click',()=>{
      const on=b.getAttribute('aria-expanded')==='true';
      b.setAttribute('aria-expanded',String(!on));
      const panel=document.getElementById(b.getAttribute('aria-controls'));
      if(panel)panel.hidden=on;
      const section=b.closest('.btkm-altgrup');
      if(section)section.dataset.expanded=String(!on);
      const icon=b.querySelector('i');if(icon)icon.textContent=on?'+':'−';
    }));
    yolButtons.forEach((b,i)=>b.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();setYol(i+1,true)}
      else if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();setYol(i-1,true)}
      else if(e.key==='Home'){e.preventDefault();setYol(0,true)}
      else if(e.key==='End'){e.preventDefault();setYol(KATEGORILER.length-1,true)}
    }));

    let tetik=null;
    const TETIKLER='#menuToggle,.menu-toggle,.hamburger,.btkm-dugme';
    const durum=a=>document.querySelectorAll(TETIKLER).forEach(d=>d.setAttribute('aria-expanded',String(a)));
    const ac=t=>{
      tetik=t||null;kok.hidden=false;document.documentElement.classList.add('btkm-acik');
      requestAnimationFrame(()=>kok.classList.add('is-acik'));durum(true);
      yolButtons[etkin].focus({preventScroll:true});
    };
    const kapat=()=>{
      kok.classList.remove('is-acik');document.documentElement.classList.remove('btkm-acik');durum(false);
      setTimeout(()=>{if(!kok.classList.contains('is-acik'))kok.hidden=true},300);tetik&&tetik.focus();
    };

    kok.addEventListener('click',e=>{if(e.target.closest('[data-btkm-kapat]'))kapat()});
    document.addEventListener('click',e=>{
      const t=e.target.closest(TETIKLER);if(!t)return;
      e.preventDefault();e.stopImmediatePropagation();kok.hidden?ac(t):kapat();
    },true);
    document.addEventListener('keydown',e=>{
      if(kok.hidden)return;
      if(e.key==='Escape'){e.preventDefault();kapat();return}
      if(e.key==='Tab'){
        const o=[...panel.querySelectorAll('a,button')].filter(x=>x.offsetParent!==null&&x.tabIndex>=0);
        if(!o.length)return;
        const ilk=o[0],son=o[o.length-1];
        if(e.shiftKey&&document.activeElement===ilk){e.preventDefault();son.focus()}
        else if(!e.shiftKey&&document.activeElement===son){e.preventDefault();ilk.focus()}
      }
    });
    document.querySelectorAll(TETIKLER).forEach(d=>{
      d.setAttribute('aria-controls','btKategoriMenu');d.setAttribute('aria-haspopup','dialog');d.setAttribute('aria-expanded','false');
    });
    document.querySelectorAll('#siteMenu,#anaMenu,.site-menu,.menu-panel').forEach(e=>{if(!kok.contains(e))e.inert=true});
    if(!document.querySelector(TETIKLER)){
      const d=document.createElement('button');d.type='button';d.className='btkm-dugme';
      d.setAttribute('aria-expanded','false');d.setAttribute('aria-controls','btKategoriMenu');d.setAttribute('aria-haspopup','dialog');
      d.innerHTML='<span aria-hidden="true">☰</span> Menü';
      const baslik=document.querySelector('body>header,header');if(baslik)baslik.appendChild(d);else{d.classList.add('btkm-dugme-sabit');document.body.appendChild(d)}
    }
  }

  if(window.BTMEDYA_TAXONOMY) boot();
  else{
    const s=document.createElement('script');s.src='/data/btmedya-taxonomy.js?v=20261010-1';
    s.onload=boot;s.onerror=()=>console.error('BTMEDYA taxonomy yüklenemedi');document.head.appendChild(s);
  }
})();
