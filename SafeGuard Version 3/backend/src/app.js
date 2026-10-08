import express from 'express';
import cors from 'cors';
import { openDb } from './database/db.js';
import { contactService } from './services/contactService.js';
import { alertService } from './services/alertService.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import contactsRouter from './routes/contacts.js';
import emergencyRouter from './routes/emergency.js';
import zonesRouter from './routes/zones.js';
import locationRouter from './routes/location.js';
import crimeRouter from './routes/crime.js';
import { crimeRiskService } from './services/crimeRiskService.js';
import { createCrimeModel } from './ml/index.js';
import voiceRouter from './routes/voice.js';
import { voiceThreatService } from './services/voiceThreatService.js';
import { createVoiceModels } from './ml/voice/index.js';
import riskRouter from './routes/risk.js';
import { riskFusionService } from './services/riskFusionService.js';
import { authMiddleware } from './middleware/auth.js';
import adminRouter from './routes/admin.js';

export function createApp(db = openDb(), { crimeModel = createCrimeModel(), voiceModels = createVoiceModels() } = {}) {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRouter(voiceModels));
  app.use('/api/auth', authRouter(db));

  const requireAuth = authMiddleware(db);
  app.use('/api/admin', requireAuth, adminRouter(db));
  app.use('/api/contacts', requireAuth, (req, res, next) =>
    contactsRouter(contactService(db, req.authUser.id))(req, res, next));
  app.use('/api/emergency', requireAuth, (req, res, next) =>
    emergencyRouter(alertService(db, req.authUser.id))(req, res, next));
  app.use('/api/zones', requireAuth, zonesRouter(db));
  app.use('/api/location', requireAuth, locationRouter(db));
  app.use('/api/voice', requireAuth, voiceRouter(voiceThreatService(voiceModels)));
  app.use('/api/crime', requireAuth, crimeRouter(crimeRiskService(db, crimeModel)));
  app.use('/api/risk', requireAuth, riskRouter(riskFusionService()));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Audio is too large (5 MB max)' });
    if (err.status === 502) return res.status(502).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}
