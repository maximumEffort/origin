import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  API_ACCESS_COOKIE,
  API_REFRESH_COOKIE,
} from '@/lib/auth-cookies';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(API_ACCESS_COOKIE);
  response.cookies.delete(API_REFRESH_COOKIE);
  return response;
}
