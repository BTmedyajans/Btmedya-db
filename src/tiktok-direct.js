const TIKTOK_AUTH="https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN="https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_API="https://open.tiktokapis.com/v2";

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8"}})}
function redirect(url){return Response.redirect(url,302)}

async function requireAdmin(request,env){
  const secret=env.ADMIN_SESSION_SECRET_SECRET||env.ADMIN_SESSION_SECRET||"";
  if(!secret) return false;
  const cookie=request.headers.get("cookie")||"";
  const m=cookie.match(/(?:^|;\\s*)bt_admin=([^;]+)/);
  if(!m) return false;
  const [payload,sig]=m[1].split(".");
  if(!payload||!sig) return false;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  const expected=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload));
  const actual=sig.replace(/-/g,"+").replace(/_/g,"/");
  const padded=actual+"=".repeat((4-actual.length%4)%4);
  const bytes=Uint8Array.from(atob(padded),ch=>ch.charCodeAt(0));
  if(bytes.length!==expected.byteLength) return false;
  let diff=0; const exp=new Uint8Array(expected); for(let i=0;i<exp.length;i++) diff|=exp[i]^bytes[i];
  if(diff!==0) return false;
  try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-payload.length%4)%4)),ch=>ch.charCodeAt(0)))).exp>Date.now()}catch{return false}
}

export async function tiktokApi(request,env){
  if(!new URL(request.url).pathname.startsWith("/api/social/direct/tiktok/")) return null;
  if(!(await requireAdmin(request,env))) return json({error:"unauthorized"},401);
  if(!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET) return json({error:"TikTok geliştirici uygulaması yapılandırılmamış",required:["TIKTOK_CLIENT_KEY","TIKTOK_CLIENT_SECRET"]},503);

  const url=new URL(request.url);
  const path=url.pathname.replace("/api/social/direct/tiktok/","");
  if(path==="start"){
    const state=crypto.randomUUID();
    if(env.KV) await env.KV.put("tiktok_oauth:"+state,JSON.stringify({createdAt:Date.now()}),{expirationTtl:600});
    const redirectUri=env.TIKTOK_REDIRECT_URI||new URL("/api/social/direct/tiktok/callback",url.origin).toString();
    const qs=new URLSearchParams({client_key:env.TIKTOK_CLIENT_KEY,response_type:"code",scope:"user.info.basic,video.publish",redirect_uri:redirectUri,state});
    return redirect(TIKTOK_AUTH+"?"+qs);
  }
  if(path==="callback"){
    const code=url.searchParams.get("code"); const state=url.searchParams.get("state");
    if(!code||!state) return json({error:"OAuth callback eksik"},400);
    const saved=env.KV?await env.KV.get("tiktok_oauth:"+state):null;
    if(!saved) return json({error:"OAuth state geçersiz veya süresi dolmuş"},400);
    const redirectUri=env.TIKTOK_REDIRECT_URI||new URL("/api/social/direct/tiktok/callback",url.origin).toString();
    const tokenRes=await fetch(TIKTOK_TOKEN,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_key:env.TIKTOK_CLIENT_KEY,client_secret:env.TIKTOK_CLIENT_SECRET,code,grant_type:"authorization_code",redirect_uri:redirectUri})});
    const token=await tokenRes.json();
    if(!token.access_token) return json({error:"TikTok token alınamadı",details:token},400);
    if(env.KV) await env.KV.put("tiktok_oauth_token:"+crypto.randomUUID(),JSON.stringify(token),{expirationTtl:86400});
    return json({ok:true,message:"TikTok OAuth tamamlandı. Token kaydı için Social OS bağlantı katmanı kullanılacak.",open_id:token.open_id,scope:token.scope});
  }
  if(path==="creator"){
    const token=request.headers.get("x-tiktok-access-token");
    if(!token) return json({error:"access token gerekli"},400);
    const res=await fetch(TIKTOK_API+"/post/publish/creator_info/query/",{method:"POST",headers:{Authorization:"Bearer "+token,"content-type":"application/json"}});
    return new Response(await res.text(),{status:res.status,headers:{"content-type":"application/json"}});
  }
  return json({error:"not_found"},404);
}
