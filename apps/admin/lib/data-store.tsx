'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { api } from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  category: string;
  fuel: 'petrol' | 'electric' | 'hybrid' | 'diesel';
  colour: string;
  seats: number;
  monthlyAed: number;
  dailyAed: number;
  depositAed: number;
  mileage: number;
  status: 'AVAILABLE' | 'LEASED' | 'MAINTENANCE' | 'RETIRED';
  insuranceExpiry: string;
  rtaExpiry: string;
  imageUrl?: string;
  features: string[];
  priceAed: number;
  leaseMonthlyAed: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  nationality: string;
  kycStatus: 'APPROVED' | 'PENDING' | 'SUBMITTED' | 'REJECTED';
  activeLeases: number;
  joinedDate: string;
  docs: {
    emirates_id: 'APPROVED' | 'PENDING' | 'REJECTED';
    driving_licence: 'APPROVED' | 'PENDING' | 'REJECTED';
    visa: 'APPROVED' | 'PENDING' | 'REJECTED';
    passport: 'APPROVED' | 'PENDING' | 'REJECTED';
  };
}

export interface Booking {
  id: string;
  ref: string;
  customerId: string;
  customer: string;
  phone: string;
  vehicleId: string;
  vehicle: string;
  start: string;
  end: string;
  totalAed: number;
  depositAed: number;
  kycStatus: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
}

export interface Lease {
  id: string;
  ref: string;
  customerId: string;
  customer: string;
  vehicleId: string;
  vehicle: string;
  plate: string;
  start: string;
  end: string;
  monthlyAed: number;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
  daysLeft: number;
  nextPayment: { due: string; amount: number; status: 'PENDING' | 'OVERDUE' | 'PAID' } | null;
}

// ── Paginated response envelope (issue #115) ──────────────────────────────

export interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number };
}

function emptyPage<T>(): Paginated<T> {
  return { data: [], pagination: { page: 1, limit: 0, total: 0 } };
}

// ── API response types ───────────────────────────────────────────────────

interface ApiVehicle {
  id: string; brand: string; model: string; year: number;
  plateNumber?: string; colour: string; seats: number; fuelType?: string;
  transmission?: string; status: string; monthlyRateAed: number;
  dailyRateAed?: number; mileageLimitMonthly?: number;
  depositAmountAed?: number | null;
  notes?: string | null;
  priceAed?: number | null;
  leaseMonthlyAed?: number | null;
  insuranceExpiry?: string | null;
  rtaRegistrationExpiry?: string | null;
  category?: { nameEn: string } | null;
  images?: { url: string; isPrimary: boolean }[];
  _count?: { bookings: number; leases: number };
}

interface ApiBooking {
  id: string; reference: string; status: string;
  startDate: string; endDate: string;
  grandTotalAed: number; depositAmountAed: number;
  customer: { id?: string; fullName: string; phone: string; kycStatus: string };
  vehicle: { id?: string; brand: string; model: string; year: number; plateNumber?: string };
}

interface ApiCustomer {
  id: string; fullName: string; phone: string; email: string;
  nationality?: string; kycStatus: string; createdAt: string;
  documents?: { type: string; status: string }[];
  _count?: { bookings: number; leases: number };
}

interface ApiLease {
  id: string; reference: string; status: string;
  startDate: string; endDate: string; monthlyRateAed: number;
  customer?: { fullName: string; phone: string };
  vehicle: { brand: string; model: string; year: number; plateNumber?: string };
  payments?: { dueDate: string; totalAed: number; status: string }[];
}

// ── Mappers: API → local types ───────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch { return iso; }
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function mapVehicle(v: ApiVehicle): Vehicle {
  return {
    id: v.id, brand: v.brand, model: v.model, year: v.year,
    plate: v.plateNumber ?? '', colour: v.colour, seats: v.seats,
    category: v.category?.nameEn ?? '', fuel: (v.fuelType?.toLowerCase() ?? 'petrol') as Vehicle['fuel'],
    monthlyAed: v.monthlyRateAed, dailyAed: v.dailyRateAed ?? 0,
    depositAed: Number(v.depositAmountAed ?? 0),
    mileage: v.mileageLimitMonthly ?? 0,
    status: v.status as Vehicle['status'],
    insuranceExpiry: v.insuranceExpiry ? fmtDate(v.insuranceExpiry) : '',
    rtaExpiry: v.rtaRegistrationExpiry ? fmtDate(v.rtaRegistrationExpiry) : '',
    imageUrl: v.images?.find(i => i.isPrimary)?.url ?? v.images?.[0]?.url,
    features: v.notes ? v.notes.split(',').map(f => f.trim()).filter(Boolean) : [],
    priceAed: Number(v.priceAed ?? 0),
    leaseMonthlyAed: Number(v.leaseMonthlyAed ?? 0),
  };
}

function mapBooking(b: ApiBooking): Booking {
  return {
    id: b.id, ref: b.reference,
    customerId: b.customer.id ?? '', customer: b.customer.fullName,
    phone: b.customer.phone,
    vehicleId: b.vehicle.id ?? '',
    vehicle: `${b.vehicle.brand} ${b.vehicle.model}`,
    start: fmtDate(b.startDate), end: fmtDate(b.endDate),
    totalAed: b.grandTotalAed, depositAed: b.depositAmountAed,
    kycStatus: b.customer.kycStatus,
    status: b.status as Booking['status'],
  };
}

function mapCustomer(c: ApiCustomer): Customer {
  const docs: Customer['docs'] = { emirates_id: 'PENDING', driving_licence: 'PENDING', visa: 'PENDING', passport: 'PENDING' };
  if (c.documents) {
    for (const d of c.documents) {
      const key = d.type.toLowerCase().replace(' ', '_') as keyof Customer['docs'];
      if (key in docs) docs[key] = d.status as 'APPROVED' | 'PENDING' | 'REJECTED';
    }
  }
  return {
    id: c.id, name: c.fullName ?? '', phone: c.phone ?? '', email: c.email ?? '',
    nationality: c.nationality ?? '',
    kycStatus: c.kycStatus as Customer['kycStatus'],
    activeLeases: c._count?.leases ?? 0,
    joinedDate: fmtDate(c.createdAt), docs,
  };
}

function mapLease(l: ApiLease): Lease {
  const pending = l.payments
    ?.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return {
    id: l.id, ref: l.reference,
    customerId: '', customer: l.customer?.fullName ?? '',
    vehicleId: '',
    vehicle: `${l.vehicle.brand} ${l.vehicle.model}`,
    plate: l.vehicle.plateNumber ?? '',
    start: fmtDate(l.startDate), end: fmtDate(l.endDate),
    monthlyAed: l.monthlyRateAed,
    status: l.status as Lease['status'],
    daysLeft: daysUntil(l.endDate),
    nextPayment: pending ? {
      due: fmtDate(pending.dueDate),
      amount: pending.totalAed,
      status: pending.status as 'PENDING' | 'OVERDUE' | 'PAID',
    } : null,
  };
}

// ── Context ────────────────────────────────────────────────────────────────

interface DataStore {
  vehicles: Vehicle[];
  addVehicle: (v: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, v: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  customers: Customer[];
  addCustomer: (c: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  bookings: Booking[];
  approveBooking: (id: string) => void;
  rejectBooking: (id: string) => void;
  addBooking: (b: Omit<Booking, 'id' | 'ref'>) => void;
  leases: Lease[];
  addLease: (l: Omit<Lease, 'id' | 'ref'>) => void;
  updateLease: (id: string, l: Partial<Lease>) => void;
  markPayment: (leaseId: string, status: 'PAID' | 'OVERDUE') => void;
  loading: boolean;
  error: string;
  refresh: () => void;
}

const DataContext = createContext<DataStore | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const PAGE_SIZE = 200; // upper bound enforced by backend
      const [vRes, bRes, cRes, lRes] = await Promise.all([
        api.get<Paginated<ApiVehicle>>(`/admin/vehicles?page=1&limit=${PAGE_SIZE}`).catch(emptyPage<ApiVehicle>),
        api.get<Paginated<ApiBooking>>(`/admin/bookings?page=1&limit=${PAGE_SIZE}`).catch(emptyPage<ApiBooking>),
        api.get<Paginated<ApiCustomer>>(`/admin/customers?page=1&limit=${PAGE_SIZE}`).catch(emptyPage<ApiCustomer>),
        api.get<Paginated<ApiLease>>(`/admin/leases?page=1&limit=${PAGE_SIZE}`).catch(emptyPage<ApiLease>),
      ]);
      setVehicles(vRes.data.map(mapVehicle));
      setBookings(bRes.data.map(mapBooking));
      setCustomers(cRes.data.map(mapCustomer));
      setLeases(lRes.data.map(mapLease));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Vehicle CRUD (API + optimistic update) ──
  const addVehicle = useCallback(async (v: Omit<Vehicle, 'id'>) => {
    try {
      const created = await api.post<ApiVehicle>('/admin/vehicles', {
        brand: v.brand, model: v.model, year: v.year, colour: v.colour,
        plateNumber: v.plate, seats: v.seats, monthlyRateAed: v.monthlyAed,
        dailyRateAed: v.dailyAed, mileageLimitMonthly: v.mileage,
        depositAmountAed: v.depositAed || undefined,
        fuelType: v.fuel.toUpperCase(),
        notes: v.features.length > 0 ? v.features.join(', ') : undefined,
        priceAed: v.priceAed || undefined,
        leaseMonthlyAed: v.leaseMonthlyAed || undefined,
        insuranceExpiry: v.insuranceExpiry || undefined,
        rtaRegistrationExpiry: v.rtaExpiry || undefined,
      });
      setVehicles(prev => [...prev, mapVehicle(created)]);
      fetchAll();
    } catch (err) {
      console.error('Add vehicle failed:', err);
      throw err;
    }
  }, [fetchAll]);

  const updateVehicle = useCallback(async (id: string, patch: Partial<Vehicle>) => {
    // Optimistic update
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));
    try {
      // Use dedicated status endpoint for status changes
      if (patch.status) {
        await api.post(`/admin/vehicles/${id}/status`, { status: patch.status });
      }

      // Build patch for other fields
      const apiPatch: Record<string, unknown> = {};
      if (patch.colour !== undefined) apiPatch.colour = patch.colour;
      if (patch.plate !== undefined) apiPatch.plateNumber = patch.plate;
      if (patch.monthlyAed !== undefined) apiPatch.monthlyRateAed = patch.monthlyAed;
      if (patch.dailyAed !== undefined) apiPatch.dailyRateAed = patch.dailyAed;
      if (patch.depositAed !== undefined) apiPatch.depositAmountAed = patch.depositAed;
      if (patch.mileage !== undefined) apiPatch.mileageLimitMonthly = patch.mileage;
      if (patch.features !== undefined) apiPatch.notes = patch.features.join(', ');
      if (patch.brand !== undefined) apiPatch.brand = patch.brand;
      if (patch.model !== undefined) apiPatch.model = patch.model;
      if (patch.year !== undefined) apiPatch.year = patch.year;
      if (patch.seats !== undefined) apiPatch.seats = patch.seats;
      if (patch.fuel !== undefined) apiPatch.fuelType = patch.fuel.toUpperCase();
      if (patch.priceAed !== undefined) apiPatch.priceAed = patch.priceAed;
      if (patch.leaseMonthlyAed !== undefined) apiPatch.leaseMonthlyAed = patch.leaseMonthlyAed;
      if (patch.insuranceExpiry !== undefined) apiPatch.insuranceExpiry = patch.insuranceExpiry;
      if (patch.rtaExpiry !== undefined) apiPatch.rtaRegistrationExpiry = patch.rtaExpiry;

      // Only send PATCH if there are non-status fields to update
      if (Object.keys(apiPatch).length > 0) {
        await api.patch(`/admin/vehicles/${id}`, apiPatch);
      }
    } catch (err) {
      console.error('Update vehicle failed:', err);
      fetchAll(); // Revert on failure
    }
  }, [fetchAll]);

  const deleteVehicle = useCallback((id: string) => {
    // No delete endpoint on backend — just remove from local state
    setVehicles(prev => prev.filter(v => v.id !== id));
  }, []);

  // ── Customer CRUD ──
  const addCustomer = useCallback((c: Omit<Customer, 'id'>) => {
    const id = `local_${Date.now()}`;
    setCustomers(prev => [...prev, { ...c, id }]);
  }, []);

  const updateCustomer = useCallback(async (id: string, patch: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    if (patch.kycStatus === 'APPROVED') {
      try { await api.post(`/admin/customers/${id}/kyc/approve`); } catch (err) {
        fetchAll(); throw err;
      }
    } else if (patch.kycStatus === 'REJECTED') {
      try { await api.post(`/admin/customers/${id}/kyc/reject`, { reason: 'Rejected by admin' }); } catch (err) {
        fetchAll(); throw err;
      }
    }
  }, [fetchAll]);

  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Booking actions (API) ──
  const addBooking = useCallback((b: Omit<Booking, 'id' | 'ref'>) => {
    const id = `local_${Date.now()}`;
    const ref = `BK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
    setBookings(prev => [...prev, { ...b, id, ref }]);
  }, []);

  const approveBooking = useCallback(async (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'APPROVED' as const } : b));
    try {
      await api.post(`/admin/bookings/${id}/approve`);
    } catch (err) {
      console.error('Approve booking failed:', err);
      fetchAll();
    }
  }, [fetchAll]);

  const rejectBooking = useCallback(async (id: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'REJECTED' as const } : b));
    try {
      await api.post(`/admin/bookings/${id}/reject`, { reason: 'Rejected by admin' });
    } catch (err) {
      console.error('Reject booking failed:', err);
      fetchAll();
    }
  }, [fetchAll]);

  // ── Lease actions ──
  const addLease = useCallback((l: Omit<Lease, 'id' | 'ref'>) => {
    const id = `local_${Date.now()}`;
    const ref = `LS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
    setLeases(prev => [...prev, { ...l, id, ref }]);
  }, []);

  const updateLease = useCallback((id: string, patch: Partial<Lease>) => {
    setLeases(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }, []);

  const markPayment = useCallback((leaseId: string, status: 'PAID' | 'OVERDUE') => {
    setLeases(prev => prev.map(l => {
      if (l.id !== leaseId || !l.nextPayment) return l;
      return { ...l, nextPayment: { ...l.nextPayment, status } };
    }));
  }, []);

  return (
    <DataContext.Provider value={{
      vehicles, addVehicle, updateVehicle, deleteVehicle,
      customers, addCustomer, updateCustomer, deleteCustomer,
      bookings, addBooking, approveBooking, rejectBooking,
      leases, addLease, updateLease, markPayment,
      loading, error, refresh: fetchAll,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
