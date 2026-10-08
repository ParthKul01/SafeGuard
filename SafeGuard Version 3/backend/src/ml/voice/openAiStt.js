import { sttResultSchema } from '../../schemas/index.js';
import { openAiFailure } from './openAiError.js';

const bad = (msg) => Object.assign(new Error(msg), { status: 502 });
const extension = (mime = '') => {
  const type = mime.split(';')[0].trim().toLowerCase();
  return ({ 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/flac': 'flac', 'audio/mpga': 'mpga', 'audio/m4a': 'm4a' })[type] ?? 'webm';
};

// Pretrained OpenAI Whisper transcription. Audio is sent directly from memory and is not saved by this app.
export function createOpenAiStt(apiKey, model = 'whisper-1', timeoutMs = 30000) {
  return {
    source: `openai:${model}`,
    async transcribe(audio, { mime = 'audio/webm' } = {}) {
      const form = new FormData();
      form.append('file', new Blob([audio], { type: mime.split(';')[0] }), `recording.${extension(mime)}`);
      form.append('model', model);
      form.append('response_format', 'json');

      let res;
      try {
        res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch { throw bad('Speech-to-text provider is unreachable'); }
      if (!res.ok) throw await openAiFailure(res, 'speech-to-text');
      const data = await res.json().catch(() => null);
      const parsed = sttResultSchema.safeParse(data && { transcription: data.text });
      if (!parsed.success) throw bad('Speech-to-text provider returned an invalid response');
      return parsed.data;
    },
  };
}
