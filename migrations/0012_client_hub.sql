CREATE TABLE IF NOT EXISTS client_workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sector TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',
  services_json TEXT NOT NULL DEFAULT '[]',
  brand_voice TEXT NOT NULL DEFAULT '',
  automation_enabled INTEGER NOT NULL DEFAULT 1,
  social_management_enabled INTEGER NOT NULL DEFAULT 1,
  web_management_enabled INTEGER NOT NULL DEFAULT 0,
  ads_management_enabled INTEGER NOT NULL DEFAULT 0,
  reference_permission INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS client_content (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'social',
  engine TEXT NOT NULL DEFAULT 'btmedya',
  brief TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  media_key TEXT NOT NULL DEFAULT '',
  preview_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  client_approved INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS client_references (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL DEFAULT '',
  cover_key TEXT NOT NULL DEFAULT '',
  content_ids_json TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'draft',
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_client_content_client ON client_content(client_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_client_reference_client ON client_references(client_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_client_reference_visibility ON client_references(visibility, featured);
