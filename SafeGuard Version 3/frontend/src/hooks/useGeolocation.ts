import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coords } from '../types';

export type GpsStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable';

// Pune city centre, used until the user shares their location.
export const DEFAULT_COORDS: Coords = { latitude: 18.5204, longitude: 73.8567 };

export function useGeolocation() {
  const [status, setStatus] = useState<GpsStatus>('idle');
  const [position, setPosition] = useState<Coords | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setStatus('idle');
    setPosition(null);
  }, []);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) return setStatus('unavailable');
    if (watchId.current !== null) return;
    setStatus('requesting');
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPosition({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setAccuracy(p.coords.accuracy);
        setStatus('active');
      },
      (e) => {
        watchId.current = null;
        setStatus(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
  }, []);

  // Never prompt automatically; only resume silently if permission was already granted.
  useEffect(() => {
    navigator.permissions?.query({ name: 'geolocation' }).then((r) => r.state === 'granted' && request()).catch(() => {});
    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
  }, [request]);

  return { status, position, accuracy, request, stop };
}
