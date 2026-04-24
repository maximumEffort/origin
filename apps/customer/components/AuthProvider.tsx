'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type Customer,
  getAccessToken,
  setTokens,
  clearTokens,
  fetchProfile,
} from '@/lib/auth';

interface AuthContextValue {
  /** Current customer, or null if not logged in */
  customer: Customer | null;
  /** True while restoring session on mount */
  loading: boolean;
  /** Store tokens after OTP verification and set customer */
  login: (accessToken: string, refreshToken: string, customer: Customer) => void;
  /** Clear tokens and customer */
  logout: () => void;
  /** Re-fetch profile from API (e.g. after profile update) */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  customer: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchProfile()
      .then(setCustomer)
      .catch(() => {
        clearTokens();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    (accessToken: string, refreshToken: string, cust: Customer) => {
      setTokens(accessToken, refreshToken);
      setCustomer(cust);
    },
    [],
  );

  const logout = useCallback(() => {
    clearTokens();
    setCustomer(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const updated = await fetchProfile();
      setCustomer(updated);
    } catch {
      // token may have expired
      clearTokens();
      setCustomer(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ customer, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
