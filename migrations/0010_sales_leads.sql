CREATE TABLE IF NOT EXISTS sales_leads (
  id TEXT PRIMARY KEY,
  contact_id INTEGER,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  service TEXT,
  budget TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  stage TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal',
  next_action TEXT,
  next_action_at TEXT,
  notes TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_leads_stage ON sales_leads(stage);
CREATE INDEX IF NOT EXISTS idx_sales_leads_created ON sales_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_leads_next_action ON sales_leads(next_action_at);
