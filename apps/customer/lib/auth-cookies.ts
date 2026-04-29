/**
 * Cookie names + options for the customer-side httpOnly auth cookies.
 *
 * Both cookies are set on POST /api/auth/otp/verify and rotated on
 * POST /api/auth/refresh (or in-flight by the [...path] proxy on 401).
 */

export const ACCESS_COOKIE = 'origin_customer_session';
export const REFRESH_COOKIE = 'origin_customer_refresh';

// Mirrors backend src/origin_backend/config.py:
//   jwt_access_expires_minutes: int = 15
//   jwt_refresh_expires_days: int = 30
export const ACCESS_COOKIE_MAX_AGE_SEC = 60 * 15;
export const REFRESH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

const isProd = process.env.NODE_ENV === 'production';

export const accessCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: ACCESS_COOKIE_MAX_AGE_SEC,
};

export const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: REFRESH_COOKIE_MAX_AGE_SEC,
};
