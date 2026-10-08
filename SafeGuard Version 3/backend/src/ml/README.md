# Crime-risk model

The API only depends on this interface, so the mock can be replaced without touching routes or the frontend:

```js
{ source: string, modelVersion: string, predict(features): Promise<{ riskLevel, probability, factors }> }
```

## Plugging in the trained Random Forest
1. Serve the model over HTTP (for example FastAPI + scikit-learn) with `POST /predict`.
2. Set `CRIME_MODEL=http` and `CRIME_MODEL_URL=http://localhost:8000/predict` in `backend/.env`.

Request body sent to your service:
```json
{ "latitude": 18.52, "longitude": 73.85, "hour": 23, "dayOfWeek": 5, "geofenceStatus": "NEAR",
  "geofenceScore": 32, "areaRiskCategory": "MODERATE",
  "nearestZone": { "name": "Swargate Bus Stand Area", "riskLevel": "HIGH", "distanceM": 234, "inside": false } }
```
Expected response:
```json
{ "riskLevel": "MODERATE", "probability": 0.67, "factors": ["Historical crime frequency", "Area risk category"] }
```
Invalid or failed responses become `502` errors; the frontend falls back to a baseline value and shows that the model is unavailable.
