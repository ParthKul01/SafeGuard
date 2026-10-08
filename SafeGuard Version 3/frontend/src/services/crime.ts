import { api } from './api';
import type { Coords, CrimePrediction } from '../types';

export const predictCrime = (c: Coords, hour = new Date().getHours()) =>
  api<CrimePrediction>('/crime/predict', {
    method: 'POST',
    body: JSON.stringify({ latitude: c.latitude, longitude: c.longitude, hour, dayOfWeek: new Date().getDay() }),
  });
