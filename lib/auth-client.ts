/**
 * Client-side auth helpers: token storage, refresh, and authenticated fetch.
 * Use authFetch() for API calls so 401 triggers refresh and retry; failed refresh redirects to login.
 */

import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_USER_KEY,
} from '@/lib/auth-constants';

const REFRESH_API = '/api/v1/auth/refresh';
/** Refresh a bit before JWT exp so the first request after idle does not 401. */
const TOKEN_EXPIRY_SKEW_SECONDS = 60;

let refreshInFlight: Promise<boolean> | null = null;

function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function getAccessToken(): string | null {
  if (!isClient()) return null;
  return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isClient()) return null;
  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (!isClient()) return;
  localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Clear all auth data from storage. Call after logout or when refresh fails.
 */
export function clearAuth(): void {
  if (!isClient()) return;
  localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

/**
 * Redirect to login page. Use after clearAuth() when session is invalid.
 */
export function redirectToLogin(): void {
  if (!isClient()) return;
  window.location.href = '/';
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isAccessTokenExpiringSoon(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (typeof payload?.exp !== 'number') return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + TOKEN_EXPIRY_SKEW_SECONDS;
}

async function requestNewTokens(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(REFRESH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json();

    if (!res.ok || json?.status !== 'success' || !json?.data) {
      return false;
    }

    const { accessToken: newAccess, refreshToken: newRefresh } = json.data;
    if (newAccess) {
      localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, newAccess);
    }
    if (newRefresh) {
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, newRefresh);
    }
    return !!newAccess;
  } catch {
    return false;
  }
}

/**
 * Call refresh API with current refresh token; update storage on success.
 * Concurrent callers share one in-flight refresh (Supabase refresh tokens are single-use).
 * @returns true if new tokens were stored, false otherwise
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = requestNewTokens().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * Headers with current access token for API requests.
 * Use with fetch() or pass to authFetch (it will add these when not provided).
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type AuthFetchOptions = {
  /** If true, do not attempt refresh on 401 (e.g. for logout call). Default false. */
  skipRefresh?: boolean;
};

/**
 * Fetch with auth: adds Bearer token, refreshes before JWT expiry, and on 401 retries once.
 * If refresh fails or retry still 401, clears auth and redirects to login
 * without throwing, so pages do not flash a session-expired error.
 * Use for all authenticated API calls so token refresh is handled in one place.
 * 503 (DB temporarily unavailable) is returned as-is and does not clear the session.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: AuthFetchOptions = {}
): Promise<Response> {
  const { skipRefresh = false } = options;
  const headers = new Headers(init?.headers);

  if (!skipRefresh && isAccessTokenExpiringSoon(getAccessToken())) {
    await refreshAccessToken();
  }

  if (!headers.has('Authorization')) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(input, { ...init, headers });

  // Only treat real auth failures as session expiry. Pool exhaustion used to
  // surface as 401 and caused logout/refresh storms; those now return 503.
  if (res.status === 401 && !skipRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        res = await fetch(input, { ...init, headers });
      }
    }
    if (res.status === 401) {
      clearAuth();
      redirectToLogin();
      // Do not throw: navigation is in progress and catch handlers would flash an error.
      return new Promise<Response>(() => {});
    }
  }

  return res;
}
