import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import {
  SESSION_COOKIE,
  API_ACCESS_COOKIE,
  API_REFRESH_COOKIE,
  sessionCookieOptions,
  apiAccessCookieOptions,
  apiRefreshCookieOptions,
} from '@/lib/auth-cookies';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { message: 'Server auth not configured. Set ADMIN_SECRET env var.' },
      { status: 500 }
    );
  }

  // Authenticate against the backend API to get the API tokens
  const backendRes = await fetch(`${API_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!backendRes.ok) {
    const error = await backendRes.json().catch(() => ({}));
    return NextResponse.json(
      { message: error?.message ?? 'Invalid email or password.' },
      { status: 401 }
    );
  }

  const backendData = await backendRes.json();

  // Sign an 8-hour session JWT for middleware page access. This is the
  // user-visible "logged in" lifetime and is intentionally longer than the
  // 15-minute backend JWT — the backend tokens auto-rotate via /auth/refresh.
  const sessionToken = await new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(secret));

  const response = NextResponse.json({
    ok: true,
    admin: backendData.admin,
  });

  response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions);
  response.cookies.set(API_ACCESS_COOKIE, backendData.access_token, apiAccessCookieOptions);
  response.cookies.set(API_REFRESH_COOKIE, backendData.refresh_token, apiRefreshCookieOptions);

  return response;
}
