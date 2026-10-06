/* BTMEDYA CORE
 * Cloudflare-native internal operating layer.
 * D1 = state, R2 = media, KV = cache/locks.
 * External CRM/social/design providers are adapters, not the system of record.
 * Secrets never belong in D1.
 */
const now=()=>new Date().toISOString();
const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const oturumAnahtari=env=>{const x=env?.ADMIN_SESSION_SECRET_SECRET||env?.ADMIN_SESSION_SECRET||'';return x?(env?.MEDIA_SIGNING_SECRET?x+'\u0000'+env.MEDIA_SIGNING_SECRET:x):''};

export async function ensureBtmedyaCore(env){
  if(!env?.DB) return {ok:false,reason:"D1 yok"};
  const sql=[
    `CREATE TABLE IF NOT EXISTS bt_core_workspaces (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS bt_core_users (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin', status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(workspace_id,email)
    )`,
    `CREATE TABLE IF NOT EXISTS bt_core_content (
      id TEXT PRIMARY KEY, workspace_id TEXT, title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '', content_type TEXT NOT NULL DEFAULT 'social',
      status TEXT NOT NULL DEFAULT 'draft', approval_required INTEGER NOT NULL DEFAULT 1,
      approved_at TEXT, published_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS bt_core_publications (
      id TEXT PRIMARY KEY, content_id TEXT NOT NULL, network TEXT NOT NULL,
      scheduled_at TEXT, status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0,
      provider_id TEXT NOT NULL DEFAULT '', error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS bt_core_events (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, entity_type TEXT NOT NULL DEFAULT '',
      entity_id TEXT NOT NULL DEFAULT '', payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS bt_core_integrations (
      id TEXT PRIMARY KEY, workspace_id TEXT, provider TEXT NOT NULL, capability TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'disabled', external_ref TEXT NOT NULL DEFAULT '',
      config_json TEXT NOT NULL DEFAULT '{}', last_sync_at TEXT, last_error TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(workspace_id,provider,capability)
    )`,
    `CREATE TABLE IF NOT EXISTS bt_core_jobs (
      id TEXT PRIMARY KEY, job_type TEXT NOT NULL, entity_type TEXT NOT NULL DEFAULT '',
      entity_id TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'queued',
      run_after TEXT, attempts INTEGER NOT NULL DEFAULT 0, payload_json TEXT NOT NULL DEFAULT '{}',
      last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS bt_core_audit (
      id TEXT PRIMARY KEY, actor_type TEXT NOT NULL DEFAULT 'system', actor_id TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL, entity_type TEXT NOT NULL DEFAULT '', entity_id TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_bt_core_content_status ON bt_core_content(status,updated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_bt_core_publications_due ON bt_core_publications(status,scheduled_at)`,
    `CREATE INDEX IF NOT EXISTS idx_bt_core_publications_content ON bt_core_publications(content_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bt_core_events_type ON bt_core_events(type,created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_bt_core_integrations_status ON bt_core_integrations(status,provider)`,
    `CREATE INDEX IF NOT EXISTS idx_bt_core_jobs_due ON bt_core_jobs(status,run_after)`,
    `CREATE INDEX IF NOT EXISTS idx_bt_core_audit_entity ON bt_core_audit(entity_type,entity_id,created_at)`
  ];
  for(const q of sql) await env.DB.prepare(q).run();
  return {ok:true,tables:8};
}

export async function btmedyaCoreApi(request,env,url,validSession){
  if(!url.pathname.startsWith("/api/admin/core")) return null;
  if(!(await validSession(request,oturumAnahtari(env)))) return j({ok:false,error:"Yetkisiz"},401);
  if(!env.DB) return j({ok:false,error:"D1 yapılandırılmadı"},503);
  await ensureBtmedyaCore(env);

  if(url.pathname==="/api/admin/core" && request.method==="GET"){
    const [c,p,e,w,i,jobs,audit]=await Promise.all([
      env.DB.prepare("SELECT COUNT(*) total FROM bt_core_content").first(),
      env.DB.prepare("SELECT COUNT(*) total FROM bt_core_publications WHERE status IN ('queued','scheduled')").first(),
      env.DB.prepare("SELECT COUNT(*) total FROM bt_core_events WHERE created_at>?").bind(new Date(Date.now()-86400000).toISOString()).first(),
      env.DB.prepare("SELECT COUNT(*) total FROM bt_core_workspaces WHERE status='active'").first(),
      env.DB.prepare("SELECT COUNT(*) total FROM bt_core_integrations WHERE status='active'").first(),
      env.DB.prepare("SELECT COUNT(*) total FROM bt_core_jobs WHERE status IN ('queued','running')").first(),
      env.DB.prepare("SELECT COUNT(*) total FROM bt_core_audit WHERE created_at>?").bind(new Date(Date.now()-86400000).toISOString()).first()
    ]);
    return j({ok:true,core:"BTMEDYA Core OS",storage:{d1:true,r2:Boolean(env.MEDIA),kv:Boolean(env.KV),workflows:Boolean(env.BTMEDYA_WORKFLOW),ai:Boolean(env.AI)},counts:{
      content:Number(c?.total||0),queued:Number(p?.total||0),events24h:Number(e?.total||0),
      workspaces:Number(w?.total||0),activeIntegrations:Number(i?.total||0),
      activeJobs:Number(jobs?.total||0),audit24h:Number(audit?.total||0)
    },architecture:{
      sourceOfTruth:"D1",
      media:"R2",
      cacheAndLocks:"KV",
      durableWorkflows:"Cloudflare Workflows + Durable Objects",
      automation:"Worker Cron",
      deliveryAdapters:["Metricool","web","future providers"]
    },generated_at:now()});
  }

  if(url.pathname==="/api/admin/core/bootstrap" && request.method==="POST"){
    const existing=await env.DB.prepare("SELECT id FROM bt_core_workspaces WHERE slug='btmedya' LIMIT 1").first();
    if(existing) return j({ok:true,created:false,id:existing.id});
    const id=crypto.randomUUID(),t=now();
    await env.DB.prepare("INSERT INTO bt_core_workspaces(id,name,slug,status,created_at,updated_at) VALUES(?,?,?,?,?,?)")
      .bind(id,"BTMEDYA","btmedya","active",t,t).run();
    await env.DB.prepare("INSERT INTO bt_core_users(id,workspace_id,email,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),id,String(env.ADMIN_USERNAME||"admin"),"owner","active",t,t).run();
    await env.DB.prepare("INSERT INTO bt_core_events(id,type,entity_type,entity_id,payload_json,created_at) VALUES(?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),"core.bootstrap","workspace",id,JSON.stringify({source:"btmedya-core-os"}),t).run();
    await env.DB.prepare("INSERT INTO bt_core_audit(id,actor_type,actor_id,action,entity_type,entity_id,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),"system","bootstrap","core.bootstrap","workspace",id,JSON.stringify({source:"btmedya-core-os"}),t).run();
    return j({ok:true,created:true,id},201);
  }
  return j({ok:false,error:"Core endpoint bulunamadı"},404);
}
