// Client-safe auth storage keys (must match values used at login)
export const AUTH_ACCESS_TOKEN_KEY = 'needletech_access_token';
export const AUTH_REFRESH_TOKEN_KEY = 'needletech_refresh_token';
export const AUTH_USER_KEY = 'needletech_user';

export const AUTH_DESKTOP_LOGIN_PATH = '/';
export const AUTH_MOBILE_LOGIN_PATH = '/mobile-login';

/** Routes that do not require a session. */
export const AUTH_PUBLIC_PATHS = [AUTH_DESKTOP_LOGIN_PATH, AUTH_MOBILE_LOGIN_PATH] as const;

/** Mobile app routes; unauthenticated visits go to mobile login. */
export const AUTH_MOBILE_PATH_PREFIXES = [
  AUTH_MOBILE_LOGIN_PATH,
  '/gatepass-qr-page',
  '/machine-assign-page',
  '/return-qr-page',
  '/stockkeeper-mobileui',
] as const;

export function isPublicAuthPath(pathname: string): boolean {
  return (AUTH_PUBLIC_PATHS as readonly string[]).includes(pathname);
}

export function isMobileAuthPath(pathname: string): boolean {
  return AUTH_MOBILE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function loginPathFor(pathname: string): string {
  return isMobileAuthPath(pathname) ? AUTH_MOBILE_LOGIN_PATH : AUTH_DESKTOP_LOGIN_PATH;
}