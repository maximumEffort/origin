/**
 * Tests for the health check route logic.
 *
 * We test the response structure and status determination logic
 * by importing the GET handler directly.
 */

// Mock global fetch for the service checks
const mockFetch = jest.fn();
global.fetch = mockFetch;

// We need to mock NextResponse since it's a server-side API
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      body,
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
    }),
  },
}));

import { GET } from '@/app/api/health/route';

beforeEach(() => {
  mockFetch.mockReset();
});

function mockServiceResponse(ok: boolean, data: Record<string, unknown> = {}) {
  return {
    ok,
    json: () => Promise.resolve(data),
  };
}

describe('Health check route', () => {
  it('returns healthy status when all services are up', async () => {
    mockFetch.mockResolvedValue(mockServiceResponse(true, { status: 'ok' }));

    const response = (await GET()) as { body: Record<string, unknown>; status: number };

    expect(response.body).toMatchObject({
      service: 'origin-admin',
      status: 'healthy',
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('services');

    const services = response.body.services as Array<{ name: string; status: string }>;
    expect(services).toHaveLength(3);
    expect(services.map((s) => s.name)).toEqual([
      'Backend API',
      'Website',
      'Admin Dashboard',
    ]);
  });

  it('returns unhealthy (503) when backend is down', async () => {
    // First call = backend (down), second = website (up), third = admin (up)
    mockFetch
      .mockResolvedValueOnce(mockServiceResponse(false))
      .mockResolvedValueOnce(mockServiceResponse(true))
      .mockResolvedValueOnce(mockServiceResponse(true));

    const response = (await GET()) as { body: Record<string, unknown>; status: number };

    expect(response.body.status).toBe('unhealthy');
    expect(response.status).toBe(503);
  });

  it('returns degraded when a non-backend service is down', async () => {
    // Backend up, website down, admin up
    mockFetch
      .mockResolvedValueOnce(mockServiceResponse(true))
      .mockResolvedValueOnce(mockServiceResponse(false))
      .mockResolvedValueOnce(mockServiceResponse(true));

    const response = (await GET()) as { body: Record<string, unknown>; status: number };

    expect(response.body.status).toBe('degraded');
    expect(response.status).toBe(200);
  });

  it('includes service check details with latency', async () => {
    mockFetch.mockResolvedValue(mockServiceResponse(true, { status: 'ok' }));

    const response = (await GET()) as { body: Record<string, unknown> };
    const services = response.body.services as Array<{
      name: string;
      status: string;
      latencyMs: number;
      url: string;
    }>;

    for (const svc of services) {
      expect(svc).toHaveProperty('name');
      expect(svc).toHaveProperty('url');
      expect(svc).toHaveProperty('status');
      expect(svc).toHaveProperty('latencyMs');
      expect(typeof svc.latencyMs).toBe('number');
    }
  });

  it('handles fetch failures gracefully (service returns down)', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const response = (await GET()) as { body: Record<string, unknown> };
    const services = response.body.services as Array<{ status: string }>;

    // Backend is down due to network error, so status should be unhealthy
    expect(response.body.status).toBe('unhealthy');
    // Admin Dashboard is always overridden to 'up'
    const adminSvc = (response.body.services as Array<{ name: string; status: string }>).find(
      (s) => s.name === 'Admin Dashboard',
    );
    expect(adminSvc?.status).toBe('up');
  });
});
