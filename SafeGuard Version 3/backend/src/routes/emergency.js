import { Router } from 'express';
import { alertSchema, historyQuerySchema } from '../schemas/index.js';
import { validateBody, validateQuery } from '../middleware/validate.js';

export default function emergencyRouter(alerts) {
  const r = Router();
  r.post('/confirm', validateBody(alertSchema), (req, res, next) => {
    alerts.confirm(req.body).then((alert) => res.status(201).json(alert)).catch(next);
  });
  r.post('/dismiss', validateBody(alertSchema), (req, res) => res.status(201).json(alerts.dismiss(req.body))); // "I'm safe"
  r.get('/history', validateQuery(historyQuerySchema), (req, res) => res.json(alerts.history(req.filters)));
  return r;
}
