-- BTMEDYA Halkın Merak Radarı ve Özel Haber Fırsatları
CREATE TABLE IF NOT EXISTS merak_sinyalleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  konu TEXT NOT NULL,
  soru TEXT NOT NULL DEFAULT '',
  kategori TEXT NOT NULL DEFAULT 'Gündem',
  sinyal_kaynak TEXT NOT NULL DEFAULT '',
  kaynak_url TEXT NOT NULL DEFAULT '',
  google_sinyal INTEGER NOT NULL DEFAULT 0,
  arama_sinyal INTEGER NOT NULL DEFAULT 0,
  sosyal_sinyal INTEGER NOT NULL DEFAULT 0,
  btm_sinyal INTEGER NOT NULL DEFAULT 0,
  rakip_sinyal INTEGER NOT NULL DEFAULT 0,
  puan INTEGER NOT NULL DEFAULT 0,
  gerekce TEXT NOT NULL DEFAULT '',
  durum TEXT NOT NULL DEFAULT 'yeni',
  first_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(konu,soru)
);

CREATE INDEX IF NOT EXISTS idx_merak_sinyalleri_puan
  ON merak_sinyalleri(puan DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS ozel_haber_firsatlari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  konu TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Gündem',
  baslik TEXT NOT NULL DEFAULT '',
  neden TEXT NOT NULL DEFAULT '',
  ozgun_aci TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'araştırma haberi',
  konuk_profili TEXT NOT NULL DEFAULT '',
  sorular TEXT NOT NULL DEFAULT '[]',
  risk TEXT NOT NULL DEFAULT 'normal',
  durum TEXT NOT NULL DEFAULT 'önerildi',
  kaynaklar TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ozel_haber_firsatlari_durum
  ON ozel_haber_firsatlari(durum, updated_at DESC);
