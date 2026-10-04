/* BTMEDYA autonomous editorial / social autopilot state */
CREATE TABLE IF NOT EXISTS autopilot_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_key TEXT NOT NULL UNIQUE,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  scanned INTEGER NOT NULL DEFAULT 0,
  candidates INTEGER NOT NULL DEFAULT 0,
  created_news INTEGER NOT NULL DEFAULT 0,
  published_news INTEGER NOT NULL DEFAULT 0,
  social_created INTEGER NOT NULL DEFAULT 0,
  social_scheduled INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  detail TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_autopilot_runs_started ON autopilot_runs(started_at);

CREATE TABLE IF NOT EXISTS autopilot_competitors (
  host TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  last_url TEXT NOT NULL DEFAULT '',
  last_title TEXT NOT NULL DEFAULT '',
  headlines_seen INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS autopilot_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_autopilot_log_created ON autopilot_log(created_at);
CREATE INDEX IF NOT EXISTS idx_autopilot_log_action ON autopilot_log(action);
