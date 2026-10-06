-- BTMEDYA multi-tenant client content autopilot
CREATE TABLE IF NOT EXISTS client_autopilot_runs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  content_id TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'native',
  status TEXT NOT NULL DEFAULT 'draft',
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_client_autopilot_runs_client ON client_autopilot_runs(client_id,created_at);
CREATE INDEX IF NOT EXISTS idx_client_autopilot_runs_status ON client_autopilot_runs(status,updated_at);
