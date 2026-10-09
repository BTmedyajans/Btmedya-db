import { kaynakKaydet, kaynakBagla, ensureKaynakMasasiTables, ilceBul } from "./kaynak-masasi.js";

/* BTMEDYA Haber İstihbarat Motoru
 * Gün içi keşif katmanı: Google Trends TR + birincil/ulusal kaynaklar +
 * Balıkesir yerel yayınlarının kamuya açık RSS/Google News sonuçları.
 *
 * Bu katman "haber bulur"; doğrulanmamış iddiayı otomatik yayınlamaz.
 * Güvenli otomatik yayın ayrı olarak Sabah Masası'nın kaynak/metin/rakam/ad/
 * kalite denetimlerinden geçer.
 */
const FEEDS = [
  {id:'google-balikesir', name:'Google News / Balıkesir', url:'https://news.google.com/rss/search?q=Bal%C4%B1kesir&hl=tr&gl=TR&ceid=TR:tr', category:'Yerel', tier:'discovery'},
  {id:'google-balikesir-ekonomi', name:'Google News / Balıkesir ekonomi', url:'https://news.google.com/rss/search?q=Bal%C4%B1kesir%20ekonomi&hl=tr&gl=TR&ceid=TR:tr', category:'Ekonomi', tier:'discovery'},
  {id:'google-balikesir-belediye', name:'Google News / Balıkesir belediye', url:'https://news.google.com/rss/search?q=Bal%C4%B1kesir%20belediye&hl=tr&gl=TR&ceid=TR:tr', category:'Yerel', tier:'discovery'},
  {id:'google-balikesir-spor', name:'Google News / Balıkesir spor', url:'https://news.google.com/rss/search?q=Bal%C4%B1kesir%20spor&hl=tr&gl=TR&ceid=TR:tr', category:'Spor', tier:'discovery'},
  {id:'google-balikesir-teknoloji', name:'Google News / Balıkesir teknoloji', url:'https://news.google.com/rss/search?q=Bal%C4%B1kesir%20teknoloji&hl=tr&gl=TR&ceid=TR:tr', category:'Yapay Zekâ', tier:'discovery'},
  {id:'google-turkiye', name:'Google News / Türkiye', url:'https://news.google.com/rss/search?q=T%C3%BCrkiye&hl=tr&gl=TR&ceid=TR:tr', category:'Gündem', tier:'discovery'},
  {id:'google-ai', name:'Google News / Yapay Zekâ', url:'https://news.google.com/rss/search?q=yapay%20zeka%20AI&hl=tr&gl=TR&ceid=TR:tr', category:'Yapay Zekâ', tier:'discovery'},
  {id:'google-merhaba', name:'Google News / Gazete Merhaba', url:'https://news.google.com/rss/search?q=site%3Agazetemerhaba.com%20Bal%C4%B1kesir&hl=tr&gl=TR&ceid=TR:tr', category:'Yerel', tier:'competitor'},
  {id:'google-balikesirim', name:'Google News / Balikesirim', url:'https://news.google.com/rss/search?q=site%3Abalikesirim.net%20Bal%C4%B1kesir&hl=tr&gl=TR&ceid=TR:tr', category:'Yerel', tier:'competitor'},
  {id:'cumha-balikesir', name:'CUMHA / Balıkesir', url:'https://cumha.com.tr/rss/lokasyon/balikesir', category:'Yerel', tier:'publisher'},
  {id:'trt-manset', name:'TRT Haber / Manşet', url:'https://www.trthaber.com/manset_articles.rss', category:'Gündem', tier:'publisher'},
  {id:'trt-ekonomi', name:'TRT Haber / Ekonomi', url:'https://www.trthaber.com/ekonomi_articles.rss', category:'Ekonomi', tier:'publisher'},
  {id:'trt-teknoloji', name:'TRT Haber / Bilim Teknoloji', url:'https://www.trthaber.com/bilim_teknoloji_articles.rss', category:'Yapay Zekâ', tier:'publisher'},
  {id:'aa-ekonomi', name:'AA / Ekonomi', url:'https://www.aa.com.tr/tr/rss/default?cat=ekonomi', category:'Ekonomi', tier:'publisher'},
  {id:'aa-teknoloji', name:'AA / Bilim Teknoloji', url:'https://www.aa.com.tr/tr/rss/default?cat=bilim-teknoloji', category:'Yapay Zekâ', tier:'publisher'}
];

const HASSAS = /\b(siyaset|secim|milletvekili|parti|tutuklan\w*|gozalti\w*|sorusturma\w*|iddianame|sanik|cinayet|oldur\w*|silahli|taciz|istismar|intihar|teror\w*|casus\w*|olu|olum|yarali|yaralan\w*)\b/i;
const TICARI = /\b(fiyat|zam|indirim|kampanya|yatirim|istihdam|ihracat|ithalat|emlak|konut|otomobil|akaryakit|altin|dolar|euro|turizm|festival|etkinlik|universite|sinav|burs|teknoloji|yapay zeka|ai)\b/i;

function duz(s){
  return String(s||'').toLocaleLowerCase('tr-TR')
    .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}
function strip(s){ return String(s||'').replace(/<[^>]*>/g,' ').replace(/<!\[CDATA\[|\]\]>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim(); }
function rssItems(xml){
  const out=[];
  for(const b of (String(xml||'').match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)||[])){
    const pick=tag=>{const m=b.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));return m?strip(m[1]):''};
    let link=pick('link');
    if(!link){const m=b.match(/<link[^>]+href=["']([^"']+)["']/i);link=m?m[1]:''}
    const title=pick('title'), description=pick('description')||pick('summary')||pick('content'), date=pick('pubDate')||pick('published')||pick('updated');
    if(title&&/^https?:\/\//.test(link)) out.push({title:title.slice(0,240),link:link.slice(0,2000),description:description.slice(0,1800),date});
  }
  return out;
}
async function get(url){
  const r=await fetch(url,{headers:{accept:'application/rss+xml, application/xml, text/xml, text/html','user-agent':'BTMEDYA-NewsIntelligence/1.0 (+https://btmedya.com.tr)'},redirect:'follow',signal:AbortSignal.timeout(10000)});
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.text();
}
function trendWords(items){
  const w=new Map();
  for(const x of items){
    const q=duz(x.title);
    for(const k of q.split(/[^a-z0-9]+/).filter(v=>v.length>3)) w.set(k,(w.get(k)||0)+1);
  }
  return w;
}
function score(item,feed,trendMap,now=Date.now()){
  const title=duz(item.title+' '+item.description);
  const age=Date.parse(item.date);
  const hours=Number.isNaN(age)?72:Math.max(0,(now-age)/3600000);
  let s=0;
  if(hours<=2) s+=35; else if(hours<=6) s+=28; else if(hours<=24) s+=20; else if(hours<=72) s+=8;
  if(/balikesir/.test(title)) s+=24;
  if(feed.tier==='publisher') s+=14;
  if(feed.tier==='competitor') s+=10;
  if(TICARI.test(title)) s+=8;
  const words=[...new Set(title.split(/[^a-z0-9]+/).filter(x=>x.length>3))];
  s += Math.min(18,words.reduce((n,k)=>n+(trendMap.get(k)||0)*3,0));
  if(HASSAS.test(title)) s-=45;
  return Math.max(0,Math.min(100,Math.round(s)));
}
function host(url){try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''}}
function safeText(s,n){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n)}

export const NEWS_INTEL_FEEDS=FEEDS.map(({id,name,category,tier})=>({id,name,category,tier}));

export async function runNewsIntelligence(env,{limit=8}={}){
  const result={ok:true,scanned:0,added:0,hot:0,errors:[],items:[]};
  if(!env.DB) return {...result,ok:false,error:'D1 not configured'};
  await ensureKaynakMasasiTables(env).catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS news_intelligence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT DEFAULT '',
    category TEXT DEFAULT 'Gündem',
    source_name TEXT DEFAULT '',
    source_host TEXT DEFAULT '',
    source_tier TEXT DEFAULT 'discovery',
    score INTEGER DEFAULT 0,
    risk INTEGER DEFAULT 0,
    trend_signal INTEGER DEFAULT 0,
    commercial_signal INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',
    first_seen_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS news_intelligence_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'Gündem',
    source_name TEXT DEFAULT '',
    score INTEGER DEFAULT 0,
    risk INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',
    first_seen_at TEXT NOT NULL,
    acknowledged_at TEXT DEFAULT NULL
  )`).run();

  let trendXml='';
  try{trendXml=await get('https://trends.google.com/trending/rss?geo=TR');}catch(e){result.errors.push('Google Trends: '+String(e.message||e).slice(0,120));}
  const trendItems=rssItems(trendXml);
  const trendMap=trendWords(trendItems);
  /* Ücretsiz Workers planında dış istek bütçesini korumak için her çağrıda
     yalnızca altı RSS kaynağı taranır. 15 dakikalık zaman dilimi kaynak grubunu
     döndürür; böylece tüm katalog üç turda kapsanır ve tek çağrı 50 dış isteğe
     yaklaşmaz. */
  const feedBatchSize=6;
  const feedBatchCount=Math.ceil(FEEDS.length/feedBatchSize);
  const feedBatch=Math.floor(Date.now()/900000)%feedBatchCount;
  const activeFeeds=FEEDS.slice(feedBatch*feedBatchSize,feedBatch*feedBatchSize+feedBatchSize);
  /* Feed kataloğu Kaynak Masası'nda da kalıcı tutulur. */
  for(const feed of activeFeeds){
    await kaynakKaydet(env,{url:feed.url,publisher:feed.name,tier:feed.tier,category:feed.category,status:'active',notes:'BTMEDYA Haber İstihbarat Motoru kaynak kataloğu.'}).catch(()=>{});
  }
  const fetched=await Promise.all(activeFeeds.map(async feed=>{
    try{return {feed,items:rssItems(await get(feed.url))};}
    catch(e){result.errors.push(feed.name+': '+String(e.message||e).slice(0,100));return {feed,items:[]};}
  }));
  const candidates=[];
  for(const {feed,items} of fetched){
    for(const item of items.slice(0,12)){
      result.scanned++;
      const scoreValue=score(item,feed,trendMap);
      const risk=HASSAS.test(duz(item.title+' '+item.description))?1:0;
      const commercial=TICARI.test(duz(item.title+' '+item.description))?1:0;
      candidates.push({...item,feed,score:scoreValue,risk,commercial,trend:Math.min(18,scoreValue)});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  const seen=new Set();
  for(const c of candidates){
    if(seen.has(c.link)) continue;
    seen.add(c.link);
    const now=new Date().toISOString();
    const isHot=c.score>=65 && !c.risk;
    try{
      const source = await kaynakKaydet(env,{
        url:c.link,publisher:c.feed.name,tier:c.feed.tier,category:c.feed.category,
        district:ilceBul(c.title+' '+c.description),title:c.title,text:c.description,score:c.score,
        status:'review'
      });
      await env.DB.prepare(`INSERT INTO news_intelligence
        (source_url,title,excerpt,category,source_name,source_host,source_tier,score,risk,trend_signal,commercial_signal,status,first_seen_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(source_url) DO UPDATE SET
          title=excluded.title,excerpt=excluded.excerpt,category=excluded.category,
          source_name=excluded.source_name,source_host=excluded.source_host,source_tier=excluded.source_tier,
          score=excluded.score,risk=excluded.risk,trend_signal=excluded.trend_signal,
          commercial_signal=excluded.commercial_signal,updated_at=excluded.updated_at`)
        .bind(c.link,safeText(c.title,240),safeText(c.description,1800),c.feed.category,c.feed.name,host(c.link),c.feed.tier,c.score,c.risk,c.trend,c.commercial,'new',now,now).run();
      if(source?.id){
        await kaynakBagla(env,{sourceId:source.id,entityType:'news-intelligence',entityId:String(c.link),role:'discovery'}).catch(()=>{});
      }
      if(isHot){
        result.hot++;
        await env.DB.prepare(`INSERT INTO news_intelligence_alerts
          (source_url,title,category,source_name,score,risk,status,first_seen_at)
          VALUES(?,?,?,?,?,?,?,?)
          ON CONFLICT(source_url) DO UPDATE SET
            title=excluded.title,category=excluded.category,source_name=excluded.source_name,
            score=excluded.score,risk=excluded.risk
          WHERE news_intelligence_alerts.status='new'`)
          .bind(c.link,safeText(c.title,240),c.feed.category,c.feed.name,c.score,c.risk,'new',now).run().catch(()=>{});
      }
      if(result.items.length<limit) result.items.push({title:c.title,source:c.link,sourceName:c.feed.name,category:c.feed.category,score:c.score,risk:c.risk,competitor:c.feed.tier==='competitor',trend:c.trend,commercial:c.commercial});
      result.added++;
    }catch(e){result.errors.push('D1: '+String(e.message||e).slice(0,120));}
  }
  if(env.KV) await env.KV.put('news-intelligence:last',JSON.stringify({at:new Date().toISOString(),scanned:result.scanned,added:result.added,hot:result.hot}),{expirationTtl:86400}).catch(()=>{});
  // Revenue signal: yalnız editoryal keşif için, satış mesajını haber metnine
  // karıştırmadan ticari niyetli konuları ayrıca işaretle.
  if(env.KV){
    const revenue=result.items.filter(x=>x.commercial && !x.risk).slice(0,8);
    await env.KV.put('news-intelligence:revenue-opportunities',JSON.stringify({
      at:new Date().toISOString(),items:revenue.map(x=>({
        title:x.title,category:x.category,source:x.source,score:x.score
      }))
    }),{expirationTtl:86400}).catch(()=>{});
  }
  return result;
}

function scoreItem(item,feed,trendMap){ return score(item,feed,trendMap); }

export async function newsIntelligenceStatus(env){
  if(!env.DB) return {enabled:false,items:[]};
  const last=env.KV?await env.KV.get('news-intelligence:last').catch(()=>null):null;
  const lastObj=last?JSON.parse(last):null;
  const rows=(await env.DB.prepare(`SELECT id,title,excerpt,category,source_name,source_host,source_tier,score,risk,trend_signal,commercial_signal,status,first_seen_at,updated_at
    FROM news_intelligence WHERE status='new' ORDER BY score DESC,updated_at DESC LIMIT 50`).all().catch(()=>({results:[]}))).results||[];
  const alerts=(await env.DB.prepare(`SELECT id,title,category,source_name,score,risk,status,first_seen_at,acknowledged_at
    FROM news_intelligence_alerts WHERE status='new' ORDER BY score DESC,first_seen_at DESC LIMIT 24`).all().catch(()=>({results:[]}))).results||[];
  const categoryRows=(await env.DB.prepare(`SELECT category,COUNT(*) AS total,SUM(CASE WHEN score>=65 AND risk=0 THEN 1 ELSE 0 END) AS hot,SUM(CASE WHEN risk=1 THEN 1 ELSE 0 END) AS risk
    FROM news_intelligence WHERE updated_at >= datetime('now','-24 hours') GROUP BY category ORDER BY total DESC`).all().catch(()=>({results:[]}))).results||[];
  const sourceRows=(await env.DB.prepare(`SELECT source_name,source_tier,COUNT(*) AS total,MAX(updated_at) AS last_seen
    FROM news_intelligence WHERE updated_at >= datetime('now','-24 hours') GROUP BY source_name,source_tier ORDER BY last_seen DESC LIMIT 30`).all().catch(()=>({results:[]}))).results||[];
  const revenue=env.KV?await env.KV.get('news-intelligence:revenue-opportunities').catch(()=>null):null;
  return {
    enabled:true,
    heartbeat:{alive:true,lastScan:lastObj?.at||null,nextScan:lastObj?.at?new Date(new Date(lastObj.at).getTime()+15*60000).toISOString():null},
    last:lastObj,
    items:rows,
    alerts,
    categoryMatrix:categoryRows,
    sourceHealth:sourceRows,
    revenueOpportunities:revenue?JSON.parse(revenue):[]
  };
}
