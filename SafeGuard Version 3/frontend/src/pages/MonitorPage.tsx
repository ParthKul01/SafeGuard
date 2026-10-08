import { Activity } from 'lucide-react';
import Card from '../components/Card';
import VoicePanel from '../components/VoicePanel';
import MovementPanel from '../components/MovementPanel';
import RiskSimulationPanel from '../components/RiskSimulationPanel';
import { useSafety } from '../context/SafetyContext';
import { levelText } from '../utils/risk';
import { useEffect, useState } from 'react';
import { getHealth } from '../services/api';

const dot = { ok: 'bg-safe', idle: 'bg-muted', warn: 'bg-warn', bad: 'bg-danger' } as const;

export default function MonitorPage() {
  const { gps, geo, locationAvailable, voice, level, score, crime, live, zones } = useSafety();
  const [voiceStatus, setVoiceStatus] = useState<'checking' | 'ready' | 'unconfigured' | 'offline'>('checking');
  useEffect(() => { let active = true; getHealth().then((health) => active && setVoiceStatus(health.voice?.enabled === true ? 'ready' : 'unconfigured')).catch(() => active && setVoiceStatus('offline')); return () => { active = false; }; }, []);

  const geofenceTone = !locationAvailable || !geo ? 'idle' : geo.status === 'INSIDE' ? 'bad' : geo.status === 'NEAR' ? 'warn' : 'idle';
  const geofenceStatus = !locationAvailable ? 'Waiting for GPS' : geo?.status === 'INSIDE' ? 'Danger area entry' : geo?.status === 'NEAR' ? 'Near a reported area' : 'No report nearby';
  const rows: { name: string; tone: keyof typeof dot; status: string; detail: string }[] = [
    { name: 'GPS', tone: gps.status === 'active' ? 'ok' : gps.status === 'denied' ? 'bad' : 'idle', status: gps.status === 'active' ? 'Active' : gps.status === 'denied' ? 'Denied' : 'Not enabled', detail: gps.accuracy ? 'Accuracy +/-' + Math.round(gps.accuracy) + ' m' : 'Enable device location to share your real position' },
    { name: 'Personal geofence', tone: geofenceTone, status: geofenceStatus, detail: locationAvailable && geo ? zones.length + ' saved places; only danger reports affect this warning' : 'Enable location and add a danger-area report to use this warning' },
    { name: 'Crime model', tone: crime ? 'ok' : 'idle', status: crime ? 'Active' : 'Unavailable', detail: crime ? Math.round(crime.probability * 100) + '% (' + crime.source + ' model)' : 'Street-level crime data/model is not connected' },
    { name: 'Voice analysis', tone: voice ? (voice.classification === 'NORMAL' ? 'ok' : 'warn') : voiceStatus === 'ready' ? 'ok' : 'idle', status: voice ? voice.classification : voiceStatus === 'ready' ? 'Ready' : voiceStatus === 'offline' ? 'Backend offline' : voiceStatus === 'unconfigured' ? 'Unavailable' : 'Checking', detail: voice ? 'Model score ' + Math.round(voice.probability * 100) + '%, updated ' + new Date(voice.analyzedAt).toLocaleTimeString() : voiceStatus === 'ready' ? 'Pretrained transcription and transcript classification are connected' : voiceStatus === 'offline' ? 'The website cannot reach the API on port 5000' : 'Configure pretrained voice models in the backend environment' },
    { name: 'Movement sensors', tone: live.movement === 'UNKNOWN' ? 'idle' : live.movement === 'NORMAL' ? 'ok' : 'warn', status: live.movement, detail: live.movement === 'UNKNOWN' ? 'Waiting for phone sensor permission and readings' : 'Live accelerometer/gyroscope readings - on-device heuristic' },
    { name: 'Risk engine', tone: 'ok', status: 'Active', detail: 'Combines connected inputs; unavailable inputs contribute zero' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">System status</p><h1 className="text-3xl font-semibold tracking-tight">Safety monitor</h1>
        <p className="mt-2 text-sm text-muted">See which device and data inputs are available right now.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Modules" icon={<Activity size={16} />}>
          <ul className="divide-y divide-line text-sm">
            {rows.map((row) => (
              <li key={row.name} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className={'mt-1.5 size-2 shrink-0 rounded-full ' + dot[row.tone]} />
                <div className="min-w-0 flex-1"><p className="font-medium">{row.name}</p><p className="text-muted">{row.detail}</p></div>
                <span className="shrink-0 font-semibold">{row.status}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-sm">Overall risk: <b className={'num ' + levelText[level]}>{score} ({level})</b></p>
        </Card>
        <div className="space-y-5"><VoicePanel /><MovementPanel /></div>
        <div className="lg:col-span-2"><RiskSimulationPanel /></div>
      </div>
    </div>
  );
}
