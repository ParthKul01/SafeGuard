import { Router } from 'express';
import { locationQuerySchema } from '../schemas/index.js';
import { validateQuery } from '../middleware/validate.js';
import { evaluateLocation } from '../services/geofenceService.js';

export default function locationRouter(db) {
  const r = Router();
  r.get('/risk', validateQuery(locationQuerySchema), (req, res) => {
    const zones = db.prepare(
      "SELECT id, name, latitude, longitude, radius, risk_level, zone_type, source FROM danger_zones WHERE (user_id IS NULL OR (user_id = ? AND zone_type='SAFE')) AND source != 'demo_sample'",
    ).all(req.authUser.id);
    res.json(evaluateLocation(req.filters.lat, req.filters.lng, zones));
  });

  r.get('/sharing', (req, res) => {
    const row = db.prepare("SELECT enabled, consented_at AS consentedAt, updated_at AS updatedAt FROM user_location_shares WHERE user_id=?").get(req.authUser.id);
    res.json({ isSharing: Boolean(row?.enabled), consentedAt: row?.consentedAt ?? null, updatedAt: row?.updatedAt ?? null });
  });

  r.put('/sharing', (req, res) => {
    if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'Choose whether location sharing is on or off.' });
    const enabled = req.body.enabled ? 1 : 0;
    db.prepare("INSERT INTO user_location_shares (user_id,enabled,consented_at,updated_at) VALUES (?,?,CASE WHEN ?=1 THEN datetime('now') ELSE NULL END,datetime('now')) " +
      "ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled, consented_at=CASE WHEN excluded.enabled=1 THEN datetime('now') ELSE user_location_shares.consented_at END, updated_at=datetime('now')")
      .run(req.authUser.id, enabled, enabled);
    if (!enabled) db.prepare('DELETE FROM user_live_locations WHERE user_id=?').run(req.authUser.id);
    res.json({ isSharing: Boolean(enabled) });
  });

  r.post('/sharing/location', (req, res) => {
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    const accuracy = req.body?.accuracy == null ? null : Number(req.body.accuracy);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000))) {
      return res.status(400).json({ error: 'A valid device location is required.' });
    }
    const sharing = db.prepare('SELECT enabled FROM user_location_shares WHERE user_id=?').get(req.authUser.id);
    if (!sharing?.enabled) return res.status(403).json({ error: 'Turn on location sharing before sending a location.' });
    db.prepare("INSERT INTO user_live_locations (user_id,latitude,longitude,accuracy,updated_at) VALUES (?,?,?,?,datetime('now')) " +
      "ON CONFLICT(user_id) DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,accuracy=excluded.accuracy,updated_at=datetime('now')")
      .run(req.authUser.id, latitude, longitude, accuracy);
    res.json({ ok: true, updatedAt: new Date().toISOString() });
  });

  return r;
}
