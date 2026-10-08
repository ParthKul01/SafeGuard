import { useEffect, useState } from 'react';
import { predictCrime } from '../services/crime';
import type { Coords, CrimePrediction } from '../types';

const REFRESH_MS = 10 * 60 * 1000; // time of day is a feature, so refresh periodically

export function useCrimeRisk({ latitude, longitude }: Coords, enabled = true) {
  const [prediction, setPrediction] = useState<CrimePrediction | null>(null);
  useEffect(() => {
    let alive = true;
    if (!enabled) { setPrediction(null); return () => { alive = false; }; }
    const run = () => predictCrime({ latitude, longitude }).then((p) => alive && setPrediction(p.source === 'mock' ? null : p), () => alive && setPrediction(null));
    run();
    const id = setInterval(run, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [enabled, latitude.toFixed(4), longitude.toFixed(4)]); // eslint-disable-line react-hooks/exhaustive-deps
  return prediction;
}
