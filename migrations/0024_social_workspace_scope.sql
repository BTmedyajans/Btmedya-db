-- BTMEDYA Social OS: accounts belong to a workspace.
-- Rebuild the connection table so the same external account can be
-- intentionally attached to different workspaces without global collisions.
PRAGMA foreign_keys=OFF;

-- Replacing the parent connection table may cascade-delete queued publications
-- in D1 even when foreign_keys is toggled inside a migration batch. Keep an
-- independent copy and restore it after the parent has been renamed.
CREATE TABLE social_direct_jobs__scope_backup AS SELECT * FROM social_direct_jobs;

CREATE TABLE IF NOT EXISTS social_direct_connections_v2 (
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
  UNIQUE(workspace_type, workspace_id, provider, external_id)
);

INSERT OR IGNORE INTO social_direct_connections_v2
SELECT id,workspace_type,workspace_id,provider,external_id,account_name,handle,profile_url,
       page_id,ig_user_id,access_token_cipher,token_expires_at,scopes_json,status,last_error,
       created_at,updated_at
FROM social_direct_connections;

DROP TABLE social_direct_connections;
ALTER TABLE social_direct_connections_v2 RENAME TO social_direct_connections;

INSERT OR IGNORE INTO social_direct_jobs SELECT * FROM social_direct_jobs__scope_backup;
DROP TABLE social_direct_jobs__scope_backup;

CREATE INDEX IF NOT EXISTS idx_social_direct_workspace ON social_direct_connections(workspace_type,workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_direct_provider ON social_direct_connections(provider,status);
CREATE INDEX IF NOT EXISTS idx_social_direct_workspace_provider
  ON social_direct_connections(workspace_type,workspace_id,provider,status);

PRAGMA foreign_keys=ON;