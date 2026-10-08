import { mockStt } from './mockStt.js';
import { mockClassifier } from './mockClassifier.js';
import { createTrainedClassifier } from './trainedClassifier.js';
import { createHttpStt } from './httpStt.js';
import { createGroqStt } from './groqStt.js';
import { createHttpClassifier } from './httpClassifier.js';
import { createOpenAiStt } from './openAiStt.js';
import { createOpenAiClassifier } from './openAiClassifier.js';
import { createGeminiStt } from './geminiStt.js';
import { createGeminiClassifier } from './geminiClassifier.js';

const need = (env, key) => { if (!env[key]) throw new Error(`${key} is required`); return env[key]; };

export function createVoiceModels(env = process.env) {
  return {
    stt: env.VOICE_STT === 'groq'
      ? createGroqStt(need(env, 'GROQ_API_KEY'), env.GROQ_STT_MODEL)
      : env.VOICE_STT === 'gemini'
      ? createGeminiStt(need(env, 'GEMINI_API_KEY'), env.GEMINI_MODEL)
      : env.VOICE_STT === 'openai'
      ? createOpenAiStt(need(env, 'OPENAI_API_KEY'), env.OPENAI_STT_MODEL)
      : env.VOICE_STT === 'http' ? createHttpStt(need(env, 'VOICE_STT_URL')) : mockStt,
    classifier: env.VOICE_CLASSIFIER === 'trained'
      ? createTrainedClassifier()
      : env.VOICE_CLASSIFIER === 'gemini'
      ? createGeminiClassifier(need(env, 'GEMINI_API_KEY'), env.GEMINI_MODEL)
      : env.VOICE_CLASSIFIER === 'openai'
      ? createOpenAiClassifier(need(env, 'OPENAI_API_KEY'), env.OPENAI_MODERATION_MODEL)
      : env.VOICE_CLASSIFIER === 'http' ? createHttpClassifier(need(env, 'VOICE_CLASSIFIER_URL')) : mockClassifier,
  };
}
