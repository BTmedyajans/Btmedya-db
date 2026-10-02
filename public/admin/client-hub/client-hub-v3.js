/* BTMEDYA Müşteri Merkezi v3
   Çalışma alanını hizmet + sosyal radar + marka stratejisi etrafında tek akışa toplar. */
(()=>{
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const services=[
    ['wedding','DÜĞÜN KLİP'],['promo','TANITIM ÇEKİMİ'],['news','HABER / RÖPORTAJ'],['social','SOSYAL MEDYA'],
    ['black-room','SİYAH ODA / PODCAST'],['documentary','BELGESEL'],['short-film','KISA FİLM'],['brand-film','MARKA FİLMİ'],
    ['ads','REKLAM / KAMPANYA'],['ai','AI İÇERİK']
  ];
  let selectedId='';
  let selectedServices=[];
  let strategy={approval_required:true,autopublish_enabled:false};

  async function api(url,opts){
    const r=await fetch(url,opts);
    const d=await r.json().catch(()=>({ok:false,error:'JSON okunamadı'}));
    if(r.status===401){location='/admin/';return null}
    if(!r.ok||d.ok===false)throw Error(d.error||'İşlem başarısız');
    return d;
  }
  function clientIdFromButton(btn){
    const raw=btn?.getAttribute('onclick')||'';
    const m=raw.match(/selectClient\(['"]([^'"]+)['"]\)/);
    return m?m[1]:'';
  }
  function renderServices(){
    const root=$('#servicePicker'); if(!root)return;
    root.innerHTML=services.map(([k,l])=>'<button type="button" class="service-choice '+(selectedServices.includes(k)?'on':'')+'" data-service="'+k+'">'+(selectedServices.includes(k)?'✓ ':'')+l+'</button>').join('');
  }
  function activeSwitches(){
    return [...document.querySelectorAll('#switches .switch[data-key]')].filter(x=>x.classList.contains('on')).map(x=>x.dataset.key);
  }
  async function saveWorkspace(){
    if(!selectedId)return;
    await api('/api/client-hub/workspace/'+selectedId,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({
      name:$('#fName').value,sector:$('#fSector').value,website_url:$('#fWeb').value,logo_url:$('#fLogo').value,brand_voice:$('#fVoice').value,
      services:selectedServices,automation_enabled:activeSwitches().includes('automation_enabled'),social_management_enabled:activeSwitches().includes('social_management_enabled'),
      web_management_enabled:activeSwitches().includes('web_management_enabled'),ads_management_enabled:activeSwitches().includes('ads_management_enabled'),reference_permission:activeSwitches().includes('reference_permission')
    })});
    alert('Müşteri çalışma alanı güncellendi.');
  }
  function renderAccounts(items){
    const root=$('#socialAccounts');if(!root)return;
    root.innerHTML=items.map(x=>'<div class="social-account-row"><b>'+esc(String(x.network||'').toUpperCase())+'</b><div><strong>'+esc(x.handle||'profil')+'</strong><small>'+esc(x.profile_url||'')+(x.metricool_brand_id?' · Metricool #'+esc(x.metricool_brand_id):' · Public radar')+'</small></div><button type="button" class="btn" data-social-delete="'+esc(x.id)+'">Sil</button></div>').join('')||'<div class="empty">Müşterinin sosyal hesapları henüz eklenmedi.</div>';
  }
  async function loadAccounts(){
    if(!selectedId)return;
    const d=await api('/api/client-hub/workspace/'+selectedId+'/social');
    renderAccounts(d.items||[]);
  }
  async function addAccount(){
    if(!selectedId)return;
    const competitors=$('#sCompetitors').value.split(',').map(x=>x.trim()).filter(Boolean);
    const queries=$('#sQueries').value.split(',').map(x=>x.trim()).filter(Boolean);
    await api('/api/client-hub/workspace/'+selectedId+'/social',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      network:$('#sNetwork').value,handle:$('#sHandle').value,profile_url:$('#sUrl').value,metricool_brand_id:$('#sBrand').value,competitors,tracked_queries:queries
    })});
    $('#sHandle').value='';$('#sUrl').value='';$('#sBrand').value='';
    await loadAccounts();await loadRadar();
  }
  async function removeAccount(id){
    await api('/api/client-hub/workspace/'+selectedId+'/social/'+id,{method:'DELETE'});
    await loadAccounts();await loadRadar();
  }
  async function loadStrategy(){
    if(!selectedId)return;
    const d=await api('/api/client-hub/workspace/'+selectedId+'/strategy'); const x=d.item||{};
    strategy={approval_required:x.approval_required!==false,autopublish_enabled:x.autopublish_enabled===true};
    $('#sPositioning').value=x.positioning||'';$('#sPillars').value=(x.content_pillars||[]).join(', ');
    $('#sVisual').value=JSON.stringify(x.visual_rules||{},null,2);$('#sPublish').value=JSON.stringify(x.publishing_rules||{},null,2);
    syncStrategyButtons();
  }
  function syncStrategyButtons(){
    const a=$('#sApproval'),b=$('#sAutopublish');
    if(a){a.classList.toggle('on',strategy.approval_required);a.textContent=(strategy.approval_required?'✓ ':'○ ')+'Müşteri onayı zorunlu'}
    if(b){b.classList.toggle('on',strategy.autopublish_enabled);b.textContent=(strategy.autopublish_enabled?'✓ ':'○ ')+'Onaylı içerikte otomatik yayın'}
  }
  async function saveStrategy(){
    if(!selectedId)return;
    const obj=v=>{try{return JSON.parse(v||'{}')}catch{return {notes:String(v||'')}}};
    await api('/api/client-hub/workspace/'+selectedId+'/strategy',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({
      positioning:$('#sPositioning').value,content_pillars:$('#sPillars').value.split(',').map(x=>x.trim()).filter(Boolean),
      visual_rules:obj($('#sVisual').value),publishing_rules:obj($('#sPublish').value),
      approval_required:strategy.approval_required,autopublish_enabled:strategy.autopublish_enabled
    })});
    await loadRadar();alert('Marka stratejisi kaydedildi.');
  }
  async function loadRadar(){
    if(!selectedId)return;
    const box=$('#radarBox');if(!box)return;box.textContent='Radar okunuyor…';
    try{
      const d=await api('/api/client-hub/workspace/'+selectedId+'/radar');const x=d.radar||{};
      box.innerHTML='<div><b>'+esc(x.mode||'Public radar')+'</b> · '+esc((x.connectedNetworks||[]).length)+' bağlı ağ · '+esc((x.publicNetworks||[]).length)+' public ağ</div><div class="mut" style="margin-top:6px">Rakipler: '+esc((x.competitors||[]).join(' · ')||'tanımlanmadı')+'</div><div class="mut" style="margin-top:5px">Takip: '+esc((x.trackedQueries||[]).join(' · ')||'tanımlanmadı')+'</div><div class="radar-ok" style="margin-top:8px">'+esc((x.recommendations||[]).join(' · '))+'</div>';
    }catch(e){box.textContent=e.message}
  }
  function injectContentTypes(){
    const select=$('#cType');if(!select)return;
    [['wedding','Düğün klip'],['black-room','Siyah Oda / podcast'],['documentary','Belgesel'],['short-film','Kısa film'],['promo','Tanıtım çekimi']].forEach(([v,t])=>{
      if(![...select.options].some(o=>o.value===v)){const o=document.createElement('option');o.value=v;o.textContent=t;select.appendChild(o)}
    });
  }
  function openNewClient(){
    let modal=$('#customerModal');
    if(!modal){
      modal=document.createElement('div');modal.id='customerModal';modal.className='customer-modal';modal.hidden=true;
      modal.innerHTML='<div class="customer-modal-card"><div class="eyebrow">BTMEDYA / YENİ MÜŞTERİ</div><h2>Çalışma alanı oluştur</h2><p class="mut">Firma bilgisi, hizmet kapsamı ve sosyal radar daha sonra tek merkezden yönetilecek.</p><div class="modal-grid"><div class="field"><label>FİRMA</label><input id="cmName" placeholder="Firma adı"></div><div class="field"><label>SEKTÖR</label><input id="cmSector" placeholder="Düğün, restoran, hukuk, turizm..."></div><div class="field full"><label>WEB SİTESİ</label><input id="cmWeb" placeholder="https://..."></div></div><div class="customer-modal-actions"><button id="cmCancel" class="btn">Vazgeç</button><button id="cmCreate" class="btn primary">Müşteriyi oluştur</button></div></div>';
      document.body.appendChild(modal);
      $('#cmCancel').addEventListener('click',()=>modal.hidden=true);
      $('#cmCreate').addEventListener('click',async()=>{
        const name=$('#cmName').value.trim();if(!name)return;
        await api('/api/client-hub/workspaces',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,sector:$('#cmSector').value,website_url:$('#cmWeb').value,services:['social','promo'],automation_enabled:true,social_management_enabled:true})});
        modal.hidden=true;location.reload();
      });
      modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
    }
    modal.hidden=false;$('#cmName').focus();
  }

  async function syncSelection(id){
    if(!id)return;selectedId=id;
    try{
      const d=await api('/api/client-hub/workspaces');const c=(d.items||[]).find(x=>x.id===id);
      selectedServices=Array.isArray(c?.services)?c.services:[];
      renderServices();
      await Promise.all([loadAccounts(),loadStrategy(),loadRadar()]);
      injectContentTypes();
    }catch{}
  }

  const originalSelect=window.selectClient;
  window.selectClient=async function(id){
    selectedId=id;
    const r=originalSelect?await originalSelect(id):null;
    setTimeout(()=>syncSelection(id),100);
    return r;
  };
  window.saveClient=saveWorkspace;
  window.newClient=openNewClient;
  window.addSocialAccount=addAccount;
  window.removeSocialAccount=removeAccount;
  window.saveStrategy=saveStrategy;
  window.loadSocialAccounts=loadAccounts;
  window.loadRadar=loadRadar;
  window.toggleStrategyFlag=(key)=>{strategy[key]=!strategy[key];syncStrategyButtons()};

  document.addEventListener('click',e=>{
    const service=e.target.closest('[data-service]');
    if(service){selectedServices=selectedServices.includes(service.dataset.service)?selectedServices.filter(x=>x!==service.dataset.service):[...selectedServices,service.dataset.service];renderServices();return}
    const del=e.target.closest('[data-social-delete]');
    if(del)removeAccount(del.dataset.socialDelete);
  });
  document.querySelectorAll('.tabs .tab').forEach(t=>t.addEventListener('click',()=>{if(t.dataset.tab==='social'){loadAccounts();loadStrategy();loadRadar()}}));
  const clientsRoot=$('#clients');
  if(clientsRoot)new MutationObserver(()=>{clientsRoot.querySelectorAll('.client').forEach(btn=>{if(!btn.dataset.v3hook){btn.dataset.v3hook='1';btn.addEventListener('click',()=>syncSelection(clientIdFromButton(btn)))}})}).observe(clientsRoot,{childList:true,subtree:true});
  setTimeout(()=>{injectContentTypes();clientsRoot?.querySelectorAll('.client').forEach(btn=>{btn.addEventListener('click',()=>syncSelection(clientIdFromButton(btn)))})},250);
})();