/* BTMEDYA Autonomous Editorial & Social Autopilot
 * Kaynak -> trend -> rakip sinyali -> AI taslak -> medya seçimi -> yayın
 * politikası -> onay/otomatik yayın -> Metricool teslim.
 *
 * Güvenlik ilkeleri:
 * - Hassas/siyaset/kriz/şiddet içerikleri otomatik yayınlanmaz.
 * - Kaynak URL'si korunur; AI yalnız verilen kaynak özetinden taslak üretir.
 * - Platform bağlantısı olmayan ağlar için yayın isteği gönderilmez.
 * - Otomatik yayın yalnız politika + puan + kaynak seviyesi + medya koşulları sağlanırsa.
 * - Tüm kararlar D1 audit tablosuna yazılır.
 */

import { runNewsIntelligence } from "./news-intelligence.js";
import { metricoolConnectedNetworks } from "./social-platforms.js";
import { sonrakiYuva, altyazi, statikGorselAiMi } from "./sosyal-otomasyon.js";
import { processMetricoolQueue } from "./metricool-scheduler.js";

const KV_KEY = "autopilot:policy";

const DEFAULT_POLICY = {
  enabled: true,
  discoveryEveryMinutes: 15,
  maxItemsPerRun: 3,
  minScore: 72,
  autoPublish: true,
  autoPublishMinScore: 84,
  autoPublishSourceTiers: ["publisher"],
  approvalRequiredCategories: ["Gündem","Sağlık","Ulaşım","Asayiş","Yerel"],
  autoPublishCategories: ["Ekonomi","Kültür","Spor","Yapay Zekâ","Teknoloji","Medya","Prodüksiyon"],
  neverAutoPublishSensitive: true,
  mediaMode: "archive-first",
  allowAiMedia: true,
  allowedNetworks: ["tiktok","youtube"],
  autoScheduleSocial: true,
  maxSocialPerRun: 2,
  competitorHosts: [
    "gazetemerhaba.com",
    "balikesirim.net",
    "cumha.com.tr"
  ],
  trackedQueries: [
    "Balıkesir",
    "Balıkesir ekonomi",
    "Balıkesir belediye",
    "Balıkesir ulaşım",
    "Balıkesir spor",
    "Balıkesir teknoloji",
    "yapay zeka Türkiye"
  ]
};

const SENSITIVE = /\b(siyaset|seçim|secim|milletvekili|parti|cumhurbaşkanı|cumhurbaskani|tutuklan\w*|gözaltı|gozalti|soruşturma|sorusturma|iddianame|sanık|sanik|cinayet|öldür\w*|oldur\w*|silahlı|silahli|taciz|istismar|intihar|terör|teror|casus|ölü|olu|ölüm|olum|yaralı|yarali|yaralan\w*)\b/i;

function nowIso(){ return new Date().toISOString(); }
function normalizeArray(v,fallback=[]){ return Array.isArray(v)?v:fallback; }
function trimPolicy(p){
  const out={...DEFAULT_POLICY,...(p||{})};
  out.maxItemsPerRun=Math.max(1,Math.min(10,Number(out.maxItemsPerRun)||3));
  out.minScore=Math.max(0,Math.min(100,Number(out.minScore)||72));
  out.autoPublishMinScore=Math.max(out.minScore,Math.min(100,Number(out.autoPublishMinScore)||84));
  out.maxSocialPerRun=Math.max(0,Math.min(10,Number(out.maxSocialPerRun)||2));
  out.discoveryEveryMinutes=Math.max(5,Math.min(60,Number(out.discoveryEveryMinutes)||15));
  out.autoPublish=out.autoPublish===true;
  out.autoScheduleSocial=out.autoScheduleSocial!==false;
  out.neverAutoPublishSensitive=out.neverAutoPublishSensitive!==false;
  out.allowAiMedia=out.allowAiMedia!==false;
  out.allowedNetworks=[...new Set(normalizeArray(out.allowedNetworks,DEFAULT_POLICY.allowedNetworks).map(x=>String(x).toLowerCase()).filter(Boolean))];
  out.autoPublishCategories=normalizeArray(out.autoPublishCategories,DEFAULT_POLICY.autoPublishCategories).map(String);
  out.approvalRequiredCategories=normalizeArray(out.approvalRequiredCategories,DEFAULT_POLICY.approvalRequiredCategories).map(String);
  out.autoPublishSourceTiers=normalizeArray(out.autoPublishSourceTiers,DEFAULT_POLICY.autoPublishSourceTiers).map(String);
  out.competitorHosts=[...new Set(normalizeArray(out.competitorHosts,DEFAULT_POLICY.competitorHosts).map(x=>String(x).toLowerCase().replace(/^https?:\/\//,"").replace(/^www\./,"").replace(/\/$/,"")).filter(Boolean))].slice(0,20);
  out.trackedQueries=[...new Set(normalizeArray(out.trackedQueries,DEFAULT_POLICY.trackedQueries).map(String).map(x=>x.trim()).filter(Boolean))].slice(0,30);
  return out;
}

export async function autopilotPolicy(env){
  if(!env.KV) return {...DEFAULT_POLICY};
  const raw=await env.KV.get(KV_KEY).catch(()=>null);
  if(!raw) return {...DEFAULT_POLICY};
  try{return trimPolicy(JSON.parse(raw));}catch{return {...DEFAULT_POLICY};}
}

export async function setAutopilotPolicy(env,value){
  const p=trimPolicy(value);
  if(!env.KV) throw new Error("KV yapılandırılmadı");
  await env.KV.put(KV_KEY,JSON.stringify(p));
  return p;
}

async function ensureTables(env){
  if(!env.DB) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS autopilot_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_key TEXT NOT NULL UNIQUE,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    scanned INTEGER NOT NULL DEFAULT 0,
    candidates INTEGER NOT NULL DEFAULT 0,
    created_news INTEGER NOT NULL DEFAULT 0,
    published_news INTEGER NOT NULL DEFAULT 0,
    social_created INTEGER NOT NULL DEFAULT 0,
    social_scheduled INTEGER NOT NULL DEFAULT 0,
    blocked INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    detail TEXT NOT NULL DEFAULT '{}'
  )`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS autopilot_competitors (
    host TEXT PRIMARY KEY,
    label TEXT NOT NULL DEFAULT '',
    last_url TEXT NOT NULL DEFAULT '',
    last_title TEXT NOT NULL DEFAULT '',
    headlines_seen INTEGER NOT NULL DEFAULT 0,
    last_seen_at TEXT,
    updated_at TEXT NOT NULL
  )`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS autopilot_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER,
    action TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  `).run().catch(()=>{});
}

async function log(env,runId,action,target,status,reason,detail={}){
  if(!env.DB) return;
  await env.DB.prepare("INSERT INTO autopilot_log(run_id,action,target,status,reason,detail,created_at) VALUES(?,?,?,?,?,?,?)")
    .bind(runId,action,String(target||""),String(status||""),String(reason||"").slice(0,800),JSON.stringify(detail||{}),nowIso()).run().catch(()=>{});
}

function categoryFor(candidate){
  const c=String(candidate?.category||"Gündem");
  if(/yapay|teknoloji|ai/i.test(c)) return "Yapay Zekâ";
  if(/ekonomi|tarım|ticaret|fiyat|emlak/i.test(c)) return "Ekonomi";
  if(/spor/i.test(c)) return "Spor";
  if(/kultur|sanat/i.test(c)) return "Kültür";
  return c;
}

function safeSlug(s){
  return String(s||"haber").toLocaleLowerCase("tr-TR")
    .replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,110);
}

function sensitiveText(title,excerpt){ return SENSITIVE.test(String(title||"")+" "+String(excerpt||"")); }

async function aiDraft(env,candidate){
  const title=String(candidate.title||"").trim();
  const excerpt=String(candidate.excerpt||"").trim();
  const source=String(candidate.source_url||candidate.link||"").trim();
  if(env.AI){
    try{
      const prompt=[
        "BTMEDYA otomatik editör taslağısın.",
        "Yalnız aşağıdaki kaynak başlığı ve kaynak özetindeki olguları kullan.",
        "Yeni bilgi, rakam, kişi, tarih veya yorum uydurma.",
        "Kaynakta bulunmayan ayrıntıyı yazma.",
        "Türkçe JSON döndür: title, excerpt, body, social_caption.",
        "body 3-5 kısa paragraf olsun.",
        "Kaynak bağlantısını metin içinde belirtme; ayrı source_url alanında tutulacak.",
        "Bu otomatik taslak yayına hazır kabul edilmemeli.",
        "",
        "Kaynak başlığı: "+title,
        "Kaynak özeti: "+excerpt,
        "Kaynak URL: "+source
      ].join("\n");
      const r=await env.AI.run("@cf/openai/gpt-oss-120b",{messages:[
        {role:"system",content:"Yalnızca kaynak metnine sadık kal. JSON dışında açıklama yazma."},
        {role:"user",content:prompt}
      ],max_tokens:900,temperature:0.1});
      const raw=String(r?.response||r?.output_text||"").trim();
      const m=raw.match(/\{[\s\S]*\}/);
      if(m){
        const j=JSON.parse(m[0]);
        if(j?.title || j?.body) return {
          title:String(j.title||title).slice(0,240),
          excerpt:String(j.excerpt||excerpt).slice(0,1000),
          body:String(j.body||excerpt).slice(0,12000),
          social_caption:String(j.social_caption||excerpt).slice(0,1800)
        };
      }
    }catch{}
  }
  return {
    title:title.slice(0,240),
    excerpt:excerpt.slice(0,1000),
    body:excerpt ? excerpt : "Kaynak özeti mevcut; editoryal doğrulama bekleniyor.",
    social_caption:excerpt.slice(0,1200)
  };
}

async function chooseMedia(env,category,policy){
  if(!env.DB) return null;
  const wantsAi=(policy.mediaMode==="ai-first" || /yapay|ai|teknoloji/i.test(String(category||""))) && policy.allowAiMedia;
  const rows=(await env.DB.prepare(
    "SELECT id,key,mime,title,category,ai_generated,published,alt_text FROM media WHERE published=1 AND (mime LIKE 'image/%' OR mime LIKE 'video/%') ORDER BY CASE WHEN category=? THEN 0 ELSE 1 END, CASE WHEN ai_generated=? THEN 0 ELSE 1 END, created_at DESC LIMIT 40"
  ).bind(category,wantsAi?1:0).all().catch(()=>({results:[]}))).results||[];
  if(!rows.length) return null;
  const clean=rows.filter(x=>!SENSITIVE.test(String(x.title||"")));
  const pool=clean.length?clean:rows;
  const image=pool.find(x=>String(x.mime||"").startsWith("image/"))||null;
  const video=pool.find(x=>String(x.mime||"").startsWith("video/"))||null;
  if(!image && !video) return null;
  const primary=image||video;
  return {
    id:primary.id,
    key:primary.key,
    mime:primary.mime||"",
    title:primary.title||"",
    ai_generated:Boolean(primary.ai_generated),
    alt_text:primary.alt_text||"",
    public_url:"/pub/"+encodeURIComponent(primary.key),
    cover_key:image?.key||"",
    cover_url:image?"/pub/"+encodeURIComponent(image.key):"",
    social_key:video?.key||image?.key||"",
    social_url:video?"/pub/"+encodeURIComponent(video.key):(image?"/pub/"+encodeURIComponent(image.key):""),
    social_mime:video?.mime||image?.mime||""
  };
}

async function createOrUpdateNews(env,candidate,draft,publish,media){
  if(!env.DB) return null;
  const slug=safeSlug(draft.title)+"-"+Math.abs([...String(candidate.source_url||candidate.link||"")].reduce((a,ch)=>((a*31+ch.charCodeAt(0))|0),0));
  const now=nowIso();
  const cover=media?.cover_url||"";
  const video=media?.social_mime && String(media.social_mime).startsWith("video/") ? media.social_url : "";
  await env.DB.prepare(`INSERT INTO news(slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,source_url,original_date,archive_note,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET
      title=excluded.title,excerpt=excluded.excerpt,body=excluded.body,category=excluded.category,author=excluded.author,
      cover_url=excluded.cover_url,video_url=excluded.video_url,status=excluded.status,published_at=excluded.published_at,
      source_url=excluded.source_url,original_date=excluded.original_date,archive_note=excluded.archive_note,updated_at=excluded.updated_at`)
    .bind(slug,draft.title,draft.excerpt,draft.body,categoryFor(candidate),"BTMEDYA Otomatik Editör",cover,video,publish?"published":"draft",publish?now:null,
          String(candidate.source_url||candidate.link||"").slice(0,2000),String(candidate.original_date||candidate.date||"").slice(0,64),
          "BTMEDYA Autopilot · kaynak korundu · "+(publish?"otomatik yayın kararı":"editör onayı gerekli"),now).run();
  return {slug,status:publish?"published":"draft",cover_url:cover,video_url:video};
}

async function createSocialDraft(env,news,media,policy,runId){
  if(!env.DB || !policy.allowedNetworks.length) return null;
  const connected=metricoolConnectedNetworks(env);
  const networks=policy.allowedNetworks.filter(n=>connected.has(n));
  if(!networks.length) return {created:false,scheduled:false,reason:"Seçili sosyal ağların Metricool bağlantısı yok."};
  const ayar={
    aglar:networks.filter(n=>["instagram","facebook","tiktok","youtube"].includes(n)),
    otomatikPlanla:policy.autoScheduleSocial,
    saatler:["10:00","12:00","18:00"],
    tazelikSaat:72
  };
  if(!ayar.aglar.length) return {created:false,scheduled:false,reason:"Metricool için uyumlu ağ yok."};
  const scheduled=policy.autoScheduleSocial ? await sonrakiYuva(env,ayar) : null;
  if(policy.autoScheduleSocial && !scheduled) return {created:false,scheduled:false,reason:"Boş sosyal yayın yuvası bulunamadı."};
  const platformSlugs=ayar.aglar.map(n=>n==="youtube"?"youtube":n);
  const mediaKey=String(media?.social_key||media?.key||"");
  if(platformSlugs.some(x=>["youtube","tiktok"].includes(x)) && !mediaKey)
    return {created:false,scheduled:false,reason:"YouTube/TikTok için medya gerekli."};

  // Autopilot sadece BTMEDYA şirket hesabını kullanır. Kişisel hesaplar
  // ayrı Metricool Brand olmadan otomatik yayın zincirine alınmaz.
  const accountScope="company";
  const metricoolBrandId=String(env.METRICOOL_BRAND_ID||"").trim();
  if(!metricoolBrandId)
    return {created:false,scheduled:false,reason:"BTMEDYA şirket Metricool Brand ID eksik."};

  const postId=crypto.randomUUID();
  const body=String(news.excerpt||news.title||"")+"

Haber: https://btmedya.com.tr/haberler/"+news.slug;
  const format=platformSlugs.some(x=>x==="youtube" || x==="tiktok") ? "9:16" : "4:5";
  const status=policy.autoScheduleSocial && scheduled ? "planlandi" : "onayda";
  await env.DB.prepare("INSERT INTO social_posts(id,title,body,platforms,format,media_key,source_slug,account_scope,metricool_brand_id,account_label,status,scheduled_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(postId,String(news.title||"").slice(0,240),body,JSON.stringify(platformSlugs),format,mediaKey,
      news.slug,accountScope,metricoolBrandId,"BTMEDYA Şirket",status,scheduled,nowIso(),nowIso()).run().catch(()=>{});
  await log(env,runId,"social-create",postId,status,policy.autoScheduleSocial?"otomatik plan":"onay kuyruğu",{
    accountScope,metricoolBrandId,networks:platformSlugs,mediaKey
  });
  return {created:true,scheduled:Boolean(scheduled),postId,scheduled_at:scheduled,accountScope,metricoolBrandId};
}

async function allowedReference(env,url){
  const p=await autopilotPolicy(env);
  try{
    const u=new URL(String(url||""));
    const host=u.hostname.replace(/^www\./,"").toLowerCase();
    const allow=new Set([...(p.competitorHosts||[]),"news.google.com","trthaber.com","aa.com.tr","cumha.com.tr","balikesir.bel.tr"]);
    return u.protocol==="https:" && allow.has(host) ? u : null;
  }catch{return null;}
}

export async function referenceDraft(env,{url,instructions=""}={}){
  const target=await allowedReference(env,url);
  if(!target) return {ok:false,error:"Referans adresi yalnızca izinli kamuya açık kaynaklardan biri olmalı."};
  const r=await fetch(target.toString(),{headers:{accept:"text/html,application/xhtml+xml","user-agent":"BTMEDYA-ReferenceLab/1.0"},redirect:"follow"});
  if(!r.ok) return {ok:false,error:"Referans okunamadı: HTTP "+r.status};
  const html=await r.text();
  const plain=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim().slice(0,14000);
  if(!plain) return {ok:false,error:"Referans metni alınamadı."};
  if(env.AI){
    try{
      const prompt=[
        "BTMEDYA Reference Lab.",
        "Aşağıdaki üçüncü taraf sayfayı yalnız araştırma referansı olarak kullan.",
        "Metni kopyalama veya cümlelerini yeniden yazıp taklit etme.",
        "Yalnız doğrulanabilir bilgi çek; kaynak URL'sini koru.",
        "Türkçe JSON üret: title, excerpt, body, social_caption, facts, cautions.",
        "facts bir dizi kısa olgu; cautions belirsiz veya doğrulanması gereken noktalar.",
        instructions ? "Ek editör talimatı: "+String(instructions).slice(0,1000) : "",
        "Kaynak URL: "+target.toString(),
        "Sayfa metni:\n"+plain
      ].filter(Boolean).join("\n");
      const ai=await env.AI.run("@cf/openai/gpt-oss-120b",{messages:[
        {role:"system",content:"Kaynağa sadık araştırma asistanısın. Uydurma bilgi verme; JSON dışında açıklama yazma."},
        {role:"user",content:prompt}
      ],max_tokens:1200,temperature:0.1});
      const raw=String(ai?.response||ai?.output_text||"").trim();
      const m=raw.match(/\{[\s\S]*\}/);
      if(m){
        const j=JSON.parse(m[0]);
        return {ok:true,source_url:target.toString(),draft:j};
      }
    }catch{}
  }
  return {ok:true,source_url:target.toString(),draft:{
    title:target.hostname+" referans notu",
    excerpt:plain.slice(0,500),
    body:plain.slice(0,4000),
    social_caption:plain.slice(0,600),
    facts:[],
    cautions:["AI motoru kullanılamadı; editör doğrulaması gerekli."]
  }};
}

export async function generateAutopilotImage(env,{prompt,category="Yapay Zekâ",title="BTMEDYA AI LAB görseli"}={}){
  if(!env.AI) return {ok:false,error:"Workers AI bağlantısı yok"};
  const p=String(prompt||"").trim().slice(0,1800);
  if(!p) return {ok:false,error:"Görsel promptu gerekli"};
  const cleanTitle=String(title||"BTMEDYA AI LAB görseli").trim().slice(0,240);
  try{
    const out=await env.AI.run("@cf/black-forest-labs/flux-1-schnell",{prompt:p});
    const b64=String(out?.image||"");
    if(!b64) return {ok:false,error:"AI görseli boş döndü"};
    if(!env.MEDIA) return {ok:false,error:"R2 medya kasası bağlı değil"};
    const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const id=crypto.randomUUID();
    const key="ai-lab/"+id+"-"+safeSlug(cleanTitle)+".jpg";
    await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:"image/jpeg"}});
    const now=nowIso();
    if(env.DB){
      await env.DB.prepare(`INSERT INTO media (id,key,original_name,mime,size,category,tags,title,description,alt_text,published,slot,sort_order,created_at,updated_at,width,height,duration_s,has_audio,aspect,suggested,routed,posted,youtube_id,ai_generated)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id,key,key.split("/").pop(),"image/jpeg",bytes.byteLength,category,JSON.stringify(["BTMEDYA","ai-uretimi","ai-lab"]),
        cleanTitle,"BTMEDYA AI LAB tarafından üretilen görsel",cleanTitle,1,"",0,now,now,512,512,0,0,"1:1","[\"instagram-post\",\"facebook-post\",\"site-gorsel\"]","[]","[]","",1).run();
    }
    return {ok:true,id,key,mime:"image/jpeg",title:cleanTitle,ai_generated:true,public_url:"/pub/"+encodeURIComponent(key),model:"@cf/black-forest-labs/flux-1-schnell"};
  }catch(e){
    return {ok:false,error:String(e?.message||e).slice(0,500)};
  }
}

export async function runAutopilot(env,{force=false,limit}={}){
  await ensureTables(env);
  const policy=await autopilotPolicy(env);
  const runKey="run:"+Math.floor(Date.now()/60000);
  const started=nowIso();
  let runId=null;
  if(env.DB){
    const ins=await env.DB.prepare("INSERT OR IGNORE INTO autopilot_runs(run_key,started_at) VALUES(?,?)").bind(runKey,started).run().catch(()=>null);
    runId=ins?.meta?.last_row_id||null;
  }
  const result={
    ok:true,enabled:policy.enabled,runKey,runId,scanned:0,candidates:0,created_news:0,published_news:0,
    social_created:0,social_scheduled:0,blocked:0,error_count:0,items:[],competitors:[],policy
  };
  if(!force && !policy.enabled){
    result.ok=true; result.skipped=true; result.reason="Autopilot kapalı.";
    return result;
  }
  try{
    const intel=await runNewsIntelligence(env,{limit:Math.max(12,Number(limit)||policy.maxItemsPerRun*4)});
    result.scanned=Number(intel.scanned||0);
  }catch(e){
    result.error_count++; result.ok=false; result.errors=[String(e?.message||e).slice(0,300)];
  }

  let candidates=[];
  if(env.DB){
    candidates=(await env.DB.prepare(
      "SELECT ni.* FROM news_intelligence ni LEFT JOIN news n ON n.source_url=ni.source_url WHERE n.id IS NULL AND ni.score>=? ORDER BY ni.score DESC, ni.updated_at DESC LIMIT ?"
    ).bind(policy.minScore,policy.maxItemsPerRun).all().catch(()=>({results:[]}))).results||[];
  }
  result.candidates=candidates.length;

  let i=0;
  for(const candidate of candidates){
    i++;
    const sensitive=sensitiveText(candidate.title,candidate.excerpt);
    const category=categoryFor(candidate);
    const tier=String(candidate.source_tier||"discovery");
    let auto=policy.autoPublish &&
      candidate.score>=policy.autoPublishMinScore &&
      policy.autoPublishCategories.includes(category) &&
      policy.autoPublishSourceTiers.includes(tier) &&
      !sensitive;
    if(policy.neverAutoPublishSensitive && sensitive) auto=false;

    const needsApproval=sensitive || policy.approvalRequiredCategories.includes(category) || !auto;
    if(policy.neverAutoPublishSensitive && sensitive) {
      result.blocked++;
      await log(env,runId,"candidate",candidate.source_url,"blocked","hassas içerik otomatik yayın dışı",{
        category,score:candidate.score
      });
    }

    const draft=await aiDraft(env,candidate);
    const media=await chooseMedia(env,category,policy);
    if(auto && !media){
      auto=false;
      await log(env,runId,"candidate",candidate.source_url,"blocked","otomatik yayın için uygun arşiv medyası bulunamadı",{category});
    }
    const news=await createOrUpdateNews(env,candidate,draft,auto,media);
    if(!news) continue;
    result.created_news++;
    if(auto) result.published_news++;

    let social=null;
    if(news.status==="published" && result.social_created < policy.maxSocialPerRun){
      social=await createSocialDraft(env,{...news,title:draft.title,excerpt:draft.excerpt},media,policy,runId);
      if(social?.created) result.social_created++;
      if(social?.scheduled) result.social_scheduled++;
    }
    result.items.push({
      source_url:candidate.source_url,title:draft.title,category,
      score:Number(candidate.score||0),risk:Number(candidate.risk||0),
      status:news.status,needsApproval,media:media?{key:media.key,ai_generated:media.ai_generated}:null,
      social
    });
    await log(env,runId,"news",news.slug,news.status,auto?"kriterler sağlandı":"editör onayı gerektiriyor",{
      source:candidate.source_url,score:candidate.score,category,media:media?.key||""
    });
  }

  if(env.DB){
    // Rakip kaynakları kamuya açık RSS üzerinden yalnızca başlık sıklığı için izlenir.
    const hosts=policy.competitorHosts;
    const rows=[];
    for(const host of hosts){
      const url="https://news.google.com/rss/search?q=site%3A"+encodeURIComponent(host)+"&hl=tr&gl=TR&ceid=TR:tr";
      try{
        const r=await fetch(url,{headers:{accept:"application/rss+xml, text/xml","user-agent":"BTMEDYA-CompetitorRadar/1.0"}});
        const xml=await r.text();
        const items=[...xml.matchAll(/<item>[\s\S]*?<\/item>/gi)].slice(0,12).map(m=>m[0])
          .map(b=>({
            title:String((b.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]||"").replace(/<[^>]+>/g,"").replace(/<!\[CDATA\[|\]\]>/g,"").trim(),
            link:String((b.match(/<link>([\s\S]*?)<\/link>/i)||[])[1]||"").trim()
          })).filter(x=>x.title);
        const top=items[0];
        await env.DB.prepare(`INSERT INTO autopilot_competitors(host,label,last_url,last_title,headlines_seen,last_seen_at,updated_at)
          VALUES(?,?,?,?,?,?,?) ON CONFLICT(host) DO UPDATE SET
          last_url=excluded.last_url,last_title=excluded.last_title,headlines_seen=excluded.headlines_seen,last_seen_at=excluded.last_seen_at,updated_at=excluded.updated_at`)
          .bind(host,host,top?.link||"",top?.title||"",items.length,top?nowIso():null,nowIso()).run().catch(()=>{});
        rows.push({host,count:items.length,latest:top?.title||"",url:top?.link||""});
      }catch(e){ rows.push({host,count:0,error:String(e?.message||e).slice(0,120)}); }
    }
    result.competitors=rows;
    await env.DB.prepare("UPDATE autopilot_runs SET finished_at=?,scanned=?,candidates=?,created_news=?,published_news=?,social_created=?,social_scheduled=?,blocked=?,error_count=?,detail=? WHERE id=?")
      .bind(nowIso(),result.scanned,result.candidates,result.created_news,result.published_news,result.social_created,result.social_scheduled,result.blocked,result.error_count,JSON.stringify({items:result.items,competitors:result.competitors}),runId||0).run().catch(()=>{});
    if(result.social_created) {
      try{ await processMetricoolQueue(env,Math.max(1,result.social_created)); }catch{}
    }
  }
  return result;
}

export async function autopilotStatus(env){
  await ensureTables(env);
  const policy=await autopilotPolicy(env);
  if(!env.DB) return {ok:true,policy,runs:[],competitors:[],queue:[]};
  const runs=(await env.DB.prepare("SELECT * FROM autopilot_runs ORDER BY id DESC LIMIT 10").all().catch(()=>({results:[]}))).results||[];
  const competitors=(await env.DB.prepare("SELECT * FROM autopilot_competitors ORDER BY updated_at DESC").all().catch(()=>({results:[]}))).results||[];
  const queue=(await env.DB.prepare("SELECT id,title,status,platforms,format,media_key,source_slug,account_scope,account_label,metricool_brand_id,scheduled_at,updated_at FROM social_posts ORDER BY updated_at DESC LIMIT 20").all().catch(()=>({results:[]}))).results||[];
  return {ok:true,policy,runs,competitors,queue};
}

export function connectionMatrix(env){
  const connected=metricoolConnectedNetworks(env);
  const all=["youtube","facebook","tiktok","instagram","twitter","linkedin","whatsapp"];
  return all.map(network=>({
    network,
    label:network==="twitter"?"X":network.charAt(0).toUpperCase()+network.slice(1),
    via:connected.has(network)?"Metricool":"Doğrudan/OAuth",
    connected:connected.has(network),
    capabilities: network==="whatsapp"?["mesaj","müşteri bildirimi"]:["içerik","planlama","analiz"],
    note:connected.has(network)?"Bağlı ağ olarak kullanılabilir.":"Bağlantı kurulmalı; credential/token Worker koduna yazılmaz."
  }));
}
