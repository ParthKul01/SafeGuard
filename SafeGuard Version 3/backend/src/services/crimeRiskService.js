import { evaluateLocation } from './geofenceService.js';

export function crimeRiskService(db, model) {
  return {
    model,
    async predict({ latitude, longitude, hour, dayOfWeek }) {
      const now = new Date();
      // Personal reports are private and feed the user's geofence signal, not a shared area-crime model.
      const zones = db.prepare(
        "SELECT id, name, latitude, longitude, radius, risk_level, zone_type, source FROM danger_zones WHERE user_id IS NULL AND source != 'demo_sample'",
      ).all();
      const geo = evaluateLocation(latitude, longitude, zones);
      return model.predict({
        latitude, longitude,
        hour: hour ?? now.getHours(),
        dayOfWeek: dayOfWeek ?? now.getDay(),
        geofenceStatus: geo.status,
        geofenceScore: geo.geofenceScore,
        areaRiskCategory: geo.areaRisk,
        nearestZone: geo.zones[0] ?? null,
      });
    },
  };
}
