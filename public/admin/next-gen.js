(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const tabs=[['durum','⌂','Genel Bakış'],['media','▣','Medya'],['news','✎','Haberler'],['social','◉','Sosyal'],['automation','⚙','Otomasyon'],['intel','◈','İstihbarat'],['videos','▶','Videolar'],['messages','✉','Mesajlar'],['control','◆','Kontrol'],['ops','⌁','Araçlar']];
  function go(name){ if(name==='autopilot'){window.location.href='/admin/autopilot/';return;} if(typeof window.showTab==='function') window.showTab(name); else { const b=$('.tab[data-tab="'+name+'"]'); if(b)b.click(); } closePalette(); }
  function openEditor(){ window.location.href='/admin/editor/'; }
  function ensure(){
    if($('#ngPalette'))return;
    const wrap=document.createElement('div');
    wrap.innerHTML='<div id="ngHealth" class="ng-health" aria-live="polite"><i></i><span>Site kontrol ediliyor</span></div>'+
      '<button id="ngQuick" class="ng-quick" type="button" aria-label="Hızlı menü">⌘ K</button>'+
      '<div id="ngPalette" class="ng-palette" hidden><div class="ng-palette-card"><div class="ng-palette-head"><b>BTMEDYA Hızlı Menü</b><kbd>ESC</kbd></div><input id="ngSearch" autocomplete="off" placeholder="Ara: haber, medya, bölüm, işlem…"><div id="ngResults" class="ng-results"></div><div class="ng-shortcuts"><span>↑↓ seç</span><span>Enter aç</span><span>⌘K menü</span></div></div></div>'+
      '<div id="ngMobileDock" class="ng-mobile-dock"></div>';
    document.body.append(...Array.from(wrap.children));
    const dock=$('#ngMobileDock'); dock.innerHTML=tabs.slice(0,5).map(x=>'<button type="button" data-ng-go="'+x[0]+'"><b>'+x[1]+'</b><span>'+x[2]+'</span></button>').join('');
    $('#ngQuick').addEventListener('click',openPalette);
    $('#ngSearch').addEventListener('input',renderResults);
    $('#ngSearch').addEventListener('keydown',e=>{if(e.key==='Escape')closePalette();if(e.key==='Enter'){const b=$('.ng-result.active')||$('.ng-result');if(b){if(b.dataset.go==='editor')openEditor();else go(b.dataset.go);}}});
    document.addEventListener('click',e=>{const b=e.target.closest('[data-ng-go]');if(b)go(b.dataset.ngGo);const ed=e.target.closest('[data-ng-editor]');if(ed)openEditor();});
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette();}if(e.key==='Escape')closePalette();});
    setTimeout(checkHealth,300);
  }
  function openPalette(){const p=$('#ngPalette');if(!p)return;p.hidden=false;const i=$('#ngSearch');i.value='';renderResults();setTimeout(()=>i.focus(),20);}
  function closePalette(){const p=$('#ngPalette');if(p)p.hidden=true;}
  function renderResults(){
    const q=($('#ngSearch')?.value||'').trim().toLowerCase();
    const items=tabs.map(x=>({go:x[0],icon:x[1],label:x[2],hint:'Bölümü aç'})).filter(x=>!q||x.label.toLowerCase().includes(q));
    const actions=[['editor','✦','AI Editör Masası','Fikir → kaynak → AI taslak → SEO → canlı önizleme → yayın'],['autopilot','◎','Otonom Yayın Merkezi','Trend → rakip → medya → kural → sosyal dağıtım'],['news','+','Yeni haber oluştur','Haber yaz'],['media','+','Medya yükle','Medya kasasına git'],['durum','✓','Site durumunu kontrol et','Eksikleri gör'],['ops','⌁','SEO ve canlı önizleme','Araçları aç'],['control','◆','Entegrasyonları kontrol et','Control Center']].filter(x=>!q||x[2].toLowerCase().includes(q)||x[3].toLowerCase().includes(q));
    const box=$('#ngResults');if(!box)return;
    box.innerHTML=items.map(x=>'<button class="ng-result" type="button" data-go="'+x.go+'"><b>'+x.icon+'</b><span><strong>'+esc(x.label)+'</strong><small>'+esc(x.hint)+'</small></span><kbd>Enter</kbd></button>').concat(actions.map(x=>x[0]==='editor'?'<button class="ng-result" type="button" data-ng-editor="1"><b>'+x[1]+'</b><span><strong>'+esc(x[2])+'</strong><small>'+esc(x[3])+'</small></span><kbd>↗</kbd></button>':'<button class="ng-result" type="button" data-go="'+x[0]+'"><b>'+x[1]+'</b><span><strong>'+esc(x[2])+'</strong><small>'+esc(x[3])+'</small></span></button>')).join('')||'<div class="ng-empty">Sonuç bulunamadı.</div>';
    $('.ng-result',box)?.classList.add('active');
  }
  async function checkHealth(){
    const h=$('#ngHealth');if(!h)return;
    try{const r=await fetch('/api/health',{cache:'no-store'});const d=await r.json();const ok=r.ok&&d.ok===true&&d.cms===true;h.classList.toggle('ok',ok);h.classList.toggle('warn',!ok);$('span',h).textContent=ok?'Site canlı · CMS + medya hazır':'Kontrol gerekli';}catch(e){h.classList.add('warn');$('span',h).textContent='Sağlık kontrolü alınamadı';}
  }
  function markApp(){const app=$('#appSection');if(!app)return;const obs=new MutationObserver(()=>{if(app.style.display!=='none'){ensure();obs.disconnect();}});obs.observe(app,{attributes:true,attributeFilter:['style']});if(app.style.display!=='none')ensure();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',markApp);else markApp();
})();