-- Akilli Depo: yuklenen her dosyanin teknik ozellikleri ve hangi platforma
-- gidecegi burada durur. Olcumler tarayicida okunur (Worker'da ffmpeg yok),
-- yonlendirme onerisi bu olcumlerden kural tablosuyla uretilir.

ALTER TABLE media ADD COLUMN width INTEGER NOT NULL DEFAULT 0;
ALTER TABLE media ADD COLUMN height INTEGER NOT NULL DEFAULT 0;
ALTER TABLE media ADD COLUMN duration_s REAL NOT NULL DEFAULT 0;
ALTER TABLE media ADD COLUMN has_audio INTEGER NOT NULL DEFAULT 0;

-- '9:16' | '16:9' | '1:1' | '4:5' | 'diger'
ALTER TABLE media ADD COLUMN aspect TEXT NOT NULL DEFAULT '';

-- Kural tablosunun onerisi (JSON dizi): ["instagram-reel","tiktok",...]
ALTER TABLE media ADD COLUMN suggested TEXT NOT NULL DEFAULT '[]';

-- Kullanicinin kararlastirdigi hedefler (JSON dizi). Bos ise oneri gecerli.
ALTER TABLE media ADD COLUMN routed TEXT NOT NULL DEFAULT '[]';

-- Gercekten nereye gonderildigi (JSON dizi):
-- [{"platform":"instagram-reel","at":"...","ref":"metricool:123"}]
ALTER TABLE media ADD COLUMN posted TEXT NOT NULL DEFAULT '[]';

-- Uzun videolar siteye yuklenmez; YouTube'da durur, site yalnizca kapak gosterir.
ALTER TABLE media ADD COLUMN youtube_id TEXT NOT NULL DEFAULT '';

-- Yapay zeka ile uretildi mi. Instagram, TikTok ve YouTube bunun beyan
-- edilmesini istiyor; Metricool'a gonderirken bu alan kullanilir.
ALTER TABLE media ADD COLUMN ai_generated INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_media_aspect ON media(aspect);
CREATE INDEX IF NOT EXISTS idx_media_youtube ON media(youtube_id);
