import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1';

const COOKIE_NAME = 'origin_customer_session';
const REFRESH_COOKIE_NAME = 'origin_customer_refresh';

const isProd = process.env.NODE_ENV === 'production';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  // Strip tokens from the response — they live in httpOnly cookies only
  const { access_token, refresh_token, customer } = data;
  const res = NextResponse.json({ customer });

  if (access_token) {
    res.cookies.set(COOKIE_NAME, access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      // Backend access tokens are short-lived (~15 min). Cookie expiry should match —
      // we let the cookie fall off and trigger a re-login flow.
      maxAge: 60 * 60 * 24, // 24h ceiling; actual JWT expiry is enforced by backend
    });
  }
  if (refresh_token) {
    res.cookies.set(REFRESH_COOKIE_NAME, refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return res;
}
