
(function(){
  const A=window;
  function q(s){return document.querySelector(s)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  async function get(url,opt){const r=await fetch(url,opt);if(r.status===401){if(A.showLogin)A.showLogin();throw Error('auth')}return r.json()}
  function ensure(){
    if(q('#nrTab')) return;
    const bar=q('#tabBar'); if(!bar) return;
    const b=document.createElement('button'); b.className='tab active'; b.id='nrTab'; b.dataset.tab='newsroom'; b.innerHTML='Haber Merkezi';
    bar.prepend(b);
    const c=document.createElement('div'); c.className='tab-content'; c.id='tab-newsroom';
    c.innerHTML='<div class="nr-shell"><div class="nr-top"><div><div class="nr-kicker">BTMEDYA · NATIONAL NEWSROOM</div><h1>Haber Merkezi</h1><div class="nr-live"><i></i> Operasyon paneli · canlı veri</div></div><div class="nr-actions"><button class="nr-btn primary" id="nrNew">+ Yeni Haber</button><button class="nr-btn" id="nrMedia">Medya Eşleştir</button><button class="nr-btn" id="nrRefresh">Yenile</button></div></div><div class="nr-grid" id="nrStats"></div><div class="nr-main"><section class="nr-panel"><h3>Yayın operasyonu</h3><div class="nr-list" id="nrQueue"></div></section><section class="nr-panel"><h3>SEO / AEO yayın kontrolü</h3><div id="nrSeo"></div></section></div><div class="nr-modules"><div class="nr-module" data-go="news"><b>📰 Haber Editörü</b><span>Başlık, spot, kaynak, tarih, medya ve yayın durumu.</span></div><div class="nr-module" data-go="media"><b>🖼️ Medya Kasası</b><span>Gerçek R2 fotoğraf ve videolarını haberle eşleştir.</span></div><div class="nr-module" data-go="durum"><b>🗂️ Arşiv / Eksikler</b><span>Eksik kapakları, eski içerikleri ve yayın yuvalarını gör.</span></div><div class="nr-module" data-go="social"><b>📡 Dağıtım</b><span>Sosyal içerik kuyruğu ve bağlantı hazırlığı.</span></div></div></div>';
    q('#appSection').prepend(c);
    q('#nrTab').onclick=()=>showTab('newsroom');
    q('#nrNew').onclick=()=>showTab('news');
    q('#nrArchive').onclick=()=>{showTab('durum');setTimeout(()=>{q('#q')&&(q('#q').value='');q('#filter')&&(q('#filter').value='');loadMedia&&loadMedia()},0)};
    q('#nrMedia').onclick=()=>openMediaPicker();
    q('#nrRefresh').onclick=loadRoom;
    document.querySelectorAll('.nr-module').forEach(x=>x.onclick=()=>showTab(x.dataset.go));
  }
  async function loadRoom(){
    ensure();
    const stats=q('#nrStats'),queue=q('#nrQueue'),seo=q('#nrSeo');
    if(!stats)return;
    try{
      const [nr,md]=await Promise.all([get('/api/admin/news?limit=200'),get('/api/media')]);
      const items=(nr.items||[]), media=(md.items||md.results||[]);
      const pub=items.filter(x=>x.status==='published'), drafts=items.filter(x=>x.status!=='published');
      const now=new Date(); const recent=pub.filter(x=>new Date(x.published_at||x.created_at)>new Date(now-86400000));
      const missing=pub.filter(x=>!x.cover_url);
      const archive=pub.filter(x=>new Date(x.published_at||0).getFullYear()<new Date().getFullYear()).length;
      stats.innerHTML='<div class="nr-stat"><small>YAYINDA</small><strong>'+pub.length+'</strong><span>Yayındaki haber</span></div><div class="nr-stat"><small>TASLAK</small><strong>'+drafts.length+'</strong><span>Editör kuyruğu</span></div><div class="nr-stat"><small>24 SAAT</small><strong>'+recent.length+'</strong><span>Son 24 saatte yayın</span></div><div class="nr-stat"><small>MEDYA</small><strong>'+media.length+'</strong><span>R2 medya kaydı</span></div><div class="nr-stat"><small>KAPAK EKSİK</small><strong>'+missing.length+'</strong><span>Gerçek görsel bekliyor</span></div><div class="nr-stat"><small>ARŞİV</small><strong>'+archive+'</strong><span>Geçmiş içerik</span></div>';
      const sorted=[...items].sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at)).slice(0,8);
      queue.innerHTML=sorted.length?sorted.map(x=>'<div class="nr-item"><i class="nr-dot '+(x.status==='published'?'green':'amber')+'"></i><div><b>'+esc(x.title)+'</b><span>'+esc(x.category||'Haber')+' · '+esc(x.status==='published'?'YAYINDA':'TASLAK')+' · '+(x.published_at?new Date(x.published_at).toLocaleString('tr-TR'):'tarih yok')+'</span></div></div>').join(''):'<div class="nr-item"><div><b>Henüz haber verisi yok</b><span>Yeni haber editöründen başlayabilirsiniz.</span></div></div>';
      const score=Math.max(0,100-(missing.length?15:0)-(drafts.length?10:0));
      seo.innerHTML='<div class="nr-score">'+score+'/100 <span style="font-size:11px;color:#7d8999">operasyon skoru</span></div><div class="nr-progress"><i style="width:'+score+'%"></i></div><div class="nr-list" style="margin-top:10px"><div class="nr-item"><i class="nr-dot green"></i><div><b>NewsArticle şablonu</b><span>Dinamik haber sayfasında mevcut</span></div></div><div class="nr-item"><i class="nr-dot '+(missing.length?'amber':'green')+'"></i><div><b>Gerçek kapak medyası</b><span>'+missing.length+' yayın kapaksız</span></div></div><div class="nr-item"><i class="nr-dot green"></i><div><b>Arşiv ayrımı</b><span>Geçmiş içerik ayrı gösterilecek</span></div></div></div>';
    }catch(e){stats.innerHTML='<div class="nr-stat"><small>DURUM</small><strong>!</strong><span>Veri okunamadı. Giriş oturumunu kontrol edin.</span></div>'}
  }
  async function openMediaPicker(){
    ensure();
    let modal=q('#nrMediaModal');
    if(!modal){modal=document.createElement('div');modal.id='nrMediaModal';modal.className='nr-modal';modal.innerHTML='<div class="nr-modal-box"><div class="nr-top" style="padding:0 0 14px"><div><div class="nr-kicker">MEDIA MATCH</div><h1 style="font-size:20px">Gerçek medya seç</h1></div><button class="nr-btn" id="nrClose">Kapat</button></div><div class="nr-media-grid" id="nrMediaGrid"></div></div>';document.body.appendChild(modal);q('#nrClose').onclick=()=>modal.classList.remove('open')}
    modal.classList.add('open');
    const grid=q('#nrMediaGrid'); grid.innerHTML='<div style="color:#8895a5">Medya kasası okunuyor…</div>';
    try{
      const d=await get('/api/media'); const arr=d.items||d.results||[];
      grid.innerHTML=arr.slice(0,80).map(x=>{const url=x.published&&x.key?'/pub/'+encodeURIComponent(x.key):'';const visual=String(x.mime||'').startsWith('video/')?(url?'<video src="'+esc(url)+'" muted preload="metadata"></video>':'<div style="aspect-ratio:16/10"></div>'):(url?'<img src="'+esc(url)+'" alt="">':'<div style="aspect-ratio:16/10"></div>');return '<div class="nr-media" data-key="'+esc(x.key||'')+'" data-url="'+esc(url)+'">'+visual+'<div><strong>'+esc(x.title||x.original_name||x.key)+'</strong><small>'+esc(x.category||'arsiv')+' · '+esc(x.mime||'')+'</small></div></div>'}).join('')||'<div style="color:#8895a5">Henüz medya kaydı yok.</div>';
      grid.querySelectorAll('.nr-media').forEach(x=>x.onclick=()=>{const u=x.dataset.url;if(u&&q('#nCoverUrl')){q('#nCoverUrl').value=location.origin+u;q('#coverPreview').src=u;q('#coverPreview').style.display='block';showTab('news');modal.classList.remove('open')}})
    }catch(e){grid.innerHTML='<div style="color:#ff8f88">Medya okunamadı.</div>'}
  }
  function patchTabs(){
    const old=window.showTab;
    if(!old||old.__nrWrapped)return;
    const wrapped=function(name){old(name);if(name==='newsroom')loadRoom()};
    wrapped.__nrWrapped=true;window.showTab=wrapped;
  }
  function boot(){ensure();patchTabs();setTimeout(loadRoom,250)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
