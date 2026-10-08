import { Router } from 'express';
import { riskCalculateSchema } from '../schemas/index.js';
import { validateBody } from '../middleware/validate.js';

export default function riskRouter(risk) {
  const r = Router();
  r.post('/calculate', validateBody(riskCalculateSchema), (req, res) => res.json(risk.calculate(req.body)));
  return r;
}
