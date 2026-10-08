const bad = (message) => Object.assign(new Error(message), { status: 502 });

const BILLING_CODES = new Set([
  'insufficient_quota',
  'credit_balance_exhausted',
  'organization_usage_limit_exceeded',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded',
]);

export async function openAiFailure(response, service) {
  const body = await response.json().catch(() => null);
  const code = body?.error?.code ?? body?.error?.type;
  if (response.status === 429 && BILLING_CODES.has(code)) {
    return bad(`OpenAI ${service} quota or billing limit reached (${code}). Check API credits, usage, and project/organization spend limits.`);
  }
  if (response.status === 429 && code === 'rate_limit_exceeded') {
    const retryAfter = response.headers.get('retry-after');
    return bad(`OpenAI ${service} request rate limit reached${retryAfter ? `; retry after ${retryAfter} seconds` : '; wait briefly before retrying'}.`);
  }
  if (response.status === 429) {
    return bad(`OpenAI ${service} returned HTTP 429${code ? ` (${code})` : ''}. Check API usage limits and credits.`);
  }
  return bad(`OpenAI ${service} returned ${response.status}${code ? ` (${code})` : ''}.`);
}
