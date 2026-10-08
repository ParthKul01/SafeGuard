import type { RiskLevel, Signals } from '../types';

// Mirrors the weights the backend will own in Phase 7.
export const WEIGHTS: Record<keyof Signals, number> = {
  crime: 0.25, threat: 0.35, fall: 0.30, geofence: 0.10,
};

export const levelFromScore = (s: number): RiskLevel => (s <= 30 ? 'LOW' : s <= 65 ? 'MODERATE' : 'HIGH');

export const fuse = (s: Signals) =>
  Math.round((Object.keys(WEIGHTS) as (keyof Signals)[]).reduce((sum, k) => sum + s[k] * WEIGHTS[k], 0));

export const explain = (s: Signals): string[] => {
  const out: string[] = [];
  if (s.threat >= 50) out.push('Threatening speech content flagged');
  if (s.fall >= 80) out.push('Possible fall pattern detected');
  else if (s.fall >= 50) out.push('Abnormal movement detected');
  if (s.geofence >= 50) out.push('High-risk zone nearby');
  if (s.crime >= 60) out.push('High historical crime in this area');
  return out;
};

export const levelText: Record<RiskLevel, string> = { LOW: 'text-safe', MODERATE: 'text-warn', HIGH: 'text-danger' };
export const levelBg: Record<RiskLevel, string> = { LOW: 'bg-safe', MODERATE: 'bg-warn', HIGH: 'bg-danger' };
