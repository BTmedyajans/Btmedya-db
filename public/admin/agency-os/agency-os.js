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
async function load(){try{state=await api('/api/admin/agency-supervisor');render()}catch(e){$('#heartbeat').textContent=e.message}}
async function run(){const b=$('#run');b.disabled=true;b.textContent='Denetleniyor…';try{state=await api('/api/admin/agency-supervisor/run',{method:'POST'});render()}catch(e){alert(e.message)}finally{b.disabled=false;b.textContent='Şimdi denetle'}}
$('#run').addEventListener('click',run);$('#refresh').addEventListener('click',load);$('#search').addEventListener('input',()=>renderClients(state.latest?.summary?.clientsSnapshot||state.heartbeat?.summary?.clientsSnapshot||[]));
load();setInterval(load,60000);