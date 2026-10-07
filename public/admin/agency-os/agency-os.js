const $=s=>document.querySelector(s);
let state={};
function num(v){return Number(v||0)}
function ageMinutes(when){if(!when)return null;const n=Date.parse(when);return Number.isFinite(n)?Math.max(0,Math.round((Date.now()-n)/60000)):null}
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
 const age=ageMinutes(when);
 $('#heartbeat').textContent=when?(age!==null&&age>20?'⚠ Son denetim '+age+' dk önce · otomasyon gecikmiş':'✓ Son denetim: '+new Date(when).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})+' · 15 dakikalık otomatik döngü aktif'):'Henüz denetim kaydı yok';
 $('#heartbeat').classList.toggle('warning',age!==null&&age>20);
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
async function load(){try{state=await api('/api/admin/agency-supervisor');render();await loadSystemSnapshot();await loadAutomationSnapshot();await loadSocialSnapshot()}catch(e){$('#heartbeat').textContent=e.message}}
async function loadSystemSnapshot(){
 const el=$('#systemSnapshot'); if(!el)return;
 try{
  const d=await api('/api/admin/control-center');
  const m=d.metricool||{}; const s=d.storage||{}; const a=d.automation||{}; const site=d.site||{};
  el.innerHTML='<div class="rule"><b>CANONICAL</b><span>'+esc(site.url||'https://btmedya.com.tr')+' · '+esc(site.worker||'btmedya-db')+'</span></div>'+
    '<div class="rule"><b>DATA</b><span>D1 '+(s.d1?'✓':'✗')+' · R2 '+(s.r2?'✓':'✗')+' · KV '+(s.kv?'✓':'✗')+'</span></div>'+
    '<div class="rule"><b>METRICOOL</b><span>'+ (m.yapilandirildi?'✓ Worker bağlantısı hazır':'⚠ Secret/bağlantı bekliyor') +'</span></div>'+
    '<div class="rule"><b>OTOMASYON</b><span>'+esc(a.cron||'*/5 * * * *')+' · '+(ageMinutes(a.heartbeatAt)!==null?ageMinutes(a.heartbeatAt)+' dk önce':'heartbeat bekleniyor')+(Number(a.overdue||0)?' · '+Number(a.overdue)+' gecikmiş':' · kuyruk temiz')+'</span></div>';
 }catch(e){el.innerHTML='<div class="rec"><b>Sistem sağlık verisi okunamadı.</b><span class="meta">'+esc(e.message)+'</span></div>'}
}

async function loadAutomationSnapshot(){
 const el=$('#automationCommand');if(!el)return;
 try{
  const [m,a]=await Promise.all([api('/api/admin/sabah-masasi'),api('/api/admin/autopilot')]);
  const x=m.ayarlar||{},r=m.rapor||{},p=a.policy||{};
  const status=x.etkin?'AKTİF':'KAPALI',mode=x.otomatikYayin?'GÜVENLİ OTOMATİK YAYIN':'TASLAK / ONAY';
  el.innerHTML='<div class="rule"><b>GÜNLÜK PLAN</b><span class="'+(x.etkin?'ok':'warn')+'">08:00 Europe/Istanbul · '+status+' · '+mode+'</span></div>'+
   '<div class="rule"><b>SAATLİK RADAR</b><span>'+(p.enabled?'aktif':'kapalı')+' · Balıkesir + trend kaynakları · max '+num(p.maxItemsPerRun||2)+' haber/tur</span></div>'+
   '<div class="rule"><b>SON RAPOR</b><span>'+num(r.yayinlanan)+' yayın · '+num(r.taslak)+' taslak · '+num((r.hatalar||[]).length)+' hata</span></div>'+
   '<div class="rule"><b>GÜVENLİK</b><span>hassas · tanıtım · tekrar · doğrulama hatası otomatik yayın dışı</span></div>';
 }catch(e){el.innerHTML='<div class="rec"><b>Günlük otomasyon durumu okunamadı.</b><span class="meta">'+esc(e.message)+'</span></div>'}
}
async function loadSocialSnapshot(){
 const el=$('#socialCommand'); if(!el)return;
 try{
  const [p,q]=await Promise.all([api('/api/admin/social/providers'),api('/api/admin/social/queue-summary')]);
  const rows=Object.values(p.providers||{}).map(x=>'<div class="rule"><b>'+esc(x.label)+'</b><span>'+esc(x.configured?'YAYIN AKTİF':x.connected?'BAĞLANTI VAR / SECRET BEKLENİYOR':'BAĞLI DEĞİL')+'</span></div>').join('');
  const c=q.counts||{}, d=q.delivery||{}, settings=q.settings||{};
  const queue='<div class="rule"><b>KUYRUK</b><span>'+num(c.onayda)+' onayda · '+num(c.planlandi)+' planlı · '+num(c.yayinlandi)+' yayımlandı · '+num(c.geciken)+' geciken</span></div>';
  const delivery='<div class="rule"><b>TESLİMAT</b><span>'+num(d.failed||0)+' hata'+(d.lastFailure?.hata?' · '+esc(String(d.lastFailure.hata).slice(0,140)):'')+'</span></div>';
  const config='<div class="rule"><b>AYAR</b><span>'+(settings.otomatikPlanla?'Otomatik planlama açık':'Manuel/onay akışı')+' · '+esc((settings.aglar||[]).join(', ')||'ağ yok')+'</span></div>';
  el.innerHTML='<div class="stack">'+rows+queue+delivery+config+'</div>';
 }catch(e){
  el.innerHTML='<div class="rec"><b>Sosyal/Metricool durumu okunamadı.</b><span class="meta">'+esc(e.message)+'</span></div>';
 }
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

async function loadPlatformReadiness(){
 const el=$('#platformReadiness');if(!el)return;
 const rows=[
  ['Facebook','Meta Direct','meta'],
  ['Instagram','Meta Direct','meta'],
  ['TikTok','Metricool / Direct API','metricool'],
  ['YouTube','Metricool / YouTube API','metricool'],
  ['X','X API','cost'],
  ['WhatsApp','Meta Cloud API','cost']
 ];
 try{
  const [p,h]=await Promise.all([
    api('/api/admin/social/providers'),
    api('/api/social/direct/health').catch(()=>({configured:false}))
  ]);
  const providers=p.providers||{};
  const metaReady=!!h.configured;
  const status=rows.map(([name,type,key])=>{
    let label='API / OAUTH GEREKİYOR',cls='warn';
    if(key==='meta' && metaReady){label='META MOTORU HAZIR';cls='ok'}
    if(key==='metricool' && providers[key.toLowerCase()]?.configured){label='BAĞLI / YAYIN AKTİF';cls='ok'}
    if(key==='cost'){label='PLATFORM KULLANIMI / MALİYET';cls='warn'}
    if(name==='TikTok' && providers.tiktok?.configured){label='BAĞLI / YAYIN AKTİF';cls='ok'}
    if(name==='YouTube' && providers.youtube?.configured){label='BAĞLI / YAYIN AKTİF';cls='ok'}
    const note= name==='Facebook'?'Page gerekir':name==='Instagram'?'Professional hesap gerekir':name==='TikTok'?'Content Posting API / onay gerekir':name==='YouTube'?'OAuth + upload yetkisi gerekir':name==='X'?'API kullanımı tüketime bağlı olabilir':'WABA + Meta Business gerekir';
    return '<div class="rule"><b>'+esc(name)+' · '+esc(type)+'</b><span class="'+cls+'">'+label+' · '+note+'</span></div>';
  }).join('');
  el.innerHTML=status;
 }catch(e){el.innerHTML='<div class="rec"><b>Platform matrisi okunamadı.</b><span class="meta">'+esc(e.message)+'</span></div>'}
}
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
loadCore();loadPlatformReadiness();setInterval(loadCore,60000);setInterval(loadPlatformReadiness,60000);


async function adminLogout(){const b=$('#adminLogout'),s=$('#adminSessionStatus');if(!b)return;b.disabled=true;b.textContent='Çıkılıyor…';try{await fetch('/api/logout',{method:'POST',credentials:'same-origin'});}catch{}if(s)s.textContent='OTURUM KAPATILDI';window.location.href='/admin/';}
function bindAdminSession(){const b=$('#adminLogout');if(b)b.addEventListener('click',adminLogout);}bindAdminSession();
