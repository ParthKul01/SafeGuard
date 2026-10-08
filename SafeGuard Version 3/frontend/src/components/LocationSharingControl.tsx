import { useEffect, useRef, useState } from 'react';
import { MapPin, Radio, ShieldCheck } from 'lucide-react';
import { useSafety } from '../context/SafetyContext';
import { getLocationSharing, postSharedLocation, updateLocationSharing } from '../services/location';

export default function LocationSharingControl() {
  const { location, locationAvailable, gps } = useSafety();
  const [sharing, setSharing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef({ latitude: location.latitude, longitude: location.longitude, accuracy: gps.accuracy });
  latest.current = { latitude: location.latitude, longitude: location.longitude, accuracy: gps.accuracy };

  useEffect(() => {
    let active = true;
    void getLocationSharing().then((status) => { if (active) setSharing(status.isSharing); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Could not load sharing status.'); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!sharing || !locationAvailable) return;
    let sending = false;
    const send = async () => {
      if (sending) return;
      sending = true;
      const value = latest.current;
      try { await postSharedLocation({ latitude: value.latitude, longitude: value.longitude, accuracy: value.accuracy }); }
      catch (e) { setError(e instanceof Error ? e.message : 'Could not update the shared location.'); }
      finally { sending = false; }
    };
    void send();
    const timer = window.setInterval(() => void send(), 15000);
    return () => window.clearInterval(timer);
  }, [sharing, locationAvailable]);

  const toggle = async () => {
    setError('');
    if (!sharing && !locationAvailable) {
      setError('Turn on device location first. Sharing will start only after GPS is available.');
      return;
    }
    setSaving(true);
    try {
      const result = await updateLocationSharing(!sharing);
      setSharing(result.isSharing);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update location sharing.');
    } finally { setSaving(false); }
  };

  return <section className={'mb-5 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ' + (sharing ? 'border-primary/40 bg-primary/5' : 'border-line bg-surface')}>
    <div className="flex items-start gap-3">
      <span className={'mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ' + (sharing ? 'bg-primary/10 text-primary' : 'bg-bg text-muted')}>
        {sharing ? <Radio size={17} /> : <ShieldCheck size={17} />}
      </span>
      <div>
        <p className="text-sm font-semibold">{sharing ? 'Live location sharing is on' : 'Share live location with administrators'}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted">{sharing ? 'Your current position is shared while you are signed in. Admins only see fresh positions; turn this off anytime.' : 'Optional. Your location is sent only after you enable this, and is removed when you turn it off or sign out.'}</p>
        {!locationAvailable && !sharing && <p className="mt-1 text-xs text-warn"><MapPin size={12} className="mr-1 inline" />Enable device GPS before sharing.</p>}
        {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    </div>
    <button type="button" disabled={!loaded || saving} onClick={() => void toggle()} aria-pressed={sharing} className={'min-h-10 shrink-0 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ' + (sharing ? 'border border-line bg-surface text-fg hover:border-danger/50 hover:text-danger' : 'bg-primary text-white hover:bg-primary/90')}>
      {saving ? 'Saving…' : sharing ? 'Stop sharing' : 'Enable sharing'}
    </button>
  </section>;
}
