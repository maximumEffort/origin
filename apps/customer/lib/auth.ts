/**
 * Auth helpers for Origin Car Leasing customer authentication.
 *
 * Uses localStorage for token persistence and exposes helpers
 * consumed by the AuthProvider context.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://car-leasing-business-production.up.railway.app/v1';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  language: string | null;
  kycStatus: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OtpSendResponse {
  message: string;
}

export interface OtpVerifyResponse {
  access_token: string;
  refresh_token: string;
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

// ── Token storage ────────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'origin_access_token';
const REFRESH_TOKEN_KEY = 'origin_refresh_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ── Authenticated fetch ──────────────────────────────────────────────────────

export async function authFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getAccessToken();
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

// ── Auth API calls ───────────────────────────────────────────────────────────

export async function sendOtp(phone: string): Promise<OtpSendResponse> {
  const url = `${API_BASE}/auth/otp/send`;
  const res = await fetch(url, {
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
  const url = `${API_BASE}/auth/otp/verify`;
  const res = await fetch(url, {
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

// ── Customer profile ─────────────────────────────────────────────────────────

export async function fetchProfile(): Promise<Customer> {
  // Backend returns fullName; frontend uses name
  const raw = await authFetch<Record<string, unknown>>('/customers/me');
  return {
    id: raw.id as string,
    phone: raw.phone as string,
    name: (raw.fullName as string | null) ?? null,
    email: (raw.email as string | null) ?? null,
    language: (raw.preferredLanguage as string | null) ?? null,
    kycStatus: (raw.kycStatus as string | null) ?? null,
  };
}

export async function updateProfile(
  data: ProfileUpdatePayload,
): Promise<Customer> {
  // Map frontend field names to backend field names
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
