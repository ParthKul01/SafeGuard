import { sttResultSchema } from '../../schemas/index.js';
import { generateGeminiText } from './geminiApi.js';

const bad = (message) => Object.assign(new Error(message), { status: 502 });
const supportedTypes = new Set(['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac', 'audio/aiff', 'audio/aac', 'audio/m4a', 'audio/opus']);

export function createGeminiStt(apiKey, model = 'gemini-3.5-flash-lite', timeoutMs = 30000) {
  return {
    source: `gemini:${model}`,
    async transcribe(audio, { mime = 'audio/webm' } = {}) {
      const mimeType = mime.split(';')[0].trim().toLowerCase();
      if (!supportedTypes.has(mimeType)) throw bad(`Gemini does not support this recording format (${mimeType || 'unknown'}).`);
      if (!audio?.length) throw bad('The recording was empty. Try recording again.');

      const transcript = await generateGeminiText(apiKey, model, [{ parts: [
        { text: 'Transcribe the spoken words in this short audio clip verbatim. Do not summarize, translate, classify, or add speaker labels. If there is no intelligible speech, return an empty transcription.' },
        { inline_data: { mime_type: mimeType, data: Buffer.from(audio).toString('base64') } },
      ] }], timeoutMs);
      const parsed = sttResultSchema.safeParse({ transcription: transcript });
      if (!parsed.success) throw bad('Gemini returned an invalid transcription.');
      return parsed.data;
    },
  };
}
