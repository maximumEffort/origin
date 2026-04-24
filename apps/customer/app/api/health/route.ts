import { NextResponse } from 'next/server';

/** Backend health endpoint is at the root, not behind /v1 prefix. */
const BACKEND_ORIGIN =
  (process.env.NEXT_PUBLIC_API_URL ?? 'https://car-leasing-business-production.up.railway.app/v1')
    .replace(/\/v1\/?$/, '');

export const dynamic = 'force-dynamic';

const HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
};

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  const start = Date.now();
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/health/live`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    checks.backend = {
      status: res.ok ? 'up' : 'down',
      latencyMs: Date.now() - start,
    };
  } catch {
    checks.backend = {
      status: 'down',
      latencyMs: Date.now() - start,
    };
  }

  const overallStatus = Object.values(checks).every((c) => c.status === 'up')
    ? 'healthy'
    : 'degraded';

  return NextResponse.json(
    {
      service: 'origin-website',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: overallStatus === 'healthy' ? 200 : 503, headers: HEADERS },
  );
}
