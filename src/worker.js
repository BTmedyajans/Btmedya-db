import { BtmedyaWorkflow } from "./btmedya-workflow.js";
import { WorkflowStatusDO } from "./workflow-status-do.js";
import { renderNewsPage } from "./news-page.js";
import { socialProviderStatus } from "./social-platforms.js";
/* BTMEDYA Worker — birleşik API
 * 1) Haber CMS  (D1 tablo: news)        — /api/news, /api/admin/news
 * 2) Medya Kasası (D1 tablo: media, R2) — /api/media*, /api/public/media, /api/export, /media/*, /api/login, /api/logout
 * 3) İletişim    (D1 tablo: contact_messages) — /api/contact, /api/admin/contact
 * Statik dosyalar env.ASSETS üzerinden servis edilir.
 */

const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...headers}});
const text = (data, status=200, headers={}) => new Response(data, {status, headers:{'content-type':'text/plain; charset=utf-8', ...headers}});

/* ---------- yardımcılar (medya kasası) ---------- */
function b64url(bytes){ return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unb64url(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4)s+='='; return Uint8Array.from(atob(s),c=>c.charCodeAt(0)); }
async function hmac(secret, message){ const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']); return b64url(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(message))); }
async function medyaListesi(env, origin){
  if(!env || !env.ASSETS) return [];
  try{
    const r = await env.ASSETS.fetch(new Request(new URL('/data/medya-listesi.json', origin)));
    if(!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  }catch{ return []; }
}
async function sessionToken(secret){ const payload=b64url(new TextEncoder().encode(JSON.stringify({iat:Date.now(),exp:Date.now()+7*86400000,role:'admin'}))); return payload+'.'+await hmac(secret,payload); }
async function validSession(request, secret){
  if(!secret) return false;
  const c=request.headers.get('cookie')||''; const m=c.match(/bt_admin=([^;]+)/); if(!m) return false;
  const [p,s]=m[1].split('.'); if(!p||!s) return false; const expected=await hmac(secret,p);
  if(s!==expected) return false; try { return JSON.parse(new TextDecoder().decode(unb64url(p))).exp>Date.now(); } catch { return false; }
}
async function signedMediaUrl(request, key, secret, ttl=86400){
  const u=new URL(request.url); const exp=Math.floor(Date.now()/1000)+ttl; const msg=`${key}:${exp}`; const sig=await hmac(secret,msg); return `${u.origin}/media/${key}?exp=${exp}&sig=${encodeURIComponent(sig)}`;
}

// Medya depolama katmanı: üretim bucket'ı birincildir, eski arşiv bucket'ı yalnızca fallback'tir.
// Böylece yanlış R2 eşleşmesi mevcut dosyaları görünmez kılmaz ve hiçbir dosya taşınmadan/silinmeden erişilebilir kalır.
async function getMediaObject(env, key){
  if(env.MEDIA){
    const obj=await env.MEDIA.get(key).catch(()=>null);
    if(obj) return {obj,source:'r2'};
  }
  if(env.LEGACY_MEDIA){
    const obj=await env.LEGACY_MEDIA.get(key).catch(()=>null);
    if(obj) return {obj,source:'r2-legacy'};
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

function isHiddenR2Key(key){
  const k=String(key||'');
  return /(^|\/)\.(?:trashed|tmp|temp)(?:-|\/|$)/i.test(k) || /(^|\/)thumbs\.db$/i.test(k);
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
      if(isHiddenR2Key(key)) continue;
      const mime=String(x.httpMetadata?.contentType||'');
      if(!allowed.test(key) && !/^(image|video|audio)\//i.test(mime)) continue;
      const category=mediaCategoryFromKey(key);
      if(cat && category!==cat) continue;
      if(q && !key.toLowerCase().includes(q.toLowerCase())) continue;
      const isVideo=/\.(mp4|webm|mov|m4v)$/i.test(key) || /^video\//i.test(mime);
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
async function listLegacyMedia(env, opts={}){
  return listR2Media(env.LEGACY_MEDIA,'r2-legacy',opts);
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
  const to=env.RESEND_TO||'busetuncay1029@gmail.com';
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
  if (!(await validSession(request, (env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) {
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
async function newsApi(request, env, url){
  if(url.pathname==='/api/health'){
    const [r2Probe,legacyProbe]=await Promise.all([
      env.MEDIA ? env.MEDIA.list({limit:200}).catch(()=>null) : null,
      env.LEGACY_MEDIA ? env.LEGACY_MEDIA.list({limit:200}).catch(()=>null) : null
    ]);
    const mediaLike=/\.(?:jpe?g|png|webp|gif|mp4|webm|mov|m4v|mp3|wav|m4a)$/i;
    const mediaCount=(probe)=>Array.isArray(probe?.objects)?probe.objects.filter(o=>{
      const key=String(o.key||'');
      const mime=String(o.httpMetadata?.contentType||'');
      return !isHiddenR2Key(key) && (mediaLike.test(key)||/^(image|video|audio)\//i.test(mime));
    }).length:0;
    return json({
      ok:true,service:'btmedya',cms:!!env.DB,r2:!!env.MEDIA,legacyR2:!!env.LEGACY_MEDIA,
      r2Objects:!!r2Probe?.objects?.length,legacyR2Objects:!!legacyProbe?.objects?.length,
      r2MediaObjects:mediaCount(r2Probe),legacyR2MediaObjects:mediaCount(legacyProbe),
      admin:!!(env.ADMIN_PASSWORD_SECRET || env.ADMIN_PASSWORD) && !!(env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET),mail:!!env.RESEND_API_KEY
    });
  }

  /* Public: haber listesi
     D1 üretim kaynağıdır. D1'de arşiv seed'i henüz uygulanmamışsa
     repository içindeki gerçek BTMEDYA arşivi güvenli bir salt-okur
     fallback olarak kullanılır. Böylece canlı site boş kalmaz. */
  if(url.pathname==='/api/news' && request.method==='GET'){
    const limit=Math.min(Number(url.searchParams.get('limit'))||100,100);
    let d1Items=[];
    if(env.DB){
      const rows=await env.DB.prepare("SELECT id,slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,source_url,original_date,archive_note,updated_at FROM news WHERE status='published' ORDER BY published_at DESC LIMIT 200").all();
      d1Items=rows.results||[];
    }
    try{
      const req=new Request(new URL('/data/haberler.json',url.origin));
      const asset=await env.ASSETS.fetch(req);
      if(!asset.ok) return json({ok:true,source:d1Items.length?'d1':'static',items:d1Items.slice(0,limit)});
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
      return json({ok:true,source:d1Items.length?'d1+static-archive':'static-archive',items});
    }catch(e){
      console.error('[news] static archive fallback failed:',e);
      return json({ok:true,source:'d1',items:d1Items.slice(0,limit)});
    }
  }

  /* Admin: haber listesi */
  if(url.pathname==='/api/admin/news' && request.method==='GET'){
    if(!(await validSession(request, (env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
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
    if(!(await validSession(request, (env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
    if(!env.DB) return json({ok:false,error:'D1 not configured'},503);
    const b=await request.json().catch(()=>null);
    if(!b || typeof b!=='object') return json({ok:false,error:'Geçersiz JSON'},400);
    if(!b.title || !b.slug) return json({ok:false,error:'title and slug required'},400);
    const title=String(b.title).trim().slice(0,240);
    const slug=String(b.slug).trim().replace(/[^a-z0-9-]/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,180);
    if(!title || !slug) return json({ok:false,error:'Geçersiz başlık veya slug'},400);
    const status=b.status==='published'?'published':'draft';
    const now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO news(slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,body=excluded.body,category=excluded.category,author=excluded.author,cover_url=excluded.cover_url,video_url=excluded.video_url,status=excluded.status,published_at=excluded.published_at,updated_at=excluded.updated_at`)
      .bind(slug,title,String(b.excerpt||'').slice(0,1000),String(b.body||'').slice(0,200000),String(b.category||'').slice(0,100),String(b.author||'').slice(0,160),String(b.cover_url||'').slice(0,2000),String(b.video_url||'').slice(0,2000),status,status==='published'?(b.published_at||now):null,now).run();
    return json({ok:true,slug,status});
  }

  /* Admin: haber güncelle / sil (ID ile) */
  const newsById=url.pathname.match(/^\/api\/admin\/news\/(\d+)$/);
  if(newsById){
    if(!(await validSession(request, (env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
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
      await env.DB.prepare('UPDATE news SET title=?,excerpt=?,body=?,category=?,author=?,cover_url=?,video_url=?,status=?,published_at=?,updated_at=? WHERE id=?')
        .bind(b.title||'',b.excerpt||'',b.body||'',b.category||'',b.author||'',b.cover_url||'',b.video_url||'',status,status==='published'?(b.published_at||now):null,now,id).run();
      return json({ok:true});
    }
    if(request.method==='DELETE'){
      await env.DB.prepare('DELETE FROM news WHERE id=?').bind(id).run();
      return json({ok:true});
    }
  }

  return null;
}

/* ---------- BTMEDYA Haber Bulucu + AI İçerik Üretici ---------- */
const NEWS_FEEDS = [
  {id:'cumha-balikesir',name:'CUMHA / Balıkesir RSS',url:'https://cumha.com.tr/rss/lokasyon/balikesir',category:'Yerel'},
  {id:'google-balikesir',name:'Google News / Balıkesir',url:'https://news.google.com/rss/search?q=Bal%C4%B1kesir&hl=tr&gl=TR&ceid=TR:tr',category:'Gündem'},
  {id:'google-ai',name:'Google News / Yapay Zekâ',url:'https://news.google.com/rss/search?q=yapay%20zeka%20AI&hl=tr&gl=TR&ceid=TR:tr',category:'AI'}
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
function newsSlug(title,link){let base=String(title||'haber').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100)||'haber';let h=0;for(const ch of String(link||'')){h=((h<<5)-h+ch.charCodeAt(0))|0}return base+'-'+Math.abs(h)}
async function scanNewsSources(env,feedIds){
  const feeds=NEWS_FEEDS.filter(x=>!feedIds||feedIds.includes(x.id)); const found=[];
  if(!env.DB) return found;
  for(const feed of feeds){try{
    const r=await fetch(feed.url,{headers:{accept:'application/rss+xml, application/xml, text/xml, text/html','user-agent':'BTMEDYA-NewsFinder/1.0'},redirect:'follow'}); if(!r.ok) continue;
    for(const item of rssItems(await r.text()).slice(0,20)){
      const exists=await env.DB.prepare('SELECT id FROM news WHERE source_url=? LIMIT 1').bind(item.link).first(); if(exists) continue;
      const slug=newsSlug(item.title,item.link); const duplicate=await env.DB.prepare('SELECT id FROM news WHERE slug=? LIMIT 1').bind(slug).first(); if(duplicate) continue;
      const now=new Date().toISOString();
      await env.DB.prepare('INSERT INTO news(slug,title,excerpt,body,category,author,cover_url,video_url,status,published_at,source_url,original_date,archive_note,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(slug,item.title,item.description,item.description,feed.category,'BTMEDYA Kaynak Masası','','','draft',null,item.link,item.date||null,'Kaynak Masası tarafından bulundu; editör onayı bekliyor.',now).run();
      found.push({slug,title:item.title,source:item.link,category:feed.category,date:item.date||null});
    }
  }catch(e){}}
  return found;
}
async function newsFinderApi(request,env,url){
  if(!url.pathname.startsWith('/api/admin/news-finder')) return null;
  if(!(await validSession(request,(env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
  if(!env.DB) return json({ok:false,error:'D1 not configured'},503);
  if(request.method==='GET') return json({ok:true,feeds:NEWS_FEEDS.map(x=>({id:x.id,name:x.name,category:x.category})),openai:!!env.OPENAI_API_KEY});
  if(request.method!=='POST') return json({ok:false,error:'Method not allowed'},405,{'allow':'GET,POST'});
  const body=await request.json().catch(()=>({})); const feedIds=Array.isArray(body.feeds)&&body.feeds.length?body.feeds:NEWS_FEEDS.map(x=>x.id);
  const found=await scanNewsSources(env,feedIds);
  return json({ok:true,count:found.length,items:found});
}
async function aiDraftApi(request,env,url){
  if(url.pathname!=='/api/admin/ai-draft') return null;
  if(!(await validSession(request,(env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
  if(request.method!=='POST') return json({ok:false,error:'Method not allowed'},405);
  if(!env.OPENAI_API_KEY) return json({ok:false,error:'OPENAI_API_KEY secret eksik'},503);
  const b=await request.json().catch(()=>({})); const title=String(b.title||'').trim().slice(0,500); const source=String(b.source||'').trim().slice(0,2000); const textIn=String(b.text||'').trim().slice(0,12000);
  if(!title&&!textIn) return json({ok:false,error:'Başlık veya metin gerekli'},400);
  const prompt='BTMEDYA için editoryal TASLAK hazırla. Kaynak metni kopyalama. Yalnızca verilen bilgilerden hareket et, yeni olgu uydurma. Türkçe JSON üret: title, excerpt, body, social_caption. Kaynak linkini ve belirsizliği koru. Otomatik yayın yapma.\n\nBaşlık: '+title+'\nKaynak: '+source+'\nMetin: '+textIn;
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+env.OPENAI_API_KEY},body:JSON.stringify({model:'gpt-5.6-luna',input:prompt,store:false})});
  if(!r.ok) return json({ok:false,error:'AI servisi yanıt vermedi'},502); const data=await r.json();
  const output=String(data.output_text||data.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join('')||'').trim(); let parsed=null; try{parsed=JSON.parse(output.replace(/^```json|```$/g,'').trim())}catch{}
  return json({ok:true,draft:parsed||{title,excerpt:'',body:output,social_caption:''}});
}
/* ---------- Statik arşiv -> R2 eşitleme ---------- */
async function mediaSyncApi(request, env, url){
  if(url.pathname!=='/api/admin/media-sync' || request.method!=='POST') return null;
  if(!(await validSession(request, (env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
  if(!env.MEDIA) return json({ok:false,error:'Üretim R2 bağlı değil'},503);
  if(!env.ASSETS) return json({ok:false,error:'Statik ASSETS bağlı değil'},503);
  const body=await request.json().catch(()=>({}));
  const raw=String(body.path||'').replace(/^\\/+/, '');
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
  const mime=response.headers.get('content-type') || (/\\.(mp4|webm)$/i.test(raw)?'video/mp4':'image/webp');
  const size=Number(response.headers.get('content-length')||0);
  await env.MEDIA.put(raw,response.body,{httpMetadata:{contentType:mime}});
  if(env.DB){
    const id=crypto.randomUUID(), now=new Date().toISOString();
    const category=String(item.category||'arsiv');
    const title=String(item.baslik||raw.split('/').pop()||raw).replace(/\\.[^.]+$/,'').replace(/[-_]+/g,' ');
    const ai=item.gercek===true ? 0 : 1;
    const slot=category==='hero'?'hero':category==='video'?'medya':category==='portfoy'?'portfoy':'';
    const tags=JSON.stringify(['BTMEDYA',ai?'ai-uretimi':'gercek','arsiv','r2']);
    await env.DB.prepare('INSERT OR IGNORE INTO media (id,key,original_name,mime,size,category,tags,title,description,alt_text,published,slot,sort_order,created_at,updated_at,width,height,duration_s,has_audio,aspect,suggested,routed,posted,youtube_id,ai_generated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id,raw,raw.split('/').pop()||raw,mime,size,category,tags,title,ai?'BTMEDYA AI üretimi arşiv medyası':'BTMEDYA gerçek çekim arşiv medyası',ai?'BTMEDYA AI üretimi arşiv medyası':'BTMEDYA gerçek çekim arşiv medyası',1,slot,Number(item.sira||0),now,now,0,0,0,0,'', '[]','[]','[]','',ai).run().catch(()=>{});
  }
  return json({ok:true,already:false,path:raw,source:'r2',mime,size,message:'Statik medya R2 ve D1 medya kasasına aktarıldı'});
}
/* ---------- BTMEDYA Control Center ---------- */
async function controlCenterApi(request, env, url){
  if(url.pathname!=='/api/admin/control-center' || request.method!=='GET') return null;
  if(!(await validSession(request, (env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
  const origin=new URL(request.url).origin;
  const staticCatalog=await medyaListesi(env,origin);
  const r2Live=await listR2Media(env.MEDIA,'r2');
  const legacyLive=await listLegacyMedia(env);
  let d1Media=0,d1News=0,d1Published=0;
  if(env.DB){
    try{
      const [m,n,p]=await Promise.all([
        env.DB.prepare('SELECT COUNT(*) AS n FROM media').first(),
        env.DB.prepare('SELECT COUNT(*) AS n FROM news').first(),
        env.DB.prepare("SELECT COUNT(*) AS n FROM news WHERE status='published'").first()
      ]);
      d1Media=Number(m?.n||0); d1News=Number(n?.n||0); d1Published=Number(p?.n||0);
    }catch{}
  }
  const r2Keys=new Set(r2Live.map(x=>x.key));
  const staticPaths=staticCatalog.map(x=>String(x.path||x.key||'')).filter(Boolean);
  const r2MissingStatic=staticPaths.filter(k=>!r2Keys.has(k)).slice(0,40);
  return json({
    ok:true,
    service:'BTMEDYA Control Center',
    site:{url:'https://btmedya.com.tr/',worker:'btmedya-db'},
    storage:{d1:!!env.DB,r2:!!env.MEDIA,legacyR2:!!env.LEGACY_MEDIA},
    catalog:{
      staticRecords:staticCatalog.length,
      staticReal:staticCatalog.filter(x=>x.gercek===true || x.ai_generated===false).length,
      staticAi:staticCatalog.filter(x=>x.ai_generated===true || x.gercek===false).length,
      r2Objects:r2Live.length,
      legacyR2Objects:legacyLive.length,
      d1MediaRecords:d1Media,
      d1NewsRecords:d1News,
      publishedNews:d1Published,
      staticNotInR2:r2MissingStatic.length,
      note:'Statik GitHub medya kayıtları ASSETS üzerinden canlı sunulur; R2 eksikliği tek başına yayın hatası değildir.'
    },
    audit:{
      staticNotInR2:r2MissingStatic,
      r2Sample:r2Live.slice(0,12).map(x=>x.key),
      lastChecked:new Date().toISOString()
    },
    admin:{configured:!!(env.ADMIN_PASSWORD_SECRET || env.ADMIN_PASSWORD) && !!(env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET),mediaSigning:!!env.MEDIA_SIGNING_SECRET},
    social:socialProviderStatus(env),
    socialLinks:[
      {key:'instagram',label:'Instagram @btmedya10',url:'https://www.instagram.com/btmedya10/',note:'Görsel profil ve Reels kanalı'},
      {key:'tiktok',label:'TikTok @btmedya1010',url:'https://www.tiktok.com/@btmedya1010',note:'Kısa video kanalı; yayın API’si ayrıca yetkilendirilmeli'},
      {key:'youtube',label:'YouTube @BTmedyaAjans',url:'https://www.youtube.com/@BTmedyaAjans',note:'Video arşivi ve Shorts hedefi'},
      {key:'facebook',label:'Facebook Page',url:null,note:'Sayfa URL’si doğrulanacak; yayın için META_PAGE_ID gerekir'},
      {key:'whatsapp',label:'WhatsApp teklif hattı',url:'https://wa.me/905416401029',note:'İletişim ve proje talebi'}
    ],
    integrations:{
      izap:{status:'external_connector',assistant:'busetuncay74',note:'WhatsApp/iZap operasyon asistanı yapılandırıldı; Worker doğrudan iZap sırrı tutmaz.'},
      cmsOpenData:{status:'assistant_connector',note:'CMS Open Data resmi veri sorguları Control Center/ChatGPT tarafında kullanılabilir; Worker içine Medicare verisi gömülmez.'},
      github:{status:'deployment_pipeline',note:'main dalı üzerinden Cloudflare Workers Builds deploy zinciri kullanılır.'}
    },
    nextActions:[
      !(env.ADMIN_PASSWORD_SECRET || env.ADMIN_PASSWORD)?'Cloudflare Worker secret: ADMIN_PASSWORD_SECRET ekle':null,
      !(env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)?'Cloudflare Worker secret: ADMIN_SESSION_SECRET_SECRET ekle':null,
      !env.MEDIA_SIGNING_SECRET?'Cloudflare Worker secret: MEDIA_SIGNING_SECRET ekle':null,
      !env.META_ACCESS_TOKEN||!env.META_IG_USER_ID?'Instagram bağlantı secretlarını tamamla':null,
      !env.TIKTOK_ACCESS_TOKEN||!env.TIKTOK_OPEN_ID?'TikTok bağlantı secretlarını tamamla':null,
      !env.YOUTUBE_CLIENT_ID||!env.YOUTUBE_CLIENT_SECRET||!env.YOUTUBE_REFRESH_TOKEN?'YouTube bağlantı secretlarını tamamla':null,
      !env.OPENAI_API_KEY?'AI içerik üretici için OPENAI_API_KEY ekle':null
    ].filter(Boolean)
  });
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
    if(!(await validSession(request, (env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
    const rows=await env.DB.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200').all();
    return json({ok:true,items:rows.results});
  }
  const contactById=url.pathname.match(/^\/api\/admin\/contact\/(\d+)$/);
  if(contactById && request.method==='PATCH'){
    if(!(await validSession(request, (env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
    await env.DB.prepare('UPDATE contact_messages SET read=1 WHERE id=?').bind(Number(contactById[1])).run();
    return json({ok:true});
  }
  if(contactById && request.method==='DELETE'){
    if(!(await validSession(request, (env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
    await env.DB.prepare('DELETE FROM contact_messages WHERE id=?').bind(Number(contactById[1])).run();
    return json({ok:true});
  }
  return null;
}

/* ---------- Sosyal İçerik Akışı API ---------- */
const SOCIAL_STATUS = new Set(['fikir','hazirlaniyor','onayda','planlandi','yayinlandi']);
const SOCIAL_FORMAT = new Set(['9:16','4:5','1:1','16:9']);

async function socialApi(request, env, url){
  if(!url.pathname.startsWith('/api/admin/social')) return null;
  if(!(await validSession(request, (env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET)))) return json({ok:false,error:'Yetkisiz'},401);
  if(!env.DB) return json({ok:false,error:'D1 not configured'},503);

  if(url.pathname==='/api/admin/social/providers' && request.method==='GET'){
    return json({ok:true,providers:socialProviderStatus(env)});
  }

  if(url.pathname==='/api/admin/social' && request.method==='GET'){
    const status=String(url.searchParams.get('status')||'').trim();
    if(status && !SOCIAL_STATUS.has(status)) return json({ok:false,error:'Geçersiz durum'},400);
    let sql='SELECT * FROM social_posts';
    const args=[];
    if(status){sql+=' WHERE status=?';args.push(status);}
    sql+=' ORDER BY CASE status WHEN "onayda" THEN 1 WHEN "planlandi" THEN 2 WHEN "hazirlaniyor" THEN 3 WHEN "fikir" THEN 4 WHEN "yayinlandi" THEN 5 ELSE 9 END, COALESCE(scheduled_at,"9999-12-31T23:59:59.999Z"), updated_at DESC LIMIT 300';
    const rows=args.length ? await env.DB.prepare(sql).bind(...args).all() : await env.DB.prepare(sql).all();
    const items=(rows.results||[]).map(x=>({...x,platforms:JSON.parse(x.platforms||'[]')}));
    return json({ok:true,items});
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
    const scheduledAt=b.scheduled_at ? String(b.scheduled_at).slice(0,64) : null;
    let platforms=b.platforms;
    if(typeof platforms==='string') {
      try { platforms=JSON.parse(platforms); } catch { platforms=platforms.split(',').map(x=>x.trim()).filter(Boolean); }
    }
    if(!Array.isArray(platforms)) platforms=[];
    platforms=platforms.map(x=>String(x).trim()).filter(Boolean).slice(0,20);
    const now=new Date().toISOString();
    const id=String(b.id||'').trim() || crypto.randomUUID();
    const exists=b.id ? await env.DB.prepare('SELECT id FROM social_posts WHERE id=?').bind(id).first() : null;

    if(exists){
      await env.DB.prepare('UPDATE social_posts SET title=?,body=?,platforms=?,format=?,media_key=?,source_slug=?,status=?,scheduled_at=?,updated_at=? WHERE id=?')
        .bind(title,body,JSON.stringify(platforms),format,mediaKey,sourceSlug,status,scheduledAt,now,id).run();
    }else{
      await env.DB.prepare('INSERT INTO social_posts(id,title,body,platforms,format,media_key,source_slug,status,scheduled_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id,title,body,JSON.stringify(platforms),format,mediaKey,sourceSlug,status,scheduledAt,now,now).run();
    }
    return json({ok:true,id,status});
  }

  const byId=url.pathname.match(/^\/api\/admin\/social\/([^/]+)$/);
  if(byId && request.method==='PATCH'){
    const id=decodeURIComponent(byId[1]);
    const b=await request.json().catch(()=>({}));
    const status=String(b.status||'');
    if(!SOCIAL_STATUS.has(status)) return json({ok:false,error:'Geçersiz durum'},400);
    const r=await env.DB.prepare('UPDATE social_posts SET status=?,updated_at=? WHERE id=?')
      .bind(status,new Date().toISOString(),id).run();
    return json({ok:true,changed:(r.meta?.changes||0)>0});
  }
  if(byId && request.method==='DELETE'){
    const id=decodeURIComponent(byId[1]);
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

  const sess=(env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET);
  const mediaSec=env.MEDIA_SIGNING_SECRET;

  if(path==='/api/login' && request.method==='POST'){
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    const rate=await checkRateLimit(env,ip);
    if(!rate.allowed) return json({error:'Çok fazla başarısız deneme. 15 dakika bekleyin.'},429,{'Retry-After':String(RATE_LIMIT_WINDOW_S)});
    const body=await request.json().catch(()=>({}));
    if(!(env.ADMIN_PASSWORD_SECRET || env.ADMIN_PASSWORD) || !sess || body.password!==(env.ADMIN_PASSWORD_SECRET || env.ADMIN_PASSWORD))
      return json({error:'Geçersiz kimlik bilgisi',remaining:rate.remaining},401);
    await clearRateLimit(env,ip);
    const token=await sessionToken(sess);
    return json({ok:true},200,{'set-cookie':`bt_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`});
  }
  if(path==='/api/logout') return new Response(null,{status:204,headers:{'set-cookie':'bt_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'}});

  if(path==='/api/refresh' && request.method==='POST'){
    if(!await validSession(request,sess)) return json({ok:false,error:'Geçersiz veya süresi dolmuş oturum'},401);
    const token=await sessionToken(sess);
    return json({ok:true},200,{'set-cookie':`bt_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`});
  }


  if(path==='/api/public/media' && request.method==='GET') {
    const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'Content-Type, Authorization'};
    const q=(u.searchParams.get('q')||'').toLowerCase(); const cat=u.searchParams.get('category')||'';
    const staticItems=(await medyaListesi(env,u.origin))
      .filter(x=>!cat || x.category===cat)
      .filter(x=>!q || x.path.toLowerCase().includes(q))
      .map((x,i)=>({id:x.id,key:'static/'+x.path,original_name:x.path.split('/').pop(),mime:/\.(mp4|webm)$/i.test(x.path)?'video/'+(x.path.endsWith('.webm')?'webm':'mp4'):'image/webp',size:0,category:x.category,tags:['BTMEDYA',x.gercek?'gercek':'ai-uretimi','arsiv'],title:x.baslik||x.path.split('/').pop().replace(/\.[^.]+$/,'').replace(/[-_]+/g,' '),description:x.gercek?'BTMEDYA gerçek çekim arşiv medyası':'BTMEDYA AI üretimi arşiv medyası',alt_text:x.gercek?'BTMEDYA gerçek çekim arşiv medyası':'BTMEDYA AI üretimi arşiv medyası',slot:x.category==='hero'?'hero':x.category==='video'?'medya':x.category==='portfoy'?'portfoy':'haber',sort_order:i,created_at:null,updated_at:null,url:'/assets/'+x.path,source:'github-static',ai_generated:!x.gercek,vitrin:x.vitrin!==false,sira:x.sira,poster:x.poster?'/assets/'+x.poster:null}));
    let r2Items=[];
    if(env.DB && env.MEDIA && mediaSec){
      let sql='SELECT id,key,original_name,mime,size,category,tags,title,description,alt_text,slot,sort_order,created_at,updated_at FROM media WHERE published=1'; const args=[];
      if(q){sql+=' AND (original_name LIKE ? OR title LIKE ? OR description LIKE ? OR tags LIKE ?)'; const x='%'+q+'%'; args.push(x,x,x,x);}
      if(cat){sql+=' AND category=?'; args.push(cat);} sql+=' ORDER BY created_at DESC LIMIT 200';
      const r=await env.DB.prepare(sql).bind(...args).all();
      r2Items=await Promise.all((r.results||[]).map(async x=>({...x,tags:JSON.parse(x.tags||'[]'),url:await signedMediaUrl(request,x.key,mediaSec,Number(env.MEDIA_PUBLIC_TTL||3600)),source:'r2',ai_generated:!!x.ai_generated})));
    }
    // D1 metadata eksik olsa bile gerçek production R2 nesnelerini görünür tut.
    // Bu katman salt-okurdur; R2'ye yazmaz, taşımaz veya silmez.
    if(mediaSec && env.MEDIA){
      const direct=await listR2Media(env.MEDIA,'r2-direct',{q,cat});
      const known=new Set(r2Items.map(x=>x.key));
      for(const x of direct){
        /* R2'de telefon/Drive gibi kaynaklardan kalan çöp ve geçici nesneler
           public medya kataloğuna girmemeli. Silme/taşıma yapmıyoruz, yalnızca
           vitrinde ve API'de görünmesini engelliyoruz. */
        const key=String(x.key||'');
        if(/(^|\/).(?:trashed|tmp|temp)(?:-|\/|$)/i.test(key) || /(^|\/)thumbs\.db$/i.test(key)) continue;
        if(known.has(x.key)) continue;
        x.url=await signedMediaUrl(request,x.key,mediaSec,Number(env.MEDIA_PUBLIC_TTL||3600));
        r2Items.push(x);
      }
    }
    // Eski R2 yalnızca ikinci salt-okur fallback'tir.
    if(mediaSec && env.LEGACY_MEDIA){
      const legacy=await listLegacyMedia(env,{q,cat});
      const known=new Set(r2Items.map(x=>x.key));
      for(const x of legacy){
        if(known.has(x.key)) continue;
        x.url=await signedMediaUrl(request,x.key,mediaSec,Number(env.MEDIA_PUBLIC_TTL||3600));
        r2Items.push(x);
      }
    }
    // GitHub katalog metadatasini ayni anahtar adina sahip R2 nesnesine miras ver.
    // Böylece poster, vitrin sirasi ve gercek/AI etiketi R2 tarafinda tekrar elle girilmez.
    const staticByPath=new Map();
    for(const x of staticItems){
      const p=String(x.key||'').replace(/^static\//,'');
      staticByPath.set(p,x);
      staticByPath.set(String(x.original_name||''),x);
    }
    for(const x of r2Items){
      const match=staticByPath.get(String(x.key||'')) || staticByPath.get(String(x.original_name||''));
      if(!match) continue;
      if(!x.title || /^BTMEDYA gerçek R2/.test(String(x.title))) x.title=match.title;
      if(!x.category || x.category==='arsiv') x.category=match.category;
      if(!x.slot) x.slot=match.slot||'';
      if(match.poster) x.poster=match.poster;
      if(typeof match.vitrin==='boolean') x.vitrin=match.vitrin;
      if(typeof match.sira==='number') x.sira=match.sira;
      if(match.ai_generated===true) x.ai_generated=true;
    }
    const r2Keys=new Set(r2Items.map(x=>String(x.key||'').replace(/^static\//,'')));
    const seen=new Set(r2Items.map(x=>x.url));
    const items=[...r2Items,...staticItems.filter(x=>!seen.has(x.url) && !r2Keys.has(String(x.key||'').replace(/^static\//,'')))];
    return json({brand:'BTMedya',generated_at:new Date().toISOString(),source:r2Items.length?'r2+legacy-r2+github-static':'github-static',items},200,cors);
  }

  const aiToken=env.AI_READ_TOKEN;
  const bearer=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  const aiRead=(aiToken && bearer===aiToken);
  const auth=aiRead || await validSession(request,(env.ADMIN_SESSION_SECRET_SECRET || env.ADMIN_SESSION_SECRET));
  if(!auth) return json({error:'Yetkisiz'},401);

  /* DEPO PLANI — her dosyanin teknik ozelligi, onerilen hedefler, secilen
     hedefler ve kalici public baglantisi tek listede. Sohbetten okunup
     Metricool'a gonderim buradan planlanir. */
  /* SITE DURUMU — hangi yuva dolu, hangisi bos, ne yuklenmeli. */
  if(path==='/api/site/slots' && request.method==='GET'){
    const origin=new URL(request.url).origin;
    const r=await env.DB.prepare("SELECT * FROM media WHERE slot!='' ").all();
    const bySlot={}; for(const x of (r.results||[])) bySlot[x.slot]=x;
    const yuvalar=SITE_SLOTS.map(([slug,bolum,tur,oran,olcu,not])=>{
      const m=bySlot[slug];
      return {slug,bolum,tur,oran,onerilenOlcu:olcu,not,
        dolu:!!m,
        dosya:m?{id:m.id,ad:m.title||m.original_name,olcu:(m.width&&m.height)?`${m.width}x${m.height}`:'',
                 enBoy:m.aspect,saniye:m.duration_s,yapayZeka:!!m.ai_generated,
                 url:m.published?`${origin}/pub/${encodeURIComponent(m.key)}`:null}:null};
    });
    const eksik=yuvalar.filter(y=>!y.dolu);
    return json({ozet:{toplam:yuvalar.length,dolu:yuvalar.length-eksik.length,eksik:eksik.length},yuvalar});
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
    const items=await Promise.all((r.results||[]).map(async x=>({...x,tags:JSON.parse(x.tags||'[]'),url:await signedMediaUrl(request,x.key,mediaSec,Number(env.MEDIA_PUBLIC_TTL||86400))})));
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
    const id=del[1]; const row=await env.DB.prepare('SELECT key FROM media WHERE id=?').bind(id).first(); if(!row)return json({error:'Bulunamadı'},404); await env.MEDIA.delete(row.key); await env.DB.prepare('DELETE FROM media WHERE id=?').bind(id).run(); return json({ok:true});
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
const SITE_SLOTS=[
  // slug              bolum                       tur     oran    onerilen      notu
  ['hero-video',      'Giriş filmi',              'video','16:9','1920x1080','En fazla 30 sn. Sayfanın ilk gördüğü şey.'],
  ['hero-poster',     'Giriş kapak karesi',       'image','16:9','1920x1080','Video inmeden önce görünen kare.'],
  ['portre-buse',     'Buse Tuncay portresi',     'image','4:5', '1200x1500','Gerçek fotoğraf. Şu anki görsel yapay zekâ üretimi.'],
  ['saha-buse',       'Sahada çalışırken kare',   'image','16:9','1600x900', 'Mikrofonlu, iş başında. Muhabir kimliğini taşır.'],
  ['hizmet-haber',    'Haber & Röportaj kartı',   'image','16:9','1600x900', 'Çekim sırasından kare.'],
  ['hizmet-belgesel', 'Belgesel & Kısa Film',     'image','16:9','1600x900', 'Set ya da kamera arkası.'],
  ['hizmet-tanitim',  'Tanıtım Filmi kartı',      'image','16:9','1600x900', 'Yayınlanmış bir işten kare.'],
  ['hizmet-dugun',    'Düğün & Özel Gün kartı',   'image','16:9','1600x900', 'İzin alınmış bir çekimden.'],
  ['siyah-oda',       'Siyah Oda kapağı',         'image','16:9','1600x900', 'Gerçek stüdyo. Şu anki görsel yapay zekâ konsepti.'],
  ['kategori-haber',  'Kategori: Haber',          'video','9:16','1080x1920','Saha görüntüsü. Şu an yapay zekâ videosu var.'],
  ['kategori-medya',  'Kategori: Medya',          'video','9:16','1080x1920','Sosyal içerik üretiminden.'],
  ['kategori-prod',   'Kategori: Prodüksiyon',    'video','9:16','1080x1920','Kamera, kurgu, set.'],
  ['og-image',        'Sosyal paylaşım görseli',  'image','16:9','1200x630', 'WhatsApp ve X paylaşımında görünen kapak.'],
];

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

export default {
  async scheduled(event, env, ctx){
    const task=scanNewsSources(env,NEWS_FEEDS.map(x=>x.id));
    if(ctx?.waitUntil) ctx.waitUntil(task); else await task;
  },
  async fetch(request, env, ctx){
  const url = new URL(request.url);

  if(url.hostname.startsWith('www.')){
    url.hostname = url.hostname.slice(4);
    return Response.redirect(url.toString(), 301);
  }

  // Eski haber URL'lerini mevcut statik haber sayfalarına taşı; eski backlink ve indeks sinyalleri kaybolmasın.
  if(url.pathname.startsWith('/haber/') && url.pathname.length > 7){
    const slug = url.pathname.slice('/haber/'.length).replace(/\/$/, '');
    return Response.redirect(`${url.origin}/haberler/${slug}.html${url.search}`, 301);
  }

  /* KALICI PUBLIC BAGLANTI — yalnizca "Siteye ekle" isaretli dosyalar.
     Metricool gibi disaridan cagiran servisler imzali/suresi dolan baglantiyi
     kullanamaz; yayindaki dosya icin sabit adres gerekir. Yayindan cikarilan
     dosya aninda 404'e doner. */
  if(url.pathname.startsWith('/pub/')){
    const key=decodeURIComponent(url.pathname.slice('/pub/'.length));
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
    if(!env.MEDIA && !env.LEGACY_MEDIA) return text('Medya deposu yapılandırılmadı',503);
    const found=await getMediaObject(env,key); const obj=found.obj; if(!obj)return text('Medya bulunamadı',404);
    return new Response(obj.body,{headers:{'content-type':obj.httpMetadata?.contentType||'application/octet-stream','cache-control':'public, max-age=86400'}});
  }

  if(url.pathname === '/news-sitemap.xml' && (request.method === 'GET' || request.method === 'HEAD')){
    return dinamikNewsSitemap(request, env);
  }

  if(url.pathname === '/sitemap.xml' && (request.method === 'GET' || request.method === 'HEAD')){
    return dinamikSitemap(request, env);
  }

  if(url.pathname.startsWith('/api/')){
    const rw = await workflowApi(request, env, url);
    if(rw) return rw;

    const rnf = await newsFinderApi(request, env, url); if(rnf) return rnf;
    const rad = await aiDraftApi(request, env, url); if(rad) return rad;
    const rms = await mediaSyncApi(request, env, url);
    if(rms) return rms;
    const rcc = await controlCenterApi(request, env, url);
    if(rcc) return rcc;
    const r1 = await newsApi(request, env, url);
    if(r1) return r1;
    if(env.DB){
      const rc = await contactApi(request, env, url, ctx);
      if(rc) return rc;
    const rs = await socialApi(request, env, url);
    if(rs) return rs;
    }
    if(env.DB && env.MEDIA){
      const r2 = await mediaApi(request, env);
      if(r2) return r2;
    }
    return json({ok:false,error:'Not found'},404);
  }

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
          return new Response(renderNewsPage(n, url.origin, vlib), {
            headers:{...guvenlikBasliklari(url.pathname),
                     'content-type':'text/html; charset=utf-8',
                     'cache-control':'public, max-age=300, s-maxage=600'}
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

function cspKur(pathname, nonce) {
  const panel = pathname.startsWith('/admin');
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob: https://i.ytimg.com",
    "media-src 'self' blob:",
    "frame-src https://www.youtube-nocookie.com",
    "connect-src 'self'",
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
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'cross-origin-opener-policy': 'same-origin'
  };
}

/* Uzun ömürlü varlıklar uzun önbelleğe, HTML kısa önbelleğe.
   HTML kısa tutulur ki içerik güncellemesi hemen görünsün. */
function onbellek(pathname) {
  if (/\.(?:mp4|webm|jpg|jpeg|png|webp|gif|svg|woff2?|ico)$/i.test(pathname))
    return 'public, max-age=31536000, immutable';
  if (/\.(?:css|js)$/i.test(pathname))
    return 'public, max-age=3600, must-revalidate';
  return 'public, max-age=300, must-revalidate';
}

async function dinamikSitemap(request, env) {
  const url = new URL(request.url);
  try {
    const fallback = await env.ASSETS.fetch(new Request(new URL('/sitemap.xml', url.origin)));
    if (!env.DB || !fallback.ok) return fallback;
    const rows = await env.DB.prepare(
      "SELECT slug, published_at, updated_at, cover_url FROM news WHERE status='published' ORDER BY published_at DESC"
    ).all();
    const escXml = value => String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const xml = await fallback.text();
    const known = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]));
    const additions = (rows.results || []).filter(row => row.slug).filter(row => {
      const loc = `${url.origin}/haberler/${encodeURIComponent(row.slug)}`;
      if (known.has(loc)) return false;
      known.add(loc);
      return true;
    }).map(row => {
      const loc = `${url.origin}/haberler/${encodeURIComponent(row.slug)}`;
      const date = String(row.updated_at || row.published_at || '').slice(0, 10);
      const cover = String(row.cover_url || '').trim();
      const image = cover ? `<image:image><image:loc>${escXml(/^https?:\/\//i.test(cover) ? cover : `${url.origin}${cover.startsWith('/') ? cover : `/${cover}`}`)}</image:loc></image:image>` : '';
      return `  <url><loc>${escXml(loc)}</loc>${/^\d{4}-\d{2}-\d{2}$/.test(date) ? `<lastmod>${date}</lastmod>` : ''}${image}</url>`;
    });
    const body = additions.length
      ? (additions.some(addition => addition.includes('<image:image>')) && !xml.includes('xmlns:image=')
          ? xml.replace('<urlset', '<urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
          : xml).replace('</urlset>', `${additions.join('\n')}\n</urlset>`)
      : xml;
    return new Response(body, { status: 200, headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=300, must-revalidate'
    }});
  } catch (error) {
    console.error('[sitemap] dynamic merge failed:', error);
    return env.ASSETS.fetch(new Request(new URL('/sitemap.xml', url.origin)));
  }
}

async function dinamikNewsSitemap(request, env) {
  const url = new URL(request.url);
  const escXml = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const headers = {
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': 'public, max-age=300, must-revalidate'
  };
  const empty = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"></urlset>';
  if (!env.DB) return new Response(empty, { status: 503, headers });
  try {
    const cutoff = Date.now() - (2 * 24 * 60 * 60 * 1000);
    const rows = await env.DB.prepare(
      "SELECT slug, title, published_at FROM news WHERE status='published' AND published_at IS NOT NULL ORDER BY published_at DESC LIMIT 1000"
    ).all();
    const items = (rows.results || []).filter(row => {
      const publishedMs = Date.parse(String(row.published_at || ''));
      return row.slug && row.title && Number.isFinite(publishedMs) && publishedMs >= cutoff;
    }).map(row => {
      const rawDate = String(row.published_at).trim();
      const publishedDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? rawDate
        : new Date(rawDate).toISOString();
      const loc = `${url.origin}/haberler/${encodeURIComponent(row.slug)}`;
      return `  <url><loc>${escXml(loc)}</loc><news:news><news:publication><news:name>BTMEDYA</news:name><news:language>tr</news:language></news:publication><news:publication_date>${escXml(publishedDate)}</news:publication_date><news:title>${escXml(row.title)}</news:title></news:news></url>`;
    });
    const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n' +
      `${items.join('\n')}\n</urlset>`;
    return new Response(body, { status: 200, headers });
  } catch (error) {
    console.error('[news-sitemap] generation failed:', error);
    return new Response(empty, { status: 503, headers });
  }
}

async function servisEt(request, env) {
  const url = new URL(request.url);
  let res = await env.ASSETS.fetch(request);

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
  }
  if (!h.has('cache-control') || res.status === 404) h.set('cache-control', onbellek(url.pathname));
  else h.set('cache-control', onbellek(url.pathname));

  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}


// Cloudflare Workflows / Durable Objects exports
export { BtmedyaWorkflow, WorkflowStatusDO };
