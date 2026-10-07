/* BTMEDYA ortak içerik taksonomisi.
   Eski news.category korunur; path/group/item yeni ortak dil olarak kaydedilir. */

export const CONTENT_TAXONOMY_FALLBACK={
  'Balıkesir':{path_key:'haber',group_key:'haber-bul',item_key:'balikesir'},
  'Marmara':{path_key:'haber',group_key:'haber-bul',item_key:'marmara'},
  'Türkiye':{path_key:'haber',group_key:'haber-bul',item_key:'turkiye'},
  'Dünya':{path_key:'haber',group_key:'haber-bul',item_key:'dunya'},
  'Gündem':{path_key:'haber',group_key:'haber-bul',item_key:'gundem'},
  'Ekonomi':{path_key:'haber',group_key:'haber-bul',item_key:'ekonomi'},
  'Eğitim':{path_key:'haber',group_key:'haber-bul',item_key:'egitim'},
  'Sağlık':{path_key:'haber',group_key:'haber-bul',item_key:'saglik'},
  'Spor':{path_key:'haber',group_key:'haber-bul',item_key:'spor'},
  'Kültür · Sanat':{path_key:'haber',group_key:'haber-bul',item_key:'kultur-sanat'},
  'Yaşam':{path_key:'haber',group_key:'haber-bul',item_key:'yasam'},
  'Teknoloji · AI':{path_key:'sosyal',group_key:'digital-growth',item_key:'ai-automation'},
  'Röportaj':{path_key:'haber',group_key:'derinles',item_key:'roportaj'},
  'Özel Dosya':{path_key:'haber',group_key:'derinles',item_key:'ozel-dosya'},
  'AI LAB':{path_key:'sosyal',group_key:'digital-growth',item_key:'ai-automation'},
  'Prodüksiyon':{path_key:'tanitim',group_key:'production',item_key:'foto-video'},
  'Medya':{path_key:'tanitim',group_key:'production',item_key:'foto-video'}
};

export async function ensureContentTaxonomy(env){
  if(!env?.DB)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS content_taxonomy (
    entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,path_key TEXT NOT NULL,
    group_key TEXT NOT NULL DEFAULT '',item_key TEXT NOT NULL DEFAULT '',
    secondary_json TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
    PRIMARY KEY(entity_type,entity_id)
  )`).run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_content_taxonomy_path ON content_taxonomy(path_key,group_key,item_key)').run().catch(()=>{});
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_content_taxonomy_item ON content_taxonomy(item_key)').run().catch(()=>{});
}

export function normalizeContentTaxonomy(input={},category='Gündem'){
  const fallback=CONTENT_TAXONOMY_FALLBACK[String(category||'')]||CONTENT_TAXONOMY_FALLBACK.Gündem;
  return {
    path_key:String(input.taxonomy_path||fallback.path_key||'').slice(0,60),
    group_key:String(input.taxonomy_group||fallback.group_key||'').slice(0,80),
    item_key:String(input.taxonomy_item||fallback.item_key||'').slice(0,100),
    secondary_json:Array.isArray(input.taxonomy_secondary)?JSON.stringify(input.taxonomy_secondary.slice(0,12)):'[]'
  };
}

export async function saveContentTaxonomy(env,entityType,entityId,meta){
  if(!env?.DB)return;
  await ensureContentTaxonomy(env);
  const now=new Date().toISOString();
  await env.DB.prepare(`INSERT INTO content_taxonomy(entity_type,entity_id,path_key,group_key,item_key,secondary_json,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(entity_type,entity_id) DO UPDATE SET
      path_key=excluded.path_key,group_key=excluded.group_key,item_key=excluded.item_key,
      secondary_json=excluded.secondary_json,updated_at=excluded.updated_at`)
    .bind(entityType,String(entityId),meta.path_key,meta.group_key,meta.item_key,meta.secondary_json,now,now).run().catch(()=>{});
}
