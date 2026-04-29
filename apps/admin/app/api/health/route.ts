import { NextResponse } from 'next/server';

const BACKEND_ORIGIN =
  (process.env.NEXT_PUBLIC_API_URL ?? 'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1')
    .replace(/\/v1\/?$/, '');

const WEBSITE_URL =
  process.env.NEXT_PUBLIC_WEBSITE_URL ??
  'https://origin-car-leasing-website.vercel.app';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
};

interface ServiceCheck {
  name: string;
  url: string;
  status: 'up' | 'down';
  latencyMs: number;
  data?: Record<string, unknown> | null;
}

async function checkService(name: string, url: string): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - start;
    const data = await res.json().catch(() => null);
    return { name, url, status: res.ok ? 'up' : 'down', latencyMs, data };
  } catch {
    return { name, url, status: 'down', latencyMs: Date.now() - start, data: null };
  }
}

export async function GET() {
  // All checks run server-side — no CORS issues
  const [backend, website, admin] = await Promise.all([
    checkService('Backend API', `${BACKEND_ORIGIN}/health`),
    checkService('Website', `${WEBSITE_URL}/api/health`),
    checkService('Admin Dashboard', `${BACKEND_ORIGIN}/health/live`),
  ]);

  // Admin is healthy if this route is responding
  const adminCheck: ServiceCheck = {
    name: 'Admin Dashboard',
    url: '/api/health',
    status: 'up',
    latencyMs: admin.latencyMs,
    data: { service: 'origin-admin', status: 'healthy' },
  };

  const services = [backend, website, adminCheck];

  const overallStatus = services.every((s) => s.status === 'up')
    ? 'healthy'
    : services.some((s) => s.name === 'Backend API' && s.status === 'down')
      ? 'unhealthy'
      : 'degraded';

  return NextResponse.json(
    {
      service: 'origin-admin',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
    },
    { status: overallStatus === 'unhealthy' ? 503 : 200, headers: HEADERS },
  );
}
