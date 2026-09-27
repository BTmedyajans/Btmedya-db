const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS integration_credentials (
  service TEXT PRIMARY KEY,
  secret_ciphertext TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
)`;

function b64url(bytes){
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
}

function unb64url(s){
  let v=String(s||'').replace(/-/g,'+').replace(/_/g,'/');
  while(v.length%4)v+='=';
  return Uint8Array.from(atob(v),c=>c.charCodeAt(0));
}

async function keyFor(env){
  const secret=String(env.METRICOOL_CREDENTIALS_KEY||env.ADMIN_SESSION_SECRET_SECRET||'');
  if(!secret) throw new Error('Metricool credential encryption key eksik');
  const digest=await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('BTMEDYA-METRICOOL-CREDENTIALS-v1:'+secret)
  );
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);
}

async function encryptSecret(env,value){
  const key=await keyFor(env);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=await crypto.subtle.encrypt(
    {name:'AES-GCM',iv},
    key,
    new TextEncoder().encode(String(value))
  );
  return 'v1.'+b64url(iv)+'.'+b64url(data);
}

async function decryptSecret(env,ciphertext){
  const [version,ivPart,dataPart]=String(ciphertext||'').split('.');
  if(version!=='v1'||!ivPart||!dataPart) throw new Error('Metricool credential format geçersiz');
  const key=await keyFor(env);
  const plain=await crypto.subtle.decrypt(
    {name:'AES-GCM',iv:unb64url(ivPart)},
    key,
    unb64url(dataPart)
  );
  return new TextDecoder().decode(plain);
}

async function ensureTable(env){
  if(!env.DB) throw new Error('D1 bağlantısı yok');
  await env.DB.prepare(TABLE_SQL).run();
}

export async function readMetricoolCredential(env){
  if(env.METRICOOL_USER_TOKEN){
    return {
      token:String(env.METRICOOL_USER_TOKEN),
      userId:String(env.METRICOOL_USER_ID||'5278969'),
      brandId:String(env.METRICOOL_BRAND_ID||'6858384'),
      timezone:String(env.METRICOOL_TIMEZONE||'Europe/Istanbul'),
      creatorEmail:String(env.METRICOOL_CREATOR_EMAIL||'')
    };
  }
  if(!env.DB) return null;
  await ensureTable(env);
  const row=await env.DB.prepare(
    "SELECT secret_ciphertext, metadata_json, updated_at FROM integration_credentials WHERE service='metricool'"
  ).first().catch(()=>null);
  if(!row) return null;
  try{
    const meta=JSON.parse(String(row.metadata_json||'{}'));
    return {
      token:await decryptSecret(env,row.secret_ciphertext),
      userId:String(meta.userId||'5278969'),
      brandId:String(meta.brandId||'6858384'),
      timezone:String(meta.timezone||'Europe/Istanbul'),
      creatorEmail:String(meta.creatorEmail||''),
      updatedAt:String(row.updated_at||'')
    };
  }catch(e){
    console.warn('[metricool] credential decrypt failed',e?.message||e);
    return null;
  }
}

export async function saveMetricoolCredential(env,{token,userId='5278969',brandId='6858384',timezone='Europe/Istanbul',creatorEmail=''}){
  if(!token) throw new Error('Metricool token boş');
  await ensureTable(env);
  const ciphertext=await encryptSecret(env,token);
  const meta=JSON.stringify({
    userId:String(userId||'5278969'),
    brandId:String(brandId||'6858384'),
    timezone:String(timezone||'Europe/Istanbul'),
    creatorEmail:String(creatorEmail||'')
  });
  await env.DB.prepare(
    `INSERT INTO integration_credentials(service,secret_ciphertext,metadata_json,updated_at)
     VALUES('metricool',?,?,?)
     ON CONFLICT(service) DO UPDATE SET
       secret_ciphertext=excluded.secret_ciphertext,
       metadata_json=excluded.metadata_json,
       updated_at=excluded.updated_at`
  ).bind(ciphertext,meta,new Date().toISOString()).run();
  return {ok:true,updatedAt:new Date().toISOString()};
}

export async function deleteMetricoolCredential(env){
  if(!env.DB) return {ok:true,removed:false};
  await ensureTable(env);
  const r=await env.DB.prepare(
    "DELETE FROM integration_credentials WHERE service='metricool'"
  ).run();
  return {ok:true,removed:Number(r.meta?.changes||0)>0};
}

export function maskMetricoolToken(token){
  const t=String(token||'');
  if(!t) return '';
  if(t.length<=8) return '••••••••';
  return t.slice(0,4)+'••••••••'+t.slice(-4);
}

export async function verifyMetricoolCredential({token,userId,brandId,apiBase='https://app.metricool.com'}){
  const base=String(apiBase||'https://app.metricool.com').replace(/\\/$/,'');
  const endpoint=`${base}/api/admin/simpleProfiles?userId=${encodeURIComponent(String(userId))}`;
  const res=await fetch(endpoint,{
    method:'GET',
    headers:{'X-Mc-Auth':String(token),'Accept':'application/json'}
  });
  const raw=await res.text();
  let data=null;
  try{ data=JSON.parse(raw); }catch{}
  if(!res.ok){
    return {
      ok:false,
      status:res.status,
      error:typeof data==='object'&&data?JSON.stringify(data):raw.slice(0,500)
    };
  }
  const brands=Array.isArray(data?.data)?data.data:Array.isArray(data)?data:[];
  const wanted=String(brandId||'');
  const found=brands.some(x=>String(x?.id??x?.blogId??x?.blog_id??'')===wanted);
  return {
    ok:true,
    status:res.status,
    brandFound:found,
    brands:brands.map(x=>({id:String(x?.id??x?.blogId??''),label:String(x?.label??x?.name??'')})).slice(0,50)
  };
}
