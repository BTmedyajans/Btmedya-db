(()=>{
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
async function api(u,o){const r=await fetch(u,o);const d=await r.json().catch(()=>({ok:false,error:'JSON okunamadı'}));if(!r.ok||d.ok===false)throw Error(d.error||'İstek başarısız');return d}
function render(d){
 const ps=$('#providers');ps.innerHTML=(d.providers||[]).map(x=>'<div class="provider"><b>'+esc(x.network.toUpperCase())+'</b><span class="'+(x.appConfigured?'ok':'warn')+'">'+(x.appConfigured?'Uygulama hazır':'Worker secret bekliyor')+'</span></div>').join('');
 $('#accounts').innerHTML=(d.accounts||[]).map(x=>'<div class="row"><div><b>'+esc(x.handle||x.network)+'</b><div class="meta">'+esc(x.network)+' · '+esc(x.scope)+' · '+esc(x.client_id||'BTMEDYA')+'</div><div class="meta">Durum: '+esc(x.status)+' · Son kullanım: '+esc(x.last_used_at||'—')+(x.last_error?' · Hata: '+esc(x.last_error):'')+'</div></div><button class="badge" data-del="'+esc(x.id)+'">Sil</button></div>').join('')||'<div class="row"><span class="meta">Henüz bağlı native hesap yok.</span></div>';
 $('#deliveries').innerHTML=(d.deliveries||[]).slice(0,30).map(x=>'<div class="row"><div><b>'+esc(x.network)+'</b><div class="meta">'+esc(x.post_id)+' · '+esc(x.updated_at||'')+'</div></div><span class="badge '+(x.status==='published'?'ok':'bad')+'">'+esc(x.status)+(x.error?' · '+esc(x.error):'')+'</span></div>').join('')||'<div class="row"><span class="meta">Teslimat kaydı yok.</span></div>';
}
async function load(){try{render(await api('/api/admin/native-social/status'))}catch(e){$('#accounts').innerHTML='<div class="row"><b>'+esc(e.message)+'</b></div>'}}
document.addEventListener('click',async e=>{
 const c=e.target.closest('[data-network]');if(c){c.disabled=true;try{const d=await api('/api/admin/native-social/connect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({network:c.dataset.network,client_id:'',return_to:'/admin/native-social/'})});location.href=d.authorize_url}catch(err){alert(err.message)}finally{c.disabled=false}}
 const del=e.target.closest('[data-del]');if(del&&confirm('Bu hesabın bağlantısını kaldır?')){await api('/api/admin/native-social/account?id='+encodeURIComponent(del.dataset.del),{method:'DELETE'});load()}
});
$('#refresh').onclick=load;$('#run').onclick=async()=>{const b=$('#run');b.disabled=true;b.textContent='Çalışıyor…';try{const d=await api('/api/admin/native-social/run',{method:'POST'});alert('Kuyruk: '+d.result.processed+' işlendi, '+d.result.published+' yayımlandı, '+d.result.failed+' hata.')}catch(e){alert(e.message)}finally{b.disabled=false;b.textContent='Kuyruğu şimdi çalıştır';load()}};
load();setInterval(load,60000);
})();