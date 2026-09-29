import { statikGorselAiMi } from "./sosyal-otomasyon.js";
import { metricoolConnectedNetworks } from "./social-platforms.js";

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
  const k=String(key);
  if(k.startsWith("static/")) return `${origin}/assets/${k.slice(7)}`;
  if(k.startsWith("otomasyon/")) return `${origin}/gorsel/${k}`;
  return `${origin}/pub/${encodeURIComponent(k)}`;
}

async function yapayZekaMi(env, key){
  if(String(key||"").startsWith("otomasyon/")) return false;
  if(/^static\/kategori-kapak\//.test(String(key||""))) return false;
  const statik=await statikGorselAiMi(env,key);
  if(statik!==null) return statik;
  if(!key || !env.DB) return true;
  const r=await env.DB.prepare("SELECT ai_generated FROM media WHERE key=?").bind(String(key)).first().catch(()=>null);
  return r ? Boolean(r.ai_generated) : true;
}

async function takipTablosu(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS metricool_gonderim (
    post_id TEXT PRIMARY KEY,
    metricool_id TEXT NOT NULL DEFAULT '',
    durum TEXT NOT NULL DEFAULT '',
    hata TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    retryable INTEGER NOT NULL DEFAULT 1
  )`).run();
  try { await env.DB.prepare("ALTER TABLE metricool_gonderim ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0").run(); } catch {}
  try { await env.DB.prepare("ALTER TABLE metricool_gonderim ADD COLUMN retryable INTEGER NOT NULL DEFAULT 1").run(); } catch {}
}

function youtubeDataFor(providers,row){
  const p=providers.find(x=>x.network==="youtube");
  if(!p) return undefined;
  const title=String(row.title||"BTMEDYA").slice(0,100);
  p.data={...(p.data||{}),title};
  return p.data;
}

export async function scheduleToMetricool(env,row){
  if(!env.METRICOOL_USER_TOKEN) return {ok:false,skipped:true,retryable:false,error:"METRICOOL_USER_TOKEN eksik"};
  const userId=String(env.METRICOOL_USER_ID||env.METRICOOL_KULLANICI_NO||"");
  const blogId=String(env.METRICOOL_BRAND_ID||"6858384");
  if(!userId) return {ok:false,retryable:false,error:"METRICOOL_USER_ID eksik"};
  const timezone=String(env.METRICOOL_TIMEZONE||"Europe/Istanbul");
  const scheduledMs=new Date(row.scheduled_at||"").getTime();
  const dateTime=localDateTime(row.scheduled_at,timezone);
  if(!dateTime || Number.isNaN(scheduledMs)) return {ok:false,retryable:false,error:"scheduled_at geçersiz"};
  if(scheduledMs<=Date.now()+15000) return {ok:false,retryable:false,error:"Planlanan zaman geçmiş veya Metricool için artık çok yakın"};

  const providers=providersFrom(row);
  if(!providers.length) return {ok:false,retryable:false,error:"Geçerli sosyal platformu yok"};

  const connected=metricoolConnectedNetworks(env);
  const disconnected=providers.filter(p=>!connected.has(p.network)).map(p=>p.network);
  if(disconnected.length){
    return {ok:false,retryable:false,error:"Metricool Brand bağlantısı yok: "+disconnected.join(", ")};
  }

  const mediaUrl=await publicMediaUrl(env,row.media_key);
  const hasMedia=Boolean(mediaUrl);
  const needsMedia=providers.some(p =>
    p.network==="instagram" || p.network==="tiktok" || p.network==="youtube" ||
    (p.network==="facebook" && ["REEL","STORY"].includes(String(p.data?.type||"")))
  );
  if(needsMedia && !hasMedia) return {ok:false,retryable:false,error:"Seçilen platform için görsel/video zorunlu; media_key eksik"};

  const ai=await yapayZekaMi(env,row.media_key);
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
  if(ig) body.instagramData={...ig.data,isAiGenerated:ai};
  if(fb) body.facebookData={...fb.data};

  const video=/\.(mp4|mov|m4v|webm)(?:$|\?)/i.test(String(mediaUrl||""));
  if(tt) body.tiktokData={
    ...tt.data,
    isAigc:ai,
    ...(video?{}:{title:String(row.title||"").slice(0,90)})
  };

  const yt=youtubeDataFor(providers,row);
  if(yt) body.youtubeData=yt;

  const taban=String(env.METRICOOL_API_BASE||"https://app.metricool.com").replace(/\/$/,"");
  const endpoint=`${taban}/api/v2/scheduler/posts?blogId=${encodeURIComponent(blogId)}&userId=${encodeURIComponent(userId)}`;
  const res=await fetch(endpoint,{
    method:"POST",
    headers:{"X-Mc-Auth":String(env.METRICOOL_USER_TOKEN),"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  const raw=await res.text();
  let data=null; try{ data=JSON.parse(raw); }catch{}
  if(!res.ok) {
    const detail=typeof data==="object"&&data?JSON.stringify(data):raw.slice(0,1200);
    const retryable=res.status===429 || res.status>=500;
    return {ok:false,status:res.status,retryable,error:detail||`Metricool HTTP ${res.status}`};
  }
  const id=data?.id ?? data?.data?.id ?? data?.uuid ?? data?.data?.uuid ?? null;
  return {ok:true,id:id?String(id):null,response:data};
}

export async function processMetricoolQueue(env,limit=10){
  const result={enabled:Boolean(env.METRICOOL_USER_TOKEN),processed:0,scheduled:0,failed:0,retried:0,skipped:0,items:[]};
  if(!env.DB || !env.METRICOOL_USER_TOKEN) return result;
  await takipTablosu(env);

  const now=new Date();
  const nowIso=now.toISOString();
  const retryBefore=new Date(now.getTime()-5*60*1000).toISOString();
  const rows=(await env.DB.prepare(
    `SELECT p.*, g.durum AS metricool_durum, g.attempts AS metricool_attempts, g.updated_at AS metricool_updated_at
       FROM social_posts p
       LEFT JOIN metricool_gonderim g ON g.post_id=p.id
      WHERE p.status='planlandi'
        AND p.scheduled_at IS NOT NULL
        AND p.scheduled_at > ?
        AND (
          g.post_id IS NULL
          OR (g.durum='hata' AND COALESCE(g.retryable,1)=1 AND g.updated_at <= ? AND COALESCE(g.attempts,0) < 5)
        )
      ORDER BY p.scheduled_at ASC LIMIT ?`
  ).bind(nowIso,retryBefore,Number(limit)||10).all()).results||[];

  const yaz=async(id,metricoolId,durum,hata,attempts,retryable=1)=>env.DB.prepare(
    `INSERT INTO metricool_gonderim(post_id,metricool_id,durum,hata,updated_at,attempts,retryable)
     VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(post_id) DO UPDATE SET
       metricool_id=excluded.metricool_id,durum=excluded.durum,hata=excluded.hata,
       updated_at=excluded.updated_at,attempts=excluded.attempts,retryable=excluded.retryable`
  ).bind(String(id),String(metricoolId||""),durum,String(hata||"").slice(0,2000),new Date().toISOString(),attempts,retryable);

  for(const row of rows){
    result.processed++;
    const previous=Number(row.metricool_attempts||0);
    const attempts=previous+1;
    if(row.metricool_durum==="gonderiliyor" && row.metricool_updated_at && new Date(row.metricool_updated_at).getTime() > Date.now()-10*60*1000){
      result.skipped++;
      continue;
    }

    await yaz(row.id,"","gonderiliyor","",attempts,1).run();

    try{
      const out=await scheduleToMetricool(env,row);
      if(out.ok){
        await yaz(row.id,out.id||"submitted","planlandi","",attempts,0).run();
        result.scheduled++;
        if(attempts>1) result.retried++;
        result.items.push({id:row.id,status:"scheduled",metricoolId:out.id||null,attempts});
      }else{
        await yaz(row.id,"","hata",out.error||"Metricool planlamasi basarisiz",attempts,out.retryable===false?0:1).run();
        result.failed++;
        result.items.push({id:row.id,status:"error",retryable:Boolean(out.retryable),error:String(out.error||"").slice(0,300),attempts});
      }
    }catch(e){
      const msg=String(e?.message||e);
      await yaz(row.id,"","hata",msg,attempts,1).run().catch(()=>{});
      result.failed++;
      result.items.push({id:row.id,status:"error",retryable:true,error:msg.slice(0,300),attempts});
    }
  }
  return result;
}

export async function disTeslimKaydet(env,postId,metricoolId){
  if(!env.DB) return false;
  await takipTablosu(env);
  await env.DB.prepare(
    `INSERT INTO metricool_gonderim(post_id,metricool_id,durum,hata,updated_at,attempts,retryable)
     VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(post_id) DO UPDATE SET metricool_id=excluded.metricool_id,durum=excluded.durum,hata='',updated_at=excluded.updated_at`
  ).bind(String(postId),String(metricoolId).slice(0,120),"planlandi","",new Date().toISOString(),1,0).run();
  return true;
}

export async function teslimDurumlari(env){
  if(!env.DB) return {};
  const r=await env.DB.prepare("SELECT post_id,metricool_id,durum,hata,attempts,updated_at FROM metricool_gonderim").all().catch(()=>null);
  return Object.fromEntries(((r&&r.results)||[]).map(x=>[x.post_id,x]));
}

export async function metricoolDurumu(env){
  const d={yapilandirildi:Boolean(env.METRICOOL_USER_TOKEN),planlanan:0,hatali:0,sonHata:""};
  if(!env.DB) return d;
  const r=await env.DB.prepare(
    "SELECT SUM(CASE WHEN durum='planlandi' THEN 1 ELSE 0 END) AS p, SUM(CASE WHEN durum='hata' THEN 1 ELSE 0 END) AS h, (SELECT hata FROM metricool_gonderim WHERE durum='hata' ORDER BY updated_at DESC LIMIT 1) AS son FROM metricool_gonderim"
  ).first().catch(()=>null);
  if(r){ d.planlanan=Number(r.p||0); d.hatali=Number(r.h||0); d.sonHata=String(r.son||"").slice(0,300); }
  return d;
}
