/* BTMEDYA live newsroom automation: category intelligence + admin alarm center enabled. */
import { BtmedyaWorkflow } from "./btmedya-workflow.js";
import { WorkflowStatusDO } from "./workflow-status-do.js";
import { renderNewsPage } from "./news-page.js";
import { socialProviderStatus, metricoolConnectedNetworks } from "./social-platforms.js";
import { ensureContentTaxonomy, normalizeContentTaxonomy, saveContentTaxonomy } from "./content-taxonomy.js";
import { runNewsIntelligence, newsIntelligenceStatus } from "./news-intelligence.js";
import { merakRadariCalistir, merakRadariDurumu, ozelHaberPaketiUret } from "./merak-radari.js";
import { recoveryPasswordValid } from "./auth-recovery.js";
import { runAutopilot, autopilotPolicy, setAutopilotPolicy, autopilotStatus, connectionMatrix, referenceDraft, generateAutopilotImage } from "./autopilot.js";
import { salesApi, satisOzeti } from "./sales-router.js";
import { agencySupervisorApi, runAgencySupervisor } from "./agency-supervisor.js";
import { ensureBtmedyaCore, btmedyaCoreApi } from "./btmedya-core.js";
import { siteOsApi, runSiteOsChecks } from "./site-os.js";
import { windsorAnalyticsApi } from "./windsor-analytics.js";
import { manualIntegrationApi } from "./manual-integrations.js";
// Panelde "Planlandı" yapilan sosyal gonderileri Metricool'a teslim eder.
// src/metricool-scheduler.js yazilmis ama hicbir yere baglanmamisti.
import { processMetricoolQueue, metricoolDurumu, disTeslimKaydet, teslimDurumlari } from "./metricool-scheduler.js";
import { processDirectSocialQueue, directSocialApi } from "./direct-social.js";
import { tiktokApi } from "./tiktok-direct.js";
import { youtubeApi } from "./youtube-direct.js";
import { xApi } from "./x-direct.js";
import { whatsappApi } from "./whatsapp-cloud.js";
import { WorkerEntrypoint } from "cloudflare:workers";
import { aiGorunurluk, ICERIK_SINYALI } from "./ai-gorunurluk.js";
import { sabahMasasi, sabahAyarlari, sabahAyarlariYaz, sabahRaporu, KATEGORILER, kategoriIsle, yanitMetni, jsonAyikla } from "./sabah-masasi.js";
import { ayarlariOku, ayarlariYaz, platformSluglari, sonrakiYuva, altyazi, varlikVar, kapakKunyesi, yayinlananlariIsaretle, gecikenleriKaydir } from "./sosyal-otomasyon.js";
import { kaynakKaydet, kaynakListele, kaynakGuncelle, kaynakOzeti, kaynakBaglaHaber, ensureKaynakMasasiTables } from "./kaynak-masasi.js";
import { sosyalTekillemeAyir, sosyalTekillemeBagla, sosyalTekillemeBirak, sosyalTekillemeSil, ensureSosyalParmakTablosu } from "./sosyal-dedupe.js";
/* BTMEDYA Worker — birleşik API
 * 1) Haber CMS  (D1 tablo: news)        — /api/news, /api/admin/news
 * 2) Medya Kasası (D1 tablo: media, R2) — /api/media*, /api/public/media, /api/export, /media/*, /api/login, /api/logout
 * 3) İletişim    (D1 tablo: contact_messages) — /api/contact, /api/admin/contact
 * Statik dosyalar env.ASSETS üzerinden servis edilir.
 */

const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...headers}});
const text = (data, status=200, headers={}) => new Response(data, {status, headers:{'content-type':'text/plain; charset=utf-8', ...headers}});
const KANONIK_HOST = "btmedya.com.tr";
const IKINCIL_HOSTLAR = new Set(["btmedyaajans.com"]);
function kanonikHedef(host){
  const h=String(host||"").toLowerCase();
  if(h===KANONIK_HOST) return null;
  if(h==="www."+KANONIK_HOST || IKINCIL_HOSTLAR.has(h) || IKINCIL_HOSTLAR.has(h.replace(/^www\./,''))) return KANONIK_HOST;
  return null;
}

/* ---------- yardımcılar (medya kasası) ---------- */
function b64url(bytes){ return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64url(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='='; return Uint8Array.from(atob(s),c=>c.charCodeAt(0)); }
async function hmac(secret, message){ const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']); return b64url(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message))); }
// Admin oturum anahtari, iki ayri Cloudflare Secret'tan turetilir.
// MEDIA_SIGNING_SECRET yoksa gecici geriye uyumluluk icin yalnizca oturum secret'i kullanilir.
function oturumAnahtari(env){
  const oturum=env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET || '';
  if(!oturum) return '';
  return env.MEDIA_SIGNING_SECRET ? oturum+'\u0000'+env.MEDIA_SIGNING_SECRET : oturum;
}
async function medyaListesi(env, origin){
  if(!env || !env.ASSETS) return [];
  try{
    const r = await env.ASSETS.fetch(new Request(new URL('/data/medya-listesi.json', origin)));
    if(!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  }catch{ return []; }
}
const ADMIN_SESSION_TTL_MS=24*60*60*1000;
async function sessionToken(secret){ const payload=b64url(new TextEncoder().encode(JSON.stringify({iat:Date.now(),exp:Date.now()+ADMIN_SESSION_TTL_MS,role:'admin'}))); return payload+'.'+await hmac(secret,payload); }
async function validSession(request, secret){
  if(!secret) return false;
  const c=request.headers.get('cookie')||''; const m=c.match(/bt_admin=([^;]+)/); if(!m) return false;
  const [p,s]=m[1].split('.'); if(!p||!s) return false; const expected=await hmac(secret,p);
  if(s!==expected) return false; try { return JSON.parse(new TextDecoder().decode(unb64url(p))).exp>Date.now(); } catch { return false; }
}
async function signedMediaUrl(request, key, secret, ttl=86400){
  const u=new URL(request.url); const exp=Math.floor(Date.now()/1000)+ttl; const msg=`${key}:${exp}`; const sig=await hmac(secret,msg); return `${u.origin}/media/${key}?exp=${exp}&sig=${encodeURIComponent(sig)}`;
}

// Medya depolama katmanı: üretimde tek kaynak btmedya-media bucket'ıdır.
// Eski bucket silindiği için artık başarısız bir fallback veya yanlış başarı sinyali üretilmez.
async function getMediaObject(env, key){
  if(env.MEDIA){
    const obj=await env.MEDIA.get(key).catch(()=>null);
    if(obj) return {obj,source:'r2'};
  }
  return {obj:null,source:null};
}

function mediaCategoryFromKey(key){
  const p=String(key||'').split('/')[0].toLowerCase();
  if(/haber|news/.test(p)) return 'haber';
  if(/video|reel|showreel/.test(p)) return 'video';
  if(/saha|report|portfolio|portfoy/.test(p)) return 'portfoy';
  if(/hero|web|site/.test(p)) return 'medya';
  return 'arsiv';
}

async function listR2Media(bucket, source, {q='',cat=''}={}){
  if(!bucket) return [];
  const allowed=/\.(?:jpe?g|png|webp|gif|mp4|webm|mov|m4v|mp3|wav|m4a)$/i;
  const out=[];
  let cursor;
  do {
    const page=await bucket.list({limit:200,cursor,include:['httpMetadata']}).catch(()=>null);
    if(!page) break;
    for(const x of (page.objects||[])){
      const key=String(x.key||'');
      const mime=String(x.httpMetadata?.contentType||'');
      if(!allowed.test(key) && !/^(image|video|audio)\//i.test(mime)) continue;
      const category=mediaCategoryFromKey(key);
      if(cat && category!==cat) continue;
      if(q && !key.toLowerCase().includes(q.toLowerCase())) continue;
      const isVideo=/\.(mp4|webm|mov|m4v)$/i.test(key) || /^video\//i.test(mime);
      /* 5 Ekim 2026 R2 denetiminde 348 B'lık MP4 test nesneleri görüldü.
         Geçerli prodüksiyon videoları bu boyutun çok üzerinde; bozuk/test
         videoların public arşivde kart olarak görünmesini engelle. */
      if(isVideo && Number(x.size||0) < 10 * 1024) continue;
      out.push({
        id:(source==='r2-legacy'?'legacy-':'r2-')+b64url(new TextEncoder().encode(key)).slice(0,24),
        key,
        original_name:key.split('/').pop()||key,
        mime:mime || (isVideo?'video/mp4':'image/webp'),
        size:Number(x.size||0),
        category,
        tags:['BTMEDYA','gercek',source==='r2-legacy'?'r2-arsiv':'r2'],
        title:(key.split('/').pop()||key).replace(/\.[^.]+$/,'').replace(/[-_]+/g,' '),
        description:source==='r2-legacy'?'BTMEDYA gerçek R2 arşiv medyası':'BTMEDYA gerçek R2 medya nesnesi',
        alt_text:'BTMEDYA gerçek medya',
        slot:category==='video'?'medya':category==='portfoy'?'portfoy':category==='haber'?'haber':'',
        sort_order:out.length,
        created_at:x.uploaded?new Date(x.uploaded).toISOString():null,
        updated_at:x.uploaded?new Date(x.uploaded).toISOString():null,
        url:null,
        source,
        ai_generated:false
      });
      if(out.length>=500) return out;
    }
    cursor=page.truncated?page.cursor:undefined;
  } while(cursor);
  return out;
}
async function validMediaSig(key, exp, sig, secret){
  if(!secret || !exp || !sig || Number(exp)<Math.floor(Date.now()/1000)) return false;
  return (await hmac(secret,`${key}:${exp}`))===sig;
}

/* Login koruması: KV bağlıysa IP başına 15 dakikada en fazla 5 başarısız deneme.
   KV henüz bağlanmamış production'da davranış bozulmasın diye kontrollü olarak pas geçilir. */
const RATE_LIMIT_MAX=5;
const RATE_LIMIT_WINDOW_S=15*60;
async function checkRateLimit(env, ip){
  if(!env.KV) return {allowed:true,remaining:RATE_LIMIT_MAX};
  const key=`ratelimit:login:${ip}`;
  const raw=await env.KV.get(key).catch(()=>null);
  const count=raw ? Number(raw) : 0;
  if(count>=RATE_LIMIT_MAX) return {allowed:false,remaining:0};
  await env.KV.put(key,String(count+1),{expirationTtl:RATE_LIMIT_WINDOW_S}).catch(()=>{});
  return {allowed:true,remaining:RATE_LIMIT_MAX-count-1};
}
async function clearRateLimit(env, ip){
  if(!env.KV) return;
  await env.KV.delete(`ratelimit:login:${ip}`).catch(()=>{});
}
async function recordAutomationHeartbeat(env){
  const now=new Date().toISOString();
  let queued=0, overdue=0;
  if(env.DB){
    try{
      const row=await env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN scheduled_at IS NOT NULL AND scheduled_at<=? AND status='planlandi' THEN 1 ELSE 0 END) AS overdue FROM social_posts WHERE status='planlandi'").bind(now).first();
      queued=Number(row?.total||0);
      overdue=Number(row?.overdue||0);
    }catch(e){ console.warn('[automation] queue health skipped',e?.message||e); }
  }
  const snapshot={ok:true,cron:'*/5 * * * *',heartbeatAt:now,queued,overdue,providers:socialProviderStatus(env)};
  if(env.KV) await env.KV.put('automation:heartbeat',JSON.stringify(snapshot),{expirationTtl:86400}).catch(()=>{});
  return snapshot;
}
function safeKey(name){ return name.normalize('NFKD').replace(/[^\w.\-]+/g,'-').replace(/-+/g,'-').replace(/^[-.]+|[-.]+$/g,'').toLowerCase(); }
function extFromMime(mime){ const map={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm','audio/mpeg':'mp3','audio/wav':'wav','audio/mp4':'m4a','application/pdf':'pdf'}; return map[mime]||'bin'; }
const ALLOWED_MIME = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/wav','audio/mp4','application/pdf']);

/* ---------- E-posta bildirimi (Resend) ---------- */
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
async function sendContactEmail(env, msg){
  if(!env.RESEND_API_KEY){
    console.warn('[email] RESEND_API_KEY tanımlı değil, atlandı.');
    return false;
  }
  const to=env.RESEND_TO||'info@btmedya.com.tr';
  const from=env.RESEND_FROM||'BTMEDYA <noreply@btmedya.com.tr>';
  const subject=`[BTMEDYA] Yeni mesaj: ${msg.subject||'İletişim Formu'}`;
  const html=`<div style="font-family:sans-serif;max-width:600px;margin:auto"><h2 style="color:#111;border-bottom:2px solid #eee;padding-bottom:8px">Yeni İletişim Formu Mesajı</h2><table style="border-collapse:collapse;width:100%"><tr><th style="background:#f5f5f5;text-align:left;padding:8px 12px;width:110px">Ad Soyad</th><td style="padding:8px 12px;border-bottom:1px solid #eee">${esc(msg.name)}</td></tr><tr><th style="background:#f5f5f5;text-align:left;padding:8px 12px">E-posta</th><td style="padding:8px 12px;border-bottom:1px solid #eee"><a href="mailto:${esc(msg.email)}">${esc(msg.email)}</a></td></tr><tr><th style="background:#f5f5f5;text-align:left;padding:8px 12px">Telefon</th><td style="padding:8px 12px;border-bottom:1px solid #eee">${esc(msg.phone||'—')}</td></tr><tr><th style="background:#f5f5f5;text-align:left;padding:8px 12px">Konu</th><td style="padding:8px 12px;border-bottom:1px solid #eee">${esc(msg.subject||'—')}</td></tr><tr><th style="background:#f5f5f5;text-align:left;padding:8px 12px;vertical-align:top">Mesaj</th><td style="padding:8px 12px;white-space:pre-wrap">${esc(msg.message)}</td></tr></table><p style="margin-top:24px;font-size:12px;color:#999">btmedya.com.tr iletişim formu · ${new Date().toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})}</p></div>`;
  try{
    const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject,html})});
    if(!res.ok){
      const err=await res.text().catch(()=>'(okunamadı)');
      console.error(`[email] Resend API hatası: ${res.status} — ${err}`);
      if(msg.dbId && env.DB) await env.DB.prepare('UPDATE contact_messages SET email_failed=1 WHERE id=?').bind(msg.dbId).run().catch(e=>console.error('[email] DB flag hatası:',e));
      return false;
    }
    return true;
  }catch(e){
    console.error('[email] Resend fetch hatası:',e);
    if(msg.dbId && env.DB) await env.DB.prepare('UPDATE contact_messages SET email_failed=1 WHERE id=?').bind(msg.dbId).run().catch(()=>{});
    return false;
  }
}

/* ---------- Cloudflare Workflow API ---------- */
async function workflowApi(request, env, url) {
  if (!url.pathname.startsWith('/api/workflow/')) return null;
  if (!(await validSession(request, oturumAnahtari(env)))) {
    return json({ok:false,error:'Yetkisiz'},401);
  }
  if (!env.BTMEDYA_WORKFLOW) {
    return json({ok:false,error:'BTMedya Workflow binding yapılandırılmadı'},503);
  }

  if (url.pathname === '/api/workflow/start' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const instance = await env.BTMEDYA_WORKFLOW.create({
      params: {
        action: String(body.action || 'content-review'),
        newsId: body.newsId ? Number(body.newsId) : null,
        mediaKey: body.mediaKey ? String(body.mediaKey) : null,
        requiresApproval: body.requiresApproval !== false
      }
    });
    return json({
      ok:true,
      instanceId:instance.id,
      message:'BTMedya Workflow başlatıldı'
    });
  }

  const statusMatch = url.pathname.match(/^\/api\/workflow\/status\/([^/]+)$/);
  if (statusMatch && request.method === 'GET') {
    const instance = await env.BTMEDYA_WORKFLOW.get(statusMatch[1]);
    return json({ok:true,status:await instance.status()});
  }

  const eventMatch = url.pathname.match(/^\/api\/workflow\/event\/([^/]+)$/);
  if (eventMatch && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const instance = await env.BTMEDYA_WORKFLOW.get(eventMatch[1]);
    await instance.sendEvent({
      type:'btmedya-approval',
      payload:{
        approved:Boolean(body.approved),
        comment:String(body.comment || '')
      }
    });
    return json({ok:true,message:'Workflow onay olayı gönderildi'});
  }

  return json({ok:false,error:'Workflow endpoint bulunamadı'},404);
}


/* ---------- Haber CMS API ---------- */
/* IndexNow: yayinlanan haberin adresini Bing, Yandex ve IndexNow'u kullanan
   diger arama motorlarina aninda bildirir; tarayicinin site haritasini bir
   sonraki ziyaretinde bulmasini beklemez. Anahtar kamuya aciktir (protokol
   geregi public/57fb863171638cffa9cdfb3913627b57.txt olarak yayinda); gizli degil, alan adinin
   sahipligini kanitlar. Google IndexNow kullanmaz; Google icin site haritasi
   ve Search Console gecerlidir. Bildirim basarisiz olursa yayin etkilenmez. */
const INDEXNOW_ANAHTAR = '57fb863171638cffa9cdfb3913627b57';
function indexNowBildir(ctx, origin, slug){
  if(!slug) return;
  const host = new URL(origin).host;
  if(host !== 'btmedya.com.tr') return; // yerel ve onizleme ortamlarindan bildirim gitmesin
  const is = fetch('https://api.indexnow.org/indexnow', {
    method:'POST', headers:{'content-type':'application/json; charset=utf-8'},
    body: JSON.stringify({host, key:INDEXNOW_ANAHTAR, keyLocation:`https://${host}/${INDEXNOW_ANAHTAR}.txt`,
      urlList:[`https://${host}/haberler/${encodeURIComponent(slug)}`]}),
    signal: AbortSignal.timeout(5000)
  }).then(r => { if(!r.ok && r.status!==202) console.error('[indexnow]', r.status); })
    .catch(e => console.error('[indexnow]', e?.message || e));
  if(ctx?.waitUntil) ctx.waitUntil(is);
}

async function merakRadariApi(request, env, url){
  if(!url.pathname.startsWith('/api/admin/merak-radari')) return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  if(url.pathname==='/api/admin/merak-radari' && request.method==='POST'){
    return json(await merakRadariCalistir(env,{limit:16}));
  }
  if(url.pathname==='/api/admin/merak-radari' && request.method==='GET'){
    return json(await merakRadariDurumu(env));
  }
  const paket=url.pathname.match(/^\/api\/admin\/merak-radari\/firsat\/(\d+)\/paket$/);
  if(paket && request.method==='POST'){
    return json(await ozelHaberPaketiUret(env,{id:Number(paket[1])}));
  }
  const durum=url.pathname.match(/^\/api\/admin\/merak-radari\/firsat\/(\d+)$/);
  if(durum && request.method==='PATCH'){
    if(!env.DB) return json({ok:false,error:'D1 bağlı değil'},503);
    const body=await request.json().catch(()=>({}));
    const izinli=['önerildi','hazırlanıyor','çekim','yayında','arsiv'];
    const status=String(body.status||'önerildi');
    if(!izinli.includes(status)) return json({ok:false,error:'Geçersiz durum'},400);
    const r=await env.DB.prepare('UPDATE ozel_haber_firsatlari SET durum=?,updated_at=? WHERE id=?').bind(status,new Date().toISOString(),Number(durum[1])).run();
    return json({ok:true,changed:Number(r.meta?.changes||0)>0});
  }
  return json({ok:false,error:'Merak Radarı endpoint bulunamadı'},404);
}

async function newsApi(request, env, url, ctx){
  const merakApi=await merakRadariApi(request,env,url); if(merakApi) return merakApi;

  if(url.pathname==='/api/admin/news-intelligence' && (request.method==='GET'||request.method==='POST')){
    if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
    if(request.method==='POST') return json(await runNewsIntelligence(env,{limit:16}));
    return json(await newsIntelligenceStatus(env));
  }

  if(url.pathname==='/api/public/category-feed' && request.method==='GET'){
    const sourceUrl=new URL('/api/news?limit=100',url.origin);
    const source=await newsApi(new Request(sourceUrl,{headers:{accept:'application/json'}}),env,sourceUrl,ctx);
    const data=await source.json().catch(()=>({items:[]}));
    const groups=new Map();
    for(const item of (data.items||[])){
      const categories=String(item.category||'Haber').split(/[·,/|]/).map(x=>x.trim()).filter(Boolean);
      for(const category of [...new Set(categories)]){
        if(!groups.has(category)) groups.set(category,[]);
        groups.get(category).push({slug:item.slug,title:item.title,excerpt:item.excerpt||'',cover_url:item.cover_url||null,published_at:item.published_at||item.original_date||null,url:`/haberler/${encodeURIComponent(item.slug||'')}.html`});
      }
    }
    return json({ok:true,source:data.source||'live',updated_at:new Date().toISOString(),categories:[...groups.entries()].map(([category,items])=>({category,count:items.length,items:items.slice(0,6)}))});
  }

  const alertMatch=url.pathname.match(/^\/api\/admin\/news-intelligence\/alerts\/(\d+)$/);
  if(alertMatch && request.method==='PATCH'){
    if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
    if(!env.DB) return json({ok:false,error:'D1 not configured'},503);
    const b=await request.json().catch(()=>({}));
    const status=String(b.status||'acknowledged');
    if(!['new','acknowledged'].includes(status)) return json({ok:false,error:'Geçersiz durum'},400);
    const at=status==='acknowledged'?new Date().toISOString():null;
    const r=await env.DB.prepare('UPDATE news_intelligence_alerts SET status=?,acknowledged_at=? WHERE id=?').bind(status,at,Number(alertMatch[1])).run();
    return json({ok:true,changed:Number(r.meta?.changes||0)>0});
  }

  if(url.pathname==='/api/public/social-feed' && request.method==='GET'){
    /* Sosyal akış public katmanı dış veri sağlayıcısına bağımlı değildir.
       Snapshot okunamazsa endpoint 500 üretmek yerine doğrulanmış profil
       kabuğunu döndürür; böylece ana sayfa sessizce fallback mesajına düşmez. */
    let snapshot={profiles:[],items:[],generated_at:null,source:'snapshot-fallback'};
    try{
      if(env.ASSETS){
        const r=await env.ASSETS.fetch(new Request(new URL('/data/social-feed.json',url.origin)));
        if(r.ok){
          const parsed=await r.json().catch(()=>null);
          if(parsed && typeof parsed==='object') snapshot=parsed;
        }
      }
    }catch(e){
      console.error('[social-feed] snapshot okunamadı:',e?.message||e);
    }
    const live=socialProviderStatus(env);
    const fallbackProfiles=[
      {key:'instagram',label:'Instagram',url:'https://www.instagram.com/btmedyajans/',status:'verification_pending',note:'Metricool bağlantısı doğrulanıyor.'},
      {key:'facebook',label:'Facebook · busetuncayy10',url:'https://www.facebook.com/people/busetuncayy10/100080226545931/',status:'connected_identity',note:'Metricool Brand 6858384 içinde doğrulanmış Facebook Sayfası; Page ID 107923075188798'},
      {key:'youtube',label:'YouTube',url:'https://www.youtube.com/@BTmedyaAjans',status:'connected_identity',note:'YouTube kanal kimliği doğrulandı.'},
      {key:'tiktok',label:'TikTok',url:'https://www.tiktok.com/@btmedya1010',status:'publishing_verified',note:'TikTok yayın durumu doğrulandı.'}
    ];
    const sourceProfiles=Array.isArray(snapshot.profiles)&&snapshot.profiles.length?snapshot.profiles:fallbackProfiles;
    const profiles=sourceProfiles.map(p=>{
      const state=live[p.key];
      if(!state) return p;
      return {
        ...p,
        status: state.configured ? 'connected' : (state.connected ? 'connection_pending_token' : (state.missing?.includes('Metricool bağlantısı') ? 'verification_pending' : 'not_configured')),
        note: state.configured
          ? 'Metricool bağlantısı Worker tarafından canlı yapılandırmadan doğrulanıyor.'
          : (state.note || p.note || '')
      };
    });
    return json({
      ...snapshot,
      generated_at:new Date().toISOString(),
      source:'Metricool+live-connection',
      live_connections:live,
      profiles,
      items:Array.isArray(snapshot.items)?snapshot.items:[]
    },200,{'cache-control':'public, max-age=300'});
  }

  if(url.pathname==='/api/health'){
    const r2Probe=env.MEDIA ? await env.MEDIA.list({limit:200}).catch(()=>null) : null;
    const mediaLike=/\.(?:jpe?g|png|webp|gif|mp4|webm|mov|m4v|mp3|wav|m4a)$/i;
    const mediaCount=(probe)=>Array.isArray(probe?.objects)?probe.objects.filter(o=>{
      const key=String(o.key||'');
      const mime=String(o.httpMetadata?.contentType||'');
      return mediaLike.test(key)||/^(image|video|audio)\//i.test(mime);
    }).length:0;
    const mediaSchemaRequired=['key','original_name','mime','size','category','tags','title','description','alt_text','published','slot','sort_order','created_at','updated_at','ai_generated'];
    let mediaSchema={ok:false,missing:mediaSchemaRequired,error:null};
    if(env.DB){
      try{
        const schema=await env.DB.prepare("PRAGMA table_info(media)").all();
        const names=new Set((schema.results||[]).map(x=>String(x.name||'')));
        const missing=mediaSchemaRequired.filter(x=>!names.has(x));
        mediaSchema={ok:missing.length===0,missing,error:null};
      }catch(e){
        mediaSchema={ok:false,missing:mediaSchemaRequired,error:String(e?.message||e).slice(0,240)};
      }
    }else mediaSchema={ok:false,missing:mediaSchemaRequired,error:'D1 not configured'};
    return json({
      ok:true,service:'btmedya',cms:!!env.DB,r2:!!env.MEDIA,
      mediaSchema,
      r2Objects:!!r2Probe?.objects?.length,
      r2MediaObjects:mediaCount(r2Probe),
      admin:!!env.ADMIN_PASSWORD_SECRET && !!env.ADMIN_SESSION_SECRET_SECRET,mail:!!env.RESEND_API_KEY,
      // Dagitim bekcisi (.github/workflows/dagitim-bekcisi.yml) bu zamani
      // commit zamaniyla karsilastirir: derleme sessizce duserse canli
      // surum eski kalir ve bu alan ilerlemez.
      surum:surumBilgisi(env)
    });
  }

  /* Public: haber listesi
     D1 üretim kaynağıdır. D1'de arşiv seed'i henüz uygulanmamışsa
     repository içindeki gerçek BTMEDYA arşivi güvenli bir salt-okur
     fallback olarak kullanılır. Böylece canlı site boş kalmaz. */
  if(url.pathname==='/api/news' && request.method==='GET'){
    const limit=Math.min(Number(url.searchParams.get('limit'))||100,500);
    /* ozet=1: liste sayfalari (haber portali) haber metnini kullanmaz; 100
       haberin govdesi mobilde ~230 KB ek indirme demekti. Govde yalniz bu
       parametreyle dusulur, diger cagiranlar ayni yaniti alir. */
    const ozet=url.searchParams.get('ozet')==='1';
    const listeJson=(veri,...a)=>json(ozet?{...veri,items:veri.items.map(({body,...n})=>n)}:veri,...a);
    let d1Items=[];
    if(env.DB){
      const rows=await env.DB.prepare("SELECT id,slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,source_url,original_date,archive_note,updated_at FROM news WHERE status='published' ORDER BY COALESCE(published_at,updated_at) DESC LIMIT 500").all();
      const kapaklar=await uretilmisKapaklar(env);
      d1Items=(rows.results||[]).map(n=>({...n,cover_url:kapakSec(n,kapaklar)}));
    }
    try{
      const req=new Request(new URL('/data/haberler.json',url.origin));
      const asset=await env.ASSETS.fetch(req);
      if(!asset.ok) return listeJson({ok:true,source:d1Items.length?'d1':'static',items:d1Items.slice(0,limit)});
      const archive=await asset.json();
      const staticItems=archive.map((n,i)=>({
        id:n.id||i+1,
        slug:n.slug,
        title:n.title,
        excerpt:n.excerpt||'',
        body:Array.isArray(n.body)?n.body.join('\n\n'):String(n.body||''),
        category:n.category||'Haber',
        author:n.author||'BTMEDYA',
        cover_url:n.cover_url||`/assets/haber-kapak/${encodeURIComponent(n.slug)}.webp`,
        video_url:n.video_url||null,
        status:'published',
        published_at:n.published_at||null,
        source_url:n.source_url||null,
        original_date:n.original_date||null,
        archive_note:n.archive_note||'BTMEDYA arşiv içeriği',
        updated_at:n.updated_at||null
      }));
      const bySlug=new Map(d1Items.map(n=>[n.slug,n]));
      for(const n of staticItems) if(!bySlug.has(n.slug)) bySlug.set(n.slug,n);
      const items=[...bySlug.values()].sort((a,b)=>{
        const ad=Date.parse(a.published_at||a.original_date||'')||0;
        const bd=Date.parse(b.published_at||b.original_date||'')||0;
        return bd-ad;
      }).slice(0,limit);
      return listeJson({ok:true,source:d1Items.length?'d1+static-archive':'static-archive',items});
    }catch(e){
      console.error('[news] static archive fallback failed:',e);
      return listeJson({ok:true,source:'d1',items:d1Items.slice(0,limit)});
    }
  }

  /* Admin: haber listesi */
  if(url.pathname==='/api/admin/news' && request.method==='GET'){
    if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
    if(!env.DB) return json({ok:false,error:'D1 not configured'},503);
    const status=url.searchParams.get('status');
    let sql='SELECT id,slug,title,excerpt,category,author,cover_url,status,published_at,source_url,original_date,archive_note,updated_at FROM news';
    const args=[];
    if(status){sql+=' WHERE status=?';args.push(status);}
    sql+=' ORDER BY updated_at DESC LIMIT 200';
    const rows=args.length ? await env.DB.prepare(sql).bind(...args).all() : await env.DB.prepare(sql).all();
    return json({ok:true,items:rows.results});
  }

  /* Admin: haber ekle / güncelle (slug ile upsert) */
  if(url.pathname==='/api/admin/news' && request.method==='POST'){
    if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
    if(!env.DB) return json({ok:false,error:'D1 not configured'},503);
    const b=await request.json().catch(()=>null);
    if(!b || typeof b!=='object') return json({ok:false,error:'Geçersiz JSON'},400);
    if(!b.title || !b.slug) return json({ok:false,error:'title and slug required'},400);
    const title=String(b.title).trim().slice(0,240);
    const slug=String(b.slug).trim().replace(/[^a-z0-9-]/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,180);
    if(!title || !slug) return json({ok:false,error:'Geçersiz başlık veya slug'},400);
    const status=b.status==='published'?'published':'draft';
    const now=new Date().toISOString();
    const sourceUrl=String(b.source_url||'').trim().slice(0,2000);
    const originalDate=String(b.original_date||'').trim().slice(0,64);
    const archiveNote=String(b.archive_note||'').trim().slice(0,2000);
    const taxonomy=normalizeTaxonomy(b,b.category);
    try{
      await env.DB.prepare(`INSERT INTO news(slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,source_url,original_date,archive_note,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,body=excluded.body,category=excluded.category,author=excluded.author,cover_url=excluded.cover_url,video_url=excluded.video_url,status=excluded.status,published_at=excluded.published_at,source_url=excluded.source_url,original_date=excluded.original_date,archive_note=excluded.archive_note,updated_at=excluded.updated_at`)
        .bind(slug,title,String(b.excerpt||'').slice(0,1000),String(b.body||'').slice(0,200000),String(b.category||'').slice(0,100),String(b.author||'').slice(0,160),String(b.cover_url||'').slice(0,2000),String(b.video_url||'').slice(0,2000),status,status==='published'?(b.published_at||now):null,sourceUrl,originalDate,archiveNote,now).run();
    }catch(e){
      await env.DB.prepare(`INSERT INTO news(slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,body=excluded.body,category=excluded.category,author=excluded.author,cover_url=excluded.cover_url,video_url=excluded.video_url,status=excluded.status,published_at=excluded.published_at,updated_at=excluded.updated_at`)
        .bind(slug,title,String(b.excerpt||'').slice(0,1000),String(b.body||'').slice(0,200000),String(b.category||'').slice(0,100),String(b.author||'').slice(0,160),String(b.cover_url||'').slice(0,2000),String(b.video_url||'').slice(0,2000),status,status==='published'?(b.published_at||now):null,now).run();
    }
    await saveContentTaxonomy(env,'news',slug,taxonomy);
    if(sourceUrl) await kaynakBaglaHaber(env,sourceUrl,slug).catch(()=>{});
    if(status==='published') indexNowBildir(ctx, url.origin, slug);
    return json({ok:true,slug,status,taxonomy});
  }

  /* Admin: haber güncelle / sil (ID ile) */
  const newsById=url.pathname.match(/^\/api\/admin\/news\/(\d+)$/);
  if(newsById){
    if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
    if(!env.DB) return json({ok:false,error:'D1 not configured'},503);
    const id=Number(newsById[1]);
    if(request.method==='GET'){
      const row=await env.DB.prepare('SELECT * FROM news WHERE id=?').bind(id).first();
      if(!row) return json({ok:false,error:'Bulunamadı'},404);
      return json({ok:true,item:row});
    }
    if(request.method==='PATCH'){
      const b=await request.json();
      const now=new Date().toISOString();
      const status=b.status==='published'?'published':'draft';
      const taxonomy=normalizeTaxonomy(b,b.category); const values=[b.title||'',b.excerpt||'',b.body||'',b.category||'',b.author||'',b.cover_url||'',b.video_url||'',status,status==='published'?(b.published_at||now):null,String(b.source_url||'').trim().slice(0,2000),String(b.original_date||'').trim().slice(0,64),String(b.archive_note||'').trim().slice(0,2000),now,id];
      try{
        await env.DB.prepare('UPDATE news SET title=?,excerpt=?,body=?,category=?,author=?,cover_url=?,video_url=?,status=?,published_at=?,source_url=?,original_date=?,archive_note=?,updated_at=? WHERE id=?').bind(...values).run();
      }catch(e){
        await env.DB.prepare('UPDATE news SET title=?,excerpt=?,body=?,category=?,author=?,cover_url=?,video_url=?,status=?,published_at=?,updated_at=? WHERE id=?')
          .bind(...values.slice(0,9),now,id).run();
      }
      const current=await env.DB.prepare('SELECT slug,source_url FROM news WHERE id=?').bind(id).first().catch(()=>null);
      if(current?.slug) await saveContentTaxonomy(env,'news',current.slug,taxonomy);
      if(status==='published'){
        const r=current;
        if(r?.source_url) await kaynakBaglaHaber(env,r.source_url,r.slug).catch(()=>{});
        indexNowBildir(ctx, url.origin, r?.slug);
      }
      return json({ok:true,taxonomy});
    }
    if(request.method==='DELETE'){
      const row=await env.DB.prepare('SELECT slug FROM news WHERE id=?').bind(id).first().catch(()=>null);
      await env.DB.prepare('DELETE FROM news WHERE id=?').bind(id).run();
      if(row?.slug) await env.DB.prepare("DELETE FROM content_taxonomy WHERE entity_type='news' AND entity_id=?").bind(row.slug).run().catch(()=>{});
      return json({ok:true});
    }
  }

  return null;
}

/* ---------- BTMEDYA Haber Bulucu + AI İçerik Üretici ---------- */
const NEWS_FEEDS = [
  {id:'cumha-balikesir',name:'CUMHA / Balıkesir RSS',url:'https://cumha.com.tr/rss/lokasyon/balikesir',category:'Yerel'},
  {id:'google-balikesir',name:'Google News / Balıkesir',url:'https://news.google.com/rss/search?q=Bal%C4%B1kesir&hl=tr&gl=TR&ceid=TR:tr',category:'Gündem'},
  {id:'google-ai',name:'Google News / Yapay Zekâ',url:'https://news.google.com/rss/search?q=yapay%20zeka%20AI&hl=tr&gl=TR&ceid=TR:tr',category:'Yapay Zekâ'}
];
function stripTags(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
function xmlDecode(s){return String(s||'').replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function rssItems(xml){
  const out=[]; const blocks=xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)||[];
  for(const b of blocks){
    const pick=(tag)=>{const m=b.match(new RegExp('<'+tag+'(?:[^>]*)>([\\s\\S]*?)<\\/'+tag+'>','i'));return m?xmlDecode(m[1]).trim():''};
    let title=stripTags(pick('title')); let link=stripTags(pick('link'));
    if(!link){const m=b.match(/<link[^>]+href=["']([^"']+)["']/i);link=m?m[1]:''}
    const description=stripTags(pick('description')||pick('summary')||pick('content'));
    const date=stripTags(pick('pubDate')||pick('published')||pick('updated'));
    if(title&&link) out.push({title:title.slice(0,240),link:link.slice(0,2000),description:description.slice(0,1800),date});
  } return out;
}
/* NFKD, Türkçe ı/İ harfini ayrıştırmaz; eski sürüm "Balıkesir"i
   "bal-kesir" yapıyordu. Harfler önce elle çevrilir. */
const TR_HARF={'ı':'i','İ':'i','ş':'s','Ş':'s','ğ':'g','Ğ':'g','ü':'u','Ü':'u','ö':'o','Ö':'o','ç':'c','Ç':'c'};
function newsSlug(title,link){let base=String(title||'haber').replace(/[ıİşŞğĞüÜöÖçÇ]/g,h=>TR_HARF[h]).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100).replace(/-+$/,'')||'haber';let h=0;for(const ch of String(link||'')){h=((h<<5)-h+ch.charCodeAt(0))|0}return base+'-'+Math.abs(h)}
/* Google News başlığa " - Yayın Adı" ekler. Bu ek hem taslak başlığına hem
   haber adresine başka yayının adını taşıyordu. Yalnız Google akışlarında
   temizlenir; CUMHA başlıklarında tire başlığın parçası olabilir. */
function kaynakEkiniAt(title){return String(title||'').replace(/\s+-\s+[^-]{2,80}$/,'').trim()||String(title||'')}
/* Kaynak Masası bir bağlantıyı yalnızca bir kez içeri alır. Editör taslağı
   özgün metne çevirip adresini ya da kaynak bağlantısını değiştirdiğinde,
   hatta işlenen taslağı sildiğinde bile aynı RSS öğesi yeniden gelmesin diye
   görülen bağlantılar ayrı tabloda tutulur. Tablo kendini kurar ve her
   taramada mevcut haberlerin kaynaklarıyla tamamlanır (IF NOT EXISTS / OR IGNORE). */
async function gorulenTablosu(env){
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS kaynak_gorulen (link TEXT PRIMARY KEY, created_at TEXT NOT NULL)').run();
  await env.DB.prepare("INSERT OR IGNORE INTO kaynak_gorulen(link,created_at) SELECT source_url,created_at FROM news WHERE source_url<>''").run();
}
async function scanNewsSources(env,feedIds){
  const feeds=NEWS_FEEDS.filter(x=>!feedIds||feedIds.includes(x.id)); const found=[];
  if(!env.DB) return found;
  await gorulenTablosu(env);
  for(const feed of feeds){try{
    const r=await fetch(feed.url,{headers:{accept:'application/rss+xml, application/xml, text/xml, text/html','user-agent':'BTMEDYA-NewsFinder/1.0'},redirect:'follow'}); if(!r.ok) continue;
    for(const item of rssItems(await r.text()).slice(0,20)){
      const gorulmus=await env.DB.prepare('SELECT 1 FROM kaynak_gorulen WHERE link=? LIMIT 1').bind(item.link).first(); if(gorulmus) continue;
      const baslik=feed.id.startsWith('google-')?kaynakEkiniAt(item.title):item.title;
      const slug=newsSlug(baslik,item.link); const duplicate=await env.DB.prepare('SELECT id FROM news WHERE slug=? LIMIT 1').bind(slug).first(); if(duplicate) continue;
      const now=new Date().toISOString();
      await env.DB.prepare('INSERT INTO news(slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,source_url,original_date,archive_note,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(slug,baslik,item.description,item.description,feed.category,'BTMEDYA Kaynak Masası','','','draft',null,item.link,item.date||null,'Kaynak Masası tarafından bulundu; editör onayı bekliyor.',now).run();
      await env.DB.prepare('INSERT OR IGNORE INTO kaynak_gorulen(link,created_at) VALUES(?,?)').bind(item.link,now).run();
      found.push({slug,title:baslik,source:item.link,category:feed.category,date:item.date||null});
    }
  }catch(e){}}
  return found;
}
async function newsFinderApi(request,env,url){
  if(!url.pathname.startsWith('/api/admin/news-finder')) return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  if(!env.DB) return json({ok:false,error:'D1 not configured'},503);
  if(request.method==='GET') return json({ok:true,feeds:NEWS_FEEDS.map(x=>({id:x.id,name:x.name,category:x.category})),openai:!!env.OPENAI_API_KEY});
  if(request.method!=='POST') return json({ok:false,error:'Method not allowed'},405,{'allow':'GET,POST'});
  const body=await request.json().catch(()=>({})); const feedIds=Array.isArray(body.feeds)&&body.feeds.length?body.feeds:NEWS_FEEDS.map(x=>x.id);
  const found=await scanNewsSources(env,feedIds);
  return json({ok:true,count:found.length,items:found});
}
function normalizeAiDraft(value, fallback){
  const o=value && typeof value==='object' && !Array.isArray(value) ? value : {};
  const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
  const title=clean(o.title,500);
  const excerpt=clean(o.excerpt,1200);
  const body=clean(o.body,16000);
  const social_caption=clean(o.social_caption,2500);
  if(!title && !excerpt && !body && !social_caption) return null;
  return {title:title||fallback.title,excerpt,body,social_caption};
}
async function aiDraftApi(request,env,url){
  if(url.pathname!=='/api/admin/ai-draft') return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  if(request.method!=='POST') return json({ok:false,error:'Method not allowed'},405);
  if(!env.OPENAI_API_KEY) return json({ok:false,error:'OPENAI_API_KEY secret eksik'},503);
  const b=await request.json().catch(()=>({})); const title=String(b.title||'').trim().slice(0,500); const source=String(b.source||'').trim().slice(0,2000); const textIn=String(b.text||'').trim().slice(0,12000);
  if(!title&&!textIn) return json({ok:false,error:'Başlık veya metin gerekli'},400);
  const prompt='BTMEDYA için editoryal TASLAK hazırla. Kaynak metni kopyalama. Yalnızca verilen bilgilerden hareket et, yeni olgu uydurma. Türkçe JSON üret: title, excerpt, body, social_caption. Kaynak linkini ve belirsizliği koru. Otomatik yayın yapma.\n\nBaşlık: '+title+'\nKaynak: '+source+'\nMetin: '+textIn;
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+env.OPENAI_API_KEY},body:JSON.stringify({model:'gpt-5.6-luna',input:prompt,store:false})});
  if(!r.ok) return json({ok:false,error:'AI servisi yanıt vermedi'},502); const data=await r.json();
  const output=String(data.output_text||data.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join('')||'').trim();
  let parsed=null; try{parsed=JSON.parse(output.replace(/^```json|```$/g,'').trim());}catch{}
  const draft=normalizeAiDraft(parsed,{title});
  if(draft) return json({ok:true,draft});
  return json({ok:true,draft:{title,excerpt:'',body:'',social_caption:''},guardrail:'invalid-ai-output'});
}
/* ---------- Statik arşiv -> R2 eşitleme ---------- */
async function mediaSyncApi(request, env, url){
  if(url.pathname!=='/api/admin/media-sync' || request.method!=='POST') return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  if(!env.MEDIA) return json({ok:false,error:'Üretim R2 bağlı değil'},503);
  if(!env.ASSETS) return json({ok:false,error:'Statik ASSETS bağlı değil'},503);
  const body=await request.json().catch(()=>({}));
  const raw=String(body.path||'').replace(/^\/+/, '');
  if(!raw || raw.includes('..') || raw.length>500) return json({ok:false,error:'Geçersiz medya yolu'},400);
  const origin=new URL(request.url).origin;
  const catalog=await medyaListesi(env,origin);
  const item=catalog.find(x=>String(x.path||'')===raw);
  if(!item) return json({ok:false,error:'Bu dosya BTMEDYA statik kataloğunda yok'},404);
  const existing=await env.MEDIA.head(raw).catch(()=>null);
  if(existing) return json({ok:true,already:true,path:raw,source:'r2',message:'Dosya R2 içinde zaten var'});
  const assetUrl=new URL('/assets/'+raw,origin);
  const response=await env.ASSETS.fetch(new Request(assetUrl.toString(),{method:'GET'}));
  if(!response.ok) return json({ok:false,error:'Statik medya okunamadı: HTTP '+response.status},502);
  const mime=response.headers.get('content-type') || (/\.(mp4|webm)$/i.test(raw)?'video/mp4':'image/webp');
  const size=Number(response.headers.get('content-length')||0);
  await env.MEDIA.put(raw,response.body,{httpMetadata:{contentType:mime}});
  if(env.DB){
    const id=crypto.randomUUID(), now=new Date().toISOString();
    const category=String(item.category||'arsiv');
    const title=String(item.baslik||raw.split('/').pop()||raw).replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ');
    const ai=item.gercek===true ? 0 : 1;
    const slot=category==='hero'?'hero':category==='video'?'medya':category==='portfoy'?'portfoy':'';
    const tags=JSON.stringify(['BTMEDYA',ai?'ai-uretimi':'gercek','arsiv','r2']);
    await env.DB.prepare('INSERT OR IGNORE INTO media (id,key,original_name,mime,size,category,tags,title,description,alt_text,published,slot,sort_order,created_at,updated_at,width,height,duration_s,has_audio,aspect,suggested,routed,posted,youtube_id,ai_generated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id,raw,raw.split('/').pop()||raw,mime,size,category,tags,title,ai?'BTMEDYA AI üretimi arşiv medyası':'BTMEDYA gerçek çekim arşiv medyası',ai?'BTMEDYA AI üretimi arşiv medyası':'BTMEDYA gerçek çekim arşiv medyası',1,slot,Number(item.sira||0),now,now,0,0,0,0,'', '[]','[]','[]','',ai).run().catch(()=>{});
  }
  return json({ok:true,already:false,path:raw,source:'r2',mime,size,message:'Statik medya R2 ve D1 medya kasasına aktarıldı'});
}
/* ---------- Admin page inspector + safe command bridge ---------- */
const SAFE_ADMIN_COMMANDS = new Set([
  'news-intelligence',
  'sabah-preview',
  'social-drafts',
  'automation-heartbeat'
]);

function publicPathFromInput(value){
  try{
    const raw=String(value||'/').trim();
    const u=new URL(raw,'https://btmedya.com.tr');
    if(u.hostname!=='btmedya.com.tr' || u.protocol!=='https:') return null;
    if(/^\/(?:admin|api)(?:\/|$)/.test(u.pathname)) return null;
    return u.pathname+u.search;
  }catch(e){ return null; }
}

async function adminPageInspectApi(request, env, url){
  if(url.pathname!=='/api/admin/inspect' || request.method!=='GET') return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  const path=publicPathFromInput(url.searchParams.get('path')||'/');
  if(!path) return json({ok:false,error:'Yalnızca btmedya.com.tr üzerindeki public yollar denetlenebilir.'},400);
  const target=new URL(path,'https://btmedya.com.tr');
  let html='',status=200,mode='static-assets';
  try{
    const newsMatch=target.pathname.match(/^\/haberler\/(.+?)(?:\.html)?\/?$/);
    if(newsMatch && newsMatch[1]){
      const slug=decodeURIComponent(newsMatch[1]);
      let n=null;
      if(env.DB) n=await env.DB.prepare("SELECT * FROM news WHERE slug=? AND status='published'").bind(slug).first();
      if(!n && env.ASSETS){
        const asset=await env.ASSETS.fetch(new Request(new URL('/data/haberler.json',target.origin)));
        if(asset.ok){
          const archive=await asset.json().catch(()=>[]);
          const a=Array.isArray(archive)?archive.find(x=>x.slug===slug):null;
          if(a)n={id:a.id||null,slug:a.slug,title:a.title,excerpt:a.excerpt||'',body:Array.isArray(a.body)?a.body.join('\n\n'):String(a.body||''),category:a.category||'Haber',author:a.author||'BTMEDYA',cover_url:a.cover_url||'/assets/haber-kapak/'+encodeURIComponent(a.slug)+'.webp',video_url:a.video_url||null,published_at:a.published_at||null,source_url:a.source_url||null,original_date:a.original_date||null,archive_note:a.archive_note||'',updated_at:a.updated_at||null};
        }
      }
      if(n){
        let vlib=null;
        const vid=String(n.video_url||'').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})|^([A-Za-z0-9_-]{11})$/);
        const yid=vid?(vid[1]||vid[2]):'';
        if(env.DB && yid)vlib=await env.DB.prepare('SELECT * FROM video_library WHERE youtube_id=?').bind(yid).first();
        if(env.DB && !vlib)vlib=await env.DB.prepare('SELECT * FROM video_library WHERE news_slug=?').bind(slug).first();
        n={...n,cover_url:kapakSec(n,await uretilmisKapaklar(env))};
        const related=await ilgiliHaberler(env,n); html=renderNewsPage(n,target.origin,vlib,related);
        mode='dynamic-news';
        return json({ok:true,path,status,contentType:'text/html; charset=utf-8',html:true,mode,seo:inspectHtml(html)});
      }
    }
    const response=await env.ASSETS.fetch(new Request(target.toString(),{method:'GET',headers:{accept:'text/html'}}));
    status=response.status;
    const contentType=response.headers.get('content-type')||'';
    if(!contentType.includes('text/html')) return json({ok:true,path,status,contentType,html:false,mode});
    html=await response.text();
    return json({ok:true,path,status,contentType,html:true,mode,seo:inspectHtml(html)});
  }catch(e){
    return json({ok:false,error:'Sayfa alınamadı: '+String(e?.message||e)},502);
  }
}
async function ilgiliHaberler(env,n){
  if(!env.DB || !n?.slug) return [];
  try{
    const category=String(n.category||'').trim();
    const result=await env.DB.prepare(
      "SELECT slug,title,category,cover_url FROM news WHERE status='published' AND slug<>? ORDER BY CASE WHEN category=? THEN 0 ELSE 1 END, published_at DESC LIMIT 3"
    ).bind(n.slug,category).all();
    const rows=Array.isArray(result?.results)?result.results:[];
    // Kartlar haber sayfasindaki kapak kuraliyla ayni gorseli gostersin.
    const kapaklar=await uretilmisKapaklar(env);
    return rows.map(x=>({...x,cover_url:kapakSec(x,kapaklar),kapak_turu:kapaklar.get(x.slug)||''}));
  }catch(e){
    console.error('[news-related] query failed:',e);
    return [];
  }
}
function inspectHtml(html){
  const pick=(re)=>{const m=html.match(re);return m?String(m[1]||'').trim():''};
  const title=pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const description=pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const canonical=pick(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const ogImage=pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  const h1=pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const robots=pick(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
  const jsonLd=(html.match(/application\/ld\+json/gi)||[]).length;
  const links=(html.match(/<a\b/gi)||[]).length;
  const scripts=(html.match(/<script\b/gi)||[]).length;
  const images=(html.match(/<img\b/gi)||[]).length;
  const videos=(html.match(/<video\b/gi)||[]).length;
  const localLinks=(html.match(/href=["']\/[^"']+/gi)||[]).length;
  return {title,description,canonical,ogImage,robots,h1,jsonLd,links,scripts,images,videos,localLinks,titleOk:title.length>=10&&title.length<=65,descriptionOk:description.length>=50&&description.length<=170,canonicalOk:canonical.startsWith('https://btmedya.com.tr/'),h1Ok:h1.length>0,structuredDataOk:jsonLd>0};
}

async function adminAiCommandApi(request, env, url){
  if(url.pathname!=='/api/admin/ai-command' || request.method!=='POST') return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  const body=await request.json().catch(()=>null);
  const prompt=String(body?.prompt||'').trim().slice(0,800);
  if(!prompt) return json({ok:false,error:'Komut boş olamaz'},400);

  const allowed=[
    {command:'news-intelligence',hints:'haber istihbaratı, haber bul, kaynakları tara, trend haberleri tara'},
    {command:'sabah-preview',hints:'sabah masası, günlük haber özeti, sabah önizleme'},
    {command:'social-drafts',hints:'sosyal taslak, sosyal medya taslakları, paylaşım kuyruğu'},
    {command:'automation-heartbeat',hints:'otomasyon sağlığı, sistem sağlığı, kalp atışı'}
  ];

  let plan=null;
  if(env.AI){
    const system=[
      'BTMEDYA admin komut planlayıcısısın.',
      'Yalnız şu komutlardan birini seç: '+allowed.map(x=>x.command).join(', ')+'.',
      'Serbest kod, SQL, shell, deploy, DNS, secret, parola veya silme komutu üretme.',
      'Bir komutla eşleşmiyorsa command alanına "none" yaz.',
      'Yalnız JSON döndür: {"command":"...","confidence":0,"reason":"..."}'
    ].join('\\n');
    try{
      const r=await env.AI.run('@cf/openai/gpt-oss-120b',{messages:[
        {role:'system',content:system},
        {role:'user',content:prompt}
      ],max_tokens:250,temperature:0});
      const j=jsonAyikla(yanitMetni(r));
      if(j && typeof j==='object') plan={
        command:String(j.command||'none'),
        confidence:Math.max(0,Math.min(1,Number(j.confidence||0))),
        reason:String(j.reason||'').slice(0,400)
      };
    }catch(e){}
  }
  if(!plan){
    const p=prompt.toLocaleLowerCase('tr-TR');
    const hit=
      /(haber|istihbarat|kaynak|trend)/.test(p)?'news-intelligence':
      /(sabah|günlük özet|gunluk ozet)/.test(p)?'sabah-preview':
      /(sosyal|reels|tiktok|instagram|youtube)/.test(p)?'social-drafts':
      /(otomasyon|sistem sağlığı|sistem sagligi|heartbeat)/.test(p)?'automation-heartbeat':'none';
    plan={command:hit,confidence:hit==='none'?0:.62,reason:hit==='none'?'Güvenli komut listesinde eşleşme bulunamadı.':'Anahtar kelime fallback planı.'};
  }
  if(!SAFE_ADMIN_COMMANDS.has(plan.command)){
    return json({ok:true,plan:{...plan,command:'none'},applied:false,requiresReview:true,message:'Komut güvenli allowlist ile eşleşmedi.'});
  }
  return json({ok:true,plan,applied:false,requiresReview:false,message:'Plan hazır. Admin arayüzündeki Uygula düğmesiyle allowlist komutu çalıştırılabilir.'});
}

async function adminCommandApi(request, env, url){
  if(url.pathname!=='/api/admin/command' || request.method!=='POST') return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  const body=await request.json().catch(()=>null);
  const command=String(body?.command||'').trim();
  if(!SAFE_ADMIN_COMMANDS.has(command)) return json({ok:false,error:'İzin verilmeyen komut'},400);
  if(command==='news-intelligence'){
    const result=await runNewsIntelligence(env,{limit:12});
    return json({ok:true,command,result});
  }
  if(command==='sabah-preview'){
    const result=await sabahMasasi(env,{kuru:true,deneme:false,zorla:true});
    return json({ok:true,command,result});
  }
  if(command==='social-drafts'){
    const result=await autoPrepareSocialDrafts(env,3);
    return json({ok:true,command,result});
  }
  const result=await recordAutomationHeartbeat(env);
  return json({ok:true,command,result});
}

/* ---------- Admin operation audit ---------- */
async function ensureAdminAuditTable(env){
  if(!env.DB) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    detail TEXT NOT NULL DEFAULT '{}',
    outcome TEXT NOT NULL DEFAULT 'ok',
    created_at TEXT NOT NULL
  )`).run().catch(()=>{});
}
async function recordAdminAudit(env, request, response){
  if(!env.DB || request.method==='GET') return response;
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/admin/')) return response;
  try{
    await ensureAdminAuditTable(env);
    const action=request.method+' '+url.pathname;
    const detail=JSON.stringify({
      method:request.method,
      path:url.pathname,
      query:url.search ? url.search.slice(0,300) : '',
      status:response?.status||0,
      referrer:request.headers.get('referer')||'',
      userAgent:(request.headers.get('user-agent')||'').slice(0,180)
    });
    await env.DB.prepare(
      'INSERT INTO admin_audit_log(action,target,detail,outcome,created_at) VALUES(?,?,?,?,?)'
    ).bind(action,url.pathname,detail,(response?.status||500)<400?'ok':'error',new Date().toISOString()).run();
  }catch(e){}
  return response;
}
async function adminAuditApi(request, env, url){
  if(url.pathname!=='/api/admin/audit' || request.method!=='GET') return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  if(!env.DB) return json({ok:true,items:[]});
  try{
    await ensureAdminAuditTable(env);
    const rows=await env.DB.prepare(
      'SELECT id,action,target,detail,outcome,created_at FROM admin_audit_log ORDER BY id DESC LIMIT 150'
    ).all();
    const items=(rows.results||[]).map(x=>{
      let detail={}; try{detail=JSON.parse(x.detail||'{}')}catch{}
      return {...x,detail};
    });
    return json({ok:true,items});
  }catch(e){
    return json({ok:false,error:String(e?.message||e)},503);
  }
}

/* ---------- Kalıcı Kaynak Masası API ---------- */
async function kaynakMasasiApi(request,env,url){
  if(!url.pathname.startsWith('/api/admin/sources')) return null;
  if(!(await validSession(request,oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  if(!env.DB) return json({ok:false,error:'D1 not configured'},503);
  await ensureKaynakMasasiTables(env).catch(()=>{});

  if(url.pathname==='/api/admin/sources' && request.method==='GET'){
    const data=await kaynakListele(env,{
      q:url.searchParams.get('q')||'',
      status:url.searchParams.get('status')||'',
      tier:url.searchParams.get('tier')||'',
      limit:url.searchParams.get('limit')||80
    });
    return json({ok:true,...data,summary:await kaynakOzeti(env)});
  }
  if(url.pathname==='/api/admin/sources' && request.method==='POST'){
    const b=await request.json().catch(()=>null);
    if(!b||typeof b!=='object') return json({ok:false,error:'Geçersiz JSON'},400);
    const source=await kaynakKaydet(env,{
      url:b.url,publisher:b.publisher,tier:b.tier,status:b.status,category:b.category,
      district:b.district,license_note:b.license_note,trust_score:b.trust_score,notes:b.notes,
      title:b.title,text:b.text,score:b.score
    });
    if(!source) return json({ok:false,error:'Geçerli bir http/https kaynak URL gerekli'},400);
    return json({ok:true,item:source},201);
  }
  const match=url.pathname.match(/^\/api\/admin\/sources\/([^/]+)$/);
  if(match && request.method==='PATCH'){
    const id=decodeURIComponent(match[1]);
    const b=await request.json().catch(()=>({}));
    const item=await kaynakGuncelle(env,id,b||{});
    if(!item) return json({ok:false,error:'Kaynak bulunamadı'},404);
    return json({ok:true,item});
  }
  if(match && request.method==='GET'){
    const item=await env.DB.prepare('SELECT k.*,(SELECT COUNT(*) FROM kaynak_baglantilari b WHERE b.source_id=k.id) AS link_count FROM kaynak_kayitlari k WHERE k.id=?').bind(decodeURIComponent(match[1])).first().catch(()=>null);
    if(!item) return json({ok:false,error:'Kaynak bulunamadı'},404);
    return json({ok:true,item});
  }
  return json({ok:false,error:'Method not allowed'},405,{'allow':'GET,POST,PATCH'});
}

/* ---------- BTMEDYA Autopilot API ---------- */
async function autopilotApi(request, env, url){
  if(!url.pathname.startsWith('/api/admin/autopilot')) return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);

  if(url.pathname==='/api/admin/autopilot' && request.method==='GET'){
    return json(await autopilotStatus(env));
  }
  if(url.pathname==='/api/admin/autopilot/policy' && request.method==='GET'){
    return json({ok:true,policy:await autopilotPolicy(env),connections:connectionMatrix(env)});
  }
  if(url.pathname==='/api/admin/autopilot/policy' && request.method==='PUT'){
    const b=await request.json().catch(()=>null);
    if(!b || typeof b!=='object') return json({ok:false,error:'Geçersiz JSON'},400);
    try{return json({ok:true,policy:await setAutopilotPolicy(env,b)});}catch(e){return json({ok:false,error:String(e?.message||e)},503);}
  }
  if(url.pathname==='/api/admin/autopilot/run' && request.method==='POST'){
    const b=await request.json().catch(()=>({}));
    const result=await runAutopilot(env,{force:b.force===true,limit:b.limit});
    return json(result);
  }
  if(url.pathname==='/api/admin/autopilot/reference-draft' && request.method==='POST'){
    const b=await request.json().catch(()=>({}));
    const out=await referenceDraft(env,{url:b.url,instructions:b.instructions});
    return json(out,out.ok?200:400);
  }
  if(url.pathname==='/api/admin/autopilot/generate-image' && request.method==='POST'){
    const b=await request.json().catch(()=>({}));
    const out=await generateAutopilotImage(env,{prompt:b.prompt,category:b.category,title:b.title});
    return json(out,out.ok?200:400);
  }
  if(url.pathname==='/api/admin/autopilot/connections' && request.method==='GET'){
    return json({ok:true,connections:connectionMatrix(env)});
  }
  if(url.pathname==='/api/admin/autopilot/strategy' && request.method==='GET'){
    const s=await autopilotStatus(env);
    const competitors=s.competitors||[];
    const queue=s.queue||[];
    const cx=connectionMatrix(env);
    const socialReady=cx.filter(x=>['facebook','instagram','twitter','linkedin','whatsapp'].includes(x.network) && x.connected).map(x=>x.network);
    return json({ok:true,generated_at:new Date().toISOString(),strategy:{
      editorial:'Kaynaklı ve taze başlıkları önce keşfet; hassas konuları editör onayına bırak.',
      media:'Haber özgüllüğü olmayan içeriklerde BTMEDYA gerçek arşivini tercih et; AI görsellerini AI LAB olarak ayır.',
      distribution:'Bağlı ağlarda platforma uygun kırpma/metin kullan; bağlantısı olmayan ağları yayın kuyruğuna sokma.',
      advertising:'Reklam harcamasını otomatik artırma. Önce organik içerik performansını ve rakip görünürlüğünü ölç; reklam hesabı bağlantısı onaylandığında kampanya taslağı üret.',
      campaignReadiness:socialReady.length?socialReady:['Meta/X/LinkedIn reklam bağlantısı gerekli'],
      competitors:competitors.map(x=>({host:x.host,latest:x.last_title,headlines:x.headlines_seen,seen:x.last_seen_at})).slice(0,10),
      queue:queue.slice(0,10)
    }});
  }
  return json({ok:false,error:'Autopilot endpoint bulunamadı'},404);
}

/* ---------- BTMEDYA Control Center ---------- */
async function controlCenterApi(request, env, url){
  if(url.pathname!=='/api/admin/control-center' || request.method!=='GET') return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  let automation={configured:true,cron:'*/5 * * * *',lastHeartbeat:null};
  if(env.KV){
    const raw=await env.KV.get('automation:heartbeat').catch(()=>null);
    if(raw) try{ automation={...automation,...JSON.parse(raw)}; }catch{}
  }
  const metricool=await metricoolDurumu(env).catch(()=>({yapilandirildi:!!env.METRICOOL_USER_TOKEN}));
  return json({
    ok:true,
    service:'BTMEDYA Control Center',
    /* Metricool yayin/analitik katmani kullanilir. Bagli aglarin gercek durumu
       Metricool hesabindan ayri olarak dogrulanir; Worker secret'in varligi
       tek basina Instagram/Facebook/YouTube baglantisi kaniti degildir. */
    metricool,
    site:{url:'https://btmedya.com.tr/',worker:'btmedya-db',surum:surumBilgisi(env)},
    storage:{d1:!!env.DB,r2:!!env.MEDIA},
    google:{
      property:'https://btmedya.com.tr/',
      technicalEndpoints:true,
      robots:'https://btmedya.com.tr/robots.txt',
      sitemap:'https://btmedya.com.tr/sitemap.xml',
      newsSitemap:'https://btmedya.com.tr/news-sitemap.xml',
      apiAutomation:'github-actions-secret-required',
      note:'Teknik Google uyumluluğu canlı uçlarla doğrulanır; kesin indeksleme ve URL Inspection sonucu Search Console yetkisi gerektirir.'
    },
    admin:{configured:!!(env.ADMIN_PASSWORD_SECRET || env.ADMIN_PASSWORD) && !!(env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET),mediaSigning:!!env.MEDIA_SIGNING_SECRET},
    readiness:{
      ai:{openai:!!env.OPENAI_API_KEY},
      metricool:{userToken:!!env.METRICOOL_USER_TOKEN,userId:!!env.METRICOOL_USER_ID,brandId:!!env.METRICOOL_BRAND_ID},
      note:'Secret değerleri hiçbir zaman API yanıtında gösterilmez; yalnızca yapılandırma varlığı raporlanır.'
    },
    automation,
    social:socialProviderStatus(env),
    socialLinks:[
      {key:'instagram',label:'Instagram @busetuncayy10',url:'https://www.instagram.com/busetuncayy10/',note:'Metricool marka hesabı / kurucu profil bağlantısı'},
      {key:'instagram-brand',label:'BTMEDYA Instagram @btmedyajans',url:'https://www.instagram.com/btmedyajans/',note:'BTMEDYA marka profili'},
      {key:'tiktok',label:'TikTok @btmedya1010',url:'https://www.tiktok.com/@btmedya1010',note:'Kısa video kanalı; yayın API’si ayrıca yetkilendirilmeli'},
      {key:'youtube',label:'YouTube @BTmedyaAjans',url:'https://www.youtube.com/@BTmedyaAjans',note:'Video arşivi ve Shorts hedefi'},
      {key:'facebook',label:'Facebook Page · BTmedya',url:'https://www.facebook.com/people/busetuncayy10/100080226545931/',note:'Metricool Brand 6858384 içinde doğrulanmış Facebook Sayfası; Page ID 107923075188798'},
      {key:'whatsapp',label:'WhatsApp teklif hattı',url:'https://wa.me/905416401029',note:'İletişim ve proje talebi'}
    ],
    integrations:{
      izap:{status:'external_connector',assistant:'busetuncay74',note:'WhatsApp/iZap operasyon asistanı yapılandırıldı; Worker doğrudan iZap sırrı tutmaz.'},
      cmsOpenData:{status:'assistant_connector',note:'CMS Open Data resmi veri sorguları Control Center/ChatGPT tarafında kullanılabilir; Worker içine Medicare verisi gömülmez.'},
      github:{status:'deployment_pipeline',note:'main dalı üzerinden Cloudflare Workers Builds deploy zinciri kullanılır.'}
    },
    nextActions:[
      !env.ADMIN_PASSWORD_SECRET?'Cloudflare Worker secret: ADMIN_PASSWORD_SECRET ekle':null,
      !env.ADMIN_SESSION_SECRET_SECRET?'Cloudflare Worker secret: ADMIN_SESSION_SECRET_SECRET ekle':null,
      !env.MEDIA_SIGNING_SECRET?'Cloudflare Worker secret: MEDIA_SIGNING_SECRET ekle':null,
      !env.METRICOOL_USER_TOKEN?'Metricool: Worker secret METRICOOL_USER_TOKEN eksik.':null,
      metricool.igBagli===false?'Metricool: Instagram bağlantısı doğrulanmamış.':null,
      metricool.fbBagli===false?'Metricool: Facebook bağlantısı doğrulanmamış.':null,
      metricool.youtubeBagli===false?'Metricool: YouTube bağlantısı doğrulanmamış.':null,
      metricool.tiktokBagli===false?'Metricool: TikTok bağlantısı doğrulanmamış.':null,
      metricool.hatali?`Metricool: ${metricool.hatali} gönderi teslim edilemedi — ${metricool.sonHata||'ayrıntı için Sosyal İçerik'}`:null
    ].filter(Boolean)
  });
}

/* Canlidaki Worker surumu. Workers Builds basarisiz olursa eski surum
   calismaya devam eder ve site "calisiyor" gorunur; tek iz bu zamanin
   son commit'in gerisinde kalmasidir. Baglama wrangler.toml'da
   [version_metadata] SURUM. */
function surumBilgisi(env){
  return {id:env.SURUM?.id||null,yuklendi:env.SURUM?.timestamp||null};
}

/* ---------- İletişim Formu API ---------- */
async function contactApi(request, env, url, ctx){
  if(url.pathname==='/api/contact' && request.method==='POST'){
    if(!env.DB) return json({ok:false,error:'Veritabanı yapılandırılmadı'},503);
    const b=await request.json().catch(()=>({}));
    if(!b.name||!b.email||!b.message) return json({ok:false,error:'Ad, e-posta ve mesaj zorunludur'},400);
    if(b.consent!==true) return json({ok:false,error:'Gizlilik ve KVKK onayı zorunludur'},400);
    if(String(b.message).length>5000) return json({ok:false,error:'Mesaj çok uzun'},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email))) return json({ok:false,error:'Geçersiz e-posta adresi'},400);
    if(b._honey) return json({ok:true});
    const name=String(b.name).trim().slice(0,160);
    const email=String(b.email).trim().slice(0,320);
    const phone=String(b.phone||'').trim().slice(0,60);
    const subject=String(b.subject||'').trim().slice(0,200);
    const message=String(b.message).trim().slice(0,5000);
    let inserted;
    try{
      inserted=await env.DB.prepare('INSERT INTO contact_messages(name,email,phone,subject,message,consent_at) VALUES(?,?,?,?,?,?)')
        .bind(name,email,phone,subject,message,new Date().toISOString()).run();
    }catch(e){
      // Migration henüz uygulanmadıysa iletişim formu çalışmaya devam etsin.
      inserted=await env.DB.prepare('INSERT INTO contact_messages(name,email,phone,subject,message) VALUES(?,?,?,?,?)')
        .bind(name,email,phone,subject,message).run();
    }
    const dbId=inserted.meta?.last_row_id ?? inserted.meta?.last_insert_rowid ?? null;
    const emailData={dbId,name,email,phone,subject,message};
    if(ctx) ctx.waitUntil(sendContactEmail(env,emailData));
    else sendContactEmail(env,emailData);
    return json({ok:true,message:'Mesajınız alındı, teşekkürler!'});
  }
  if(url.pathname==='/api/admin/contact' && request.method==='GET'){
    if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
    const rows=await env.DB.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200').all();
    return json({ok:true,items:rows.results});
  }
  const contactById=url.pathname.match(/^\/api\/admin\/contact\/(\d+)$/);
  if(contactById && request.method==='PATCH'){
    if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
    await env.DB.prepare('UPDATE contact_messages SET read=1 WHERE id=?').bind(Number(contactById[1])).run();
    return json({ok:true});
  }
  if(contactById && request.method==='DELETE'){
    if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
    await env.DB.prepare('DELETE FROM contact_messages WHERE id=?').bind(Number(contactById[1])).run();
    return json({ok:true});
  }
  return null;
}

/* ---------- Sosyal İçerik Akışı API ---------- */
const SOCIAL_STATUS = new Set(['fikir','hazirlaniyor','onayda','planlandi','yayinlandi']);
const SOCIAL_FORMAT = new Set(['9:16','4:5','1:1','16:9']);
const SOCIAL_PLATFORM_NETWORK = Object.freeze({
  instagram:'instagram','instagram-post':'instagram','instagram-reel':'instagram','instagram-story':'instagram',
  facebook:'facebook','facebook-post':'facebook','facebook-reel':'facebook','facebook-story':'facebook',
  tiktok:'tiktok',
  youtube:'youtube','youtube-short':'youtube'
});
function normalizeSocialPlatforms(input){
  const raw=Array.isArray(input) ? input : typeof input==='string' ? input.split(',') : [];
  return [...new Set(raw.map(x=>String(x||'').trim().toLowerCase()).filter(Boolean))].slice(0,20);
}
function socialPlatformCheck(env,platforms){
  const connected=metricoolConnectedNetworks(env);
  const unknown=platforms.filter(p=>!SOCIAL_PLATFORM_NETWORK[p]);
  const disconnected=platforms.map(p=>SOCIAL_PLATFORM_NETWORK[p]).filter(Boolean).filter((n,i,a)=>a.indexOf(n)===i&&!connected.has(n));
  return {ok:!unknown.length&&!disconnected.length,unknown,disconnected,connected};
}

async function socialApi(request, env, url, ctx){
  if(!url.pathname.startsWith('/api/admin/social')) return null;
  if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
  if(!env.DB) return json({ok:false,error:'D1 not configured'},503);

  if(url.pathname==='/api/admin/social/providers' && request.method==='GET'){
    return json({ok:true,providers:socialProviderStatus(env)});
  }

  if(url.pathname==='/api/admin/social/queue-summary' && request.method==='GET'){
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS metricool_gonderim (
      post_id TEXT PRIMARY KEY,
      metricool_id TEXT NOT NULL DEFAULT '',
      durum TEXT NOT NULL DEFAULT '',
      hata TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      retryable INTEGER NOT NULL DEFAULT 1
    )`).run().catch(()=>{});
    const now=new Date().toISOString();
    const counts=await env.DB.prepare(`SELECT
      SUM(CASE WHEN status='fikir' THEN 1 ELSE 0 END) AS fikir,
      SUM(CASE WHEN status='hazirlaniyor' THEN 1 ELSE 0 END) AS hazirlaniyor,
      SUM(CASE WHEN status='onayda' THEN 1 ELSE 0 END) AS onayda,
      SUM(CASE WHEN status='planlandi' THEN 1 ELSE 0 END) AS planlandi,
      SUM(CASE WHEN status='yayinlandi' THEN 1 ELSE 0 END) AS yayinlandi,
      SUM(CASE WHEN status='planlandi' AND (scheduled_at IS NULL OR scheduled_at<=?) THEN 1 ELSE 0 END) AS geciken
      FROM social_posts`).bind(now).first().catch(()=>({}));
    const teslim=await teslimDurumlari(env);
    const teslimValues=Object.values(teslim||{});
    const failures=teslimValues.filter(x=>x.durum==='hata').sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));
    const upcoming=(await env.DB.prepare(`SELECT id,title,status,platforms,format,media_key,scheduled_at
      FROM social_posts WHERE status='planlandi' AND scheduled_at>? ORDER BY scheduled_at ASC LIMIT 8`).bind(now).all().catch(()=>({results:[]}))).results||[];
    const parsedUpcoming=upcoming.map(x=>({...x,platforms:JSON.parse(x.platforms||'[]'),teslim:teslim[x.id]||null}));
    return json({
      ok:true,generated_at:now,counts:{
        fikir:Number(counts?.fikir||0),hazirlaniyor:Number(counts?.hazirlaniyor||0),onayda:Number(counts?.onayda||0),
        planlandi:Number(counts?.planlandi||0),yayinlandi:Number(counts?.yayinlandi||0),geciken:Number(counts?.geciken||0)
      },
      delivery:{failed:failures.length,lastFailure:failures[0]||null},
      upcoming:parsedUpcoming,
      providers:socialProviderStatus(env),
      settings:await ayarlariOku(env)
    });
  }

  if(url.pathname==='/api/admin/social/settings'){
    if(request.method==='GET') return json({ok:true,ayarlar:await ayarlariOku(env),metricool:Boolean(env.METRICOOL_USER_TOKEN),providers:socialProviderStatus(env)});
    if(request.method==='PUT'){
      const b=await request.json().catch(()=>null);
      if(!b || typeof b!=='object') return json({ok:false,error:'Geçersiz JSON'},400);
      try{ return json({ok:true,ayarlar:await ayarlariYaz(env,b)}); }
      catch(e){ return json({ok:false,error:String(e?.message||e)},503); }
    }
    return json({ok:false,error:'Method not allowed'},405,{'allow':'GET,PUT'});
  }

  if(url.pathname==='/api/admin/social' && request.method==='GET'){
    const status=String(url.searchParams.get('status')||'').trim();
    if(status && !SOCIAL_STATUS.has(status)) return json({ok:false,error:'Geçersiz durum'},400);
    let sql='SELECT * FROM social_posts';
    const args=[];
    if(status){sql+=' WHERE status=?';args.push(status);}
    sql+=' ORDER BY CASE status WHEN "onayda" THEN 1 WHEN "planlandi" THEN 2 WHEN "hazirlaniyor" THEN 3 WHEN "fikir" THEN 4 WHEN "yayinlandi" THEN 5 ELSE 9 END, COALESCE(scheduled_at,"9999-12-31T23:59:59.999Z"), updated_at DESC LIMIT 300';
    const rows=args.length ? await env.DB.prepare(sql).bind(...args).all() : await env.DB.prepare(sql).all();
    const teslim=await teslimDurumlari(env);
    const items=(rows.results||[]).map(x=>({...x,platforms:JSON.parse(x.platforms||'[]'),teslim:teslim[x.id]||null}));
    return json({ok:true,items,metricool:Boolean(env.METRICOOL_USER_TOKEN)});
  }

  if(url.pathname==='/api/admin/social' && request.method==='POST'){
    const b=await request.json().catch(()=>null);
    if(!b || typeof b!=='object') return json({ok:false,error:'Geçersiz JSON'},400);
    const title=String(b.title||'').trim().slice(0,240);
    if(!title) return json({ok:false,error:'Başlık zorunludur'},400);
    const body=String(b.body||'').slice(0,20000);
    const format=SOCIAL_FORMAT.has(String(b.format||'')) ? String(b.format) : '9:16';
    const status=SOCIAL_STATUS.has(String(b.status||'')) ? String(b.status) : 'fikir';
    const sourceSlug=String(b.source_slug||'').trim().slice(0,180);
    const mediaKey=String(b.media_key||'').trim().slice(0,1000);
    let scheduledAt=b.scheduled_at ? String(b.scheduled_at).slice(0,64) : null;
    // "Planlandı" saat girilmeden secilirse bir sonraki bos yuvaya yerlesir.
    if(status==='planlandi' && !scheduledAt) scheduledAt=await sonrakiYuva(env,await ayarlariOku(env));
    const platforms=normalizeSocialPlatforms(b.platforms);
    const platformCheck=socialPlatformCheck(env,platforms);
    if(platformCheck.unknown.length) return json({ok:false,error:'Desteklenmeyen sosyal platformu',platforms:platformCheck.unknown},400);
    if(status==='planlandi' && platformCheck.disconnected.length) return json({ok:false,error:'Metricool bağlantısı doğrulanmamış ağ: '+platformCheck.disconnected.join(', '),disconnected:platformCheck.disconnected},409);
    if(status==='planlandi' && !platforms.length) return json({ok:false,error:'Planlanan gönderi için en az bir sosyal platform seçilmelidir'},400);

    const now=new Date().toISOString();
    const id=String(b.id||'').trim() || crypto.randomUUID();
    const exists=b.id ? await env.DB.prepare('SELECT id FROM social_posts WHERE id=?').bind(id).first() : null;
    const accountScope=String(b.account_scope||'company');
    const brandId=String(b.metricool_brand_id||env.METRICOOL_BRAND_ID||'');
    let rezerv=null;
    if(!exists){
      rezerv=await sosyalTekillemeAyir(env,{post_id:id,source_slug:sourceSlug,title,body,format,platforms,account_scope:accountScope,metricool_brand_id:brandId});
      if(!rezerv.allowed) return json({ok:false,error:'Aynı sosyal içerik zaten kuyrukta veya daha önce kaydedilmiş.',duplicate_of:rezerv.existing_post_id||null},409);
    }

    try{
      if(exists){
        await env.DB.prepare('UPDATE social_posts SET title=?,body=?,platforms=?,format=?,media_key=?,source_slug=?,status=?,scheduled_at=?,updated_at=? WHERE id=?')
          .bind(title,body,JSON.stringify(platforms),format,mediaKey,sourceSlug,status,scheduledAt,now,id).run();
      }else{
        await env.DB.prepare('INSERT INTO social_posts(id,title,body,platforms,format,media_key,source_slug,status,scheduled_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
          .bind(id,title,body,JSON.stringify(platforms),format,mediaKey,sourceSlug,status,scheduledAt,now,now).run();
        await env.DB.prepare('UPDATE social_posts SET account_scope=?,metricool_brand_id=?,account_label=? WHERE id=?')
          .bind(accountScope,brandId,String(b.account_label||'BTMEDYA Şirket').slice(0,120),id).run();
        await sosyalTekillemeBagla(env,rezerv.fingerprint,id,sourceSlug);
      }
    }catch(e){
      if(rezerv?.fingerprint) await sosyalTekillemeBirak(env,rezerv.fingerprint);
      throw e;
    }
    const disId=String(b.metricool_id||'').trim();
    if(disId) await disTeslimKaydet(env,id,disId);
    if(status==='planlandi' && !disId && ctx?.waitUntil){
      ctx.waitUntil(
        processMetricoolQueue(env,10)
          .then(x=>console.log('[btmedya] immediate Metricool handoff',JSON.stringify(x)))
          .catch(e=>console.error('[btmedya] immediate Metricool handoff:',e?.message||e))
      );
    }
    return json({ok:true,id,status,scheduled_at:scheduledAt});
  }

  const retryMatch=url.pathname.match(/^\/api\/admin\/social\/([^/]+)\/retry$/);
  if(retryMatch && request.method==='POST'){
    const id=decodeURIComponent(retryMatch[1]);
    const row=await env.DB.prepare('SELECT id,title,platforms,media_key,status,scheduled_at FROM social_posts WHERE id=?').bind(id).first().catch(()=>null);
    if(!row) return json({ok:false,error:'Bulunamadı'},404);
    const teslim=await env.DB.prepare('SELECT durum,attempts,retryable,hata FROM metricool_gonderim WHERE post_id=?').bind(id).first().catch(()=>null);
    if(!teslim || teslim.durum!=='hata') return json({ok:false,error:'Yalnızca Metricool teslim hatası olan içerikler yeniden denenebilir'},409);
    const platforms=normalizeSocialPlatforms(JSON.parse(row.platforms||'[]'));
    const platformCheck=socialPlatformCheck(env,platforms);
    if(platformCheck.unknown.length) return json({ok:false,error:'Desteklenmeyen sosyal platformu',platforms:platformCheck.unknown},400);
    if(platformCheck.disconnected.length) return json({ok:false,error:'Metricool bağlantısı doğrulanmamış ağ: '+platformCheck.disconnected.join(', '),disconnected:platformCheck.disconnected},409);
    if(!platforms.length) return json({ok:false,error:'En az bir sosyal platform seçilmelidir'},400);
    if(!row.media_key && platforms.some(p=>SOCIAL_PLATFORM_NETWORK[p] && ['instagram','tiktok','youtube'].includes(SOCIAL_PLATFORM_NETWORK[p])))
      return json({ok:false,error:'Seçilen platformlar için görsel/video gerekli; medya anahtarı eksik'},400);
    const now=new Date().toISOString();
    let scheduledAt=String(row.scheduled_at||'');
    if(!scheduledAt || new Date(scheduledAt).getTime()<=Date.now()+15000) scheduledAt=await sonrakiYuva(env,await ayarlariOku(env));
    await env.DB.prepare('UPDATE social_posts SET status=?,scheduled_at=?,updated_at=? WHERE id=?').bind('planlandi',scheduledAt,now,id).run();
    await env.DB.prepare('DELETE FROM metricool_gonderim WHERE post_id=?').bind(id).run();
    if(ctx?.waitUntil){
      ctx.waitUntil(processMetricoolQueue(env,1)
        .then(x=>console.log('[btmedya] manual Metricool retry',JSON.stringify(x)))
        .catch(e=>console.error('[btmedya] manual Metricool retry:',e?.message||e)));
    }
    return json({ok:true,id,scheduled_at:scheduledAt,retry:true});
  }

  if(byId && request.method==='PATCH'){
    const id=decodeURIComponent(byId[1]);
    const b=await request.json().catch(()=>({}));
    const status=String(b.status||'');
    if(!SOCIAL_STATUS.has(status)) return json({ok:false,error:'Geçersiz durum'},400);
    const hedef=await env.DB.prepare('SELECT platforms,media_key FROM social_posts WHERE id=?').bind(decodeURIComponent(byId[1])).first().catch(()=>null);
    if(!hedef) return json({ok:false,error:'Bulunamadı'},404);
    const hedefPlatformlari=normalizeSocialPlatforms(hedef.platforms?JSON.parse(hedef.platforms||'[]'):[]);
    const platformCheck=socialPlatformCheck(env,hedefPlatformlari);
    if(status==='planlandi' && platformCheck.disconnected.length) return json({ok:false,error:'Metricool bağlantısı doğrulanmamış ağ: '+platformCheck.disconnected.join(', '),disconnected:platformCheck.disconnected},409);
    if(status==='planlandi' && !hedefPlatformlari.length) return json({ok:false,error:'Planlanan gönderi için en az bir sosyal platform seçilmelidir'},400);
    const now=new Date().toISOString();
    let r;
    const mevcut=status==='planlandi' ? await env.DB.prepare('SELECT scheduled_at FROM social_posts WHERE id=?').bind(id).first() : null;
    // Panelde tek tik onay: saati olmayan ya da saati gecmis gonderi
    // bir sonraki bos yuvaya yerlesir.
    if(mevcut && (!mevcut.scheduled_at || mevcut.scheduled_at<now)){
      const yuva=await sonrakiYuva(env,await ayarlariOku(env));
      r=await env.DB.prepare('UPDATE social_posts SET status=?,scheduled_at=?,updated_at=? WHERE id=?').bind(status,yuva,now,id).run();
    }else{
      r=await env.DB.prepare('UPDATE social_posts SET status=?,updated_at=? WHERE id=?').bind(status,now,id).run();
    }
    if(status==='planlandi' && (r.meta?.changes||0)>0){
      const teslim=await env.DB.prepare('SELECT durum FROM metricool_gonderim WHERE post_id=?').bind(id).first().catch(()=>null);
      if(teslim?.durum==='hata') await env.DB.prepare('DELETE FROM metricool_gonderim WHERE post_id=?').bind(id).run().catch(()=>{});
      if(ctx?.waitUntil){
        ctx.waitUntil(
          processMetricoolQueue(env,10)
            .then(x=>console.log('[btmedya] immediate Metricool handoff',JSON.stringify(x)))
            .catch(e=>console.error('[btmedya] immediate Metricool handoff:',e?.message||e))
        );
      }
    }
    return json({ok:true,changed:(r.meta?.changes||0)>0});
  }
  if(byId && request.method==='DELETE'){
    const id=decodeURIComponent(byId[1]);
    await sosyalTekillemeSil(env,id).catch(()=>{});
    const r=await env.DB.prepare('DELETE FROM social_posts WHERE id=?').bind(id).run();
    if(!(r.meta?.changes)) return json({ok:false,error:'Bulunamadı'},404);
    return json({ok:true});
  }
  return json({ok:false,error:'Method not allowed'},405,{'allow':'GET,POST,PATCH,DELETE'});
}



/* ---------- Medya Kasası API ---------- */
async function mediaApi(request, env){
  const u=new URL(request.url); const path=u.pathname;
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,PUT,OPTIONS','access-control-allow-headers':'Content-Type, Authorization'}});

  const sess=oturumAnahtari(env);
  const mediaSec=env.MEDIA_SIGNING_SECRET;

  if(path==='/api/login' && request.method==='POST'){
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    const rate=await checkRateLimit(env,ip);
    if(!rate.allowed) return json({error:'Çok fazla başarısız deneme. 15 dakika bekleyin.'},429,{'Retry-After':String(RATE_LIMIT_WINDOW_S)});
    const body=await request.json().catch(()=>({}));
    /* Kullanici adi buyuk/kucuk harfe duyarsiz. Telefonda "btmedya" yazilinca
       klavye ilk harfi buyutup "Btmedya" yapiyor; eslesme kati oldugu icin
       dogru sifreyle bile giris reddediliyordu ve panel "Sifre hatali"
       diyordu. Kullanici adi sir degil, markanin adi; guvenligi sifre tasir.
       tr-TR: iki taraf da ayni kurala gore buyutulsun (i/İ, ı/I). */
    const buyut=s=>String(s||'').trim().toLocaleUpperCase('tr-TR');
    const username=buyut(body.username);
    const expectedUsername=buyut(env.ADMIN_USERNAME||'BTMEDYA');
    /* 6 Ekim: ADMIN_USERNAME e-posta adresine cevrildi ama giris formu
       "BTMEDYA" adiyla dolu geliyor; dogru sifre bile "hatali" diye
       reddediliyordu. Marka adi her zaman gecerli bir kullanici adidir:
       ad sir degil (yukaridaki not), guvenligi sifre ve deneme siniri tasir. */
    const usernameOk=username===expectedUsername || username===buyut('BTMEDYA');
    const primaryPassword=env.ADMIN_PASSWORD_SECRET || env.ADMIN_PASSWORD;
    const primaryOk=!!primaryPassword && body.password===primaryPassword;
    const recoveryOk=recoveryPasswordValid(body.password,env.ADMIN_RECOVERY_SECRET);
    if(!usernameOk || !sess || (!primaryOk && !recoveryOk))
      return json({error:'Geçersiz kimlik bilgisi',remaining:rate.remaining},401);
    await clearRateLimit(env,ip);
    const token=await sessionToken(sess);
    return json({ok:true},200,{'set-cookie':`bt_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Priority=High`});
  }
  if(path==='/api/logout') return new Response(null,{status:204,headers:{'cache-control':'no-store','clear-site-data':'"cookies", "storage"','set-cookie':'bt_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Priority=High'}});

  if(path==='/api/refresh' && request.method==='POST'){
    if(!await validSession(request,sess)) return json({ok:false,error:'Geçersiz veya süresi dolmuş oturum'},401);
    const token=await sessionToken(sess);
    return json({ok:true},200,{'set-cookie':`bt_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Priority=High`});
  }


  /* Anasayfa panelden atanan dosyalari buradan okur. Yalnizca panel
     atamalari doner; atama yoksa bos nesne, sayfa kendi varsayilanlarini
     kullanir. gercek alani sahnedeki AI URETIMI / GERCEK CEKIM rozetini
     belirler: etiket elle yazilmaz, dosyanin kendi kaydindan turer. */
  if(path==='/api/public/slots' && request.method==='GET'){
    return json({ok:true,yuvalar:await panelYuvaAtamalari(env)},200,{'cache-control':'public, max-age=60'});
  }

  if(path==='/api/public/media' && request.method==='GET') {
    const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'Content-Type, Authorization'};
    const q=(u.searchParams.get('q')||'').toLowerCase(); const cat=u.searchParams.get('category')||'';
    const staticItems=(await medyaListesi(env,u.origin))
      .filter(x=>!cat || x.category===cat)
      .filter(x=>!q || x.path.toLowerCase().includes(q))
      .map((x,i)=>({id:x.id,key:'static/'+x.path,original_name:x.path.split('/').pop(),mime:/\.(mp4|webm)$/i.test(x.path)?'video/'+(x.path.endsWith('.webm')?'webm':'mp4'):'image/webp',size:0,category:x.category,tags:['BTMEDYA',x.gercek?'gercek':'ai-uretimi','arsiv'],title:x.baslik||x.path.split('/').pop().replace(/\.[^.]+$/,'').replace(/[-_]+/g,' '),description:x.gercek?'BTMEDYA gerçek çekim arşiv medyası':'BTMEDYA AI üretimi arşiv medyası',alt_text:x.gercek?'BTMEDYA gerçek çekim arşiv medyası':'BTMEDYA AI üretimi arşiv medyası',slot:x.category==='hero'?'hero':x.category==='video'?'medya':x.category==='portfoy'?'portfoy':'haber',sort_order:i,created_at:null,updated_at:null,url:'/assets/'+x.path,source:'github-static',ai_generated:!x.gercek,vitrin:x.vitrin!==false,sira:x.sira,poster:x.poster?'/assets/'+x.poster:null}));
    let r2Items=[];
    let d1MediaError=null;
    if(env.DB && env.MEDIA && mediaSec){
      try{
        let sql='SELECT id,key,original_name,mime,size,category,tags,title,description,alt_text,slot,sort_order,created_at,updated_at FROM media WHERE published=1'; const args=[];
        if(q){sql+=' AND (original_name LIKE ? OR title LIKE ? OR description LIKE ? OR tags LIKE ?)'; const x='%'+q+'%'; args.push(x,x,x,x);}
        if(cat){sql+=' AND category=?'; args.push(cat);} sql+=' ORDER BY created_at DESC LIMIT 200';
        const r=await env.DB.prepare(sql).bind(...args).all();
        r2Items=await Promise.all((r.results||[]).map(async x=>({...x,tags:JSON.parse(x.tags||'[]'),url:await signedMediaUrl(request,x.key,mediaSec,Number(env.MEDIA_PUBLIC_TTL||3600)),source:'r2',ai_generated:!!x.ai_generated})));
      }catch(e){
        d1MediaError=String(e?.message||e);
        console.error('[public-media] D1 metadata okunamadı; R2/static katmanı kullanılacak:',d1MediaError);
      }
    }
    // D1 metadata eksik olsa bile gerçek production R2 nesnelerini görünür tut.
    // Bu katman salt-okurdur; R2'ye yazmaz, taşımaz veya silmez.
    if(mediaSec && env.MEDIA){
      try{
        const direct=await listR2Media(env.MEDIA,'r2-direct',{q,cat});
        const known=new Set(r2Items.map(x=>x.key));
        for(const x of direct){
          if(known.has(x.key)) continue;
          x.url=await signedMediaUrl(request,x.key,mediaSec,Number(env.MEDIA_PUBLIC_TTL||3600));
          r2Items.push(x);
        }
      }catch(e){
        console.error('[public-media] R2 direct liste okunamadı:',e?.message||e);
      }
    }
    const seen=new Set(r2Items.map(x=>x.url));
    const items=[...r2Items,...staticItems.filter(x=>!seen.has(x.url))];
    return json({
      brand:'BTMedya',
      generated_at:new Date().toISOString(),
      source:r2Items.length?'r2+github-static':'github-static',
      items,
      degraded:Boolean(d1MediaError),
      ...(d1MediaError?{warning:'D1 medya metadata katmanı okunamadı; statik/R2 yayın katmanı kullanıldı.'}:{})
    },200,cors);
  }

  const aiToken=env.AI_READ_TOKEN;
  const bearer=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  const aiRead=(aiToken && bearer===aiToken);
  const auth=aiRead || await validSession(request,oturumAnahtari(env));
  if(!auth) return json({error:'Yetkisiz'},401);

  /* DEPO PLANI — her dosyanin teknik ozelligi, onerilen hedefler, secilen
     hedefler ve kalici public baglantisi tek listede. Sohbetten okunup
     Metricool'a gonderim buradan planlanir. */
  /* SITE DURUMU — hangi yuva dolu, hangisi bos, ne yuklenmeli. */
  if(path==='/api/site/slots' && request.method==='GET'){
    const r=await env.DB.prepare("SELECT * FROM media WHERE slot!='' ").all();
    const bySlot={}; for(const x of (r.results||[])) bySlot[x.slot]=x;
    const liste=await medyaListesi(env,u.origin);
    const kayit=Object.fromEntries(liste.map(x=>[x.path,x]));
    /* kaynak: panel = panelden atanmis, site = sitenin varsayilan dosyasi,
       yok = sitede bu yerde hicbir sey yok. Once yalnizca panel
       atamalarina bakiliyordu ve dolu site "0 dolu" gorunuyordu. */
    const yuvalar=SITE_SLOTS.map(([slug,bolum,tur,oran,olcu,not])=>{
      const m=bySlot[slug], vars=SITE_SLOT_VARSAYILAN[slug], vk=vars&&kayit[vars];
      let kaynak='yok', dosya=null;
      if(m){
        kaynak='panel';
        dosya={id:m.id,ad:m.title||m.original_name,olcu:(m.width&&m.height)?`${m.width}x${m.height}`:'',
               enBoy:m.aspect,saniye:m.duration_s,yapayZeka:!!m.ai_generated,
               url:m.published?medyaAdresi(m.key):null};
      }else if(vars){
        kaynak='site';
        dosya={id:null,ad:(vk&&vk.baslik)||vars.split('/').pop(),yapayZeka:!(vk&&vk.gercek),url:/^https?:\/\//.test(vars)?vars:'/assets/'+vars};
      }
      return {slug,bolum,tur,oran,onerilenOlcu:olcu,not,dolu:!!dosya,kaynak,dosya};
    });
    // Kasa bos oldugunda da secilebilsin diye sitenin kendi arsivi.
    // Haber kapaklari basligi ustune basili kompozisyonlar; yuvaya uymaz.
    const statikSecenekler=liste
      .filter(x=>!x.path.startsWith('haber-kapak/') && !/\.webm$/i.test(x.path))
      .map(x=>({yol:x.path,ad:x.baslik||x.path.split('/').pop(),
        tur:/\.(mp4|mov|m4v)$/i.test(x.path)?'video':'image',gercek:!!x.gercek}));
    const say=k=>yuvalar.filter(y=>y.kaynak===k).length;
    return json({ozet:{toplam:yuvalar.length,dolu:yuvalar.filter(y=>y.dolu).length,
      panelden:say('panel'),sitede:say('site'),eksik:say('yok')},yuvalar,statikSecenekler});
  }

  /* Yuvaya dosya ata / atamayi kaldir.
     Kasadaki bir kayit ({id}) ya da sitenin kendi arsivinden bir dosya
     ({statik}) atanabilir. Kasa R2 esitlemesi calismadigi icin bos kalinca
     panel hicbir sey atayamiyordu; statik dosya icin kasaya static/ onekli
     bir kayit acilir, R2'ye bir sey yazilmaz. Yuva basina tek dosya: once
     o yuvayi tutan kayit bosaltilir, ikisi tek batch'te. */
  const yuvaYol=path.match(/^\/api\/site\/slots\/([a-z0-9-]+)$/);
  if(yuvaYol && (request.method==='PUT'||request.method==='DELETE')){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const slug=yuvaYol[1], tanim=SITE_SLOTS.find(s=>s[0]===slug);
    if(!tanim) return json({ok:false,error:'Böyle bir yuva yok'},404);
    const bosalt=env.DB.prepare("UPDATE media SET slot='' WHERE slot=?").bind(slug);
    if(request.method==='DELETE'){
      await bosalt.run(); yuvaOnbellek.t=0;
      return json({ok:true});
    }
    const body=await request.json().catch(()=>({}));
    const now=new Date().toISOString();
    const turUyar=video=>(tanim[2]==='video')!==video
      ? json({ok:false,error:tanim[2]==='video'?'Bu yuva video bekliyor.':'Bu yuva görsel bekliyor.'},400) : null;
    if(body.statik){
      const liste=await medyaListesi(env,u.origin);
      const x=liste.find(i=>i.path===String(body.statik) && !i.path.startsWith('haber-kapak/'));
      if(!x) return json({ok:false,error:'Bu dosya sitenin arşivinde yok.'},400);
      const hata=turUyar(/\.(mp4|webm|mov|m4v)$/i.test(x.path)); if(hata) return hata;
      await env.DB.batch([
        bosalt,
        env.DB.prepare(`INSERT INTO media(id,key,original_name,mime,category,title,published,slot,ai_generated,created_at,updated_at)
          VALUES(?,?,?,?,?,?,1,?,?,?,?)
          ON CONFLICT(key) DO UPDATE SET slot=excluded.slot,published=1,ai_generated=excluded.ai_generated,updated_at=excluded.updated_at`)
          .bind(crypto.randomUUID(),STATIK_ONEK+x.path,x.path.split('/').pop(),uzantiMime(x.path),
                x.category||'arsiv',x.baslik||'',slug,x.gercek?0:1,now,now),
      ]);
      yuvaOnbellek.t=0;
      return json({ok:true,kaynak:'statik'});
    }
    if(body.id){
      const row=await env.DB.prepare('SELECT id,mime FROM media WHERE id=?').bind(String(body.id)).first();
      if(!row) return json({ok:false,error:'Dosya kasada bulunamadı.'},404);
      const hata=turUyar(String(row.mime||'').startsWith('video/')); if(hata) return hata;
      await env.DB.batch([bosalt, env.DB.prepare('UPDATE media SET slot=?,published=1,updated_at=? WHERE id=?').bind(slug,now,row.id)]);
      yuvaOnbellek.t=0;
      return json({ok:true,kaynak:'kasa'});
    }
    return json({ok:false,error:'Bir dosya seçin.'},400);
  }

  /* VIDEO KUTUPHANESI — tek anahtar noktasi.
     own_youtube_id doldugu anda site o video icin kendi kanalimiza yonlenir;
     haber kayitlarina dokunmaya gerek kalmaz. */
  if(path==='/api/videos' && request.method==='GET'){
    const r=await env.DB.prepare('SELECT * FROM video_library ORDER BY news_slug!="" DESC, title').all();
    const items=(r.results||[]).map(v=>({
      ...v,
      etkinKimlik: v.own_youtube_id || v.youtube_id,
      etkinKanal:  v.own_youtube_id ? 'BTMEDYA' : (v.source_channel||''),
      kendiKanalda: !!v.own_youtube_id,
      izle: `https://www.youtube.com/watch?v=${v.own_youtube_id||v.youtube_id}`,
      kapak: `https://i.ytimg.com/vi/${v.own_youtube_id||v.youtube_id}/hqdefault.jpg`
    }));
    return json({ozet:{toplam:items.length,kendiKanalda:items.filter(i=>i.kendiKanalda).length,
                       haberliOlmayan:items.filter(i=>!i.news_slug).length},items});
  }
  const vput=path.match(/^\/api\/videos\/([^/]+)$/);
  if(vput && request.method==='PATCH'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const id=vput[1], b=await request.json(), now=new Date().toISOString();
    const cur=await env.DB.prepare('SELECT * FROM video_library WHERE id=?').bind(id).first();
    if(!cur) return json({error:'Bulunamadı'},404);
    // Kendi kanal baglantisi her bicimde girilebilir; kimlik cozumlenir.
    let own=String(b.own_youtube_id ?? cur.own_youtube_id ?? '').trim();
    if(own){
      const m=own.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})|^([A-Za-z0-9_-]{11})$/);
      if(!m) return json({error:'Geçerli bir YouTube bağlantısı değil'},400);
      own=m[1]||m[2];
    }
    const pick=(k,d)=>b[k]===undefined?d:b[k];
    await env.DB.prepare('UPDATE video_library SET own_youtube_id=?,title=?,news_slug=?,note=?,updated_at=? WHERE id=?')
      .bind(own,pick('title',cur.title),pick('news_slug',cur.news_slug),pick('note',cur.note),now,id).run();
    return json({ok:true,etkinKimlik:own||cur.youtube_id,etkinKanal:own?'BTMEDYA':cur.source_channel});
  }

  if(path==='/api/vault/plan' && request.method==='GET'){
    const origin=new URL(request.url).origin;
    const r=await env.DB.prepare('SELECT * FROM media ORDER BY created_at DESC LIMIT 300').all();
    const items=(r.results||[]).map(x=>{
      const plan=routePlan(x);
      const routed=JSON.parse(x.routed||'[]');
      return {
        id:x.id, ad:x.title||x.original_name, tur:x.mime, mb:+(x.size/1048576).toFixed(2),
        olcu:(x.width&&x.height)?`${x.width}x${x.height}`:'', enBoy:x.aspect||plan.aspect,
        saniye:x.duration_s||0, sesVar:!!x.has_audio, yapayZeka:!!x.ai_generated,
        kategori:x.category, yayinda:!!x.published, youtube:x.youtube_id||'',
        onerilen:JSON.parse(x.suggested||'[]'),
        secilen:routed,
        hedef:routed.length?routed:JSON.parse(x.suggested||'[]'),
        uygunsuz:plan.uygunsuz, siteUyarisi:plan.siteUyarisi,
        gonderildi:JSON.parse(x.posted||'[]'),
        publicUrl:x.published?`${origin}/pub/${encodeURIComponent(x.key)}`:null
      };
    });
    const bekleyen=items.filter(i=>!i.gonderildi.length && i.hedef.length);
    return json({
      kurallar:PLATFORM_RULES.map(([slug,label,kind,aspects,maxS])=>({slug,label,tur:kind,enBoy:aspects,maxSaniye:maxS})),
      ozet:{toplam:items.length,yayinda:items.filter(i=>i.yayinda).length,gonderimBekleyen:bekleyen.length},
      items
    });
  }

  if(path==='/api/media' && request.method==='GET'){
    const q=u.searchParams.get('q')||''; const cat=u.searchParams.get('category')||''; const pub=u.searchParams.get('published');
    let sql='SELECT * FROM media WHERE 1=1'; const args=[];
    if(q){sql+=' AND (original_name LIKE ? OR title LIKE ? OR description LIKE ? OR tags LIKE ?)'; const x=`%${q}%`; args.push(x,x,x,x);}
    if(cat){sql+=' AND category=?';args.push(cat);} if(pub!==null){sql+=' AND published=?';args.push(pub==='1'?1:0);} sql+=' ORDER BY created_at DESC LIMIT 500';
    const r=await env.DB.prepare(sql).bind(...args).all();
    // static/ kayitlarin R2 nesnesi yok; imzali R2 adresi 404 olurdu.
    const items=await Promise.all((r.results||[]).map(async x=>({...x,tags:JSON.parse(x.tags||'[]'),
      url:String(x.key).startsWith(STATIK_ONEK)?medyaAdresi(x.key):await signedMediaUrl(request,x.key,mediaSec,Number(env.MEDIA_PUBLIC_TTL||86400))})));
    return json({items});
  }
  if(path==='/api/media' && request.method==='POST'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const body=await request.json();
    const mime = ALLOWED_MIME.has(body.mime) ? body.mime : 'application/octet-stream';
    const id=crypto.randomUUID(); const now=new Date().toISOString();
    const key=`${body.category||'arsiv'}/${id}-${safeKey(body.original_name||('media.'+extFromMime(mime)))}`;
    // Olculer tarayicida okundu; yonlendirme onerisi burada hesaplanir.
    const plan=routePlan({mime,width:body.width,height:body.height,duration_s:body.duration_s,has_audio:body.has_audio});
    await env.DB.prepare('INSERT INTO media (id,key,original_name,mime,size,category,tags,title,description,alt_text,published,slot,sort_order,created_at,updated_at,width,height,duration_s,has_audio,aspect,suggested,routed,posted,youtube_id,ai_generated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id,key,body.original_name||key,mime,Number(body.size||0),body.category||'arsiv',JSON.stringify(body.tags||[]),body.title||'',body.description||'',body.alt_text||'',body.published?1:0,body.slot||'',Number(body.sort_order||0),now,now,
            Number(body.width||0),Number(body.height||0),Number(body.duration_s||0),body.has_audio?1:0,
            plan.aspect,JSON.stringify(plan.uygun),JSON.stringify(body.routed||[]),'[]',String(body.youtube_id||''),body.ai_generated?1:0).run();
    const m=await env.MEDIA.createMultipartUpload(key,{httpMetadata:{contentType:mime}});
    return json({id,key,uploadId:m.uploadId,plan});
  }
  const mp=path.match(/^\/api\/upload\/([^/]+)\/part$/);
  if(mp && request.method==='PUT'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const key=decodeURIComponent(mp[1]); const uploadId=u.searchParams.get('uploadId'); const partNumber=Number(u.searchParams.get('partNumber')); if(!uploadId||!partNumber||!request.body)return json({error:'Eksik multipart parametresi'},400);
    const up=env.MEDIA.resumeMultipartUpload(key,uploadId); const p=await up.uploadPart(partNumber,request.body); return json(p);
  }
  const comp=path.match(/^\/api\/upload\/([^/]+)\/complete$/);
  if(comp && request.method==='POST'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const key=decodeURIComponent(comp[1]); const uploadId=u.searchParams.get('uploadId'); const body=await request.json(); const up=env.MEDIA.resumeMultipartUpload(key,uploadId); const obj=await up.complete(body.parts||[]); return json({ok:true,etag:obj.httpEtag});
  }
  const del=path.match(/^\/api\/media\/([^/]+)$/);
  if(del && request.method==='DELETE'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const id=del[1]; const row=await env.DB.prepare('SELECT key FROM media WHERE id=?').bind(id).first(); if(!row)return json({error:'Bulunamadı'},404);
    // static/ kaydi yalnizca bir isaret; dosya depoda durur, R2'de silinecek bir sey yok.
    if(!String(row.key).startsWith(STATIK_ONEK)) await env.MEDIA.delete(row.key);
    await env.DB.prepare('DELETE FROM media WHERE id=?').bind(id).run(); yuvaOnbellek.t=0; return json({ok:true});
  }
  const upd=path.match(/^\/api\/media\/([^/]+)$/);
  if(upd && request.method==='PATCH'){
    if(aiRead) return json({error:'AI token salt okunur'},403);
    const id=upd[1], body=await request.json(), now=new Date().toISOString();
    const cur=await env.DB.prepare('SELECT * FROM media WHERE id=?').bind(id).first();
    if(!cur) return json({error:'Bulunamadı'},404);
    // Gonderilmeyen alan mevcut degerini korur: kismi guncelleme guvenli olsun.
    const pick=(k,d)=>body[k]===undefined?d:body[k];
    await env.DB.prepare('UPDATE media SET title=?,description=?,alt_text=?,category=?,tags=?,published=?,slot=?,sort_order=?,routed=?,posted=?,youtube_id=?,ai_generated=?,updated_at=? WHERE id=?')
      .bind(pick('title',cur.title),pick('description',cur.description),pick('alt_text',cur.alt_text),
            pick('category',cur.category),JSON.stringify(pick('tags',JSON.parse(cur.tags||'[]'))),
            pick('published',cur.published)?1:0,pick('slot',cur.slot),Number(pick('sort_order',cur.sort_order)||0),
            JSON.stringify(pick('routed',JSON.parse(cur.routed||'[]'))),
            JSON.stringify(pick('posted',JSON.parse(cur.posted||'[]'))),
            String(pick('youtube_id',cur.youtube_id)||''),pick('ai_generated',cur.ai_generated)?1:0,
            now,id).run();
    // Yuva, yayin durumu ya da AI isareti degismis olabilir; anasayfa yeni hali gorsun.
    yuvaOnbellek.t=0;
    return json({ok:true});
  }
  if(path==='/api/export' && request.method==='GET'){
    if(!auth) return json({error:'Yetkisiz'},401);
    if(!mediaSec) return json({error:'Sunucu yapılandırma hatası'},503);
    const r=await env.DB.prepare('SELECT * FROM media WHERE published=1 ORDER BY created_at DESC').all();
    const items=await Promise.all((r.results||[]).map(async x=>({...x,tags:JSON.parse(x.tags||'[]'),url:await signedMediaUrl(request,x.key,mediaSec,Number(env.MEDIA_PUBLIC_TTL||86400))})));
    return json({generated_at:new Date().toISOString(),brand:'BTMedya',items});
  }
  return null;
}


/* ===================== AKILLI DEPO: YONLENDIRME =====================
 * Yuklenen dosyanin olculeri tarayicida okunur, buraya gonderilir.
 * Asagidaki kural tablosu platformlarin yayinlanmis sinirlarina dayanir.
 * SINIRLAR DEGISIR: platform kuralini degistirdiginde yalnizca bu tabloyu
 * guncelle, gerisi kendiliginden uyum saglar.
 */
/* ===================== SITE YUVALARI =====================
 * Sitedeki her medya yerinin tek dogruluk kaynagi: ne oldugu, hangi oranda
 * ve hangi olcude olmasi gerektigi, su an neyle dolu oldugu.
 * Panel bu listeyi okuyup eksikleri kendisi gosterir; elle takip gerekmez.
 * Yeni bir yuva acilacaksa yalnizca buraya eklenir.
 */
/* 26 Eylul 2026: bes yuva (hizmet-haber, hizmet-belgesel, hizmet-tanitim,
   hizmet-dugun, siyah-oda) eski tasarimdan kalmisti; mevcut sitede yerleri
   yoktu. Panelde "Bu yere bagla" deyince hicbir sey degismiyordu. Kaldirildi.
   Kalan her yuva anasayfada gercek bir yere baglidir (bkz. data-slot).
   6 Ekim: anasayfa yalniz giris filmini oynatir; kaydirmali sahnelerin
   kategori-haber / -medya / -prod yuvalari ayni nedenle kaldirildi. */
const SITE_SLOTS=[
  // slug              bolum                       tur     oran    onerilen      notu
  ['hero-video',      'Giriş filmi',              'video','16:9','1920x1080','Anasayfanın ilk sahnesi. En fazla 30 sn.'],
  ['hero-poster',     'Giriş kapak karesi',       'image','16:9','1920x1080','Film inmeden önce görünen kare.'],
  ['portre-buse',     'Buse Tuncay portresi',     'image','4:5', '1200x1500','Kuruluş hikâyesi bölümü. Gerçek fotoğraf.'],
  ['og-image',        'Sosyal paylaşım görseli',  'image','16:9','1200x630', 'Anasayfa WhatsApp, X ve Facebook paylaşım kapağı.'],
];

/* Panelden atama yapilmamis yuvada sitenin su an kullandigi dosya. Panel
   "13 yer, 0 dolu" diyordu; oysa site doluydu, yalnizca bu dosyalari
   bilmiyordu. Bu yollar public/index.html ile ayni kalmali;
   tools/gerileme-denetimi.mjs bunu denetler. Kaynak (gercek/AI) burada
   yazmaz, medya-listesi.json'daki gercek alanindan turer. */
const SITE_SLOT_VARSAYILAN={
  'hero-video':     'https://cdn.jsdelivr.net/gh/BTmedyajans/Btmedya-db@f46098aa43e8fdc27970d1e4a9220312d0ae0814/tools/giris-kaynak/saha-gece.mp4',
  'hero-poster':    'media/portfoy/buse-tuncay-saha-roportaj.webp',
  'portre-buse':    'media/portfoy/buse-tuncay-portre-01.webp',
  'og-image':       'paylasim/btmedya-og-v2.jpg',
};

/* Kasa kaydinin sitede nereden servis edildigi. static/ onekli kayitlar
   depodaki public/assets dosyalarina isaret eder; R2'de nesneleri yoktur. */
const STATIK_ONEK='static/';
function medyaAdresi(key){
  const k=String(key||'');
  return k.startsWith(STATIK_ONEK) ? '/assets/'+k.slice(STATIK_ONEK.length) : '/pub/'+encodeURIComponent(k);
}
function uzantiMime(yol){
  const e=(String(yol).match(/\.([a-z0-9]+)$/i)||[])[1]?.toLowerCase();
  return {mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/mp4',
    webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'}[e]||'application/octet-stream';
}

/* Uretilmis kapak onceligi. Sabah Masasi yeni haberi kategori plakasiyla
   yayinlar; haberin kendi kapagi (tools/haber-kapagi.py) sonradan uretilip
   haber-kapak-kaynagi.json'a girer. D1'deki cover_url elle guncellenene kadar
   site plakayi gosteriyordu (5 Ekim: 16 haber). Kayit yalniz bos ya da plaka
   ise ve uretilmis kapak varsa degisir; panelden secilmis baska bir gorsel
   (R2, otomasyon karesi) oldugu gibi kalir. Veri degismez, yalniz gosterim. */
let kapakOnbellek={t:0,v:null};
async function uretilmisKapaklar(env){
  if(kapakOnbellek.v && Date.now()-kapakOnbellek.t<300000) return kapakOnbellek.v;
  // Map: slug -> kapak karesinin turu (gercek/arsiv/temsili...). kapakSec
  // yalniz .has kullanir; ilgili haber kartlari turu etiket olarak basar.
  let v=new Map();
  try{
    const r=env.ASSETS && await env.ASSETS.fetch(new Request('https://btmedya.internal/data/haber-kapak-kaynagi.json'));
    if(r && r.ok) v=new Map(Object.entries(await r.json()));
  }catch{}
  kapakOnbellek={t:Date.now(),v};
  return v;
}
const PLAKA_KAPAK=/^\/assets\/(?:kategori-kapak|paylasim)\/[^/]+$/;
function kapakSec(n,kapaklar){
  const c=String(n.cover_url||'');
  return (!c || PLAKA_KAPAK.test(c)) && kapaklar.has(n.slug) ? '/assets/haber-kapak/'+encodeURIComponent(n.slug)+'.webp' : n.cover_url;
}

/* Panelden atanmis yuvalar. Anasayfa her acilista soruyor; D1'e her
   ziyaretci icin gitmemek icin isolate icinde 60 sn tutulur. Atama
   yapilinca ayni isolate'te hemen sifirlanir. */
let yuvaOnbellek={t:0,v:null};
async function panelYuvaAtamalari(env){
  if(yuvaOnbellek.v && Date.now()-yuvaOnbellek.t<60000) return yuvaOnbellek.v;
  const gecerli=new Set(SITE_SLOTS.map(s=>s[0]));
  const v={};
  if(env.DB){
    const r=await env.DB.prepare("SELECT key,slot,mime,ai_generated FROM media WHERE slot!='' AND published=1").all().catch(()=>({results:[]}));
    for(const x of (r.results||[])) if(gecerli.has(x.slot)){
      v[x.slot]={url:medyaAdresi(x.key),gercek:!x.ai_generated,tur:String(x.mime||'').startsWith('video/')?'video':'image'};
    }
  }
  yuvaOnbellek={t:Date.now(),v};
  return v;
}

const PLATFORM_RULES=[
  // slug              etiket                 kind    en-boy        max sn   ses
  ['instagram-reel',  'Instagram Reels',     'video', ['9:16'],      180,  true ],
  ['instagram-story', 'Instagram Hikaye',    'both',  ['9:16'],       60,  false],
  ['instagram-post',  'Instagram Gonderi',   'both',  ['1:1','4:5'],  60,  false],
  ['tiktok',          'TikTok',              'video', ['9:16'],      600,  true ],
  ['youtube-short',   'YouTube Shorts',      'video', ['9:16'],      180,  true ],
  ['youtube',         'YouTube video',       'video', ['16:9','9:16',
                                                       '1:1','4:5',
                                                       'diger'],   86400,  true ],
  ['facebook-reel',   'Facebook Reels',      'video', ['9:16'],       90,  true ],
  ['site-showreel',   'Site / showreel',     'video', ['16:9'],       30,  false],
  ['site-gorsel',     'Site / gorsel',       'image', ['16:9','1:1',
                                                       '4:5','diger'],  0,  false],
];

function aspectOf(w,h){
  if(!w||!h) return 'diger';
  const r=w/h;
  if(Math.abs(r-9/16) < 0.06) return '9:16';
  if(Math.abs(r-16/9) < 0.10) return '16:9';
  if(Math.abs(r-1)    < 0.05) return '1:1';
  if(Math.abs(r-4/5)  < 0.05) return '4:5';
  return 'diger';
}

/* Dosyanin gidebilecegi platformlari ve gidemedigi platformun nedenini dondurur. */
function routePlan({mime='',width=0,height=0,duration_s=0,has_audio=0}){
  const isVideo=String(mime).startsWith('video/');
  const isImage=String(mime).startsWith('image/');
  const aspect=aspectOf(Number(width),Number(height));
  const dur=Number(duration_s)||0;
  const uygun=[], uygunsuz=[];
  for(const [slug,label,kind,aspects,maxS] of PLATFORM_RULES){
    if(kind==='video' && !isVideo){ continue; }
    if(kind==='image' && !isImage){ continue; }
    if(kind==='both'  && !isVideo && !isImage){ continue; }
    // Instagram gonderisi sabit oran degil, bir bant kabul eder (4:5 ile 1.91:1).
    // Gercek fotograf makinesi kareleri (3:2, 4:3) bu banda girer; sabit oran
    // listesiyle elenmeleri yanlis olurdu.
    const oran=(Number(width)&&Number(height))?Number(width)/Number(height):0;
    const bantta = slug==='instagram-post' && isImage && oran>=0.8 && oran<=1.91;
    if(!bantta && !aspects.includes(aspect)){ uygunsuz.push({slug,label,neden:`en-boy ${aspect||'bilinmiyor'} uymuyor`}); continue; }
    if(isVideo && maxS>0 && dur>maxS){ uygunsuz.push({slug,label,neden:`${Math.round(dur)} sn > ${maxS} sn sinir`}); continue; }
    uygun.push(slug);
  }
  // Siteye agir video koymamak icin acik kural.
  const siteUyarisi = (isVideo && dur>180)
    ? 'Uzun video: siteye yukleme. YouTube\'a yukle, sitede yalnizca kapak + baglanti goster.'
    : (isVideo && dur>30 ? 'Site icin uzun sayilir; showreel yerine gomulu baglanti tercih et.' : '');
  return {aspect,uygun,uygunsuz,siteUyarisi};
}

/* Yayindaki yeni haberlerden sosyal gonderi hazirlar.
   Gorsel: haberin 4:5 JPEG sosyal karti (Instagram webp kabul etmez);
   kart yoksa kapak. Metin: baslik + spot + haber adresi + kunye + etiket.
   Otomatik planlama panelden acilir ve yalniz Metricool anahtari varken
   ve haber taze ise calisir; aksi halde gonderi "onayda" bekler. */
function sosyalPlatformlariMedyaIleUyumla(platformlar, mediaKey){
  const isVideo=/\.(mp4|mov|m4v|webm)(?:$|\?)/i.test(String(mediaKey||''));
  return [...new Set((Array.isArray(platformlar)?platformlar:[]).map(String).map(p=>{
    if(p==='instagram-post' && isVideo) return 'instagram-reel';
    return p;
  }).filter(p=>{
    // Metricool YouTube only accepts video uploads; image-only news cards stay on TikTok/other image-capable networks.
    if((p==='youtube'||p==='youtube-short') && !isVideo) return false;
    return true;
  }))];
}

async function autoPrepareSocialDrafts(env, limit=3){
  const result={enabled:Boolean(env.DB),created:0,planned:0,skipped:0,items:[]};
  if(!env.DB) return result;
  try{
    const ayar=await ayarlariOku(env);
    const rows=(await env.DB.prepare(
      `SELECT n.id,n.slug,n.title,n.excerpt,n.category,n.cover_url,n.published_at
         FROM news n
        WHERE n.status='published' AND n.slug<>''
        ORDER BY COALESCE(n.published_at,n.updated_at) DESC LIMIT 20`
    ).all()).results||[];
    const take=Math.max(1,Math.min(3,Number(limit)||3));
    let made=0;
    for(const n of rows){
      if(made>=take) break;
      const exists=await env.DB.prepare("SELECT id FROM social_posts WHERE source_slug=? LIMIT 1").bind(String(n.slug)).first().catch(()=>null);
      if(exists){ result.skipped++; continue; }
      const kart=`/assets/sosyal-kart/${n.slug}.jpg`;
      const cover=String(n.cover_url||'');
      // Sabah Masası kapakları: R2'deki lisanslı fotoğraf ya da kategori
      // grafiğinin 4:5 JPEG karşılığı (webp Instagram'da reddedilir).
      const katKapak=cover.match(/^\/assets\/kategori-kapak\/([a-z]+)\.webp$/);
      const mediaKey=(await varlikVar(env,kart)) ? 'static/sosyal-kart/'+n.slug+'.jpg'
        : cover.startsWith('/gorsel/otomasyon/') ? cover.slice('/gorsel/'.length)
        : katKapak ? `static/kategori-kapak/${katKapak[1]}-sosyal.jpg`
        : cover.startsWith('/assets/') ? 'static/'+cover.slice('/assets/'.length) : '';
      const body=altyazi(n,await kapakKunyesi(env,n.slug));
      const platformlar=sosyalPlatformlariMedyaIleUyumla(platformSluglari(ayar),mediaKey);
      const yas=(Date.now()-new Date(n.published_at||0).getTime())/3600000;
      const otomatik=ayar.otomatikPlanla && Boolean(env.METRICOOL_USER_TOKEN) && platformlar.length>0 && yas>=0 && yas<=ayar.tazelikSaat;
      const yuva=otomatik ? await sonrakiYuva(env,ayar) : null;
      const status=yuva ? 'planlandi' : 'onayda';
      const now=new Date().toISOString();
      const id=crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO social_posts (id,title,body,platforms,format,media_key,source_slug,status,scheduled_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(id,String(n.title||'BTMEDYA').slice(0,180),body,JSON.stringify(platformlar),'4:5',mediaKey,String(n.slug),status,yuva,now,now).run();
      made++; result.created++; if(yuva) result.planned++;
      result.items.push({id,slug:n.slug,status,scheduled_at:yuva});
    }
  }catch(e){
    result.error=String(e?.message||e).slice(0,300);
  }
  return result;
}

async function hydrateR2FromManifest(env, limit=3){
  const result={enabled:Boolean(env.MEDIA&&env.ASSETS),processed:0,copied:0,skipped:0,failed:0,items:[]};
  if(!result.enabled) return result;
  let manifest;
  try{
    const res=await env.ASSETS.fetch(new Request('https://btmedya.internal/data/medya-listesi.json'));
    if(!res.ok) return {...result,failed:1,items:[{error:'medya-listesi.json okunamadı'}]};
    manifest=await res.json();
  }catch(e){
    return {...result,failed:1,items:[{error:String(e?.message||e).slice(0,240)}]};
  }
  const items=(Array.isArray(manifest)?manifest:[])
    .filter(x=>x&&x.path&&typeof x.path==='string'&&!x.path.startsWith('static/'));
  if(!items.length) return result;
  let index=Number(await env.KV?.get('automation:r2-hydrate:index').catch(()=>null) || 0);
  if(!Number.isFinite(index)||index<0||index>=items.length) index=0;
  const mime=(key)=>{
    const ext=key.toLowerCase().split('.').pop();
    return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/x-m4v',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4'})[ext]||'application/octet-stream';
  };
  const n=Math.max(1,Math.min(3,Number(limit)||3));
  for(let i=0;i<n;i++){
    const row=items[(index+i)%items.length];
    const key=String(row.path).replace(/^\/+/,"");
    result.processed++;
    const exists=await env.MEDIA.head(key).catch(()=>null);
    if(exists){ result.skipped++; result.items.push({key,status:'exists'}); continue; }
    try{
      const asset=await env.ASSETS.fetch(new Request('https://btmedya.internal/'+key));
      if(!asset.ok){ result.failed++; result.items.push({key,status:'asset-'+asset.status}); continue; }
      await env.MEDIA.put(key,asset.body,{httpMetadata:{contentType:mime(key),cacheControl:'public, max-age=31536000'}});
      result.copied++;
      result.items.push({key,status:'copied'});
    }catch(e){
      result.failed++;
      result.items.push({key,status:'error',error:String(e?.message||e).slice(0,240)});
    }
  }
  const next=(index+n)%items.length;
  if(env.KV) await env.KV.put('automation:r2-hydrate:index',String(next),{expirationTtl:604800}).catch(()=>{});
  return result;
}

/* production-reconcile: keep GitHub main as the sole Cloudflare Workers Builds source of truth. */
export default { async scheduled(controller, env, ctx){
  const cron=String(controller?.cron||"");
  const scheduledRaw=Number(controller?.scheduledTime||0);
  const scheduledAt=new Date(scheduledRaw>1e12?scheduledRaw:(scheduledRaw?scheduledRaw*1000:Date.now()));
  const minute=scheduledAt.getUTCMinutes();

  // One workload per cron event. Heavy news/AI/health jobs no longer fan out
  // concurrently from a single 10 ms CPU invocation.
  if(cron==="0 5 * * *"){
    await ensureContentTaxonomy(env).catch(e=>console.error("[taxonomy] bootstrap:",e?.message||e));
    const results=await Promise.allSettled([
      sabahMasasi(env).then(r=>console.log("[btmedya] sabah masasi",r.yayinlanan,"yayinda",r.taslak,"taslak",r.hatalar.length,"hata")),
      satisOzeti(env).then(r=>console.log("[btmedya] satis ozeti",JSON.stringify(r)))
    ]);
    for(const r of results) if(r.status==="rejected") console.error("[btmedya] daily job:",r.reason?.message||r.reason);
    return;
  }

  if(cron==="2-59/5 * * * *"){
    // Alternate queue providers instead of making both external deliveries
    // in the same invocation. The heartbeat is kept with this lightweight lane.
    const queue=minute%10===2
      ? processMetricoolQueue(env,5).then(x=>console.log("[btmedya] Metricool handoff",JSON.stringify({enabled:x.enabled,processed:x.processed,scheduled:x.scheduled,failed:x.failed,skipped:x.skipped})))
      : processDirectSocialQueue(env,5).then(x=>console.log("[btmedya] Direct Social handoff",JSON.stringify({enabled:x.enabled,processed:x.processed,published:x.published,failed:x.failed})));
    const heartbeat=recordAutomationHeartbeat(env).then(x=>console.log("[btmedya] scheduled heartbeat",x.heartbeatAt,"queued",x.queued,"overdue",x.overdue));
    const results=await Promise.allSettled([queue,heartbeat]);
    for(const r of results) if(r.status==="rejected") console.error("[btmedya] queue lane:",r.reason?.message||r.reason);
    return;
  }

  if(cron==="1-59/15 * * * *"){
    try{
      const x=await runNewsIntelligence(env,{limit:8});
      console.log("[btmedya] haber istihbarati",JSON.stringify({scanned:x.scanned,added:x.added,hot:x.hot,errors:x.errors?.length||0}));
    }catch(e){console.error("[btmedya] haber istihbarati:",e?.message||e);}
    return;
  }

  if(cron==="6-59/15 * * * *"){
    try{
      const x=await runAutopilot(env,{force:false,limit:2,skipRecentIntelligence:true});
      console.log("[btmedya] autopilot",JSON.stringify({ok:x.ok,scanned:x.scanned,candidates:x.candidates,news:x.created_news,published:x.published_news,social:x.social_created,blocked:x.blocked,errors:x.error_count}));
    }catch(e){console.error("[btmedya] autopilot:",e?.message||e);}
    return;
  }

  if(cron==="11-59/15 * * * *"){
    // Rotate the remaining monitoring jobs; never launch all of them together.
    const slot=(Math.floor((minute-11)/15)%3+3)%3;
    try{
      if(slot===0){
        const x=await runSiteOsChecks(env,{limit:10});
        console.log("[btmedya] site OS",JSON.stringify(x));
      }else if(slot===1){
        const x=await runAgencySupervisor(env,{force:false});
        console.log("[btmedya] agency supervisor",JSON.stringify({ok:x.ok,alerts:x.summary?.alerts,clients:x.summary?.clients?.active,pendingApproval:x.summary?.content?.pendingApproval}));
      }else{
        const x=await merakRadariCalistir(env,{limit:8});
        console.log("[btmedya] halkin merak radari",JSON.stringify({scanned:x.scanned,signals:x.signals,opportunities:x.opportunities,errors:x.errors?.length||0}));
      }
    }catch(e){console.error("[btmedya] rotating monitor:",e?.message||e);}
    return;
  }

  console.warn("[btmedya] unknown cron trigger",cron);
}, async fetch(request, env, ctx){
  const url = new URL(request.url);

  // Admin alt sayfaları doğrudan URL ile erişilebilir olmamalı. Giriş ekranı
  // (/admin/) açık kalır; gerçek yönetim alt yolları imzalı oturum olmadan
  // giriş ekranına döner. API'ler ayrıca kendi session kontrollerini uygular.
  if(url.pathname.startsWith('/admin/') && url.pathname !== '/admin/'){
    if(!(await validSession(request, oturumAnahtari(env)))){
      // Sayfa isteğinde hedef korunur: girişten sonra okur istediği modüle döner.
      const sayfa=/text\/html/.test(request.headers.get('accept')||'') && !/\.(?:css|js|json|webmanifest|png|webp|jpg|svg|ico)$/i.test(url.pathname);
      return Response.redirect(new URL(sayfa ? '/admin/?sonra='+encodeURIComponent(url.pathname+url.search) : '/admin/', url.origin), 302);
    }
  }
  const coreApi=await btmedyaCoreApi(request,env,url,validSession); if(coreApi) return coreApi;
  const siteOs=await siteOsApi(request,env,url); if(siteOs) return siteOs;
  const windsorApi=await windsorAnalyticsApi(request,env,url,validSession,oturumAnahtari(env)); if(windsorApi) return audit(windsorApi);

  const hedefHost = kanonikHedef(url.hostname);
  if(hedefHost){
    url.hostname = hedefHost;
    return Response.redirect(url.toString(), 301);
  }

  // Kaynak Masası'nın eski adresini kalıcı olarak yeni kanonik adrese taşı.
  // Böylece eski bağlantılar korunur, Google iki ayrı içerik URL'si görmez.
  if(url.pathname === '/kaynak-masasi' || url.pathname === '/kaynak-masasi/'){
    return Response.redirect(new URL('/kaynaklar/' + url.search, url.origin), 301);
  }

  /* Admin kabuğu: API zaten oturum korumalı olsa da /admin/ HTML'inin
     anonim olarak 200 dönmesi gereksiz keşif yüzeyi oluşturuyordu. Giriş
     ekranı kullanıcıya gösterilir, fakat HTTP durumu 401 olur. Böylece
     Cloudflare Access kullanılmasa bile panel adresi herkese açık bir
     başarı sayfası gibi görünmez. CSS/JS/manifest gibi alt kaynaklar
     normal statik varlık olarak kalır; başarılı giriş mevcut kabuğu açar. */
  if(url.pathname === '/admin/' && request.method === 'GET'){
    const authenticated = await validSession(request, oturumAnahtari(env));
    /* 6 Ekim: public/admin/index.html giriş formu değil, yönetim merkezine
       yönlendiren kabuk. Oturumsuz okur oraya, oradan da (oturum yok) yine
       /admin/'e gidiyordu: sonsuz döngü, giriş formu hiç görünmüyordu.
       Oturum yoksa ayrı giriş sayfası (public/admin/giris/) sunulur. */
    const adminRes = await env.ASSETS.fetch(authenticated ? request : new Request(new URL('/admin/giris/', url.origin), request));
    if(!adminRes.ok) return adminRes;
    const adminHeaders = new Headers(adminRes.headers);
    for(const [k,v] of Object.entries(guvenlikBasliklari(url.pathname))) adminHeaders.set(k,v);
    adminHeaders.set('cache-control','no-store');
    adminHeaders.set('x-robots-tag','noindex, nofollow');
    adminHeaders.set('content-type','text/html; charset=utf-8');
    adminHeaders.set('vary','Cookie');
    return new Response(adminRes.body,{status:authenticated?200:401,statusText:authenticated?'OK':'Unauthorized',headers:adminHeaders});
  }

  /* security.txt (RFC 9116). robots.txt bu adresi gosteriyordu ama adres
     404 donuyordu. Dosya public/.well-known/ altinda duruyor; Wrangler
     Static Assets nokta ile baslayan klasorleri yuklemeyebildigi icin
     icerik burada, Worker tarafinda veriliyor — boylece her kosulda
     servis edilir. */
  if(url.pathname === '/.well-known/security.txt'){
    return new Response(
      '# BTMEDYA guvenlik iletisimi (RFC 9116)\n\n' +
      'Contact: mailto:busetuncay74@gmail.com\n' +
      'Contact: https://btmedya.com.tr/iletisim/\n' +
      'Expires: 2027-09-26T00:00:00.000Z\n' +
      'Preferred-Languages: tr, en\n' +
      'Canonical: https://btmedya.com.tr/.well-known/security.txt\n',
      {headers:{'content-type':'text/plain; charset=utf-8','cache-control':'public, max-age=86400'}});
  }

  // Eski haber URL'lerini mevcut statik haber sayfalarına taşı; eski backlink ve indeks sinyalleri kaybolmasın.
  if(url.pathname.startsWith('/haber/') && url.pathname.length > 7){
    const slug = url.pathname.slice('/haber/'.length).replace(/\/$/, '');
    return Response.redirect(`${url.origin}/haberler/${slug}.html${url.search}`, 301);
  }

  /* Sabah Masası'nın R2'ye kopyaladığı lisanslı temsili fotoğraflar.
     Yalnız otomasyon/ önekine izin verilir; kasadaki diğer dosyalar
     "Siteye ekle" onayı olmadan buradan açılamaz. */
  if(url.pathname.startsWith('/gorsel/otomasyon/') && (request.method==='GET'||request.method==='HEAD')){
    const key=decodeURIComponent(url.pathname.slice('/gorsel/'.length));
    if(!/^otomasyon\/[a-z0-9-]+\.jpg$/.test(key) || !env.MEDIA) return text('Bulunamadı',404);
    const obj=await env.MEDIA.get(key); if(!obj) return text('Bulunamadı',404);
    return new Response(request.method==='HEAD'?null:obj.body,{headers:{'content-type':'image/jpeg','cache-control':'public, max-age=604800','access-control-allow-origin':'*'}});
  }

  if(url.pathname==='/api/admin/sabah-masasi'){
    if(!(await validSession(request, oturumAnahtari(env)))) return json({ok:false,error:'Yetkisiz'},401);
    if(request.method==='GET') return json({ok:true,ayarlar:await sabahAyarlari(env),rapor:await sabahRaporu(env),ai:Boolean(env.AI),kategoriler:KATEGORILER.map(k=>({anahtar:k.anahtar,kategori:k.kategori}))});
    if(request.method==='PUT'){
      const b=await request.json().catch(()=>null);
      if(!b||typeof b!=='object') return json({ok:false,error:'Geçersiz JSON'},400);
      const izinli={}; for(const k of ['etkin','otomatikYayin','gunlukAzami','kategoriler']) if(k in b) izinli[k]=b[k];
      return json({ok:true,ayarlar:await sabahAyarlariYaz(env,izinli)});
    }
    if(request.method==='POST'){
      const b=await request.json().catch(()=>({}));
      const rapor=await sabahMasasi(env,{kuru:b.kuru===true,deneme:b.deneme===true,kategoriler:Array.isArray(b.kategoriler)?b.kategoriler:null,zorla:true});
      return json({ok:true,rapor});
    }
    return json({ok:false,error:'Method not allowed'},405,{'allow':'GET,PUT,POST'});
  }

  /* KALICI PUBLIC BAGLANTI — yalnizca "Siteye ekle" isaretli dosyalar.
     Metricool gibi disaridan cagiran servisler imzali/suresi dolan baglantiyi
     kullanamaz; yayindaki dosya icin sabit adres gerekir. Yayindan cikarilan
     dosya aninda 404'e doner. */
  if(url.pathname.startsWith('/pub/')){
    const key=decodeURIComponent(url.pathname.slice('/pub/'.length));
    // static/ kayit depodaki dosyaya isaret eder; R2'ye gitmeden oraya yonlendir.
    if(key.startsWith(STATIK_ONEK)) return Response.redirect(url.origin+medyaAdresi(key),302);
    if(!env.DB||!env.MEDIA) return text('Medya deposu yapılandırılmadı',503);
    const row=await env.DB.prepare('SELECT key FROM media WHERE key=? AND published=1').bind(key).first();
    if(!row) return text('Bu dosya yayında değil',404);
    const found=await getMediaObject(env,key); const obj=found.obj; if(!obj) return text('Medya bulunamadı',404);
    return new Response(obj.body,{headers:{
      'content-type':obj.httpMetadata?.contentType||'application/octet-stream',
      'cache-control':'public, max-age=3600',
      'access-control-allow-origin':'*'
    }});
  }

  if(url.pathname.startsWith('/media/')){
    const key=decodeURIComponent(url.pathname.slice('/media/'.length));
    const mediaSec=env.MEDIA_SIGNING_SECRET;
    if(!mediaSec) return text('Medya yapılandırma hatası',503);
    const ok=await validMediaSig(key,url.searchParams.get('exp'),url.searchParams.get('sig'),mediaSec);
    if(!ok) return text('Geçersiz veya süresi dolmuş medya bağlantısı',403);
    if(!env.MEDIA) return text('Medya deposu yapılandırılmadı',503);
    const found=await getMediaObject(env,key); const obj=found.obj; if(!obj)return text('Medya bulunamadı',404);
    return new Response(obj.body,{headers:{'content-type':obj.httpMetadata?.contentType||'application/octet-stream','cache-control':'public, max-age=86400'}});
  }

  if(url.pathname.startsWith('/api/')){
    const inspect = await adminPageInspectApi(request, env, url);
    if(inspect) return inspect;
    const auditGet = await adminAuditApi(request, env, url);
    if(auditGet) return auditGet;
    const audit = (response) => {

      if(request.method!=='GET' && url.pathname.startsWith('/api/admin/')){
        if(ctx?.waitUntil) ctx.waitUntil(recordAdminAudit(env,request,response));
        else return recordAdminAudit(env,request,response);
      }
      return response;
    };
    const aiCommand = await adminAiCommandApi(request, env, url);
    if(aiCommand) return audit(aiCommand);
    const command = await adminCommandApi(request, env, url);
    if(command) return audit(command);
    const rTikTok = await tiktokApi(request, env); if(rTikTok) return rTikTok;
    const rYouTube = await youtubeApi(request, env); if(rYouTube) return rYouTube;
    const rX = await xApi(request, env); if(rX) return rX;
    const rWhatsApp = await whatsappApi(request, env); if(rWhatsApp) return rWhatsApp;
    const rManualIntegrations = await manualIntegrationApi(request, env, url);
    if(rManualIntegrations) return audit(rManualIntegrations);
    const rDirectSocial = await directSocialApi(request, env, url);
    if(rDirectSocial) return rDirectSocial;
    const rSales = await salesApi(request, env, url, ctx);
    if(rSales) return audit(rSales);
    const ras = await agencySupervisorApi(request, env, url);
    if(ras) return audit(ras);

    const rw = await workflowApi(request, env, url);
    if(rw) return audit(rw);

    const rcc = await controlCenterApi(request, env, url);
    if(rcc) return audit(rcc);
    const rkm = await kaynakMasasiApi(request, env, url);
    if(rkm) return audit(rkm);
    const rap = await autopilotApi(request, env, url);
    if(rap) return audit(rap);
    const r1 = await newsApi(request, env, url, ctx);
    if(r1) return audit(r1);
    if(env.DB){
      const rc = await contactApi(request, env, url, ctx);
      if(rc) return audit(rc);
      const rs = await socialApi(request, env, url, ctx);
      if(rs) return audit(rs);
    }
    if(env.DB && env.MEDIA){
      const r2 = await mediaApi(request, env);
      if(r2) return audit(r2);
    }
    return audit(json({ok:false,error:'Not found'},404));
  }

  /* AI görünürlüğü: llms.txt, index.json, JSON-LD ve haber başına Markdown
     (src/ai-gorunurluk.js). Haber rotasından önce: /haberler/<slug>.md
     haber sayfası sanılmasın. Veri okunamazsa statik dosyaya düşer. */
  {
    const ag = await aiGorunurluk(request, env, url);
    if (ag) return ag;
  }

  /* Temiz kategori rotaları:
     Google ve kullanıcılar için /haberler/?kategori=... yerine kalıcı
     /haberler/<kategori>/ adresleri. Kategori sayfası HTML'i sunucuda
     D1'den hazırlanır; JS ayrıca zenginleştirme yapar. */
  const HABER_KATEGORILERI = {
    balikesir:{label:'Balıkesir',desc:'Balıkesir merkez ve ilçelerinden güncel haberler, belediye hizmetleri, ulaşım, ekonomi ve kent yaşamı.'},
    turkiye:{label:'Türkiye',desc:'Türkiye genelindeki ulusal gündem, kamu, siyaset, toplum ve kentlerden gelişmeler.'},
    dunya:{label:'Dünya',desc:'Dünyadan Türkiye’yi ve bölgeyi ilgilendiren gelişmeler, uluslararası gündem ve dış politika.'},
    gundem:{label:'Gündem',desc:'Güvenlik, afet, yangın, kamu hizmetleri ve Balıkesir gündemindeki önemli gelişmeleri kaynaklarıyla takip edin.'},
    ekonomi:{label:'Ekonomi',desc:'Balıkesir ekonomisi, esnaf, tarım, fiyatlar, emlak, istihdam ve yerel iş dünyasındaki gelişmeler.'},
    kultur:{label:'Kültür Sanat',desc:'Balıkesir kültür sanat gündemi: tiyatro, sinema, gastronomi, etkinlikler ve kentin hafızasını yaşatan hikâyeler.'},
    egitim:{label:'Eğitim',desc:'Okullar, üniversiteler, sınavlar ve öğrencilerin gündemindeki gelişmeleri BTMEDYA kaynaklarıyla izleyin.'},
    saglik:{label:'Sağlık',desc:'Sağlık hizmetleri, uzman görüşleri ve günlük yaşamı ilgilendiren sağlık gelişmelerini kaynaklarıyla takip edin.'},
    spor:{label:'Spor',desc:'Balıkesir ve Türkiye sporundan sonuçlar, takımlar, sporcular, karşılaşmalar ve etkinliklerden güncel haberler.'},
    teknoloji:{label:'Teknoloji',desc:'Teknoloji, yapay zekâ, dijital dönüşüm ve yeni ürün ve hizmetleri anlaşılır haberler ve kaynaklarla takip edin.'},
    yasam:{label:'Yaşam',desc:'Günlük yaşam, aile, moda, etkinlik, insan hikâyeleri ve şehir yaşamına dair haberler.'}
  };
  function htmlKac(s){
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function haberKategoriAnahtari(n){
    const metin=String((n?.category||'')+' '+(n?.title||'')+' '+(n?.excerpt||'')).toLocaleLowerCase('tr-TR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
    const rawKategori=String(n?.category||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();
    const explicit={balikesir:'balikesir',turkiye:'turkiye','türkiye':'turkiye',dunya:'dunya','dünya':'dunya',gundem:'gundem',ekonomi:'ekonomi',kultur:'kultur','kültür':'kultur',egitim:'egitim',saglik:'saglik',spor:'spor',teknoloji:'teknoloji',yasam:'yasam','yaşam':'yasam'};
    if(explicit[rawKategori]) return explicit[rawKategori].replace(/,$/,'');
    // Güçlü Balıkesir sinyali, tematik kelimelerden önce değerlendirilir.
    // Açık kategori adı varsa önce o korunur; otomatik sınıflandırmada yerel haber
    // ekonomi/teknoloji/gündem kelimeleri yüzünden başka bölüme taşınmaz.
    const balikesir=/\b(balikesir|altieylul|karesi|bandirma|edremit|ayvalik|burhaniye|gonen|susurluk|dursunbey|savastepe|bigadic|ivindi|manyas|havran|gomec|erdek|balya|sindirgi|pazar|altyapi|ulasim|belediye)\b/;
    if(balikesir.test(metin)) return 'balikesir';
    const rules=[
      ['dunya',/(dunya|abd|amerika|avrupa|almanya|fransa|ingiltere|rusya|ukrayna|israil|filistin|iran|cina|japonya|nato|birlesmis milletler|dis politika|uluslararasi)/],
      ['turkiye',/(turkiye|ankara|istanbul|izmir|adana|antalya|bursa|konya|meclis|bakanlik|cumhurbaskani|tbmm|yurt geneli|ulusal)/],
      ['teknoloji',/(yapay zeka|teknoloji|yazilim|dijital|\bai\b|teknofest|uygulama|platform)/],
      ['egitim',/(egitim|universite|okul|sinav|ogrenci|kampus|\byok\b)/],
      ['saglik',/(saglik|beslenme|hastane|doktor|tedavi|epilasyon|obezite|kalp)/],
      ['spor',/(spor|futbol|basketbol|turnuva|atletizm|pehlivan|muay thai|sporcu)/],
      ['kultur',/(kultur|zanaat|sanat|gastronomi|turizm|insan hikayesi|yasam|moda|etkinlik|tiyatro|sinema|festival)/],
      ['yasam',/(yasam|gundelik|aile|kadin|cocuk|magazin|moda|evlilik|dugun)/],
      ['ekonomi',/(ekonomi|emlak|esnaf|tarim|ticaret|fiyat|piyasa|maas|istihdam|satis|konut)/],
      ['gundem',/(gundem|asayis|yangin|afet|guvenlik|trafik|itfaiye|emniyet|polis|kaza|kamu)/]
    ];
    for(const [key,re] of rules) if(re.test(metin)) return key;
    return 'gundem';
  }
  async function temizKategoriSayfasi(request, env, url, key){
    const bilgi=HABER_KATEGORILERI[key];
    if(!bilgi) return null;
    let base=await env.ASSETS.fetch(new Request(new URL('/haberler/index.html',url.origin),{headers:{accept:'text/html'}}));
    if(!base.ok) return new Response('Kategori sayfası hazırlanamadı',503);
    let html=await base.text();

    let items=[];
    if(env.DB){
      const rows=(await env.DB.prepare(
        "SELECT slug,title,excerpt,category,cover_url,published_at,updated_at FROM news WHERE status='published' AND slug<>'' ORDER BY published_at DESC LIMIT 500"
      ).all().catch(()=>({results:[]}))).results||[];
      const kapaklar=await uretilmisKapaklar(env);
      items=rows.filter(n=>haberKategoriAnahtari(n)===key).slice(0,30).map(n=>({...n,cover_url:kapakSec(n,kapaklar)}));
    }

    let coverMap={};
    try{
      const cr=await env.ASSETS.fetch(new Request(new URL('/data/haber-kapak-kaynagi.json',url.origin)));
      if(cr.ok) coverMap=await cr.json();
    }catch{}

    const cards=items.map(n=>{
      const img=n.cover_url || ('/assets/haber-kapak/'+encodeURIComponent(n.slug)+'.webp');
      const provenance=coverMap[n.slug];
      const provenanceLabel=provenance==='gercek'?'Gerçek çekim':provenance==='arsiv'?'Arşiv fotoğrafı':provenance==='grafik'?'BTMEDYA grafik':provenance==='harita'?'Harita':'Temsili görsel';
      const date=n.published_at?new Date(n.published_at).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}):'';
      return '<article class="hm-kat-sunucu-kart">'+
        '<a class="hm-kart" href="/haberler/'+encodeURIComponent(n.slug)+'">'+
        '<figure><img src="'+htmlKac(img)+'" alt="'+htmlKac(n.title)+'" loading="lazy" decoding="async" width="600" height="450"><span class="hm-kaynak">'+htmlKac(provenanceLabel)+'</span></figure>'+
        '<span class="hm-ust-bilgi"><span class="hm-kat">'+htmlKac(bilgi.label)+'</span><span class="hm-format">KAYNAKLI GÜNDEM</span><time class="hm-zaman" datetime="'+htmlKac(n.published_at||'')+'">'+htmlKac(date)+'</time></span>'+
        '<h3>'+htmlKac(n.title)+'</h3><p class="hm-kat-spot">'+htmlKac(n.excerpt||'')+'</p></a></article>';
    }).join('');

    const title=bilgi.label+' Haberleri | BTMEDYA Haber Merkezi';
    const canonical=url.origin+'/haberler/'+key+'/';
    const block='<section class="hm-katsayfa" data-hm-katsayfa data-kat="'+key+'" aria-labelledby="hm-kategori-h1">'+
      '<div class="hm-kat-bas"><h2 id="hm-kategori-h1" aria-label="'+htmlKac(bilgi.label)+'">'+htmlKac(bilgi.label)+'<span class="hm-golge" aria-hidden="true">'+htmlKac(bilgi.label)+'</span></h2>'+
      '<p>'+htmlKac(bilgi.desc)+'</p><small>'+items.length+' güncel haber · en yeniden eskiye</small></div>'+
      (cards?'<div class="hm-izgara hm-kat-sunucu-izgara">'+cards+'</div>':'<p class="hm-bos">Bu kategoride henüz yayımlanmış haber yok.</p>')+
      '<section class="hm-ilkeler hm-kat-kaynak" aria-label="Kategori yayın ilkeleri"><div><b>Kaynak</b><span>Haber kaynağı ve yayın tarihi kartlarda korunur.</span></div><div><b>Görsel</b><span>Gerçek çekim, arşiv, grafik veya temsili görsel açıkça etiketlenir.</span></div><div><b>Güncellik</b><span>Liste D1 yayın akışından hazırlanır ve yeni yayınlarla güncellenir.</span></div></section>'+
      '</section>';

    html=html.replace('<html lang="tr">','<html lang="tr" data-bt-haber-kategori="'+key+'">');
    html=html.replace('<main class="hm" id="icerik">','<main class="hm kategori-modu" id="icerik">');
    html=html.replace(/<title>[^<]*<\/title>/i,'<title>'+htmlKac(title)+'</title>');
    html=html.replace(/<meta name="description" content="[^"]*">/i,'<meta name="description" content="'+htmlKac(bilgi.desc)+'">');
    html=html.replace(/<link rel="canonical" href="[^"]*">/i,'<link rel="canonical" href="'+canonical+'">');
    html=html.replace(/<meta property="og:url" content="[^"]*">/i,'<meta property="og:url" content="'+canonical+'">');
    html=html.replace(/<meta property="og:title" content="[^"]*">/i,'<meta property="og:title" content="'+htmlKac(title)+'">');
    html=html.replace(/<meta property="og:description" content="[^"]*">/i,'<meta property="og:description" content="'+htmlKac(bilgi.desc)+'">');
    html=html.replace(/<meta name="twitter:title" content="[^"]*">/i,'<meta name="twitter:title" content="'+htmlKac(title)+'">');
    html=html.replace(/<meta name="twitter:description" content="[^"]*">/i,'<meta name="twitter:description" content="'+htmlKac(bilgi.desc)+'">');
    html=html.replace(/<section class="hm-katsayfa" data-hm-katsayfa aria-live="polite"><\/section>/i,block);
    // Kategori sayfası arşiv ile aynı içeriği tekrar etmez. Arşiv kartlarını
    // DOM'dan da çıkarıyoruz; böylece Google aynı 27 eski haberi sekiz
    // kategori sayfasında tekrar tekrar görmez.
    const arsivAt=html.indexOf('<section class="hm-arsiv"');
    const mainEnd=arsivAt>=0 ? html.indexOf('</main>',arsivAt) : -1;
    if(arsivAt>=0 && mainEnd>arsivAt) html=html.slice(0,arsivAt)+html.slice(mainEnd);
    return new Response(html,{status:200,headers:{...guvenlikBasliklari(url.pathname),'content-type':'text/html; charset=utf-8','x-robots-tag':robotsBasligi(url.pathname),'cache-control':'public, max-age=60, s-maxage=60, must-revalidate','cache-tag':'btmedya-html'}});
  }

  // Eski sorgu tabanlı kategori adresleri kalıcı temiz rotaya gider.
  if(url.pathname==='/haberler/' && url.searchParams.has('kategori')){
    const key=String(url.searchParams.get('kategori')||'').toLowerCase();
    if(HABER_KATEGORILERI[key]) return Response.redirect(new URL('/haberler/'+key+'/',url.origin).toString(),301);
  }

  const temizKatMatch=url.pathname.match(/^\/haberler\/(balikesir|turkiye|dunya|gundem|ekonomi|kultur|egitim|saglik|spor|teknoloji|yasam)\/$/);
  if(temizKatMatch) return await temizKategoriSayfasi(request,env,url,temizKatMatch[1]);

  /* HABER SAYFASI — once statik dosya, yoksa D1'den uretim.
     Depodaki 27 haber oldugu gibi kalir; panelden girilen yeni haberler
     dosya olusturmadan kendi adresinde yayina girer. */
  if(url.pathname.startsWith('/haberler/') && url.pathname !== '/haberler/'){
    // Once veritabani, sonra statik dosya. Boylece panelden yapilan duzenleme
    // ve video kutuphanesi anahtari 27 eski haberde de gecerli olur; D1'e
    // ulasilamazsa depodaki statik surum yedek olarak devreye girer.
    {
      const slug = decodeURIComponent(url.pathname.slice('/haberler/'.length).replace(/\.html$/,'').replace(/\/$/,''));
      if(slug){
        let n = null;
        if(env.DB){
          n = await env.DB.prepare(
            "SELECT * FROM news WHERE slug=? AND status='published'"
          ).bind(slug).first();
        }
        // D1 kaydi yoksa repository'deki gerçek haber arşivinden üret.
        if(!n && env.ASSETS){
          try{
            const asset=await env.ASSETS.fetch(new Request(new URL('/data/haberler.json',url.origin)));
            if(asset.ok){
              const archive=await asset.json();
              const a=archive.find(x=>x.slug===slug);
              if(a){
                n={
                  id:a.id||null,slug:a.slug,title:a.title,excerpt:a.excerpt||'',
                  body:Array.isArray(a.body)?a.body.join('\n\n'):String(a.body||''),
                  category:a.category||'Haber',author:a.author||'BTMEDYA',
                  cover_url:a.cover_url||`/assets/haber-kapak/${encodeURIComponent(a.slug)}.webp`,
                  video_url:a.video_url||null,status:'published',
                  published_at:a.published_at||null,source_url:a.source_url||null,
                  original_date:a.original_date||null,archive_note:a.archive_note||'BTMEDYA arşiv içeriği',
                  updated_at:a.updated_at||null
                };
              }
            }
          }catch(e){ console.error('[news-page] static archive fallback failed:',e); }
        }
        if(n){
          // Video kutuphanesi kaydi: kendi kanalimiza tasinmissa oraya yonlenir.
          let vlib=null;
          const vsrc=String(n.video_url||'');
          if(vsrc){
            const m=vsrc.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})|^([A-Za-z0-9_-]{11})$/);
            const yid=m?(m[1]||m[2]):'';
            if(yid) vlib=await env.DB.prepare('SELECT * FROM video_library WHERE youtube_id=?').bind(yid).first();
          }
          if(!vlib) vlib=await env.DB.prepare('SELECT * FROM video_library WHERE news_slug=?').bind(slug).first();
          n={...n,cover_url:kapakSec(n,await uretilmisKapaklar(env))};
          const related=await ilgiliHaberler(env,n);
          return new Response(renderNewsPage(n, url.origin, vlib, related), {
            headers:{...guvenlikBasliklari(url.pathname),
                     'content-type':'text/html; charset=utf-8',
                     'x-robots-tag':robotsBasligi(url.pathname),
                     'cache-control':'public, max-age=60, s-maxage=60, must-revalidate','cache-tag':'btmedya-html'}
          });
        }
      }
    }
    return servisEt(request, env);
  }

  return servisEt(request, env);
} };

/* ---------- Statik servis: güvenlik başlıkları ve özel 404 ---------- */

/* Sitenin ihtiyacı olan kaynaklar dışında hiçbir şeye izin verilmez.
   Google Fonts stil ve font dosyaları, kendi medya alan adımız ve
   WhatsApp bağlantıları açık; başka her şey kapalı. */
/* Politika yola göre kurulur, çünkü sitenin iki ayrı ihtiyacı var.

   Kamuya açık sayfalar satır içi script kullanmıyor, bu yüzden orada
   script-src 'self' kalıyor. Yönetici paneli ise satır içi script ve
   on* öznitelikleriyle yazılmış; ona aynı kuralı uygularsak panel
   sessizce çalışmaz hale gelir, o yüzden yalnızca /admin/ altında
   'unsafe-inline' açılıyor.

   i.ytimg.com haber sayfalarındaki video kapak görselleri için,
   youtube-nocookie.com ise tıklayınca oluşturulan gömülü oynatıcı için
   gerekli. İkisi de src/news-page.js içinde kullanılıyor. */
/* CSP notu:
   Anasayfa ve dinamik haber şablonu erişilebilirlik ve küçük paket boyutu
   için satır içi, güvenilir uygulama betikleri kullanır. Bu nedenle public
   sayfalarda script-src 'unsafe-inline' açıkça tanımlıdır. Kullanıcı üretimli
   HTML ise Worker tarafında kaçışlanır; admin API oturum korumalıdır. */
function nonceUret() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/=+$/, '');
}

/* Cloudflare Web Analytics beacon'i zone tarafinda otomatik enjekte ediliyor.
   CSP'de yeri olmadigi icin tarayici her sayfada betigi reddediyordu:
   "Refused to load the script 'https://static.cloudflareinsights.com/beacon.min.js'".
   Sonuc: olcum hic toplanmiyor ve her sayfa konsola hata yaziyor. Betigin
   kendisi static.cloudflareinsights.com'dan geliyor, topladigi veriyi
   cloudflareinsights.com'a POST ediyor; ikisi de tek tek aciliyor. */
const CF_ANALYTICS_BETIK = 'https://static.cloudflareinsights.com';
const CF_ANALYTICS_UC = 'https://cloudflareinsights.com';

function cspKur(pathname, nonce) {
  const panel = pathname.startsWith('/admin');
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${CF_ANALYTICS_BETIK} https://tracker.metricool.com`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https://i.ytimg.com https://tracker.metricool.com",
    "media-src 'self' blob: https://cdn.jsdelivr.net",
    "frame-src https://www.youtube-nocookie.com",
    `connect-src 'self' ${CF_ANALYTICS_UC} https://tracker.metricool.com`,
    "form-action 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
}

function guvenlikBasliklari(pathname, nonce) {
  return {
    'content-security-policy': cspKur(pathname, nonce || nonceUret()),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'x-frame-options': 'SAMEORIGIN',
    'x-permitted-cross-domain-policies': 'none',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': pathname.startsWith('/admin') ? 'same-origin' : 'same-site',
    'origin-agent-cluster': '?1',
    // İçerik kullanım politikası (contentsignals.org): arama ve yapay zekâ
    // yanıtında alıntı evet, model eğitimi hayır.
    'content-signal': ICERIK_SINYALI
  };
}

/* Uzun ömürlü varlıklar uzun önbelleğe, HTML kısa önbelleğe.
   HTML kısa tutulur ki içerik güncellemesi hemen görünsün. */
function onbellek(pathname) {
  if (/\.(?:mp4|webm|jpg|jpeg|png|webp|gif|svg|woff2?|ico)$/i.test(pathname))
    return 'public, max-age=31536000, immutable';
  if (/\.(?:css|js)$/i.test(pathname))
    return 'public, max-age=3600, must-revalidate';
  return 'public, max-age=60, s-maxage=60, must-revalidate';
}

/* Site haritasi, Google News haritasi ve RSS depoda elle tutulan statik
   dosyalar. Panelden yayinlanan haberler (D1) bu dosyalara hic girmiyordu;
   Google yeni haberleri haritadan bulamiyor, RSS okuyuculari gormuyordu.
   Statik dosya oldugu gibi kalir, D1'de yayinda olup dosyada bulunmayan
   haberler sona eklenir. Hata olursa statik dosya degismeden verilir. */
const HARITALAR = new Set(['/sitemap.xml', '/news-sitemap.xml', '/rss.xml']);
const xmlKac = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* Google News haritasi statik dosyaya eklenerek degil, her istekte D1'den
   bastan uretilir. Statik dosya 28 Eylul'de bos ve kendiliginden kapanan
   <urlset .../> olarak yazilmisti; "</urlset>" aranip ekleme yapildigi icin
   harita hep bos donuyordu ve news: ad alani da tanimli degildi. Google News
   yalniz son 48 saatte yayinlanan haberleri kabul eder; eski haber listede
   kalirsa uyari verir, bu yuzden statik listeye guvenilmez. */
const NEWS_NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"';
function haberHaritasiUret(satirlar, kok, simdi = Date.now()) {
  const sinir = simdi - 2 * 86400 * 1000;
  const ogeler = satirlar.map(r => ({ r, d: new Date(r.published_at || '') }))
    // Ileri tarihli (zamanlanmis) haber henuz yayinda sayilmaz.
    .filter(({ d }) => !isNaN(d) && d.getTime() >= sinir && d.getTime() <= simdi + 3600 * 1000)
    .slice(0, 1000)
    .map(({ r, d }) => `<url><loc>${xmlKac(`${kok}/haberler/${encodeURIComponent(r.slug)}`)}</loc><news:news><news:publication><news:name>BTMEDYA</news:name><news:language>tr</news:language></news:publication><news:publication_date>${xmlKac(/T\d{2}:\d{2}/.test(r.published_at) ? r.published_at : d.toISOString())}</news:publication_date><news:title>${xmlKac(r.title)}</news:title></news:news></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${NEWS_NS}>\n${ogeler.join('\n')}${ogeler.length ? '\n' : ''}</urlset>\n`;
}

async function haritayaPanelHaberleriniEkle(yol, metin, env, origin) {
  const satirlar = (await env.DB.prepare(
    "SELECT slug,title,excerpt,published_at,updated_at FROM news WHERE status='published' AND slug<>'' ORDER BY published_at DESC LIMIT 500"
  ).all()).results || [];
  // Yerelde http gelebilir; haritadaki adres her zaman kanonik https olmali.
  const kok = 'https://' + new URL(origin).host;
  if (yol === '/news-sitemap.xml') return haberHaritasiUret(satirlar, kok);
  const adres = s => `${kok}/haberler/${encodeURIComponent(s)}`;
  // Statik dosyada zaten olan haber ikinci kez eklenmez.
  const eksik = satirlar.filter(r => !metin.includes(`/haberler/${r.slug}<`) && !metin.includes(`/haberler/${encodeURIComponent(r.slug)}<`));
  if (!eksik.length) return metin;
  const tarih = r => { const d = new Date(r.published_at || r.updated_at || ''); return isNaN(d) ? null : d; };

  if (yol === '/sitemap.xml') {
    const ek = eksik.map(r => {
      const d = tarih(r);
      return `<url><loc>${xmlKac(adres(r.slug))}</loc>${d ? `<lastmod>${d.toISOString().slice(0, 10)}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    }).join('\n');
    return metin.replace('</urlset>', ek + '\n</urlset>');
  }
  // RSS: yeni ogeler kanalin basina, statik ogelerin onune girer.
  const ek = eksik.slice(0, 50).map(r => {
    const d = tarih(r);
    return `<item><title>${xmlKac(r.title)}</title><link>${xmlKac(adres(r.slug))}</link><guid isPermaLink="true">${xmlKac(adres(r.slug))}</guid><description>${xmlKac(r.excerpt || '')}</description>${d ? `<pubDate>${d.toUTCString()}</pubDate>` : ''}</item>`;
  }).join('\n');
  const i = metin.indexOf('<item>');
  return i >= 0 ? metin.slice(0, i) + ek + '\n' + metin.slice(i) : metin.replace('</channel>', ek + '\n</channel>');
}

/* Arama motoru yonergesi tek yerden, HTTP basligiyla verilir. Sayfalarin
   cogunda robots meta etiketi yok; Google varsayilan olarak buyuk gorsel
   onizlemesi gostermez ve Discover'da haber kucuk karta duser.
   Panel ve ic araclar dizine hic girmez. */
const DIZIN_DISI = /^\/(?:admin|social-studio|api)(?:\/|$)/;
function robotsBasligi(pathname) {
  return DIZIN_DISI.test(pathname) ? 'noindex, nofollow'
    : 'max-image-preview:large, max-snippet:-1, max-video-preview:-1';
}

const CLEAN_HERO_RELEASE = 'https://github.com/BTmedyajans/Btmedya-db/releases/download/btmedya-ai-hero-200e379/';

const CLEAN_HERO_FILES = new Map([
  ['/hero-media/giris-filmi-clean-genis.mp4', 'btmedya-ai-hero-desktop.mp4'],
  ['/hero-media/giris-filmi-clean.mp4', 'btmedya-ai-hero-mobile.mp4'],
  ['/hero-media/giris-filmi-clean-genis-poster.jpg', 'btmedya-ai-hero-desktop.jpg'],
  ['/hero-media/giris-filmi-clean-poster.jpg', 'btmedya-ai-hero-mobile.jpg'],
]);

async function servisEt(request, env) {
  const url = new URL(request.url);
  const cleanHeroFile = CLEAN_HERO_FILES.get(url.pathname);
  if (cleanHeroFile && (request.method === 'GET' || request.method === 'HEAD')) {
    const headers = new Headers();
    const range = request.headers.get('range');
    if (range) headers.set('range', range);
    const upstream = await fetch(CLEAN_HERO_RELEASE + cleanHeroFile, { method: request.method, headers });
    if (!upstream.ok && upstream.status !== 206) {
      return new Response('Hero media unavailable', {status: upstream.status || 502});
    }
    const out = new Headers(upstream.headers);
    out.set('cache-control', 'public, max-age=31536000, immutable');
    out.set('content-disposition', 'inline');
    out.set('accept-ranges', upstream.headers.get('accept-ranges') || 'bytes');
    if (cleanHeroFile.endsWith('.mp4')) out.set('content-type', 'video/mp4');
    else out.set('content-type', 'image/jpeg');
    return new Response(request.method === 'HEAD' ? null : upstream.body, {status: upstream.status, headers: out});
  }
  let res = await env.ASSETS.fetch(request);

  /* Static Assets "/hizmetler" -> "/hizmetler/" ve "/index.html" -> "/"
     duzeltmelerini 307 (gecici) ile yapar. Gecici yonlendirmede Google eski
     adresi de ayri tutabilir; adres kalici oldugu icin 301 verilir. Yalniz
     ayni alan adi icindeki yonlendirme cevrilir. */
  if (res.status === 307 && (request.method === 'GET' || request.method === 'HEAD')) {
    const hedef = res.headers.get('location');
    if (hedef) {
      const mutlak = new URL(hedef, url);
      if (mutlak.host === url.host) {
        return new Response(null, { status: 301, headers: { location: mutlak.pathname + mutlak.search, 'cache-control': 'public, max-age=3600' } });
      }
    }
  }

  /* Bilinmeyen adres: kendi 404 sayfamızı, doğru durum koduyla ver */
  if (res.status === 404 && request.method === 'GET' &&
      (request.headers.get('accept') || '').includes('text/html')) {
    const ozel = await env.ASSETS.fetch(new Request(new URL('/404.html', url), request));
    if (ozel.ok) res = new Response(ozel.body, { status: 404, headers: ozel.headers });
  }

  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(guvenlikBasliklari(url.pathname))) h.set(k, v);
  // Static Assets bazı HTML yanıtlarında charset parametresini göndermeyebilir.
  // Türkçe karakterlerin tarayıcılar ve crawler'lar tarafından aynı şekilde
  // yorumlanması için HTML yanıtını açıkça UTF-8 ilan et.
  const contentType = h.get('content-type') || '';
  if (contentType.toLowerCase().startsWith('text/html')) {
    h.set('content-type', 'text/html; charset=utf-8');
    if (res.status === 200) {
      h.set('x-robots-tag', robotsBasligi(url.pathname));
      h.set('cache-tag', 'btmedya-html');
    }
  }
  if (!h.has('cache-control') || res.status === 404) h.set('cache-control', onbellek(url.pathname));
  else h.set('cache-control', onbellek(url.pathname));

  if (res.status === 200 && HARITALAR.has(url.pathname) && env.DB) {
    const metin = await res.text();
    const yeni = await haritayaPanelHaberleriniEkle(url.pathname, metin, env, url.origin).catch(e => {
      console.error('[harita] panel haberleri eklenemedi:', e?.message || e);
      return metin;
    });
    h.delete('content-length');
    return new Response(yeni, { status: 200, headers: h });
  }

  /* Panelden "Sosyal paylasim gorseli" yuvasina dosya atandiysa anasayfanin
     og:image ve twitter:image etiketleri sunucuda degistirilir. WhatsApp,
     Facebook ve X tarayicilari JavaScript calistirmaz; istemci tarafinda
     yapilan degisikligi hic gormezler. Atama yoksa sayfaya dokunulmaz. */
  if (url.pathname === '/' && res.status === 200 && contentType.toLowerCase().startsWith('text/html')) {
    const og = (await panelYuvaAtamalari(env).catch(() => ({})))['og-image'];
    if (og && og.url) {
      // Her zaman https: paylasim tarayicilari http gorseli reddedebiliyor.
      const mutlak = 'https://' + url.host + og.url;
      const icerik = { element(e) { e.setAttribute('content', mutlak); } };
      const sil = { element(e) { e.remove(); } };
      const yeni = new HTMLRewriter()
        .on('meta[property="og:image"]', icerik)
        .on('meta[property="og:image:secure_url"]', icerik)
        .on('meta[name="twitter:image"]', icerik)
        .on('meta[property="og:image:type"]', { element(e) { e.setAttribute('content', uzantiMime(og.url)); } })
        // Yeni gorselin olcusu bilinmiyor; yanlis olcu bildirmektense hic bildirme.
        .on('meta[property="og:image:width"]', sil)
        .on('meta[property="og:image:height"]', sil)
        .transform(new Response(res.body, { status: res.status, statusText: res.statusText, headers: h }));
      return yeni;
    }
  }

  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}


// Cloudflare Workflows / Durable Objects exports
/* Sabah Masası'nın kategori işçisi. SABAH_YAZICI servis bağlamasıyla
   (wrangler.toml) çağrılır; her çağrı ayrı bir Worker çağrısıdır ve kendi
   50'lik dış istek bütçesini kullanır. Adlandırılmış giriş noktası olduğu
   için internetten erişilemez, yalnız bu Worker'ın bağlamasından çağrılır. */
class SabahYazici extends WorkerEntrypoint {
  async kategoriIsle(is){ return kategoriIsle(this.env, is); }
}

export { BtmedyaWorkflow, WorkflowStatusDO, SabahYazici };
