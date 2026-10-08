import { BASE } from './api';
import { getAuthToken } from './auth';
import type { DemoPhrase, VoiceResult } from '../types';
export async function analyzeVoice(audio: Blob, demo: DemoPhrase = 'none'): Promise<VoiceResult> {
  const qs = demo === 'none' ? '' : '?demo=' + demo;
  const headers = new Headers({ 'Content-Type': audio.type || 'audio/webm' });
  const token = getAuthToken();
  if (token) headers.set('Authorization', 'Bearer ' + token);
  const res = await fetch(BASE + '/voice/analyze' + qs, { method: 'POST', headers, body: audio });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Voice analysis failed (' + res.status + ')');
  return { ...(await res.json()), analyzedAt: Date.now() };
}
