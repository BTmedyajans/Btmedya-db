CREATE TABLE IF NOT EXISTS social_direct_connections (
  id TEXT PRIMARY KEY,
  workspace_type TEXT NOT NULL DEFAULT 'client',
  workspace_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  account_name TEXT NOT NULL DEFAULT '',
  handle TEXT NOT NULL DEFAULT '',
  profile_url TEXT NOT NULL DEFAULT '',
  page_id TEXT NOT NULL DEFAULT '',
  ig_user_id TEXT NOT NULL DEFAULT '',
  access_token_cipher TEXT NOT NULL DEFAULT '',
  token_expires_at TEXT,
  scopes_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, external_id)
);
CREATE INDEX IF NOT EXISTS idx_social_direct_workspace ON social_direct_connections(workspace_type,workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_direct_provider ON social_direct_connections(provider,status);

CREATE TABLE IF NOT EXISTS social_direct_jobs (
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
CREATE INDEX IF NOT EXISTS idx_social_direct_jobs_due ON social_direct_jobs(status,scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_direct_jobs_connection ON social_direct_jobs(connection_id);
