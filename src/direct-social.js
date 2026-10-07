/* BTMEDYA Direct Social OS
 * Official-provider publishing without a mandatory Metricool subscription.
 * v1: Meta Facebook Pages + Instagram Professional accounts.
 */
const GRAPH_DEFAULT="v26.0";
const META_SCOPES=[
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish"
];
const providers=new Set(["facebook","instagram"]);

const j=(d,s=200,h={})=>new Response(JSON.stringify(d),{
  status:s,
  headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...h}
});
const html=(body,s=200)=>new Response(body,{
  status:s,
  headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}
});
const clean=(v,n=500)=>String(v??"").trim().slice(0,n);
const base64url=(bytes)=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64=(s)=>{s=String(s).replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};

function secret(env){return String(env.SOCIAL_TOKEN_ENCRYPTION_KEY||"");}
function graphVersion(env){return clean(env.META_GRAPH_VERSION||GRAPH_DEFAULT,20);}
function originFrom(request,env){return String(env.BTMEDYA_PUBLIC_ORIGIN||new URL(request.url).origin).replace(/\/$/,"");}

async function hmac(secretValue,message){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secretValue),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return base64url(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message)));
}
async function validSession(request,env){
  const base=String(env.ADMIN_SESSION_SECRET_SECRET||env.ADMIN_SESSION_SECRET||"");
  const s=base ? (env.MEDIA_SIGNING_SECRET ? base+"\u0000"+String(env.MEDIA_SIGNING_SECRET) : base) : "";
  if(!s)return false;
  const c=request.headers.get("cookie")||"";
  const m=c.match(/bt_admin=([^;]+)/);if(!m)return false;
  const [p,sig]=m[1].split(".");if(!p||!sig)return false;
  if((await hmac(s,p))!==sig)return false;
  try{
    let x=unb64(p);return JSON.parse(new TextDecoder().decode(x)).exp>Date.now();
  }catch{return false;}
}
async function stateToken(){
  const b=new Uint8Array(32);crypto.getRandomValues(b);return base64url(b);
}
async function shaBytes(textValue){return await crypto.subtle.digest("SHA-256",new TextEncoder().encode(textValue));}
async function keyFromSecret(env){
  const s=secret(env);if(!s)throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY eksik");
  return crypto.subtle.importKey("raw",await shaBytes(s),{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function encryptSecret(env,value){
  const key=await keyFromSecret(env);
  const iv=new Uint8Array(12);crypto.getRandomValues(iv);
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(String(value)));
  return base64url(iv)+":"+base64url(ct);
}
async function decryptSecret(env,value){
  const raw=String(value||"");if(!raw)return "";
  const [ivS,ctS]=raw.split(":");if(!ivS||!ctS)throw new Error("Şifreli token biçimi geçersiz");
  const key=await keyFromSecret(env);
  const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(ivS)},key,unb64(ctS));
  return new TextDecoder().decode(pt);
}

async function ensureDirectTables(env){
  if(!env.DB)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_direct_connections (
    id TEXT PRIMARY KEY,workspace_type TEXT NOT NULL DEFAULT 'client',workspace_id TEXT NOT NULL,
    provider TEXT NOT NULL,external_id TEXT NOT NULL,account_name TEXT NOT NULL DEFAULT '',
    handle TEXT NOT NULL DEFAULT '',profile_url TEXT NOT NULL DEFAULT '',page_id TEXT NOT NULL DEFAULT '',
    ig_user_id TEXT NOT NULL DEFAULT '',access_token_cipher TEXT NOT NULL DEFAULT '',
    token_expires_at TEXT,scopes_json TEXT NOT NULL DEFAULT '[]',status TEXT NOT NULL DEFAULT 'active',
    last_error TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
    UNIQUE(provider,external_id))`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS social_direct_jobs (
    id TEXT PRIMARY KEY,connection_id TEXT NOT NULL,title TEXT NOT NULL DEFAULT '',body TEXT NOT NULL DEFAULT '',
    media_key TEXT NOT NULL DEFAULT '',scheduled_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,external_id TEXT NOT NULL DEFAULT '',last_error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
    FOREIGN KEY(connection_id) REFERENCES social_direct_connections(id) ON DELETE CASCADE)`).run().catch(()=>{});
}

async function graph(env,path,opts={}){
  const url="https://graph.facebook.com/"+graphVersion(env)+path;
  const method=opts.method||"GET";
  const headers={"content-type":"application/x-www-form-urlencoded",...(opts.headers||{})};
  let init={method,headers};
  if(opts.body instanceof URLSearchParams)init.body=opts.body;
  else if(opts.body){init.body=new URLSearchParams(Object.entries(opts.body));}
  const r=await fetch(url,init);
  const raw=await r.text();let data={};try{data=JSON.parse(raw);}catch{data={raw};}
  if(!r.ok)throw new Error(String(data?.error?.message||data?.raw||("Meta API HTTP "+r.status)).slice(0,1000));
  return data;
}

function metaRedirect(env,request){
  const redirect=String(env.META_OAUTH_REDIRECT_URI||originFrom(request,env)+"/api/social/direct/meta/callback");
  return redirect;
}
function validWorkspaceType(x){return x==="agency"||x==="client";}
async function workspaceExists(env,type,id){
  if(type==="agency")return id==="btmedya";
  return Boolean(await env.DB.prepare("SELECT id FROM client_workspaces WHERE id=? AND status='active'").bind(id).first().catch(()=>null));
}

async function startMeta(request,env,url){
  if(!(await validSession(request,env)))return j({ok:false,error:"Yetkisiz"},401);
  if(!env.KV)return j({ok:false,error:"KV gerekli"},503);
  if(!env.META_APP_ID)return j({ok:false,error:"META_APP_ID yapılandırılmamış"},503);
  if(!secret(env))return j({ok:false,error:"SOCIAL_TOKEN_ENCRYPTION_KEY yapılandırılmamış"},503);
  const type=validWorkspaceType(url.searchParams.get("workspace_type"))?url.searchParams.get("workspace_type"):"agency";
  const id=clean(url.searchParams.get("workspace_id")||"btmedya",120);
  if(!(await workspaceExists(env,type,id)))return j({ok:false,error:"Çalışma alanı bulunamadı"},404);
  const state=await stateToken();
  const payload={workspace_type:type,workspace_id:id,return_to:clean(url.searchParams.get("return_to")||"/admin/social-os/",300),created_at:Date.now()};
  await env.KV.put("social:oauth:meta:"+state,JSON.stringify(payload),{expirationTtl:600});
  const q=new URLSearchParams({
    client_id:String(env.META_APP_ID),
    redirect_uri:metaRedirect(env,request),
    state,
    response_type:"code",
    scope:META_SCOPES.join(",")
  });
  return Response.redirect("https://www.facebook.com/"+graphVersion(env)+"/dialog/oauth?"+q.toString(),302);
}

async function upsertConnection(env,row){
  const now=new Date().toISOString();
  const cipher=await encryptSecret(env,row.accessToken);
  const id=crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO social_direct_connections
    (id,workspace_type,workspace_id,provider,external_id,account_name,handle,profile_url,page_id,ig_user_id,access_token_cipher,token_expires_at,scopes_json,status,last_error,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(provider,external_id) DO UPDATE SET
      workspace_type=excluded.workspace_type,workspace_id=excluded.workspace_id,account_name=excluded.account_name,
      handle=excluded.handle,profile_url=excluded.profile_url,page_id=excluded.page_id,ig_user_id=excluded.ig_user_id,
      access_token_cipher=excluded.access_token_cipher,token_expires_at=excluded.token_expires_at,
      scopes_json=excluded.scopes_json,status='active',last_error='',updated_at=excluded.updated_at`)
    .bind(id,row.workspace_type,row.workspace_id,row.provider,row.external_id,row.account_name,row.handle,row.profile_url,row.page_id,row.ig_user_id,cipher,row.tokenExpiresAt||null,JSON.stringify(row.scopes||[]),"active","",now,now).run();
}

async function metaCallback(request,env,url){
  if(!env.KV)return html("<h2>BTMEDYA Social OS</h2><p>KV yapılandırılmamış.</p>",503);
  const state=clean(url.searchParams.get("state"),200),code=clean(url.searchParams.get("code"),500);
  if(!state||!code)return html("<h2>Bağlantı tamamlanamadı</h2><p>Meta yetkilendirmesi iptal edildi veya kod dönmedi.</p>",400);
  const raw=await env.KV.get("social:oauth:meta:"+state);await env.KV.delete("social:oauth:meta:"+state).catch(()=>{});
  if(!raw)return html("<h2>Bağlantı süresi doldu</h2><p>Panelden yeniden bağlantı başlatın.</p>",400);
  const meta=JSON.parse(raw);
  try{
    const redirect_uri=metaRedirect(env,request);
    const short=await graph(env,"/oauth/access_token",{method:"POST",body:{
      client_id:String(env.META_APP_ID),client_secret:String(env.META_APP_SECRET||""),
      redirect_uri,code
    }});
    if(!short.access_token)throw new Error("Meta erişim anahtarı alınamadı");
    let userToken=short.access_token;
    try{
      const r=await fetch("https://graph.facebook.com/"+graphVersion(env)+"/oauth/access_token?grant_type=fb_exchange_token&client_id="+encodeURIComponent(String(env.META_APP_ID))+"&client_secret="+encodeURIComponent(String(env.META_APP_SECRET||""))+"&fb_exchange_token="+encodeURIComponent(short.access_token));
      const x=await r.json().catch(()=>({}));if(r.ok&&x.access_token)userToken=x.access_token;
    }catch{}
    const pages=await graph(env,"/me/accounts?fields=id,name,access_token,tasks,instagram_business_account&access_token="+encodeURIComponent(userToken));
    const data=Array.isArray(pages.data)?pages.data:[];
    if(!data.length)throw new Error("Bu Meta hesabında erişilebilir Facebook Page bulunamadı.");
    const added=[];
    for(const page of data){
      const pageToken=String(page.access_token||userToken);
      const pageId=String(page.id||"");if(!pageId)continue;
      await upsertConnection(env,{
        workspace_type:meta.workspace_type,workspace_id:meta.workspace_id,provider:"facebook",
        external_id:pageId,account_name:String(page.name||pageId),
        handle:String(page.name||pageId),profile_url:"https://www.facebook.com/"+pageId,
        page_id:pageId,ig_user_id:"",accessToken:pageToken,scopes:META_SCOPES
      });
      added.push({provider:"facebook",name:page.name||pageId,id:pageId});
      const ig=page.instagram_business_account?.id;
      if(ig){
        let igName=ig;
        try{const info=await graph(env,"/"+encodeURIComponent(String(ig))+"?fields=id,username,name&access_token="+encodeURIComponent(pageToken));igName=info.username||info.name||ig;}catch{}
        await upsertConnection(env,{
          workspace_type:meta.workspace_type,workspace_id:meta.workspace_id,provider:"instagram",
          external_id:String(ig),account_name:String(igName),handle:String(igName),
          profile_url:"https://www.instagram.com/"+encodeURIComponent(String(igName).replace(/^@/,""))+"/",
          page_id:pageId,ig_user_id:String(ig),accessToken:pageToken,scopes:META_SCOPES
        });
        added.push({provider:"instagram",name:igName,id:String(ig)});
      }
    }
    return html(`<main style="font:16px system-ui;max-width:720px;margin:60px auto;padding:24px"><h1>BTMEDYA Social OS</h1><h2>Meta bağlantısı tamamlandı</h2><p>${added.length} hesap çalışma alanına eklendi.</p><pre>${JSON.stringify(added,null,2).replace(/</g,"&lt;")}</pre><p><a href="${clean(meta.return_to||"/admin/social-os/",300)}">Panele dön</a></p></main>`);
  }catch(e){
    return html(`<main style="font:16px system-ui;max-width:720px;margin:60px auto;padding:24px"><h1>BTMEDYA Social OS</h1><h2>Meta bağlantısı başarısız</h2><p>${clean(e?.message||e,1000).replace(/</g,"&lt;")}</p><p><a href="${clean(meta.return_to||"/admin/social-os/",300)}">Panele dön</a></p></main>`,400);
  }
}

function mediaPublicUrl(env,key){
  const k=String(key||"");
  if(!k)return "";
  const origin=String(env.BTMEDYA_PUBLIC_ORIGIN||"https://btmedya.com.tr").replace(/\/$/,"");
  if(k.startsWith("static/"))return origin+"/assets/"+k.slice(7);
  if(k.startsWith("otomasyon/"))return origin+"/gorsel/"+k;
  return origin+"/pub/"+encodeURIComponent(k);
}

function isVideoKey(key){return /\.(mp4|mov|m4v|webm)$/i.test(String(key||""));}

async function publishFacebook(env,conn,job,token){
  const textValue=String(job.body||job.title||"").slice(0,63206);
  const page=encodeURIComponent(String(conn.page_id));
  const mediaUrl=mediaPublicUrl(env,job.media_key);
  if(mediaUrl && !isVideoKey(job.media_key)){
    const d=await graph(env,"/"+page+"/photos",{method:"POST",body:{url:mediaUrl,message:textValue,access_token:token}});
    return String(d.post_id||d.id||"");
  }
  if(mediaUrl && isVideoKey(job.media_key)){
    const d=await graph(env,"/"+page+"/videos",{method:"POST",body:{file_url:mediaUrl,description:textValue,access_token:token}});
    return String(d.id||"");
  }
  const d=await graph(env,"/"+page+"/feed",{method:"POST",body:{message:textValue,access_token:token}});
  return String(d.id||"");
}

async function publishInstagram(env,conn,job,token){
  const mediaUrl=mediaPublicUrl(env,job.media_key);
  if(!mediaUrl)return Promise.reject(new Error("Instagram için görsel/video gerekli."));
  const caption=String(job.body||job.title||"").slice(0,2200);
  const video=isVideoKey(job.media_key);
  const body={
    caption,access_token:token,
    ...(video?{media_type:"REELS",video_url:mediaUrl}:{image_url:mediaUrl})
  };
  const container=await graph(env,"/"+encodeURIComponent(conn.ig_user_id)+"/media",{method:"POST",body});
  const creationId=String(container.id||"");if(!creationId)throw new Error("Instagram medya kapsayıcısı oluşturulamadı.");
  if(video){
    for(let i=0;i<8;i++){
      await new Promise(r=>setTimeout(r,2500));
      const st=await graph(env,"/"+creationId+"?fields=status_code,status&access_token="+encodeURIComponent(token));
      if(st.status_code==="FINISHED"||String(st.status||"").toLowerCase().includes("finished"))break;
      if(["ERROR","EXPIRED"].includes(String(st.status_code||"")))throw new Error("Instagram video işleme hatası: "+String(st.status||st.status_code));
      if(i===7)throw new Error("Instagram video işleme süresi aşıldı; job yeniden denenecek.");
    }
  }
  const pub=await graph(env,"/"+encodeURIComponent(conn.ig_user_id)+"/media_publish",{method:"POST",body:{creation_id:creationId,access_token:token}});
  return String(pub.id||"");
}

async function publishJob(env,conn,job){
  const token=await decryptSecret(env,conn.access_token_cipher);
  if(conn.provider==="facebook")return publishFacebook(env,conn,job,token);
  if(conn.provider==="instagram")return publishInstagram(env,conn,job,token);
  throw new Error("Desteklenmeyen sağlayıcı: "+conn.provider);
}

export async function processDirectSocialQueue(env,limit=10){
  if(!env.DB||!env.META_APP_ID||!env.META_APP_SECRET||!secret(env))return {enabled:false,processed:0,published:0,failed:0};
  await ensureDirectTables(env);
  const now=new Date().toISOString();
  const rows=(await env.DB.prepare(`SELECT j.*,c.provider,c.external_id,c.account_name,c.page_id,c.ig_user_id,c.access_token_cipher,c.status AS connection_status
    FROM social_direct_jobs j JOIN social_direct_connections c ON c.id=j.connection_id
    WHERE j.status='queued' AND j.scheduled_at<=? AND c.status='active'
    ORDER BY j.scheduled_at ASC LIMIT ?`).bind(now,Math.max(1,Number(limit)||10)).all()).results||[];
  const result={enabled:true,processed:0,published:0,failed:0,items:[]};
  for(const job of rows){
    result.processed++;
    const attempts=Number(job.attempts||0)+1;
    await env.DB.prepare("UPDATE social_direct_jobs SET status='publishing',attempts=?,updated_at=? WHERE id=?").bind(attempts,new Date().toISOString(),job.id).run();
    try{
      const externalId=await publishJob(env,job,job);
      await env.DB.prepare("UPDATE social_direct_jobs SET status='published',external_id=?,last_error='',updated_at=? WHERE id=?").bind(externalId,new Date().toISOString(),job.id).run();
      await env.DB.prepare("UPDATE social_direct_connections SET last_error='',updated_at=? WHERE id=?").bind(new Date().toISOString(),job.connection_id).run();
      result.published++;result.items.push({id:job.id,status:"published",externalId});
    }catch(e){
      const msg=clean(e?.message||e,1500);
      const terminal=attempts>=5;
      await env.DB.prepare("UPDATE social_direct_jobs SET status=?,last_error=?,updated_at=? WHERE id=?").bind(terminal?"error":"queued",msg,new Date().toISOString(),job.id).run();
      await env.DB.prepare("UPDATE social_direct_connections SET last_error=?,status=?,updated_at=? WHERE id=?").bind(msg,terminal?"error":"active",new Date().toISOString(),job.connection_id).run();
      result.failed++;result.items.push({id:job.id,status:terminal?"error":"retry",error:msg,attempts});
    }
  }
  return result;
}

async function apiAccounts(request,env,url){
  if(!(await validSession(request,env)))return j({ok:false,error:"Yetkisiz"},401);
  await ensureDirectTables(env);
  const type=validWorkspaceType(url.searchParams.get("workspace_type"))?url.searchParams.get("workspace_type"):"";
  const id=clean(url.searchParams.get("workspace_id"),120);
  let sql="SELECT id,workspace_type,workspace_id,provider,external_id,account_name,handle,profile_url,page_id,ig_user_id,token_expires_at,status,last_error,created_at,updated_at FROM social_direct_connections WHERE 1=1";
  const binds=[];
  if(type){sql+=" AND workspace_type=?";binds.push(type);}
  if(id){sql+=" AND workspace_id=?";binds.push(id);}
  const r=await env.DB.prepare(sql+" ORDER BY provider,account_name").bind(...binds).all();
  return j({ok:true,items:r.results||[],meta:{provider:"Meta Direct",subscription_required:false}});
}

async function apiSchedule(request,env){
  if(!(await validSession(request,env)))return j({ok:false,error:"Yetkisiz"},401);
  await ensureDirectTables(env);
  const b=await request.json().catch(()=>({}));
  const ids=Array.isArray(b.connection_ids)?[...new Set(b.connection_ids.map(x=>clean(x,120)).filter(Boolean))]:[];
  if(!ids.length)return j({ok:false,error:"En az bir hesap seçin"},400);
  const title=clean(b.title,240),body=clean(b.body||title,63206),mediaKey=clean(b.media_key,500);
  let scheduled=new Date(b.scheduled_at||Date.now()+10*60*1000);
  if(Number.isNaN(scheduled.getTime()))return j({ok:false,error:"Geçersiz yayın zamanı"},400);
  if(scheduled.getTime()<Date.now()+30000)scheduled=new Date(Date.now()+30000);
  const q=await env.DB.prepare(`SELECT * FROM social_direct_connections WHERE id IN (${ids.map(()=>"?").join(",")}) AND status='active'`).bind(...ids).all();
  const rows=q.results||[];if(!rows.length)return j({ok:false,error:"Seçili hesap bulunamadı"},404);
  const now=new Date().toISOString(),jobs=[];
  for(const c of rows){
    const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO social_direct_jobs(id,connection_id,title,body,media_key,scheduled_at,status,attempts,external_id,last_error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id,c.id,title,body,mediaKey,scheduled.toISOString(),"queued",0,"","",now,now).run();
    jobs.push({id,connection_id:c.id,provider:c.provider,account_name:c.account_name,scheduled_at:scheduled.toISOString()});
  }
  return j({ok:true,items:jobs},201);
}

async function apiJobs(request,env,url){
  if(!(await validSession(request,env)))return j({ok:false,error:"Yetkisiz"},401);
  await ensureDirectTables(env);
  const q=await env.DB.prepare(`SELECT j.id,j.connection_id,j.title,j.body,j.media_key,j.scheduled_at,j.status,j.attempts,j.external_id,j.last_error,j.created_at,j.updated_at,
    c.provider,c.account_name,c.handle
    FROM social_direct_jobs j JOIN social_direct_connections c ON c.id=j.connection_id
    ORDER BY j.scheduled_at DESC LIMIT 200`).all();
  return j({ok:true,items:q.results||[]});
}

export async function directSocialApi(request,env,url){
  if(!url.pathname.startsWith("/api/social/direct/"))return null;
  if(url.pathname==="/api/social/direct/meta/callback" && request.method==="GET")return metaCallback(request,env,url);
  if(url.pathname==="/api/social/direct/meta/start" && request.method==="GET")return startMeta(request,env,url);
  if(url.pathname==="/api/social/direct/accounts" && request.method==="GET")return apiAccounts(request,env,url);
  if(url.pathname==="/api/social/direct/schedule" && request.method==="POST")return apiSchedule(request,env);
  if(url.pathname==="/api/social/direct/jobs" && request.method==="GET")return apiJobs(request,env,url);
  if(url.pathname==="/api/social/direct/health" && request.method==="GET"){
    const configured=Boolean(env.META_APP_ID&&env.META_APP_SECRET&&secret(env));
    return j({ok:true,configured,provider:"Meta Direct",subscription_required:false,supported:["facebook-page","instagram-professional"],limitations:[
      "Facebook kişisel profil paylaşımı resmi Graph API üzerinden bu uygulamada desteklenmez.",
      "Instagram consumer/personal hesaplar resmi yayın API'sine dahil değildir; Professional (Business/Creator) gerekir."
    ]});
  }
  return j({ok:false,error:"Direct Social endpoint bulunamadı"},404);
}
