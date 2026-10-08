import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from './seed.js';

const here = dirname(fileURLToPath(import.meta.url));

export function openDb(path = process.env.DB_PATH || './data/safety.db') {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(resolve(here, 'schema.sql'), 'utf8'));

  const addColumn = (table, column, definition) => {
    const columns = db.pragma('table_info(' + table + ')');
    if (!columns.some((entry) => entry.name === column)) db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + definition);
  };
  addColumn('users', 'password_hash', 'TEXT');
  addColumn('users', 'role', "TEXT NOT NULL DEFAULT 'USER'");
  addColumn('users', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
  addColumn('emergency_contacts', 'alert_enabled', 'INTEGER NOT NULL DEFAULT 0');
  addColumn('emergency_alerts', 'delivery_result', 'TEXT');
  addColumn('danger_zones', 'user_id', 'INTEGER REFERENCES users(id) ON DELETE CASCADE');
  addColumn('danger_zones', 'zone_type', "TEXT NOT NULL DEFAULT 'DANGER' CHECK (zone_type IN ('DANGER','SAFE'))");
  addColumn('danger_zones', 'source', "TEXT NOT NULL DEFAULT 'public_dataset'");
  addColumn('danger_zones', 'created_at', 'TEXT');
  db.exec("UPDATE danger_zones SET created_at=datetime('now') WHERE created_at IS NULL");
  db.exec('CREATE INDEX IF NOT EXISTS idx_danger_zones_user_created ON danger_zones(user_id, created_at DESC)');

  // Legacy personal danger pins become pending reports; they must be reviewed before affecting geofences.
  const migrateLegacyDangerPins = db.transaction(() => {
    db.exec("INSERT INTO zone_reports (user_id, name, latitude, longitude, radius, status, created_at, updated_at) " +
      "SELECT user_id, name, latitude, longitude, radius, 'PENDING', COALESCE(created_at, datetime('now')), datetime('now') " +
      "FROM danger_zones WHERE user_id IS NOT NULL AND source='user_report' AND zone_type='DANGER'");
    db.exec("DELETE FROM danger_zones WHERE user_id IS NOT NULL AND source='user_report' AND zone_type='DANGER'");
  });
  migrateLegacyDangerPins();

  const demoZoneNames = "'Swargate Bus Stand Area','Railway Station Surroundings','Deccan Gymkhana','Shivajinagar Market','Koregaon Park'";
  db.exec("UPDATE danger_zones SET source='demo_sample' WHERE name IN (" + demoZoneNames + ") AND user_id IS NULL");

  const demoMode = process.env.SEED_DEMO_DATA === 'true' || path === ':memory:';
  if (demoMode) {
    seed(db);
    db.exec("UPDATE danger_zones SET source='demo_sample' WHERE name IN (" + demoZoneNames + ") AND user_id IS NULL");
  } else {
    db.prepare("INSERT OR IGNORE INTO users (id,name,email) VALUES (1,'SafeGaurd user',NULL)").run();
    db.prepare("UPDATE users SET name='SafeGaurd user', email=NULL WHERE id=1 AND email='demo@example.com'").run();
    db.prepare("DELETE FROM emergency_contacts WHERE (name='Rahul Kulkarni' AND phone='+91 98765 43210') OR (name='Sunita Kulkarni' AND phone='+91 98765 43211')").run();
    db.exec("DELETE FROM danger_zones WHERE name IN (" + demoZoneNames + ")");
    db.prepare("DELETE FROM emergency_alerts WHERE (timestamp='2026-10-07 14:22:00' AND detected_event='DISTRESS + FALL') OR (timestamp='2026-10-03 21:05:00' AND detected_event='THREAT + HIGH-RISK ZONE') OR (timestamp='2026-09-28 18:40:00' AND detected_event='ABNORMAL MOVEMENT')").run();
  }
  return db;
}
