import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { openDb } from '../src/database/db.js';
import { createApp } from '../src/app.js';
import { createHttpCrimeModel } from '../src/ml/httpCrimeModel.js';
import { createCrimeModel } from '../src/ml/index.js';

const post = (base, body) => fetch(`${base}/crime/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const serve = (app) => { const s = app.listen(0); return [s, `http://localhost:${s.address().port}/api`]; };

test('mock model: contract and risk ordering', async () => {
  const [server, base] = serve(createApp(openDb(':memory:')));
  try {
    const risky = await (await post(base, { latitude: 18.5018, longitude: 73.8636, hour: 23 })).json();
    assert.equal(risky.riskLevel, 'HIGH');
    assert.ok(risky.probability >= 0.65 && risky.probability <= 1);
    assert.ok(risky.factors.length >= 3);
    assert.equal(risky.source, 'mock');

    const calm = await (await post(base, { latitude: 19.0, longitude: 73.4, hour: 12 })).json();
    assert.equal(calm.riskLevel, 'LOW');
    assert.ok(calm.probability < risky.probability);

    const evening = await (await post(base, { latitude: 19.0, longitude: 73.4, hour: 20 })).json();
    assert.ok(evening.probability > calm.probability);

    assert.equal((await post(base, { latitude: 99, longitude: 0 })).status, 400);
    assert.equal((await post(base, { latitude: 1, longitude: 1, hour: 30 })).status, 400);
  } finally { server.close(); }
});

test('http adapter: same contract, bad responses become 502', async () => {
  const stub = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.url === '/bad' ? { nope: true } : { riskLevel: 'MODERATE', probability: 0.67, factors: ['Historical crime frequency', 'Area risk category'] }));
  }).listen(0);
  const url = (p) => `http://localhost:${stub.address().port}${p}`;
  try {
    const [server, base] = serve(createApp(openDb(':memory:'), { crimeModel: createHttpCrimeModel(url('/ok')) }));
    const ok = await (await post(base, { latitude: 18.52, longitude: 73.85 })).json();
    assert.equal(ok.riskLevel, 'MODERATE');
    assert.equal(ok.source, 'http');
    server.close();

    const [bad, badBase] = serve(createApp(openDb(':memory:'), { crimeModel: createHttpCrimeModel(url('/bad')) }));
    assert.equal((await post(badBase, { latitude: 18.52, longitude: 73.85 })).status, 502);
    bad.close();
  } finally { stub.close(); }
});

test('model selection from env', () => {
  assert.equal(createCrimeModel({}).source, 'mock');
  assert.equal(createCrimeModel({ CRIME_MODEL: 'http', CRIME_MODEL_URL: 'http://x' }).source, 'http');
  assert.throws(() => createCrimeModel({ CRIME_MODEL: 'http' }));
});
