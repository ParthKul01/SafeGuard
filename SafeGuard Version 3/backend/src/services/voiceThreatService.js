export function voiceThreatService({ stt, classifier }) {
  return {
    async analyze(audio, { mime, demo }) {
      const { transcription } = await stt.transcribe(audio, { mime, demo });
      const { classification, probability, threatProbability } = await classifier.classify(transcription);
      return {
        transcription,
        classification,
        probability,                                                    // confidence in the predicted class
        threatProbability: threatProbability ?? (classification === 'NORMAL' ? 1 - probability : probability), // model signal score; not a real-world danger probability
        source: { stt: stt.source, classifier: classifier.source },
      };
    },
  };
}
