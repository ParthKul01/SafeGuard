// PROTOTYPE ONLY. No speech recognition happens here: the audio is ignored.
// With a `demo` scenario it returns a scripted phrase so the pipeline can be demonstrated.
const PHRASES = {
  normal: "I'm just walking home, I should be there in ten minutes.",
  distress: 'Please help me, I am scared, somebody help!',
  threat: "Give me your phone and don't move, or I will hurt you.",
};

export const mockStt = {
  source: 'mock',
  async transcribe(_audio, { demo } = {}) {
    return { transcription: demo ? PHRASES[demo] : '' };
  },
};
