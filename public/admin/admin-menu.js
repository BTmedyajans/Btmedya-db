/* BTMEDYA Admin · tek arayüz / üç ana kategori + ilgili alt dallar */
(()=>{
  if(document.getElementById('btAdminMenu'))return;
  const KATEGORILER=[
    {ad:'HABER',ikon:'01',aciklama:'Haber üretiminin tamamı burada.',gruplar:[
      {ad:'HABER ODASI',items:[
        ['Haber Odası','/admin/editor/','Kaynak → AI → SEO → yayın'],
        ['Yayın & Taslaklar','/admin/yayin/','Onay ve yayın kuyruğu']
      ]},
      {ad:'GÜNDEM',items:[
        ['Trend & Radar','/admin/autopilot/','Gündem ve haber adayları'],
        ['Kaynak Masası','/admin/kaynak-masasi/','Kaynak ve doğrulama']
      ]},
      {ad:'HABER KATEGORİLERİ',items:[
        ['Bölge: Balıkesir / Marmara / Türkiye / Dünya','/admin/editor/#category','Bölge seçimi'],
        ['Konu: Gündem / Ekonomi / Eğitim / Sağlık','/admin/editor/#category','Ana konu seçimi'],
        ['Konu: Spor / Kültür-Sanat / Yaşam / Teknoloji-AI','/admin/editor/#category','Diğer konu seçenekleri'],
        ['Format: Röportaj / Özel Dosya / AI LAB','/admin/editor/#category','Özel haber formatları']
      ]}
    ]},
    {ad:'SOSYAL MEDYA',ikon:'02',aciklama:'Müşteri hesapları, içerik ve yayın burada.',gruplar:[
      {ad:'İÇERİK',items:[
        ['Müşteri Sosyal OS','/admin/musteri-sosyal/','AI içerik ve marka stratejisi'],
        ['Müşteri Merkezi','/admin/client-hub/','Firma, içerik ve onay']
      ]},
      {ad:'PLATFORMLAR',items:[
        ['Instagram / Facebook','/admin/musteri-sosyal/','Hesap ve yayın bağlantıları'],
        ['TikTok / YouTube','/admin/musteri-sosyal/','Hesap ve yayın bağlantıları'],
        ['LinkedIn','/admin/musteri-sosyal/','Hesap ve yayın bağlantısı']
      ]},
      {ad:'YAYIN',items:[
        ['Sosyal Yayın','/admin/yayin/#social','Dağıtım ve yayın kuyruğu'],
        ['Sosyal medya sitesi','/sosyal-medya/','Canlı hizmet alanı']
      ]}
    ]},
    {ad:'TANITIM',ikon:'03',aciklama:'Proje, video, medya ve teklif işleri burada.',gruplar:[
      {ad:'ÜRETİM',items:[
        ['Medya Kasası','/admin/app.html','Fotoğraf, video ve arşiv'],
        ['Portföy','/portfoy/','Gerçek işler ve örnekler']
      ]},
      {ad:'MÜŞTERİ / PROJE',items:[
        ['Proje & Müşteri','/admin/client-hub/','Proje ve müşteri akışı'],
        ['Teklif Al','/teklif-al/','Yeni proje / müşteri talebi']
      ]},
      {ad:'HİZMETLER',items:[
        ['Video / Prodüksiyon','/prodüksiyon/','Video ve prodüksiyon hizmetleri'],
        ['AI LAB','/ai-lab/','AI içerik ve deneysel üretim'],
        ['Haber / Medya','/haberler/','Haber ve medya üretimi']
      ]}
    ]}
  ];
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const here=location.pathname+location.hash;
  let active='';
  for(const k of KATEGORILER)for(const g of k.gruplar)for(const[,u]of g.items){
    const p=u.split('#')[0];
    if((p==='/'?here==='/':here.startsWith(p))&&p.length>(active?active.length:0))active=u;
  }
  const root=document.createElement('div');
  root.id='btAdminMenu';root.className='bam';root.hidden=true;
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','BTMEDYA üç ana kategori menüsü');
  root.innerHTML='<div class="bam-perde" data-bam-kapat></div><div class="bam-panel">'+
    '<div class="bam-ust"><span class="bam-marka">BT<span>MEDYA</span></span><button type="button" class="bam-kapat" data-bam-kapat>Kapat ×</button></div>'+
    '<div class="bam-rehber"><b>ÖNCE ANA ALANI SEÇ</b><span>Her başlığın alt seçenekleri yalnızca kendi alanının içinde.</span></div>'+
    '<nav class="bam-kategoriler" aria-label="Üç ana kategori">'+
    KATEGORILER.map((k,i)=>
      '<section class="bam-kategori">'+
      '<button type="button" class="bam-kat-baslik" aria-expanded="false" aria-controls="bam-alt-'+i+'">'+
      '<span><small>'+esc(k.ikon)+'</small><b>'+esc(k.ad)+'</b></span><i>＋</i></button>'+
      '<div class="bam-kat-aciklama">'+esc(k.aciklama)+'</div>'+
      '<div id="bam-alt-'+i+'" class="bam-alt" hidden>'+
      k.gruplar.map((g,gi)=>
        '<section class="bam-alt-grup"><h3>'+esc(g.ad)+'</h3>'+
        g.items.map(([ad,u,ac],j)=>
          '<a href="'+u+'"'+(u===active?' aria-current="page"':'')+'>'+
          '<span class="bam-adim"><em>0'+(j+1)+'</em><b>'+esc(ad)+'</b><small>'+esc(ac)+'</small></span><i>↗</i></a>'
        ).join('')+'</section>'
      ).join('')+
      '</div></section>'
    ).join('')+
    '</nav><div class="bam-foot">Tek arayüz. Üç ana kategori. Alt dallar kendi kategorisinin içinde tutulur.</div></div>';
  document.documentElement.appendChild(root);
  const panel=root.querySelector('.bam-panel');let trigger=null;
  const allTriggers='#adminMenuToggle,.menu-toggle,.bam-dugme';
  const setExpanded=a=>document.querySelectorAll(allTriggers).forEach(x=>x.setAttribute('aria-expanded',String(a)));
  const open=t=>{trigger=t||null;root.hidden=false;document.documentElement.classList.add('bam-acik');requestAnimationFrame(()=>root.classList.add('is-acik'));setExpanded(true);(root.querySelector('[aria-current]')||root.querySelector('.bam-kat-baslik')).focus()};
  const close=()=>{root.classList.remove('is-acik');document.documentElement.classList.remove('bam-acik');setExpanded(false);setTimeout(()=>{if(!root.classList.contains('is-acik'))root.hidden=true},220);trigger&&trigger.focus()};
  root.addEventListener('click',e=>{
    if(e.target.closest('[data-bam-kapat]')){close();return}
    const head=e.target.closest('.bam-kat-baslik');
    if(head){
      const isOpen=head.getAttribute('aria-expanded')==='true';
      root.querySelectorAll('.bam-kat-baslik').forEach(x=>{
        x.setAttribute('aria-expanded','false');
        const p=root.querySelector('#'+x.getAttribute('aria-controls'));if(p)p.hidden=true;
      });
      if(!isOpen){head.setAttribute('aria-expanded','true');const p=root.querySelector('#'+head.getAttribute('aria-controls'));if(p)p.hidden=false}
      return;
    }
    if(e.target.closest('.bam-alt a'))close();
  });
  document.addEventListener('keydown',e=>{
    if(root.hidden)return;
    if(e.key==='Escape'){e.preventDefault();close();return}
    if(e.key==='Tab'){
      const focus=[...panel.querySelectorAll('button,a')];if(!focus.length)return;
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
})();