const AUTH="https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN="https://oauth2.googleapis.com/token";
const API="https://www.googleapis.com/youtube/v3";
import { validSession, saveOAuthConnection, validWorkspaceType, workspaceExists } from "./direct-social.js";

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});

export async function youtubeApi(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/api/social/direct/youtube/"))return null;
  if(!(await validSession(request,env)))return json({error:"unauthorized"},401);
  if(!env.YOUTUBE_CLIENT_ID||!env.YOUTUBE_CLIENT_SECRET)return json({error:"YouTube geliştirici uygulaması yapılandırılmamış",required:["YOUTUBE_CLIENT_ID","YOUTUBE_CLIENT_SECRET"]},503);
  const action=url.pathname.replace("/api/social/direct/youtube/","");
  if(action==="start"){
    if(!env.KV)return json({error:"KV bağlantısı yok"},503);
    const state=crypto.randomUUID();
    const workspace_type=validWorkspaceType(url.searchParams.get("workspace_type"))?url.searchParams.get("workspace_type"):"agency";
    const workspace_id=url.searchParams.get("workspace_id")||"btmedya";
    if(!(await workspaceExists(env,workspace_type,workspace_id)))return json({error:"Çalışma alanı bulunamadı"},404);
    await env.KV.put("youtube_oauth:"+state,JSON.stringify({workspace_type,workspace_id}),{expirationTtl:600});
    const redirectUri=env.YOUTUBE_REDIRECT_URI||new URL("/api/social/direct/youtube/callback",url.origin).toString();
    const q=new URLSearchParams({client_id:env.YOUTUBE_CLIENT_ID,redirect_uri:redirectUri,response_type:"code",access_type:"offline",prompt:"consent",scope:"https://www.googleapis.com/auth/youtube.upload",state});
    return Response.redirect(AUTH+"?"+q,302);
  }
  if(action==="callback"){
    const code=url.searchParams.get("code"),state=url.searchParams.get("state");
    if(!code||!state)return json({error:"OAuth callback eksik"},400);
    const raw=await env.KV.get("youtube_oauth:"+state);if(!raw)return json({error:"OAuth state geçersiz veya süresi dolmuş"},400);
    const ws=JSON.parse(raw);await env.KV.delete("youtube_oauth:"+state);
    const redirectUri=env.YOUTUBE_REDIRECT_URI||new URL("/api/social/direct/youtube/callback",url.origin).toString();
    const tr=await fetch(TOKEN,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:env.YOUTUBE_CLIENT_ID,client_secret:env.YOUTUBE_CLIENT_SECRET,code,grant_type:"authorization_code",redirect_uri:redirectUri})});
    const tok=await tr.json();if(!tok.access_token)return json({error:"YouTube token alınamadı"},400);
    const cr=await fetch(API+"/channels?part=id,snippet&mine=true",{headers:{Authorization:"Bearer "+tok.access_token}});
    const channels=await cr.json();const channel=channels.items?.[0];
    if(!channel?.id)return json({error:"YouTube kanalı alınamadı"},400);
    const connection=await saveOAuthConnection(env,{workspace_type:ws.workspace_type,workspace_id:ws.workspace_id,provider:"youtube",external_id:channel.id,account_name:channel.snippet?.title||"YouTube kanalı",handle:channel.snippet?.customUrl||"",profile_url:"https://www.youtube.com/channel/"+channel.id,token:{access_token:tok.access_token,refresh_token:tok.refresh_token},scopes:String(tok.scope||"").split(/[ ,]+/).filter(Boolean),token_expires_at:new Date(Date.now()+Number(tok.expires_in||3600)*1000).toISOString()});
    return Response.redirect(new URL("/admin/connect/?youtube=ok&connection="+encodeURIComponent(connection),url.origin),302);
  }
  if(action==="channel"){
    const token=request.headers.get("x-youtube-access-token");if(!token)return json({error:"access token gerekli"},400);
    const res=await fetch(API+"/channels?part=id,snippet&mine=true",{headers:{Authorization:"Bearer "+token}});
    return new Response(await res.text(),{status:res.status,headers:{"content-type":"application/json"}});
  }
  return json({error:"not_found"},404);
}
