import { classifierResultSchema } from '../../schemas/index.js';

const bad = (msg) => Object.assign(new Error(msg), { status: 502 });

// Adapter for a DistilBERT service. POST <url> with { text }, expects { classification, probability }.
export function createHttpClassifier(url, timeoutMs = 5000) {
  return {
    source: 'http',
    async classify(text) {
      let res;
      try {
        res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(timeoutMs) });
      } catch { throw bad('Threat classifier service is unreachable'); }
      if (!res.ok) throw bad(`Threat classifier service returned ${res.status}`);
      const parsed = classifierResultSchema.safeParse(await res.json().catch(() => null));
      if (!parsed.success) throw bad('Threat classifier returned an invalid response');
      return parsed.data;
    },
  };
}
