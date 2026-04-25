/**
 * Auth helpers for Origin customer authentication.
 *
 * All requests go through Next.js API route proxies under /api/auth/* and
 * /api/backend/*. The backend JWT is stored in an httpOnly cookie set
 * server-side (see app/api/auth/otp/verify/route.ts) and travels
 * automatically with cookie-included fetches. JS code in the browser
 * cannot read or write the token — XSS-safe.
 *
 * Mirrors the admin pattern in apps/admin/lib/api.ts.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  language: string | null;
  kycStatus: string | null;
}

export interface OtpSendResponse {
  message: string;
}

/** Verify response — tokens are NOT returned to the client; they're set as httpOnly cookies. */
export interface OtpVerifyResponse {
  customer: {
    id: string;
    phone: string;
    fullName: string | null;
    kycStatus: string | null;
    preferredLanguage: string | null;
  };
}

export interface ProfileUpdatePayload {
  name?: string;
  email?: string;
  language?: string;
}

interface BackendProfileUpdate {
  fullName?: string;
  email?: string;
  preferredLanguage?: string;
}

// ── Authenticated fetch (via /api/backend proxy) ─────────────────────────────

/**
 * Make an authenticated request against the backend API. Cookies travel
 * automatically — no Authorization header to manage on the client.
 *
 * `path` is the backend path WITHOUT the /v1 prefix (e.g. '/bookings').
 */
export async function authFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      // Session lost — redirect to login from the calling page if it cares.
      // We don't auto-redirect here so the caller can choose graceful UX.
    }
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

// ── Auth API calls (via /api/auth proxies) ───────────────────────────────────

export async function sendOtp(phone: string): Promise<OtpSendResponse> {
  const res = await fetch('/api/auth/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<OtpVerifyResponse> {
  const res = await fetch('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: code }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

/** Clear the session cookies. */
export async function logoutSession(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
}

// ── Customer profile ─────────────────────────────────────────────────────────

/** Fetch the current customer's profile. Returns null if the session is invalid/expired. */
export async function fetchProfile(): Promise<Customer | null> {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  if (res.status === 401) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  const json = await res.json();
  return json.customer ?? null;
}

export async function updateProfile(
  data: ProfileUpdatePayload,
): Promise<Customer> {
  const payload: BackendProfileUpdate = {};
  if (data.name !== undefined) payload.fullName = data.name;
  if (data.email !== undefined) payload.email = data.email;
  if (data.language !== undefined) payload.preferredLanguage = data.language;

  const raw = await authFetch<Record<string, unknown>>('/customers/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return {
    id: raw.id as string,
    phone: raw.phone as string,
    name: (raw.fullName as string | null) ?? null,
    email: (raw.email as string | null) ?? null,
    language: (raw.preferredLanguage as string | null) ?? null,
    kycStatus: (raw.kycStatus as string | null) ?? null,
  };
}
