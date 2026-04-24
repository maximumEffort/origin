import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 0,
    path: '/',
  };
  response.cookies.set('admin_session', '', cookieOptions);
  response.cookies.set('admin_api_token', '', cookieOptions);
  return response;
}
