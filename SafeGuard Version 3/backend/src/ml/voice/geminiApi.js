const bad = (message) => Object.assign(new Error(message), { status: 502 });

export async function generateGeminiText(apiKey, model, contents, timeoutMs = 30000, generationConfig = {}) {
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents, ...(Object.keys(generationConfig).length ? { generationConfig } : {}) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw bad('Gemini API is unreachable. Check the backend internet connection and try again.');
    }
    if (response.status !== 503 || attempt === 2) break;
    const retryAfterMs = Number(response.headers.get('retry-after')) * 1000;
    const delayMs = Number.isFinite(retryAfterMs) && retryAfterMs > 0
      ? Math.min(retryAfterMs, 5000)
      : 500 * (2 ** attempt) + Math.floor(Math.random() * 250);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code = body?.error?.status ?? body?.error?.details?.[0]?.reason;
    const detail = String(body?.error?.message ?? '').replace(/[\r\n]+/g, ' ').slice(0, 180);
    if (response.status === 503) {
      throw bad(`Gemini is temporarily unavailable (503)${detail ? `: ${detail}` : ''}. The app retried twice; wait briefly or try a different supported model.`);
    }
    if (response.status === 429) {
      throw bad(`Gemini API quota or rate limit reached${code ? ` (${code})` : ''}. Check Google AI Studio quota and billing.`);
    }
    if (response.status === 401 || response.status === 403 || code === 'API_KEY_INVALID') {
      throw bad(`Gemini API rejected the key or project access${code ? ` (${code})` : ''}. Check GEMINI_API_KEY and the key's Gemini API access.`);
    }
    throw bad(`Gemini API returned HTTP ${response.status}${code ? ` (${code})` : ''}${detail ? `: ${detail}` : ''}. Check the model name and request settings.`);
  }

  const data = await response.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
  if (!text) throw bad('Gemini returned no text. The clip may be unclear or blocked by the provider.');
  return text;
}

export function parseJsonObject(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}
