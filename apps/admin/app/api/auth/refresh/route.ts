import { NextRequest, NextResponse } from 'next/server';
import {
  API_ACCESS_COOKIE,
  API_REFRESH_COOKIE,
  apiAccessCookieOptions,
  apiRefreshCookieOptions,
} from '@/lib/auth-cookies';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1';

/**
 * Exchange the refresh cookie for a new access + refresh pair, set both
 * httpOnly cookies, and return 204. Used by the admin [...path] proxy to
 * recover from a 401 mid-request without forcing the user to log in again.
 *
 * Note: this does not refresh `admin_session` (the middleware cookie) — that
 * one is signed by ADMIN_SECRET and lasts 8h regardless of backend JWT churn.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(API_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  const upstream = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!upstream.ok) {
    const failed = NextResponse.json({ message: 'Refresh failed' }, { status: 401 });
    failed.cookies.delete(API_ACCESS_COOKIE);
    failed.cookies.delete(API_REFRESH_COOKIE);
    return failed;
  }

  const data = await upstream.json();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(API_ACCESS_COOKIE, data.access_token, apiAccessCookieOptions);
  res.cookies.set(API_REFRESH_COOKIE, data.refresh_token, apiRefreshCookieOptions);
  return res;
}
