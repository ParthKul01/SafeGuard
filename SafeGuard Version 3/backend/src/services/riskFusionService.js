const configured = {
  crime: Number(process.env.RISK_WEIGHT_CRIME ?? 0.25),
  threat: Number(process.env.RISK_WEIGHT_THREAT ?? 0.35),
  fall: Number(process.env.RISK_WEIGHT_FALL ?? 0.30),
  geofence: Number(process.env.RISK_WEIGHT_GEOFENCE ?? 0.10),
};
const total = Object.values(configured).reduce((sum, weight) => sum + weight, 0);
const weights = total > 0 && Object.values(configured).every((weight) => Number.isFinite(weight) && weight >= 0)
  ? Object.fromEntries(Object.entries(configured).map(([key, weight]) => [key, weight / total]))
  : { crime: 0.25, threat: 0.35, fall: 0.30, geofence: 0.10 };

export function riskFusionService() {
  return {
    calculate(signals) {
      const score = Math.round(Object.entries(weights).reduce((sum, [key, weight]) => sum + signals[key] * weight, 0));
      const riskLevel = score <= 30 ? 'LOW' : score <= 65 ? 'MODERATE' : 'HIGH';
      const reasons = [];
      if (signals.threat >= 50) reasons.push('Threatening speech content flagged');
      if (signals.fall >= 50) reasons.push('Abnormal movement detected');
      if (signals.geofence >= 50) reasons.push('High-risk zone nearby');
      if (signals.crime >= 60) reasons.push('High historical crime risk in this area');
      return { score, riskLevel, weights, reasons, source: 'weighted-prototype' };
    },
  };
}
