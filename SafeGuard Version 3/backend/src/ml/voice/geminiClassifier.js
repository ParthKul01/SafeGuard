import { classifierResultSchema } from '../../schemas/index.js';
import { generateGeminiText, parseJsonObject } from './geminiApi.js';

const bad = (message) => Object.assign(new Error(message), { status: 502 });
const clamp = (n) => Math.max(0, Math.min(1, Number(n) || 0));

export function createGeminiClassifier(apiKey, model = 'gemini-3.5-flash-lite', timeoutMs = 15000) {
  return {
    source: `gemini:${model}`,
    async classify(text) {
      if (!text.trim()) return { classification: 'NORMAL', probability: 1, threatProbability: 0 };

      const output = await generateGeminiText(apiKey, model, [{ parts: [{ text: `Classify the transcript below based only on its words. THREAT means a clear threat, coercion, or violent harassment directed at someone. DISTRESS means a plea for help or explicit self-harm intent. NORMAL means neither is clearly present. Do not infer that an actual emergency is happening. Return only JSON with classification (NORMAL, DISTRESS, or THREAT), probability (0 to 1 confidence in that label), and threatProbability (0 to 1 score for threatening/violent content; distress alone should not raise this score). These scores are model estimates, not calibrated probabilities.\n\nTranscript:\n${text}` }] }], timeoutMs, {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            classification: { type: 'STRING', enum: ['NORMAL', 'DISTRESS', 'THREAT'] },
            probability: { type: 'NUMBER' },
            threatProbability: { type: 'NUMBER' },
          },
          required: ['classification', 'probability', 'threatProbability'],
        },
      });
      const result = parseJsonObject(output);
      const parsed = classifierResultSchema.safeParse(result && {
        classification: result.classification,
        probability: clamp(result.probability),
        threatProbability: clamp(result.threatProbability),
      });
      if (!parsed.success) throw bad('Gemini returned an invalid transcript classification.');
      return parsed.data;
    },
  };
}
