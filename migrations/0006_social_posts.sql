CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  platforms TEXT NOT NULL DEFAULT '[]',
  format TEXT NOT NULL DEFAULT '9:16',
  media_key TEXT NOT NULL DEFAULT '',
  source_slug TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'fikir' CHECK(status IN ('fikir','hazirlaniyor','onayda','planlandi','yayinlandi')),
  scheduled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_social_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_sched ON social_posts(scheduled_at);
