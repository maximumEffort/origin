import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://car-leasing-business-production.up.railway.app/v1';

const COOKIE_NAME = 'origin_customer_session';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ customer: null }, { status: 401 });
  }
  const upstream = await fetch(`${API_URL}/customers/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!upstream.ok) {
    // Token rejected by backend — clear cookie so client logs out cleanly
    const res = NextResponse.json({ customer: null }, { status: 401 });
    res.cookies.delete(COOKIE_NAME);
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
