// PROTOTYPE ONLY. A transparent rule-based stand-in with the same contract as the future Random Forest.
// It does NOT use real crime data. Replace via CRIME_MODEL=http (see src/ml/README.md).
export const levelFromProbability = (p) => (p < 0.35 ? 'LOW' : p < 0.65 ? 'MODERATE' : 'HIGH');
const lower = (s) => s.toLowerCase();

export const mockCrimeModel = {
  source: 'mock',
  modelVersion: 'mock-rules-1.0',

  async predict(f) {
    const factors = ['Historical crime frequency (city baseline)'];
    let p = 0.15;

    p += (f.geofenceScore / 100) * 0.55;
    const z = f.nearestZone;
    if (f.geofenceStatus === 'INSIDE' && z) factors.push(`Inside ${lower(z.riskLevel)}-risk zone: ${z.name}`);
    else if (f.geofenceStatus === 'NEAR' && z) factors.push(`Near ${lower(z.riskLevel)}-risk zone (${z.distanceM} m): ${z.name}`);
    if (f.areaRiskCategory !== 'LOW') factors.push(`Area risk category: ${f.areaRiskCategory}`);

    if (f.hour >= 22 || f.hour < 5) { p += 0.2; factors.push('Night-time hours (22:00 to 05:00)'); }
    else if (f.hour >= 18) { p += 0.1; factors.push('Evening hours (18:00 to 22:00)'); }

    const probability = Math.round(Math.min(1, Math.max(0, p)) * 100) / 100;
    return { riskLevel: levelFromProbability(probability), probability, factors, source: this.source, modelVersion: this.modelVersion };
  },
};
