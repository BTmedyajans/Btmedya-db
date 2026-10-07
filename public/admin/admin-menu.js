/* BTMEDYA Admin · tek arayüz / üç ana yol hamburgeri */
(()=>{
  if(document.getElementById('btAdminMenu'))return;
  const KATEGORILER=[
    {ad:'HABER',ikon:'01',aciklama:'Sahadan yayına: kaynak, AI, SEO ve yayın.',alt:[
      ['Haber Odası','/admin/editor/','Ana çalışma alanı'],
      ['Yayın & Taslaklar','/admin/yayin/','Onaylı içerik ve yayın kuyruğu'],
      ['Trend & Radar','/admin/autopilot/','Gündem ve haber adayları'],
      ['Kaynak Masası','/admin/kaynak-masasi/','Doğrulama ve kaynaklar']
    ]},
    {ad:'SOSYAL MEDYA',ikon:'02',aciklama:'İçeriği platforma göre üret, planla ve ölç.',alt:[
      ['Müşteri Sosyal OS','/admin/musteri-sosyal/','AI strateji ve hesaplar'],
      ['Sosyal Yayın','/admin/yayin/#social','Platform dağıtımı ve kuyruk'],
      ['Müşteri Merkezi','/admin/client-hub/','Firma, içerik ve onay'],
      ['Sosyal medya sitesi','/sosyal-medya/','Canlı hizmet sayfası']
    ]},
    {ad:'TANITIM',ikon:'03',aciklama:'Proje, video ve teklif akışını tek yerden yönet.',alt:[
      ['Medya Kasası','/admin/app.html','Fotoğraf, video ve R2 arşivi'],
      ['Portföy','/portfoy/','Gerçek işler ve vaka arşivi'],
      ['Teklif Al','/teklif-al/','Yeni proje / müşteri talebi'],
      ['Proje & Müşteri','/admin/client-hub/','Proje bilgisi ve müşteri akışı']
    ]}
  ];
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const here=location.pathname+location.hash;
  let active='';
  for(const k of KATEGORILER)for(const[,u]of k.alt){
    const p=u.split('#')[0];
    if((p==='/'?here==='/':here.startsWith(p))&&p.length>(active?active.length:0))active=u;
  }
  const root=document.createElement('div');
  root.id='btAdminMenu';root.className='bam';root.hidden=true;
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','BTMEDYA üç ana yol menüsü');
  root.innerHTML='<div class="bam-perde" data-bam-kapat></div><div class="bam-panel">'+
    '<div class="bam-ust"><span class="bam-marka">BT<span>MEDYA</span></span><button type="button" class="bam-kapat" data-bam-kapat>Kapat ×</button></div>'+
    '<div class="bam-rehber"><b>ÖNCE YOLUNU SEÇ</b><span>01 amaç → 02 üret → 03 kontrol et → 04 yayınla</span></div>'+
    '<nav class="bam-kategoriler" aria-label="Üç ana yol">'+
    KATEGORILER.map((k,i)=>
      '<section class="bam-kategori">'+
      '<button type="button" class="bam-kat-baslik" aria-expanded="false" aria-controls="bam-alt-'+i+'">'+
      '<span><small>'+esc(k.ikon)+'</small><b>'+esc(k.ad)+'</b></span><i>＋</i></button>'+
      '<div class="bam-kat-aciklama">'+esc(k.aciklama)+'</div>'+
      '<div id="bam-alt-'+i+'" class="bam-alt" hidden>'+
      k.alt.map(([ad,u,ac],j)=>
        '<a href="'+u+'"'+(u===active?' aria-current="page"':'')+'>'+
        '<span class="bam-adim"><em>0'+(j+1)+'</em><b>'+esc(ad)+'</b><small>'+esc(ac)+'</small></span><i>↗</i></a>'
      ).join('')+'</div></section>'
    ).join('')+
    '</nav><div class="bam-foot">Tek arayüz. Üç ana yol. Gerektiğinde hamburgerden doğru çalışma ekranına geç.</div></div>';
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
      if(!isOpen){
        head.setAttribute('aria-expanded','true');
        const p=root.querySelector('#'+head.getAttribute('aria-controls'));if(p)p.hidden=false;
      }
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
  if(!document.querySelector(allTriggers)){
    const b=document.createElement('button');
    b.type='button';b.className='bam-dugme';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','btAdminMenu');b.setAttribute('aria-haspopup','dialog');
    b.innerHTML='<span aria-hidden="true">☰</span> Menü';
    const h=document.querySelector('header');if(h)h.appendChild(b);else document.body.appendChild(b);
  }
})();