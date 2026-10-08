import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../src/database/db.js';
import { createApp } from '../src/app.js';

const app = createApp(openDb(':memory:'));
const server = app.listen(0);
const base = `http://localhost:${server.address().port}/api`;
const call = (path, method = 'GET', body) =>
  fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
test.after(() => server.close());

test('health', async () => assert.equal((await (await call('/health')).json()).status, 'ok'));

test('contacts CRUD keeps exactly one primary', async () => {
  const created = await call('/contacts', 'POST', { name: 'Asha', phone: '+91 90000 11111', relationship: 'Friend', isPrimary: true });
  assert.equal(created.status, 201);
  const { id } = await created.json();
  const list = await (await call('/contacts')).json();
  assert.equal(list.filter((c) => c.isPrimary).length, 1);
  assert.equal(list.find((c) => c.isPrimary).id, id);
  assert.equal((await call(`/contacts/${id}`, 'PUT', { name: 'Asha K', phone: '+91 90000 11111', relationship: 'Friend', isPrimary: true })).status, 200);
  assert.equal((await call(`/contacts/${id}`, 'DELETE')).status, 204);
  const after = await (await call('/contacts')).json();
  assert.equal(after.filter((c) => c.isPrimary).length, 1);
  assert.equal((await call(`/contacts/${id}`, 'DELETE')).status, 404);
});

test('validation errors return 400', async () => {
  assert.equal((await call('/contacts', 'POST', { name: '', phone: 'abc', relationship: 'x' })).status, 400);
  assert.equal((await call('/contacts/abc', 'DELETE')).status, 400);
});

test('emergency confirm, dismiss and filtered history', async () => {
  const body = { location: { latitude: 18.52, longitude: 73.85 }, riskLevel: 'HIGH', riskScore: 82, detectedEvent: 'DISTRESS + FALL' };
  const a = await (await call('/emergency/confirm', 'POST', body)).json();
  assert.equal(a.status, 'CONFIRMED');
  assert.ok(a.emergencyContacts.length > 0);
  const d = await (await call('/emergency/dismiss', 'POST', body)).json();
  assert.deepEqual(d.emergencyContacts, []);
  const confirmed = await (await call('/emergency/history?status=CONFIRMED&riskLevel=HIGH')).json();
  assert.ok(confirmed.every((x) => x.status === 'CONFIRMED' && x.riskLevel === 'HIGH'));
  assert.equal((await call('/emergency/history?riskLevel=NOPE')).status, 400);
});

test('zones are seeded', async () => assert.ok((await (await call('/zones')).json()).length >= 3));

test('geofence: inside, near and safe', async () => {
  const inside = await (await call('/location/risk?lat=18.5018&lng=73.8636')).json();
  assert.equal(inside.status, 'INSIDE');
  assert.equal(inside.areaRisk, 'HIGH');
  assert.equal(inside.geofenceScore, 100);
  assert.equal(inside.zones[0].inside, true);

  // ~0.0075 deg north of Swargate centre (~830 m) is ~230 m outside the 600 m radius
  const near = await (await call('/location/risk?lat=18.5093&lng=73.8636')).json();
  assert.equal(near.status, 'NEAR');
  assert.equal(near.areaRisk, 'MODERATE');
  assert.ok(near.geofenceScore > 0 && near.geofenceScore < 60);

  const safe = await (await call('/location/risk?lat=19.0&lng=73.4')).json();
  assert.equal(safe.status, 'SAFE');
  assert.equal(safe.geofenceScore, 0);
  assert.deepEqual(safe.zones, []);
});

test('location risk validates coordinates', async () => {
  assert.equal((await call('/location/risk?lat=abc&lng=1')).status, 400);
  assert.equal((await call('/location/risk?lat=95&lng=1')).status, 400);
  assert.equal((await call('/location/risk')).status, 400);
});
