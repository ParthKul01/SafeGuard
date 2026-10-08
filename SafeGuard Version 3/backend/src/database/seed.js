// Demo data only. Danger zones are predefined prototype zones around Pune, not real crime data.
export const DEMO_USER_ID = 1;

export function seed(db) {
  if (db.prepare('SELECT COUNT(*) c FROM users').get().c > 0) return;

  db.transaction(() => {
    db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('Demo User', 'demo@example.com');

    const contact = db.prepare('INSERT INTO emergency_contacts (user_id, name, phone, relationship, is_primary) VALUES (?,?,?,?,?)');
    contact.run(DEMO_USER_ID, 'Rahul Kulkarni', '+91 98765 43210', 'Brother', 1);
    contact.run(DEMO_USER_ID, 'Sunita Kulkarni', '+91 98765 43211', 'Mother', 0);

    const zone = db.prepare('INSERT INTO danger_zones (name, latitude, longitude, radius, risk_level) VALUES (?,?,?,?,?)');
    zone.run('Swargate Bus Stand Area', 18.5018, 73.8636, 600, 'HIGH');
    zone.run('Railway Station Surroundings', 18.5289, 73.8744, 500, 'HIGH');
    zone.run('Deccan Gymkhana', 18.5167, 73.8412, 700, 'MODERATE');
    zone.run('Shivajinagar Market', 18.5308, 73.8475, 450, 'MODERATE');
    zone.run('Koregaon Park', 18.5362, 73.8940, 800, 'LOW');

    const alert = db.prepare(`INSERT INTO emergency_alerts
      (user_id, latitude, longitude, place, risk_score, risk_level, detected_event, timestamp, status) VALUES (?,?,?,?,?,?,?,?,?)`);
    alert.run(DEMO_USER_ID, 18.5204, 73.8567, 'Pune', 82, 'HIGH', 'DISTRESS + FALL', '2026-10-07 14:22:00', 'CONFIRMED');
    alert.run(DEMO_USER_ID, 18.5018, 73.8636, 'Swargate, Pune', 71, 'HIGH', 'THREAT + HIGH-RISK ZONE', '2026-10-03 21:05:00', 'DISMISSED');
    alert.run(DEMO_USER_ID, 18.5167, 73.8412, 'Deccan, Pune', 48, 'MODERATE', 'ABNORMAL MOVEMENT', '2026-09-28 18:40:00', 'DISMISSED');
  })();
}
