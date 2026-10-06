/* BTMEDYA hourly autonomous content pulse.
 * Reuses the canonical newsroom/autopilot pipeline. It never invents facts:
 * discovery stays source-grounded; sensitive/approval-required categories keep
 * their existing editorial gate.
 */
import { runAutopilot } from "./autopilot.js";
import { runClientAutopilot } from "./client-autopilot.js";

export async function runHourlyContentPulse(env,{force=false}={}){
  const result={ok:true,ran:false,reason:"",autopilot:null,clients:null};
  if(env?.KV){
    const key="autonomous:pulse:last";
    const last=await env.KV.get(key).catch(()=>null);
    const age=last?Date.now()-Number(last):Infinity;
    if(!force&&age<55*60*1000){result.reason="Saatlik tur zaten çalıştı.";return result;}
    await env.KV.put(key,String(Date.now()),{expirationTtl:7200}).catch(()=>{});
  }
  try{
    result.autopilot=await runAutopilot(env,{force:true,limit:3});
    result.clients=await runClientAutopilot(env,{force:true,limit:12});
    result.ran=true;
    return result;
  }catch(e){
    result.ok=false;
    result.reason=String(e?.message||e).slice(0,800);
    return result;
  }
}
