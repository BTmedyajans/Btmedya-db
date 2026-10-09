-- BTMEDYA Native Social OS: traceability for automated/manual queue items.
-- Rebuild form is idempotent with the runtime self-heal and also works when
-- 0024/0025 are applied by Wrangler in one migration pass.
PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS social_direct_jobs_v2 (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  media_key TEXT NOT NULL DEFAULT '',
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  external_id TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  source_slug TEXT NOT NULL DEFAULT '',
  content_hash TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(connection_id) REFERENCES social_direct_connections(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO social_direct_jobs_v2
  (id,connection_id,title,body,media_key,scheduled_at,status,attempts,external_id,last_error,source_slug,content_hash,kind,created_at,updated_at)
SELECT
  id,connection_id,title,body,media_key,scheduled_at,status,attempts,external_id,last_error,source_slug,content_hash,kind,created_at,updated_at
FROM social_direct_jobs;

DROP TABLE social_direct_jobs;
ALTER TABLE social_direct_jobs_v2 RENAME TO social_direct_jobs;

CREATE INDEX IF NOT EXISTS idx_social_direct_jobs_due
  ON social_direct_jobs(status,scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_direct_jobs_connection
  ON social_direct_jobs(connection_id);
CREATE INDEX IF NOT EXISTS idx_social_direct_jobs_source
  ON social_direct_jobs(connection_id,source_slug,content_hash);

PRAGMA foreign_keys=ON;

-- Migration trigger revalidation: native social queue schema must be present in production.
