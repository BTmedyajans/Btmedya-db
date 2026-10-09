-- Backfill canonical taxonomy links for legacy news rows.
-- Existing explicit mappings win; legacy news.category is left unchanged for compatibility.
INSERT OR IGNORE INTO content_taxonomy (
  entity_type, entity_id, path_key, group_key, item_key,
  secondary_json, created_at, updated_at
)
SELECT
  'news',
  n.slug,
  'haber',
  CASE
    WHEN n.category IN ('Balıkesir','Yerel') OR n.category LIKE 'Yerel%' THEN 'haber-bul'
    ELSE 'topic'
  END,
  CASE
    WHEN n.category IN ('Balıkesir','Yerel') OR n.category LIKE 'Yerel%' THEN 'balikesir'
    WHEN n.category IN ('Türkiye','Türkiye Gündemi') OR n.category LIKE 'Türkiye%' THEN 'turkiye'
    WHEN n.category IN ('Dünya','Uluslararası') OR n.category LIKE 'Dünya%' THEN 'dunya'
    WHEN n.category LIKE 'Ekonomi%' OR n.category LIKE 'Tarım%' THEN 'ekonomi'
    WHEN n.category IN ('Kültür','Kültür-Sanat') OR n.category LIKE 'Kültür%' OR n.category LIKE 'Gastronomi%' OR n.category LIKE 'Etkinlik%' THEN 'kultur-sanat'
    WHEN n.category LIKE 'Eğitim%' THEN 'egitim'
    WHEN n.category LIKE 'Sağlık%' THEN 'saglik'
    WHEN n.category LIKE 'Spor%' THEN 'spor'
    WHEN n.category LIKE 'Teknoloji%' OR n.category LIKE 'Yapay Zekâ%' OR n.category LIKE 'Yapay Zeka%' OR n.category='AI' THEN 'teknoloji-ai'
    WHEN n.category LIKE 'Yaşam%' OR n.category LIKE 'İnsan Hikâyesi%' OR n.category LIKE 'Moda%' OR n.category LIKE 'Düğün%' THEN 'yasam'
    ELSE 'gundem'
  END,
  '[]',
  COALESCE(n.created_at, CURRENT_TIMESTAMP),
  COALESCE(n.updated_at, n.created_at, CURRENT_TIMESTAMP)
FROM news n
WHERE COALESCE(n.slug,'') <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM content_taxonomy t
    WHERE t.entity_type='news' AND t.entity_id=n.slug
  );
