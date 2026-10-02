/* BTMEDYA müşteri sosyal radar / marka stratejisi */
CREATE TABLE IF NOT EXISTS client_social_accounts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  network TEXT NOT NULL,
  handle TEXT NOT NULL DEFAULT '',
  profile_url TEXT NOT NULL DEFAULT '',
  metricool_brand_id TEXT NOT NULL DEFAULT '',
  competitors_json TEXT NOT NULL DEFAULT '[]',
  tracked_queries_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(client_id, network, handle),
  FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_client_social_accounts_client ON client_social_accounts(client_id);

CREATE TABLE IF NOT EXISTS client_strategies (
  client_id TEXT PRIMARY KEY,
  positioning TEXT NOT NULL DEFAULT '',
  content_pillars_json TEXT NOT NULL DEFAULT '[]',
  visual_rules_json TEXT NOT NULL DEFAULT '{}',
  publishing_rules_json TEXT NOT NULL DEFAULT '{}',
  ai_template_json TEXT NOT NULL DEFAULT '{}',
  analysis_json TEXT NOT NULL DEFAULT '{}',
  approval_required INTEGER NOT NULL DEFAULT 1,
  autopublish_enabled INTEGER NOT NULL DEFAULT 0,
  last_analysis_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_client_strategies_analysis ON client_strategies(last_analysis_at);
