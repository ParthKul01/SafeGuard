import { mockCrimeModel } from './mockCrimeModel.js';
import { createHttpCrimeModel } from './httpCrimeModel.js';

export function createCrimeModel(env = process.env) {
  if (env.CRIME_MODEL === 'http') {
    if (!env.CRIME_MODEL_URL) throw new Error('CRIME_MODEL=http requires CRIME_MODEL_URL');
    return createHttpCrimeModel(env.CRIME_MODEL_URL);
  }
  return mockCrimeModel;
}
