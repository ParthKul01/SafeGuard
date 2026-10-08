import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Coords, DangerZone, LiveState, LocationRisk, MovementSignal, RiskLevel, Signals, VoiceResult } from '../types';
import { explain, fuse, levelFromScore } from '../utils/risk';
import { DEFAULT_COORDS, useGeolocation } from '../hooks/useGeolocation';
import { useLocationRisk } from '../hooks/useLocationRisk';
import { useCrimeRisk } from '../hooks/useCrimeRisk';
import { useZones } from '../hooks/useZones';

const GEO_LABEL: Record<LocationRisk['status'], LiveState['geofence']> = {
  SAFE: 'NO REPORTED DANGER ZONE',
  NEAR: 'NEAR DANGER ZONE',
  INSIDE: 'INSIDE DANGER ZONE',
};
const cap = (level: RiskLevel) => level[0] + level.slice(1).toLowerCase();

export type LocationSource = 'gps' | 'default';

function useSafetyState() {
  const [voice, setVoice] = useState<VoiceResult | null>(null);
  const [movement, setMovement] = useState<MovementSignal | null>(null);
  const gps = useGeolocation();
  const zoneState = useZones();
  const zones: DangerZone[] = zoneState.zones;

  const coords = gps.position ?? DEFAULT_COORDS;
  const source: LocationSource = gps.position ? 'gps' : 'default';
  const locationAvailable = Boolean(gps.position);
  const geo = useLocationRisk(coords, locationAvailable, zoneState.revision + '|' + zoneState.zones.map((zone) => zone.id + ':' + zone.latitude + ':' + zone.longitude + ':' + zone.radius + ':' + zone.zoneType).join('|'));
  const crime = useCrimeRisk(coords, locationAvailable);

  return useMemo(() => {
    const signals: Signals = {
      crime: crime ? Math.round(crime.probability * 100) : 0,
      threat: voice ? Math.round(voice.threatProbability * 100) : 0,
      fall: movement?.fallScore ?? 0,
      geofence: geo?.geofenceScore ?? 0,
    };
    const live: LiveState = {
      voice: voice?.classification ?? 'NORMAL',
      movement: movement?.classification ?? 'UNKNOWN',
      geofence: geo ? GEO_LABEL[geo.status] : 'UNKNOWN',
    };
    const score = fuse(signals);
    const nearest = geo?.zones[0];
    const areaRisk: RiskLevel = crime?.riskLevel ?? geo?.areaRisk ?? 'LOW';
    const nearby = nearest
      ? nearest.inside ? 'Inside your reported danger area: ' + nearest.name : 'Reported danger area ' + nearest.distanceM + ' m away: ' + nearest.name
      : null;
    const label = locationAvailable ? 'Your current location' : 'Location not enabled';

    return {
      signals, live, score, level: levelFromScore(score), reasons: explain(signals),
      location: { ...coords, label, source }, locationAvailable,
      areaRisk, nearby, geo, zones, refreshZones: zoneState.refresh, zonesLoading: zoneState.loading, zonesError: zoneState.error,
      crime, voice, setVoice, movement, setMovement,
      gps: { status: gps.status, accuracy: gps.accuracy, request: gps.request, stop: gps.stop },
    };
  }, [gps.position, gps.status, gps.accuracy, gps.request, gps.stop, coords, source, locationAvailable, geo, crime, voice, movement, zones, zoneState.refresh, zoneState.loading, zoneState.error, zoneState.revision]);
}

const Ctx = createContext<ReturnType<typeof useSafetyState> | null>(null);
export const SafetyProvider = ({ children }: { children: ReactNode }) => <Ctx.Provider value={useSafetyState()}>{children}</Ctx.Provider>;
export const useSafety = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSafety must be used inside SafetyProvider');
  return value;
};
