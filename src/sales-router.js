/* BTMEDYA Sales Desk
 * Lead capture + admin pipeline. D1-backed, same auth/session as Media Vault.
 */
const stages=['new','contacted','qualified','proposal','meeting','won','lost'];
const priorities=['low','normal','high'];
const j=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const session=async(request,secret)=>{
  if(!secret)return false;
  const c=request.headers.get('cookie')||''; const m=c.match(/bt_admin=([^;]+)/); if(!m)return false;
  const [p,s]=m[1].split('.'); if(!p||!s)return false;
  const bytes=new TextEncoder().encode(p);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  if(sig!==s)return false;
  try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(p.length/4)*4,'=')),c=>c.charCodeAt(0)))).exp>Date.now()}catch{return false}
};
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
export async function salesApi(request,env,url){
  if(!url.pathname.startsWith('/api/sales/')) return null;
  if(!env.DB)return j({ok:false,error:'CRM veritabanı bağlı değil'},503);
  if(url.pathname==='/api/sales/lead' && request.method==='POST'){
    const b=await request.json().catch(()=>null);
    if(!b||!clean(b.name,160)||!clean(b.message,4000)) return j({ok:false,error:'Ad ve proje açıklaması gerekli'},400);
    const now=new Date().toISOString(), id=crypto.randomUUID();
    const source=clean(b.source||'web',80);
    await env.DB.prepare('INSERT INTO sales_leads (id,contact_id,name,email,phone,company,service,budget,message,source,stage,priority,next_action,next_action_at,notes,consent,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id,b.contact_id?Number(b.contact_id):null,clean(b.name,160),clean(b.email,320),clean(b.phone,80),clean(b.company,180),clean(b.service,180),clean(b.budget,120),clean(b.message,4000),source,'new',clean(b.priority||'normal',20),clean(b.next_action,500),b.next_action_at||null,clean(b.notes,2000),b.consent?1:0,now,now).run();
    return j({ok:true,id,stage:'new',message:'Talebiniz satış kuyruğuna alındı.'},201);
  }
  if(!(await session(request,env.ADMIN_SESSION_SECRET_SECRET))) return j({ok:false,error:'Yetkisiz'},401);
  if(url.pathname==='/api/sales/leads' && request.method==='GET'){
    const stage=clean(url.searchParams.get('stage'),30), q=clean(url.searchParams.get('q'),120);
    let sql='SELECT * FROM sales_leads WHERE 1=1', binds=[];
    if(stage&&stages.includes(stage)){sql+=' AND stage=?';binds.push(stage)}
    if(q){sql+=' AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?)';const z='%'+q+'%';binds.push(z,z,z,z)}
    sql+=' ORDER BY CASE priority WHEN "high" THEN 0 WHEN "normal" THEN 1 ELSE 2 END, COALESCE(next_action_at,created_at) ASC LIMIT 200';
    const r=await env.DB.prepare(sql).bind(...binds).all();
    const counts=await env.DB.prepare('SELECT stage,COUNT(*) count FROM sales_leads GROUP BY stage').all();
    return j({ok:true,items:r.results||[],counts:counts.results||[],stages});
  }
  const m=url.pathname.match(/^\/api\/sales\/lead\/([^/]+)$/);
  if(m){
    const id=m[1];
    if(request.method==='PATCH'){
      const b=await request.json().catch(()=>null); if(!b)return j({ok:false,error:'Geçersiz JSON'},400);
      const fields=[],vals=[];
      const map={name:160,email:320,phone:80,company:180,service:180,budget:120,message:4000,priority:20,next_action:500,notes:2000,source:80};
      for(const [k,n] of Object.entries(map)) if(k in b){fields.push(k+'=?');vals.push(clean(b[k],n))}
      if('stage' in b){if(!stages.includes(b.stage))return j({ok:false,error:'Geçersiz aşama'},400);fields.push('stage=?');vals.push(b.stage)}
      if('next_action_at' in b){fields.push('next_action_at=?');vals.push(b.next_action_at||null)}
      if(!fields.length)return j({ok:false,error:'Değişiklik yok'},400);
      fields.push('updated_at=?');vals.push(new Date().toISOString());vals.push(id);
      await env.DB.prepare('UPDATE sales_leads SET '+fields.join(',')+' WHERE id=?').bind(...vals).run();
      return j({ok:true,id});
    }
    if(request.method==='DELETE'){
      await env.DB.prepare('DELETE FROM sales_leads WHERE id=?').bind(id).run();
      return j({ok:true,id});
    }
  }
  return j({ok:false,error:'Sales endpoint bulunamadı'},404);
}
