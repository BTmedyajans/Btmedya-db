import { validSession } from "./direct-social.js";
const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function whatsappApi(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith("/api/social/direct/whatsapp/"))return null;
 if(!(await validSession(request,env)))return j({error:"unauthorized"},401);
 const missing=[];for(const k of ["WHATSAPP_ACCESS_TOKEN","WHATSAPP_PHONE_NUMBER_ID"])if(!String(env[k]||"").trim())missing.push(k);
 if(url.pathname.endsWith("/health"))return j({ok:true,provider:"WhatsApp Cloud API",ready:missing.length===0,missing,mode:"cloud"});
 if(url.pathname.endsWith("/send")&&request.method==="POST"){
  if(missing.length)return j({error:"WhatsApp Cloud API yapılandırılmamış",missing},503);
  const body=await request.json().catch(()=>({}));const to=String(body.to||"").trim(),text=String(body.text||"").trim();if(!to||!text)return j({error:"to ve text gerekli"},400);
  const version=String(env.META_GRAPH_VERSION||"v26.0");const endpoint="https://graph.facebook.com/"+version+"/"+env.WHATSAPP_PHONE_NUMBER_ID+"/messages";
  const rr=await fetch(endpoint,{method:"POST",headers:{Authorization:"Bearer "+env.WHATSAPP_ACCESS_TOKEN,"content-type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to,type:"text",text:{body:text}})});
  return new Response(await rr.text(),{status:rr.status,headers:{"content-type":"application/json"}});
 }
 return j({error:"not_found"},404);
}
