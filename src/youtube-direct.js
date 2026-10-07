const AUTH="https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN="https://oauth2.googleapis.com/token";
const API="https://www.googleapis.com/youtube/v3";
const UPLOAD="https://www.googleapis.com/upload/youtube/v3/videos";
const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function admin(request,env){
 const sec=env.ADMIN_SESSION_SECRET_SECRET||env.ADMIN_SESSION_SECRET||""; if(!sec)return false;
 const m=(request.headers.get("cookie")||"").match(/(?:^|;\s*)bt_admin=([^;]+)/); if(!m)return false;
 const [p,s]=m[1].split("."); if(!p||!s)return false;
 const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(sec),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 if(b64url(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(p)))!==s)return false;
 try{const x=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-p.length%4)%4)),c=>c.charCodeAt(0)));return x.exp>Date.now()}catch{return false}
}
export async function youtubeApi(request,env){
 const url=new URL(request.url); if(!url.pathname.startsWith("/api/social/direct/youtube/"))return null;
 if(!(await admin(request,env)))return j({error:"unauthorized"},401);
 if(!env.YOUTUBE_CLIENT_ID||!env.YOUTUBE_CLIENT_SECRET)return j({error:"YouTube geliştirici uygulaması yapılandırılmamış",required:["YOUTUBE_CLIENT_ID","YOUTUBE_CLIENT_SECRET"]},503);
 const action=url.pathname.split("/").pop();
 if(action==="start"){
  const state=crypto.randomUUID(); if(env.KV)await env.KV.put("youtube_oauth:"+state,"1",{expirationTtl:600});
  const redirectUri=env.YOUTUBE_REDIRECT_URI||new URL("/api/social/direct/youtube/callback",url.origin).toString();
  const q=new URLSearchParams({client_id:env.YOUTUBE_CLIENT_ID,redirect_uri:redirectUri,response_type:"code",access_type:"offline",prompt:"consent",scope:"https://www.googleapis.com/auth/youtube.upload",state});
  return Response.redirect(AUTH+"?"+q,302);
 }
 if(action==="callback"){
  const code=url.searchParams.get("code"),state=url.searchParams.get("state"); if(!code||!state)return j({error:"OAuth callback eksik"},400);
  if(env.KV&&!await env.KV.get("youtube_oauth:"+state))return j({error:"OAuth state geçersiz veya süresi dolmuş"},400);
  const redirectUri=env.YOUTUBE_REDIRECT_URI||new URL("/api/social/direct/youtube/callback",url.origin).toString();
  const tr=await fetch(TOKEN,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:env.YOUTUBE_CLIENT_ID,client_secret:env.YOUTUBE_CLIENT_SECRET,code,grant_type:"authorization_code",redirect_uri:redirectUri})});
  const tok=await tr.json(); if(!tok.access_token)return j({error:"YouTube token alınamadı",details:tok},400);
  if(env.KV)await env.KV.put("youtube_oauth_pending:"+crypto.randomUUID(),JSON.stringify(tok),{expirationTtl:900});
  return j({ok:true,message:"YouTube OAuth tamamlandı. Token Social OS bağlantı katmanına aktarılacak.",scope:tok.scope,expires_in:tok.expires_in});
 }
 if(action==="channel"){
  const token=request.headers.get("x-youtube-access-token"); if(!token)return j({error:"access token gerekli"},400);
  const r=await fetch(API+"/channels?part=id,snippet&mine=true",{headers:{Authorization:"Bearer "+token}});
  return new Response(await r.text(),{status:r.status,headers:{"content-type":"application/json"}});
 }
 return j({error:"not_found"},404);
}
