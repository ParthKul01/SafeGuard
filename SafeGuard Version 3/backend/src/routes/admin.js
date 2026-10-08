import { Router } from 'express';

const parseZone = (body) => {
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/[<>]/g, '') : '';
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const radius = Number(body?.radius);
  if (name.length < 2 || name.length > 80 || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(radius) || radius < 50 || radius > 2000) return null;
  return { name, latitude, longitude, radius };
};

const zoneSelect = "SELECT id,name,latitude,longitude,radius,risk_level AS riskLevel,zone_type AS zoneType,source,created_at AS createdAt,0 AS isMine FROM danger_zones";

export default function adminRouter(db) {
  const r = Router();
  r.use((req, res, next) => req.authUser?.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Administrator access is required.' }));

  r.get('/summary', (_req, res) => {
    const users = db.prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) AS active FROM users').get();
    const pending = db.prepare("SELECT COUNT(*) AS count FROM zone_reports WHERE status='PENDING'").get().count;
    const sharing = db.prepare("SELECT COUNT(*) AS count FROM user_live_locations l JOIN user_location_shares s ON s.user_id=l.user_id JOIN users u ON u.id=l.user_id WHERE s.enabled=1 AND u.is_active=1 AND l.updated_at >= datetime('now','-90 seconds')").get().count;
    res.json({ users: users.total, activeUsers: users.active || 0, pendingReports: pending, sharingNow: sharing });
  });

  r.get('/users', (_req, res) => {
    const users = db.prepare("SELECT u.id,u.name,u.email,u.role,u.is_active AS isActive,u.created_at AS createdAt,COALESCE(s.enabled,0) AS sharingEnabled,l.updated_at AS locationUpdatedAt FROM users u LEFT JOIN user_location_shares s ON s.user_id=u.id LEFT JOIN user_live_locations l ON l.user_id=u.id ORDER BY u.created_at DESC,u.id DESC").all();
    res.json(users.map((user) => ({ ...user, isActive: Boolean(user.isActive), sharingEnabled: Boolean(user.sharingEnabled) })));
  });

  r.patch('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid user ID.' });
    const current = db.prepare('SELECT id,role,is_active AS isActive FROM users WHERE id=?').get(id);
    if (!current) return res.status(404).json({ error: 'User not found.' });
    const isActive = req.body?.isActive === undefined ? Boolean(current.isActive) : req.body.isActive;
    const role = req.body?.role === undefined ? current.role : req.body.role;
    if (typeof isActive !== 'boolean' || !['USER','ADMIN'].includes(role)) return res.status(400).json({ error: 'Choose a valid account status and role.' });
    if (id === req.authUser.id && (!isActive || role !== 'ADMIN')) return res.status(400).json({ error: 'You cannot disable or remove your own administrator account.' });
    if (current.role === 'ADMIN' && current.isActive && (!isActive || role !== 'ADMIN')) {
      const count = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role='ADMIN' AND is_active=1").get().count;
      if (count <= 1) return res.status(409).json({ error: 'The last active administrator cannot be disabled or demoted.' });
    }
    db.prepare('UPDATE users SET is_active=?,role=? WHERE id=?').run(isActive ? 1 : 0, role, id);
    if (!isActive) {
      db.prepare('UPDATE user_location_shares SET enabled=0,updated_at=datetime(\'now\') WHERE user_id=?').run(id);
      db.prepare('DELETE FROM user_live_locations WHERE user_id=?').run(id);
      db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(id);
    }
    res.json({ ok: true });
  });

  r.get('/locations', (_req, res) => {
    const locations = db.prepare("SELECT u.id AS userId,u.name,u.email,l.latitude,l.longitude,l.accuracy,l.updated_at AS updatedAt FROM user_live_locations l JOIN user_location_shares s ON s.user_id=l.user_id JOIN users u ON u.id=l.user_id WHERE s.enabled=1 AND u.is_active=1 AND l.updated_at >= datetime('now','-90 seconds') ORDER BY l.updated_at DESC").all();
    res.json(locations);
  });

  r.get('/zone-reports', (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : 'PENDING';
    if (!['PENDING','APPROVED','REJECTED','ALL'].includes(status)) return res.status(400).json({ error: 'Invalid review status.' });
    const where = status === 'ALL' ? '' : 'WHERE z.status=?';
    const reports = status === 'ALL'
      ? db.prepare("SELECT z.id,z.user_id AS userId,u.name AS userName,u.email AS userEmail,z.name,z.latitude,z.longitude,z.radius,z.status,z.created_at AS createdAt,z.reviewed_at AS reviewedAt,r.name AS reviewerName FROM zone_reports z JOIN users u ON u.id=z.user_id LEFT JOIN users r ON r.id=z.reviewed_by ORDER BY CASE z.status WHEN 'PENDING' THEN 0 ELSE 1 END,z.created_at DESC").all()
      : db.prepare("SELECT z.id,z.user_id AS userId,u.name AS userName,u.email AS userEmail,z.name,z.latitude,z.longitude,z.radius,z.status,z.created_at AS createdAt,z.reviewed_at AS reviewedAt,r.name AS reviewerName FROM zone_reports z JOIN users u ON u.id=z.user_id LEFT JOIN users r ON r.id=z.reviewed_by " + where + ' ORDER BY z.created_at DESC').all(status);
    res.json(reports);
  });

  r.post('/zone-reports/:id/review', (req, res) => {
    const id = Number(req.params.id);
    const decision = req.body?.decision;
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid report ID.' });
    if (!['APPROVED','REJECTED'].includes(decision)) return res.status(400).json({ error: 'Choose approve or reject.' });
    const report = db.prepare("SELECT * FROM zone_reports WHERE id=? AND status='PENDING'").get(id);
    if (!report) return res.status(404).json({ error: 'That pending report was not found.' });
    const review = db.transaction(() => {
      let zoneId = null;
      if (decision === 'APPROVED') {
        const added = db.prepare("INSERT INTO danger_zones (name,latitude,longitude,radius,risk_level,user_id,zone_type,source,created_at) VALUES (?,?,?,?,? ,NULL,'DANGER','admin_approved',datetime('now'))")
          .run(report.name, report.latitude, report.longitude, report.radius, 'HIGH');
        zoneId = Number(added.lastInsertRowid);
      }
      db.prepare("UPDATE zone_reports SET status=?,reviewed_by=?,reviewed_at=datetime('now'),active_zone_id=?,updated_at=datetime('now') WHERE id=? AND status='PENDING'")
        .run(decision, req.authUser.id, zoneId, id);
      return zoneId;
    });
    const zoneId = review();
    res.json({ ok: true, decision, zoneId });
  });

  r.get('/zones', (_req, res) => {
    res.json(db.prepare(zoneSelect + " WHERE user_id IS NULL AND zone_type='DANGER' AND source!='demo_sample' ORDER BY created_at DESC,id DESC").all().map((zone) => ({ ...zone, isMine: false })));
  });

  r.post('/zones', (req, res) => {
    const zone = parseZone(req.body);
    if (!zone) return res.status(400).json({ error: 'Enter a name, map point, and radius between 50 m and 2,000 m.' });
    const added = db.prepare("INSERT INTO danger_zones (name,latitude,longitude,radius,risk_level,user_id,zone_type,source,created_at) VALUES (?,?,?,?,? ,NULL,'DANGER','admin_manual',datetime('now'))")
      .run(zone.name, zone.latitude, zone.longitude, zone.radius, 'HIGH');
    res.status(201).json(db.prepare(zoneSelect + ' WHERE id=?').get(added.lastInsertRowid));
  });

  r.put('/zones/:id', (req, res) => {
    const id = Number(req.params.id);
    const zone = parseZone(req.body);
    if (!Number.isSafeInteger(id) || id < 1 || !zone) return res.status(400).json({ error: 'Enter a valid zone and map point.' });
    const result = db.prepare("UPDATE danger_zones SET name=?,latitude=?,longitude=?,radius=?,risk_level='HIGH',created_at=datetime('now') WHERE id=? AND user_id IS NULL AND source IN ('admin_manual','admin_approved')")
      .run(zone.name, zone.latitude, zone.longitude, zone.radius, id);
    if (!result.changes) return res.status(404).json({ error: 'Administrator-managed zone not found.' });
    res.json(db.prepare(zoneSelect + ' WHERE id=?').get(id));
  });

  r.delete('/zones/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid zone ID.' });
    const result = db.prepare("DELETE FROM danger_zones WHERE id=? AND user_id IS NULL AND source IN ('admin_manual','admin_approved')").run(id);
    if (!result.changes) return res.status(404).json({ error: 'Administrator-managed zone not found.' });
    res.json({ ok: true });
  });

  return r;
}
