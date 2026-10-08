import { contactService } from './contactService.js';
import { deliverEmergencyAlert } from './emergencyDelivery.js';

const toApi = (r, userName) => ({
  id: r.id,
  userName,
  location: { latitude: r.latitude, longitude: r.longitude },
  place: r.place,
  riskLevel: r.risk_level,
  riskScore: r.risk_score,
  detectedEvent: r.detected_event,
  timestamp: r.timestamp,
  status: r.status,
  emergencyContacts: JSON.parse(r.contacts_snapshot),
  delivery: r.delivery_result ? JSON.parse(r.delivery_result) : undefined,
});

export function alertService(db, userId) {
  const user = () => db.prepare('SELECT name FROM users WHERE id=?').get(userId);
  const get = (id) => db.prepare('SELECT * FROM emergency_alerts WHERE id=?').get(id);

  const persist = db.transaction((status, d) => {
    const contacts = contactService(db, userId).list();
    const { lastInsertRowid: id } = db.prepare(`INSERT INTO emergency_alerts
      (user_id, latitude, longitude, place, risk_score, risk_level, detected_event, status, contacts_snapshot)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(userId, d.location.latitude, d.location.longitude, d.place ?? null,
      d.riskScore, d.riskLevel, d.detectedEvent, status, JSON.stringify(status === 'CONFIRMED' ? contacts : []));
    return toApi(get(id), user().name);
  });

  return {
    async confirm(d) {
      const alert = persist('CONFIRMED', d);
      const delivery = await deliverEmergencyAlert(alert);
      db.prepare('UPDATE emergency_alerts SET delivery_result=? WHERE id=?').run(JSON.stringify(delivery), alert.id);
      return { ...alert, delivery };
    },
    dismiss(d) { return persist('DISMISSED', d); },

    history(f) {
      const where = ['user_id = ?'];
      const args = [userId];
      if (f.riskLevel) { where.push('risk_level = ?'); args.push(f.riskLevel); }
      if (f.status) { where.push('status = ?'); args.push(f.status); }
      if (f.event) { where.push('detected_event LIKE ?'); args.push(`%${f.event.replace(/[%_]/g, '')}%`); }
      if (f.from) { where.push('date(timestamp) >= ?'); args.push(f.from); }
      if (f.to) { where.push('date(timestamp) <= ?'); args.push(f.to); }
      const name = user().name;
      return db.prepare(`SELECT * FROM emergency_alerts WHERE ${where.join(' AND ')} ORDER BY timestamp DESC, id DESC`)
        .all(...args).map((r) => toApi(r, name));
    },
  };
}
