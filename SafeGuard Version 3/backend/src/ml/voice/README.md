# Voice analysis pipeline

Audio passes through a speech-to-text adapter, then the transcript is classified as `NORMAL`, `DISTRESS`, or `THREAT`. The two stages are configured independently.

| Stage | Current local configuration | Other adapters |
|---|---|---|
| Speech-to-text | `VOICE_STT=mock` supplies demo phrases and ignores arbitrary audio | `groq`, `openai`, `gemini`, or `http` |
| Transcript classifier | `VOICE_CLASSIFIER=trained` uses the locally trained model | `mock`, `openai`, `gemini`, or `http` |

## Trained classifier

The local model is a supervised TF-IDF word/character n-gram logistic-regression model trained from the provided labeled CSV. Its JSON weights are loaded by the Node backend; Python and scikit-learn are only needed for training.

The CSV had 50,000 rows and 8,696 distinct transcripts after normalized duplicate removal. The stratified 80/20 split held out 1,740 distinct transcripts. On those labels the reported accuracy was 99.94%, macro-F1 was 99.91%, and macro precision/recall were 99.86%/99.97%. The model artifact is then refit on all distinct transcripts. The dataset is highly repetitive and likely template-based, so the near-perfect held-out score may overstate performance on new, independently written speech. It measures agreement with the supplied labels, not real-world danger detection.

The data is balanced by raw row counts but unique transcript counts are uneven: 5,530 Normal, 1,160 Distress, and 2,006 Threat. Class weighting is used during training. Review the label definitions and ambiguous examples before using the classifier beyond a prototype.

## Use Groq free-tier speech-to-text

Groq provides hosted Whisper transcription with a free tier subject to account/model rate limits. The adapter accepts browser WebM audio and sends it to Groq's audio-transcription endpoint. It uses the multilingual `whisper-large-v3-turbo` model by default.

Create an API key in the [Groq Console](https://console.groq.com/keys), then set these values in `backend/.env`:

```env
VOICE_STT=groq
GROQ_API_KEY=your-private-groq-key
GROQ_STT_MODEL=whisper-large-v3-turbo
VOICE_CLASSIFIER=trained
```

Keep the key only in the backend environment file. Restart the backend and refresh the frontend; the Record button will become available. Free-tier quotas can change and requests can be rate limited. Audio is sent to Groq for transcription. See the [Groq speech-to-text docs](https://console.groq.com/docs/speech-to-text) and [rate limits](https://console.groq.com/docs/rate-limits).

## Retrain

From the project root:

```bash
python -m pip install -r scripts/requirements-voice-training.txt
cd backend
npm run train:voice -- --data "C:\path\to\pashuraksha_voice_semantic_dataset_50000.csv"
```

The script validates the `text`, `label`, and optional `label_id` columns, removes normalized duplicate transcripts before splitting, evaluates on a stratified held-out set, then exports:

- `backend/src/ml/voice/trainedModel.json` - inference weights and vocabulary
- `backend/src/ml/voice/training_report.json` - aggregate data and evaluation metrics

The CSV itself is not copied into the project.

## Limits

The trained model classifies transcript text; it does not transcribe audio. Mock STT ignores recordings. The Normal/Distress/Threat demo buttons use scripted transcripts and can run without an external provider.

Classifier confidence and `threatProbability` are model estimates, not calibrated probabilities that a real emergency is occurring. This transcript model does not analyze tone, acoustic distress, or background sounds. A neutral result does not prove someone is safe.
