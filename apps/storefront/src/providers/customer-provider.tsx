"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Customer,
  LoginCredentials,
  RegisterCredentials,
} from "@/types/customer";
import {
  getCustomer,
  loginCustomer,
  registerCustomer,
  logoutCustomer,
} from "@/lib/medusa/services/customer";

export type CustomerContextValue = {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean; // Alias for backward compatibility
  login: (
    credentials: LoginCredentials,
  ) => Promise<{ ok: true; customer: Customer } | { ok: false; message: string }>;
  signIn: (
    credentials: LoginCredentials,
  ) => Promise<{ ok: true; customer: Customer } | { ok: false; message: string }>; // Alias
  register: (
    credentials: RegisterCredentials,
  ) => Promise<{ ok: true; customer: Customer } | { ok: false; message: string }>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>; // Alias
  refreshCustomer: () => Promise<void>;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshCustomer = useCallback(async () => {
    try {
      // SDK requests /store/customers/me with session cookie credentials
      const current = await getCustomer();
      setCustomer(current);
    } catch {
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCustomer();

    const handleAuthChange = () => {
      refreshCustomer();
    };

    window.addEventListener("vi2-auth-change", handleAuthChange);
    return () => {
      window.removeEventListener("vi2-auth-change", handleAuthChange);
    };
  }, [refreshCustomer]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true);
      const res = await loginCustomer(credentials);
      if (res.ok) {
        setCustomer(res.customer);
      }
      setIsLoading(false);
      return res;
    },
    [],
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      setIsLoading(true);
      const res = await registerCustomer(credentials);
      if (res.ok) {
        setCustomer(res.customer);
      }
      setIsLoading(false);
      return res;
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutCustomer();
    setCustomer(null);
  }, []);

  const value = useMemo<CustomerContextValue>(
    () => ({
      customer,
      isAuthenticated: Boolean(customer),
      isLoading,
      loading: isLoading,
      login,
      signIn: login,
      register,
      logout,
      signOut: logout,
      refreshCustomer,
    }),
    [customer, isLoading, login, register, logout, refreshCustomer],
  );

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer(): CustomerContextValue {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error("useCustomer must be used within a CustomerProvider");
  }
  return context;
}

// Backward-compatible alias
export const useAuth = useCustomer;
export const AuthProvider = CustomerProvider;
