import { NextResponse } from 'next/server';

const COOKIE_NAME = 'origin_customer_session';
const REFRESH_COOKIE_NAME = 'origin_customer_refresh';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  res.cookies.delete(REFRESH_COOKIE_NAME);
  return res;
}
