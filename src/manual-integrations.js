/* BTMEDYA Manual Integration Vault
 * Admin-only manual credential entry for platform connections.
 * Secret values are encrypted at rest with SOCIAL_TOKEN_ENCRYPTION_KEY.
 * Plaintext values are never returned by the API.
 */
const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(v,n=500)=>String(v??"").trim().slice(0,n);
const b64=(bytes)=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const ub64=(s)=>{s=String(s).replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};
async function keyFromSecret(env){
  const seed=String(env.SOCIAL_TOKEN_ENCRYPTION_KEY||"");
  if(!seed) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY eksik");
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(seed));
  return crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function encrypt(env,value){
  const key=await keyFromSecret(env),iv=new Uint8Array(12);crypto.getRandomValues(iv);
  const ct=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(String(value)));
  return b64(iv)+":"+b64(ct);
}
async function ensure(env){
  if(!env.DB) return false;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS manual_integrations (
    id TEXT PRIMARY KEY, provider TEXT NOT NULL, workspace_type TEXT NOT NULL DEFAULT 'agency',
    workspace_id TEXT NOT NULL DEFAULT 'btmedya', label TEXT NOT NULL DEFAULT '',
    api_base_url TEXT NOT NULL DEFAULT '', account_id TEXT NOT NULL DEFAULT '',
    zone_id TEXT NOT NULL DEFAULT '', resource_name TEXT NOT NULL DEFAULT '',
    credential_cipher TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'inactive',
    last_verified_at TEXT, last_error TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    UNIQUE(workspace_type,workspace_id,provider)
  )`).run().catch(()=>{});
  return true;
}
async function cfVerify(base,token,accountId){
  const root=String(base||"https://api.cloudflare.com/client/v4").replace(/\/$/,"");
  const headers={Authorization:"Bearer "+token,"accept":"application/json"};
  const vr=await fetch(root+"/user/tokens/verify",{headers});
  const v=await vr.json().catch(()=>({}));
  if(!vr.ok||v.success!==true) return {ok:false,error:"Cloudflare API token doğrulanamadı."};
  if(accountId){
    const ar=await fetch(root+"/accounts/"+encodeURIComponent(accountId),{headers});
    const a=await ar.json().catch(()=>({}));
    if(!ar.ok||a.success!==true) return {ok:false,error:"Cloudflare Account ID ile token erişimi doğrulanamadı."};
  }
  return {ok:true};
}
export async function manualIntegrationApi(request,env,url){
  if(!url.pathname.startsWith("/api/admin/manual-integrations")) return null;
  const sessionSecret=String(env.ADMIN_SESSION_SECRET_SECRET||env.ADMIN_SESSION_SECRET||"");
  const valid=async()=>{
    if(!sessionSecret)return false;
    const c=request.headers.get("cookie")||"",m=c.match(/bt_admin=([^;]+)/);if(!m)return false;
    const [p,s]=m[1].split(".");if(!p||!s)return false;
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.MEDIA_SIGNING_SECRET?sessionSecret+"\u0000"+env.MEDIA_SIGNING_SECRET:sessionSecret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const sig=b64(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(p)));
    if(sig!==s)return false;
    try{return JSON.parse(new TextDecoder().decode(ub64(p))).exp>Date.now()}catch{return false}
  };
  if(!(await valid()))return j({ok:false,error:"Yetkisiz"},401);
  if(!(await ensure(env)))return j({ok:false,error:"D1 yapılandırılmadı"},503);
  const provider="cloudflare",workspaceType="agency",workspaceId="btmedya";
  if(request.method==="GET"){
    const row=await env.DB.prepare("SELECT provider,label,api_base_url,account_id,zone_id,resource_name,status,last_verified_at,last_error,created_at,updated_at FROM manual_integrations WHERE workspace_type=? AND workspace_id=? AND provider=?").bind(workspaceType,workspaceId,provider).first();
    return j({ok:true,item:row?{...row,credential_configured:true}:null});
  }
  if(request.method==="DELETE"){
    await env.DB.prepare("DELETE FROM manual_integrations WHERE workspace_type=? AND workspace_id=? AND provider=?").bind(workspaceType,workspaceId,provider).run();
    return j({ok:true,deleted:true});
  }
  if(request.method!=="POST") return j({ok:false,error:"Method bulunamadı"},405);
  const b=await request.json().catch(()=>null);
  if(!b||typeof b!=="object")return j({ok:false,error:"Geçersiz JSON"},400);
  const base=clean(b.api_base_url||"https://api.cloudflare.com/client/v4",200);
  const accountId=clean(b.account_id,64);
  const zoneId=clean(b.zone_id,64);
  const resource=clean(b.resource_name||"btmedya-db",120);
  const label=clean(b.label||"BTMEDYA Cloudflare",120);
  const token=clean(b.api_token,1000);
  if(!/^https:\/\/api\.cloudflare\.com\/client\/v4$/i.test(base))return j({ok:false,error:"Cloudflare API adresi yalnızca https://api.cloudflare.com/client/v4 olabilir."},400);
  if(!accountId||!token)return j({ok:false,error:"Account ID ve API Token zorunludur."},400);
  const verified=await cfVerify(base,token,accountId);
  if(!verified.ok)return j(verified,422);
  const cipher=await encrypt(env,token),now=new Date().toISOString();
  const existing=await env.DB.prepare("SELECT id FROM manual_integrations WHERE workspace_type=? AND workspace_id=? AND provider=?").bind(workspaceType,workspaceId,provider).first();
  if(existing?.id){
    await env.DB.prepare("UPDATE manual_integrations SET label=?,api_base_url=?,account_id=?,zone_id=?,resource_name=?,credential_cipher=?,status='active',last_verified_at=?,last_error='',updated_at=? WHERE id=?").bind(label,base,accountId,zoneId,resource,cipher,now,now,existing.id).run();
  }else{
    await env.DB.prepare("INSERT INTO manual_integrations(id,provider,workspace_type,workspace_id,label,api_base_url,account_id,zone_id,resource_name,credential_cipher,status,last_verified_at,last_error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),provider,workspaceType,workspaceId,label,base,accountId,zoneId,resource,cipher,"active",now,"",now,now).run();
  }
  return j({ok:true,saved:true,item:{provider,label,api_base_url:base,account_id:accountId,zone_id:zoneId,resource_name:resource,status:"active",last_verified_at:now,credential_configured:true}});
}
