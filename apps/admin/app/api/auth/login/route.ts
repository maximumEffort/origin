import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://car-leasing-business-production.up.railway.app/v1';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { message: 'Server auth not configured. Set ADMIN_SECRET env var.' },
      { status: 500 }
    );
  }

  // Authenticate against the backend API to get the API token
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

  // Sign an 8-hour session JWT for middleware page access
  const sessionToken = await new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(secret));

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 8,
    path: '/',
  };

  const response = NextResponse.json({
    ok: true,
    admin: backendData.admin,
  });

  // Session cookie for middleware auth (page access)
  response.cookies.set('admin_session', sessionToken, cookieOptions);

  // Backend API token in httpOnly cookie (never exposed to JS)
  response.cookies.set('admin_api_token', backendData.access_token, cookieOptions);

  return response;
}
