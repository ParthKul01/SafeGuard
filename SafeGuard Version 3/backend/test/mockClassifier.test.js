import test from 'node:test';
import assert from 'node:assert/strict';
import { mockClassifier } from '../src/ml/voice/mockClassifier.js';
import { mockStt } from '../src/ml/voice/mockStt.js';

test('semantic mock classifier covers normal, distress, and threat', async () => {
  const cases = [
    ['normal', 'NORMAL'],
    ['distress', 'DISTRESS'],
    ['threat', 'THREAT'],
  ];

  for (const [demo, expected] of cases) {
    const { transcription } = await mockStt.transcribe(Buffer.from([1]), { demo });
    const result = await mockClassifier.classify(transcription);
    assert.equal(result.classification, expected);
    assert.ok(result.probability >= 0 && result.probability <= 1);
    assert.ok(result.threatProbability >= 0 && result.threatProbability <= 1);
  }
});

test('semantic mock classifier detects representative phrases', async () => {
  assert.equal((await mockClassifier.classify('Please help me, someone is following me')).classification, 'DISTRESS');
  assert.equal((await mockClassifier.classify("Give me your phone or I will hurt you")).classification, 'THREAT');
  assert.equal((await mockClassifier.classify('I am going home after college')).classification, 'NORMAL');
});
