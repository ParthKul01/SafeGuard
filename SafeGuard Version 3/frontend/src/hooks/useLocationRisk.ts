import { useEffect, useState } from 'react';
import { getLocationRisk } from '../services/location';
import type { Coords, LocationRisk } from '../types';

export function useLocationRisk({ latitude, longitude }: Coords, enabled = true, refreshKey = '') {
  const [risk, setRisk] = useState<LocationRisk | null>(null);
  useEffect(() => {
    let alive = true;
    if (!enabled) { setRisk(null); return () => { alive = false; }; }
    getLocationRisk({ latitude, longitude }).then((result) => alive && setRisk(result), () => alive && setRisk(null));
    return () => { alive = false; };
  }, [enabled, latitude.toFixed(4), longitude.toFixed(4), refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return risk;
}
