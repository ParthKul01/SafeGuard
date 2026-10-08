import { LocateFixed, LocateOff } from 'lucide-react';
import { useSafety } from '../context/SafetyContext';

const MESSAGE = {
  idle: 'Location is off. Turn it on to use your real position.',
  requesting: 'Waiting for permission or a GPS fix…',
  active: 'Using your device location.',
  denied: 'Permission denied. Allow location in your browser settings, then try again.',
  unavailable: 'Location is unavailable on this device or browser.',
} as const;

export default function GpsControl() {
  const { gps } = useSafety();
  const on = gps.status === 'active' || gps.status === 'requesting';
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button onClick={on ? gps.stop : gps.request}
        className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 font-medium hover:border-primary">
        {on ? <LocateOff size={16} /> : <LocateFixed size={16} />}{on ? 'Turn off location' : 'Enable location'}
      </button>
      <span className="text-muted">{MESSAGE[gps.status]}{gps.accuracy && gps.status === 'active' ? ` Accuracy ±${Math.round(gps.accuracy)} m.` : ''}</span>
    </div>
  );
}
