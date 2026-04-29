/**
 * Cookie names + options for admin-side auth.
 *
 * Three cookies are involved:
 *
 *   admin_session       — middleware page-access token (8h, signed by ADMIN_SECRET).
 *                         Long-lived because it's the user-facing "logged in" lifetime.
 *
 *   admin_api_token     — backend JWT (15 min, matches backend JWT_ACCESS_EXPIRES_MINUTES).
 *                         Short-lived; auto-refreshed by the [...path] proxy on 401.
 *
 *   admin_api_refresh   — backend refresh token (30d, matches JWT_REFRESH_EXPIRES_DAYS).
 *                         Used by the proxy + /api/auth/refresh to mint a new pair.
 */

export const SESSION_COOKIE = 'admin_session';
export const API_ACCESS_COOKIE = 'admin_api_token';
export const API_REFRESH_COOKIE = 'admin_api_refresh';

// Mirrors backend src/origin_backend/config.py:
//   jwt_access_expires_minutes: int = 15
//   jwt_refresh_expires_days: int = 30
export const SESSION_MAX_AGE_SEC = 60 * 60 * 8;
export const API_ACCESS_MAX_AGE_SEC = 60 * 15;
export const API_REFRESH_MAX_AGE_SEC = 60 * 60 * 24 * 30;

const isProd = process.env.NODE_ENV === 'production';

const baseOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict' as const,
  path: '/',
};

export const sessionCookieOptions = {
  ...baseOptions,
  maxAge: SESSION_MAX_AGE_SEC,
};

export const apiAccessCookieOptions = {
  ...baseOptions,
  maxAge: API_ACCESS_MAX_AGE_SEC,
};

export const apiRefreshCookieOptions = {
  ...baseOptions,
  maxAge: API_REFRESH_MAX_AGE_SEC,
};
