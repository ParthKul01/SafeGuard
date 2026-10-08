import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { openDb } from '../src/database/db.js';
import { createApp } from '../src/app.js';
import { createVoiceModels } from '../src/ml/voice/index.js';
import { createHttpStt } from '../src/ml/voice/httpStt.js';
import { createHttpClassifier } from '../src/ml/voice/httpClassifier.js';

const serve = (app) => { const s = app.listen(0); return [s, `http://localhost:${s.address().port}/api`]; };
const audio = (base, qs = '', body = Buffer.from([1, 2, 3]), type = 'audio/webm;codecs=opus') =>
  fetch(`${base}/voice/analyze${qs}`, { method: 'POST', headers: type ? { 'Content-Type': type } : {}, body });

test('mock pipeline classifies demo phrases', async () => {
  const [server, base] = serve(createApp(openDb(':memory:')));
  try {
    const d = await (await audio(base, '?demo=distress')).json();
    assert.equal(d.classification, 'DISTRESS');
    assert.ok(d.transcription.length > 0 && d.probability >= 0.6 && d.threatProbability === d.probability);
    assert.deepEqual(d.source, { stt: 'mock', classifier: 'mock' });

    assert.equal((await (await audio(base, '?demo=threat')).json()).classification, 'THREAT');

    const n = await (await audio(base, '?demo=normal')).json();
    assert.equal(n.classification, 'NORMAL');
    assert.ok(n.threatProbability < 0.3);

    const silent = await (await audio(base)).json();
    assert.equal(silent.transcription, '');
    assert.equal(silent.classification, 'NORMAL');
  } finally { server.close(); }
});

test('voice endpoint validates input', async () => {
  const [server, base] = serve(createApp(openDb(':memory:')));
  try {
    assert.equal((await audio(base, '', Buffer.alloc(0))).status, 400);
    assert.equal((await audio(base, '', '{"a":1}', 'application/json')).status, 415);
    assert.equal((await audio(base, '?demo=bogus')).status, 400);
    assert.equal((await audio(base, '', Buffer.alloc(5.5 * 1024 * 1024))).status, 413);
  } finally { server.close(); }
});

test('http adapters: contract and 502 on failure', async () => {
  const stub = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const chunks = [];
    req.on('data', (c) => chunks.push(c)).on('end', () => {
      if (req.url === '/stt') return res.end(JSON.stringify({ transcription: 'help me please' }));
      if (req.url === '/cls') return res.end(JSON.stringify({ classification: 'DISTRESS', probability: 0.82 }));
      res.end(JSON.stringify({ nope: 1 }));
    });
  }).listen(0);
  const u = (p) => `http://localhost:${stub.address().port}${p}`;
  try {
    const voiceModels = { stt: createHttpStt(u('/stt')), classifier: createHttpClassifier(u('/cls')) };
    const [server, base] = serve(createApp(openDb(':memory:'), { voiceModels }));
    const ok = await (await audio(base)).json();
    assert.equal(ok.classification, 'DISTRESS');
    assert.equal(ok.probability, 0.82);
    assert.deepEqual(ok.source, { stt: 'http', classifier: 'http' });
    server.close();

    const [bad, badBase] = serve(createApp(openDb(':memory:'), { voiceModels: { stt: createHttpStt(u('/x')), classifier: createHttpClassifier(u('/cls')) } }));
    assert.equal((await audio(badBase)).status, 502);
    bad.close();
  } finally { stub.close(); }
});

test('model selection from env', () => {
  assert.equal(createVoiceModels({}).stt.source, 'mock');
  assert.equal(createVoiceModels({ VOICE_STT: 'http', VOICE_STT_URL: 'http://x' }).stt.source, 'http');
  assert.throws(() => createVoiceModels({ VOICE_CLASSIFIER: 'http' }));
});
