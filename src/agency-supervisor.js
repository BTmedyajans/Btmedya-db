/* BTMEDYA Agency Supervisor
 * Düşük maliyetli sürekli gözlem katmanı: D1/KV ile müşteri + içerik + pazarlama
 * kuyruklarını tarar, insan kararını gerektiren noktaları alarm olarak işaretler.
 * AI üretimi burada yoktur; yalnızca ihtiyaç sinyali üretilir.
 */
const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const nowIso=()=>new Date().toISOString();

async function ensureSupervisorTables(env){
  if(!env.DB)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agency_supervisor_runs(
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    outcome TEXT NOT NULL DEFAULT 'ok',
    summary_json TEXT NOT NULL DEFAULT '{}',
    error TEXT
  )`).run().catch(()=>{});
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agency_alerts(
    id TEXT PRIMARY KEY,
    signature TEXT NOT NULL UNIQUE,
    severity TEXT NOT NULL DEFAULT 'info',
    scope TEXT NOT NULL DEFAULT 'agency',
    client_id TEXT,
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    resolved_at TEXT
  )`).run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_agency_alerts_status ON agency_alerts(status,last_seen_at)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_agency_alerts_client ON agency_alerts(client_id,status)').run().catch(()=>{});
}

async function q(env,sql,binds=[]){
  if(!env.DB)return null;
  return env.DB.prepare(sql).bind(...binds).first().catch(()=>null);
}
async function qall(env,sql,binds=[]){
  if(!env.DB)return {results:[]};
  return env.DB.prepare(sql).bind(...binds).all().catch(()=>({results:[]}));
}
const n=v=>Number(v||0);

function summarizeRows(rows){
  return (rows||[]).map(x=>({...x}));
}

async function openAlert(env,{signature,severity='info',scope='agency',client_id=null,title,detail}){
  const now=nowIso();
  const old=await q(env,'SELECT id FROM agency_alerts WHERE signature=?',[signature]);
  if(old){
    await env.DB.prepare('UPDATE agency_alerts SET severity=?,scope=?,client_id=?,title=?,detail=?,status=\'open\',last_seen_at=?,resolved_at=NULL WHERE signature=?')
      .bind(severity,scope,client_id,title,detail,now,signature).run().catch(()=>{});
    return;
  }
  await env.DB.prepare('INSERT INTO agency_alerts(id,signature,severity,scope,client_id,title,detail,status,first_seen_at,last_seen_at,resolved_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),signature,severity,scope,client_id,title,detail,'open',now,now,null).run().catch(()=>{});
}

async function closeUnseenAlerts(env,seen){
  if(!env.DB)return;
  const rows=await qall(env,'SELECT id,signature FROM agency_alerts WHERE status=\'open\'');
  for(const row of (rows.results||[])){
    if(!seen.has(row.signature)){
      await env.DB.prepare('UPDATE agency_alerts SET status=\'resolved\',resolved_at=?,last_seen_at=? WHERE id=?')
        .bind(nowIso(),nowIso(),row.id).run().catch(()=>{});
    }
  }
}

export async function runAgencySupervisor(env,{force=false}={}){
  await ensureSupervisorTables(env);
  if(!env.DB)return {ok:false,error:'D1 veritabanı bağlı değil'};
  const runId=crypto.randomUUID(),started=nowIso(),seen=new Set();
  const summary={
    heartbeat:started,
    clients:{active:0,total:0,withoutRecentContent:0},
    content:{total:0,drafts:0,pendingApproval:0,approved:0},
    ownedNews:{published7d:0,latestPublishedAt:null},
    social:{queued:0,overdue:0,failed:0},
    sales:{open:0,due:0},
    references:{public:0},
    media:{total:0,ai:0},
    clientsSnapshot:[],
    recommendations:[],
    alerts:0
  };
  try{
    const clients=await q(env,`SELECT COUNT(*) total,SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) active FROM client_workspaces`);
    summary.clients.total=n(clients?.total); summary.clients.active=n(clients?.active);

    const cStats=await q(env,`SELECT COUNT(*) total,
      SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) drafts,
      SUM(CASE WHEN status IN ('draft','revision_requested') AND client_approved=0 THEN 1 ELSE 0 END) pendingApproval,
      SUM(CASE WHEN client_approved=1 THEN 1 ELSE 0 END) approved
      FROM client_content`);
    summary.content.total=n(cStats?.total); summary.content.drafts=n(cStats?.drafts);
    summary.content.pendingApproval=n(cStats?.pendingApproval); summary.content.approved=n(cStats?.approved);

    const clientRows=await qall(env,`SELECT c.id,c.name,c.slug,c.status,COUNT(cc.id) content_count,
      SUM(CASE WHEN cc.status='draft' THEN 1 ELSE 0 END) draft_count,
      MAX(cc.updated_at) last_content_at
      FROM client_workspaces c
      LEFT JOIN client_content cc ON cc.client_id=c.id
      WHERE c.status='active'
      GROUP BY c.id,c.name,c.slug,c.status
      ORDER BY COALESCE(MAX(cc.updated_at),'1970-01-01T00:00:00.000Z') ASC
      LIMIT 100`);
    const seven=Date.now()-7*86400000;
    summary.clientsSnapshot=summarizeRows(clientRows.results||[]);
    for(const c of (clientRows.results||[])){
      const last=c.last_content_at?new Date(c.last_content_at).getTime():0;
      if(!last||last<seven){
        summary.clients.withoutRecentContent++;
        const sig='client-stale-content:'+c.id;
        seen.add(sig);
        await openAlert(env,{signature:sig,severity:'warn',scope:'client',client_id:c.id,title:c.name+' içerik ritmi zayıf',detail:'Son 7 günde yeni müşteri içeriği bulunamadı. İçerik planı veya yeni kampanya fikri üretilebilir.'});
      }
      if(n(c.draft_count)>0){
        const sig='client-drafts:'+c.id;
        seen.add(sig);
        await openAlert(env,{signature:sig,severity:'info',scope:'client',client_id:c.id,title:c.name+' için taslak içerik bekliyor',detail:n(c.draft_count)+' taslak içerik müşteri/ekip akışında bekliyor.'});
      }
    }

    const news=await q(env,`SELECT COUNT(*) published7d,MAX(published_at) latestPublishedAt
      FROM news WHERE status='published' AND published_at>=?`,[new Date(Date.now()-7*86400000).toISOString()]);
    summary.ownedNews.published7d=n(news?.published7d); summary.ownedNews.latestPublishedAt=news?.latestPublishedAt||null;
    if(summary.ownedNews.published7d===0){
      const sig='agency-news-stale';
      seen.add(sig);
      await openAlert(env,{signature:sig,severity:'warn',title:'BTMEDYA içerik ritmi durdu',detail:'Son 7 günde yayınlanan BTMEDYA haberi görünmüyor. Haber Merkezi veya içerik planı kontrol edilmeli.'});
    }

    const social=await q(env,`SELECT
      SUM(CASE WHEN status='planlandi' THEN 1 ELSE 0 END) queued,
      SUM(CASE WHEN status='planlandi' AND scheduled_at IS NOT NULL AND scheduled_at<=? THEN 1 ELSE 0 END) overdue,
      SUM(CASE WHEN status IN ('hata','failed','error') THEN 1 ELSE 0 END) failed
      FROM social_posts`,[started]);
    summary.social.queued=n(social?.queued); summary.social.overdue=n(social?.overdue); summary.social.failed=n(social?.failed);
    if(summary.social.overdue>0){
      const sig='agency-social-overdue';
      seen.add(sig);
      await openAlert(env,{signature:sig,severity:'warn',title:'Sosyal yayın kuyruğunda geciken işler var',detail:summary.social.overdue+' planlı paylaşımın zamanı geçmiş olabilir. Metricool bağlantısı ve sosyal kuyruğu kontrol edilmeli.'});
    }
    if(summary.social.failed>0){
      const sig='agency-social-failed';
      seen.add(sig);
      await openAlert(env,{signature:sig,severity:'error',title:'Sosyal yayın hataları var',detail:summary.social.failed+' paylaşım kaydında hata durumu bulunuyor.'});
    }

    const sales=await q(env,`SELECT COUNT(*) open,
      SUM(CASE WHEN next_action_at IS NOT NULL AND next_action_at<=? AND stage NOT IN ('won','lost') THEN 1 ELSE 0 END) due
      FROM sales_leads WHERE stage NOT IN ('won','lost')`,[started]);
    summary.sales.open=n(sales?.open); summary.sales.due=n(sales?.due);
    if(summary.sales.due>0){
      const sig='agency-sales-due';
      seen.add(sig);
      await openAlert(env,{signature:sig,severity:'warn',title:'Satış kuyruğunda takip zamanı gelen işler var',detail:summary.sales.due+' açık talebin sonraki aksiyon zamanı geçmiş durumda.'});
    }

    const refs=await q(env,`SELECT SUM(CASE WHEN visibility='public' THEN 1 ELSE 0 END) publicRefs FROM client_references`);
    summary.references.public=n(refs?.publicRefs);

    const media=await q(env,`SELECT COUNT(*) total,SUM(CASE WHEN COALESCE(ai_generated,0)=1 THEN 1 ELSE 0 END) ai FROM media`);
    summary.media.total=n(media?.total); summary.media.ai=n(media?.ai);

    if(summary.content.pendingApproval>0){
      const sig='agency-content-approval';
      seen.add(sig);
      await openAlert(env,{signature:sig,severity:'info',title:'Müşteri onayı bekleyen içerikler var',detail:summary.content.pendingApproval+' içerik henüz müşteri/ekip onayından geçmedi.'});
    }

    if(summary.clients.withoutRecentContent) summary.recommendations.push('İçerik ritmi zayıf müşteriler için haftalık içerik planı üret.');
    if(summary.content.pendingApproval) summary.recommendations.push('Bekleyen müşteri onaylarını tek tek tamamla; onaylanan işleri yayın kuyruğuna aktar.');
    if(summary.social.overdue || summary.social.failed) summary.recommendations.push('Sosyal yayın kuyruğundaki geciken/hatalı kayıtları kontrol et.');
    if(summary.sales.due) summary.recommendations.push('Takip zamanı gelen satış taleplerini bugün kapat.');
    if(!summary.ownedNews.published7d) summary.recommendations.push('BTMEDYA kendi yayın akışını yeniden besle: Haber Merkezi + Sabah Masası.');
    if(!summary.references.public) summary.recommendations.push('İzin verilen müşteri işlerini referans/vaka çalışmasına dönüştür.');
    await closeUnseenAlerts(env,seen);
    const count=await q(env,'SELECT COUNT(*) open FROM agency_alerts WHERE status=\'open\'');
    summary.alerts=n(count?.open);
    const finished=nowIso();
    await env.DB.prepare('INSERT INTO agency_supervisor_runs(id,started_at,finished_at,outcome,summary_json,error) VALUES(?,?,?,?,?,?)')
      .bind(runId,started,finished,'ok',JSON.stringify(summary),null).run().catch(()=>{});
    if(env.KV) await env.KV.put('agency:supervisor:last',JSON.stringify({runId,finished_at:finished,summary}),{expirationTtl:1209600}).catch(()=>{});
    return {ok:true,runId,finished_at:finished,summary,alerts:await listAgencyAlerts(env)};
  }catch(e){
    const finished=nowIso();
    await env.DB.prepare('INSERT INTO agency_supervisor_runs(id,started_at,finished_at,outcome,summary_json,error) VALUES(?,?,?,?,?,?)')
      .bind(runId,started,finished,'error',JSON.stringify(summary),String(e?.message||e).slice(0,800)).run().catch(()=>{});
    return {ok:false,runId,error:String(e?.message||e).slice(0,800),summary};
  }
}

export async function listAgencyAlerts(env){
  if(!env.DB)return [];
  const rows=await qall(env,`SELECT a.id,a.signature,a.severity,a.scope,a.client_id,a.title,a.detail,a.status,a.first_seen_at,a.last_seen_at,a.resolved_at,c.name client_name
    FROM agency_alerts a LEFT JOIN client_workspaces c ON c.id=a.client_id
    WHERE a.status='open' ORDER BY CASE a.severity WHEN 'error' THEN 0 WHEN 'warn' THEN 1 ELSE 2 END,a.last_seen_at DESC LIMIT 100`);
  return summarizeRows(rows.results||[]);
}

export async function agencySupervisorStatus(env){
  await ensureSupervisorTables(env);
  if(!env.DB)return {ok:false,error:'D1 veritabanı bağlı değil',summary:null,alerts:[]};
  let latest=null;
  const row=await q(env,'SELECT id,started_at,finished_at,outcome,summary_json,error FROM agency_supervisor_runs ORDER BY started_at DESC LIMIT 1');
  if(row){
    let summary={};try{summary=JSON.parse(row.summary_json||'{}')}catch{}
    latest={...row,summary};
  }
  const cached=env.KV?await env.KV.get('agency:supervisor:last').catch(()=>null):null;
  return {ok:true,heartbeat:cached?JSON.parse(cached):null,latest,alerts:await listAgencyAlerts(env)};
}

export async function agencySupervisorApi(request,env,url){
  if(!url.pathname.startsWith('/api/admin/agency-supervisor'))return null;
  const ok=await (async()=>{
    if(!env.ADMIN_SESSION_SECRET_SECRET)return false;
    const c=request.headers.get('cookie')||'',m=c.match(/bt_admin=([^;]+)/);if(!m)return false;
    const [p,s]=m[1].split('.');if(!p||!s)return false;
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.ADMIN_SESSION_SECRET_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const sig=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(p))))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    if(sig!==s)return false;try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(p.length/4)*4,'=')),c=>c.charCodeAt(0)))).exp>Date.now()}catch{return false}
  })();
  if(!ok)return j({ok:false,error:'Yetkisiz'},401);
  if(url.pathname==='/api/admin/agency-supervisor' && request.method==='GET')return j(await agencySupervisorStatus(env));
  if(url.pathname==='/api/admin/agency-supervisor/run' && request.method==='POST')return j(await runAgencySupervisor(env,{force:true}));
  return j({ok:false,error:'Agency Supervisor endpoint bulunamadı'},404);
}
