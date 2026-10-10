-- Correct legacy taxonomy group keys to match the canonical public tree.
-- 0029 backfills older categories but used the generic "haber-bul"/"topic"
-- group for some items. Preserve unrelated/manual assignments and legacy category.
UPDATE content_taxonomy
SET group_key = 'balikesir',
    updated_at = CURRENT_TIMESTAMP
WHERE entity_type = 'news'
  AND item_key = 'balikesir'
  AND group_key = 'haber-bul'
  AND EXISTS (
    SELECT 1 FROM news n
    WHERE n.slug = content_taxonomy.entity_id
      AND (n.category IN ('Balıkesir','Yerel') OR n.category LIKE 'Yerel%')
  );

UPDATE content_taxonomy
SET group_key = 'haber-bul',
    updated_at = CURRENT_TIMESTAMP
WHERE entity_type = 'news'
  AND group_key = 'topic'
  AND item_key IN ('turkiye','dunya')
  AND EXISTS (
    SELECT 1 FROM news n
    WHERE n.slug = content_taxonomy.entity_id
      AND (
        n.category IN ('Türkiye','Türkiye Gündemi')
        OR n.category LIKE 'Türkiye%'
        OR n.category IN ('Dünya','Uluslararası')
        OR n.category LIKE 'Dünya%'
      )
  );
