"use client";

export {
  CustomerProvider as AuthProvider,
  useCustomer as useAuth,
  useCustomer,
  CustomerProvider,
  type CustomerContextValue as AuthContextValue,
} from "@/providers/customer-provider";
