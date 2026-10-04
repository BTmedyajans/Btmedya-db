-- BTMEDYA social account isolation
-- Existing posts remain in the company scope for backward compatibility.
ALTER TABLE social_posts ADD COLUMN account_scope TEXT NOT NULL DEFAULT 'company' CHECK(account_scope IN ('company','personal'));
ALTER TABLE social_posts ADD COLUMN metricool_brand_id TEXT NOT NULL DEFAULT '';
ALTER TABLE social_posts ADD COLUMN account_label TEXT NOT NULL DEFAULT 'BTMEDYA Şirket';
CREATE INDEX IF NOT EXISTS idx_social_scope_status ON social_posts(account_scope,status,scheduled_at);
