/* BTMEDYA Windsor.ai read-only analytics.
 * API keys are Worker Secrets and never returned to the browser.
 * Requests use Windsor.ai's documented api_key query parameter server-side only.
 * This module only reads data; it never invokes connector write actions.
 */
const j=(data,status=200)=>new Response(JSON.stringify(data),{
  status,
  headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
const RANGES=new Set(["last_7d","last_28d","last_90d"]);
const CONNECTORS={
  "search-console":{
    source:"searchconsole",
    selectAccount:"https://btmedya.com.tr/",
    fields:["date","page","query","clicks","impressions","ctr","position"],
    label:"Google Search Console"
  },
  instagram:{
    source:"instagram",
    selectAccount:"17841408084433281",
    fields:["date","reach","impressions","profile_views","website_clicks_1d","follower_count","accounts_engaged"],
    label:"Instagram"
  }
};
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const round=(n,d=2)=>Number(Number(n||0).toFixed(d));
const text=v=>String(v??"").trim();
function rowsFrom(payload){
  if(Array.isArray(payload)) return payload;
  if(Array.isArray(payload?.data)) return payload.data;
  if(Array.isArray(payload?.results)) return payload.results;
  return null;
}
function planLimit(payload){
  const raw=JSON.stringify(payload||{}).toLowerCase();
  return raw.includes("reads are paused") || raw.includes("not your real numbers") ||
    (raw.includes("free plan") && raw.includes("account"));
}
function groupMetricRows(rows,key,metricKeys){
  const groups=new Map();
  for(const row of rows){
    const name=text(row?.[key]);
    if(!name) continue;
    const old=groups.get(name)||{name,clicks:0,impressions:0,positionWeighted:0,positionWeight:0};
    old.clicks+=num(row.clicks);
    old.impressions+=num(row.impressions);
    const pos=num(row.position);
    const weight=num(row.impressions);
    if(pos>0&&weight>0){old.positionWeighted+=pos*weight;old.positionWeight+=weight;}
    groups.set(name,old);
  }
  return [...groups.values()].map(x=>({
    [key]:x.name,
    clicks:x.clicks,
    impressions:x.impressions,
    ctr:x.impressions?round(x.clicks/x.impressions,4):0,
    averagePosition:x.positionWeight?round(x.positionWeighted/x.positionWeight,2):null
  })).sort((a,b)=>b.clicks-a.clicks||b.impressions-a.impressions).slice(0,10);
}
export function summarizeWindsorSearchConsole(rows){
  const total={clicks:0,impressions:0,positionWeighted:0,positionWeight:0};
  const days=new Map();
  for(const row of rows){
    total.clicks+=num(row.clicks);
    total.impressions+=num(row.impressions);
    const weight=num(row.impressions),position=num(row.position);
    if(weight>0&&position>0){total.positionWeighted+=position*weight;total.positionWeight+=weight;}
    const date=text(row.date)||"unknown";
    const d=days.get(date)||{date,clicks:0,impressions:0};
    d.clicks+=num(row.clicks);d.impressions+=num(row.impressions);days.set(date,d);
  }
  return {
    summary:{
      clicks:total.clicks,
      impressions:total.impressions,
      ctr:total.impressions?round(total.clicks/total.impressions,4):0,
      averagePosition:total.positionWeight?round(total.positionWeighted/total.positionWeight,2):null
    },
    daily:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({...x,ctr:x.impressions?round(x.clicks/x.impressions,4):0})),
    topPages:groupMetricRows(rows,"page"),
    topQueries:groupMetricRows(rows,"query")
  };
}
export function summarizeWindsorInstagram(rows){
  const keys=[
    ["reach","reach"],["impressions","impressions"],["profileViews","profile_views"],
    ["websiteClicks","website_clicks_1d"],["newFollowers","follower_count"],["accountsEngaged","accounts_engaged"]
  ];
  const summary={};
  for(const [out,field] of keys) summary[out]=rows.reduce((sum,row)=>sum+num(row?.[field]),0);
  const days=new Map();
  for(const row of rows){
    const date=text(row?.date)||"unknown";
    const d=days.get(date)||{date,reach:0,impressions:0,profileViews:0,websiteClicks:0,newFollowers:0,accountsEngaged:0};
    for(const [out,field] of keys)d[out]+=num(row?.[field]);
    days.set(date,d);
  }
  return {summary,daily:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date))};
}
export async function windsorAnalyticsApi(request,env,url,validSession,sessionSecret){
  if(!url.pathname.startsWith("/api/admin/windsor/"))return null;
  if(!(await validSession(request,sessionSecret)))return j({ok:false,error:"Yetkisiz"},401);
  if(request.method!=="GET")return j({ok:false,error:"Yalnızca GET desteklenir"},405);
  if(url.pathname==="/api/admin/windsor/status"){
    return j({
      ok:true,
      configured:Boolean(text(env.WINDSOR_API_KEY)),
      availableConnectors:Object.keys(CONNECTORS),
      note:text(env.WINDSOR_API_KEY)?"Windsor.ai anahtarı Worker Secret olarak tanımlı.":"Windsor.ai anahtarı henüz Worker'a bağlanmadı."
    });
  }
  const match=url.pathname.match(/^\/api\/admin\/windsor\/(search-console|instagram)$/);
  if(!match)return j({ok:false,error:"Windsor raporu bulunamadı"},404);
  if(!text(env.WINDSOR_API_KEY))return j({
    ok:false,code:"WINDSOR_KEY_MISSING",
    error:"Windsor.ai API anahtarı henüz siteye bağlanmadı.",
    action:"GitHub Secrets'a BTMEDYA_WINDSOR_API_KEY ekleyip 'BTMEDYA Sync Worker Secrets' akışını windsor kapsamıyla çalıştırın."
  },503);
  const connector=match[1],config=CONNECTORS[connector];
  const range=RANGES.has(url.searchParams.get("range"))?url.searchParams.get("range"):"last_7d";
  const cacheKey="windsor:report:"+connector+":"+range;
  if(env.KV){
    const cached=await env.KV.get(cacheKey).catch(()=>null);
    if(cached){try{return j({...JSON.parse(cached),cached:true})}catch{}}
  }
  const params=new URLSearchParams({
    api_key:String(env.WINDSOR_API_KEY),
    fields:config.fields.join(","),
    date_preset:range,
    select_accounts:config.selectAccount,
    _renderer:"json"
  });
  let response,payload;
  try{
    response=await fetch("https://connectors.windsor.ai/"+config.source+"?"+params.toString(),{
      headers:{"accept":"application/json","user-agent":"BTMEDYA-Windsor-Integration/1.0"},
      signal:AbortSignal.timeout(18000)
    });
    const raw=await response.text();
    try{payload=JSON.parse(raw)}catch{return j({ok:false,code:"WINDSOR_BAD_RESPONSE",error:"Windsor.ai JSON olmayan bir yanıt döndürdü."},502)}
  }catch(error){
    return j({ok:false,code:"WINDSOR_UNAVAILABLE",error:"Windsor.ai servisine erişilemedi. Daha sonra yeniden deneyin."},502);
  }
  if(!response.ok){
    const status=response.status===401||response.status===403?401:response.status===429?429:502;
    return j({
      ok:false,
      code:status===401?"WINDSOR_KEY_REJECTED":status===429?"WINDSOR_RATE_LIMIT":"WINDSOR_UPSTREAM_ERROR",
      error:status===401?"Windsor.ai API anahtarı reddedildi veya bu kaynağa erişim izni yok.":status===429?"Windsor.ai istek sınırına ulaşıldı. Daha sonra yeniden deneyin.":"Windsor.ai veri isteği başarısız oldu.",
      upstreamStatus:response.status
    },status);
  }
  if(planLimit(payload))return j({
    ok:false,
    code:"WINDSOR_PLAN_LIMIT",
    error:"Windsor.ai veri okumayı hesap sınırı nedeniyle durdurmuş. API anahtarı tek başına bu plan sınırını kaldırmıyor.",
    action:"Windsor.ai panelinde bağlı hesapları azaltın veya planın izin verdiği hesap sayısını yükseltin."
  },409);
  const rows=rowsFrom(payload);
  if(!rows){
    const upstreamError=text(payload?.error||payload?.message);
    return j({ok:false,code:"WINDSOR_DATA_ERROR",error:upstreamError?upstreamError.slice(0,400):"Windsor.ai beklenen veri listesini döndürmedi."},502);
  }
  const suspicious=rows.some(row=>Object.values(row||{}).some(v=>typeof v==="string"&&/reads are paused|not your real numbers/i.test(v)));
  if(suspicious)return j({
    ok:false,
    code:"WINDSOR_PLAN_LIMIT",
    error:"Windsor.ai veri okumayı hesap sınırı nedeniyle durdurmuş. Sıfır değerler gerçek performans verisi olarak gösterilmedi.",
    action:"Windsor.ai panelinde bağlı hesapları azaltın veya planın izin verdiği hesap sayısını yükseltin."
  },409);
  const data=connector==="search-console"?summarizeWindsorSearchConsole(rows):summarizeWindsorInstagram(rows);
  const result={
    ok:true,connector,label:config.label,range,
    account:connector==="search-console"?"https://btmedya.com.tr/":"busetuncayy10",
    fetched_at:new Date().toISOString(),cached:false,rowCount:rows.length,...data
  };
  if(env.KV)await env.KV.put(cacheKey,JSON.stringify(result),{expirationTtl:900}).catch(()=>{});
  return j(result);
}
