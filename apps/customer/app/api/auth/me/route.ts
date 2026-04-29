import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth-cookies';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ customer: null }, { status: 401 });
  }
  const upstream = await fetch(`${API_URL}/customers/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!upstream.ok) {
    // Token rejected by backend — clear both cookies so client logs out cleanly.
    // The [...path] proxy auto-refreshes on 401; this route is hit on first load
    // before any proxy call, so a hard logout here is appropriate.
    const res = NextResponse.json({ customer: null }, { status: 401 });
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
    return res;
  }
  const raw = await upstream.json();
  return NextResponse.json({
    customer: {
      id: raw.id,
      phone: raw.phone,
      name: raw.fullName ?? null,
      email: raw.email ?? null,
      language: raw.preferredLanguage ?? null,
      kycStatus: raw.kycStatus ?? null,
    },
  });
}
