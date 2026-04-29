/**
 * Tests for the API client (lib/api.ts).
 */
import { fetchVehicles, fetchVehicle, fetchQuote, submitContact } from '@/lib/api';
import type { QuoteRequest, ContactRequest } from '@/lib/api';

// ── Setup ───────────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

const API_BASE = 'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1';

function okJson(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  });
}

function errResponse(status: number, statusText: string) {
  return Promise.resolve({
    ok: false,
    status,
    statusText,
  });
}

// ── fetchVehicles ───────────────────────────────────────────────────────────

describe('fetchVehicles', () => {
  it('calls /vehicles with no query params when no filters given', async () => {
    const payload = { data: [], pagination: { total: 0, page: 1, limit: 20 } };
    mockFetch.mockReturnValue(okJson(payload));

    const result = await fetchVehicles();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/vehicles`);
    expect(result).toEqual(payload);
  });

  it('appends brand and category filters as query params', async () => {
    mockFetch.mockReturnValue(okJson({ data: [], pagination: { total: 0, page: 1, limit: 20 } }));

    await fetchVehicles({ brand: 'NIO', category: 'suv' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('brand=NIO');
    expect(url).toContain('category=suv');
  });

  it('includes price range filters', async () => {
    mockFetch.mockReturnValue(okJson({ data: [], pagination: { total: 0, page: 1, limit: 20 } }));

    await fetchVehicles({ min_price: 5000, max_price: 10000 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('min_price=5000');
    expect(url).toContain('max_price=10000');
  });
});

// ── fetchVehicle ────────────────────────────────────────────────────────────

describe('fetchVehicle', () => {
  it('fetches a single vehicle by ID', async () => {
    const vehicle = { id: 'nio-es6', brand: 'NIO', model: 'ES6' };
    mockFetch.mockReturnValue(okJson(vehicle));

    const result = await fetchVehicle('nio-es6');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/vehicles/nio-es6`);
    expect(result).toEqual(vehicle);
  });
});

// ── fetchQuote ──────────────────────────────────────────────────────────────

describe('fetchQuote', () => {
  it('sends a POST with camelCase quote body', async () => {
    const body: QuoteRequest = {
      vehicleId: 'nio-es6',
      startDate: '2026-05-01',
      endDate: '2026-08-01',
      mileagePackage: 3000,
      addOns: { cdw_waiver: true },
    };
    const quote = { totalAed: 25000 };
    mockFetch.mockReturnValue(okJson(quote));

    const result = await fetchQuote(body);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/calculator/quote`);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(body);
    expect(result).toEqual(quote);
  });
});

// ── submitContact ───────────────────────────────────────────────────────────

describe('submitContact', () => {
  it('sends a POST to /contact', async () => {
    const body: ContactRequest = {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Hello',
    };
    const response = { id: '123', received: true };
    mockFetch.mockReturnValue(okJson(response));

    const result = await submitContact(body);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe(`${API_BASE}/contact`);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(body);
    expect(result).toEqual(response);
  });
});

// ── Error handling ──────────────────────────────────────────────────────────

describe('error handling', () => {
  it('throws on non-200 response', async () => {
    mockFetch.mockReturnValue(errResponse(404, 'Not Found'));

    await expect(fetchVehicle('nonexistent')).rejects.toThrow('API 404');
  });

  it('throws on 500 response', async () => {
    mockFetch.mockReturnValue(errResponse(500, 'Internal Server Error'));

    await expect(fetchVehicles()).rejects.toThrow('API 500');
  });
});
