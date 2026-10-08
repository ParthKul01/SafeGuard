import { sttResultSchema } from '../../schemas/index.js';

const bad = (msg) => Object.assign(new Error(msg), { status: 502 });

// Adapter for a Whisper service. POST <url> with raw audio bytes, expects { transcription }.
export function createHttpStt(url, timeoutMs = 20000) {
  return {
    source: 'http',
    async transcribe(audio, { mime = 'audio/webm' } = {}) {
      let res;
      try {
        res = await fetch(url, { method: 'POST', headers: { 'Content-Type': mime }, body: audio, signal: AbortSignal.timeout(timeoutMs) });
      } catch { throw bad('Speech-to-text service is unreachable'); }
      if (!res.ok) throw bad(`Speech-to-text service returned ${res.status}`);
      const parsed = sttResultSchema.safeParse(await res.json().catch(() => null));
      if (!parsed.success) throw bad('Speech-to-text service returned an invalid response');
      return parsed.data;
    },
  };
}
