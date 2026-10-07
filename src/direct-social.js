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
const BTMEDYA_SOCIAL_PROVIDERS={
  facebook:{label:"Facebook",mode:"direct",connect:"meta",requirement:"Facebook Page + Meta OAuth",publishing:true},
  instagram:{label:"Instagram",mode:"direct",connect:"meta",requirement:"Instagram Professional + Meta OAuth",publishing:true},
  tiktok:{label:"TikTok",mode:"oauth",connect:"tiktok",requirement:"TikTok Content Posting API + video.publish onay",publishing:false},
  youtube:{label:"YouTube",mode:"oauth",connect:"google",requirement:"Google OAuth + youtube.upload",publishing:false},
  x:{label:"X",mode:"oauth",connect:"x",requirement:"X Developer App + API erişimi",publishing:false},
  whatsapp:{label:"WhatsApp",mode:"cloud",connect:"meta-whatsapp",requirement:"Meta Business + WhatsApp Business Account",publishing:false}
};

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
export async function validSession(request,env){
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
export async function decryptSecret(env,value){
  const raw=String(value||"");if(!raw)return "";
  const [ivS,ctS]=raw.split(":");if(!ivS||!ctS)throw new Error("Şifreli token biçimi geçersiz");
  const key=await keyFromSecret(env);
  const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(ivS)},key,unb64(ctS));
  return new TextDecoder().decode(pt);
}

export async function saveOAuthConnection(env,{workspace_type="company",workspace_id="btmedya",provider,external_id,account_name="",handle="",profile_url="",token,scopes=[],token_expires_at=null}){ 
  await ensureDirectTables(env);
  if(!env.DB) throw new Error("D1 bağlantısı yok");
  const cipher=await encryptSecret(env,JSON.stringify(token||{}));
  const id=crypto.randomUUID(); const now=new Date().toISOString();
  const existing=await env.DB.prepare("SELECT id FROM social_direct_connections WHERE workspace_type=? AND workspace_id=? AND provider=? AND external_id=? LIMIT 1").bind(workspace_type,workspace_id,provider,external_id).first();
  if(existing?.id){
    await env.DB.prepare("UPDATE social_direct_connections SET account_name=?,handle=?,profile_url=?,access_token_cipher=?,token_expires_at=?,scopes_json=?,status='active',last_error='',updated_at=? WHERE id=?").bind(account_name,handle,profile_url,cipher,token_expires_at,JSON.stringify(scopes||[]),now,existing.id).run();
    return existing.id;
  }
  await env.DB.prepare("INSERT INTO social_direct_connections(id,workspace_type,workspace_id,provider,external_id,account_name,handle,profile_url,access_token_cipher,token_expires_at,scopes_json,status,last_error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,workspace_type,workspace_id,provider,external_id,account_name,handle,profile_url,cipher,token_expires_at,JSON.stringify(scopes||[]),"active","",now,now).run();
  return id;
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
    ON CONFLICT(workspace_type,workspace_id,provider,external_id) DO UPDATE SET
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

async function refreshTikTokToken(env,conn,obj){
  if(!obj?.refresh_token||!env.TIKTOK_CLIENT_KEY||!env.TIKTOK_CLIENT_SECRET)return obj;
  const r=await fetch("https://open.tiktokapis.com/v2/oauth/token/",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_key:env.TIKTOK_CLIENT_KEY,client_secret:env.TIKTOK_CLIENT_SECRET,grant_type:"refresh_token",refresh_token:obj.refresh_token})});
  const x=await r.json(); if(!x.access_token)throw new Error("TikTok erişim anahtarı yenilenemedi");
  const merged={...obj,...x}; await env.DB.prepare("UPDATE social_direct_connections SET access_token_cipher=?,token_expires_at=?,updated_at=? WHERE id=?").bind(await encryptSecret(env,JSON.stringify(merged)),new Date(Date.now()+Number(x.expires_in||86400)*1000).toISOString(),new Date().toISOString(),conn.id).run(); return merged;
}
async function publishTikTok(env,conn,job,obj){
  let token=obj;
  if(conn.token_expires_at && new Date(conn.token_expires_at).getTime()<Date.now()+300000)token=await refreshTikTokToken(env,conn,obj);
  const videoUrl=mediaPublicUrl(env,job.media_key); if(!videoUrl||!isVideoKey(job.media_key))throw new Error("TikTok Direct Post için video dosyası gerekli.");
  const cr=await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/",{method:"POST",headers:{Authorization:"Bearer "+token.access_token,"content-type":"application/json"}});
  const ci=await cr.json(); const options=ci?.data?.privacy_level_options||[]; if(!options.length)throw new Error("TikTok creator izinleri okunamadı.");
  const privacy=options.includes("PUBLIC_TO_EVERYONE")?"PUBLIC_TO_EVERYONE":options[0];
  const rr=await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/",{method:"POST",headers:{Authorization:"Bearer "+token.access_token,"content-type":"application/json"},body:JSON.stringify({post_info:{title:String(job.title||"").slice(0,150),privacy_level:privacy,disable_duet:false,disable_comment:false,disable_stitch:false},source_info:{source:"PULL_FROM_URL",video_url:videoUrl}})});
  const init=await rr.json(); if(!rr.ok||!init?.data?.publish_id)throw new Error("TikTok yayın başlatılamadı");
  const publishId=init.data.publish_id;
  for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,3000));const sr=await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/",{method:"POST",headers:{Authorization:"Bearer "+token.access_token,"content-type":"application/json"},body:JSON.stringify({publish_id:publishId})});const st=await sr.json();const status=String(st?.data?.status||"").toUpperCase();if(status==="PUBLISH_COMPLETE")return publishId;if(["FAILED","CANCELED"].includes(status))throw new Error("TikTok yayın durumu: "+status);}
  throw new Error("TikTok yayın durumunun tamamlanması zaman aşımına uğradı.");
}
async function refreshGoogleToken(env,conn,obj){
  if(!obj?.refresh_token||!env.YOUTUBE_CLIENT_ID)return obj;
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:env.YOUTUBE_CLIENT_ID,client_secret:env.YOUTUBE_CLIENT_SECRET,refresh_token:obj.refresh_token,grant_type:"refresh_token"})});
  const x=await r.json(); if(!x.access_token)throw new Error("YouTube erişim anahtarı yenilenemedi");
  const merged={...obj,access_token:x.access_token,expires_in:x.expires_in}; await env.DB.prepare("UPDATE social_direct_connections SET access_token_cipher=?,token_expires_at=?,updated_at=? WHERE id=?").bind(await encryptSecret(env,JSON.stringify(merged)),new Date(Date.now()+Number(x.expires_in||3600)*1000).toISOString(),new Date().toISOString(),conn.id).run(); return merged;
}
async function publishYouTube(env,conn,job,obj){
  let token=obj;if(conn.token_expires_at&&new Date(conn.token_expires_at).getTime()<Date.now()+300000)token=await refreshGoogleToken(env,conn,obj);
  if(!env.MEDIA)throw new Error("R2 medya kasası bağlı değil"); const object=await env.MEDIA.get(job.media_key);if(!object?.body)throw new Error("YouTube medya dosyası bulunamadı.");
  const bytes=String(object.size||""); const mime=object.httpMetadata?.contentType||"video/mp4";
  const metadata={snippet:{title:String(job.title||"BTMEDYA video").slice(0,100),description:String(job.body||"").slice(0,5000),categoryId:"22"},status:{privacyStatus:String(env.YOUTUBE_DEFAULT_PRIVACY_STATUS||"private")}};
  const init=await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",{method:"POST",headers:{Authorization:"Bearer "+token.access_token,"Content-Type":"application/json","X-Upload-Content-Type":mime,...(bytes?{"X-Upload-Content-Length":bytes}: {})},body:JSON.stringify(metadata)});
  if(!init.ok)throw new Error("YouTube yükleme oturumu oluşturulamadı");
  const location=init.headers.get("location");if(!location)throw new Error("YouTube upload URL dönmedi");
  const up=await fetch(location,{method:"PUT",headers:{"Content-Type":mime},body:object.body});const out=await up.json().catch(()=>({}));if(!up.ok)throw new Error("YouTube video yüklenemedi");
  return String(out.id||"");
}
async function refreshXToken(env,conn,obj){
  if(!obj?.refresh_token||!env.X_CLIENT_ID)return obj;
  const r=await fetch("https://api.x.com/2/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+btoa(String(env.X_CLIENT_ID)+":"+String(env.X_CLIENT_SECRET||"")),"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({refresh_token:obj.refresh_token,grant_type:"refresh_token",client_id:env.X_CLIENT_ID})});
  const x=await r.json();if(!x.access_token)throw new Error("X erişim anahtarı yenilenemedi");const merged={...obj,...x};await env.DB.prepare("UPDATE social_direct_connections SET access_token_cipher=?,token_expires_at=?,updated_at=? WHERE id=?").bind(await encryptSecret(env,JSON.stringify(merged)),new Date(Date.now()+Number(x.expires_in||7200)*1000).toISOString(),new Date().toISOString(),conn.id).run();return merged;
}
async function publishX(env,conn,job,obj){
  let token=obj;if(conn.token_expires_at&&new Date(conn.token_expires_at).getTime()<Date.now()+300000)token=await refreshXToken(env,conn,obj);
  const textValue=String(job.body||job.title||"").trim().slice(0,280);if(!textValue)throw new Error("X paylaşımı için metin gerekli.");
  const rr=await fetch("https://api.x.com/2/tweets",{method:"POST",headers:{Authorization:"Bearer "+token.access_token,"content-type":"application/json"},body:JSON.stringify({text:textValue})});const out=await rr.json();if(!rr.ok)throw new Error("X yayın hatası");return String(out?.data?.id||"");
}
async function publishJob(env,conn,job){
  const raw=await decryptSecret(env,conn.access_token_cipher);
  if(conn.provider==="facebook")return publishFacebook(env,conn,job,raw);
  if(conn.provider==="instagram")return publishInstagram(env,conn,job,raw);
  if(conn.provider==="tiktok")return publishTikTok(env,conn,job,JSON.parse(raw));
  if(conn.provider==="youtube")return publishYouTube(env,conn,job,JSON.parse(raw));
  if(conn.provider==="x")return publishX(env,conn,job,JSON.parse(raw));
  throw new Error("Desteklenmeyen sağlayıcı: "+conn.provider);
}

export async function processDirectSocialQueue(env,limit=10){
  if(!env.DB||!secret(env))return {enabled:false,processed:0,published:0,failed:0};
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

async function apiProviders(request,env){
  if(!(await validSession(request,env)))return j({ok:false,error:"Yetkisiz"},401);
  const metaMissing=[];
  const ttMissing=[]; if(!String(env.TIKTOK_CLIENT_KEY||"").trim())ttMissing.push("TIKTOK_CLIENT_KEY"); if(!String(env.TIKTOK_CLIENT_SECRET||"").trim())ttMissing.push("TIKTOK_CLIENT_SECRET");
  const ytMissing=[]; if(!String(env.YOUTUBE_CLIENT_ID||"").trim())ytMissing.push("YOUTUBE_CLIENT_ID"); if(!String(env.YOUTUBE_CLIENT_SECRET||"").trim())ytMissing.push("YOUTUBE_CLIENT_SECRET");
  const xMissing=[]; if(!String(env.X_CLIENT_ID||"").trim())xMissing.push("X_CLIENT_ID");
  const waMissing=[]; if(!String(env.WHATSAPP_ACCESS_TOKEN||"").trim())waMissing.push("WHATSAPP_ACCESS_TOKEN"); if(!String(env.WHATSAPP_PHONE_NUMBER_ID||"").trim())waMissing.push("WHATSAPP_PHONE_NUMBER_ID");
  if(!String(env.META_APP_ID||"").trim())metaMissing.push("META_APP_ID");
  if(!String(env.META_APP_SECRET||"").trim())metaMissing.push("META_APP_SECRET");
  if(!secret(env))metaMissing.push("SOCIAL_TOKEN_ENCRYPTION_KEY");
  if(!env.KV)metaMissing.push("KV");
  return j({ok:true,providers:Object.entries(BTMEDYA_SOCIAL_PROVIDERS).map(([id,p])=>({
    id,...p,
    ready:id==="facebook"||id==="instagram"?metaMissing.length===0:id==="tiktok"?ttMissing.length===0:id==="youtube"?ytMissing.length===0:id==="x"?xMissing.length===0:id==="whatsapp"?waMissing.length===0:false,
    missing:id==="facebook"||id==="instagram"?metaMissing:id==="tiktok"?ttMissing:id==="youtube"?ytMissing:id==="x"?xMissing:id==="whatsapp"?waMissing:[]
  }))});
}

export async function directSocialApi(request,env,url){
  if(!url.pathname.startsWith("/api/social/direct/"))return null;
  if(url.pathname==="/api/social/direct/providers" && request.method==="GET")return apiProviders(request,env);
  if(url.pathname==="/api/social/direct/meta/callback" && request.method==="GET")return metaCallback(request,env,url);
  if(url.pathname==="/api/social/direct/meta/start" && request.method==="GET")return startMeta(request,env,url);
  if(url.pathname==="/api/social/direct/accounts" && request.method==="GET")return apiAccounts(request,env,url);
  if(url.pathname==="/api/social/direct/schedule" && request.method==="POST")return apiSchedule(request,env);
  if(url.pathname==="/api/social/direct/jobs" && request.method==="GET")return apiJobs(request,env,url);
  if(url.pathname==="/api/social/direct/health" && request.method==="GET"){
    const missing=[];
    if(!String(env.META_APP_ID||"").trim()) missing.push("META_APP_ID");
    if(!String(env.META_APP_SECRET||"").trim()) missing.push("META_APP_SECRET");
    if(!secret(env)) missing.push("SOCIAL_TOKEN_ENCRYPTION_KEY");
    if(!env.KV) missing.push("KV");
    if(!env.DB) missing.push("DB");
    const configured=missing.length===0;
    return j({ok:true,configured,provider:"Meta Direct",subscription_required:false,
      setup:{ready:configured,missing,oauth_callback:String(env.META_OAUTH_REDIRECT_URI||"otomatik: /api/social/direct/meta/callback")},
      supported:["facebook-page","instagram-professional"],
      limitations:[
        "Facebook kişisel profil paylaşımı resmi Graph API üzerinden bu uygulamada desteklenmez.",
        "Instagram consumer/personal hesaplar resmi yayın API'sine dahil değildir; Professional (Business/Creator) gerekir."
      ]});
  }
  return j({ok:false,error:"Direct Social endpoint bulunamadı"},404);
}
