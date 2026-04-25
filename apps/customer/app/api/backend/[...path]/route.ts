import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://car-leasing-business-production.up.railway.app/v1';

const COOKIE_NAME = 'origin_customer_session';

/**
 * Proxies authenticated customer-side requests to the backend.
 * The customer's JWT is stored in an httpOnly cookie (set on /api/auth/otp/verify),
 * so it never touches client-side JavaScript — XSS-safe.
 *
 * Mirrors the admin pattern in apps/admin/app/api/backend/[...path]/route.ts.
 */
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const backendPath = '/' + path.join('/');
  const url = new URL(req.url);
  const qs = url.search;

  const token = req.cookies.get(COOKIE_NAME)?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.text()
      : undefined;

  const upstream = await fetch(`${API_URL}${backendPath}${qs}`, {
    method: req.method,
    headers,
    body,
  });

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
