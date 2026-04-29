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
    res.cookies.set(ACCESS_COOKIE, access_token, accessCookieOptions);
  }
  if (refresh_token) {
    res.cookies.set(REFRESH_COOKIE, refresh_token, refreshCookieOptions);
  }

  return res;
}
