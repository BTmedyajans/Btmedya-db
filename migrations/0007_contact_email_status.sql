-- BTMEDYA production: e-posta bildirim sonucunu iletişim kaydında sakla.
ALTER TABLE contact_messages ADD COLUMN email_failed INTEGER NOT NULL DEFAULT 0;