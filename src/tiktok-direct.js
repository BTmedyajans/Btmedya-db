const TIKTOK_AUTH="https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN="https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_API="https://open.tiktokapis.com/v2";
import { validSession, saveOAuthConnection, validWorkspaceType, workspaceExists } from "./direct-social.js";

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});

export async function tiktokApi(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/api/social/direct/tiktok/"))return null;
  if(!(await validSession(request,env)))return json({error:"unauthorized"},401);
  if(!env.TIKTOK_CLIENT_KEY||!env.TIKTOK_CLIENT_SECRET)return json({error:"TikTok geliştirici uygulaması yapılandırılmamış",required:["TIKTOK_CLIENT_KEY","TIKTOK_CLIENT_SECRET"]},503);
  const path=url.pathname.replace("/api/social/direct/tiktok/","");
  if(path==="start"){
    const state=crypto.randomUUID();
    const workspace_type=validWorkspaceType(url.searchParams.get("workspace_type"))?url.searchParams.get("workspace_type"):"agency";
    const workspace_id=url.searchParams.get("workspace_id")||"btmedya";
    if(!(await workspaceExists(env,workspace_type,workspace_id)))return json({error:"Çalışma alanı bulunamadı"},404);
    if(!env.KV)return json({error:"KV bağlantısı yok"},503);
    await env.KV.put("tiktok_oauth:"+state,JSON.stringify({workspace_type,workspace_id}),{expirationTtl:600});
    const redirectUri=env.TIKTOK_REDIRECT_URI||new URL("/api/social/direct/tiktok/callback",url.origin).toString();
    const qs=new URLSearchParams({client_key:env.TIKTOK_CLIENT_KEY,response_type:"code",scope:"user.info.basic,video.publish",redirect_uri:redirectUri,state});
    return Response.redirect(TIKTOK_AUTH+"?"+qs,302);
  }
  if(path==="callback"){
    const code=url.searchParams.get("code"),state=url.searchParams.get("state");
    if(!code||!state)return json({error:"OAuth callback eksik"},400);
    const raw=await env.KV.get("tiktok_oauth:"+state); if(!raw)return json({error:"OAuth state geçersiz veya süresi dolmuş"},400);
    const ws=JSON.parse(raw); await env.KV.delete("tiktok_oauth:"+state);
    const redirectUri=env.TIKTOK_REDIRECT_URI||new URL("/api/social/direct/tiktok/callback",url.origin).toString();
    const tokenRes=await fetch(TIKTOK_TOKEN,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_key:env.TIKTOK_CLIENT_KEY,client_secret:env.TIKTOK_CLIENT_SECRET,code,grant_type:"authorization_code",redirect_uri:redirectUri})});
    const token=await tokenRes.json();
    if(!token.access_token)return json({error:"TikTok token alınamadı"},400);
    let profile={};
    try{const pr=await fetch(TIKTOK_API+"/user/info/?fields=open_id,display_name,avatar_url",{headers:{Authorization:"Bearer "+token.access_token}});profile=(await pr.json())?.data?.user||{};}catch{}
    const externalId=token.open_id||profile.open_id;if(!externalId)return json({error:"TikTok open_id alınamadı"},400);
    const connection=await saveOAuthConnection(env,{workspace_type:ws.workspace_type,workspace_id:ws.workspace_id,provider:"tiktok",external_id:externalId,account_name:profile.display_name||"TikTok hesabı",handle:profile.display_name||"",profile_url:profile.avatar_url||"",token:{access_token:token.access_token,refresh_token:token.refresh_token},scopes:String(token.scope||"").split(/[ ,]+/).filter(Boolean),token_expires_at:new Date(Date.now()+Number(token.expires_in||86400)*1000).toISOString()});
    return Response.redirect(new URL("/admin/connect/?tiktok=ok&connection="+encodeURIComponent(connection),url.origin),302);
  }
  if(path==="creator"){
    const token=request.headers.get("x-tiktok-access-token");if(!token)return json({error:"access token gerekli"},400);
    const res=await fetch(TIKTOK_API+"/post/publish/creator_info/query/",{method:"POST",headers:{Authorization:"Bearer "+token,"content-type":"application/json"}});
    return new Response(await res.text(),{status:res.status,headers:{"content-type":"application/json"}});
  }
  return json({error:"not_found"},404);
}
