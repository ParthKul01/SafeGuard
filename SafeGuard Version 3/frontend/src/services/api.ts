import { getAuthToken } from './auth';
export const BASE = import.meta.env.VITE_API_URL ?? '/api';
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
  const res = await fetch(BASE + path, { ...init, headers });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Request failed (' + res.status + ')');
  return res.json();
}
export const getHealth = () => api<{ status: string; mode: string; voice?: { enabled: boolean; configured?: boolean; demoReady?: boolean; source: { stt: string; classifier: string } } }>('/health');
