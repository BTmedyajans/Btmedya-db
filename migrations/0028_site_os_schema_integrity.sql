-- Repair Site OS tables created by the older runtime ensure() path.
-- Copy existing records into constrained tables, then restore supporting indexes.
-- This is deliberately additive and does not seed or delete application records.

CREATE TABLE client_sites__rebuild_0028 (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'cloudflare',
  hosting_provider TEXT NOT NULL DEFAULT 'cloudflare',
  repo_full_name TEXT NOT NULL DEFAULT '',
  repo_branch TEXT NOT NULL DEFAULT 'main',
  deployment_provider TEXT NOT NULL DEFAULT 'github',
  deployment_ref TEXT NOT NULL DEFAULT '',
  analytics_provider TEXT NOT NULL DEFAULT 'cloudflare_web_analytics',
  analytics_ref TEXT NOT NULL DEFAULT '',
  gsc_property TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  health_status TEXT NOT NULL DEFAULT 'unknown',
  last_check_at TEXT,
  last_deploy_at TEXT,
  last_error TEXT NOT NULL DEFAULT '',
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(client_id, slug),
  FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE
);

INSERT INTO client_sites__rebuild_0028 (
  id,client_id,name,slug,domain,website_url,platform,hosting_provider,
  repo_full_name,repo_branch,deployment_provider,deployment_ref,
  analytics_provider,analytics_ref,gsc_property,status,health_status,
  last_check_at,last_deploy_at,last_error,settings_json,created_at,updated_at
)
SELECT
  id,client_id,name,slug,domain,website_url,platform,hosting_provider,
  repo_full_name,repo_branch,deployment_provider,deployment_ref,
  analytics_provider,analytics_ref,gsc_property,status,health_status,
  last_check_at,last_deploy_at,last_error,settings_json,created_at,updated_at
FROM client_sites;

CREATE TABLE client_site_checks__backup_0028 AS SELECT * FROM client_site_checks;
CREATE TABLE client_site_jobs__backup_0028 AS SELECT * FROM client_site_jobs;

DROP TABLE client_site_checks;
DROP TABLE client_site_jobs;
DROP TABLE client_sites;
ALTER TABLE client_sites__rebuild_0028 RENAME TO client_sites;

CREATE TABLE client_site_checks (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unknown',
  score INTEGER,
  detail TEXT NOT NULL DEFAULT '',
  checked_at TEXT NOT NULL,
  FOREIGN KEY(site_id) REFERENCES client_sites(id) ON DELETE CASCADE
);

INSERT INTO client_site_checks (id,site_id,check_type,status,score,detail,checked_at)
SELECT id,site_id,check_type,status,score,detail,checked_at
FROM client_site_checks__backup_0028;

CREATE TABLE client_site_jobs (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  run_after TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  payload_json TEXT NOT NULL DEFAULT '{}',
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(site_id) REFERENCES client_sites(id) ON DELETE CASCADE
);

INSERT INTO client_site_jobs (
  id,site_id,job_type,status,run_after,attempts,payload_json,last_error,created_at,updated_at
)
SELECT id,site_id,job_type,status,run_after,attempts,payload_json,last_error,created_at,updated_at
FROM client_site_jobs__backup_0028;

DROP TABLE client_site_checks__backup_0028;
DROP TABLE client_site_jobs__backup_0028;

CREATE INDEX idx_client_sites_client ON client_sites(client_id,status);
CREATE INDEX idx_client_sites_health ON client_sites(health_status,last_check_at);
CREATE INDEX idx_client_site_checks_site ON client_site_checks(site_id,checked_at);
CREATE INDEX idx_client_site_jobs_due ON client_site_jobs(status,run_after);
