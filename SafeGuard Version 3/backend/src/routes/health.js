import { Router } from 'express';

export default function healthRouter(voiceModels) {
  const router = Router();
  router.get('/', (_req, res) => {
    const source = { stt: voiceModels.stt.source, classifier: voiceModels.classifier.source };
    const configured = source.stt !== 'mock' || source.classifier !== 'mock';
    const demoReady = source.stt === 'mock'
      && (source.classifier === 'mock' || source.classifier.startsWith('trained:'));

    res.json({
      status: 'ok',
      service: 'safety-backend',
      mode: 'prototype',
      time: new Date().toISOString(),
      voice: {
        enabled: true,
        configured,
        demoReady,
        source,
      },
    });
  });
  return router;
}
