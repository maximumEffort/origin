/**
 * Admin API client.
 *
 * All backend API calls go through /api/backend/... proxy route,
 * which reads the JWT from an httpOnly cookie. This ensures the
 * backend token is never exposed to client-side JavaScript.
 */

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message ?? error?.error?.code ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

// ── Admin Auth ────────────────────────────────────────────────────────────────

export interface AdminLoginResponse {
  ok: boolean;
  admin: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message ?? 'Invalid email or password');
  }
  return res.json();
}

export function clearToken() {
  // Token is now in httpOnly cookie — cleared by /api/auth/logout
  fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
}
