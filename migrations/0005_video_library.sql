-- VIDEO KUTUPHANESI — tek anahtar, her yerde gecerli.
--
-- Videolar bugun Gazete Merhaba'nin kanalinda yayinda. BTMEDYA kendi kanalina
-- yeniden yukledikce her video icin own_youtube_id doldurulur ve site o andan
-- itibaren kendi kanala yonlenir. Haber kaydina dokunmaya gerek yoktur:
-- cozumleme her zaman bu tablodan gecer.
--
--   etkin kimlik  = own_youtube_id varsa o, yoksa youtube_id
--   etkin kanal   = own_youtube_id varsa BTMEDYA, yoksa source_channel
--
-- Kunye her zaman etkin kanali yazar, yani sayfa videonun gercekte nerede
-- durdugunu gizlemez.

CREATE TABLE IF NOT EXISTS video_library (
  id TEXT PRIMARY KEY,
  youtube_id TEXT NOT NULL UNIQUE,      -- kaynak kanaldaki kimlik
  source_channel TEXT NOT NULL DEFAULT '',
  own_youtube_id TEXT NOT NULL DEFAULT '', -- kendi kanalimizdaki kimlik (dolunca devralir)
  title TEXT NOT NULL DEFAULT '',
  news_slug TEXT NOT NULL DEFAULT '',   -- bagli haber, varsa
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vlib_slug ON video_library(news_slug);
