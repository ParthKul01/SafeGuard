import { Mic, Footprints, MapPin, Siren, TriangleAlert, Gauge, X, CheckCircle2, MessageSquareText, Phone, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GpsControl from '../components/GpsControl';
import Card from '../components/Card';
import RiskGauge from '../components/RiskGauge';
import RiskBar from '../components/RiskBar';
import { useSafety } from '../context/SafetyContext';
import { WEIGHTS } from '../utils/risk';
import { recordEmergency, type EmergencyRecord } from '../services/emergency';
import { listContacts, type EmergencyContact } from '../services/contacts';
import { getHealth } from '../services/api';

const tone = (bad: boolean) => (bad ? 'text-danger' : 'text-safe');

export default function Dashboard() {
  const { signals, live, score, level, reasons, location, locationAvailable, zones, geo } = useSafety();
  const dangerReportCount = zones.filter((zone) => zone.zoneType === 'DANGER').length;
  const [alertResult, setAlertResult] = useState<EmergencyRecord | null>(null);
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertError, setAlertError] = useState('');
  const [alertContacts, setAlertContacts] = useState<EmergencyContact[] | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  useEffect(() => { let active = true; getHealth().then((health) => active && setVoiceReady(health.voice?.enabled === true)).catch(() => active && setVoiceReady(false)); return () => { active = false; }; }, []);
  const openReview = (eventName: string) => {
    setAlertError('');
    setAlertContacts(null);
    setAlertResult({ id: 'pending', userName: 'SafeGaurd user', location, riskLevel: level, riskScore: score, detectedEvent: eventName, timestamp: new Date().toISOString(), status: 'PENDING' });
    setLoadingContacts(true);
    void listContacts().then(setAlertContacts).finally(() => setLoadingContacts(false));
  };
  const confirmAlert = async (status: 'CONFIRMED' | 'DISMISSED') => {
    setSavingAlert(true); setAlertError('');
    try {
      const detectedEvent = reasons.length ? reasons.join(' + ').toUpperCase() : `${live.voice} + ${live.movement}`;
      const result = await recordEmergency({ location, riskLevel: level, riskScore: score, detectedEvent, status });
      setAlertResult(result);
      if (result.emergencyContacts) setAlertContacts(result.emergencyContacts);
    } catch (error) {
      setAlertError(error instanceof Error ? error.message : 'Could not save the event.');
    } finally { setSavingAlert(false); }
  };
  return (
    <div className="space-y-7">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">Personal safety · Live overview</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Stay aware. Stay in control.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Your location and available device signals, in one place. Emergency contacts are reached only after you confirm an alert.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="relative overflow-hidden rounded-2xl bg-[#175b52] p-5 text-white shadow-sm sm:p-7">
          <div className="absolute -right-10 -top-16 size-56 rounded-full border border-white/10" /><div className="absolute -right-3 -top-9 size-40 rounded-full border border-white/10" />
          <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/70">Current signal score</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{locationAvailable ? 'Location connected' : 'Start with your location'}</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/75">{locationAvailable ? 'Your device location is available. The score uses the connected signals shown below; no public street-level crime feed is connected.' : 'Enable location to center the map and include your real coordinates in a confirmed alert.'}</p></div>
            <div className="mx-auto rounded-xl bg-white/10 p-3 sm:mx-0"><RiskGauge score={score} level={level} inverse /></div>
          </div>
          <p className="relative mt-5 max-w-2xl border-t border-white/15 pt-4 text-xs leading-5 text-white/70">This score reflects only connected inputs. It is not a safety assessment, and a low score does not mean an area or person is safe.</p>
          <button onClick={() => openReview(reasons.join(' + ').toUpperCase() || 'USER INITIATED')} className="relative mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#f4e4d2] px-4 py-3 text-base font-bold text-[#6f281f] transition hover:bg-white sm:w-auto sm:min-w-64"><Siren size={19} />SOS · Request help</button>
        </section>

        <Card title="Your location" icon={<MapPin size={17} />} className="flex flex-col justify-between">
          <div><p className="text-xl font-semibold tracking-tight">{location.label}</p><p className="mt-2 text-sm leading-6 text-muted">{locationAvailable ? 'Your position is available for a confirmed alert.' : 'Location is off. The map will not show a personal marker until you enable it.'}</p>
            {locationAvailable && <dl className="num mt-5 grid grid-cols-2 gap-3 rounded-xl bg-bg p-3 text-sm"><div><dt className="text-xs text-muted">Latitude</dt><dd className="mt-1 font-medium">{location.latitude.toFixed(5)}</dd></div><div><dt className="text-xs text-muted">Longitude</dt><dd className="mt-1 font-medium">{location.longitude.toFixed(5)}</dd></div></dl>}
          </div><div className="mt-5"><GpsControl /></div>
        </Card>

        <Card title="Connected signals" icon={<ShieldCheck size={17} />} className="xl:col-span-2">
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg"><Mic size={17} className="text-muted" /></span><div><p className="font-medium">Voice analysis <span className="ml-1 text-xs font-normal text-muted">{voiceReady ? 'Ready' : 'Unavailable'}</span></p><p className="mt-1 text-xs leading-5 text-muted">{voiceReady ? 'Pretrained transcription and transcript classification are connected.' : 'Configure pretrained voice models in the backend environment.'}</p></div></div>
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg"><MapPin size={17} className="text-muted" /></span><div><p className="font-medium">Approved danger zones <span className="ml-1 text-xs font-normal text-muted">{dangerReportCount} danger area{dangerReportCount === 1 ? '' : 's'}</span></p><p className="mt-1 text-xs leading-5 text-muted">{geo?.status === 'INSIDE' ? 'You are inside an administrator-marked danger area.' : geo?.status === 'NEAR' ? 'An administrator-marked danger area is nearby.' : 'Approved danger areas are checked when GPS is active. No nearby danger area does not mean a place is safe.'}</p></div></div>
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg"><Footprints size={17} className="text-muted" /></span><div><p className="font-medium">Movement <span className="ml-1 text-xs font-normal text-muted">{live.movement === 'UNKNOWN' ? 'Waiting for sensor' : live.movement}</span></p><p className="mt-1 text-xs leading-5 text-muted">Phone sensor input is available on compatible devices when enabled.</p></div></div>
            <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg"><Gauge size={17} className="text-muted" /></span><div><p className="font-medium">Risk score <span className="ml-1 text-xs font-normal text-muted">{score}/100 · {level}</span></p><p className="mt-1 text-xs leading-5 text-muted">Based on currently connected inputs only.</p></div></div>
          </div>
          {reasons.length > 0 && <div className="mt-5 border-t border-line pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Signals raised</p><ul className="space-y-1.5">{reasons.map((r) => <li key={r} className="flex items-center gap-2 text-sm text-warn"><TriangleAlert size={14} />{r}</li>)}</ul></div>}
        </Card>

        <Card title="Movement input" icon={<Footprints size={17} />} className="xl:col-span-2">
          <p className="text-sm text-muted">Movement detection is a separate phone-sensor feature. It is not a trained model, and its current heuristic should not be treated as a medical fall detector.</p>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-sm"><span>Sensor status</span><b className={live.movement === 'UNKNOWN' ? 'text-muted' : tone(live.movement !== 'NORMAL')}>{live.movement === 'UNKNOWN' ? 'AWAITING SENSOR' : live.movement}</b></div>
          <RiskBar label="Movement heuristic score" value={signals.fall} weight={WEIGHTS.fall} />
        </Card>
      </div>

      {level === 'HIGH' && <div role="alert" className="rounded-xl border border-danger/50 bg-danger/10 p-4 text-danger">
        <p className="font-bold">A connected signal needs attention</p><p className="mt-1 text-sm">Review the signal, then choose whether to confirm an alert to your trusted contacts.</p>
        <button onClick={() => openReview(reasons.join(' + ').toUpperCase() || 'POTENTIAL EMERGENCY')} className="mt-3 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white">Review emergency</button>
      </div>}

      {alertResult && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="emergency-title">
        <section className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-danger">User confirmation required</p><h2 id="emergency-title" className="mt-1 text-2xl font-bold">Potential emergency</h2></div><button aria-label="Close" className="rounded-lg p-2 text-muted hover:text-fg" onClick={() => setAlertResult(null)}><X size={20} /></button></div>
          <p className="mt-3 text-sm leading-6 text-muted">Confirming records this alert. If SMS/call delivery is configured on the server, it will notify contacts who have opted in. Otherwise, you can open a text or call from your device. This does not contact emergency services.</p>
          <div className="mt-4 rounded-xl border border-line p-4 text-sm"><p><b>Risk:</b> {alertResult.riskLevel} · {alertResult.riskScore}/100</p><p className="mt-1"><b>Detected signals:</b> {alertResult.detectedEvent || 'Potential emergency'}</p><p className="mt-1"><b>Location:</b> {locationAvailable ? `${alertResult.location.latitude.toFixed(4)}, ${alertResult.location.longitude.toFixed(4)}` : 'Unavailable — enable device location before recording an alert.'}</p></div>
          <div className="mt-3 rounded-xl border border-line p-4 text-sm"><p className="font-semibold">Emergency contacts</p>{loadingContacts ? <p className="mt-1 text-muted">Loading contacts…</p> : alertContacts?.length ? <ul className="mt-2 space-y-2">{alertContacts.map((contact) => <li key={contact.id} className="flex justify-between gap-3"><span>{contact.name}{contact.isPrimary ? ' · Primary' : ''}<span className="block text-xs text-muted">{contact.relationship}</span></span><span className="shrink-0 text-muted">{contact.phone}</span></li>)}</ul> : <p className="mt-1 text-muted">No contacts saved. <Link to="/contacts" className="text-primary underline" onClick={() => setAlertResult(null)}>Add a contact</Link></p>}</div>
          {alertResult.status === 'CONFIRMED' && <div className={`mt-3 rounded-lg p-3 text-sm ${alertResult.delivery?.status === 'queued' ? 'bg-safe/10 text-safe' : 'bg-bg text-muted'}`}><b>Contact delivery:</b> {alertResult.delivery?.message ?? 'Server did not return delivery status.'}{alertResult.delivery?.status === 'queued' && <span className="mt-1 block text-xs">The provider accepted the request; carrier delivery is not confirmed.</span>}</div>}
          {alertResult.status === 'CONFIRMED' && alertResult.emergencyContacts?.length ? <div className="mt-3 space-y-2">{alertResult.emergencyContacts.map((contact) => { const body = encodeURIComponent(`SafeGaurd alert: I may need help. My location: https://maps.google.com/?q=${alertResult.location.latitude},${alertResult.location.longitude}`); const number = contact.phone.replace(/[^+\d]/g, ''); const smsQueued = alertResult.delivery?.results?.some((result) => result.phone === contact.phone && result.channel === 'sms' && result.status === 'queued'); const callQueued = alertResult.delivery?.results?.some((result) => result.phone === contact.phone && result.channel === 'call' && result.status === 'queued'); return <div key={contact.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3 text-sm"><span><b>{contact.name}</b><span className="ml-2 text-muted">{contact.phone}</span></span><span className="flex gap-2">{!smsQueued && <a href={`sms:${number}?body=${body}`} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 font-medium hover:border-primary"><MessageSquareText size={15} />Text</a>}{!callQueued && <a href={`tel:${number}`} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 font-medium hover:border-primary"><Phone size={15} />Call</a>}</span></div>; })}</div> : null}
          {alertResult.status !== 'PENDING' ? <div className="mt-4 rounded-lg bg-safe/10 p-3 text-sm text-safe"><CheckCircle2 className="mr-2 inline" size={16} />Event {alertResult.status === 'CONFIRMED' ? 'confirmed' : 'dismissed'} and saved to history.</div> : <div className="mt-5 grid gap-2 sm:grid-cols-2"><button disabled={savingAlert || !locationAvailable} onClick={() => void confirmAlert('CONFIRMED')} className="rounded-xl bg-danger px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{savingAlert ? 'Saving…' : 'Confirm · Alert contacts'}</button><button disabled={savingAlert || !locationAvailable} onClick={() => void confirmAlert('DISMISSED')} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold hover:bg-bg disabled:opacity-50">I’m safe</button></div>}
          {alertError && <p className="mt-3 text-sm text-danger">{alertError}</p>}
          {alertResult.status !== 'PENDING' && <button onClick={() => setAlertResult(null)} className="mt-4 w-full rounded-lg border border-line py-2 text-sm">Close</button>}
        </section>
      </div>}
    </div>
  );
}
