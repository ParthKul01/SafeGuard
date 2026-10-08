import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeVoice } from '../services/voice';
import type { DemoPhrase, VoiceResult } from '../types';

export type VoiceState = 'idle' | 'requesting' | 'recording' | 'analyzing' | 'denied' | 'error';
export const MAX_SECONDS = 10;

export function useVoiceRecorder(demo: DemoPhrase, onResult: (r: VoiceResult) => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop()); // microphone is switched off after every recording
    stream.current = null;
  }, []);
  useEffect(() => release, [release]);

  const analyze = useCallback(async (blob: Blob) => {
    setState('analyzing');
    try { onResult(await analyzeVoice(blob, demo)); setState('idle'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Voice analysis failed'); setState('error'); }
  }, [demo, onResult]);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser. Try a current version of Chrome, Edge, or Firefox.');
      return setState('error');
    }
    setState('requesting');
    try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setError('Microphone permission was denied. Allow microphone access in your browser settings and try again.'); return setState('denied'); }

    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream.current);
    recorder.current = rec;
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => { release(); analyze(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); };
    rec.start();
    let elapsed = 0;
    setSeconds(0);
    setState('recording');
    timer.current = setInterval(() => { elapsed += 1; setSeconds(elapsed); if (elapsed >= MAX_SECONDS) rec.stop(); }, 1000);
  }, [analyze, release]);

  const stop = useCallback(() => { if (recorder.current?.state === 'recording') recorder.current.stop(); }, []);

  // Demo helper for machines without a microphone: the mock speech model ignores audio content.
  const simulate = useCallback(() => { setError(null); analyze(new Blob([new Uint8Array(1)], { type: 'audio/webm' })); }, [analyze]);

  return { state, seconds, error, start, stop, simulate };
}
