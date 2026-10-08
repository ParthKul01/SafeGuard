import { classifierResultSchema } from '../../schemas/index.js';
import { openAiFailure } from './openAiError.js';

const bad = (msg) => Object.assign(new Error(msg), { status: 502 });
const maxScore = (scores, keys) => Math.max(0, ...keys.map((key) => Number(scores?.[key]) || 0));

// Uses OpenAI's pretrained moderation model to flag threatening and self-harm content in the transcript.
// These category scores are content-moderation scores, not probabilities that a real-world emergency exists.
export function createOpenAiClassifier(apiKey, model = 'omni-moderation-latest', timeoutMs = 10000) {
  return {
    source: `openai:${model}`,
    async classify(text) {
      if (!text.trim()) return { classification: 'NORMAL', probability: 1, threatProbability: 0 };

      let res;
      try {
        res = await fetch('https://api.openai.com/v1/moderations', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, input: text }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch { throw bad('Threat-classification provider is unreachable'); }
      if (!res.ok) throw await openAiFailure(res, 'moderation');

      const data = await res.json().catch(() => null);
      const result = data?.results?.[0];
      if (!result?.categories || !result?.category_scores) throw bad('Threat-classification provider returned an invalid response');

      const threatKeys = ['harassment/threatening', 'hate/threatening'];
      const distressKeys = ['self-harm', 'self-harm/intent', 'self-harm/instructions'];
      const threatScore = maxScore(result.category_scores, threatKeys);
      const distressScore = maxScore(result.category_scores, distressKeys);
      const threatFlagged = threatKeys.some((key) => result.categories[key] === true);
      const distressFlagged = distressKeys.some((key) => result.categories[key] === true);

      let classification = 'NORMAL';
      let probability = Math.max(0, 1 - Math.max(threatScore, distressScore));
      if (threatFlagged) {
        classification = 'THREAT';
        probability = threatScore;
      } else if (distressFlagged) {
        classification = 'DISTRESS';
        probability = distressScore;
      }

      return classifierResultSchema.parse({ classification, probability, threatProbability: threatScore });
    },
  };
}
