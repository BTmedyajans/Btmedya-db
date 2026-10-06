/* BTMEDYA Native Social Gateway
 * First-party social publishing without Metricool as a runtime dependency.
 *
 * Providers: Instagram Professional, Facebook Pages, TikTok Direct Post,
 * YouTube Data API, LinkedIn Posts API.
 *
 * Secrets are encrypted at rest with SOCIAL_CREDENTIALS_SECRET.
 * Platform app credentials remain Worker Secrets and are never stored in D1.
 */
const NETWORKS=new Set(["instagram","facebook","tiktok","youtube","linkedin"]);
const META_VERSION=()=>String(globalThis.__BTMEDYA_META_VERSION||"v26.0");

function now(){return new Date().toISOString()}
function j(x){try{return JSON.stringify(x||{})}catch{return "{}"}}
function parse(x,f=[]){try{const v=JSON.parse(x||"");return v}catch{return f}}
function b64u(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function ub64u(s){let x=String(s||"").replace(/-/g,"+").replace(/_/g,"/");while(x.length%4)x+="=";return Uint8Array.from(atob(x),c=>c.charCodeAt(0))}
async function keyFor(secret){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(secret||"")));
  return crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function encryptSecret(secret,value){
  if(!secret||!value)return "";
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await keyFor(secret);
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(String(value)));
  const out=new Uint8Array(iv.length+ct.byteLength);out.set(iv);out.set(new Uint8Array(ct),iv.length);
  return b64u(out);
}
async function decryptSecret(secret,value){
  if(!secret||!value)return "";
  try{
    const raw=ub64u(value),iv=raw.slice(0,12),ct=raw.slice(12);
    const key=await keyFor(secret);
    return new TextDecoder().decode(await crypto.subtle.decrypt({name:"AES-GCM",iv},key,ct));
  }catch{return ""}
}
async function ensureNativeSocialTables(env){
  if(!env?.DB)return {ok:false,error:"D1 veritabanı bağlı değil"};
  const q=[
    \`CREATE TABLE IF NOT EXISTS native_social_accounts (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL DEFAULT '', scope TEXT NOT NULL DEFAULT 'company',
      network TEXT NOT NULL, handle TEXT NOT NULL DEFAULT '', external_id TEXT NOT NULL DEFAULT '',
      token_enc TEXT NOT NULL DEFAULT '', refresh_token_enc TEXT NOT NULL DEFAULT '', token_expires_at TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'connected',
      last_error TEXT NOT NULL DEFAULT '', last_used_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(client_id,network,handle)
    )\`,
    \`CREATE TABLE IF NOT EXISTS native_social_deliveries (
      post_id TEXT NOT NULL, account_id TEXT NOT NULL, network TEXT NOT NULL,
      remote_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, error TEXT NOT NULL DEFAULT '',
      attempts INTEGER NOT NULL DEFAULT 0, response_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(post_id,account_id)
    )\`,
    \`CREATE TABLE IF NOT EXISTS native_social_oauth_states (
      state TEXT PRIMARY KEY, network TEXT NOT NULL, client_id TEXT NOT NULL DEFAULT '',
      return_to TEXT NOT NULL DEFAULT '/admin/native-social/', created_at TEXT NOT NULL, expires_at TEXT NOT NULL
    )\`,
    "CREATE INDEX IF NOT EXISTS idx_native_social_accounts_client ON native_social_accounts(client_id,status)",
    "CREATE INDEX IF NOT EXISTS idx_native_social_accounts_network ON native_social_accounts(network,status)",
    "CREATE INDEX IF NOT EXISTS idx_native_social_deliveries_status ON native_social_deliveries(status,updated_at)",
    "CREATE INDEX IF NOT EXISTS idx_native_social_oauth_expiry ON native_social_oauth_states(expires_at)"
  ];
  for(const sql of q)await env.DB.prepare(sql).run().catch(()=>{});
  return {ok:true};
}
function appConfigured(env,network){
  if(network==="instagram")return Boolean(env.INSTAGRAM_APP_ID&&env.INSTAGRAM_APP_SECRET);
  if(network==="facebook")return Boolean(env.META_APP_ID&&env.META_APP_SECRET);
  if(network==="tiktok")return Boolean(env.TIKTOK_CLIENT_KEY&&env.TIKTOK_CLIENT_SECRET);
  if(network==="youtube")return Boolean(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET);
  if(network==="linkedin")return Boolean(env.LINKEDIN_CLIENT_ID&&env.LINKEDIN_CLIENT_SECRET);
  return false;
}
function redirectUri(request,network){
  const u=new URL(request.url);u.pathname="/api/native-social/oauth/"+network+"/callback";u.search="";return u.toString()
}
function oauthScope(network){
  if(network==="instagram")return "instagram_business_basic,instagram_business_content_publish";
  if(network==="facebook")return "pages_show_list,pages_manage_posts,pages_read_engagement";
  if(network==="tiktok")return "user.info.basic,video.publish,video.upload";
  if(network==="youtube")return "https://www.googleapis.com/auth/youtube.upload";
  if(network==="linkedin")return "openid,profile,w_member_social";
  return "";
}
function authUrl(request,env,network,state){
  const redirect=redirectUri(request,network);
  if(network==="instagram"){
    const p=new URLSearchParams({client_id:String(env.INSTAGRAM_APP_ID),redirect_uri:redirect,response_type:"code",scope:oauthScope(network),state});
    return "https://www.instagram.com/oauth/authorize?"+p;
  }
  if(network==="facebook"){
    const p=new URLSearchParams({client_id:String(env.META_APP_ID),redirect_uri:redirect,response_type:"code",scope:oauthScope(network),state});
    return "https://www.facebook.com/"+META_VERSION()+"/dialog/oauth?"+p;
  }
  if(network==="tiktok"){
    const p=new URLSearchParams({client_key:String(env.TIKTOK_CLIENT_KEY),redirect_uri:redirect,response_type:"code",scope:oauthScope(network),state});
    return "https://www.tiktok.com/v2/auth/authorize/?"+p;
  }
  if(network==="youtube"){
    const p=new URLSearchParams({client_id:String(env.GOOGLE_CLIENT_ID),redirect_uri:redirect,response_type:"code",access_type:"offline",prompt:"consent",scope:oauthScope(network),state});
    return "https://accounts.google.com/o/oauth2/v2/auth?"+p;
  }
  if(network==="linkedin"){
    const p=new URLSearchParams({client_id:String(env.LINKEDIN_CLIENT_ID),redirect_uri:redirect,response_type:"code",scope:oauthScope(network),state});
    return "https://www.linkedin.com/oauth/v2/authorization?"+p;
  }
  return null;
}
async function exchangeCode(request,env,network,code){
  const redirect=redirectUri(request,network);
  if(network==="instagram"){
    const body=new URLSearchParams({client_id:String(env.INSTAGRAM_APP_ID),client_secret:String(env.INSTAGRAM_APP_SECRET),grant_type:"authorization_code",redirect_uri:redirect,code:String(code)});
    const r=await fetch("https://api.instagram.com/oauth/access_token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
    const first=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error("Instagram OAuth HTTP "+r.status);
    let token=first.access_token;
    const long=await fetch("https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret="+encodeURIComponent(env.INSTAGRAM_APP_SECRET)+"&access_token="+encodeURIComponent(token));
    const lj=await long.json().catch(()=>({}));
    if(long.ok&&lj.access_token)token=lj.access_token;
    const me=await fetch("https://graph.instagram.com/me?fields=id,username,user_type&access_token="+encodeURIComponent(token));
    const mj=await me.json().catch(()=>({}));
    return {token,refresh_token:"",expires_at:lj.expires_in?new Date(Date.now()+Number(lj.expires_in)*1000).toISOString():null,external_id:String(mj.id||first.user_id||""),handle:String(mj.username||"Instagram") ,metadata:{user_type:mj.user_type||""}};
  }
  if(network==="facebook"){
    const body=new URLSearchParams({client_id:String(env.META_APP_ID),client_secret:String(env.META_APP_SECRET),redirect_uri:redirect,code:String(code)});
    const r=await fetch("https://graph.facebook.com/"+META_VERSION()+"/oauth/access_token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
    const user=await r.json().catch(()=>({}));
    if(!r.ok||!user.access_token)throw new Error("Facebook OAuth HTTP "+r.status);
    const pages=await fetch("https://graph.facebook.com/"+META_VERSION()+"/me/accounts?fields=id,name,access_token,category&access_token="+encodeURIComponent(user.access_token));
    const pj=await pages.json().catch(()=>({}));
    if(!pages.ok)throw new Error("Facebook Pages alınamadı HTTP "+pages.status);
    const page=(pj.data||[])[0];
    if(!page)throw new Error("Yönetilen Facebook Page bulunamadı");
    return {token:String(page.access_token),refresh_token:"",expires_at:null,external_id:String(page.id),handle:String(page.name||"Facebook Page"),metadata:{category:page.category||"",user_token:usernameSafe(user.access_token)}};
  }
  if(network==="tiktok"){
    const body=new URLSearchParams({client_key:String(env.TIKTOK_CLIENT_KEY),client_secret:String(env.TIKTOK_CLIENT_SECRET),code:String(code),grant_type:"authorization_code",redirect_uri:redirect});
    const r=await fetch("https://open.tiktokapis.com/v2/oauth/token/",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
    const tj=await r.json().catch(()=>({}));
    if(!r.ok||!tj.access_token)throw new Error("TikTok OAuth HTTP "+r.status);
    const me=await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username",{headers:{Authorization:"Bearer "+tj.access_token}});
    const mj=await me.json().catch(()=>({}));
    return {token:String(tj.access_token),refresh_token:String(tj.refresh_token||""),expires_at:tj.expires_in?new Date(Date.now()+Number(tj.expires_in)*1000).toISOString():null,external_id:String(mj.data?.user?.open_id||""),handle:String(mj.data?.user?.username||mj.data?.user?.display_name||"TikTok"),metadata:{}};
  }
  if(network==="youtube"){
    const body=new URLSearchParams({client_id:String(env.GOOGLE_CLIENT_ID),client_secret:String(env.GOOGLE_CLIENT_SECRET),code:String(code),grant_type:"authorization_code",redirect_uri:redirect});
    const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
    const tj=await r.json().catch(()=>({}));
    if(!r.ok||!tj.access_token)throw new Error("YouTube OAuth HTTP "+r.status);
    const me=await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",{headers:{Authorization:"Bearer "+tj.access_token}});
    const mj=await me.json().catch(()=>({}));
    const ch=(mj.items||[])[0];
    return {token:String(tj.access_token),refresh_token:String(tj.refresh_token||""),expires_at:tj.expires_in?new Date(Date.now()+Number(tj.expires_in)*1000).toISOString():null,external_id:String(ch?.id||""),handle:String(ch?.snippet?.title||"YouTube"),metadata:{customUrl:ch?.snippet?.customUrl||""}};
  }
  if(network==="linkedin"){
    const body=new URLSearchParams({client_id:String(env.LINKEDIN_CLIENT_ID),client_secret:String(env.LINKEDIN_CLIENT_SECRET),code:String(code),grant_type:"authorization_code",redirect_uri:redirect});
    const r=await fetch("https://www.linkedin.com/oauth/v2/accessToken",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
    const tj=await r.json().catch(()=>({}));
    if(!r.ok||!tj.access_token)throw new Error("LinkedIn OAuth HTTP "+r.status);
    const me=await fetch("https://api.linkedin.com/v2/userinfo",{headers:{Authorization:"Bearer "+tj.access_token}});
    const mj=await me.json().catch(()=>({}));
    return {token:String(tj.access_token),refresh_token:"",expires_at:tj.expires_in?new Date(Date.now()+Number(tj.expires_in)*1000).toISOString():null,external_id:String(mj.sub||""),handle:String(mj.name||"LinkedIn"),metadata:{picture:mj.picture||""}};
  }
  throw new Error("Desteklenmeyen ağ");
}
function usernameSafe(v){return v?"stored-separately":""}
async function saveAccount(env,input){
  const secret=String(env.SOCIAL_CREDENTIALS_SECRET||"");
  if(!secret)throw new Error("SOCIAL_CREDENTIALS_SECRET eksik");
  const id=String(input.id||crypto.randomUUID()),clientId=String(input.client_id||""),network=String(input.network||"").toLowerCase();
  if(!NETWORKS.has(network))throw new Error("Geçersiz ağ");
  const old=await env.DB.prepare("SELECT * FROM native_social_accounts WHERE id=?").bind(id).first().catch(()=>null);
  const tokenEnc= input.token ? await encryptSecret(secret,input.token) : String(old?.token_enc||"");
  const refreshEnc=input.refresh_token ? await encryptSecret(secret,input.refresh_token) : String(old?.refresh_token_enc||"");
  const created=String(old?.created_at||now()),updated=now();
  await env.DB.prepare(\`INSERT INTO native_social_accounts(id,client_id,scope,network,handle,external_id,token_enc,refresh_token_enc,token_expires_at,metadata_json,status,last_error,last_used_at,created_at,updated_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET client_id=excluded.client_id,scope=excluded.scope,network=excluded.network,handle=excluded.handle,external_id=excluded.external_id,token_enc=excluded.token_enc,refresh_token_enc=excluded.refresh_token_enc,token_expires_at=excluded.token_expires_at,metadata_json=excluded.metadata_json,status=excluded.status,last_error=excluded.last_error,updated_at=excluded.updated_at\`)
    .bind(id,clientId,String(input.scope||"company"),network,String(input.handle||""),String(input.external_id||""),tokenEnc,refreshEnc,input.expires_at||old?.token_expires_at||null,j(input.metadata||parse(old?.metadata_json||"{}")),String(input.status||"connected"),String(input.last_error||""),old?.last_used_at||null,created,updated).run();
  return {id,network,handle:String(input.handle||""),client_id:clientId,status:String(input.status||"connected"),token_expires_at:input.expires_at||old?.token_expires_at||null};
}
async function loadAccount(env,id){
  const r=await env.DB.prepare("SELECT * FROM native_social_accounts WHERE id=?").bind(String(id)).first();
  if(!r)return null;
  const secret=String(env.SOCIAL_CREDENTIALS_SECRET||"");
  return {...r,metadata:parse(r.metadata_json||"{}"),token:await decryptSecret(secret,r.token_enc),refresh_token:await decryptSecret(secret,r.refresh_token_enc)};
}
async function mediaUrl(env,key){
  if(!key)return "";
  const origin=String(env.BTMEDYA_PUBLIC_ORIGIN||"https://btmedya.com.tr").replace(/\/$/,"");
  return origin+"/pub/"+encodeURIComponent(String(key));
}
async function publishInstagram(env,account,post,asset){
  if(!asset.url)throw new Error("Instagram için medya URL gerekli");
  const base="https://graph.instagram.com/"+META_VERSION();
  const token=account.token;
  const meta=String(asset.mime||"").startsWith("video/")?{media_type:"REELS",video_url:asset.url,caption:String(post.body||post.title||"")}:{image_url:asset.url,caption:String(post.body||post.title||"")};
  if(account.metadata?.ai_generated)meta.is_ai_generated=true;
  const c=new URLSearchParams({access_token:token,...meta});
  const cr=await fetch(base+"/"+encodeURIComponent(account.external_id)+"/media",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:c});
  const cj=await cr.json().catch(()=>({}));
  if(!cr.ok||!cj.id)throw new Error("Instagram container HTTP "+cr.status);
  for(let i=0;i<12;i++){
    await new Promise(r=>setTimeout(r,1500));
    const st=await fetch(base+"/"+encodeURIComponent(cj.id)+"?fields=status_code&access_token="+encodeURIComponent(token));
    const sj=await st.json().catch(()=>({}));
    if(String(sj.status_code||"").toUpperCase()==="ERROR")throw new Error("Instagram medya işleme hatası");
    if(String(sj.status_code||"").toUpperCase()==="FINISHED")break;
  }
  const pub=await fetch(base+"/"+encodeURIComponent(account.external_id)+"/media_publish?creation_id="+encodeURIComponent(cj.id)+"&access_token="+encodeURIComponent(token),{method:"POST"});
  const pj=await pub.json().catch(()=>({}));
  if(!pub.ok||!pj.id)throw new Error("Instagram publish HTTP "+pub.status);
  return String(pj.id);
}
async function publishFacebook(env,account,post){
  const base="https://graph.facebook.com/"+META_VERSION();
  const body=new URLSearchParams({message:String(post.body||post.title||""),access_token:account.token});
  if(post.link)body.set("link",String(post.link));
  const r=await fetch(base+"/"+encodeURIComponent(account.external_id)+"/feed",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.id)throw new Error("Facebook publish HTTP "+r.status);
  return String(d.id);
}
async function publishTikTok(env,account,post,asset){
  if(!asset.url)throw new Error("TikTok için medya URL gerekli");
  const info=await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/",{headers:{Authorization:"Bearer "+account.token}});
  if(!info.ok)throw new Error("TikTok creator_info HTTP "+info.status);
  const isPhoto=String(asset.mime||"").startsWith("image/");
  const endpoint=isPhoto?"https://open.tiktokapis.com/v2/post/publish/content/init/":"https://open.tiktokapis.com/v2/post/publish/video/init/";
  const payload=isPhoto?{
    post_info:{title:String(post.body||post.title||"").slice(0,2200),privacy_level:"PUBLIC_TO_EVERYONE",disable_comment:false},
    source_info:{source:"PULL_FROM_URL",photo_images:[asset.url],photo_cover_index:0}
  }:{
    post_info:{title:String(post.body||post.title||"").slice(0,2200),privacy_level:"PUBLIC_TO_EVERYONE",disable_comment:false},
    source_info:{source:"PULL_FROM_URL",video_url:asset.url}
  };
  const r=await fetch(endpoint,{method:"POST",headers:{Authorization:"Bearer "+account.token,"Content-Type":"application/json"},body:j(payload)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||Number(d.error?.code||0)!==0)throw new Error("TikTok publish HTTP "+r.status+(d.error?.message?": "+d.error.message:""));
  return String(d.data?.publish_id||"");
}
async function refreshGoogle(env,account){
  if(!account.refresh_token)return false;
  const body=new URLSearchParams({client_id:String(env.GOOGLE_CLIENT_ID),client_secret:String(env.GOOGLE_CLIENT_SECRET),grant_type:"refresh_token",refresh_token:account.refresh_token});
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.access_token)return false;
  await saveAccount(env,{...account,token:d.access_token,expires_at:d.expires_in?new Date(Date.now()+Number(d.expires_in)*1000).toISOString():account.token_expires_at});
  account.token=String(d.access_token);return true;
}
async function publishYouTube(env,account,post,asset){
  if(!asset.bytes)throw new Error("YouTube için video bytes gerekli");
  if(String(asset.mime||"").startsWith("video/")===false)throw new Error("YouTube yalnız video kabul eder");
  if(account.token_expires_at&&Date.parse(account.token_expires_at)<=Date.now())await refreshGoogle(env,account);
  const initUrl="https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
  const initBody={snippet:{title:String(post.title||"BTMEDYA").slice(0,100),description:String(post.body||"").slice(0,5000),categoryId:"25"},status:{privacyStatus:"public",selfDeclaredMadeForKids:false}};
  const init=await fetch(initUrl,{method:"POST",headers:{Authorization:"Bearer "+account.token,"Content-Type":"application/json","X-Upload-Content-Length":String(asset.bytes.byteLength),"X-Upload-Content-Type":String(asset.mime||"video/mp4")},body:j(initBody)});
  if(!init.ok)throw new Error("YouTube upload init HTTP "+init.status);
  const upload=init.headers.get("location");
  if(!upload)throw new Error("YouTube upload URL alınamadı");
  const put=await fetch(upload,{method:"PUT",headers:{"Content-Type":String(asset.mime||"video/mp4"),"Content-Length":String(asset.bytes.byteLength)},body:asset.bytes});
  const d=await put.json().catch(()=>({}));
  if(!put.ok||!d.id)throw new Error("YouTube upload HTTP "+put.status);
  return String(d.id);
}
async function publishLinkedIn(env,account,post){
  const author=String(account.metadata?.author_urn||("urn:li:person:"+account.external_id));
  const body={author,commentary:String(post.body||post.title||"").slice(0,3000),visibility:"PUBLIC",distribution:{feedDistribution:"MAIN_FEED",targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:"PUBLISHED",isReshareDisabledByAuthor:false};
  const r=await fetch("https://api.linkedin.com/rest/posts",{method:"POST",headers:{Authorization:"Bearer "+account.token,"X-Restli-Protocol-Version":"2.0.0","Linkedin-Version":String(env.LINKEDIN_VERSION||"202604"),"Content-Type":"application/json"},body:j(body)});
  if(!r.ok)throw new Error("LinkedIn publish HTTP "+r.status);
  return String(r.headers.get("x-restli-id")||"");
}
async function loadAsset(env,post,network){
  const key=String(post.media_key||"");
  const url=await mediaUrl(env,key);
  if(!url)return {url:"",mime:"",bytes:null};
  if(network!=="youtube")return {url,mime:/\.(png|jpe?g|webp)$/i.test(key)?"image/jpeg":"video/mp4",bytes:null};
  const obj=env.MEDIA?await env.MEDIA.get(key).catch(()=>null):null;
  if(!obj)return {url,mime:"",bytes:null};
  return {url,mime:String(obj.httpMetadata?.contentType||"video/mp4"),bytes:await obj.arrayBuffer()};
}
async function publishOne(env,post,account){
  const asset=await loadAsset(env,post,account.network);
  if(account.network==="instagram")return publishInstagram(env,account,post,asset);
  if(account.network==="facebook")return publishFacebook(env,account,post);
  if(account.network==="tiktok")return publishTikTok(env,account,post,asset);
  if(account.network==="youtube")return publishYouTube(env,account,post,asset);
  if(account.network==="linkedin")return publishLinkedIn(env,account,post);
  throw new Error("Desteklenmeyen ağ");
}
export async function processNativeSocialQueue(env,limit=8){
  await ensureNativeSocialTables(env);
  const out={enabled:Boolean(env.SOCIAL_CREDENTIALS_SECRET),processed:0,published:0,failed:0,items:[]};
  if(!env.DB||!env.SOCIAL_CREDENTIALS_SECRET)return out;
  const rows=(await env.DB.prepare(\`SELECT p.* FROM social_posts p
    WHERE p.status='planlandi' AND p.delivery_provider='native'
      AND p.scheduled_at IS NOT NULL AND p.scheduled_at<=?
      AND p.native_account_id<>''
      AND NOT EXISTS(SELECT 1 FROM native_social_deliveries d WHERE d.post_id=p.id AND d.account_id=p.native_account_id AND d.status='published')
    ORDER BY p.scheduled_at ASC LIMIT ?\`).bind(now(),Number(limit)||8).all()).results||[];
  for(const post of rows){
    out.processed++;
    const account=await loadAccount(env,post.native_account_id);
    if(!account){out.failed++;continue}
    const existing=await env.DB.prepare("SELECT attempts FROM native_social_deliveries WHERE post_id=? AND account_id=?").bind(post.id,account.id).first().catch(()=>null);
    const attempts=Number(existing?.attempts||0)+1;
    try{
      const remote=await publishOne(env,post,account);
      const t=now();
      await env.DB.prepare(\`INSERT INTO native_social_deliveries(post_id,account_id,network,remote_id,status,error,attempts,response_json,created_at,updated_at)
        VALUES(?,?,?,?,?,'',?,?,?,?) ON CONFLICT(post_id,account_id) DO UPDATE SET remote_id=excluded.remote_id,status='published',error='',attempts=excluded.attempts,response_json=excluded.response_json,updated_at=excluded.updated_at\`)
        .bind(post.id,account.id,account.network,remote,"published",attempts,j({remote_id:remote}),t,t).run();
      await env.DB.prepare("UPDATE social_posts SET status='yayinlandi',updated_at=? WHERE id=?").bind(t,post.id).run();
      await env.DB.prepare("UPDATE native_social_accounts SET last_error='',last_used_at=?,updated_at=? WHERE id=?").bind(t,t,account.id).run();
      out.published++;out.items.push({post_id:post.id,network:account.network,status:"published",remote_id:remote});
    }catch(e){
      const err=String(e?.message||e).slice(0,1600),t=now();
      await env.DB.prepare(\`INSERT INTO native_social_deliveries(post_id,account_id,network,remote_id,status,error,attempts,response_json,created_at,updated_at)
        VALUES(?,?,?,?,?,'',?,?,?,?) ON CONFLICT(post_id,account_id) DO UPDATE SET status='error',error=excluded.error,attempts=excluded.attempts,updated_at=excluded.updated_at\`)
        .bind(post.id,account.id,account.network,"","error",err,attempts,j({error:err}),t,t).run();
      await env.DB.prepare("UPDATE native_social_accounts SET last_error=?,updated_at=? WHERE id=?").bind(err,t,account.id).run();
      out.failed++;out.items.push({post_id:post.id,network:account.network,status:"error",error:err});
    }
  }
  return out;
}
export async function nativeSocialStatus(env){
  await ensureNativeSocialTables(env);
  if(!env.DB)return {ok:false,accounts:[],deliveries:[]};
  const accounts=(await env.DB.prepare("SELECT id,client_id,scope,network,handle,external_id,token_expires_at,status,last_error,last_used_at,created_at,updated_at FROM native_social_accounts ORDER BY client_id,network,handle").all().catch(()=>({results:[]}))).results||[];
  const deliveries=(await env.DB.prepare("SELECT post_id,account_id,network,remote_id,status,error,attempts,created_at,updated_at FROM native_social_deliveries ORDER BY updated_at DESC LIMIT 50").all().catch(()=>({results:[]}))).results||[];
  return {ok:true,accounts,deliveries,providers:[...NETWORKS].map(network=>({network,appConfigured:appConfigured(env,network)}))};
}
export async function nativeSocialApi(request,env,url,isAdmin){
  if(!url.pathname.startsWith("/api/admin/native-social")&&!url.pathname.startsWith("/api/native-social/oauth"))return null;
  const admin=Boolean(await isAdmin(request));
  if(url.pathname.startsWith("/api/admin/native-social")&&!admin)return new Response(JSON.stringify({ok:false,error:"Yetkisiz"}),{status:401,headers:{"content-type":"application/json"}});
  await ensureNativeSocialTables(env);
  if(url.pathname==="/api/admin/native-social/status"&&request.method==="GET")return Response.json(await nativeSocialStatus(env));
  if(url.pathname==="/api/admin/native-social/connect"&&request.method==="POST"){
    const b=await request.json().catch(()=>({}));
    const network=String(b.network||"").toLowerCase();if(!NETWORKS.has(network))return Response.json({ok:false,error:"Geçersiz ağ"},{status:400});
    if(!appConfigured(env,network))return Response.json({ok:false,error:network+" uygulama secretları Worker'da hazır değil"},{status:503});
    const state=crypto.randomUUID(),returnTo=String(b.return_to||"/admin/native-social/");
    const clientId=String(b.client_id||"");
    await env.DB.prepare("INSERT INTO native_social_oauth_states(state,network,client_id,return_to,created_at,expires_at) VALUES(?,?,?,?,?,?)").bind(state,network,clientId,returnTo,now(),new Date(Date.now()+10*60*1000).toISOString()).run();
    const target=authUrl(request,env,network,state);
    return Response.json({ok:true,network,authorize_url:target});
  }
  const cb=url.pathname.match(/^\/api\/native-social\/oauth\/(instagram|facebook|tiktok|youtube|linkedin)\/callback$/);
  if(cb&&request.method==="GET"){
    const network=cb[1],state=String(url.searchParams.get("state")||""),code=String(url.searchParams.get("code")||"");
    const row=await env.DB.prepare("SELECT * FROM native_social_oauth_states WHERE state=?").bind(state).first();
    if(!row||Date.parse(row.expires_at)<=Date.now())return new Response("OAuth durumu geçersiz veya süresi dolmuş.",{status:400});
    if(!code)return new Response("OAuth kodu alınamadı.",{status:400});
    try{
      const account=await exchangeCode(request,env,network,code);
      const saved=await saveAccount(env,{...account,network,client_id:row.client_id,scope:row.client_id?"client":"company",metadata:account.metadata});
      await env.DB.prepare("DELETE FROM native_social_oauth_states WHERE state=?").bind(state).run();
      const target=new URL(row.return_to,new URL(request.url).origin);target.searchParams.set("connected",network);target.searchParams.set("account",saved.id);
      return Response.redirect(target.toString(),302);
    }catch(e){
      const target=new URL(row.return_to,new URL(request.url).origin);target.searchParams.set("error",String(e?.message||e).slice(0,200));return Response.redirect(target.toString(),302);
    }
  }
  if(url.pathname==="/api/admin/native-social/account"&&request.method==="POST"){
    const b=await request.json().catch(()=>({}));
    try{return Response.json({ok:true,account:await saveAccount(env,b)})}catch(e){return Response.json({ok:false,error:String(e?.message||e)},{status:400})}
  }
  if(url.pathname==="/api/admin/native-social/account"&&request.method==="DELETE"){
    const id=String(url.searchParams.get("id")||"");if(!id)return Response.json({ok:false,error:"id gerekli"},{status:400});
    await env.DB.prepare("DELETE FROM native_social_accounts WHERE id=?").bind(id).run();return Response.json({ok:true});
  }
  if(url.pathname==="/api/admin/native-social/run"&&request.method==="POST")return Response.json({ok:true,result:await processNativeSocialQueue(env,10)});
  return Response.json({ok:false,error:"Native social endpoint bulunamadı"},{status:404});
}
