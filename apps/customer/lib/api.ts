/**
 * API client for the Origin backend (Shanghai Car Rental LLC — rental V1).
 *
 * Uses NEXT_PUBLIC_API_URL env var (set in Vercel for prod/preview, .env.local for dev).
 * Code-side fallback is the Azure Container App FQDN, so the app still works if the
 * env var is somehow unset; production env should be `https://api.origin-auto.ae/v1`.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://ca-origin-backend-prod.proudriver-25bede2a.uaenorth.azurecontainerapps.io/v1';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VehicleImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface VehicleCategory {
  id: string;
  nameEn: string;
  nameAr: string;
  nameZh: string;
  icon: string | null;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: VehicleCategory | null;
  fuelType: string;
  transmission: string;
  colour: string;
  seats: number;
  status: string;
  monthlyRateAed: number;
  dailyRateAed: number;
  mileageLimitMonthly: number;
  images: VehicleImage[];
  // Flattened convenience field from API
  primaryImageUrl?: string;
}

export interface VehiclesResponse {
  data: Vehicle[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface QuoteRequest {
  vehicle_id: string;
  start_date: string;
  end_date: string;
  mileage_package: number;
  add_ons: string[];
}

export interface MonthlyBreakdown {
  month: number;
  amount_aed: number;
  vat_aed: number;
  total_aed: number;
}

export interface QuoteResponse {
  duration_days: number;
  subtotal_aed: number;
  vat_rate: number;
  vat_amount_aed: number;
  total_aed: number;
  deposit_aed: number;
  monthly_breakdown: MonthlyBreakdown[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    // Revalidate every 60s for ISR-friendly caching
    next: { revalidate: 60 },
  } as RequestInit);

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} — ${url}`);
  }
  return res.json();
}

// ── Vehicle endpoints ────────────────────────────────────────────────────────

export async function fetchVehicles(
  filters: {
    brand?: string;
    category?: string;
    fuel_type?: string;
    min_price?: number;
    max_price?: number;
    page?: number;
    limit?: number;
  } = {},
): Promise<VehiclesResponse> {
  const params = new URLSearchParams();
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.category) params.set('category', filters.category);
  if (filters.fuel_type) params.set('fuel_type', filters.fuel_type);
  if (filters.min_price !== undefined) params.set('min_price', String(filters.min_price));
  if (filters.max_price !== undefined) params.set('max_price', String(filters.max_price));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return apiFetch<VehiclesResponse>(`/vehicles${qs ? `?${qs}` : ''}`);
}

export async function fetchVehicle(id: string): Promise<Vehicle> {
  return apiFetch<Vehicle>(`/vehicles/${id}`);
}

// ── Calculator endpoints ─────────────────────────────────────────────────────

export async function fetchQuote(body: QuoteRequest): Promise<QuoteResponse> {
  return apiFetch<QuoteResponse>('/calculator/quote', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Contact endpoints ─────────────────────────────────────────────────────────

export interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export interface ContactResponse {
  id: string;
  received: boolean;
}

export async function submitContact(body: ContactRequest): Promise<ContactResponse> {
  return apiFetch<ContactResponse>('/contact', {
    method: 'POST',
    body: JSON.stringify(body),
    cache: 'no-store',
  });
}
