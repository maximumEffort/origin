/**
 * Tests for auth helpers (lib/auth.ts) — cookie-based proxy edition.
 *
 * Tokens are now in httpOnly cookies (set by the API route on /api/auth/otp/verify).
 * The browser never sees them, so there's no token storage to test.
 * Tests focus on: correct proxy URL, correct payload shape, error propagation.
 */
import {
  sendOtp,
  verifyOtp,
  fetchProfile,
  updateProfile,
  authFetch,
  logoutSession,
} from '@/lib/auth';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function okJson(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function errResponse(status: number, body = '') {
  return Promise.resolve({
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
  });
}

// ── sendOtp ─────────────────────────────────────────────────────────────────

describe('sendOtp', () => {
  it('POSTs phone to /api/auth/otp/send (proxy, not direct backend)', async () => {
    mockFetch.mockReturnValue(okJson({ message: 'OTP sent' }));

    const result = await sendOtp('+971501234567');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/auth/otp/send');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ phone: '+971501234567' });
    expect(result).toEqual({ message: 'OTP sent' });
  });

  it('throws on error response', async () => {
    mockFetch.mockReturnValue(errResponse(400, 'Invalid phone'));
    await expect(sendOtp('bad')).rejects.toThrow('API 400');
  });
});

// ── verifyOtp ───────────────────────────────────────────────────────────────

describe('verifyOtp', () => {
  it('POSTs to /api/auth/otp/verify and returns customer (no tokens in body)', async () => {
    const response = {
      customer: {
        id: '1',
        phone: '+971501234567',
        fullName: null,
        kycStatus: null,
        preferredLanguage: null,
      },
    };
    mockFetch.mockReturnValue(okJson(response));

    const result = await verifyOtp('+971501234567', '123456');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/auth/otp/verify');
    expect(JSON.parse(opts.body)).toEqual({ phone: '+971501234567', otp: '123456' });
    expect(result).toEqual(response);
    // tokens never reach the client
    expect(result).not.toHaveProperty('access_token');
    expect(result).not.toHaveProperty('refresh_token');
  });
});

// ── logoutSession ───────────────────────────────────────────────────────────

describe('logoutSession', () => {
  it('POSTs to /api/auth/logout', async () => {
    mockFetch.mockReturnValue(okJson({ ok: true }));
    await logoutSession();
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/auth/logout');
    expect(opts.method).toBe('POST');
  });

  it('swallows errors silently', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    await expect(logoutSession()).resolves.toBeUndefined();
  });
});

// ── authFetch ───────────────────────────────────────────────────────────────

describe('authFetch', () => {
  it('routes through /api/backend proxy (cookie travels automatically)', async () => {
    mockFetch.mockReturnValue(okJson({ ok: true }));
    await authFetch('/bookings');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/backend/bookings');
    expect(opts.headers['Content-Type']).toBe('application/json');
    // The client never sets Authorization — it's the proxy's job.
    expect(opts.headers['Authorization']).toBeUndefined();
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockReturnValue(errResponse(401, 'Unauthorized'));
    await expect(authFetch('/protected')).rejects.toThrow('API 401');
  });
});

// ── fetchProfile ────────────────────────────────────────────────────────────

describe('fetchProfile', () => {
  it('GETs /api/auth/me and unwraps customer', async () => {
    mockFetch.mockReturnValue(
      okJson({
        customer: {
          id: '1',
          phone: '+971501234567',
          name: 'Bella Ma',
          email: 'bella@origin.ae',
          language: 'en',
          kycStatus: 'approved',
        },
      }),
    );

    const profile = await fetchProfile();

    expect(profile?.name).toBe('Bella Ma');
    expect(profile?.language).toBe('en');
    expect(profile?.email).toBe('bella@origin.ae');
  });

  it('returns null on 401 (no session)', async () => {
    mockFetch.mockReturnValue(okJson({ customer: null }, 401));
    const profile = await fetchProfile();
    expect(profile).toBeNull();
  });
});

// ── updateProfile ───────────────────────────────────────────────────────────

describe('updateProfile', () => {
  it('maps frontend name to backend fullName, PATCHes via /api/backend', async () => {
    mockFetch.mockReturnValue(
      okJson({
        id: '1',
        phone: '+971501234567',
        fullName: 'New Name',
        email: null,
        preferredLanguage: null,
        kycStatus: null,
      }),
    );

    const result = await updateProfile({ name: 'New Name' });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/backend/customers/me');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ fullName: 'New Name' });
    expect(result.name).toBe('New Name');
  });
});
