/* BTMEDYA sosyal içerik kalıcı tekilleştirme katmanı. */
function norm(s){return String(s||'').toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim();}
async function hash(v){
  const b=new TextEncoder().encode(String(v||''));
  const d=await crypto.subtle.digest('SHA-256',b);
  return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,40);
}
export async function ensureSosyalParmakTablosu(env){
  if(!env.DB) return false;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sosyal_parmak_izleri (
    fingerprint TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    source_slug TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`).run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sosyal_parmak_source ON sosyal_parmak_izleri(source_slug)').run().catch(()=>{});
  return true;
}
export async function sosyalParmakIzi(input={}){
  const platformlar=Array.isArray(input.platforms)?[...input.platforms].map(x=>String(x).toLowerCase()).sort():[];
  const raw=[
    norm(input.source_slug),
    norm(input.title),
    norm(input.body),
    norm(input.format),
    norm(input.account_scope||'company'),
    norm(input.metricool_brand_id||''),
    platformlar.join(',')
  ].join('|');
  return hash(raw);
}
export async function sosyalTekillemeAyir(env,input={}){
  if(!env.DB) return {allowed:true,fingerprint:''};
  await ensureSosyalParmakTablosu(env);
  const fingerprint=await sosyalParmakIzi(input);
  const row=await env.DB.prepare('SELECT post_id FROM sosyal_parmak_izleri WHERE fingerprint=?').bind(fingerprint).first().catch(()=>null);
  if(row) return {allowed:false,fingerprint,existing_post_id:String(row.post_id)};
  await env.DB.prepare('INSERT OR IGNORE INTO sosyal_parmak_izleri(fingerprint,post_id,source_slug,created_at) VALUES(?,?,?,?)')
    .bind(fingerprint,String(input.post_id||''),String(input.source_slug||''),new Date().toISOString()).run();
  return {allowed:true,fingerprint};
}
export async function sosyalTekillemeBirak(env,fingerprint){
  if(!env.DB || !fingerprint) return;
  await ensureSosyalParmakTablosu(env);
  await env.DB.prepare('DELETE FROM sosyal_parmak_izleri WHERE fingerprint=?').bind(fingerprint).run().catch(()=>{});
}
export async function sosyalTekillemeBagla(env,fingerprint,postId,sourceSlug=''){
  if(!env.DB||!fingerprint||!postId) return;
  await ensureSosyalParmakTablosu(env);
  await env.DB.prepare('UPDATE sosyal_parmak_izleri SET post_id=?,source_slug=? WHERE fingerprint=?')
    .bind(String(postId),String(sourceSlug||''),fingerprint).run().catch(()=>{});
}
