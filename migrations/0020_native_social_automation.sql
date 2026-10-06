-- BTMEDYA native social automation
-- Metricool is optional. This migration adds first-party provider routing,
-- tenant-aware account storage, encrypted credentials metadata and delivery logs.

ALTER TABLE social_posts ADD COLUMN delivery_provider TEXT NOT NULL DEFAULT 'metricool';
ALTER TABLE social_posts ADD COLUMN native_account_id TEXT NOT NULL DEFAULT '';
ALTER TABLE social_posts ADD COLUMN client_id TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_social_posts_provider_due ON social_posts(delivery_provider,status,scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_native_account ON social_posts(native_account_id,status,scheduled_at);

CREATE TABLE IF NOT EXISTS native_social_accounts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT 'company' CHECK(scope IN ('company','client')),
  network TEXT NOT NULL,
  handle TEXT NOT NULL DEFAULT '',
  external_id TEXT NOT NULL DEFAULT '',
  token_enc TEXT NOT NULL DEFAULT '',
  refresh_token_enc TEXT NOT NULL DEFAULT '',
  token_expires_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'connected',
  last_error TEXT NOT NULL DEFAULT '',
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(client_id,network,handle)
);
CREATE INDEX IF NOT EXISTS idx_native_social_accounts_client ON native_social_accounts(client_id,status);
CREATE INDEX IF NOT EXISTS idx_native_social_accounts_network ON native_social_accounts(network,status);

CREATE TABLE IF NOT EXISTS native_social_deliveries (
  post_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  network TEXT NOT NULL,
  remote_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  error TEXT NOT NULL DEFAULT '',
  attempts INTEGER NOT NULL DEFAULT 0,
  response_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(post_id,account_id),
  FOREIGN KEY(account_id) REFERENCES native_social_accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_native_social_deliveries_status ON native_social_deliveries(status,updated_at);

CREATE TABLE IF NOT EXISTS native_social_oauth_states (
  state TEXT PRIMARY KEY,
  network TEXT NOT NULL,
  client_id TEXT NOT NULL DEFAULT '',
  return_to TEXT NOT NULL DEFAULT '/admin/native-social/',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_native_social_oauth_expiry ON native_social_oauth_states(expires_at);
