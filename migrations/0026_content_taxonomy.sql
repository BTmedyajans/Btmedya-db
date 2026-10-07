-- BTMEDYA shared taxonomy assignments.
-- Keeps the legacy news.category field for compatibility while recording
-- customer-facing path/group/item semantics for admin, public and automation.
CREATE TABLE IF NOT EXISTS content_taxonomy (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  path_key TEXT NOT NULL,
  group_key TEXT NOT NULL DEFAULT '',
  item_key TEXT NOT NULL DEFAULT '',
  secondary_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_content_taxonomy_path
  ON content_taxonomy(path_key, group_key, item_key);
CREATE INDEX IF NOT EXISTS idx_content_taxonomy_item
  ON content_taxonomy(item_key);
