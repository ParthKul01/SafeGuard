import { useCallback, useEffect, useState } from 'react';
import { getAuthToken } from '../services/auth';
import { getZones } from '../services/location';
import type { DangerZone } from '../types';

export function useZones() {
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(async () => {
    if (!getAuthToken()) {
      setZones([]);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setZones(await getZones());
      setRevision((value) => value + 1);
      setError('');
    } catch (err) {
      setZones([]);
      setError(err instanceof Error ? err.message : 'Could not load saved places.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onAuthChange = () => {
      if (getAuthToken()) void refresh();
      else {
        setZones([]);
        setError('');
        setLoading(false);
      }
    };
    onAuthChange();
    window.addEventListener('safegaurd:auth-change', onAuthChange);
    const timer = window.setInterval(() => { if (getAuthToken()) void refresh(); }, 30000);
    return () => {
      window.removeEventListener('safegaurd:auth-change', onAuthChange);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { zones, loading, error, revision, refresh };
}
