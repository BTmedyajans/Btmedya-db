/* BTMEDYA Agency Desk
 * Lead + multi-client workspace + content/references. D1-backed, same admin session.
 */
const stages=['new','contacted','qualified','proposal','meeting','won','lost'];
const priorities=['low','normal','high'];
const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const session=async(request,secret)=>{
  if(!secret)return false;
  const c=request.headers.get('cookie')||''; const m=c.match(/bt_admin=([^;]+)/); if(!m)return false;
  const [p,s]=m[1].split('.'); if(!p||!s)return false;
  const bytes=new TextEncoder().encode(p);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  if(sig!==s)return false;
  try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(p.length/4)*4,'=')),c=>c.charCodeAt(0)))).exp>Date.now()}catch{return false}
};
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const jsonArray=v=>{try{const x=JSON.parse(String(v||'[]'));return Array.isArray(x)?x:[]}catch{return[]}};
const jsonObj=v=>{try{const x=JSON.parse(String(v||'{}'));return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return{}}};

const base64url=v=>btoa(String.fromCharCode(...new Uint8Array(v))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function sha256Hex(value){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function randomToken(){
  const bytes=new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function ensureClientTables(env){
  if(!env.DB)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS client_workspaces (id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,sector TEXT NOT NULL DEFAULT '',website_url TEXT NOT NULL DEFAULT '',logo_url TEXT NOT NULL DEFAULT '',services_json TEXT NOT NULL DEFAULT '[]',brand_voice TEXT NOT NULL DEFAULT '',automation_enabled INTEGER NOT NULL DEFAULT 1,social_management_enabled INTEGER NOT NULL DEFAULT 1,web_management_enabled INTEGER NOT NULL DEFAULT 0,ads_management_enabled INTEGER NOT NULL DEFAULT 0,reference_permission INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS client_content (id TEXT PRIMARY KEY,client_id TEXT NOT NULL,title TEXT NOT NULL DEFAULT '',content_type TEXT NOT NULL DEFAULT 'social',engine TEXT NOT NULL DEFAULT 'btmedya',brief TEXT NOT NULL DEFAULT '',body TEXT NOT NULL DEFAULT '',media_key TEXT NOT NULL DEFAULT '',preview_json TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'draft',client_approved INTEGER NOT NULL DEFAULT 0,published_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE)`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS client_references (id TEXT PRIMARY KEY,client_id TEXT NOT NULL,title TEXT NOT NULL DEFAULT '',slug TEXT NOT NULL UNIQUE,summary TEXT NOT NULL DEFAULT '',cover_key TEXT NOT NULL DEFAULT '',content_ids_json TEXT NOT NULL DEFAULT '[]',visibility TEXT NOT NULL DEFAULT 'draft',featured INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE)`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS client_review_tokens (id TEXT PRIMARY KEY,content_id TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL,FOREIGN KEY(content_id) REFERENCES client_content(id) ON DELETE CASCADE)`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS client_review_events (id TEXT PRIMARY KEY,content_id TEXT NOT NULL,decision TEXT NOT NULL,comment TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,FOREIGN KEY(content_id) REFERENCES client_content(id) ON DELETE CASCADE)`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS client_social_accounts (id TEXT PRIMARY KEY,client_id TEXT NOT NULL,network TEXT NOT NULL,handle TEXT NOT NULL DEFAULT '',profile_url TEXT NOT NULL DEFAULT '',metricool_brand_id TEXT NOT NULL DEFAULT '',competitors_json TEXT NOT NULL DEFAULT '[]',tracked_queries_json TEXT NOT NULL DEFAULT '[]',active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(client_id,network,handle),FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE)`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS client_strategies (client_id TEXT PRIMARY KEY,positioning TEXT NOT NULL DEFAULT '',content_pillars_json TEXT NOT NULL DEFAULT '[]',visual_rules_json TEXT NOT NULL DEFAULT '{}',publishing_rules_json TEXT NOT NULL DEFAULT '{}',ai_template_json TEXT NOT NULL DEFAULT '{}',analysis_json TEXT NOT NULL DEFAULT '{}',approval_required INTEGER NOT NULL DEFAULT 1,autopublish_enabled INTEGER NOT NULL DEFAULT 0,last_analysis_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE)`).run().catch(()=>{});
}

async function clientHubApi(request,env,url){
  if(!url.pathname.startsWith('/api/client-hub/')) return null;
  if(!env.DB)return j({ok:false,error:'D1 veritabanı bağlı değil'},503);
  await ensureClientTables(env);
  const publicReference=url.pathname.match(/^\/api\/client-hub\/public\/reference\/([^/]+)$/);
  const publicList=url.pathname==='/api/client-hub/public/references';
  if(publicReference && request.method==='GET'){
    const slug=decodeURIComponent(publicReference[1]);
    const ref=await env.DB.prepare(`SELECT r.*,c.name client_name,c.slug client_slug,c.sector,c.website_url,c.logo_url,c.services_json,c.brand_voice FROM client_references r JOIN client_workspaces c ON c.id=r.client_id WHERE r.slug=? AND r.visibility='public' AND c.status='active'`).bind(slug).first();
    if(!ref)return j({ok:false,error:'Referans bulunamadı'},404);
    const ids=jsonArray(ref.content_ids_json);
    let contents=[];
    if(ids.length){const marks=ids.map(()=>'?').join(',');const q=await env.DB.prepare(`SELECT id,title,content_type,engine,body,media_key,preview_json,status,client_approved,published_at FROM client_content WHERE id IN (${marks}) ORDER BY updated_at DESC`).bind(...ids).all();contents=q.results||[];}
    return j({ok:true,reference:{...ref,services:jsonArray(ref.services_json),content_ids:ids,contents}});
  }
  if(publicList && request.method==='GET'){
    const q=await env.DB.prepare(`SELECT r.id,r.title,r.slug,r.summary,r.cover_key,r.featured,c.name client_name,c.sector FROM client_references r JOIN client_workspaces c ON c.id=r.client_id WHERE r.visibility='public' AND c.status='active' ORDER BY r.featured DESC,r.updated_at DESC LIMIT 60`).all();
    return j({ok:true,items:q.results||[]});
  }
  if(!(await session(request,env.ADMIN_SESSION_SECRET_SECRET)))return j({ok:false,error:'Yetkisiz'},401);
  if(url.pathname==='/api/client-hub/workspaces' && request.method==='GET'){
    const q=await env.DB.prepare('SELECT * FROM client_workspaces ORDER BY updated_at DESC').all();
    return j({ok:true,items:(q.results||[]).map(x=>({...x,services:jsonArray(x.services_json)}))});
  }
  if(url.pathname==='/api/client-hub/workspaces' && request.method==='POST'){
    const b=await request.json().catch(()=>({}));
    const name=clean(b.name,180); if(!name)return j({ok:false,error:'Firma adı gerekli'},400);
    const slug=clean(b.slug||name.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),100);
    const id=crypto.randomUUID(),now=new Date().toISOString();
    await env.DB.prepare('INSERT INTO client_workspaces(id,name,slug,sector,website_url,logo_url,services_json,brand_voice,automation_enabled,social_management_enabled,web_management_enabled,ads_management_enabled,reference_permission,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,name,slug,clean(b.sector,120),clean(b.website_url,500),clean(b.logo_url,500),JSON.stringify(Array.isArray(b.services)?b.services.slice(0,20):[]),clean(b.brand_voice,1000),b.automation_enabled===false?0:1,b.social_management_enabled===false?0:1,b.web_management_enabled?1:0,b.ads_management_enabled?1:0,b.reference_permission?1:0,'active',now,now).run();
    return j({ok:true,id,slug},201);
  }
  const wm=url.pathname.match(/^\/api\/client-hub\/workspace\/([^/]+)$/);
  if(wm && (request.method==='PATCH'||request.method==='DELETE')){
    const id=wm[1];
    if(request.method==='DELETE'){await env.DB.prepare('UPDATE client_workspaces SET status=\'archived\',updated_at=? WHERE id=?').bind(new Date().toISOString(),id).run();return j({ok:true,id});}
    const b=await request.json().catch(()=>({})); const fields=[],vals=[];
    const map={name:180,sector:120,website_url:500,logo_url:500,brand_voice:1000,status:30};
    for(const[k,n]of Object.entries(map))if(k in b){fields.push(k+'=?');vals.push(clean(b[k],n));}
    for(const[k,col]of [['automation_enabled','automation_enabled'],['social_management_enabled','social_management_enabled'],['web_management_enabled','web_management_enabled'],['ads_management_enabled','ads_management_enabled'],['reference_permission','reference_permission']])if(k in b){fields.push(col+'=?');vals.push(b[k]?1:0);}
    if(Array.isArray(b.services)){fields.push('services_json=?');vals.push(JSON.stringify(b.services.slice(0,20)));}
    if(!fields.length)return j({ok:false,error:'Değişiklik yok'},400); fields.push('updated_at=?');vals.push(new Date().toISOString(),id);
    await env.DB.prepare('UPDATE client_workspaces SET '+fields.join(',')+' WHERE id=?').bind(...vals).run(); return j({ok:true,id});
  }
  const wsSocial=url.pathname.match(/^\/api\/client-hub\/workspace\/([^/]+)\/social$/);
  if(wsSocial){
    const clientId=wsSocial[1];
    const owner=await env.DB.prepare('SELECT id FROM client_workspaces WHERE id=?').bind(clientId).first();
    if(!owner)return j({ok:false,error:'Müşteri çalışma alanı bulunamadı'},404);
    if(request.method==='GET'){
      const q=await env.DB.prepare('SELECT * FROM client_social_accounts WHERE client_id=? ORDER BY network,handle').bind(clientId).all();
      return j({ok:true,items:(q.results||[]).map(x=>({...x,competitors:jsonArray(x.competitors_json),tracked_queries:jsonArray(x.tracked_queries_json)}))});
    }
    if(request.method==='POST'){
      const b=await request.json().catch(()=>({}));
      const network=clean(b.network,30).toLowerCase();
      if(!['instagram','facebook','youtube','tiktok','linkedin'].includes(network))return j({ok:false,error:'Geçersiz sosyal ağ'},400);
      const now=new Date().toISOString(),id=crypto.randomUUID(),handle=clean(b.handle,160);
      await env.DB.prepare('INSERT INTO client_social_accounts(id,client_id,network,handle,profile_url,metricool_brand_id,competitors_json,tracked_queries_json,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id,clientId,network,handle,clean(b.profile_url,500),clean(b.metricool_brand_id,80),JSON.stringify(Array.isArray(b.competitors)?b.competitors.slice(0,20):[]),JSON.stringify(Array.isArray(b.tracked_queries)?b.tracked_queries.slice(0,30):[]),b.active===false?0:1,now,now).run();
      return j({ok:true,id},201);
    }
  }

  const wsSocialOne=url.pathname.match(/^\/api\/client-hub\/workspace\/([^/]+)\/social\/([^/]+)$/);
  if(wsSocialOne && (request.method==='PATCH'||request.method==='DELETE')){
    const clientId=wsSocialOne[1],id=wsSocialOne[2];
    if(request.method==='DELETE'){
      await env.DB.prepare('DELETE FROM client_social_accounts WHERE id=? AND client_id=?').bind(id,clientId).run();
      return j({ok:true,id});
    }
    const b=await request.json().catch(()=>({})),fields=[],vals=[];
    const map={handle:160,profile_url:500,metricool_brand_id:80};
    for(const[k,n]of Object.entries(map))if(k in b){fields.push(k+'=?');vals.push(clean(b[k],n));}
    if(Array.isArray(b.competitors)){fields.push('competitors_json=?');vals.push(JSON.stringify(b.competitors.slice(0,20)));}
    if(Array.isArray(b.tracked_queries)){fields.push('tracked_queries_json=?');vals.push(JSON.stringify(b.tracked_queries.slice(0,30)));}
    if('active' in b){fields.push('active=?');vals.push(b.active?1:0);}
    if(!fields.length)return j({ok:false,error:'Değişiklik yok'},400);
    fields.push('updated_at=?');vals.push(new Date().toISOString(),id,clientId);
    await env.DB.prepare('UPDATE client_social_accounts SET '+fields.join(',')+' WHERE id=? AND client_id=?').bind(...vals).run();
    return j({ok:true,id});
  }

  const wsStrategy=url.pathname.match(/^\/api\/client-hub\/workspace\/([^/]+)\/strategy$/);
  if(wsStrategy && (request.method==='GET'||request.method==='PUT')){
    const clientId=wsStrategy[1];
    const owner=await env.DB.prepare('SELECT id FROM client_workspaces WHERE id=?').bind(clientId).first();
    if(!owner)return j({ok:false,error:'Müşteri çalışma alanı bulunamadı'},404);
    if(request.method==='GET'){
      const row=await env.DB.prepare('SELECT * FROM client_strategies WHERE client_id=?').bind(clientId).first();
      if(!row)return j({ok:true,item:null});
      return j({ok:true,item:{...row,content_pillars:jsonArray(row.content_pillars_json),visual_rules:jsonObj(row.visual_rules_json),publishing_rules:jsonObj(row.publishing_rules_json),ai_template:jsonObj(row.ai_template_json),analysis:jsonObj(row.analysis_json)}});
    }
    const b=await request.json().catch(()=>({})),now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO client_strategies(client_id,positioning,content_pillars_json,visual_rules_json,publishing_rules_json,ai_template_json,analysis_json,approval_required,autopublish_enabled,last_analysis_at,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(client_id) DO UPDATE SET positioning=excluded.positioning,content_pillars_json=excluded.content_pillars_json,visual_rules_json=excluded.visual_rules_json,publishing_rules_json=excluded.publishing_rules_json,ai_template_json=excluded.ai_template_json,analysis_json=excluded.analysis_json,approval_required=excluded.approval_required,autopublish_enabled=excluded.autopublish_enabled,last_analysis_at=excluded.last_analysis_at,updated_at=excluded.updated_at`)
      .bind(clientId,clean(b.positioning,1000),JSON.stringify(Array.isArray(b.content_pillars)?b.content_pillars.slice(0,12):[]),JSON.stringify(b.visual_rules&&typeof b.visual_rules==='object'?b.visual_rules:{}),JSON.stringify(b.publishing_rules&&typeof b.publishing_rules==='object'?b.publishing_rules:{}),JSON.stringify(b.ai_template&&typeof b.ai_template==='object'?b.ai_template:{}),JSON.stringify(b.analysis&&typeof b.analysis==='object'?b.analysis:{}),b.approval_required===false?0:1,b.autopublish_enabled?1:0,b.last_analysis_at||now,now,now).run();
    return j({ok:true,client_id:clientId});
  }

  const wsRadar=url.pathname.match(/^\/api\/client-hub\/workspace\/([^/]+)\/radar$/);
  if(wsRadar && request.method==='GET'){
    const clientId=wsRadar[1];
    const owner=await env.DB.prepare('SELECT id,name,sector,brand_voice FROM client_workspaces WHERE id=?').bind(clientId).first();
    if(!owner)return j({ok:false,error:'Müşteri çalışma alanı bulunamadı'},404);
    const accounts=(await env.DB.prepare('SELECT * FROM client_social_accounts WHERE client_id=? AND active=1 ORDER BY network,handle').bind(clientId).all()).results||[];
    const strategy=await env.DB.prepare('SELECT * FROM client_strategies WHERE client_id=?').bind(clientId).first();
    const connected=accounts.filter(x=>x.metricool_brand_id).map(x=>x.network);
    const publicOnly=accounts.filter(x=>!x.metricool_brand_id).map(x=>x.network);
    const competitors=[...new Set(accounts.flatMap(x=>jsonArray(x.competitors_json)))].slice(0,20);
    const queries=[...new Set(accounts.flatMap(x=>jsonArray(x.tracked_queries_json)))].slice(0,30);
    return j({ok:true,client:owner,radar:{
      mode:connected.length?'Metricool + public radar':'Public radar',
      connectedNetworks:connected,
      publicNetworks:publicOnly,
      competitors,
      trackedQueries:queries,
      recommendations:[
        'Son 7 gün içerik performansını ağ bazında karşılaştır.',
        'Rakip başlık/konu tekrarlarını haftalık izle.',
        'Trend sinyallerini içerik sütunlarına eşleştir.',
        'Üretimden önce marka görsel kurallarını ve onay akışını uygula.'
      ],
      strategy:strategy?{positioning:strategy.positioning,approval_required:Boolean(strategy.approval_required),autopublish_enabled:Boolean(strategy.autopublish_enabled),last_analysis_at:strategy.last_analysis_at}:null
    }});
  }

  const wc=url.pathname.match(/^\/api\/client-hub\/workspace\/([^/]+)\/content$/);
  if(wc){const clientId=wc[1];if(request.method==='GET'){const q=await env.DB.prepare('SELECT * FROM client_content WHERE client_id=? ORDER BY updated_at DESC LIMIT 200').bind(clientId).all();return j({ok:true,items:q.results||[]});}
    if(request.method==='POST'){const b=await request.json().catch(()=>({}));const id=crypto.randomUUID(),now=new Date().toISOString();await env.DB.prepare('INSERT INTO client_content(id,client_id,title,content_type,engine,brief,body,media_key,preview_json,status,client_approved,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,clientId,clean(b.title,240),clean(b.content_type||'social',40),clean(b.engine||'btmedya',40),clean(b.brief,3000),clean(b.body,20000),clean(b.media_key,500),JSON.stringify(b.preview||{}),'draft',0,null,now,now).run();return j({ok:true,id},201);}
  }
  const reviewAdmin=url.pathname.match(/^\/api\/client-hub\/content\/([^/]+)\/review-link$/);
  if(reviewAdmin && request.method==='POST'){
    const contentId=reviewAdmin[1];
    const item=await env.DB.prepare(`SELECT cc.id,cc.client_id,c.name client_name FROM client_content cc JOIN client_workspaces c ON c.id=cc.client_id WHERE cc.id=?`).bind(contentId).first();
    if(!item)return j({ok:false,error:'İçerik bulunamadı'},404);
    const token=randomToken(),hash=await sha256Hex(token),now=new Date(),expires=new Date(now.getTime()+7*86400000).toISOString();
    await env.DB.prepare('INSERT INTO client_review_tokens(id,content_id,token_hash,expires_at,used_at,created_at) VALUES(?,?,?,?,?,?)')
      .bind(crypto.randomUUID(),contentId,hash,expires,null,now.toISOString()).run();
    return j({ok:true,content_id:contentId,client_name:item.client_name,expires_at:expires,url:'/client/review/?token='+encodeURIComponent(token)});
  }

  const reviewPublic=url.pathname.match(/^\/api\/client-hub\/review\/([^/]+)$/);
  if(reviewPublic && (request.method==='GET'||request.method==='POST')){
    const token=decodeURIComponent(reviewPublic[1]);
    if(!token || token.length<40)return j({ok:false,error:'Geçersiz önizleme bağlantısı'},400);
    const hash=await sha256Hex(token);
    const row=await env.DB.prepare(`SELECT t.id token_id,t.expires_at,t.used_at,cc.id,cc.title,cc.content_type,cc.engine,cc.brief,cc.body,cc.media_key,cc.preview_json,cc.status,cc.client_approved,c.name client_name,c.slug client_slug,c.sector,c.logo_url,c.website_url
      FROM client_review_tokens t JOIN client_content cc ON cc.id=t.content_id JOIN client_workspaces c ON c.id=cc.client_id
      WHERE t.token_hash=?`).bind(hash).first();
    if(!row)return j({ok:false,error:'Önizleme bağlantısı bulunamadı'},404);
    if(row.used_at)return j({ok:false,error:'Bu önizleme bağlantısı daha önce kullanılmış'},410);
    if(new Date(row.expires_at).getTime()<Date.now())return j({ok:false,error:'Önizleme bağlantısının süresi dolmuş'},410);
    if(request.method==='GET'){
      let preview={};
      try{preview=JSON.parse(String(row.preview_json||'{}'))||{}}catch{}
      return j({ok:true,review:{
        token_id:row.token_id,expires_at:row.expires_at,
        client:{name:row.client_name,slug:row.client_slug,sector:row.sector,logo_url:row.logo_url,website_url:row.website_url},
        content:{id:row.id,title:row.title,content_type:row.content_type,engine:row.engine,brief:row.brief,body:row.body,media_key:row.media_key,preview,status:row.status,client_approved:row.client_approved}
      }});
    }
    const b=await request.json().catch(()=>({}));
    const decision=String(b.decision||'').toLowerCase();
    if(!['approved','revision','rejected'].includes(decision))return j({ok:false,error:'Geçersiz karar'},400);
    const comment=clean(b.comment,2000);
    const status=decision==='approved'?'approved':decision==='revision'?'revision_requested':'rejected';
    const approved=decision==='approved'?1:0,now=new Date().toISOString();
    await env.DB.prepare('UPDATE client_content SET status=?,client_approved=?,updated_at=? WHERE id=?').bind(status,approved,now,row.id).run();
    await env.DB.prepare('UPDATE client_review_tokens SET used_at=? WHERE id=?').bind(now,row.token_id).run();
    await env.DB.prepare('INSERT INTO client_review_events(id,content_id,decision,comment,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),row.id,decision,comment,now).run();
    return j({ok:true,decision,status,message:decision==='approved'?'İçerik müşteri tarafından onaylandı.':decision==='revision'?'Revizyon talebi kaydedildi.':'İçerik reddedildi.'});
  }

  const cm=url.pathname.match(/^\/api\/client-hub\/content\/([^/]+)$/);
  if(cm&&request.method==='PATCH'){const id=cm[1],b=await request.json().catch(()=>({}));const fields=[],vals=[];for(const k of ['title','content_type','engine','brief','body','media_key','status'])if(k in b){fields.push(k+'=?');vals.push(clean(b[k],k==='body'?20000:k==='brief'?3000:500));}if('preview' in b){fields.push('preview_json=?');vals.push(JSON.stringify(b.preview||{}));}if('client_approved' in b){fields.push('client_approved=?');vals.push(b.client_approved?1:0);}if('published_at' in b){fields.push('published_at=?');vals.push(b.published_at||null);}if(!fields.length)return j({ok:false,error:'Değişiklik yok'},400);fields.push('updated_at=?');vals.push(new Date().toISOString(),id);await env.DB.prepare('UPDATE client_content SET '+fields.join(',')+' WHERE id=?').bind(...vals).run();return j({ok:true,id});}
  const cr=url.pathname.match(/^\/api\/client-hub\/workspace\/([^/]+)\/reference$/);
  if(cr&&request.method==='POST'){const clientId=cr[1],b=await request.json().catch(()=>({})),title=clean(b.title,240);if(!title)return j({ok:false,error:'Referans başlığı gerekli'},400);const id=crypto.randomUUID(),now=new Date().toISOString();const slug=clean(b.slug||title.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),120);await env.DB.prepare('INSERT INTO client_references(id,client_id,title,slug,summary,cover_key,content_ids_json,visibility,featured,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,clientId,title,slug,clean(b.summary,2000),clean(b.cover_key,500),JSON.stringify(Array.isArray(b.content_ids)?b.content_ids:[]),['draft','public'].includes(b.visibility)?b.visibility:'draft',b.featured?1:0,now,now).run();return j({ok:true,id,slug,public_url:'/referanslar/?ref='+encodeURIComponent(slug)});}
  return j({ok:false,error:'Client Hub endpoint bulunamadı'},404);
}

export async function salesApi(request,env,url){
  const hub=await clientHubApi(request,env,url); if(hub)return hub;
  if(!url.pathname.startsWith('/api/sales/')) return null;
  if(!env.DB)return j({ok:false,error:'CRM veritabanı bağlı değil'},503);
  if(url.pathname==='/api/sales/lead' && request.method==='POST'){
    const b=await request.json().catch(()=>null);
    if(!b||!clean(b.name,160)||!clean(b.message,4000)) return j({ok:false,error:'Ad ve proje açıklaması gerekli'},400);
    const now=new Date().toISOString(), id=crypto.randomUUID();
    const source=clean(b.source||'web',80);
    await env.DB.prepare('INSERT INTO sales_leads (id,contact_id,name,email,phone,company,service,budget,message,source,stage,priority,next_action,next_action_at,notes,consent,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id,b.contact_id?Number(b.contact_id):null,clean(b.name,160),clean(b.email,320),clean(b.phone,80),clean(b.company,180),clean(b.service,180),clean(b.budget,120),clean(b.message,4000),source,'new',clean(b.priority||'normal',20),clean(b.next_action,500),b.next_action_at||null,clean(b.notes,2000),b.consent?1:0,now,now).run();
    return j({ok:true,id,stage:'new',message:'Talebiniz satış kuyruğuna alındı.'},201);
  }
  if(!(await session(request,env.ADMIN_SESSION_SECRET_SECRET))) return j({ok:false,error:'Yetkisiz'},401);
  if(url.pathname==='/api/sales/leads' && request.method==='GET'){
    const stage=clean(url.searchParams.get('stage'),30), q=clean(url.searchParams.get('q'),120);
    let sql='SELECT * FROM sales_leads WHERE 1=1', binds=[];
    if(stage&&stages.includes(stage)){sql+=' AND stage=?';binds.push(stage)}
    if(q){sql+=' AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?)';const z='%'+q+'%';binds.push(z,z,z,z)}
    sql+=' ORDER BY CASE priority WHEN "high" THEN 0 WHEN "normal" THEN 1 ELSE 2 END, COALESCE(next_action_at,created_at) ASC LIMIT 200';
    const r=await env.DB.prepare(sql).bind(...binds).all();
    const counts=await env.DB.prepare('SELECT stage,COUNT(*) count FROM sales_leads GROUP BY stage').all();
    return j({ok:true,items:r.results||[],counts:counts.results||[],stages});
  }
  const m=url.pathname.match(/^\/api\/sales\/lead\/([^/]+)$/);
  if(m){
    const id=m[1];
    if(request.method==='PATCH'){
      const b=await request.json().catch(()=>null); if(!b)return j({ok:false,error:'Geçersiz JSON'},400);
      const fields=[],vals=[];
      const map={name:160,email:320,phone:80,company:180,service:180,budget:120,message:4000,priority:20,next_action:500,notes:2000,source:80};
      for(const [k,n] of Object.entries(map)) if(k in b){fields.push(k+'=?');vals.push(clean(b[k],n))}
      if('stage' in b){if(!stages.includes(b.stage))return j({ok:false,error:'Geçersiz aşama'},400);fields.push('stage=?');vals.push(b.stage)}
      if('next_action_at' in b){fields.push('next_action_at=?');vals.push(b.next_action_at||null)}
      if(!fields.length)return j({ok:false,error:'Değişiklik yok'},400);
      fields.push('updated_at=?');vals.push(new Date().toISOString());vals.push(id);
      await env.DB.prepare('UPDATE sales_leads SET '+fields.join(',')+' WHERE id=?').bind(...vals).run();
      return j({ok:true,id});
    }
    if(request.method==='DELETE'){
      await env.DB.prepare('DELETE FROM sales_leads WHERE id=?').bind(id).run();
      return j({ok:true,id});
    }
  }
  return j({ok:false,error:'Sales endpoint bulunamadı'},404);
}
