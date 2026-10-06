/* BTMEDYA Client Autopilot
 * Multi-tenant client content production on the canonical D1/R2 stack.
 * Marketing/evergreen copy is generated from the client's own workspace,
 * brand voice, pillars and approved archive; it does not invent external facts.
 */
const now=()=>new Date().toISOString();
const json=v=>{try{return JSON.parse(String(v||"{}"))}catch{return{}}};
const arr=v=>{try{const x=JSON.parse(String(v||"[]"));return Array.isArray(x)?x:[]}catch{return[]}};
const clean=(v,n=3000)=>String(v??"").trim().slice(0,n);

async function ensure(env){
  if(!env?.DB)return false;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS client_autopilot_runs(
    id TEXT PRIMARY KEY,client_id TEXT NOT NULL,content_id TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'native',status TEXT NOT NULL DEFAULT 'draft',
    error TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  )`).run().catch(()=>{});
  return true;
}
async function nextSlot(env){
  const slots=["10:00","13:00","16:00","19:00"];
  const nowDate=new Date();
  const tz="Europe/Istanbul";
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(nowDate);
  const get=t=>parts.find(x=>x.type===t)?.value||"";
  const day=`${get("year")}-${get("month")}-${get("day")}`;
  const hm=`${get("hour")}:${get("minute")}`;
  const pick=slots.find(x=>x>hm);
  if(pick){
    const [h,m]=pick.split(":").map(Number);
    const base=new Date(nowDate);
    const utcGuess=new Date(`${day}T${pick}:00+03:00`);
    if(utcGuess.getTime()>Date.now()+20*60000)return utcGuess.toISOString();
  }
  const tomorrow=new Date(nowDate.getTime()+86400000);
  const p=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(tomorrow);
  const day2=`${p.find(x=>x.type==="year")?.value}-${p.find(x=>x.type==="month")?.value}-${p.find(x=>x.type==="day")?.value}`;
  return new Date(`${day2}T10:00:00+03:00`).toISOString();
}
async function draftWithAI(env,client,strategy,last){
  const pillars=arr(strategy?.content_pillars_json).slice(0,10).join(", ");
  const prompt=[
    "BTMEDYA müşteri sosyal medya editörüsün.",
    "Yalnız müşterinin verdiği bilgilerle evergreen / marka içeriği üret.",
    "Dış kaynak bilgisi, istatistik, kampanya, fiyat, tarih veya başarı uydurma.",
    "Önceki içerik varsa üslup referansı olarak kullan ama cümleleri kopyalama.",
    "Türkçe JSON döndür: title, body, caption, content_type.",
    "caption en fazla 900 karakter; body 2-4 kısa paragraf.",
    "Müşteri adı: "+clean(client.name,200),
    "Sektör: "+clean(client.sector,200),
    "Marka dili: "+clean(client.brand_voice,600),
    "Konumlandırma: "+clean(strategy?.positioning,900),
    "İçerik sütunları: "+pillars,
    "Son onaylı içerik: "+clean(last?.title,220)+" — "+clean(last?.body,1000)
  ].join("\n");
  if(env.AI){
    try{
      const r=await env.AI.run("@cf/openai/gpt-oss-120b",{messages:[
        {role:"system",content:"Yalnız kaynaklanan müşteri bilgileriyle çalış. JSON dışında açıklama yazma."},
        {role:"user",content:prompt}
      ],max_tokens:700,temperature:0.2});
      const raw=String(r?.response||r?.output_text||"").trim();
      const m=raw.match(/\{[\s\S]*\}/);
      if(m){
        const x=JSON.parse(m[0]);
        if(x?.title&&x?.caption)return {title:clean(x.title,240),body:clean(x.body||x.caption,5000),caption:clean(x.caption,1200),content_type:clean(x.content_type||"social",80)};
      }
    }catch{}
  }
  return {
    title:client.name+" için marka içeriği",
    body:clean(strategy?.positioning||client.brand_voice||client.sector||"BTMEDYA tarafından hazırlanan marka içeriği.",1200),
    caption:clean(strategy?.positioning||client.brand_voice||client.sector||"Markamızın hikâyesi, yaklaşımı ve sunduğu değerler.",500),
    content_type:"social"
  };
}
export async function runClientAutopilot(env,{force=false,limit=10}={}){
  const out={ok:true,scanned:0,generated:0,scheduled:0,waitingApproval:0,skipped:0,errors:[]};
  if(!(await ensure(env)))return {...out,ok:false,errors:["D1 bağlı değil"]};
  const clients=(await env.DB.prepare(`SELECT id,name,sector,brand_voice,automation_enabled,social_management_enabled,status
    FROM client_workspaces WHERE status='active' AND automation_enabled=1 AND social_management_enabled=1
    ORDER BY updated_at DESC LIMIT ?`).bind(Number(limit)||10).all().catch(()=>({results:[]}))).results||[];
  out.scanned=clients.length;
  for(const client of clients){
    try{
      const native=(await env.DB.prepare(`SELECT id,network,handle FROM native_social_accounts
        WHERE client_id=? AND scope='client' AND status='connected'
        ORDER BY updated_at DESC`).bind(client.id).all().catch(()=>({results:[]}))).results||[];
      if(!native.length){out.skipped++;continue}
      const lastRun=await env.DB.prepare("SELECT * FROM client_autopilot_runs WHERE client_id=? ORDER BY created_at DESC LIMIT 1").bind(client.id).first().catch(()=>null);
      if(!force&&lastRun&&Date.parse(lastRun.created_at)>Date.now()-23*3600*1000){out.skipped++;continue}
      const strategy=await env.DB.prepare("SELECT * FROM client_strategies WHERE client_id=?").bind(client.id).first().catch(()=>null);
      const last=await env.DB.prepare("SELECT title,body FROM client_content WHERE client_id=? AND client_approved=1 ORDER BY updated_at DESC LIMIT 1").bind(client.id).first().catch(()=>null);
      const draft=await draftWithAI(env,client,strategy,last);
      const contentId=crypto.randomUUID(),t=now();
      await env.DB.prepare(`INSERT INTO client_content(id,client_id,title,content_type,engine,brief,body,media_key,preview_json,status,client_approved,published_at,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
          contentId,client.id,draft.title,draft.content_type,"btmedya-native-autopilot",
          clean(strategy?.positioning||client.brand_voice||client.sector,1000),draft.body,"",
          JSON.stringify({caption:draft.caption,generated:"autonomous-hourly"}),"draft",0,null,t,t
        ).run();
      out.generated++;
      const requires=Number(strategy?.approval_required??1)!==0;
      const canAuto=Number(strategy?.autopublish_enabled??0)===1&&!requires;
      const account=native[0];
      let scheduled=null;
      if(canAuto){
        scheduled=await nextSlot(env);
        const postId=crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO social_posts(
          id,title,body,platforms,format,media_key,source_slug,account_scope,metricool_brand_id,account_label,
          status,scheduled_at,created_at,updated_at,delivery_provider,native_account_id,client_id
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
          postId,draft.title,draft.caption,JSON.stringify([account.network]),
          account.network==="youtube"||account.network==="tiktok"?"9:16":"4:5","",contentId,
          "client","",String(client.name||account.handle||"Client Native"),"planlandi",scheduled,t,t,
          "native",String(account.id),String(client.id)
        ).run();
        out.scheduled++;
        await env.DB.prepare("UPDATE client_content SET status='scheduled',updated_at=? WHERE id=?").bind(t,contentId).run();
        await env.DB.prepare("INSERT OR REPLACE INTO client_autopilot_runs(id,client_id,content_id,provider,status,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
          .bind(crypto.randomUUID(),client.id,contentId,"native","scheduled","",t,t).run();
      }else{
        if(requires)out.waitingApproval++;
        await env.DB.prepare("INSERT OR REPLACE INTO client_autopilot_runs(id,client_id,content_id,provider,status,error,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
          .bind(crypto.randomUUID(),client.id,contentId,"native",requires?"approval":"draft","",t,t).run();
      }
    }catch(e){
      out.errors.push({client_id:client.id,error:clean(e?.message||e,500)});
    }
  }
  return out;
}
