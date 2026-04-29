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

/**
 * Proxies authenticated customer-side requests to the backend.
 * The customer's JWT is stored in an httpOnly cookie (set on /api/auth/otp/verify),
 * so it never touches client-side JavaScript — XSS-safe.
 *
 * Mirrors the admin pattern in apps/admin/app/api/backend/[...path]/route.ts.
 *
 * On a 401 from the backend, automatically attempts one refresh against
 * /auth/refresh using the long-lived refresh cookie, then retries the original
 * request with the new access token. New access + refresh tokens are written
 * back as cookies on the proxy's response. If refresh fails, the original 401
 * is returned and the client redirects to /login.
 *
 * Supports both JSON and multipart/form-data (file uploads) — the latter is
 * used by the KYC document upload endpoint (POST /customers/me/documents/upload).
 */
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const backendPath = '/' + path.join('/');
  const url = new URL(req.url);
  const qs = url.search;

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  // Detect multipart uploads (file uploads) — pass through the original
  // Content-Type header (which includes the boundary string) and raw body
  // so the backend receives a valid multipart request.
  const incomingCT = req.headers.get('content-type') ?? '';
  const isMultipart = incomingCT.includes('multipart/form-data');

  // Read the body once up-front; we may need to retry the request after a
  // refresh, and the body stream can only be consumed once.
  let body: ArrayBuffer | string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = isMultipart ? await req.arrayBuffer() : await req.text();
  }

  const buildRequest = (token: string | undefined): RequestInit => {
    const headers: Record<string, string> = {};
    headers['Content-Type'] = isMultipart
      ? incomingCT
      : 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return { method: req.method, headers, body };
  };

  let upstream = await fetch(`${API_URL}${backendPath}${qs}`, buildRequest(accessToken));

  // Auto-refresh once on 401 if we have a refresh token.
  let rotatedAccess: string | undefined;
  let rotatedRefresh: string | undefined;

  if (upstream.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      rotatedAccess = refreshData.access_token;
      rotatedRefresh = refreshData.refresh_token;
      upstream = await fetch(
        `${API_URL}${backendPath}${qs}`,
        buildRequest(rotatedAccess),
      );
    }
    // If refresh failed, fall through with the original 401 — the client UI
    // will redirect to /login and the cookies will be cleared on next /me hit.
  }

  const responseBody = await upstream.text();
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });

  if (rotatedAccess) {
    response.cookies.set(ACCESS_COOKIE, rotatedAccess, accessCookieOptions);
  }
  if (rotatedRefresh) {
    response.cookies.set(REFRESH_COOKIE, rotatedRefresh, refreshCookieOptions);
  }

  return response;
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
