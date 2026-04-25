'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { type Customer, fetchProfile, logoutSession } from '@/lib/auth';

interface AuthContextValue {
  /** Current customer, or null if not logged in */
  customer: Customer | null;
  /** True while restoring session on mount */
  loading: boolean;
  /** Set customer state after successful OTP verification (cookies set server-side already). */
  login: (customer: Customer) => void;
  /** Clear server-side cookies + local customer state */
  logout: () => Promise<void>;
  /** Re-fetch profile from API (e.g. after profile update) */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  customer: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount via cookie-based GET /api/auth/me.
  useEffect(() => {
    fetchProfile()
      .then((c) => setCustomer(c))
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((c: Customer) => {
    setCustomer(c);
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setCustomer(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const updated = await fetchProfile();
      setCustomer(updated);
    } catch {
      setCustomer(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ customer, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
