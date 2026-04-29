import { NextRequest, NextResponse } from 'next/server';
import {
  API_ACCESS_COOKIE,
  API_REFRESH_COOKIE,
  apiAccessCookieOptions,
  apiRefreshCookieOptions,
} from '@/lib/auth-cookies';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1';

/**
 * Proxies authenticated admin requests to the backend API.
 * The backend JWT is stored in an httpOnly cookie (admin_api_token), so it is
 * never exposed to client-side JavaScript.
 *
 * On a 401 from the backend, automatically attempts one refresh against
 * /auth/refresh using the admin_api_refresh cookie, then retries the original
 * request with the new access token. New tokens are written back as cookies on
 * the proxy response. If refresh fails the original 401 propagates and the
 * client redirects to /login.
 */
async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const backendPath = '/' + path.join('/');
  const url = new URL(req.url);
  const qs = url.search;

  const accessToken = req.cookies.get(API_ACCESS_COOKIE)?.value;
  const refreshToken = req.cookies.get(API_REFRESH_COOKIE)?.value;

  const incomingContentType = req.headers.get('content-type') ?? '';
  const isMultipart = incomingContentType.startsWith('multipart/form-data');

  // Read the body once; we may need to retry after a refresh and the stream
  // can only be consumed once.
  let body: ArrayBuffer | string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = isMultipart ? await req.arrayBuffer() : await req.text();
  }

  const buildRequest = (token: string | undefined): RequestInit => {
    const headers: Record<string, string> = {};
    headers['Content-Type'] = isMultipart
      ? incomingContentType
      : incomingContentType || 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return { method: req.method, headers, body };
  };

  let backendRes = await fetch(
    `${API_URL}${backendPath}${qs}`,
    buildRequest(accessToken),
  );

  let rotatedAccess: string | undefined;
  let rotatedRefresh: string | undefined;

  if (backendRes.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      rotatedAccess = refreshData.access_token;
      rotatedRefresh = refreshData.refresh_token;
      backendRes = await fetch(
        `${API_URL}${backendPath}${qs}`,
        buildRequest(rotatedAccess),
      );
    }
  }

  const data = await backendRes.text();

  const response = new NextResponse(data, {
    status: backendRes.status,
    headers: {
      'Content-Type': backendRes.headers.get('Content-Type') ?? 'application/json',
    },
  });

  if (rotatedAccess) {
    response.cookies.set(API_ACCESS_COOKIE, rotatedAccess, apiAccessCookieOptions);
  }
  if (rotatedRefresh) {
    response.cookies.set(API_REFRESH_COOKIE, rotatedRefresh, apiRefreshCookieOptions);
  }

  return response;
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
