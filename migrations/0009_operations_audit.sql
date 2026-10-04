CREATE TABLE IF NOT EXISTS operation_queue (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','running','succeeded','failed','cancelled')),
  requested_by TEXT NOT NULL DEFAULT 'admin',
  approved_by TEXT,
  result TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  approved_at TEXT,
  started_at TEXT,
  finished_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_operation_queue_status ON operation_queue(status);
CREATE INDEX IF NOT EXISTS idx_operation_queue_created ON operation_queue(created_at);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '{}',
  outcome TEXT NOT NULL DEFAULT 'ok' CHECK(outcome IN ('ok','error','pending')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log(action);
