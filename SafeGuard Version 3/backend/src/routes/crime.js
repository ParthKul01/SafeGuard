import { Router } from 'express';
import { crimePredictSchema } from '../schemas/index.js';
import { validateBody } from '../middleware/validate.js';

export default function crimeRouter(service) {
  const r = Router();
  r.post('/predict', validateBody(crimePredictSchema), async (req, res, next) => {
    try { res.json(await service.predict(req.body)); } catch (e) { next(e); }
  });
  return r;
}
