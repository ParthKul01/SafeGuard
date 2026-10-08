import { Mic, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import Card from './Card';
import { useSafety } from '../context/SafetyContext';
import type { VoiceClass } from '../types';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { getHealth } from '../services/api';

const TONE: Record<VoiceClass, string> = { NORMAL: 'text-safe', DISTRESS: 'text-warn', THREAT: 'text-danger' };
export default function VoicePanel() {
  const { voice, setVoice } = useSafety();
  const [modelStatus, setModelStatus] = useState<'checking' | 'ready' | 'unconfigured' | 'offline'>('checking');
  const [modelSources, setModelSources] = useState<{ stt: string; classifier: string } | null>(null);

  const { state, seconds, error, start, stop } = useVoiceRecorder('none', setVoice);

  useEffect(() => {
    let active = true;
    getHealth()
      .then((health) => {
        if (!active) return;
        setModelSources(health.voice?.source ?? null);
        setModelStatus(health.voice?.enabled === true ? 'ready' : 'unconfigured');
      })
      .catch(() => active && setModelStatus('offline'));
    return () => { active = false; };
  }, []);

  const busy = state === 'requesting' || state === 'recording' || state === 'analyzing';
  const sttSource = voice?.source.stt ?? modelSources?.stt;
  const classifierSource = voice?.source.classifier ?? modelSources?.classifier;
  const isTrained = classifierSource?.startsWith('trained:') ?? false;
  const isMock = classifierSource === 'mock' || sttSource === 'mock';
  const status = state === 'requesting' ? 'Requesting microphone...'
    : state === 'recording' ? `Recording - ${seconds}s / 10s`
      : state === 'analyzing' ? 'Transcribing and checking the transcript...'
        : state === 'error' || state === 'denied' ? 'Could not analyze audio'
          : modelStatus === 'ready' && isTrained && sttSource === 'mock' ? 'Trained classifier ready; speech-to-text is still mock'
            : modelStatus === 'ready' && isTrained ? 'Trained semantic classifier ready'
              : modelStatus === 'ready' && isMock ? 'Development mock semantic classifier ready'
                : modelStatus === 'ready' ? 'Pretrained voice models connected'
                  : modelStatus === 'offline' ? 'Backend API is unreachable'
                    : modelStatus === 'unconfigured' ? 'Voice models not configured' : 'Checking voice pipeline...';

  return (
    <Card title="Voice monitoring" icon={<Mic size={16} />}>
      <div className="mt-3 rounded-lg border border-line p-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3"><Mic size={18} className="mt-0.5 shrink-0 text-muted" /><div><p className="font-medium">{status}</p><p className="mt-1 text-muted">The transcript is classified as NORMAL, DISTRESS, or THREAT. Audio is held in memory by the prototype backend. {sttSource === 'mock' ? 'Mock speech-to-text ignores recordings; configure a speech-to-text provider.' : 'Record up to 10 seconds of speech for transcription and classification.'}</p></div></div>
          {state === 'recording' ? (
            <button onClick={stop} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white"><Square size={15} />Stop</button>
          ) : (
            <button disabled={modelStatus !== 'ready' || sttSource === 'mock' || busy} onClick={() => void start()} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Mic size={15} />{busy ? 'Please wait' : sttSource === 'mock' ? 'Set up STT' : 'Record'}</button>
          )}
        </div>

        {modelStatus === 'offline' && <p className="mt-3 rounded-md bg-bg p-3 text-xs text-muted">Start the backend with <code>npm run dev</code>, then refresh this page.</p>}
        {modelStatus === 'unconfigured' && <p className="mt-3 rounded-md bg-bg p-3 text-xs text-muted">The voice pipeline is not available. Check <code>backend/.env</code> and restart the backend.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

        <p className="mt-3 text-xs text-muted">Classifier scores are prototype text-content signals, not probabilities that a real-world emergency is happening. This version does not detect distress from tone of voice.</p>
      </div>

      <div className="mt-4 rounded-lg border border-line p-4" aria-live="polite">
        {!voice ? <p className="text-sm text-muted">No voice result. This signal is excluded from the risk score.</p> : (
          <div className="space-y-3 text-sm">
            <div><p className="text-muted">Transcript</p><p className="mt-0.5">{voice.transcription ? `"${voice.transcription}"` : 'No transcript.'}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted">Classification</p><p className={`font-bold ${TONE[voice.classification]}`}>{voice.classification}</p></div>
              <div><p className="text-muted">Confidence</p><p className="num font-bold">{Math.round(voice.probability * 100)}%</p></div>
            </div>

            <p className="text-xs text-muted">
              Models: speech-to-text {voice.source.stt}, semantic classifier {voice.source.classifier} | {new Date(voice.analyzedAt).toLocaleTimeString()}
              <button onClick={() => setVoice(null)} className="ml-3 underline hover:text-fg">Clear result</button>
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
