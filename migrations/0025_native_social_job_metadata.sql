-- BTMEDYA Native Social OS: traceability for automated/manual queue items.
ALTER TABLE social_direct_jobs ADD COLUMN source_slug TEXT NOT NULL DEFAULT '';
ALTER TABLE social_direct_jobs ADD COLUMN content_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE social_direct_jobs ADD COLUMN kind TEXT NOT NULL DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS idx_social_direct_jobs_source
  ON social_direct_jobs(connection_id, source_slug, content_hash);

-- Migration trigger revalidation: native social queue schema must be present in production.
