import { Router } from 'express';

const parseZone = (body) => {
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/[<>]/g, '') : '';
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const radius = Number(body?.radius);
  const zoneType = body?.zoneType;
  if (name.length < 2 || name.length > 80) return null;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  if (!Number.isFinite(radius) || radius < 50 || radius > 2000) return null;
  if (zoneType !== 'DANGER' && zoneType !== 'SAFE') return null;
  return { name, latitude, longitude, radius, zoneType, riskLevel: zoneType === 'DANGER' ? 'HIGH' : 'LOW' };
};

const zoneSelect = 'SELECT id, name, latitude, longitude, radius, risk_level AS riskLevel, zone_type AS zoneType, source, created_at AS createdAt, (user_id = ?) AS isMine FROM danger_zones';

export default function zonesRouter(db) {
  const r = Router();
  r.get('/', (req, res) => {
    const userId = req.authUser.id;
    const rows = db.prepare(zoneSelect + " WHERE (user_id IS NULL OR (user_id = ? AND zone_type='SAFE')) AND source != ? ORDER BY created_at DESC, id DESC").all(userId, userId, 'demo_sample');
    res.json(rows.map((row) => ({ ...row, isMine: Boolean(row.isMine) })));
  });

  r.get('/reports', (req, res) => {
    res.json(db.prepare("SELECT id, name, latitude, longitude, radius, status, created_at AS createdAt, updated_at AS updatedAt, reviewed_at AS reviewedAt FROM zone_reports WHERE user_id=? ORDER BY created_at DESC, id DESC").all(req.authUser.id));
  });

  r.post('/reports', (req, res) => {
    const zone = parseZone({ ...req.body, zoneType: 'DANGER' });
    if (!zone) return res.status(400).json({ error: 'Enter a name, map point, and radius between 50 m and 2,000 m.' });
    const result = db.prepare("INSERT INTO zone_reports (user_id,name,latitude,longitude,radius,status,created_at,updated_at) VALUES (?,?,?,?,?,'PENDING',datetime('now'),datetime('now'))")
      .run(req.authUser.id, zone.name, zone.latitude, zone.longitude, zone.radius);
    const report = db.prepare('SELECT id,name,latitude,longitude,radius,status,created_at AS createdAt,updated_at AS updatedAt,reviewed_at AS reviewedAt FROM zone_reports WHERE id=?').get(result.lastInsertRowid);
    res.status(201).json(report);
  });

  r.put('/reports/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid report ID.' });
    const zone = parseZone({ ...req.body, zoneType: 'DANGER' });
    if (!zone) return res.status(400).json({ error: 'Enter a name, map point, and radius between 50 m and 2,000 m.' });
    const result = db.prepare("UPDATE zone_reports SET name=?,latitude=?,longitude=?,radius=?,updated_at=datetime('now') WHERE id=? AND user_id=? AND status='PENDING'")
      .run(zone.name, zone.latitude, zone.longitude, zone.radius, id, req.authUser.id);
    if (!result.changes) return res.status(404).json({ error: 'That pending danger report was not found.' });
    res.json(db.prepare('SELECT id,name,latitude,longitude,radius,status,created_at AS createdAt,updated_at AS updatedAt,reviewed_at AS reviewedAt FROM zone_reports WHERE id=?').get(id));
  });

  r.delete('/reports/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid report ID.' });
    const result = db.prepare("DELETE FROM zone_reports WHERE id=? AND user_id=? AND status IN ('PENDING','REJECTED')").run(id, req.authUser.id);
    if (!result.changes) return res.status(404).json({ error: 'That report cannot be removed.' });
    res.json({ ok: true });
  });

  r.post('/', (req, res) => {
    const zone = parseZone(req.body);
    if (!zone) return res.status(400).json({ error: 'Enter a name, map point, zone type, and radius between 50 m and 2,000 m.' });
    if (zone.zoneType === 'DANGER') return res.status(403).json({ error: 'Danger areas must be reviewed by an administrator before they appear on the map.' });
    const result = db.prepare("INSERT INTO danger_zones (name,latitude,longitude,radius,risk_level,user_id,zone_type,source,created_at) VALUES (?,?,?,?,?,?,'SAFE','user_report',datetime('now'))")
      .run(zone.name, zone.latitude, zone.longitude, zone.radius, 'LOW', req.authUser.id);
    const row = db.prepare(zoneSelect + ' WHERE id=?').get(req.authUser.id, result.lastInsertRowid);
    res.status(201).json({ ...row, isMine: Boolean(row.isMine) });
  });

  r.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid place ID.' });
    const zone = parseZone(req.body);
    if (!zone) return res.status(400).json({ error: 'Enter a name, map point, zone type, and radius between 50 m and 2,000 m.' });
    if (zone.zoneType === 'DANGER') return res.status(403).json({ error: 'Danger areas must be submitted for administrator review.' });
    const result = db.prepare("UPDATE danger_zones SET name=?,latitude=?,longitude=?,radius=?,risk_level='LOW',created_at=datetime('now') WHERE id=? AND user_id=? AND source='user_report' AND zone_type='SAFE'")
      .run(zone.name, zone.latitude, zone.longitude, zone.radius, id, req.authUser.id);
    if (!result.changes) return res.status(404).json({ error: 'That personal place was not found.' });
    const row = db.prepare(zoneSelect + ' WHERE id=?').get(req.authUser.id, id);
    res.json({ ...row, isMine: Boolean(row.isMine) });
  });

  r.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid place ID.' });
    const result = db.prepare("DELETE FROM danger_zones WHERE id=? AND user_id=? AND source='user_report' AND zone_type='SAFE'").run(id, req.authUser.id);
    if (!result.changes) return res.status(404).json({ error: 'That personal place was not found.' });
    res.json({ ok: true });
  });
  return r;
}
