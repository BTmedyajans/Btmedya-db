-- Mirrors the production Supabase migration 20261010015022_index_social_foreign_keys.
-- Indexes cover foreign-key columns used by workspace and publication queue joins.
CREATE INDEX IF NOT EXISTS content_items_workspace_id_idx
  ON social.content_items (workspace_id);
CREATE INDEX IF NOT EXISTS publication_logs_queue_id_idx
  ON social.publication_logs (queue_id);
CREATE INDEX IF NOT EXISTS publication_queue_account_id_idx
  ON social.publication_queue (account_id);
CREATE INDEX IF NOT EXISTS publication_queue_content_id_idx
  ON social.publication_queue (content_id);
