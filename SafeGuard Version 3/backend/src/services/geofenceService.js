// Geofencing against explicit danger reports or sourced danger datasets; this is not live crime detection.
export const NEAR_BUFFER_M = 500;
export const LIST_RANGE_M = 3000;

const BASE_SCORE = { HIGH: 100, MODERATE: 70, LOW: 40 };
const ORDER = { LOW: 1, MODERATE: 2, HIGH: 3 };
const LEVELS = ['LOW', 'MODERATE', 'HIGH'];
const stepDown = (level) => LEVELS[Math.max(0, LEVELS.indexOf(level) - 1)];

export function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function evaluateLocation(latitude, longitude, zones) {
  const measured = zones
    .filter((zone) => (zone.zone_type ?? zone.zoneType ?? 'DANGER') === 'DANGER' && zone.source !== 'demo_sample')
    .map((zone) => {
      const edge = haversineM(latitude, longitude, zone.latitude, zone.longitude) - zone.radius;
      return { id: zone.id, name: zone.name, riskLevel: zone.risk_level ?? zone.riskLevel, inside: edge <= 0, distanceM: Math.max(0, Math.round(edge)) };
    })
    .sort((a, b) => a.distanceM - b.distanceM || ORDER[b.riskLevel] - ORDER[a.riskLevel]);

  const inside = measured.filter((zone) => zone.inside);
  const near = measured.filter((zone) => !zone.inside && zone.distanceM <= NEAR_BUFFER_M);
  const scores = [
    ...inside.map((zone) => BASE_SCORE[zone.riskLevel]),
    ...near.map((zone) => BASE_SCORE[zone.riskLevel] * 0.6 * (1 - zone.distanceM / NEAR_BUFFER_M)),
  ];
  const top = (list) => list.reduce((maximum, zone) => (ORDER[zone.riskLevel] > ORDER[maximum] ? zone.riskLevel : maximum), 'LOW');

  return {
    location: { latitude, longitude },
    status: inside.length ? 'INSIDE' : near.length ? 'NEAR' : 'SAFE',
    areaRisk: inside.length ? top(inside) : near.length ? stepDown(top(near)) : 'LOW',
    geofenceScore: Math.round(Math.max(0, ...scores)),
    zones: measured.filter((zone) => zone.distanceM <= LIST_RANGE_M),
  };
}
