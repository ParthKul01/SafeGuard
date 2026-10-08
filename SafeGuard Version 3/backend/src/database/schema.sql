CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  alert_enabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS danger_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius REAL NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW','MODERATE','HIGH')),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  zone_type TEXT NOT NULL DEFAULT 'DANGER' CHECK (zone_type IN ('DANGER','SAFE')),
  source TEXT NOT NULL DEFAULT 'public_dataset',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS zone_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  active_zone_id INTEGER REFERENCES danger_zones(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_zone_reports_status_created ON zone_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zone_reports_user_created ON zone_reports(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_location_shares (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0,
  consented_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_live_locations (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_user_live_locations_updated ON user_live_locations(updated_at DESC);

CREATE TABLE IF NOT EXISTS risk_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crime_score REAL NOT NULL,
  threat_score REAL NOT NULL,
  fall_score REAL NOT NULL,
  geofence_score REAL NOT NULL,
  overall_score REAL NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW','MODERATE','HIGH')),
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS emergency_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  place TEXT,
  risk_score REAL NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW','MODERATE','HIGH')),
  detected_event TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL CHECK (status IN ('CONFIRMED','DISMISSED')),
  contacts_snapshot TEXT NOT NULL DEFAULT '[]',
  delivery_result TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_user_time ON emergency_alerts(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON emergency_contacts(user_id);
