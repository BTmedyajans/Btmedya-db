/* BTMEDYA Admin · tek arayüz / üç ana kategori + ilgili alt dallar */
(()=>{
  if(document.getElementById('btAdminMenu'))return;
  const KATEGORILER=[
    {ad:'HABER',ikon:'01',aciklama:'Haber üretimi, araştırma, SEO ve yayın.',gruplar:[
      {ad:'ÜRET',items:[
        ['Haber Odası','/admin/editor/','AI editör · kaynak · önizleme'],
        ['Yayın & Taslaklar','/admin/yayin/','Onay ve yayın kuyruğu']
      ]},
      {ad:'ARAŞTIR',items:[
        ['Trend & Radar','/admin/autopilot/','Gündem ve otomasyon'],
        ['Kaynak Masası','/admin/kaynak-masasi/','Kaynak ve doğrulama'],
        ['Halkın Merak Radarı','/admin/merak-radari/','Arama ve özel haber fırsatı']
      ]},
      {ad:'YÖNET',items:[
        ['Gelen Mesajlar','/admin/mesajlar/','İhbar ve iletişim'],
        ['SEO & Google','/admin/editor/#seo','SEO · AEO · yayın sinyalleri'],
        ['Haberler','/haberler/','Canlı haber merkezi']
      ]}
    ]},
    {ad:'SOSYAL MEDYA',ikon:'02',aciklama:'Müşteri hesapları, içerik, planlama ve dağıtım.',gruplar:[
      {ad:'MÜŞTERİ',items:[
        ['Müşteri Sosyal OS','/admin/musteri-sosyal/','Marka stratejisi ve AI içerik'],
        ['Müşteri Merkezi','/admin/client-hub/','Firma · proje · onay']
      ]},
      {ad:'YAYIN',items:[
        ['BTMEDYA Social OS','/admin/social-os/','Meta Direct · müşteri + kişisel çalışma alanları'],
        ['Sosyal Yayın','/admin/yayin/#social','Dağıtım ve yayın kuyruğu'],
        ['Instagram / Facebook','/admin/musteri-sosyal/','Hesap bağlantıları'],
        ['TikTok / YouTube','/admin/musteri-sosyal/','Hesap bağlantıları']
      ]},
      {ad:'ÖLÇ',items:[
        ['Sosyal Site','/sosyal-medya/','Canlı hizmet alanı'],
        ['Hesap / marka ayrımı','/admin/autopilot/#social','Şirket ve müşteri hesapları']
      ]}
    ]},
    {ad:'TANITIM',ikon:'03',aciklama:'Medya, video, proje, teklif ve AI üretimi.',gruplar:[
      {ad:'MEDYA',items:[
        ['Medya Kasası','/admin/app.html','Fotoğraf · video · arşiv'],
        ['AI LAB','/ai-lab/','AI üretimleri ve deneyler'],
        ['Video Prodüksiyon','/video-produksiyon/','Video ve prodüksiyon']
      ]},
      {ad:'PROJE',items:[
        ['Proje & Müşteri','/admin/client-hub/','Proje ve müşteri akışı'],
        ['Teklif Talepleri','/admin/sales/','Satış hunisi ve teklifler'],
        ['Teklif Formu','/teklif-al/','Müşterinin gördüğü form']
      ]},
      {ad:'VİTRİN',items:[
        ['Portföy','/portfoy/','Gerçek işler ve vakalar'],
        ['Siyah Oda','/siyah-oda/','Program ve bölüm arşivi'],
        ['Vaka Çalışmaları','/vaka-calismalari/','İş kanıtları']
      ]}
    ]}
  ];
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const here=location.pathname+location.hash;
  // Mobilde menü düğmesi her admin sayfasında görünür; mevcut sayfa özel tetikleyicileri varsa onları da kullanır.
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
    // Üç yolun dışında kalan sistem ekranları: her sayfadan ana ekrana dönüş,
    // sağlık kontrolü, canlı site ve çıkış. Bunlar menüde yoktu; ana ekrana
    // yalnız tarayıcının geri tuşuyla dönülebiliyordu.
    '</nav><div class="bam-sistem" aria-label="Sistem"><a href="/admin/agency-os/">Süpervizör (ana ekran)</a><a href="/admin/site-os/">Site sağlığı</a><a href="/" target="_blank" rel="noopener">Canlı site ↗</a><button type="button" data-bam-cikis>Çıkış</button></div>'+
    '<div class="bam-foot">Tek arayüz. Üç ana kategori. Alt dallar kendi kategorisinin içinde tutulur.</div></div>';
  document.documentElement.appendChild(root);
  const panel=root.querySelector('.bam-panel');let trigger=null;
  const allTriggers='#adminMenuToggle,.menu-toggle,.bam-dugme';
  const setExpanded=a=>document.querySelectorAll(allTriggers).forEach(x=>x.setAttribute('aria-expanded',String(a)));
  const open=t=>{trigger=t||null;root.hidden=false;document.documentElement.classList.add('bam-acik');requestAnimationFrame(()=>root.classList.add('is-acik'));setExpanded(true);(root.querySelector('[aria-current]')||root.querySelector('.bam-kat-baslik')).focus()};
  const close=()=>{root.classList.remove('is-acik');document.documentElement.classList.remove('bam-acik');setExpanded(false);setTimeout(()=>{if(!root.classList.contains('is-acik'))root.hidden=true},220);trigger&&trigger.focus()};
  root.addEventListener('click',e=>{
    if(e.target.closest('[data-bam-kapat]')){close();return}
    if(e.target.closest('[data-bam-cikis]')){fetch('/api/logout',{method:'POST',credentials:'same-origin'}).finally(()=>{location.href='/admin/'});return}
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
    if(e.target.closest('.bam-alt a,.bam-sistem a'))close();
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