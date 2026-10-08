export interface AuthUser { id: number; name: string; email: string; role?: 'USER' | 'ADMIN' }
export interface AuthSession { token: string; user: AuthUser }
const SESSION_KEY = 'safegaurd.auth';
const AUTH_EVENT = 'safegaurd:auth-change';

export function getAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as AuthSession;
    return value && typeof value.token === 'string' && value.user ? value : null;
  } catch { return null; }
}
export function getAuthToken(): string | null { return getAuthSession()?.token ?? null; }
export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_EVENT));
}
export function clearAuthSession(): void {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}
