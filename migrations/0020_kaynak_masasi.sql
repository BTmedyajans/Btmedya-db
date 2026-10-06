-- BTMEDYA kalıcı Kaynak Masası / provenance şeması.
-- Runtime ensure fonksiyonu eski production DB'lerde de güvenli bootstrap sağlar.
CREATE TABLE IF NOT EXISTS kaynak_kayitlari (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  host TEXT NOT NULL DEFAULT '',
  publisher TEXT NOT NULL DEFAULT '',
  tier TEXT NOT NULL DEFAULT 'discovery',
  category TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  license_note TEXT NOT NULL DEFAULT '',
  trust_score INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'review',
  notes TEXT NOT NULL DEFAULT '',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  seen_count INTEGER NOT NULL DEFAULT 1,
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kaynak_baglantilari (
  source_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'source',
  created_at TEXT NOT NULL,
  PRIMARY KEY(source_id,entity_type,entity_id,role)
);
CREATE INDEX IF NOT EXISTS idx_kaynak_tier_status ON kaynak_kayitlari(tier,status,trust_score DESC,last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_kaynak_host ON kaynak_kayitlari(host);
CREATE INDEX IF NOT EXISTS idx_kaynak_baglanti_entity ON kaynak_baglantilari(entity_type,entity_id);
