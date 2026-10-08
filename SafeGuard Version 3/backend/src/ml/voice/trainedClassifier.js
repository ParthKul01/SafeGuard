import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEFAULT_MODEL_PATH = fileURLToPath(new URL('./trainedModel.json', import.meta.url));
const WORD_PATTERN = /[\p{L}\p{N}_]{2,}/gu;

function countFeatures(entries) {
  const counts = new Map();
  for (const feature of entries) counts.set(feature, (counts.get(feature) ?? 0) + 1);
  return counts;
}

function wordFeatureCounts(text) {
  const tokens = text.toLowerCase().match(WORD_PATTERN) ?? [];
  const features = [];
  for (let i = 0; i < tokens.length; i += 1) {
    features.push(tokens[i]);
    if (i > 0) features.push(`${tokens[i - 1]} ${tokens[i]}`);
  }
  return countFeatures(features);
}

function charFeatureCounts(text) {
  const features = [];
  for (const word of text.toLowerCase().split(/\s+/u)) {
    if (!word) continue;
    const padded = Array.from(` ${word} `);
    for (let size = 3; size <= 5; size += 1) {
      for (let start = 0; start + size <= padded.length; start += 1) {
        features.push(padded.slice(start, start + size).join(''));
      }
    }
  }
  return countFeatures(features);
}

function softmax(logits) {
  const max = Math.max(...logits);
  const exponents = logits.map((value) => Math.exp(value - max));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map((value) => value / total);
}

function validateModel(model) {
  if (model?.format !== 'safeguard-tfidf-logreg-v1'
      || !Array.isArray(model.classes)
      || !Array.isArray(model.intercepts)
      || !Array.isArray(model.coefficients)
      || !Array.isArray(model.featureBlocks)) {
    throw new Error('Trained voice classifier model has an unsupported format.');
  }
  if (model.classes.length !== model.intercepts.length
      || model.classes.length !== model.coefficients.length
      || model.classes.some((label) => !['NORMAL', 'DISTRESS', 'THREAT'].includes(label))) {
    throw new Error('Trained voice classifier model has invalid class weights.');
  }
  for (const block of model.featureBlocks) {
    if (!block.vocabulary || !Array.isArray(block.idf) || !Number.isFinite(block.weight)) {
      throw new Error(`Trained voice classifier has an invalid ${block.name} feature block.`);
    }
  }
}

export function createTrainedClassifier(modelPath = DEFAULT_MODEL_PATH) {
  const model = JSON.parse(readFileSync(modelPath, 'utf8'));
  validateModel(model);
  const wordBlock = model.featureBlocks.find((block) => block.name === 'word');
  const charBlock = model.featureBlocks.find((block) => block.name === 'char');
  if (!wordBlock || !charBlock) throw new Error('Trained voice classifier is missing a feature block.');

  return {
    source: 'trained:tfidf-logistic-regression',
    async classify(text) {
      const input = String(text ?? '');
      if (!input.trim()) return { classification: 'NORMAL', probability: 1, threatProbability: 0 };
      const logits = model.intercepts.slice();
      const addBlockScores = (block, counts) => {
        const active = [];
        let squaredNorm = 0;
        for (const [feature, count] of counts) {
          const index = block.vocabulary[feature];
          if (index === undefined) continue;
          const value = (1 + Math.log(count)) * block.idf[index];
          if (!Number.isFinite(value)) continue;
          active.push([index, value]);
          squaredNorm += value * value;
        }
        if (squaredNorm === 0) return;
        const scale = block.weight / Math.sqrt(squaredNorm);
        for (const [index, value] of active) {
          const featureIndex = block.offset + index;
          const normalizedValue = value * scale;
          for (let classIndex = 0; classIndex < logits.length; classIndex += 1) {
            logits[classIndex] += model.coefficients[classIndex][featureIndex] * normalizedValue;
          }
        }
      };
      addBlockScores(wordBlock, wordFeatureCounts(input));
      addBlockScores(charBlock, charFeatureCounts(input));
      const probabilities = softmax(logits);
      let bestIndex = 0;
      for (let index = 1; index < probabilities.length; index += 1) {
        if (probabilities[index] > probabilities[bestIndex]) bestIndex = index;
      }
      const threatIndex = model.classes.indexOf('THREAT');
      return {
        classification: model.classes[bestIndex],
        probability: probabilities[bestIndex],
        threatProbability: threatIndex >= 0 ? probabilities[threatIndex] : 0,
      };
    },
  };
}
