/**
 * Development-only semantic voice classifier.
 *
 * This module intentionally does NOT claim to be DistilBERT. It uses transparent
 * keyword/phrase rules to emulate the same classifier contract so the rest of
 * the voice pipeline can be tested before a trained NLP model is plugged in.
 *
 * Contract:
 * classify(text) -> {
 *   classification: NORMAL | DISTRESS | THREAT,
 *   probability: 0..1,
 *   threatProbability: 0..1
 * }
 */

const THREAT_PATTERNS = [
  { phrase: 'i will hurt you', weight: 3 },
  { phrase: "i'll hurt you", weight: 3 },
  { phrase: 'i am going to hurt you', weight: 3 },
  { phrase: "i'm going to hurt you", weight: 3 },
  { phrase: 'i will kill you', weight: 3 },
  { phrase: "i'll kill you", weight: 3 },
  { phrase: 'give me your phone', weight: 2 },
  { phrase: 'give me your money', weight: 2 },
  { phrase: 'give me the phone', weight: 2 },
  { phrase: "don't move", weight: 2 },
  { phrase: 'do not move', weight: 2 },
  { phrase: 'shut up', weight: 1 },
  { phrase: 'or else', weight: 1 },
  { phrase: 'you better', weight: 1 },
  { phrase: 'i have a gun', weight: 3 },
  { phrase: 'i have a knife', weight: 3 },
];

const DISTRESS_PATTERNS = [
  { phrase: 'please help me', weight: 3 },
  { phrase: 'someone is following me', weight: 3 },
  { phrase: 'somebody is following me', weight: 3 },
  { phrase: 'someone is attacking me', weight: 3 },
  { phrase: 'somebody is attacking me', weight: 3 },
  { phrase: 'leave me alone', weight: 2 },
  { phrase: 'let me go', weight: 2 },
  { phrase: 'call the police', weight: 2 },
  { phrase: 'call police', weight: 2 },
  { phrase: 'save me', weight: 2 },
  { phrase: 'i am scared', weight: 2 },
  { phrase: "i'm scared", weight: 2 },
  { phrase: 'i am afraid', weight: 2 },
  { phrase: "i'm afraid", weight: 2 },
  { phrase: 'i am in danger', weight: 3 },
  { phrase: "i'm in danger", weight: 3 },
  { phrase: 'i need help', weight: 2 },
  { phrase: 'help me', weight: 2 },
  { phrase: 'please stop', weight: 1 },
  { phrase: 'stop following me', weight: 2 },
];

const normalize = (text) => String(text ?? '')
  .toLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/[^a-z0-9'\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const scorePatterns = (text, patterns) => patterns
  .filter(({ phrase }) => text.includes(phrase))
  .reduce((sum, { weight }) => sum + weight, 0);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const mockClassifier = {
  source: 'mock',

  async classify(text) {
    const normalized = normalize(text);

    if (!normalized) {
      return {
        classification: 'NORMAL',
        probability: 0,
        threatProbability: 0,
        scores: { NORMAL: 0, DISTRESS: 0, THREAT: 0 },
        reason: 'No transcript was produced.',
      };
    }

    const threatScore = scorePatterns(normalized, THREAT_PATTERNS);
    const distressScore = scorePatterns(normalized, DISTRESS_PATTERNS);

    // Threat patterns take precedence when both are present because threatening
    // language is the stronger semantic safety signal in this prototype.
    if (threatScore > 0) {
      const probability = clamp(0.78 + threatScore * 0.04, 0.78, 0.98);
      return {
        classification: 'THREAT',
        probability: Number(probability.toFixed(2)),
        threatProbability: Number(probability.toFixed(2)),
        scores: {
          NORMAL: Number((1 - probability).toFixed(2)),
          DISTRESS: 0.02,
          THREAT: Number(probability.toFixed(2)),
        },
        reason: 'Threat-related language matched by the development classifier.',
      };
    }

    if (distressScore > 0) {
      const probability = clamp(0.76 + distressScore * 0.04, 0.76, 0.96);
      return {
        classification: 'DISTRESS',
        probability: Number(probability.toFixed(2)),
        threatProbability: Number(probability.toFixed(2)),
        scores: {
          NORMAL: Number((1 - probability).toFixed(2)),
          DISTRESS: Number(probability.toFixed(2)),
          THREAT: 0.02,
        },
        reason: 'Distress-related language matched by the development classifier.',
      };
    }

    return {
      classification: 'NORMAL',
      probability: 0.94,
      threatProbability: 0.02,
      scores: { NORMAL: 0.94, DISTRESS: 0.04, THREAT: 0.02 },
      reason: 'No configured threat or distress phrases were detected.',
    };
  },
};
