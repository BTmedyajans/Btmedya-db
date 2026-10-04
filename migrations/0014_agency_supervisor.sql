CREATE TABLE IF NOT EXISTS agency_supervisor_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  outcome TEXT NOT NULL DEFAULT 'ok',
  summary_json TEXT NOT NULL DEFAULT '{}',
  error TEXT
);

CREATE TABLE IF NOT EXISTS agency_alerts (
  id TEXT PRIMARY KEY,
  signature TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL DEFAULT 'info',
  scope TEXT NOT NULL DEFAULT 'agency',
  client_id TEXT,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_agency_alerts_status ON agency_alerts(status,last_seen_at);
CREATE INDEX IF NOT EXISTS idx_agency_alerts_client ON agency_alerts(client_id,status);
