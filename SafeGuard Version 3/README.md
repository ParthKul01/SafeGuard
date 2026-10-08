# SafeGaurd

SafeGaurd is a personal-safety website prototype built with React, Vite, TypeScript, Express, and SQLite.

## Run locally

Install dependencies from the project root, then start both servers:

```bash
npm run install:all
npm run dev
```

The frontend runs on port 5173 and the API on port 5000. You can also start each server from its own folder with `npm run dev`.

## Emergency contact delivery

The backend can send SMS and automated voice calls through Twilio **after the user confirms an alert**. Delivery is disabled by default. Copy `backend/.env.example` to `backend/.env`, then set:

```env
ALERT_DELIVERY=sms,call
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+12345678900
```

Keep credentials on the server; never put them in frontend environment variables. In Contacts, enable emergency delivery only for people who agreed to receive alerts. Use full international phone numbers. A provider acceptance response does not guarantee that a carrier delivered a message or completed a call. If provider delivery is unavailable, the confirmed-alert screen offers device SMS and call actions. This feature does not contact emergency services.

The API is currently a single-user prototype with no login or request rate limiting. Keep provider delivery disabled on public or shared hosts until authentication, per-user contact isolation, and abuse controls are implemented.

## Current capabilities and limits

- Device GPS is requested only after the user enables it. The map shows the real device position when available.
- Bundled sample contacts, crime zones, and sample history are disabled and removed from older databases by exact fixture match. Set `SEED_DEMO_DATA=true` only for a disposable demo database.
- Verified local crime or safety-zone data is not connected; area risk is therefore unavailable.
- The local semantic voice classifier uses the trained transcript model. Mock STT supplies demo phrases; recorded speech needs a real STT provider such as Groq. Results are not acoustic distress detection or a calibrated real-world danger probability.
- Phone motion can be read on supported devices, but movement classification is an untrained heuristic, not a medical-grade detector.
- The risk score includes only available signals and is not a personal danger assessment.
- Confirmed and dismissed alerts appear in History. SMS/call delivery requires server credentials and contact opt-in.

## Project structure

```text
backend/src      Express API, SQLite services, model adapters
frontend/src     React pages, components, browser device inputs
scripts          Voice-classifier training utility
```

## Semantic voice classifier

The current local classifier is a supervised TF-IDF word/character n-gram model with logistic regression. Its learned weights are exported to `backend/src/ml/voice/trainedModel.json`, so inference runs in the Node backend without Python.

The supplied 50,000-row dataset contains 8,696 distinct transcripts after normalized duplicate removal. On a held-out split the model scored 99.94% accuracy and 99.91% macro-F1 against the supplied labels. Since the dataset is highly repetitive and likely template-based, these scores should not be treated as expected performance on new speech. Review the labels and validate on fresh, independently written transcripts before relying on the classifier.

Use Groq's free-tier Whisper transcription by adding `VOICE_STT=groq`, `GROQ_API_KEY`, and `GROQ_STT_MODEL=whisper-large-v3-turbo` to `backend/.env`, while keeping `VOICE_CLASSIFIER=trained`. Free-tier use has account/model rate limits. The audio is sent to Groq for transcription. See the [Groq STT docs](https://console.groq.com/docs/speech-to-text).

For local retraining:

```bash
python -m pip install -r scripts/requirements-voice-training.txt
cd backend
npm run train:voice -- --data "C:\path\to\pashuraksha_voice_semantic_dataset_50000.csv"
```

The training script deduplicates normalized transcripts before splitting and saves aggregate evaluation details in `backend/src/ml/voice/training_report.json`. It does not copy the CSV into the project.
