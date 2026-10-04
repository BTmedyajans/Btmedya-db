-- BTMEDYA Core OS v1
-- Cloudflare-native internal infrastructure.
-- Secrets never belong in D1; only provider metadata and operational state do.

CREATE TABLE IF NOT EXISTS bt_core_workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bt_core_users (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_id,email)
);

CREATE TABLE IF NOT EXISTS bt_core_content (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'social',
  status TEXT NOT NULL DEFAULT 'draft',
  approval_required INTEGER NOT NULL DEFAULT 1,
  approved_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bt_core_publications (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  network TEXT NOT NULL,
  scheduled_at TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_id TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bt_core_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bt_core_integrations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  provider TEXT NOT NULL,
  capability TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disabled',
  external_ref TEXT NOT NULL DEFAULT '',
  config_json TEXT NOT NULL DEFAULT '{}',
  last_sync_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_id,provider,capability)
);

CREATE TABLE IF NOT EXISTS bt_core_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  run_after TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}',
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bt_core_audit (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bt_core_content_status ON bt_core_content(status,updated_at);
CREATE INDEX IF NOT EXISTS idx_bt_core_publications_due ON bt_core_publications(status,scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bt_core_publications_content ON bt_core_publications(content_id);
CREATE INDEX IF NOT EXISTS idx_bt_core_events_type ON bt_core_events(type,created_at);
CREATE INDEX IF NOT EXISTS idx_bt_core_integrations_status ON bt_core_integrations(status,provider);
CREATE INDEX IF NOT EXISTS idx_bt_core_jobs_due ON bt_core_jobs(status,run_after);
CREATE INDEX IF NOT EXISTS idx_bt_core_audit_entity ON bt_core_audit(entity_type,entity_id,created_at);
