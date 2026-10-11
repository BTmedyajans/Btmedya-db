/* BTMEDYA site menüsü v4 (11 Ekim, kullanıcı isteği: "içe geçmiş 3 ana başlık
   HABER / SOSYAL MEDYA / PRODÜKSİYON; karışıklık olmasın, izleyici aradığını
   bulsun; hareketli yazı ve geçişler; Siyah Oda ve portföy öne çıksın").

   v3'te yol → grup → bağlantı üç kat akordeondu: bir ilçeye ulaşmak dört
   dokunuş istiyordu ve sosyal yolun altı bağlantısı aynı sayfaya gidiyordu.
   v4'te tek seviye sekme var; seçili başlığın tüm grupları açık durur.
   Aynı adrese giden ikinci bağlantı gösterilmez. Veri tek kaynaktan gelir
   (data/btmedya-taxonomy.js); bu dosya yalnız sunar. */
(function(){
  function boot(){
    if(document.getElementById('btKategoriMenu')) return;
    const T=window.BTMEDYA_TAXONOMY;
    if(!T||!Array.isArray(T.paths)) return;

    const yolu=location.pathname.replace(/index\.html$/,'').replace(/([^/])$/,'/');
    const kac=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

    // Aynı adres bir başlık içinde ikinci kez görünmez; boş kalan grup düşer.
    const BASLIKLAR=T.paths.map(p=>{
      const gorulen=new Set();
      const gruplar=p.groups.map(g=>({
        key:g.key,ad:g.label,
        ogeler:g.items.filter(i=>{const k=i.href.split('#')[0];if(gorulen.has(i.href)||gorulen.has(k)&&!i.href.includes('#'))return false;gorulen.add(i.href);return true;})
          .map(i=>({ad:i.label,kisa:i.short||'',href:i.href}))
      })).filter(g=>g.ogeler.length);
      return {key:p.key,no:p.number||'',ad:p.label,ozet:p.description,gruplar};
    });
    window.btKategoriler=BASLIKLAR;

    // Sosyal başlığında hizmet bağlantılarının yanında BTMEDYA'nın kendi
    // hesapları durur (anasayfa ve künyedeki doğrulanmış adresler).
    const HESAPLAR=[
      ['Instagram','@btmedyajans','https://www.instagram.com/btmedyajans/'],
      ['TikTok','@btmedya1010','https://www.tiktok.com/@btmedya1010'],
      ['YouTube','@BTmedyaAjans','https://www.youtube.com/@BTmedyaAjans']
    ];
    const KURUMSAL=[
      ['Hakkımızda','/hakkimizda/'],['İletişim','/iletisim/'],['Basın kiti','/basin-kiti/'],
      ['Marka kiti','/marka-kiti/'],['Yayın ilkeleri','/yayin-ilkeleri/'],['Künye','/kunye/'],
      ['Gizlilik','/gizlilik/'],['English','/en/']
    ];

    let etkin=0,enUzun=0;
    BASLIKLAR.forEach((b,i)=>b.gruplar.forEach(g=>g.ogeler.forEach(o=>{
      const y=o.href.split(/[?#]/)[0];
      if(y!=='/'&&yolu.startsWith(y)&&y.length>enUzun){enUzun=y.length;etkin=i;}
    })));
    if(yolu.startsWith('/haber/')||yolu.startsWith('/haberler/')) etkin=0;

    // Başlık harfleri tek tek maskeden yükselir (yeni bölüm açıldı); ekran
    // okuyucu sekme adını okur, bu satır aria-hidden.
    const harfler=t=>[...t].map((h,i)=>h===' '?'<span class="btkm-bosluk"> </span>':'<span class="btkm-harf" style="--h:'+i+'">'+kac(h)+'</span>').join('');
    let sira=0;
    // "Buradasın" işareti yalnız tam adrese: /portfoy/?niyet=dugun, /portfoy/'yi işaretlemez.
    const tam=yolu+location.search;
    const burada=h=>h===tam||h.split('#')[0]===tam;
    const oge=o=>'<li><a class="btkm-oge" style="--i:'+(sira++)+'" href="'+kac(o.href)+'"'+(burada(o.href)?' aria-current="page"':'')+'><b>'+kac(o.ad)+'</b>'+(o.kisa?'<small>'+kac(o.kisa)+'</small>':'')+'<i aria-hidden="true">↗</i></a></li>';
    const grup=g=>{
      // Balıkesir grubunda şehir geniş kart, ilçeler altında çip sırası.
      if(g.key==='balikesir'&&g.ogeler.length>1){
        const [ana,...ilceler]=g.ogeler;
        return '<section class="btkm-grup btkm-grup-sehir"><h3>'+kac(g.ad)+'</h3><ul class="btkm-izgara btkm-izgara-genis">'+oge(ana)+'</ul>'+
          '<ul class="btkm-ciple" aria-label="Balıkesir ilçeleri">'+ilceler.map(o=>'<li><a class="btkm-cip" style="--i:'+(sira++)+'" href="'+kac(o.href)+'"'+(burada(o.href)?' aria-current="page"':'')+'>'+kac(o.ad)+'</a></li>').join('')+'</ul></section>';
      }
      return '<section class="btkm-grup'+(g.ogeler.length>4?' btkm-grup-cok':'')+'"><h3>'+kac(g.ad)+'</h3><ul class="btkm-izgara">'+g.ogeler.map(oge).join('')+'</ul></section>';
    };
    const pano=(b,i)=>{
      sira=0;
      const hesap=b.key==='sosyal'?'<section class="btkm-grup"><h3>BİZİ TAKİP ET</h3><ul class="btkm-ciple btkm-hesaplar">'+
        HESAPLAR.map(([ag,ad,u])=>'<li><a class="btkm-cip" style="--i:'+(sira++)+'" href="'+u+'" target="_blank" rel="noopener"><b>'+ag+'</b> '+kac(ad)+'</a></li>').join('')+'</ul></section>':'';
      return '<section class="btkm-pano" role="tabpanel" id="btkm-pano-'+i+'" aria-labelledby="btkm-sekme-'+i+'"'+(i===etkin?'':' hidden')+' tabindex="-1">'+
        '<p class="btkm-dev" aria-hidden="true">'+harfler(b.ad)+'</p>'+
        '<p class="btkm-ozet">'+kac(b.ozet)+'</p>'+
        b.gruplar.map(grup).join('')+hesap+'</section>';
    };

    const kok=document.createElement('div');
    kok.id='btKategoriMenu';kok.className='btkm';kok.hidden=true;
    kok.setAttribute('role','dialog');kok.setAttribute('aria-modal','true');
    kok.setAttribute('aria-label','BTMEDYA site menüsü');
    kok.innerHTML=
      '<div class="btkm-perde" data-btkm-kapat></div>'+
      '<div class="btkm-panel">'+
        '<div class="btkm-ust">'+
          '<a class="btkm-marka" href="/"><img src="/assets/logo/btmedya-logo-v5-baslik.webp" alt="BTMEDYA" width="132" height="24" decoding="async"></a>'+
          '<button type="button" class="btkm-kapat" data-btkm-kapat aria-label="Menüyü kapat"><span aria-hidden="true"></span>Kapat</button>'+
        '</div>'+
        '<form class="btkm-ara" action="/haberler/" method="get" role="search">'+
          '<label for="btkm-q">Haberlerde ara</label>'+
          '<input id="btkm-q" name="q" type="search" placeholder="Haber, ilçe ya da konu ara" enterkeyhint="search" autocomplete="off">'+
          '<button type="submit" aria-label="Ara">⌕</button>'+
        '</form>'+
        '<div class="btkm-vitrin" aria-label="Öne çıkanlar">'+
          '<a class="btkm-sahne btkm-sahne-oda" href="/siyah-oda/"><span class="btkm-isik" aria-hidden="true"></span>'+
            '<small>PROGRAM</small><strong>SİYAH ODA</strong><em>Uzmanlarla gündemin derinliği</em><i aria-hidden="true">▶</i></a>'+
          '<a class="btkm-sahne btkm-sahne-portfoy" href="/portfoy/"><span class="btkm-akan" aria-hidden="true"><span>TANITIM · BELGESEL · REKLAM · ETKİNLİK · HABER · </span><span>TANITIM · BELGESEL · REKLAM · ETKİNLİK · HABER · </span></span>'+
            '<small>VİTRİN</small><strong>PORTFÖY</strong><em>Gerçek işler, video ve fotoğraf</em><i aria-hidden="true">↗</i></a>'+
        '</div>'+
        '<div class="btkm-sekmeler" role="tablist" aria-label="Ana başlıklar">'+
          BASLIKLAR.map((b,i)=>'<button type="button" role="tab" id="btkm-sekme-'+i+'" aria-controls="btkm-pano-'+i+'" aria-selected="'+(i===etkin)+'" tabindex="'+(i===etkin?0:-1)+'"><small>'+kac(b.no)+'</small>'+kac(b.ad)+'</button>').join('')+
          '<span class="btkm-imlec" aria-hidden="true"></span>'+
        '</div>'+
        '<div class="btkm-panolar">'+BASLIKLAR.map(pano).join('')+'</div>'+
        '<nav class="btkm-kurumsal" aria-label="Kurumsal">'+KURUMSAL.map(([ad,y])=>'<a href="'+y+'"'+(y===yolu?' aria-current="page"':'')+'>'+kac(ad)+'</a>').join('')+'</nav>'+
        '<div class="btkm-alt"><a class="btkm-cta" href="/teklif-al/?kaynak=menu">Proje anlat ↗</a><a href="https://wa.me/905416401029?text=Merhaba%20BTMEDYA" target="_blank" rel="noopener">WhatsApp</a><a href="tel:+905416401029">+90 541 640 10 29</a></div>'+
      '</div>';
    document.documentElement.appendChild(kok);

    const panel=kok.querySelector('.btkm-panel');
    const sekmeler=[...kok.querySelectorAll('[role=tab]')];
    const panolar=[...kok.querySelectorAll('.btkm-pano')];
    const imlec=kok.querySelector('.btkm-imlec');
    const sekmeSerit=kok.querySelector('.btkm-sekmeler');

    const imleciTasi=()=>{
      const s=sekmeler[etkin];if(!s||!s.offsetWidth)return;
      imlec.style.width=s.offsetWidth+'px';imlec.style.transform='translateX('+s.offsetLeft+'px)';
    };
    // Yeni pano girişte yeniden canlanır; yön sınıfı "ileri/geri" kaymasını seçer.
    const canlandir=(p,yon)=>{
      p.classList.remove('is-giris','yon-ileri','yon-geri');void p.offsetWidth;
      p.classList.add('is-giris',yon>0?'yon-ileri':yon<0?'yon-geri':'yon-yok');
    };
    const sec=(i,odak)=>{
      i=(i+BASLIKLAR.length)%BASLIKLAR.length;
      if(i===etkin){if(odak)sekmeler[i].focus();return;}
      const yon=i>etkin?1:-1;etkin=i;
      sekmeler.forEach((s,j)=>{s.setAttribute('aria-selected',String(j===i));s.tabIndex=j===i?0:-1;});
      panolar.forEach((p,j)=>{p.hidden=j!==i;});
      canlandir(panolar[i],yon);imleciTasi();
      const ust=sekmeSerit.offsetTop-8;if(panel.scrollTop>ust)panel.scrollTop=ust;
      if(odak)sekmeler[i].focus();
    };
    sekmeler.forEach((s,i)=>{
      s.addEventListener('click',()=>sec(i));
      s.addEventListener('keydown',e=>{
        const k={ArrowRight:i+1,ArrowLeft:i-1,Home:0,End:BASLIKLAR.length-1}[e.key];
        if(k!==undefined){e.preventDefault();sec(k,true);}
      });
    });
    // Panoda yatay kaydırma bir sonraki/önceki başlığa geçer (mobil).
    let x0=null,y0=0;
    kok.querySelector('.btkm-panolar').addEventListener('touchstart',e=>{const t=e.touches[0];x0=t.clientX;y0=t.clientY;},{passive:true});
    kok.querySelector('.btkm-panolar').addEventListener('touchend',e=>{
      if(x0===null)return;const t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;x0=null;
      if(Math.abs(dx)>60&&Math.abs(dy)<45)sec(etkin+(dx<0?1:-1));
    },{passive:true});
    addEventListener('resize',()=>{if(!kok.hidden)imleciTasi();});

    let tetik=null;
    const TETIKLER='#menuToggle,.menu-toggle,.hamburger,.btkm-dugme';
    const durum=a=>document.querySelectorAll(TETIKLER).forEach(d=>d.setAttribute('aria-expanded',String(a)));
    const ac=t=>{
      tetik=t||null;
      // Açılış dairesi dokunulan düğmeden büyür.
      const r=t&&t.getBoundingClientRect?t.getBoundingClientRect():null;
      kok.style.setProperty('--btkm-ox',r?Math.round(r.left+r.width/2)+'px':'100%');
      kok.style.setProperty('--btkm-oy',r?Math.round(r.top+r.height/2)+'px':'0px');
      kok.hidden=false;document.documentElement.classList.add('btkm-acik');
      panel.scrollTop=0;
      requestAnimationFrame(()=>{kok.classList.add('is-acik');imleciTasi();canlandir(panolar[etkin],0);});
      durum(true);
      sekmeler[etkin].focus({preventScroll:true});
    };
    const kapat=()=>{
      kok.classList.remove('is-acik');document.documentElement.classList.remove('btkm-acik');durum(false);
      setTimeout(()=>{if(!kok.classList.contains('is-acik'))kok.hidden=true},380);tetik&&tetik.focus();
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
        const o=[...panel.querySelectorAll('a,button,input')].filter(x=>x.offsetParent!==null&&x.tabIndex>=0);
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
    const s=document.createElement('script');s.src='/data/btmedya-taxonomy.js?v=20261011-1';
    s.onload=boot;s.onerror=()=>console.error('BTMEDYA taxonomy yüklenemedi');document.head.appendChild(s);
  }
})();
