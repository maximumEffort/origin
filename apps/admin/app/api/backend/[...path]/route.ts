import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1';

/**
 * Proxies authenticated requests to the backend API.
 * The backend JWT is stored in an httpOnly cookie (admin_api_token),
 * so it is never exposed to client-side JavaScript.
 */
async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const backendPath = '/' + path.join('/');
  const url = new URL(req.url);
  const qs = url.search;

  const token = req.cookies.get('admin_api_token')?.value;

  const incomingContentType = req.headers.get('content-type') ?? '';
  const isMultipart = incomingContentType.startsWith('multipart/form-data');

  const headers: Record<string, string> = {};
  if (!isMultipart) {
    headers['Content-Type'] = incomingContentType || 'application/json';
  } else {
    headers['Content-Type'] = incomingContentType;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody
    ? isMultipart
      ? await req.arrayBuffer()
      : await req.text()
    : undefined;

  const backendRes = await fetch(`${API_URL}${backendPath}${qs}`, {
    method: req.method,
    headers,
    body,
  });

  const data = await backendRes.text();

  return new NextResponse(data, {
    status: backendRes.status,
    headers: {
      'Content-Type': backendRes.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
