-- Satış temasları: WhatsApp / telefon / e-posta bağlantısına tıklama sayısı,
-- gün ve sayfa başına. Satışın asıl kanalı WhatsApp ve hangi sayfanın müşteri
-- getirdiği ölçülmüyordu. Kişisel veri tutulmaz: yalnız gün, kanal, sayfa, sayı.
CREATE TABLE IF NOT EXISTS sales_touches (
  gun TEXT NOT NULL,
  kanal TEXT NOT NULL,
  sayfa TEXT NOT NULL,
  sayi INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (gun, kanal, sayfa)
);
CREATE INDEX IF NOT EXISTS idx_sales_touches_gun ON sales_touches(gun);
