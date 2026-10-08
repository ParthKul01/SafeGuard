import { sttResultSchema } from '../../schemas/index.js';

const bad = (message) => Object.assign(new Error(message), { status: 502 });
const extension = (mime = '') => {
  const type = mime.split(';')[0].trim().toLowerCase();
  return ({
    'audio/webm': 'webm',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/mpga': 'mpga',
    'audio/m4a': 'm4a',
    'audio/aiff': 'aiff',
    'audio/aac': 'aac',
    'audio/opus': 'opus',
  })[type] ?? 'webm';
};

// Groq's OpenAI-compatible transcription endpoint. Audio stays in memory in this app.
export function createGroqStt(apiKey, model = 'whisper-large-v3-turbo', timeoutMs = 30000) {
  return {
    source: `groq:${model}`,
    async transcribe(audio, { mime = 'audio/webm' } = {}) {
      const form = new FormData();
      form.append('file', new Blob([audio], { type: mime.split(';')[0] }), `recording.${extension(mime)}`);
      form.append('model', model);
      form.append('response_format', 'json');

      let response;
      try {
        response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw bad('Groq speech-to-text service is unreachable.');
      }

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          throw bad(`Groq speech-to-text rate limit reached${retryAfter ? `; retry after ${retryAfter} seconds` : '; check your free-tier limits'}.`);
        }
        throw bad(`Groq speech-to-text returned HTTP ${response.status}. Check GROQ_API_KEY and the selected model.`);
      }

      const data = await response.json().catch(() => null);
      const parsed = sttResultSchema.safeParse(data && { transcription: data.text });
      if (!parsed.success) throw bad('Groq returned an invalid transcription response.');
      return parsed.data;
    },
  };
}
