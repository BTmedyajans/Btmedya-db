/* BTMEDYA Admin · canonical taxonomy + tek operasyon arayüzü */
(function(){
  function boot(){
    if(document.getElementById('btAdminMenu'))return;
    const T=window.BTMEDYA_TAXONOMY;
    if(!T||!Array.isArray(T.paths))return;

    const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const here=location.pathname+location.hash;
    const CATEGORY_CONTEXT={haber:'HABER',sosyal:'SOSYAL MEDYA',tanitim:'PRODÜKSİYON'};
    const pathCategory=p=>{
      const x=String(p||'');
      if(x.includes('/social')||x.includes('musteri-sosyal')||x.includes('/connect')||x.includes('sosyal-medya'))return 'sosyal';
      if(x.includes('/app')||x.includes('/sales')||x.includes('client-hub')||x.includes('video-produksiyon')||x.includes('portfoy')||x.includes('vaka-calismalari')||x.includes('teklif-al'))return 'tanitim';
      return 'haber';
    };

    let active='';
    for(const p of T.paths)for(const g of (p.adminGroups||[]))for(const it of g.items||[]){
      const base=String(it.href||'').split('#')[0];
      if(base&&here.startsWith(base)&&base.length>(active?active.length:0))active=it.href;
    }

    /* 11 Ekim (kullanıcı: "admin panelimi daha sade hamburger kategori (iç içe)
       stiliyle sadeleştirerek tüm özelliklerini kullanabileceğim şekilde web
       siteme ve depolara bağla"). Menü artık önce İŞE göre açılır:
       ana kategori → alt kategori → araç. Panelin her sayfası burada tek yerde;
       site kategorileri (Balıkesir, Karesi...) en altta, haber yazarken seçilir.
       Dış bağlantılar (canlı site, GitHub, Cloudflare, Search Console) yeni
       sekmede açılır; gizli bilgi taşımaz, oturum ilgili serviste istenir. */
    const ARACLAR=[
      {no:'01',ad:'İÇERİK & HABER',gruplar:[
        {ad:'Yaz ve yayınla',items:[
          ['Haber yaz','/admin/editor/'],['Yayın masası','/admin/yayin/'],['Autopilot (AI yayın)','/admin/autopilot/']]},
        {ad:'Kaynak ve gündem',items:[
          ['Kaynak masası','/admin/kaynak-masasi/'],['Halkın merak radarı','/admin/merak-radari/'],['Kategori ve otomasyon','/admin/kategori/']]}]},
      {no:'02',ad:'SOSYAL MEDYA',gruplar:[
        {ad:'Paylaşım',items:[['Sosyal yayın (Social OS)','/admin/social-os/'],['Müşteri sosyal hesapları','/admin/musteri-sosyal/']]},
        {ad:'Hesap bağlantıları',items:[['Bağlantılar (Meta, YouTube, TikTok, Metricool)','/admin/connect/']]}]},
      {no:'03',ad:'MEDYA & PRODÜKSİYON',gruplar:[
        {ad:'Arşiv',items:[['Telefondan medya yükle','/admin/app.html'],['Müşteri ve içerik merkezi','/admin/client-hub/']]}]},
      {no:'04',ad:'MÜŞTERİ & SATIŞ',gruplar:[
        {ad:'Talepler',items:[['Gelen mesajlar','/admin/mesajlar/'],['Satış masası (teklifler)','/admin/sales/']]},
        {ad:'Müşteriler',items:[['Müşteri merkezi','/admin/musteri-merkezi/']]}]},
      {no:'05',ad:'SİTE & SİSTEM',gruplar:[
        {ad:'Durum',items:[['Süpervizör (ana ekran)','/admin/agency-os/'],['Site sağlığı (Site OS)','/admin/site-os/']]},
        {ad:'Bağlı servisler',items:[
          ['Canlı site','https://btmedya.com.tr/',1],
          ['GitHub deposu','https://github.com/BTmedyajans/Btmedya-db',1],
          ['GitHub Actions (denetimler)','https://github.com/BTmedyajans/Btmedya-db/actions',1],
          ['Cloudflare Worker','https://dash.cloudflare.com/b239acae17aebe894ea76309fe32cdce/workers/services/view/btmedya-db/production',1],
          ['Google Search Console','https://search.google.com/search-console?resource_id=sc-domain%3Abtmedya.com.tr',1]]}]}
    ];
    const yolBu=h=>{if(/^https?:/.test(h))return false;const b=h.split('?')[0];return b==='/admin/app.html'?location.pathname===b:location.pathname.startsWith(b);};
    const aracHtml=ARACLAR.map((k,i)=>
      '<section class="bam-kategori bam-arac">'+
        '<button type="button" class="bam-kat-baslik" aria-expanded="false" aria-controls="bam-arac-'+i+'">'+
          '<span><small>'+esc(k.no)+'</small><b>'+esc(k.ad)+'</b></span><i>＋</i></button>'+
        '<div id="bam-arac-'+i+'" class="bam-alt" hidden>'+
          k.gruplar.map((g,gi)=>{const gid='bam-arac-'+i+'-'+gi;return '<section class="bam-alt-grup">'+
            '<button type="button" class="bam-grup-baslik" aria-expanded="false" aria-controls="'+gid+'"><span>'+esc(g.ad)+'</span><i>＋</i></button>'+
            '<div id="'+gid+'" class="bam-grup-items" hidden>'+
              g.items.map(([ad,href,dis],j)=>'<a href="'+esc(href)+'"'+(dis?' target="_blank" rel="noopener"':'')+(yolBu(href)?' aria-current="page"':'')+'>'+
                '<span class="bam-adim"><em>0'+(j+1)+'</em><b>'+esc(ad)+'</b></span><i>'+(dis?'↗':'→')+'</i></a>').join('')+
            '</div></section>';}).join('')+
        '</div></section>').join('');

    const root=document.createElement('div');
    root.id='btAdminMenu';root.className='bam';root.hidden=true;
    root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','BTMEDYA admin kategori menüsü');

    root.innerHTML='<div class="bam-perde" data-bam-kapat></div><div class="bam-panel">'+
      '<div class="bam-ust"><span class="bam-marka">BT<span>MEDYA</span></span><button type="button" class="bam-kapat" data-bam-kapat>Kapat ×</button></div>'+
      '<div class="bam-rehber"><b>YÖNETİM MENÜSÜ</b><span>Önce işi seç; panelin tüm araçları burada.</span><label class="bam-ara"><span aria-hidden="true">⌕</span><input id="bamAra" type="search" autocomplete="off" placeholder="Yönetimde ara: haber, sosyal, teklif…" aria-label="Yönetim işlemlerinde ara"><kbd>⌘K</kbd></label></div>'+
      '<nav class="bam-kategoriler bam-araclar" aria-label="Yönetim araçları">'+aracHtml+'</nav>'+
      '<p class="bam-ara-baslik">SİTE KATEGORİLERİ · haber yazarken seç</p>'+
      '<nav class="bam-kategoriler" aria-label="BTMEDYA site kategorileri">'+
      T.paths.map((p,i)=>
        '<section class="bam-kategori">'+
          '<button type="button" class="bam-kat-baslik" aria-expanded="false" aria-controls="bam-alt-'+i+'">'+
            '<span><small>'+esc(p.number)+'</small><b>'+esc(p.label)+'</b></span><i>＋</i>'+
          '</button>'+
          '<div id="bam-alt-'+i+'" class="bam-alt" hidden>'+
            (p.groups||[]).map((g,gi)=>{
              const gid='bam-grup-'+i+'-'+gi;
              const adminGroup=(p.adminGroups||[])[gi]||{};
              const adminItems=adminGroup.items||[];
              const fallbackHref=adminItems[0]?.href||'/admin/agency-os/';
              return '<section class="bam-alt-grup">'+
                '<button type="button" class="bam-grup-baslik" aria-expanded="false" aria-controls="'+gid+'">'+
                  '<span>'+esc(g.label)+'</span><i>＋</i>'+
                '</button>'+
                '<div id="'+gid+'" class="bam-grup-items" hidden>'+
                  (g.items||[]).map((it,j)=>{
                    const target=it.adminHref||fallbackHref;
                    const u=new URL(target,location.origin);
                    u.searchParams.set('kategori',it.key||g.key||p.key);
                    u.searchParams.set('yol',p.key);
                    u.searchParams.set('alt',g.key);
                    return '<a href="'+esc(u.pathname+u.search+u.hash)+'" data-public-href="'+esc(it.href||'')+'">'+
                      '<span class="bam-adim"><em>0'+(j+1)+'</em><b>'+esc(it.label)+'</b></span><i>↗</i>'+
                    '</a>';
                  }).join('')+
                '</div>'+
              '</section>';
            }).join('')+
          '</div>'+
        '</section>'
      ).join('')+
      '</nav>'+
      '<div class="bam-sistem" aria-label="Oturum"><button type="button" data-bam-cikis>Çıkış</button></div>'+
      '<div class="bam-foot">Ana kategori → alt kategori → araç. Ara kutusu tüm araçlarda ve kategorilerde arar.</div>'+
    '</div>';

    document.documentElement.appendChild(root);
    const adminSearch=root.querySelector('#bamAra');
    const adminGroups=[...root.querySelectorAll('.bam-alt-grup')];
    const adminCats=[...root.querySelectorAll('.bam-kategori')];
    const adminNorm=s=>String(s||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const adminFilter=()=>{
      const q=adminNorm(adminSearch?.value.trim());
      if(!q){adminGroups.forEach(g=>{g.style.display='';});adminCats.forEach(c=>c.style.display='');return;}
      adminCats.forEach(cat=>{
        let has=false;
        cat.querySelectorAll('.bam-alt-grup').forEach(group=>{const match=adminNorm(group.textContent).includes(q);group.style.display=match?'':'none';if(match)has=true;});
        cat.style.display=has?'':'none';
        if(has){const catBtn=cat.querySelector('.bam-kat-baslik');const catBox=cat.querySelector('.bam-alt');if(catBtn)catBtn.setAttribute('aria-expanded','true');if(catBox)catBox.hidden=false;cat.querySelectorAll('.bam-grup-baslik').forEach(btn=>btn.setAttribute('aria-expanded','true'));cat.querySelectorAll('.bam-grup-items').forEach(box=>box.hidden=false);}
      });
    };
    adminSearch?.addEventListener('input',adminFilter);
    adminSearch?.addEventListener('keydown',e=>{if(e.key==='Escape'){adminSearch.value='';adminFilter();e.stopPropagation();}});
    const currentLink=root.querySelector('[aria-current="page"]');
    if(currentLink){
      const groupBox=currentLink.closest('.bam-grup-items');
      const groupBtn=groupBox&&root.querySelector('[aria-controls="'+groupBox.id+'"]');
      const catBox=currentLink.closest('.bam-alt');
      const catBtn=catBox&&root.querySelector('[aria-controls="'+catBox.id+'"]');
      if(groupBox&&groupBtn){groupBtn.setAttribute('aria-expanded','true');groupBox.hidden=false}
      if(catBox&&currentLink.closest('.bam-arac'))catBox.querySelectorAll('.bam-grup-baslik').forEach(g=>{g.setAttribute('aria-expanded','true');const bx=catBox.querySelector('#'+g.getAttribute('aria-controls'));if(bx)bx.hidden=false});
      if(catBox&&catBtn){catBtn.setAttribute('aria-expanded','true');catBox.hidden=false}
    }
    const panel=root.querySelector('.bam-panel');
    const allTriggers='#adminMenuToggle,.menu-toggle,.bam-dugme';
    const setExpanded=a=>document.querySelectorAll(allTriggers).forEach(x=>x.setAttribute('aria-expanded',String(a)));
    let trigger=null;
    const open=t=>{trigger=t||null;root.hidden=false;document.documentElement.classList.add('bam-acik');requestAnimationFrame(()=>root.classList.add('is-acik'));setExpanded(true);(adminSearch||root.querySelector('[aria-current]')||root.querySelector('.bam-kat-baslik')).focus()};
    const close=()=>{root.classList.remove('is-acik');document.documentElement.classList.remove('bam-acik');setExpanded(false);setTimeout(()=>{if(!root.classList.contains('is-acik'))root.hidden=true},220);trigger&&trigger.focus()};

    root.addEventListener('click',e=>{
      if(e.target.closest('[data-bam-kapat]')){close();return}
      if(e.target.closest('[data-bam-cikis]')){fetch('/api/logout',{method:'POST',credentials:'same-origin'}).finally(()=>{location.href='/admin/'});return}
      const group=e.target.closest('.bam-grup-baslik');
      if(group){
        const open=group.getAttribute('aria-expanded')==='true';
        group.setAttribute('aria-expanded',String(!open));
        const box=root.querySelector('#'+group.getAttribute('aria-controls'));
        if(box)box.hidden=open;
        return;
      }
      const head=e.target.closest('.bam-kat-baslik');
      if(head){
        const isOpen=head.getAttribute('aria-expanded')==='true';
        root.querySelectorAll('.bam-kat-baslik').forEach(x=>{
          x.setAttribute('aria-expanded','false');
          const p=root.querySelector('#'+x.getAttribute('aria-controls'));if(p)p.hidden=true;
        });
        if(!isOpen){
          head.setAttribute('aria-expanded','true');
          const p=root.querySelector('#'+head.getAttribute('aria-controls'));if(p)p.hidden=false;
          // Araç kategorilerinde tüm alt gruplar birlikte açılır: en çok 3 araç
          // var, ikinci dokunuş gereksiz. Site kategorilerinde ilk grup açılır.
          if(head.closest('.bam-arac')){p.querySelectorAll('.bam-grup-baslik').forEach(g=>{g.setAttribute('aria-expanded','true');const bx=p.querySelector('#'+g.getAttribute('aria-controls'));if(bx)bx.hidden=false});return;}
          const firstGroup=p.querySelector('.bam-grup-baslik');
          if(firstGroup){firstGroup.setAttribute('aria-expanded','true');const box=p.querySelector('#'+firstGroup.getAttribute('aria-controls'));if(box)box.hidden=false}
        }
        return;
      }
      const link=e.target.closest('.bam-alt a');
      if(link){
        try{
          const raw=link.getAttribute('href')||'';
          const ctx=pathCategory(raw);
          if(raw.startsWith('/admin/')&&!raw.includes('kategori=')&&!raw.startsWith('/admin/agency-os/')){
            const u=new URL(raw,location.origin);u.searchParams.set('kategori',ctx);link.setAttribute('href',u.pathname+u.search+u.hash);
          }
          sessionStorage.setItem('btmedya-admin-category',ctx);
          sessionStorage.setItem('btmedya-admin-category-label',CATEGORY_CONTEXT[ctx]);
        }catch{}
        close();return;
      }
      if(e.target.closest('.bam-sistem a'))close();
    });

    document.addEventListener('keydown',e=>{
      if(root.hidden)return;
      if(e.key==='Escape'){e.preventDefault();close();return}
      if(e.key==='Tab'){
        const focus=[...panel.querySelectorAll('button,a')].filter(x=>x.offsetParent!==null);
        if(!focus.length)return;
        const first=focus[0],last=focus[focus.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
      }
    });
    document.addEventListener('click',e=>{
      const t=e.target.closest(allTriggers);if(!t)return;
      e.preventDefault();e.stopImmediatePropagation();root.hidden?open(t):close();
    },true);
    document.querySelectorAll(allTriggers).forEach(x=>{x.setAttribute('aria-controls','btAdminMenu');x.setAttribute('aria-haspopup','dialog')});
    document.addEventListener('keydown',e=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();const t=document.querySelector(allTriggers);if(root.hidden)open(t);else close()}
    });
    if(!document.querySelector(allTriggers)){
      const b=document.createElement('button');b.type='button';b.className='bam-dugme';
      b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','btAdminMenu');b.setAttribute('aria-haspopup','dialog');
      b.innerHTML='<span aria-hidden="true">☰</span> Menü <small>⌘K</small>';
      const h=document.querySelector('header');if(h)h.appendChild(b);else document.body.appendChild(b);
    }
  }

  if(window.BTMEDYA_TAXONOMY)boot();
  else{
    const s=document.createElement('script');s.src='/data/btmedya-taxonomy.js';
    s.onload=boot;s.onerror=()=>console.error('BTMEDYA taxonomy yüklenemedi');document.head.appendChild(s);
  }
})();
