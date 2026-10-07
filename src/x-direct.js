const AUTH="https://twitter.com/i/oauth2/authorize";
const TOKEN="https://api.x.com/2/oauth2/token";
const API="https://api.x.com/2";
import { validSession, saveOAuthConnection } from "./direct-social.js";
const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function pkce(){const b=new Uint8Array(32);crypto.getRandomValues(b);const verifier=b64url(b);const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier));return {verifier,challenge:b64url(digest)}}
export async function xApi(request,env){
 const url=new URL(request.url); if(!url.pathname.startsWith("/api/social/direct/x/"))return null;
 if(!(await validSession(request,env)))return j({error:"unauthorized"},401);
 if(!env.X_CLIENT_ID)return j({error:"X geliştirici uygulaması yapılandırılmamış",required:["X_CLIENT_ID"]},503);
 const action=url.pathname.replace("/api/social/direct/x/","");
 if(action==="start"){
  if(!env.KV)return j({error:"KV bağlantısı yok"},503);
  const state=crypto.randomUUID(),p=await pkce();const ws={workspace_type:url.searchParams.get("workspace_type")||"company",workspace_id:url.searchParams.get("workspace_id")||"btmedya"};
  await env.KV.put("x_oauth:"+state,JSON.stringify({...ws,verifier:p.verifier}),{expirationTtl:600});
  const redirectUri=env.X_REDIRECT_URI||new URL("/api/social/direct/x/callback",url.origin).toString();
  const q=new URLSearchParams({response_type:"code",client_id:env.X_CLIENT_ID,redirect_uri:redirectUri,scope:"tweet.read tweet.write users.read offline.access",state,code_challenge:p.challenge,code_challenge_method:"S256"});
  return Response.redirect(AUTH+"?"+q,302);
 }
 if(action==="callback"){
  const code=url.searchParams.get("code"),state=url.searchParams.get("state");if(!code||!state)return j({error:"OAuth callback eksik"},400);
  const raw=await env.KV.get("x_oauth:"+state);if(!raw)return j({error:"OAuth state geçersiz veya süresi dolmuş"},400);const ws=JSON.parse(raw);await env.KV.delete("x_oauth:"+state);
  const redirectUri=env.X_REDIRECT_URI||new URL("/api/social/direct/x/callback",url.origin).toString();
  const body=new URLSearchParams({code,grant_type:"authorization_code",client_id:env.X_CLIENT_ID,redirect_uri:redirectUri,code_verifier:ws.verifier});
  if(env.X_CLIENT_SECRET)body.set("client_secret",env.X_CLIENT_SECRET);
  const tr=await fetch(TOKEN,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});const tok=await tr.json();if(!tok.access_token)return j({error:"X token alınamadı"},400);
  const ur=await fetch(API+"/users/me?user.fields=id,name,username,profile_image_url",{headers:{Authorization:"Bearer "+tok.access_token}});const u=(await ur.json())?.data;if(!u?.id)return j({error:"X kullanıcı bilgisi alınamadı"},400);
  const connection=await saveOAuthConnection(env,{workspace_type:ws.workspace_type,workspace_id:ws.workspace_id,provider:"x",external_id:u.id,account_name:u.name||"X hesabı",handle:u.username||"",profile_url:"https://x.com/"+(u.username||""),token:{access_token:tok.access_token,refresh_token:tok.refresh_token},scopes:["tweet.read","tweet.write","users.read","offline.access"],token_expires_at:new Date(Date.now()+Number(tok.expires_in||7200)*1000).toISOString()});
  return Response.redirect(new URL("/admin/connect/?x=ok&connection="+encodeURIComponent(connection),url.origin),302);
 }
 if(action==="post"&&request.method==="POST"){
  const body=await request.json().catch(()=>({}));const connectionId=body.connection_id;
  const row=await env.DB.prepare("SELECT * FROM social_direct_connections WHERE id=? AND provider='x' LIMIT 1").bind(connectionId).first();if(!row)return j({error:"X bağlantısı bulunamadı"},404);
  const raw=JSON.parse(await (await import("./direct-social.js")).decryptSecret(env,row.access_token_cipher));const text=String(body.text||"").trim();if(!text)return j({error:"text gerekli"},400);
  const rr=await fetch(API+"/tweets",{method:"POST",headers:{Authorization:"Bearer "+raw.access_token,"content-type":"application/json"},body:JSON.stringify({text})});
  const out=await rr.json();return new Response(JSON.stringify(out),{status:rr.status,headers:{"content-type":"application/json"}});
 }
 return j({error:"not_found"},404);
}
