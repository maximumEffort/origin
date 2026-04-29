import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
} from '@/lib/auth-cookies';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1';

/**
 * Exchange the refresh cookie for a new access + refresh pair, set both
 * httpOnly cookies, and return 204. Used by the customer-side [...path]
 * proxy to recover from a 401 mid-request without forcing the user back
 * to /login. The client never sees either token.
 */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
  }

  const upstream = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!upstream.ok) {
    // Refresh token is dead — clear both cookies so the user lands on /login cleanly.
    const failed = NextResponse.json({ message: 'Refresh failed' }, { status: 401 });
    failed.cookies.delete(ACCESS_COOKIE);
    failed.cookies.delete(REFRESH_COOKIE);
    return failed;
  }

  const data = await upstream.json();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, data.access_token, accessCookieOptions);
  res.cookies.set(REFRESH_COOKIE, data.refresh_token, refreshCookieOptions);
  return res;
}
