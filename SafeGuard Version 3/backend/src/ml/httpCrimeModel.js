import { crimeResultSchema } from '../schemas/index.js';

// Adapter for an external model service (e.g. a Python/FastAPI Random Forest).
// POST <url> with the feature object, expects { riskLevel, probability, factors }.
export function createHttpCrimeModel(url, timeoutMs = 3000) {
  return {
    source: 'http',
    modelVersion: 'external',
    async predict(features) {
      let res;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(features),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw Object.assign(new Error('Crime model service is unreachable'), { status: 502 });
      }
      if (!res.ok) throw Object.assign(new Error(`Crime model service returned ${res.status}`), { status: 502 });
      const parsed = crimeResultSchema.safeParse(await res.json().catch(() => null));
      if (!parsed.success) throw Object.assign(new Error('Crime model returned an invalid response'), { status: 502 });
      return { ...parsed.data, source: this.source, modelVersion: this.modelVersion };
    },
  };
}
