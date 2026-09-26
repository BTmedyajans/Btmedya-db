const NETWORKS = new Set(["facebook","instagram","tiktok","youtube","linkedin","twitter","threads","pinterest","gmb","bluesky"]);

function localDateTime(iso, timezone="Europe/Istanbul"){
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit",
    hourCycle:"h23"
  }).formatToParts(d);
  const get = (t) => parts.find(x=>x.type===t)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

function providerFor(slug){
  const s=String(slug||"").toLowerCase();
  if(s.startsWith("instagram")) return {network:"instagram", data:{type:s.includes("reel")?"REEL":s.includes("story")?"STORY":"POST"}};
  if(s.startsWith("facebook")) return {network:"facebook", data:{type:s.includes("reel")?"REEL":"POST"}};
  if(s==="tiktok") return {network:"tiktok", data:{}};
  if(s==="youtube-short") return {network:"youtube", data:{type:"short",privacy:"public",madeForKids:false}};
  if(s==="youtube") return {network:"youtube", data:{type:"video",privacy:"public",madeForKids:false}};
  if(NETWORKS.has(s)) return {network:s,data:{}};
  return null;
}

function providersFrom(row){
  let list=[];
  try { list=JSON.parse(row.platforms||"[]"); } catch {}
  const out=[]; const seen=new Set();
  for(const slug of (Array.isArray(list)?list:[])){
    const p=providerFor(slug);
    if(p && !seen.has(p.network)){ seen.add(p.network); out.push(p); }
  }
  return out;
}

function cleanText(row){
  const title=String(row.title||"").trim();
  const body=String(row.body||"").trim();
  return body || title;
}

async function publicMediaUrl(env, key){
  if(!key) return null;
  const origin=String(env.BTMEDYA_PUBLIC_ORIGIN||"https://btmedya.com.tr").replace(/\/$/,"");
  return `${origin}/pub/${encodeURIComponent(String(key))}`;
}

function youtubeDataFor(providers,row){
  const p=providers.find(x=>x.network==="youtube");
  if(!p) return undefined;
  const title=String(row.title||"BTMEDYA").slice(0,100);
  p.data={...(p.data||{}),title};
  return p.data;
}

export async function scheduleToMetricool(env,row){
  if(!env.METRICOOL_USER_TOKEN) return {ok:false,skipped:true,error:"METRICOOL_USER_TOKEN eksik"};
  const userId=String(env.METRICOOL_USER_ID||"5278969");
  const blogId=String(env.METRICOOL_BRAND_ID||"6858384");
  const timezone=String(env.METRICOOL_TIMEZONE||"Europe/Istanbul");
  const dateTime=localDateTime(row.scheduled_at,timezone);
  if(!dateTime) return {ok:false,error:"scheduled_at geçersiz"};
  if(new Date(row.scheduled_at).getTime()<=Date.now()+30000) return {ok:false,error:"Planlanan zaman Metricool'a gönderim için çok yakın/geçmiş"};
  const providers=providersFrom(row);
  if(!providers.length) return {ok:false,error:"Geçerli sosyal platformu yok"};

  const mediaUrl=await publicMediaUrl(env,row.media_key);
  const body={
    publicationDate:{dateTime,timezone},
    text:cleanText(row),
    providers:providers.map(x=>({network:x.network})),
    autoPublish:true,
    draft:false,
    shortener:false,
    saveExternalMediaFiles:Boolean(mediaUrl),
    creatorUserMail:env.METRICOOL_CREATOR_EMAIL||undefined
  };
  if(mediaUrl) body.media=[mediaUrl];
  const ig=providers.find(x=>x.network==="instagram");
  const fb=providers.find(x=>x.network==="facebook");
  const tt=providers.find(x=>x.network==="tiktok");
  if(ig) body.instagramData={...ig.data,isAiGenerated:false};
  if(fb) body.facebookData={...fb.data};
  if(tt) body.tiktokData={...tt.data};
  const yt=youtubeDataFor(providers,row);
  if(yt) body.youtubeData=yt;

  const endpoint=`https://app.metricool.com/api/v2/scheduler/posts?blogId=${encodeURIComponent(blogId)}&userId=${encodeURIComponent(userId)}`;
  const res=await fetch(endpoint,{
    method:"POST",
    headers:{"X-Mc-Auth":String(env.METRICOOL_USER_TOKEN),"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const raw=await res.text();
  let data=null; try{ data=JSON.parse(raw); }catch{}
  if(!res.ok) return {ok:false,status:res.status,error:typeof data==="object"&&data?JSON.stringify(data):raw.slice(0,1200)};
  const id=data?.id ?? data?.data?.id ?? data?.uuid ?? data?.data?.uuid ?? null;
  return {ok:true,id:id?String(id):null,response:data};
}

export async function processMetricoolQueue(env,limit=10){
  const result={enabled:Boolean(env.METRICOOL_USER_TOKEN),processed:0,scheduled:0,failed:0,skipped:0,items:[]};
  if(!env.DB || !env.METRICOOL_USER_TOKEN) return result;
  const now=new Date().toISOString();
  const rows=(await env.DB.prepare(
    "SELECT * FROM social_posts WHERE status='planlandi' AND scheduled_at IS NOT NULL AND scheduled_at>? AND (metricool_scheduled_id IS NULL OR metricool_scheduled_id='') ORDER BY scheduled_at ASC LIMIT ?"
  ).bind(now,Number(limit)||10).all()).results||[];
  for(const row of rows){
    result.processed++;
    try{
      const out=await scheduleToMetricool(env,row);
      if(out.ok){
        await env.DB.prepare(
          "UPDATE social_posts SET metricool_scheduled_id=?, metricool_status='scheduled', metricool_error='', updated_at=? WHERE id=?"
        ).bind(out.id||"submitted",new Date().toISOString(),row.id).run();
        result.scheduled++;
        result.items.push({id:row.id,status:"scheduled",metricoolId:out.id||null});
      }else{
        await env.DB.prepare(
          "UPDATE social_posts SET metricool_status='error', metricool_error=?, updated_at=? WHERE id=?"
        ).bind(String(out.error||"Metricool scheduling failed").slice(0,2000),new Date().toISOString(),row.id).run();
        result.failed++;
        result.items.push({id:row.id,status:"error",error:String(out.error||"").slice(0,300)});
      }
    }catch(e){
      const msg=String(e?.message||e).slice(0,2000);
      await env.DB.prepare(
        "UPDATE social_posts SET metricool_status='error', metricool_error=?, updated_at=? WHERE id=?"
      ).bind(msg,new Date().toISOString(),row.id).run().catch(()=>{});
      result.failed++;
      result.items.push({id:row.id,status:"error",error:msg.slice(0,300)});
    }
  }
  return result;
}
