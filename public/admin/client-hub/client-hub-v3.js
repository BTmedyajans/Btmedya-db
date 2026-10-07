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
  let projects=[];
  let selectedProjectId='';
  let strategy={approval_required:true,autopublish_enabled:false};

  async function api(url,opts){
    const r=await fetch(url,opts);
    const d=await r.json().catch(()=>({ok:false,error:'JSON okunamadı'}));
    if(r.status===401){location='/admin/';return null}
    if(!r.ok||d.ok===false)throw Error(d.error||'İşlem başarısız');
    return d;
  }
  function ensureV3Panel(){
    if($('#btClientV3Panel'))return;
    const panel=document.createElement('section');
    panel.id='btClientV3Panel';panel.className='panel bt-client-v3-panel';
    panel.innerHTML=`<div class="eyebrow">BTMEDYA / MÜŞTERİ OPERASYON MERKEZİ</div>
      <div class="v3-head"><div><h2>Hizmet · Proje · Sosyal · Marka AI</h2><p class="mut">Müşteriyi tanımla, işi projeye bağla, içeriği üret ve yayın/rapor akışını aynı çalışma alanında tut.</p></div><button class="btn primary" id="clientAiGenerate" type="button">✦ AI ile üret</button></div>
      <div class="v3-block"><div class="v3-label">PROJE BAĞLAMI</div><select id="v3ProjectSelect"><option value="">Genel müşteri işi</option></select></div><div class="v3-block"><div class="v3-label">HİZMET KAPSAMI</div><div id="servicePicker" class="service-picker"></div></div>
      <div class="v3-grid"><div class="v3-block"><div class="v3-label">SOSYAL HESAPLAR</div><div id="socialAccounts" class="v3-stack"></div><div class="v3-form"><select id="sNetwork"><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option><option value="tiktok">TikTok</option><option value="linkedin">LinkedIn</option></select><input id="sHandle" placeholder="@kullanici / kanal"><input id="sUrl" placeholder="Profil URL"><input id="sBrand" placeholder="Metricool Brand ID"><input id="sCompetitors" placeholder="Rakipler: rakip1, rakip2"><input id="sQueries" placeholder="Trend takibi: konu1, konu2"><button class="btn" id="addSocialBtn" type="button">Hesabı ekle</button></div></div>
      <div class="v3-block"><div class="v3-label">RADAR</div><div id="radarBox" class="v3-radar">Müşteri seçildiğinde radar açılır.</div></div></div>
      <div class="v3-block"><div class="v3-label">MARKA STRATEJİSİ</div><div class="v3-form"><input id="sPositioning" placeholder="Marka konumlandırması"><input id="sPillars" placeholder="İçerik sütunları: haber, vaka, ürün"><textarea id="sVisual" rows="4" placeholder='Görsel kuralları JSON'></textarea><textarea id="sPublish" rows="4" placeholder='Yayın kuralları JSON'></textarea><textarea id="sTemplate" rows="5" placeholder='Filtrelenmiş AI şablonu JSON'></textarea></div><div class="v3-actions"><button class="btn" id="sApproval" type="button">✓ Müşteri onayı zorunlu</button><button class="btn" id="sAutopublish" type="button">○ Onaylı içerikte otomatik yayın</button><button class="btn primary" id="saveStrategyBtn" type="button">Stratejiyi kaydet</button></div></div>`;
    const anchor=$('#contents');
    const host=document.querySelector('.workspace')||document.querySelector('main')||document.body;
    if(anchor?.parentElement)anchor.parentElement.insertBefore(panel,anchor);else host.prepend(panel);
    $('#addSocialBtn').addEventListener('click',()=>addAccount().catch(e=>alert(e.message)));
    $('#saveStrategyBtn').addEventListener('click',()=>saveStrategy().catch(e=>alert(e.message)));
    $('#sApproval').addEventListener('click',()=>toggleStrategyFlag('approval_required'));
    $('#sAutopublish').addEventListener('click',()=>toggleStrategyFlag('autopublish_enabled'));
    $('#clientAiGenerate').addEventListener('click',()=>generateAI().catch(e=>alert(e.message)));
    renderServices();syncStrategyButtons();
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
      name:$('#fName')?.value||'',sector:$('#fSector')?.value||'',website_url:$('#fWeb')?.value||'',logo_url:$('#fLogo')?.value||'',brand_voice:$('#fVoice')?.value||'',
      services:selectedServices,automation_enabled:activeSwitches().includes('automation_enabled'),social_management_enabled:activeSwitches().includes('social_management_enabled'),
      web_management_enabled:activeSwitches().includes('web_management_enabled'),ads_management_enabled:activeSwitches().includes('ads_management_enabled'),reference_permission:activeSwitches().includes('reference_permission')
    })});
    alert('Müşteri çalışma alanı güncellendi.');
  }
  function renderAccounts(items){
    const root=$('#socialAccounts');if(!root)return;
    root.innerHTML=items.map(x=>'<div class="social-account-row"><b>'+esc(String(x.network||'').toUpperCase())+'</b><div><strong>'+esc(x.handle||'profil')+'</strong><small>'+esc(x.profile_url||'')+(x.metricool_brand_id?' · Metricool #'+esc(x.metricool_brand_id):' · Public radar')+'</small></div><button type="button" class="btn" data-social-delete="'+esc(x.id)+'">Sil</button></div>').join('')||'<div class="empty">Müşterinin sosyal hesapları henüz eklenmedi.</div>';
  }
  async function loadProjects(){
    if(!selectedId)return;
    const d=await api('/api/client-hub/workspace/'+selectedId+'/projects'); projects=d.items||[];
    const sel=$('#v3ProjectSelect'); if(sel)sel.innerHTML='<option value="">Genel müşteri işi</option>'+projects.filter(x=>x.status!=='archived').map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join(''); if(sel)sel.value=selectedProjectId||'';
    await renderProjectOps();
  }
  async function renderProjectOps(){
    if(!selectedId)return;
    const root=$('#projectList'),sum=$('#projectSummary'),pub=$('#publicationList'); if(!root||!sum)return;
    try{
      const [r,p]=await Promise.all([api('/api/client-hub/workspace/'+selectedId+'/report'+(selectedProjectId?'?project_id='+encodeURIComponent(selectedProjectId):'')),api('/api/client-hub/workspace/'+selectedId+'/publications')]);
      const m=r.metrics||{}; sum.innerHTML='<b>Operasyon özeti</b><p class="mut" style="margin:6px 0">'+esc(r.summary||'')+'</p><div class="integration"><span class="chip">Proje '+m.projects+'</span><span class="chip">İçerik '+m.contents+'</span><span class="chip">Onaylı '+m.approved+'</span><span class="chip">Yayın '+m.published+'</span><span class="chip">Kuyruk '+m.publications+'</span></div>';
      root.innerHTML=projects.filter(x=>x.status!=='archived').map(x=>'<div class="card"><b>'+esc(x.name)+'</b><small class="mut">'+esc(x.service_type||'Genel proje')+' · '+esc(x.status)+'</small><p class="mut">'+esc(x.brief||'Brief girilmedi.')+'</p><button class="btn" data-project-select="'+esc(x.id)+'">Projeyi aç</button></div>').join('')||'<div class="empty">Henüz proje yok. İlk işi proje olarak aç.</div>';
      pub.innerHTML='<div class="card"><b>Yayın kayıtları</b>'+((p.items||[]).slice(0,12).map(x=>'<div class="social-account-row"><div><strong>'+esc(x.content_title||'İçerik')+'</strong><small>'+esc(x.project_name||'Genel')+' · '+esc(x.network||'')+' · '+esc(x.status||'queued')+'</small></div></div>').join('')||'<p class="mut">Henüz yayın kaydı yok.</p>')+'</div>';
    }catch(e){sum.innerHTML='<b>Rapor okunamadı</b><p class="mut">'+esc(e.message)+'</p>';}
  }
  async function createProject(){
    if(!selectedId)return;
    const name=prompt('Proje adı:'); if(!name)return;
    const brief=prompt('Kısa proje briefi:')||'';
    await api('/api/client-hub/workspace/'+selectedId+'/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,brief,service_type:$('#cType')?.value||'social',status:'active'})});
    await loadProjects();
  }
  async function loadAccounts(){
    if(!selectedId)return;
    ensureV3Panel();
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
    ensureV3Panel();
    const d=await api('/api/client-hub/workspace/'+selectedId+'/strategy'); const x=d.item||{};
    strategy={approval_required:x.approval_required!==false,autopublish_enabled:x.autopublish_enabled===true};
    $('#sPositioning').value=x.positioning||'';$('#sPillars').value=(x.content_pillars||[]).join(', ');
    $('#sVisual').value=JSON.stringify(x.visual_rules||{},null,2);$('#sPublish').value=JSON.stringify(x.publishing_rules||{},null,2);$('#sTemplate').value=JSON.stringify(x.ai_template||{},null,2);
    syncStrategyButtons();
  }
  function syncStrategyButtons(){
    const a=$('#sApproval'),b=$('#sAutopublish');
    if(a){a.classList.toggle('on',strategy.approval_required);a.textContent=(strategy.approval_required?'✓ ':'○ ')+'Müşteri onayı zorunlu'}
    if(b){b.classList.toggle('on',strategy.autopublish_enabled);b.textContent=(strategy.autopublish_enabled?'✓ ':'○ ')+'Onaylı içerikte otomatik yayın'}
  }
  function toggleStrategyFlag(key){strategy[key]=!strategy[key];syncStrategyButtons()}
  async function saveStrategy(){
    if(!selectedId)return;
    const obj=v=>{try{return JSON.parse(v||'{}')}catch{return {notes:String(v||'')}}};
    await api('/api/client-hub/workspace/'+selectedId+'/strategy',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({
      positioning:$('#sPositioning').value,content_pillars:$('#sPillars').value.split(',').map(x=>x.trim()).filter(Boolean),
      visual_rules:obj($('#sVisual').value),publishing_rules:obj($('#sPublish').value),ai_template:obj($('#sTemplate').value),
      approval_required:strategy.approval_required,autopublish_enabled:strategy.autopublish_enabled
    })});
    await loadRadar();alert('Marka stratejisi kaydedildi.');
  }
  async function loadRadar(){
    if(!selectedId)return;
    ensureV3Panel();
    const box=$('#radarBox');if(!box)return;box.textContent='Radar okunuyor…';
    try{
      const d=await api('/api/client-hub/workspace/'+selectedId+'/radar');const x=d.radar||{};
      box.innerHTML='<div><b>'+esc(x.mode||'Public radar')+'</b> · '+esc((x.connectedNetworks||[]).length)+' bağlı ağ · '+esc((x.publicNetworks||[]).length)+' public ağ</div><div class="mut" style="margin-top:6px">Rakipler: '+esc((x.competitors||[]).join(' · ')||'tanımlanmadı')+'</div><div class="mut" style="margin-top:5px">Takip: '+esc((x.trackedQueries||[]).join(' · ')||'tanımlanmadı')+'</div><div class="radar-ok" style="margin-top:8px">'+esc((x.recommendations||[]).join(' · '))+'</div>';
    }catch(e){box.textContent=e.message}
  }
  async function generateAI(){
    if(!selectedId)return;
    const brief=prompt('İçerik briefi / hedefi yaz:');
    if(!brief)return;
    const type=$('#cType')?.value||'social';
    const platform=type==='youtube'?'youtube':type==='reel'?'instagram':type==='ads'?'facebook':'instagram';
    const d=await api('/api/client-hub/workspace/'+selectedId+'/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({brief,content_type:type,platform})});
    if(d?.id){ if(selectedProjectId)await api('/api/client-hub/content/'+d.id+'/project',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:selectedProjectId})}); if(window.loadContents)await window.loadContents(); }
    alert('AI içerik taslağı oluşturuldu. Müşteri onayı gelmeden dış yayına gönderilmez.');
  }
  function injectAiButton(){ensureV3Panel()}
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
    ensureV3Panel();
    try{
      const d=await api('/api/client-hub/workspaces');const c=(d.items||[]).find(x=>x.id===id);
      selectedServices=Array.isArray(c?.services)?c.services:[];
      renderServices();
      await Promise.all([loadAccounts(),loadStrategy(),loadRadar(),loadProjects()]);
      injectContentTypes();
    }catch(e){console.warn('BTMEDYA client v3',e)}
  }
  const originalSelect=window.selectClient;
  window.selectClient=async function(id){
    selectedId=id;
    const r=originalSelect?await originalSelect(id):null;
    setTimeout(()=>syncSelection(id),100);
    return r;
  };
  window.saveClient=saveWorkspace;window.newClient=openNewClient;window.addSocialAccount=addAccount;window.removeSocialAccount=removeAccount;window.saveStrategy=saveStrategy;window.loadSocialAccounts=loadAccounts;window.loadRadar=loadRadar;window.toggleStrategyFlag=toggleStrategyFlag;
  document.addEventListener('click',e=>{
    const project=e.target.closest('[data-project-select]'); if(project){selectedProjectId=project.dataset.projectSelect; const sel=$('#v3ProjectSelect'); if(sel)sel.value=selectedProjectId; renderProjectOps(); return;}
    const service=e.target.closest('[data-service]');
    if(service){selectedServices=selectedServices.includes(service.dataset.service)?selectedServices.filter(x=>x!==service.dataset.service):[...selectedServices,service.dataset.service];renderServices();return}
    const del=e.target.closest('[data-social-delete]');
    if(del)removeAccount(del.dataset.socialDelete).catch(err=>alert(err.message));
  });
  document.querySelectorAll('.tabs .tab').forEach(t=>t.addEventListener('click',()=>{if(t.dataset.tab==='social'){ensureV3Panel();loadAccounts();loadStrategy();loadRadar()} if(t.dataset.tab==='projects'){loadProjects()}}));
  document.addEventListener('change',e=>{if(e.target.id==='v3ProjectSelect'){selectedProjectId=e.target.value;renderProjectOps()}});
  document.addEventListener('click',e=>{if(e.target.id==='projectNewBtn')createProject().catch(err=>alert(err.message));if(e.target.id==='projectRefreshBtn')loadProjects().catch(err=>alert(err.message));});
  const clientsRoot=$('#clients');
  if(clientsRoot)new MutationObserver(()=>{clientsRoot.querySelectorAll('.client').forEach(btn=>{if(!btn.dataset.v3hook){btn.dataset.v3hook='1';btn.addEventListener('click',()=>syncSelection(clientIdFromButton(btn)))}})}).observe(clientsRoot,{childList:true,subtree:true});
  setTimeout(()=>{ensureV3Panel();injectContentTypes();clientsRoot?.querySelectorAll('.client').forEach(btn=>{btn.addEventListener('click',()=>syncSelection(clientIdFromButton(btn)))})},250);
})();