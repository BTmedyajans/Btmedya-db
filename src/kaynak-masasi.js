/* BTMEDYA Kaynak Masası — kalıcı kaynak kaydı ve provenance katmanı. */
const KAYNAK_KATMANLARI = new Set(['official','publisher','discovery','competitor','archive','open-data','open-license-media','btmedya','other']);
const KAYNAK_DURUMLARI = new Set(['active','review','blocked']);
const KATMAN_PUANI = {
  official:95,publisher:88,btmedya:92,'open-data':90,archive:82,'open-license-media':78,
  discovery:55,competitor:45,other:40
};
const BALIKESIR_ILCELERI = [
  'Altıeylül','Ayvalık','Balya','Bandırma','Bigadiç','Burhaniye','Dursunbey','Edremit','Erdek',
  'Gömeç','Gönen','Havran','İvrindi','Karesi','Kepsut','Manyas','Marmara','Savaştepe','Sındırgı','Susurluk'
];

export const kaynakKatmanlari = [...KAYNAK_KATMANLARI];
export const kaynakDurumlari = [...KAYNAK_DURUMLARI];

function now(){ return new Date().toISOString(); }
export function kaynakUrlNorm(url){
  try{
    const u=new URL(String(url||'').trim());
    if(!/^https?:$/.test(u.protocol)) return '';
    u.hash='';
    u.hostname=u.hostname.toLowerCase().replace(/^www\./,'www.');
    if(u.pathname.length>1) u.pathname=u.pathname.replace(/\/+$/,'');
    return u.toString();
  }catch{return '';}
}
function hostBul(url){ try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''} }
function metinNorm(s){
  return String(s||'').toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g,'i').replace(/[şŞ]/g,'s').replace(/[ğĞ]/g,'g').replace(/[üÜ]/g,'u').replace(/[öÖ]/g,'o').replace(/[çÇ]/g,'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
}
async function kimlik(metin){
  const data=new TextEncoder().encode(String(metin||''));
  const digest=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,32);
}
function guvenPuani(kat,score){
  const temel=KATMAN_PUANI[kat] ?? 40;
  const aday=Number(score);
  return Number.isFinite(aday) && aday>0 ? Math.max(0,Math.min(100,Math.round((temel+aday)/2))) : temel;
}
export function ilceBul(metin){
  const n=metinNorm(metin);
  return BALIKESIR_ILCELERI.find(x=>n.includes(metinNorm(x))) || '';
}

export async function ensureKaynakMasasiTables(env){
  if(!env.DB) return false;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS kaynak_kayitlari (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    host TEXT NOT NULL DEFAULT '',
    publisher TEXT NOT NULL DEFAULT '',
    tier TEXT NOT NULL DEFAULT 'discovery',
    category TEXT NOT NULL DEFAULT '',
    district TEXT NOT NULL DEFAULT '',
    license_note TEXT NOT NULL DEFAULT '',
    trust_score INTEGER NOT NULL DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'review',
    notes TEXT NOT NULL DEFAULT '',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    seen_count INTEGER NOT NULL DEFAULT 1,
    verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS kaynak_baglantilari (
    source_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'source',
    created_at TEXT NOT NULL,
    PRIMARY KEY(source_id,entity_type,entity_id,role)
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_kaynak_tier_status ON kaynak_kayitlari(tier,status,trust_score DESC,last_seen_at DESC)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_kaynak_host ON kaynak_kayitlari(host)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_kaynak_baglanti_entity ON kaynak_baglantilari(entity_type,entity_id)').run().catch(()=>{});
  return true;
}

export async function kaynakKaydet(env,input={}){
  if(!env.DB) return null;
  const url=kaynakUrlNorm(input.url);
  if(!url) return null;
  await ensureKaynakMasasiTables(env);
  const id=await kimlik(url);
  const tier=KAYNAK_KATMANLARI.has(String(input.tier||''))?String(input.tier):'discovery';
  const status=KAYNAK_DURUMLARI.has(String(input.status||''))?String(input.status):'review';
  const publisher=String(input.publisher||'').trim().slice(0,240);
  const host=hostBul(url);
  const category=String(input.category||'').trim().slice(0,120);
  const district=String(input.district||ilceBul(String(input.title||'')+' '+String(input.text||''))).trim().slice(0,80);
  const license=String(input.license_note||'').trim().slice(0,500);
  const trust=guvenPuani(tier,input.score);
  const notes=String(input.notes||'').trim().slice(0,2000);
  const t=now();
  await env.DB.prepare(`INSERT INTO kaynak_kayitlari
    (id,url,host,publisher,tier,category,district,license_note,trust_score,status,notes,first_seen_at,last_seen_at,seen_count,verified_at,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?,?)
    ON CONFLICT(url) DO UPDATE SET
      publisher=CASE WHEN excluded.publisher<>'' THEN excluded.publisher ELSE kaynak_kayitlari.publisher END,
      category=CASE WHEN excluded.category<>'' THEN excluded.category ELSE kaynak_kayitlari.category END,
      district=CASE WHEN excluded.district<>'' THEN excluded.district ELSE kaynak_kayitlari.district END,
      license_note=CASE WHEN excluded.license_note<>'' THEN excluded.license_note ELSE kaynak_kayitlari.license_note END,
      trust_score=MAX(kaynak_kayitlari.trust_score,excluded.trust_score),
      last_seen_at=excluded.last_seen_at,
      seen_count=kaynak_kayitlari.seen_count+1,
      updated_at=excluded.updated_at`)
    .bind(id,url,host,publisher,tier,category,district,license,trust,status,notes,t,t,1,null,t,t).run();
  return {...await env.DB.prepare('SELECT * FROM kaynak_kayitlari WHERE id=?').bind(id).first(),id};
}

export async function kaynakBagla(env,{url,sourceId,entityType,entityId,role='source'}={}){
  if(!env.DB || !entityType || !entityId) return null;
  await ensureKaynakMasasiTables(env);
  let id=String(sourceId||'').trim();
  if(!id && url){
    const norm=kaynakUrlNorm(url);
    if(norm) id=(await env.DB.prepare('SELECT id FROM kaynak_kayitlari WHERE url=?').bind(norm).first().catch(()=>null))?.id || '';
  }
  if(!id) return null;
  await env.DB.prepare('INSERT OR IGNORE INTO kaynak_baglantilari(source_id,entity_type,entity_id,role,created_at) VALUES(?,?,?,?,?)')
    .bind(id,String(entityType).slice(0,40),String(entityId).slice(0,180),String(role).slice(0,40),now()).run();
  return id;
}

export async function kaynakBaglaHaber(env,sourceUrl,slug){
  if(!sourceUrl || !slug) return null;
  const n=kaynakUrlNorm(sourceUrl);
  if(!n) return null;
  const isBt=hostBul(n)==='btmedya.com.tr';
  await kaynakKaydet(env,{url:n,tier:isBt?'btmedya':'publisher',publisher:isBt?'BTMEDYA':'BTMEDYA Haber Merkezi',status:isBt?'active':'review'});
  return kaynakBagla(env,{url:n,entityType:'news',entityId:slug,role:'original-source'});
}

export async function kaynakListele(env,{q='',status='',tier='',limit=80}={}){
  if(!env.DB) return {items:[],counts:{total:0,active:0,review:0,blocked:0}};
  await ensureKaynakMasasiTables(env);
  const n=Math.max(1,Math.min(200,Number(limit)||80));
  const args=[]; const where=[];
  if(q){where.push('(url LIKE ? OR host LIKE ? OR publisher LIKE ? OR category LIKE ? OR district LIKE ?)');const x='%'+String(q).slice(0,120)+'%';args.push(x,x,x,x,x);}
  if(KAYNAK_DURUMLARI.has(status)){where.push('status=?');args.push(status);}
  if(KAYNAK_KATMANLARI.has(tier)){where.push('tier=?');args.push(tier);}
  let sql=`SELECT k.*,(SELECT COUNT(*) FROM kaynak_baglantilari b WHERE b.source_id=k.id) AS link_count
    FROM kaynak_kayitlari k`;
  if(where.length) sql+=' WHERE '+where.join(' AND ');
  sql+=' ORDER BY k.trust_score DESC,k.last_seen_at DESC LIMIT ?'; args.push(n);
  const rows=await env.DB.prepare(sql).bind(...args).all().catch(()=>({results:[]}));
  const counts=await env.DB.prepare(`SELECT COUNT(*) total,
    SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) active,
    SUM(CASE WHEN status='review' THEN 1 ELSE 0 END) review,
    SUM(CASE WHEN status='blocked' THEN 1 ELSE 0 END) blocked
    FROM kaynak_kayitlari`).first().catch(()=>({total:0,active:0,review:0,blocked:0}));
  return {items:rows.results||[],counts:{total:Number(counts?.total||0),active:Number(counts?.active||0),review:Number(counts?.review||0),blocked:Number(counts?.blocked||0)}};
}

export async function kaynakGuncelle(env,id,patch={}){
  if(!env.DB || !id) return null;
  await ensureKaynakMasasiTables(env);
  const current=await env.DB.prepare('SELECT * FROM kaynak_kayitlari WHERE id=?').bind(String(id)).first();
  if(!current) return null;
  const fields={
    tier:KAYNAK_KATMANLARI.has(String(patch.tier||''))?String(patch.tier):current.tier,
    status:KAYNAK_DURUMLARI.has(String(patch.status||''))?String(patch.status):current.status,
    category:String(patch.category??current.category).slice(0,120),
    district:String(patch.district??current.district).slice(0,80),
    license_note:String(patch.license_note??current.license_note).slice(0,500),
    notes:String(patch.notes??current.notes).slice(0,2000),
    trust_score:Math.max(0,Math.min(100,Number.isFinite(Number(patch.trust_score))?Number(patch.trust_score):Number(current.trust_score||50))),
    publisher:String(patch.publisher??current.publisher).slice(0,240)
  };
  const verified=(fields.status==='active' && !current.verified_at)?now():current.verified_at;
  await env.DB.prepare('UPDATE kaynak_kayitlari SET publisher=?,tier=?,category=?,district=?,license_note=?,trust_score=?,status=?,notes=?,verified_at=?,updated_at=? WHERE id=?')
    .bind(fields.publisher,fields.tier,fields.category,fields.district,fields.license_note,fields.trust_score,fields.status,fields.notes,verified,now(),String(id)).run();
  return env.DB.prepare('SELECT * FROM kaynak_kayitlari WHERE id=?').bind(String(id)).first();
}

export async function kaynakOzeti(env){
  if(!env.DB) return {total:0};
  await ensureKaynakMasasiTables(env);
  const rows=await env.DB.prepare('SELECT tier,COUNT(*) total,AVG(trust_score) avg_trust,MAX(last_seen_at) last_seen FROM kaynak_kayitlari GROUP BY tier ORDER BY total DESC').all().catch(()=>({results:[]}));
  return {total:(await env.DB.prepare('SELECT COUNT(*) c FROM kaynak_kayitlari').first().catch(()=>({c:0})))?.c||0,byTier:rows.results||[]};
}
