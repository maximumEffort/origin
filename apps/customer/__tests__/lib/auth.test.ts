/**
 * Tests for auth helpers (lib/auth.ts).
 */
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  sendOtp,
  verifyOtp,
  fetchProfile,
  updateProfile,
  authFetch,
} from '@/lib/auth';

// ── Setup ───────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => store[key] ?? null),
  setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: jest.fn((key: string) => { delete store[key]; }),
  clear: jest.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
  mockFetch.mockReset();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  Object.keys(store).forEach((k) => delete store[k]);
});

const API_BASE = 'https://car-leasing-business-production.up.railway.app/v1';

function okJson(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function errResponse(status: number, body = '') {
  return Promise.resolve({
    ok: false,
    status,
    statusText: 'Error',
    text: () => Promise.resolve(body),
  });
}

// ── Token storage ───────────────────────────────────────────────────────────

describe('token storage', () => {
  it('setTokens stores access and refresh tokens', () => {
    setTokens('access123', 'refresh456');
    expect(store['origin_access_token']).toBe('access123');
    expect(store['origin_refresh_token']).toBe('refresh456');
  });

  it('getAccessToken returns stored token', () => {
    store['origin_access_token'] = 'mytoken';
    expect(getAccessToken()).toBe('mytoken');
  });

  it('getRefreshToken returns stored token', () => {
    store['origin_refresh_token'] = 'myrefresh';
    expect(getRefreshToken()).toBe('myrefresh');
  });

  it('clearTokens removes both tokens', () => {
    store['origin_access_token'] = 'a';
    store['origin_refresh_token'] = 'b';
    clearTokens();
    expect(store['origin_access_token']).toBeUndefined();
    expect(store['origin_refresh_token']).toBeUndefined();
  });
});

// ── sendOtp ─────────────────────────────────────────────────────────────────

describe('sendOtp', () => {
  it('sends POST to /auth/otp/send', async () => {
    mockFetch.mockReturnValue(okJson({ message: 'OTP sent' }));

    const result = await sendOtp('+971501234567');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/auth/otp/send`);
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
  it('sends POST to /auth/otp/verify with phone and otp', async () => {
    const response = {
      access_token: 'at',
      refresh_token: 'rt',
      customer: { id: '1', phone: '+971501234567', fullName: null, kycStatus: null, preferredLanguage: null },
    };
    mockFetch.mockReturnValue(okJson(response));

    const result = await verifyOtp('+971501234567', '123456');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/auth/otp/verify`);
    expect(JSON.parse(opts.body)).toEqual({ phone: '+971501234567', otp: '123456' });
    expect(result).toEqual(response);
  });
});

// ── authFetch ───────────────────────────────────────────────────────────────

describe('authFetch', () => {
  it('includes Authorization header when token exists', async () => {
    store['origin_access_token'] = 'bearertoken';
    mockFetch.mockReturnValue(okJson({ ok: true }));

    await authFetch('/some/path');

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer bearertoken');
  });

  it('omits Authorization header when no token', async () => {
    mockFetch.mockReturnValue(okJson({ ok: true }));

    await authFetch('/some/path');

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBeUndefined();
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockReturnValue(errResponse(401, 'Unauthorized'));
    await expect(authFetch('/protected')).rejects.toThrow('API 401');
  });
});

// ── fetchProfile ────────────────────────────────────────────────────────────

describe('fetchProfile', () => {
  it('maps backend fullName to frontend name', async () => {
    store['origin_access_token'] = 'token';
    mockFetch.mockReturnValue(
      okJson({
        id: '1',
        phone: '+971501234567',
        fullName: 'Bella Ma',
        email: 'bella@origin.ae',
        preferredLanguage: 'en',
        kycStatus: 'approved',
      }),
    );

    const profile = await fetchProfile();

    expect(profile.name).toBe('Bella Ma');
    expect(profile.language).toBe('en');
    expect(profile.email).toBe('bella@origin.ae');
  });
});

// ── updateProfile ───────────────────────────────────────────────────────────

describe('updateProfile', () => {
  it('maps frontend name to backend fullName', async () => {
    store['origin_access_token'] = 'token';
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

    await updateProfile({ name: 'New Name' });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ fullName: 'New Name' });
  });
});
