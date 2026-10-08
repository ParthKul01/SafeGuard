import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, ShieldAlert } from 'lucide-react';

type PermissionState = 'requesting' | 'granted' | 'denied' | 'unavailable';

export default function MicrophonePermissionNotice() {
  const [state, setState] = useState<PermissionState>('requesting');
  const askedOnMount = useRef(false);

  const requestAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setState('granted');
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      setState(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : 'unavailable');
    }
  }, []);

  useEffect(() => {
    if (!askedOnMount.current) {
      askedOnMount.current = true;
      void requestAccess();
    }
  }, [requestAccess]);

  if (state === 'granted') return null;
  const denied = state === 'denied';
  return (
    <div role="status" aria-live="polite" className="mb-4 flex items-start gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
      {denied || state === 'unavailable' ? <ShieldAlert size={17} className="mt-0.5 shrink-0 text-warn" /> : <Mic size={17} className="mt-0.5 shrink-0 text-primary" />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{state === 'requesting' ? 'Allow microphone access' : denied ? 'Microphone access is off' : 'Microphone unavailable'}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{state === 'requesting'
          ? 'Your browser is asking for microphone permission. SafeGaurd only listens after you choose Record; this permission check stops the audio stream immediately.'
          : denied
            ? 'Allow the microphone in your browser site settings, then try again. You can still use the rest of SafeGaurd.'
            : 'Microphone access needs HTTPS or localhost and a working microphone.'}</p>
      </div>
      {state !== 'requesting' && <button type="button" onClick={() => void requestAccess()} className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:border-primary">Try again</button>}
    </div>
  );
}
