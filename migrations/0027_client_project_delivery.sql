-- BTMEDYA unified client -> project -> content -> publication -> reporting chain
CREATE TABLE IF NOT EXISTS client_projects (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  service_type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  brief TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  manager TEXT NOT NULL DEFAULT '',
  start_date TEXT,
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_client_projects_client ON client_projects(client_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_client_projects_due ON client_projects(status,due_date);

ALTER TABLE client_content ADD COLUMN project_id TEXT;
CREATE INDEX IF NOT EXISTS idx_client_content_project ON client_content(project_id,updated_at);

CREATE TABLE IF NOT EXISTS client_publications (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  project_id TEXT,
  content_id TEXT NOT NULL,
  network TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'native',
  scheduled_at TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  external_id TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES client_projects(id) ON DELETE SET NULL,
  FOREIGN KEY(content_id) REFERENCES client_content(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_client_publications_client ON client_publications(client_id,status,scheduled_at);
CREATE INDEX IF NOT EXISTS idx_client_publications_content ON client_publications(content_id,updated_at);

CREATE TABLE IF NOT EXISTS client_reports (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  project_id TEXT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  metrics_json TEXT NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES client_projects(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_client_reports_client ON client_reports(client_id,period_end);
