import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Footprints, Square } from 'lucide-react';
import Card from './Card';
import { useSafety } from '../context/SafetyContext';
import type { MovementSignal } from '../types';

type SensorStatus = 'off' | 'requesting' | 'listening' | 'unsupported' | 'denied' | 'no-data' | 'error';
const STATUS: Record<SensorStatus, string> = {
  off: 'Off', requesting: 'Requesting permission', listening: 'Reading phone sensors',
  unsupported: 'Motion sensor unavailable', denied: 'Permission denied', 'no-data': 'No sensor readings', error: 'Sensor error',
};
const finite = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n);
const magnitude = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

export default function MovementPanel() {
  const { movement, setMovement, live } = useSafety();
  const [status, setStatus] = useState<SensorStatus>('off');
  const [error, setError] = useState('');
  const [readingCount, setReadingCount] = useState(0);
  const freeFallAt = useRef(0);
  const lastUiUpdate = useRef(0);
  const lastCounterUpdate = useRef(0);
  const totalReadings = useRef(0);
  const noDataTimer = useRef<number | null>(null);

  const onMotion = useCallback((event: DeviceMotionEvent) => {
    const direct = event.acceleration;
    const gravity = event.accelerationIncludingGravity;
    const hasDirect = finite(direct?.x) && finite(direct?.y) && finite(direct?.z);
    const source = hasDirect ? direct : gravity;
    if (!finite(source?.x) || !finite(source?.y) || !finite(source?.z)) return;

    const x = source.x, y = source.y, z = source.z;
    const rawMagnitude = magnitude(x, y, z);
    // Without gravity-free acceleration, estimate motion as deviation from gravity.
    const dynamicMagnitude = hasDirect ? rawMagnitude : Math.abs(rawMagnitude - 9.81);
    const rotation = event.rotationRate;
    const rotationMagnitude = rotation && finite(rotation.alpha) && finite(rotation.beta) && finite(rotation.gamma)
      ? magnitude(rotation.alpha, rotation.beta, rotation.gamma) : 0;
    const now = Date.now();
    const freeFall = hasDirect ? rawMagnitude < 2.0 : rawMagnitude < 3.0;
    const impact = hasDirect ? rawMagnitude > 22 : rawMagnitude > 25;
    if (freeFall) freeFallAt.current = now;
    const fallCandidate = impact && (now - freeFallAt.current < 1500 || dynamicMagnitude > 18);
    const abnormal = dynamicMagnitude > 8 || rotationMagnitude > 180;
    const classification: MovementSignal['classification'] = fallCandidate ? 'FALL_CANDIDATE' : abnormal ? 'ABNORMAL' : 'NORMAL';
    // A transparent heuristic risk contribution, not an ML probability or confidence.
    const fallScore = fallCandidate ? 88 : abnormal ? 58 : dynamicMagnitude > 4 || rotationMagnitude > 90 ? 30 : 5;
    if (noDataTimer.current !== null) window.clearTimeout(noDataTimer.current);
    noDataTimer.current = null;
    setStatus('listening');
    totalReadings.current += 1;
    if (now - lastCounterUpdate.current >= 500) {
      lastCounterUpdate.current = now;
      setReadingCount(totalReadings.current);
    }
    if (now - lastUiUpdate.current >= 200 || fallCandidate) {
      lastUiUpdate.current = now;
      setMovement({
        classification, fallScore,
        acceleration: { x, y, z, magnitude: dynamicMagnitude },
        rotationRate: rotation && finite(rotation.alpha) && finite(rotation.beta) && finite(rotation.gamma)
          ? { alpha: rotation.alpha, beta: rotation.beta, gamma: rotation.gamma } : null,
        lastUpdated: now,
      });
    }
  }, [setMovement]);

  const stop = useCallback(() => {
    window.removeEventListener('devicemotion', onMotion);
    if (noDataTimer.current !== null) window.clearTimeout(noDataTimer.current);
    noDataTimer.current = null;
    setStatus('off');
    setMovement(null);
  }, [onMotion, setMovement]);

  const start = async () => {
    setError(''); setReadingCount(0); totalReadings.current = 0; setStatus('requesting');
    if (!window.isSecureContext) {
      setStatus('error');
      setError('Motion sensors require HTTPS. Use localhost for same-device testing, or deploy the site over HTTPS and open it on your phone.');
      return;
    }
    if (!('DeviceMotionEvent' in window)) {
      setStatus('unsupported');
      setError('This browser does not expose device motion sensors. Open the site on a compatible smartphone browser.');
      return;
    }
    try {
      const motionApi = DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<string> };
      if (typeof motionApi.requestPermission === 'function') {
        const permission = await motionApi.requestPermission();
        if (permission !== 'granted') { setStatus('denied'); setError('Allow motion access in the browser prompt to start monitoring.'); return; }
      }
      freeFallAt.current = 0; lastUiUpdate.current = 0;
      window.addEventListener('devicemotion', onMotion);
      setStatus('requesting');
      noDataTimer.current = window.setTimeout(() => {
        window.removeEventListener('devicemotion', onMotion);
        setMovement(null);
        setStatus('no-data');
        setError('The browser allowed access but no motion readings arrived. Check device/browser support and try again on your phone.');
      }, 3500);
    } catch (e) {
      setStatus('denied');
      setError(e instanceof Error ? e.message : 'Could not access motion sensors.');
    }
  };

  useEffect(() => () => {
    window.removeEventListener('devicemotion', onMotion);
    if (noDataTimer.current !== null) window.clearTimeout(noDataTimer.current);
  }, [onMotion]);

  const result = movement;
  const tone = live.movement === 'FALL_CANDIDATE' ? 'text-danger' : live.movement === 'ABNORMAL' ? 'text-warn' : live.movement === 'NORMAL' ? 'text-safe' : 'text-muted';
  const activity = live.movement === 'FALL_CANDIDATE' ? 'Possible fall pattern' : live.movement === 'ABNORMAL' ? 'Abnormal movement' : live.movement === 'NORMAL' ? 'Normal movement' : 'Waiting for sensor data';

  return <Card title="Live movement sensors" icon={<Footprints size={16} />}>
    <div className="flex flex-wrap items-center gap-3">
      {status === 'listening' || status === 'requesting' ? <button onClick={stop} className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold"><Square size={14} />Stop monitoring</button>
        : <button onClick={() => void start()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"><Activity size={15} />Start motion monitoring</button>}
      <span className="flex items-center gap-2 text-sm text-muted"><span className={`size-2 rounded-full ${status === 'listening' ? 'animate-pulse bg-safe' : status === 'denied' || status === 'error' || status === 'no-data' ? 'bg-danger' : 'bg-muted'}`} />{STATUS[status]}</span>
    </div>
    <div className="mt-4 grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-3">
      <div><p className="text-xs text-muted">Movement classification</p><p className={`mt-1 font-bold ${tone}`}>{activity}</p></div>
      <div><p className="text-xs text-muted">Motion risk contribution</p><p className="num mt-1 font-bold">{result ? `${result.fallScore}/100` : '—'}</p></div>
      <div><p className="text-xs text-muted">Sensor readings</p><p className="num mt-1 font-semibold">{status === 'listening' ? readingCount : '—'}</p></div>
    </div>
    {result && <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-bg p-3 text-xs sm:grid-cols-4"><div><p className="text-muted">Acceleration X</p><p className="num">{result.acceleration.x.toFixed(2)} m/s²</p></div><div><p className="text-muted">Acceleration Y</p><p className="num">{result.acceleration.y.toFixed(2)} m/s²</p></div><div><p className="text-muted">Acceleration Z</p><p className="num">{result.acceleration.z.toFixed(2)} m/s²</p></div><div><p className="text-muted">Updated</p><p>{new Date(result.lastUpdated).toLocaleTimeString()}</p></div></div>}
    {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
    <p className="mt-3 text-xs text-muted">Reads accelerometer/gyroscope events from this phone in the browser. Processing stays on this device. The current fall-candidate rules are heuristic, not a trained ML or medical-grade detector. A candidate only affects the fused risk score; it never sends an alert by itself.</p>
  </Card>;
}
