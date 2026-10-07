/* BTMEDYA Yönetim Paneli · iki seviyeli hamburger kategori sistemi */
(()=>{
  if(document.getElementById('btAdminMenu'))return;
  const KATEGORILER=[
    {ad:'HABER MERKEZİ',ikon:'01',alt:[
      ['Haber Odası','/admin/editor/','AI editör · canlı önizleme · SEO'],
      ['Taslaklar / Yayınlar','/admin/yayin/','Yayın kuyruğu · geçmiş'],
      ['Trend & Radar','/admin/autopilot/','Gündem · rakip · kaynak'],
      ['Halkın Merak Radarı','/admin/merak-radari/','Arama · fırsat · özel haber']
    ]},
    {ad:'AI EDİTORYAL',ikon:'02',alt:[
      ['Başlık / Hook','/admin/editor/#hook','Tutma sinyali · başlık'],
      ['SEO / AEO','/admin/editor/#seo','Arama · meta · yapı'],
      ['Kapak / Video','/admin/app.html','Medya · gerçek / AI etiketi'],
      ['AI Üretim Kuralları','/admin/autopilot/','Policy · onay · otomasyon']
    ]},
    {ad:'YAYIN & SOSYAL',ikon:'03',alt:[
      ['Yayın Merkezi','/admin/yayin/','Web · sosyal · planlama'],
      ['Müşteri Sosyal OS','/admin/musteri-sosyal/','AI plan · hesaplar · takip'],
      ['Sosyal durum','/admin/yayin/#social','Kuyruk · bağlantı durumu'],
      ['Yayın geçmişi','/admin/yayin/#history','Başarılı · hatalı · bekleyen']
    ]},
    {ad:'MÜŞTERİLER',ikon:'04',alt:[
      ['Müşteri Merkezi','/admin/client-hub/','Firma · içerik · onay'],
      ['Müşteri Sosyal OS','/admin/musteri-sosyal/','Strateji · ağlar · AI'],
      ['Müşteri Siteleri','/admin/site-os/','Sağlık · SEO · web operasyon'],
      ['Satış hunisi','/admin/sales/','Teklif · takip · dönüşüm']
    ]},
    {ad:'İSTİHBARAT & ÖLÇÜM',ikon:'05',alt:[
      ['Kaynak Masası','/admin/kaynak-masasi/','Doğrulama · proje hafızası'],
      ['SEO / Search Console','/admin/editor/#seo','Teknik SEO · index sinyali'],
      ['Sistem Süpervizörü','/admin/agency-os/','Alarm · aksiyon · ölçüm']
    ]},
    {ad:'MEDYA & ARŞİV',ikon:'06',alt:[
      ['Medya Kasası','/admin/app.html','Fotoğraf · video · R2'],
      ['Portföy','/portfoy/','Belgesel · vaka · kısa film'],
      ['Siyah Oda','/siyah-oda/','Program · bölüm arşivi']
    ]},
    {ad:'CANLI SİTE',ikon:'07',alt:[
      ['Ana sayfa','/','Yayınlanmış site'],
      ['Haber merkezi','/haberler/','Canlı haber arşivi'],
      ['Reklam / Sponsorluk','/reklam-ve-sponsorluk/','Satış ve kampanya']
    ]}
  ];
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const here=location.pathname+location.hash;
  let active='';for(const k of KATEGORILER)for(const[,u]of k.alt){if(u==='/'?here==='/':here.startsWith(u)&&u.length>(active?active.length:0))active=u}
  const root=document.createElement('div');root.id='btAdminMenu';root.className='bam';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','BTMEDYA yönetim menüsü');
  root.innerHTML='<div class="bam-perde" data-bam-kapat></div><div class="bam-panel"><div class="bam-ust"><span class="bam-marka">BTMEDYA <b>CONTROL</b></span><button type="button" class="bam-kapat" data-bam-kapat>Kapat ×</button></div><div class="bam-hint">Bir ana kategori seç, alt menü açılır. İçerik → ölçüm → yayın zinciri aynı panelde.</div><nav class="bam-kategoriler">'+KATEGORILER.map((k,i)=>'<section class="bam-kategori"><button type="button" class="bam-kat-baslik" aria-expanded="false" aria-controls="bam-alt-'+i+'"><span><small>'+esc(k.ikon)+'</small><b>'+esc(k.ad)+'</b></span><i>＋</i></button><div id="bam-alt-'+i+'" class="bam-alt" hidden>'+k.alt.map(([ad,u,ac])=>'<a href="'+u+'"'+(u===active?' aria-current="page"':'')+'><span><b>'+esc(ad)+'</b><small>'+esc(ac)+'</small></span><i>↗</i></a>').join('')+'</div></section>').join('')+'</nav></div>';
  document.documentElement.appendChild(root);
  const panel=root.querySelector('.bam-panel');let trigger=null;
  const allTriggers='#adminMenuToggle,.menu-toggle,.bam-dugme';
  const setExpanded=a=>document.querySelectorAll(allTriggers).forEach(x=>x.setAttribute('aria-expanded',String(a)));
  const open=t=>{trigger=t||null;root.hidden=false;document.documentElement.classList.add('bam-acik');requestAnimationFrame(()=>root.classList.add('is-acik'));setExpanded(true);(root.querySelector('[aria-current]')||root.querySelector('.bam-kat-baslik')).focus()};
  const close=()=>{root.classList.remove('is-acik');document.documentElement.classList.remove('bam-acik');setExpanded(false);setTimeout(()=>{if(!root.classList.contains('is-acik'))root.hidden=true},220);trigger&&trigger.focus()};
  root.addEventListener('click',e=>{if(e.target.closest('[data-bam-kapat]')){close();return}const head=e.target.closest('.bam-kat-baslik');if(head){const openNow=head.getAttribute('aria-expanded')==='true';root.querySelectorAll('.bam-kat-baslik').forEach(x=>{x.setAttribute('aria-expanded','false');const p=root.querySelector('#'+x.getAttribute('aria-controls'));if(p)p.hidden=true});if(!openNow){head.setAttribute('aria-expanded','true');const p=root.querySelector('#'+head.getAttribute('aria-controls'));if(p)p.hidden=false;}return}if(e.target.closest('.bam-alt a'))close()});
  document.addEventListener('keydown',e=>{if(root.hidden)return;if(e.key==='Escape'){e.preventDefault();close();return}if(e.key==='Tab'){const focus=[...panel.querySelectorAll('button,a')];if(!focus.length)return;const first=focus[0],last=focus[focus.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
  document.addEventListener('click',e=>{const t=e.target.closest(allTriggers);if(!t)return;e.preventDefault();e.stopImmediatePropagation();root.hidden?open(t):close()},true);
  document.querySelectorAll(allTriggers).forEach(x=>{x.setAttribute('aria-controls','btAdminMenu');x.setAttribute('aria-haspopup','dialog')});
  if(!document.querySelector(allTriggers)){const b=document.createElement('button');b.type='button';b.className='bam-dugme';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','btAdminMenu');b.setAttribute('aria-haspopup','dialog');b.innerHTML='<span aria-hidden="true">☰</span> Menü';const h=document.querySelector('header');if(h)h.appendChild(b);else document.body.appendChild(b)}
})();
