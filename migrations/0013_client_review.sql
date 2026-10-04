CREATE TABLE IF NOT EXISTS client_review_tokens (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(content_id) REFERENCES client_content(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS client_review_events (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(content_id) REFERENCES client_content(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_client_review_token_hash ON client_review_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_client_review_content ON client_review_events(content_id, created_at);
