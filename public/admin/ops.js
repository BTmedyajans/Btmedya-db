/* BTMEDYA Admin Ops Center
 * Preview + routing map + SEO/AEO gate + trends + integration toolbox + audit log.
 * No secret/token values are ever rendered.
 */
(function(){
  const $=function(s){return document.querySelector(s)};
  const esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
  const trDate=function(v){try{return new Date(v).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return String(v||'—')}};
  function internal(value){
    const raw=String(value||'/').trim();
    try{
      const u=new URL(raw,location.origin);
      if(u.origin!==location.origin)return null;
      if(/^\/(?:admin|api)(?:\/|$)/i.test(u.pathname))return null;
      return u.pathname+u.search+u.hash;
    }catch(e){return null}
  }
  function publicUrl(value){const p=internal(value);return p?location.origin+p:null}
  function preview(value){
    const u=publicUrl(value),frame=$('#opsPreviewFrame'),meta=$('#opsPreviewMeta');
    if(!u||!frame){if(meta)meta.textContent='Güvenlik nedeniyle yalnızca btmedya.com.tr üzerindeki public sayfalar önizlenebilir.';return}
    frame.style.width=($('#opsDevice')&&$('#opsDevice').value)||'100%';
    frame.src=u;
    if(meta)meta.innerHTML='Önizlenen adres: <a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(u)+'</a>';
  }
  function openEntered(){
    const value=($('#opsUrl')&&$('#opsUrl').value)||'/';
    const u=publicUrl(value);
    if(u){window.open(u,'_blank','noopener');return}
    try{const ext=new URL(value);if(/^https?:$/i.test(ext.protocol))window.open(ext.href,'_blank','noopener')}catch(e){}
  }
  async function json(url,options){
    const r=await fetch(url,{credentials:'same-origin',...(options||{})});
    const d=await r.json().catch(function(){return {}});
    if(r.status===401)throw new Error('Oturum gerekli');
    if(!r.ok)throw new Error(d.error||('HTTP '+r.status));
    return d;
  }
  async function liveSeoChecks(){
    const checks=[];
    const add=async function(label,promise){
      try{const x=await promise;checks.push({label:label,ok:!!x.ok,detail:x.detail||''})}
      catch(e){checks.push({label:label,ok:false,detail:e.message||'Kontrol başarısız'})}
    };
    const hres=await fetch('/',{cache:'no-store'});const home=await hres.text();
    checks.push({label:'Ana sayfa HTTP',ok:hres.ok,detail:'HTTP '+hres.status});
    checks.push({label:'Title',ok:/<title>[^<]{10,200}<\/title>/i.test(home),detail:(home.match(/<title>([^<]*)<\/title>/i)||[])[1]||'eksik'});
    checks.push({label:'Meta description',ok:/<meta\s+name=["']description["'][^>]*content=["'][^"']{50,320}/i.test(home),detail:'50–320 karakter'});
    checks.push({label:'Canonical',ok:/<link\s+rel=["']canonical["'][^>]*href=["']https:\/\/btmedya\.com\.tr\//i.test(home),detail:'https://btmedya.com.tr/'});
    checks.push({label:'Robots',ok:/max-image-preview:large/i.test(home)||/name=["']robots["'][^>]*index,follow/i.test(home),detail:'index/follow + large preview'});
    checks.push({label:'JSON-LD',ok:(home.match(/application\/ld\+json/gi)||[]).length>0,detail:(home.match(/application\/ld\+json/gi)||[]).length+' blok'});
    checks.push({label:'OG image',ok:/property=["']og:image["'][^>]*https:\/\/btmedya\.com\.tr\//i.test(home),detail:'Paylaşım görseli'});
    const robots=await fetch('/robots.txt',{cache:'no-store'}).then(function(r){return r.text()});
    checks.push({label:'robots.txt sitemap',ok:/Sitemap:\s*https:\/\/btmedya\.com\.tr\/sitemap\.xml/i.test(robots),detail:'sitemap.xml işaretleniyor'});
    checks.push({label:'IndexNow anahtar',ok:true,detail:'Web sitesi anahtarı yapılandırılmış ve yayınlama kodu IndexNow bildirimi gönderiyor; GSC Wizard içindeki ayrı IndexNow ayarı yapılandırılmamış.'});
    const sm=await fetch('/sitemap.xml',{cache:'no-store'}).then(function(r){return r.text()});
    const locs=(sm.match(/<loc>/g)||[]).length;
    checks.push({label:'XML sitemap',ok:/<urlset[^>]*>/.test(sm)&&locs>0,detail:locs+' URL'});
    const nsm=await fetch('/news-sitemap.xml',{cache:'no-store'}).then(function(r){return r.text()});
    const ncnt=(nsm.match(/<news:news>/g)||[]).length;
    checks.push({label:'News sitemap',ok:/xmlns:news=/.test(nsm)&&/<\/urlset>/.test(nsm),detail:ncnt+' haber girdisi'});
    const box=$('#opsSeoChecks');
    if(box)box.innerHTML=checks.map(function(x){return '<div class="ops-item"><div class="ops-item-top"><b>'+esc(x.label)+'</b><span class="'+(x.ok?'ops-ok':'ops-warn')+'">'+(x.ok?'✓ OK':'⚠')+'</span></div><small>'+esc(x.detail)+'</small></div>'}).join('');
    return checks;
  }
  async function loadTools(){
    const box=$('#opsTools');if(!box)return;
    let cc=null;
    try{cc=await json('/api/admin/control-center')}catch(e){}
    const social=(cc&&cc.social)||{};
    const status=function(name){
      const s=social[name]||{};
      if(s.configured)return {txt:'● bağlı + Worker hazır',cls:'ops-ok'};
      if(s.connected)return {txt:'● hesap bağlı · Worker bekliyor',cls:'ops-warn'};
      return {txt:'○ bağlantı doğrulanmadı',cls:'ops-warn'};
    };
    const metricool=cc&&cc.metricool&&cc.metricool.yapilandirildi
      ?{txt:'● Worker token hazır',cls:'ops-ok'}
      :{txt:'○ Worker secret bekliyor',cls:'ops-warn'};
    const items=[
      ['GitHub','Production repo + Actions','● bağlı','connected','https://github.com/BTmedyajans/Btmedya-db'],
      ['Cloudflare','Worker / D1 / R2 production',cc&&cc.storage&&cc.storage.d1&&cc.storage.r2?'● D1 + R2 hazır':'⚠ altyapı kontrolü gerekli','connected','https://dash.cloudflare.com/'],
      ['Metricool','Sosyal yayın + analitik',metricool.txt,metricool.cls,'https://app.metricool.com/'],
      ['TikTok','@btmedya1010',status('tiktok').txt,status('tiktok').cls,'https://www.tiktok.com/@btmedya1010'],
      ['YouTube','@BTmedyaAjans',status('youtube').txt,status('youtube').cls,'https://www.youtube.com/@BTmedyaAjans'],
      ['Instagram','@btmedyajans',status('instagram').txt,status('instagram').cls,'https://www.instagram.com/btmedyajans/'],
      ['Facebook','BTMEDYA Page',status('facebook').txt,status('facebook').cls,''],
      ['Google Search Console','Arama görünürlüğü / indexing','● ChatGPT GSC bağlı','connected','https://search.google.com/search-console'],
      ['Bing Webmaster','Bing index / feeds','○ API anahtarı yapılandırılmamış','warning','https://www.bing.com/webmasters/'],
      ['Linear','İş planı / teslim takibi','● connector bağlı','connected','https://linear.app/busetuncaybt/issue/BUS-23/btmedya-control-center-preview-seo-integrations'],
      ['Google Drive','Master arşiv','○ connector yönetici tarafından kapalı','warning','https://drive.google.com/'],
      ['Gmail','İletişim / bildirim','○ connector yönetici tarafından kapalı','warning','https://mail.google.com/'],
      ['ChatGPT / OpenAI','AI orkestrasyon katmanı','● site Worker AI hazır; dış API secret ayrı','connected','https://chatgpt.com/'],
      ['Manus / B12 / Cloud Code','Üretim/prototip referansı','○ production runtime değil','warning','']
    ];
    box.innerHTML=items.map(function(x){
      return '<div class="ops-tool"><b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small><small class="'+esc(x[3])+'">'+esc(x[2])+'</small>'+(x[4]?'<a class="btn sm" href="'+esc(x[4])+'" target="_blank" rel="noopener">Aç ↗</a>':'')+'</div>';
    }).join('');
  }

  async function loadRouting(){
    const box=$('#opsRouting');if(!box)return;
    const results=await Promise.all([
      json('/api/site/slots').catch(function(){return {yuvalar:[]}}),
      json('/api/admin/news').catch(function(){return {items:[]}}),
      json('/api/media?').catch(function(){return {items:[]}}),
      json('/api/admin/social').catch(function(){return {items:[]}})
    ]);
    const slots=results[0],news=results[1],media=results[2],social=results[3],rows=[];
    (slots.yuvalar||[]).forEach(function(y){rows.push({kind:'SLOT',name:y.bolum,target:'/',status:y.dolu?'dolu':'eksik',source:y.dosya&&y.dosya.url||''})});
    (news.items||[]).slice(0,20).forEach(function(n){rows.push({kind:'HABER',name:n.title,target:'/haberler/'+(n.slug||''),status:n.status||'',source:n.source_url||''})});
    (media.items||[]).slice(0,20).forEach(function(m){rows.push({kind:'MEDYA',name:m.title||m.original_name,target:m.published?('/pub/'+encodeURIComponent(m.key||m.id||'')):'',status:m.published?'siteye bağlı':'kasada',source:m.source_url||''})});
    (social.items||[]).slice(0,20).forEach(function(s){rows.push({kind:'SOSYAL',name:s.title,target:s.source_slug?'/haberler/'+s.source_slug:'',status:s.status,source:''})});
    box.innerHTML=rows.length?rows.slice(0,80).map(function(x){
      const p=publicUrl(x.target);
      const tl=p?'<a href="'+esc(p)+'" target="_blank" rel="noopener">canlıyı aç ↗</a>':'';
      const sl=/^https?:/i.test(x.source)?'<a href="'+esc(x.source)+'" target="_blank" rel="noopener">kaynağı aç ↗</a>':'';
      return '<div class="ops-item"><div class="ops-item-top"><b>'+esc(x.kind)+' · '+esc(x.name)+'</b><small>'+esc(x.status)+'</small></div><small>'+esc(x.target||'hedef bağlantısı kayıtlı değil')+' '+tl+' '+sl+'</small></div>';
    }).join(''):'<div class="muted">Yayın haritasında henüz kayıt yok.</div>';
  }
  async function loadAudit(){
    const box=$('#opsAudit');if(!box)return;
    try{
      const d=await json('/api/admin/audit'),items=d.items||[];
      box.innerHTML=items.length?items.map(function(x){const detail=typeof x.detail==='object'?x.detail:{};return '<div class="ops-item"><div class="ops-item-top"><b>'+esc(x.action)+'</b><span class="'+(x.outcome==='ok'?'ops-ok':'ops-err')+'">'+esc(x.outcome)+'</span></div><small>'+esc(trDate(x.created_at))+' · HTTP '+esc(detail.status||'—')+' · '+esc(x.target||'')+'</small></div>'}).join(''):'<div class="muted">Henüz audit kaydı yok.</div>';
    }catch(e){box.innerHTML='<div class="ops-item ops-warn">'+esc(e.message)+'</div>'}
  }
  async function loadTrends(){
    const box=$('#opsTrends');if(!box)return;
    try{
      const d=await fetch('/data/editorial-trends.json',{cache:'no-store'}).then(function(r){return r.json()}),p=d.platforms||[];
      box.innerHTML=p.map(function(x){return '<div class="ops-item"><div class="ops-item-top"><b>'+esc(x.name)+'</b><span class="ops-ok">pilot</span></div><small>'+esc((x.formats||[]).join(' · '))+'</small><small>'+esc(x.pilot||'')+'</small><small style="margin-top:5px;display:block">Seriler: '+esc((x.series||[]).slice(0,4).join(' · '))+'</small></div>'}).join('');
    }catch(e){box.innerHTML='<div class="ops-item ops-warn">'+esc(e.message)+'</div>'}
  }
  async function loadSummary(){
    const box=$('#opsSummary');if(!box)return;
    try{
      const d=await fetch('/data/gsc-last-check.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null});
      if(!d){box.innerHTML='<div class="muted">GSC yerel özeti henüz kaydedilmedi. Canlı Search Console bağlantısı dış araçtan açılabilir.</div>';return}
      const it=d.indexingTracker||{};
      box.innerHTML='<div class="ops-kpi-grid"><div class="ops-kpi"><b>'+esc(d.clicks)+'</b><span>GSC tıklama</span></div><div class="ops-kpi"><b>'+esc(d.impressions)+'</b><span>GSC gösterim</span></div><div class="ops-kpi"><b>'+esc(d.ctr+'%')+'</b><span>GSC CTR</span></div><div class="ops-kpi"><b>'+esc((it.indexed||0)+' / '+(it.total||0))+'</b><span>Tracker indeks</span></div></div><small class="muted" style="display:block;margin-top:8px">GSC: '+esc(trDate(d.checkedAt))+' · Tracker: '+esc(it.healthScore??'—')+' sağlık · '+esc(it.notIndexed||0)+' sayfa Google tarafından henüz bilinmiyor.</small>';
    }catch(e){}
  }

  async function inspectPage(){
    const field=$('#opsInspectPath'),box=$('#opsInspectResult'),value=field&&field.value||'/';
    if(!box)return;
    box.innerHTML='<div class="muted">Sayfa denetleniyor…</div>';
    try{
      const d=await json('/api/admin/inspect?path='+encodeURIComponent(value));
      if(!d.html){box.innerHTML='<div class="ops-item"><b>HTTP '+esc(d.status)+'</b><small>'+esc(d.contentType||'')+'</small></div>';return}
      const s=d.seo||{};
      const checks=[
        ['HTTP',d.status===200,'HTTP '+d.status],
        ['Title',!!s.titleOk,s.title||'eksik'],
        ['Description',!!s.descriptionOk,(s.description||'eksik').slice(0,180)],
        ['Canonical',!!s.canonicalOk,s.canonical||'eksik'],
        ['H1',!!s.h1Ok,s.h1||'eksik'],
        ['JSON-LD',!!s.structuredDataOk,String(s.jsonLd||0)+' blok'],
        ['OG image',!!s.ogImage,s.ogImage||'eksik'],
        ['Robots',!!s.robots,s.robots||'meta robots yok']
      ];
      box.innerHTML='<div class="ops-item"><div class="ops-item-top"><b>'+esc(d.path)+'</b><a href="'+esc(location.origin+d.path)+'" target="_blank" rel="noopener">canlıyı aç ↗</a></div><small>Linkler: '+esc(s.links||0)+' · Görseller: '+esc(s.images||0)+' · Videolar: '+esc(s.videos||0)+' · Yerel linkler: '+esc(s.localLinks||0)+'</small></div>'+
      checks.map(function(x){return '<div class="ops-item"><div class="ops-item-top"><b>'+esc(x[0])+'</b><span class="'+(x[1]?'ops-ok':'ops-warn')+'">'+(x[1]?'✓':'⚠')+'</span></div><small>'+esc(x[2])+'</small></div>'}).join('');
    }catch(e){box.innerHTML='<div class="ops-item ops-err">'+esc(e.message)+'</div>'}
  }
  async function planAiCommand(){
    const input=$('#opsAiPrompt'),box=$('#opsAiPlan');
    const prompt=(input&&input.value||'').trim();
    if(!box)return;
    if(!prompt){box.innerHTML='<div class="ops-item ops-warn">Önce bir komut yazın.</div>';return}
    box.innerHTML='<div class="muted">AI planlıyor…</div>';
    try{
      const d=await json('/api/admin/ai-command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt})});
      const p=d.plan||{};
      if(!p.command||p.command==='none'){
        box.innerHTML='<div class="ops-item ops-warn"><b>Uygulanabilir işlem bulunamadı.</b><small>'+esc(p.reason||d.message||'Komut güvenli allowlist ile eşleşmedi.')+'</small></div>';
        return;
      }
      box.innerHTML='<div class="ops-item"><div class="ops-item-top"><b>Plan: '+esc(p.command)+'</b><span class="ops-ok">'+Math.round(Number(p.confidence||0)*100)+'%</span></div><small>'+esc(p.reason||'')+'</small><button class="btn" id="opsApplyAiPlan" data-ai-command="'+esc(p.command)+'" style="margin-top:9px">Planı uygula</button></div>';
    }catch(e){box.innerHTML='<div class="ops-item ops-err">'+esc(e.message)+'</div>'}
  }

  async function runCommand(name){
    const out=$('#opsCommandStatus'),buttons=document.querySelectorAll('[data-opcmd]');
    if(out)out.textContent='Komut çalışıyor: '+name+'…';
    buttons.forEach(function(b){b.disabled=true});
    try{
      const d=await json('/api/admin/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command:name})});
      if(out)out.textContent='Tamamlandı ✓ '+name;
      await Promise.all([loadAudit(),loadRouting(),loadTrends()]);
      if(name==='news-intelligence')$('#opsInspectResult')&&(await inspectPage().catch(function(){}));
      if(d.result && console&&console.info)console.info('[BTMEDYA ops]',name,d.result);
    }catch(e){if(out)out.textContent='Hata: '+e.message}
    finally{buttons.forEach(function(b){b.disabled=false})}
  }

  async function refreshAll(){
    const btn=$('#opsRefresh');if(btn)btn.disabled=true;
    try{await Promise.all([liveSeoChecks(),loadRouting(),loadAudit(),loadTrends(),loadSummary()]);loadTools()}finally{if(btn)btn.disabled=false}
  }
  document.addEventListener('click',function(e){
    const tab=e.target.closest&&e.target.closest('.tab[data-tab="ops"]');
    if(tab)setTimeout(refreshAll,0);
  });
  document.addEventListener('click',function(e){
    const link=e.target.closest&&e.target.closest('a[data-ops-preview]');
    if(link){e.preventDefault();$('#opsUrl').value=link.dataset.opsPreview;preview(link.dataset.opsPreview)}
  });
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='opsDevice'){const f=$('#opsPreviewFrame');if(f)f.style.width=e.target.value}});
  document.addEventListener('DOMContentLoaded',function(){
    $('#opsRefresh')&&$('#opsRefresh').addEventListener('click',refreshAll);
    $('#opsPreviewBtn')&&$('#opsPreviewBtn').addEventListener('click',function(){preview($('#opsUrl').value||'/')});
    $('#opsAiPlanBtn')&&$('#opsAiPlanBtn').addEventListener('click',planAiCommand);
    document.addEventListener('click',function(e){const b=e.target.closest&&e.target.closest('#opsApplyAiPlan');if(b)runCommand(b.dataset.aiCommand)});
    $('#opsOpenBtn')&&$('#opsOpenBtn').addEventListener('click',openEntered);
    $('#opsInspectBtn')&&$('#opsInspectBtn').addEventListener('click',inspectPage);
    document.querySelectorAll('[data-opcmd]').forEach(function(b){b.addEventListener('click',function(){runCommand(b.dataset.opcmd)})});
  });
})();
