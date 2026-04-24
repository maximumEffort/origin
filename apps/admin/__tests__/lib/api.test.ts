/**
 * Tests for the admin API client (/lib/api.ts).
 *
 * The client uses a proxy pattern: all backend calls go through /api/backend/...
 * and auth is managed via httpOnly cookies (no localStorage).
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { apiRequest, api, adminLogin, clearToken } from '@/lib/api';

beforeEach(() => {
  mockFetch.mockReset();
});

describe('apiRequest', () => {
  it('calls /api/backend/ proxy, not the direct backend URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });

    await apiRequest('/vehicles');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/backend/vehicles',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: 'NIO ES6' }),
    });

    const result = await apiRequest('/vehicles/1');
    expect(result).toEqual({ id: 1, name: 'NIO ES6' });
  });

  it('throws "Session expired" on 401 response (triggers redirect)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: 'Unauthorized' }),
    });

    // The 401 path sets window.location.href = '/login' and throws 'Session expired'.
    // jsdom catches the navigation internally so we verify via the thrown error,
    // which proves the 401 branch was entered.
    await expect(apiRequest('/protected')).rejects.toThrow('Session expired');
  });

  it('throws with server error message on non-401 failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Internal server error' }),
    });

    await expect(apiRequest('/fail')).rejects.toThrow('Internal server error');
  });

  it('throws generic HTTP error when response body has no message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });

    await expect(apiRequest('/missing')).rejects.toThrow('HTTP 404');
  });

  it('handles non-JSON error responses gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(apiRequest('/bad-gateway')).rejects.toThrow('HTTP 502');
  });
});

describe('api helpers', () => {
  it('api.get sends a GET request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await api.get('/vehicles');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/backend/vehicles',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
    // GET is the default — no method override
    const callOptions = mockFetch.mock.calls[0][1];
    expect(callOptions.method).toBeUndefined();
  });

  it('api.post sends POST with JSON body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new' }),
    });

    await api.post('/bookings', { vehicleId: '123' });

    const callOptions = mockFetch.mock.calls[0][1];
    expect(callOptions.method).toBe('POST');
    expect(callOptions.body).toBe(JSON.stringify({ vehicleId: '123' }));
  });

  it('api.post without body sends no body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });

    await api.post('/trigger');

    const callOptions = mockFetch.mock.calls[0][1];
    expect(callOptions.method).toBe('POST');
    expect(callOptions.body).toBeUndefined();
  });

  it('api.patch sends PATCH with JSON body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ updated: true }),
    });

    await api.patch('/vehicles/1', { status: 'AVAILABLE' });

    const callOptions = mockFetch.mock.calls[0][1];
    expect(callOptions.method).toBe('PATCH');
    expect(callOptions.body).toBe(JSON.stringify({ status: 'AVAILABLE' }));
  });
});

describe('adminLogin', () => {
  it('calls /api/auth/login with email and password', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          admin: { id: '1', email: 'admin@originleasing.ae', fullName: 'Admin', role: 'admin' },
        }),
    });

    const result = await adminLogin('admin@originleasing.ae', 'password123');

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@originleasing.ae', password: 'password123' }),
    });
    expect(result.ok).toBe(true);
    expect(result.admin.email).toBe('admin@originleasing.ae');
  });

  it('throws on invalid credentials', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Invalid credentials' }),
    });

    await expect(adminLogin('bad@email.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });

  it('throws default message when error response has no message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('not json')),
    });

    await expect(adminLogin('bad@email.com', 'wrong')).rejects.toThrow(
      'Invalid email or password',
    );
  });
});

describe('clearToken', () => {
  it('calls /api/auth/logout via POST', () => {
    mockFetch.mockResolvedValue({ ok: true });

    clearToken();

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
  });
});
