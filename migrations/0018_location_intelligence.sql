CREATE TABLE IF NOT EXISTS location_events (id INTEGER PRIMARY KEY AUTOINCREMENT,event_type TEXT NOT NULL,country TEXT NOT NULL,city TEXT NOT NULL,region TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_location_events_created_at ON location_events(created_at);
CREATE INDEX IF NOT EXISTS idx_location_events_city ON location_events(city);
