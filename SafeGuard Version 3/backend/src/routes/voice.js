import express, { Router } from 'express';
import { voiceQuerySchema } from '../schemas/index.js';
import { validateQuery } from '../middleware/validate.js';

export default function voiceRouter(service) {
  const r = Router();
  // Audio is read into memory only; it is never written to disk.
  r.post('/analyze', express.raw({ type: 'audio/*', limit: '5mb' }), validateQuery(voiceQuerySchema), async (req, res, next) => {
    if (!Buffer.isBuffer(req.body)) return res.status(415).json({ error: 'Send raw audio with an audio/* Content-Type' });
    if (req.body.length === 0) return res.status(400).json({ error: 'Audio body is empty' });
    try { res.json(await service.analyze(req.body, { mime: req.headers['content-type'], demo: req.filters.demo })); } catch (e) { next(e); }
  });
  return r;
}
