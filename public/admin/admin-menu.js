/* BTMEDYA Admin · canonical taxonomy + tek operasyon arayüzü */
(function(){
  function boot(){
    if(document.getElementById('btAdminMenu'))return;
    const T=window.BTMEDYA_TAXONOMY;
    if(!T||!Array.isArray(T.paths))return;

    const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const here=location.pathname+location.hash;
    const CATEGORY_CONTEXT={haber:'HABER & MEDYA',sosyal:'SOSYAL & DİJİTAL',tanitim:'MARKA & PRODÜKSİYON'};
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

    const root=document.createElement('div');
    root.id='btAdminMenu';root.className='bam';root.hidden=true;
    root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','BTMEDYA admin kategori menüsü');

    root.innerHTML='<div class="bam-perde" data-bam-kapat></div><div class="bam-panel">'+
      '<div class="bam-ust"><span class="bam-marka">BT<span>MEDYA</span></span><button type="button" class="bam-kapat" data-bam-kapat>Kapat ×</button></div>'+
      '<div class="bam-rehber"><b>ÖNCE NE YAPTIĞINI SEÇ</b><span>Haber & medya · sosyal & dijital · marka & prodüksiyon. Alt seviyeler yalnızca seçtiğin alanı açar.</span></div>'+
      '<nav class="bam-kategoriler" aria-label="BTMEDYA üç ana kategori">'+
      T.paths.map((p,i)=>
        '<section class="bam-kategori">'+
          '<button type="button" class="bam-kat-baslik" aria-expanded="false" aria-controls="bam-alt-'+i+'">'+
            '<span><small>'+esc(p.number)+'</small><b>'+esc(p.label)+'</b></span><i>＋</i>'+
          '</button>'+
          '<div class="bam-kat-aciklama">'+esc(p.description)+'</div>'+
          '<div id="bam-alt-'+i+'" class="bam-alt" hidden>'+
            (p.adminGroups||[]).map((g,gi)=>{
              const gid='bam-grup-'+i+'-'+gi;
              return '<section class="bam-alt-grup"><button type="button" class="bam-grup-baslik" aria-expanded="false" aria-controls="'+gid+'"><span>'+esc(g.label)+'</span><i>＋</i></button><div id="'+gid+'" class="bam-grup-items" hidden>'+
                (g.items||[]).map((it,j)=>
                  '<a href="'+esc(it.href)+'"'+(it.href===active?' aria-current="page"':'')+'>'+
                    '<span class="bam-adim"><em>0'+(j+1)+'</em><b>'+esc(it.label)+'</b><small>'+esc(it.note||'')+'</small></span><i>↗</i>'+
                  '</a>'
                ).join('')+'</div></section>';
            }).join('')+
          '</div>'+
        '</section>'
      ).join('')+
      '</nav>'+
      '<div class="bam-sistem" aria-label="Sistem"><a href="/admin/agency-os/">Süpervizör (ana ekran)</a><a href="/admin/site-os/">Site sağlığı</a><a href="/admin/connect/">Bağlantılar</a><a href="/" target="_blank" rel="noopener">Canlı site ↗</a><button type="button" data-bam-cikis>Çıkış</button></div>'+
      '<div class="bam-foot">Tek operasyon arayüzü. Kategori seçimi içerik, medya, yayın ve ölçüm akışını aynı bağlama taşır.</div>'+
    '</div>';

    document.documentElement.appendChild(root);
    const currentLink=root.querySelector('[aria-current="page"]');
    if(currentLink){
      const groupBox=currentLink.closest('.bam-grup-items');
      const groupBtn=groupBox&&root.querySelector('[aria-controls="'+groupBox.id+'"]');
      const catBox=currentLink.closest('.bam-alt');
      const catBtn=catBox&&root.querySelector('[aria-controls="'+catBox.id+'"]');
      if(groupBox&&groupBtn){groupBtn.setAttribute('aria-expanded','true');groupBox.hidden=false}
      if(catBox&&catBtn){catBtn.setAttribute('aria-expanded','true');catBox.hidden=false}
    }
    const panel=root.querySelector('.bam-panel');
    const allTriggers='#adminMenuToggle,.menu-toggle,.bam-dugme';
    const setExpanded=a=>document.querySelectorAll(allTriggers).forEach(x=>x.setAttribute('aria-expanded',String(a)));
    let trigger=null;
    const open=t=>{trigger=t||null;root.hidden=false;document.documentElement.classList.add('bam-acik');requestAnimationFrame(()=>root.classList.add('is-acik'));setExpanded(true);(root.querySelector('[aria-current]')||root.querySelector('.bam-kat-baslik')).focus()};
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
