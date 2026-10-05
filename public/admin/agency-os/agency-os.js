const $=s=>document.querySelector(s);
let state={};
function num(v){return Number(v||0)}
function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
async function api(u,o){const r=await fetch(u,o);const d=await r.json().catch(()=>({ok:false,error:'JSON okunamadı'}));if(!r.ok||d.ok===false)throw Error(d.error||'İstek başarısız');return d}
function render(){
 const s=state.latest?.summary||state.heartbeat?.summary||{};
 $('#mClients').textContent=num(s.clients?.active);$('#mClientHint').textContent=num(s.clients?.total)+' toplam çalışma alanı';
 $('#mApproval').textContent=num(s.content?.pendingApproval);
 $('#mSocial').textContent=num(s.social?.queued);$('#mSocialHint').textContent=num(s.social?.overdue)+' geciken';
 $('#mSales').textContent=num(s.sales?.open);$('#mSalesHint').textContent=num(s.sales?.due)+' takip zamanı geldi';
 $('#mNews').textContent=num(s.ownedNews?.published7d);$('#mRefs').textContent=num(s.references?.public);
 const when=state.latest?.finished_at||state.heartbeat?.finished_at||state.heartbeat?.summary?.heartbeat;
 $('#heartbeat').textContent=when?'Son denetim: '+new Date(when).toLocaleString('tr-TR')+' · 15 dakikalık otomatik döngü aktif':'Henüz denetim kaydı yok';
 const alerts=state.alerts||[];$('#alertCount').textContent=alerts.length;
 $('#alerts').innerHTML=alerts.length?alerts.map(a=>'<div class="alert"><i class="dot '+esc(a.severity)+'"></i><div><strong>'+esc(a.title)+'</strong><div class="meta">'+esc(a.client_name||'BTMEDYA')+' · '+esc(a.detail)+'</div></div><span class="badge">'+esc(a.severity)+'</span></div>').join(''):'<div class="rec"><b>Temiz kuyruk ✅</b><span class="meta">Açık süpervizör alarmı bulunmuyor.</span></div>';
 const rec=s.recommendations||[];
 $('#recommendations').innerHTML=rec.length?rec.map(x=>'<div class="rec"><b>→ '+esc(x)+'</b></div>').join(''):'<div class="rec"><b>→ Sistem izliyor</b><span class="meta">Yeni bir aksiyon gerektiğinde burada görünecek.</span></div>';
 const clients=s.clientsSnapshot||[];renderClients(clients);
}
function renderClients(items){
 const q=($('#search').value||'').trim().toLocaleLowerCase('tr-TR');
 const rows=items.filter(c=>!q||String(c.name||'').toLocaleLowerCase('tr-TR').includes(q)||String(c.sector||'').toLocaleLowerCase('tr-TR').includes(q));
 $('#clients').innerHTML=rows.map(c=>'<article class="client-row"><div class="topline"><b>'+esc(c.name)+'</b><span class="badge">'+esc(c.status)+'</span></div><div class="meta">'+esc(c.sector||'Sektör belirtilmedi')+'</div><div class="bars"><span class="bar">'+num(c.content_count)+' içerik</span><span class="bar '+(num(c.draft_count)?'warn':'ok')+'">'+num(c.draft_count)+' taslak</span><span class="bar">'+(c.last_content_at?'Son: '+new Date(c.last_content_at).toLocaleDateString('tr-TR'):'Henüz içerik yok')+'</span></div></article>').join('')||'<div class="rec"><b>Firma bulunamadı.</b></div>';
}
async function load(){try{state=await api('/api/admin/agency-supervisor');render();await loadSystemSnapshot();await loadSocialSnapshot()}catch(e){$('#heartbeat').textContent=e.message}}
async function loadSystemSnapshot(){
 const el=$('#systemSnapshot'); if(!el)return;
 try{
  const d=await api('/api/admin/control-center');
  const m=d.metricool||{}; const s=d.storage||{}; const a=d.automation||{}; const site=d.site||{};
  el.innerHTML='<div class="rule"><b>CANONICAL</b><span>'+esc(site.url||'https://btmedya.com.tr')+' · '+esc(site.worker||'btmedya-db')+'</span></div>'+
    '<div class="rule"><b>DATA</b><span>D1 '+(s.d1?'✓':'✗')+' · R2 '+(s.r2?'✓':'✗')+' · KV '+(s.kv?'✓':'✗')+'</span></div>'+
    '<div class="rule"><b>METRICOOL</b><span>'+ (m.yapilandirildi?'✓ Worker bağlantısı hazır':'⚠ Secret/bağlantı bekliyor') +'</span></div>'+
    '<div class="rule"><b>OTOMASYON</b><span>'+esc(a.cron||'*/5 * * * *')+' · '+esc(a.lastHeartbeat||'bekleniyor')+'</span></div>';
 }catch(e){el.innerHTML='<div class="rec"><b>Sistem sağlık verisi okunamadı.</b><span class="meta">'+esc(e.message)+'</span></div>'}
}

async function loadSocialSnapshot(){
 const el=$('#systemSnapshot'); if(!el)return;
 try{
  const d=await api('/api/admin/social/providers');
  const rows=Object.values(d.providers||{}).map(p=>'<div class="rule"><b>'+esc(p.label)+'</b><span>'+esc(p.configured?'YAYIN AKTİF':p.connected?'BAĞLANTI VAR / SECRET BEKLENİYOR':'BAĞLI DEĞİL')+'</span></div>').join('');
  if(rows) el.innerHTML+=rows;
 }catch(_e){}
}
async function run(){const b=$('#run');b.disabled=true;b.textContent='Denetleniyor…';try{state=await api('/api/admin/agency-supervisor/run',{method:'POST'});render()}catch(e){alert(e.message)}finally{b.disabled=false;b.textContent='Şimdi denetle'}}
async function loadCategoryFeed(){
 const box=$('#categoryFeed');if(!box)return;
 try{
  const d=await api('/api/public/category-feed');
  const cats=d.categories||[];
  box.innerHTML=cats.length?cats.map(x=>{const lead=x.items?.[0];return '<article class="category-card"><div class="category-top"><b>'+esc(x.category)+'</b><span class="badge">'+num(x.count)+' içerik</span></div><strong>'+esc(lead?.title||'Akışta içerik yok')+'</strong><small class="meta">'+esc(d.source||'live')+' · '+esc(lead?.published_at?new Date(lead.published_at).toLocaleDateString('tr-TR'):'tarih yok')+'</small><a href="'+esc(lead?.url||'#')+'" target="_blank" rel="noopener">Public haberi aç ↗</a></article>'}).join(''):'<div class="rec"><b>Yayınlanmış kategori verisi bulunamadı.</b></div>';
 }catch(e){box.innerHTML='<div class="rec"><b>Kategori akışı okunamadı.</b><span class="meta">'+esc(e.message)+'</span></div>'}
}
$('#run').addEventListener('click',run);$('#refresh').addEventListener('click',()=>{load();loadCategoryFeed()});$('#categoryRefresh').addEventListener('click',loadCategoryFeed);$('#search').addEventListener('input',()=>renderClients(state.latest?.summary?.clientsSnapshot||state.heartbeat?.summary?.clientsSnapshot||[]));
load();loadCategoryFeed();setInterval(load,60000);setInterval(loadCategoryFeed,60000);

/* BTMEDYA Agency OS v2: task-first command bar */
(()=>{
  const root=document.querySelector('.shell'),hero=root?.querySelector('.hero');
  if(!root||!hero||root.querySelector('.admin-commandbar'))return;
  const bar=document.createElement('section');
  bar.className='admin-commandbar';
  bar.setAttribute('aria-label','Öncelikli yönetim işlemleri');
  bar.innerHTML='<a href="/admin/editor/"><small>İÇERİK</small><b>Haber / AI Editör ↗</b></a><a href="/admin/app.html"><small>MEDYA</small><b>Fotoğraf / Video Yükle ↗</b></a><a href="/social-studio/"><small>SOSYAL</small><b>Instagram · Facebook · YouTube ↗</b></a><a href="/admin/client-hub/"><small>MÜŞTERİ</small><b>Brief / Teklif / İşler ↗</b></a>';
  hero.insertAdjacentElement('afterend',bar);
})();

async function loadCore(){
 const grid=$('#btCoreGrid'),status=$('#btCoreStatus'),boot=$('#btCoreBootstrap'); if(!grid)return;
 try{
   const d=await api('/api/admin/core');
   status.textContent='AKTİF';
   const x=d.counts||{};
   grid.innerHTML='<div class="rule"><b>D1</b><span>Bağlı · '+num(x.content)+' içerik</span></div>'+
     '<div class="rule"><b>R2</b><span>'+(d.storage?.r2?'Bağlı':'Eksik')+'</span></div>'+
     '<div class="rule"><b>KV</b><span>'+(d.storage?.kv?'Bağlı':'Eksik')+'</span></div>'+
     '<div class="rule"><b>Yayın kuyruğu</b><span>'+num(x.queued)+' bekleyen · '+num(x.events24h)+' olay / 24s</span></div>'+
     '<div class="rule"><b>Çalışma alanı</b><span>'+num(x.workspaces)+' aktif</span></div>';
 }catch(e){status.textContent='BEKLİYOR';grid.innerHTML='<div class="rec"><b>Core ilk kullanım için hazırlanıyor.</b><span class="meta">'+esc(e.message)+'</span></div>'}
}
async function bootstrapCore(){
 const b=$('#btCoreBootstrap');if(!b)return;b.disabled=true;b.textContent='Başlatılıyor…';
 try{await api('/api/admin/core/bootstrap',{method:'POST'});await loadCore()}catch(e){alert(e.message)}finally{b.disabled=false;b.textContent="BTMEDYA Core'u başlat"}
}
const coreBoot=$('#btCoreBootstrap');if(coreBoot)coreBoot.addEventListener('click',bootstrapCore);
loadCore();setInterval(loadCore,60000);
