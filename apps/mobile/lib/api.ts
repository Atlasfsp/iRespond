import { getAccessToken } from './session';

export type Session = {
  subject: string;
  roles: string[];
};

export class APIError extends Error {
  status: number;
  payload?: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.payload = payload;
  }
}

export function apiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const base = apiBaseUrl();
  if (!base) throw new APIError(503, 'iRespond API is not configured on this build.');

  const headers = new Headers(init.headers ?? {});
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  if (authenticated) {
    const token = await getAccessToken();
    if (!token) throw new APIError(401, 'Sign in is required.');
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${base}${path}`, { ...init, headers });
  const text = await response.text();
  let payload: unknown;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }
  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload
      ? String((payload as { error?: unknown }).error ?? `Request failed (${response.status})`)
      : `Request failed (${response.status})`;
    throw new APIError(response.status, message, payload);
  }
  return payload as T;
}

export function getSession() {
  return apiFetch<Session>('/v1/session');
}

export function postJSON<T>(path: string, value: unknown) {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(value) });
}

export function putJSON<T>(path: string, value: unknown) {
  return apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(value) });
}
