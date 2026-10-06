-- BTMEDYA sosyal kuyruk kalıcı tekilleştirme parmak izleri.
CREATE TABLE IF NOT EXISTS sosyal_parmak_izleri (
  fingerprint TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  source_slug TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sosyal_parmak_source ON sosyal_parmak_izleri(source_slug);
