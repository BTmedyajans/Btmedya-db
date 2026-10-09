#!/usr/bin/env python3
"""SQLite regression test for the production D1 schema-repair migrations."""
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = [
    "0022_client_site_os.sql",
    "0023_direct_social.sql",
    "0024_social_workspace_scope.sql",
    "0025_native_social_job_metadata.sql",
    "0026_content_taxonomy.sql",
    "0027_client_project_delivery.sql",
    "0028_site_os_schema_integrity.sql",
    "0029_news_taxonomy_backfill.sql",
]

db = sqlite3.connect(":memory:")
db.row_factory = sqlite3.Row
db.execute("PRAGMA foreign_keys=ON")

# Mimic the live drift: 0022's Site OS tables were created by the old
# runtime ensure() function, so their FK/index declarations are missing.
db.executescript("""
CREATE TABLE d1_migrations(name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO d1_migrations(name) VALUES
 ('0019_sales_touches.sql'),('0020_kaynak_masasi.sql'),('0021_sosyal_dedupe.sql');

CREATE TABLE client_workspaces (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  sector TEXT NOT NULL DEFAULT '', website_url TEXT NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '', services_json TEXT NOT NULL DEFAULT '[]',
  brand_voice TEXT NOT NULL DEFAULT '', automation_enabled INTEGER NOT NULL DEFAULT 1,
  social_management_enabled INTEGER NOT NULL DEFAULT 1, web_management_enabled INTEGER NOT NULL DEFAULT 0,
  ads_management_enabled INTEGER NOT NULL DEFAULT 0, reference_permission INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE client_content (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT 'social', engine TEXT NOT NULL DEFAULT 'btmedya',
  brief TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', media_key TEXT NOT NULL DEFAULT '',
  preview_json TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'draft',
  client_approved INTEGER NOT NULL DEFAULT 0, published_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES client_workspaces(id) ON DELETE CASCADE
);

CREATE TABLE client_sites (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT '', website_url TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'cloudflare', hosting_provider TEXT NOT NULL DEFAULT 'cloudflare',
  repo_full_name TEXT NOT NULL DEFAULT '', repo_branch TEXT NOT NULL DEFAULT 'main',
  deployment_provider TEXT NOT NULL DEFAULT 'github', deployment_ref TEXT NOT NULL DEFAULT '',
  analytics_provider TEXT NOT NULL DEFAULT 'cloudflare_web_analytics', analytics_ref TEXT NOT NULL DEFAULT '',
  gsc_property TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active',
  health_status TEXT NOT NULL DEFAULT 'unknown', last_check_at TEXT, last_deploy_at TEXT,
  last_error TEXT NOT NULL DEFAULT '', settings_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(client_id,slug)
);
CREATE TABLE client_site_checks (
 id TEXT PRIMARY KEY, site_id TEXT NOT NULL, check_type TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'unknown', score INTEGER,
 detail TEXT NOT NULL DEFAULT '', checked_at TEXT NOT NULL
);
CREATE TABLE client_site_jobs (
 id TEXT PRIMARY KEY, site_id TEXT NOT NULL, job_type TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued', run_after TEXT, attempts INTEGER NOT NULL DEFAULT 0,
 payload_json TEXT NOT NULL DEFAULT '{}', last_error TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE social_direct_connections (
 id TEXT PRIMARY KEY, workspace_type TEXT NOT NULL DEFAULT 'client', workspace_id TEXT NOT NULL,
 provider TEXT NOT NULL, external_id TEXT NOT NULL, account_name TEXT NOT NULL DEFAULT '',
 handle TEXT NOT NULL DEFAULT '', profile_url TEXT NOT NULL DEFAULT '', page_id TEXT NOT NULL DEFAULT '',
 ig_user_id TEXT NOT NULL DEFAULT '', access_token_cipher TEXT NOT NULL DEFAULT '',
 token_expires_at TEXT, scopes_json TEXT NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'active', last_error TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(workspace_type,workspace_id,provider,external_id)
);
CREATE TABLE social_direct_jobs (
 id TEXT PRIMARY KEY, connection_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
 body TEXT NOT NULL DEFAULT '', media_key TEXT NOT NULL DEFAULT '', scheduled_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0,
 external_id TEXT NOT NULL DEFAULT '', last_error TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 source_slug TEXT NOT NULL DEFAULT '', content_hash TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT 'manual',
 FOREIGN KEY(connection_id) REFERENCES social_direct_connections(id) ON DELETE CASCADE
);
CREATE TABLE content_taxonomy (
 entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, path_key TEXT NOT NULL,
 group_key TEXT NOT NULL DEFAULT '', item_key TEXT NOT NULL DEFAULT '',
 secondary_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(entity_type,entity_id)
);
CREATE TABLE news (
 id INTEGER PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

INSERT INTO client_workspaces(id,name,slug,created_at,updated_at)
 VALUES ('ws-1','Test Client','test-client','2026-10-01','2026-10-01');
INSERT INTO client_content(id,client_id,title,created_at,updated_at)
 VALUES ('content-1','ws-1','Existing content','2026-10-01','2026-10-01');
INSERT INTO client_sites(id,client_id,name,slug,domain,website_url,created_at,updated_at)
 VALUES ('site-1','ws-1','Existing site','existing-site','example.test','https://example.test','2026-10-01','2026-10-01');
INSERT INTO client_site_checks(id,site_id,check_type,status,score,detail,checked_at)
 VALUES ('check-1','site-1','http-seo','healthy',100,'fixture','2026-10-02');
INSERT INTO client_site_jobs(id,site_id,job_type,status,created_at,updated_at)
 VALUES ('job-1','site-1','health-check','queued','2026-10-02','2026-10-02');

INSERT INTO social_direct_connections(id,workspace_type,workspace_id,provider,external_id,created_at,updated_at)
 VALUES ('conn-1','client','ws-1','test','external-1','2026-10-01','2026-10-01');
INSERT INTO social_direct_jobs(id,connection_id,title,scheduled_at,created_at,updated_at,source_slug,content_hash,kind)
 VALUES ('social-1','conn-1','Existing social item','2026-10-03','2026-10-01','2026-10-01','kept-slug','kept-hash','automatic');

INSERT INTO content_taxonomy(entity_type,entity_id,path_key,group_key,item_key,created_at,updated_at)
 VALUES ('news','already-classified','haber','topic','spor','2026-10-01','2026-10-01');
INSERT INTO news(slug,title,category,status,created_at,updated_at) VALUES
 ('local-1','Local story','Yerel','published','2026-10-01','2026-10-01'),
 ('ai-1','AI story','Yapay Zekâ','published','2026-10-01','2026-10-01'),
 ('economy-1','Economy story','Ekonomi · Emlak','published','2026-10-01','2026-10-01'),
 ('culture-1','Culture story','Kültür · Zanaat','published','2026-10-01','2026-10-01'),
 ('health-1','Health story','Sağlık · Bakım','published','2026-10-01','2026-10-01'),
 ('life-1','Life story','Yaşam · Düğün','published','2026-10-01','2026-10-01'),
 ('sports-1','Sports story','Spor','published','2026-10-01','2026-10-01'),
 ('turkey-1','Turkey story','Türkiye','published','2026-10-01','2026-10-01'),
 ('world-1','World story','Dünya','published','2026-10-01','2026-10-01'),
 ('already-classified','Do not overwrite','Teknoloji','published','2026-10-01','2026-10-01');
""")

for filename in MIGRATIONS:
    sql = (ROOT / "migrations" / filename).read_text(encoding="utf-8")
    db.executescript(sql)
    db.execute("INSERT OR IGNORE INTO d1_migrations(name) VALUES (?)", (filename,))
db.commit()
db.execute("PRAGMA foreign_keys=ON")

def one(sql, params=()):
    return db.execute(sql, params).fetchone()

def names(sql):
    return {row[0] for row in db.execute(sql).fetchall()}

# All existing Site OS data survives the table rebuild.
assert one("SELECT COUNT(*) FROM client_sites")[0] == 1
assert one("SELECT COUNT(*) FROM client_site_checks")[0] == 1
assert one("SELECT COUNT(*) FROM client_site_jobs")[0] == 1

# Site OS foreign keys and lookup indexes are present again.
assert {r["table"] for r in db.execute("PRAGMA foreign_key_list(client_sites)")} == {"client_workspaces"}
assert {r["table"] for r in db.execute("PRAGMA foreign_key_list(client_site_checks)")} == {"client_sites"}
assert {r["table"] for r in db.execute("PRAGMA foreign_key_list(client_site_jobs)")} == {"client_sites"}
expected_indexes = {
    "idx_client_sites_client",
    "idx_client_sites_health",
    "idx_client_site_checks_site",
    "idx_client_site_jobs_due",
}
assert expected_indexes <= names("SELECT name FROM sqlite_master WHERE type='index'")

# Social queue rebuild must not discard origin/hash/kind metadata.
social = one("SELECT source_slug,content_hash,kind FROM social_direct_jobs WHERE id='social-1'")
assert tuple(social) == ("kept-slug", "kept-hash", "automatic")

# Client project/delivery chain has the columns and tables required by 0027.
assert "project_id" in names("SELECT name FROM pragma_table_info('client_content')")
for table in ("client_projects", "client_publications", "client_reports"):
    assert one("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", (table,))[0] == 1

# Legacy news rows get mapped; explicit canonical mappings are never overwritten.
expected = {
    "local-1": ("haber-bul", "balikesir"),
    "ai-1": ("topic", "teknoloji-ai"),
    "economy-1": ("topic", "ekonomi"),
    "culture-1": ("topic", "kultur-sanat"),
    "health-1": ("topic", "saglik"),
    "life-1": ("topic", "yasam"),
    "sports-1": ("topic", "spor"),
    "turkey-1": ("topic", "turkiye"),
    "world-1": ("topic", "dunya"),
    "already-classified": ("topic", "spor"),
}
for slug, want in expected.items():
    got = one("SELECT group_key,item_key FROM content_taxonomy WHERE entity_type='news' AND entity_id=?", (slug,))
    assert got is not None and tuple(got) == want, (slug, tuple(got) if got else None, want)

# Ensure no temporary rebuild tables or dangling foreign-key references remain.
assert not names("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%backup_0028' OR name LIKE '%rebuild_0028'")
assert db.execute("PRAGMA foreign_key_check").fetchall() == []

print("SITE_OS_MIGRATIONS_OK")
print(f"Preserved Site OS rows: sites={one('SELECT COUNT(*) FROM client_sites')[0]}, checks={one('SELECT COUNT(*) FROM client_site_checks')[0]}, jobs={one('SELECT COUNT(*) FROM client_site_jobs')[0]}")
print("Verified: Site OS FK/index repair, social job metadata preservation, client delivery schema, and canonical taxonomy backfill.")
