"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,

  type ReactNode,
} from "react";

import { usePathname } from "next/navigation";
import { localizedHref, type Locale, message } from "@/lib/i18n";
import { serviceMessage } from "@/lib/service-messages";
type Language = Locale;

type LanguageContextValue = {
  language: Language;
  isArabic: boolean;
  setLanguage: (language: Language) => void;
  // For text that arrives as English at runtime: service messages and product
  // badges. Text written in the storefront uses msg() with a key.
  t: <T>(value: T) => T;
  msg: (key: Parameters<typeof message>[1]) => string;
};

const STORAGE_KEY = "vi2-language";
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children, locale = "en" }: { children: ReactNode; locale?: Locale }) {
  const language = locale;
  const pathname = usePathname();
  const setLanguage = useCallback((next: Locale) => {
    document.cookie = `vi2-language=${next};path=/;max-age=31536000;SameSite=Lax`;
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* The URL remains authoritative. */ }
    // Reload the shared root layout so navigation and html direction arrive in the new locale from the server.
    window.location.assign(localizedHref(`${pathname}${window.location.search}${window.location.hash}`, next));
  }, [pathname]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.body.dataset.locale = language;

  }, [language]);

  const t = useCallback(
    <T,>(value: T): T => (language === "ar" && typeof value === "string" ? serviceMessage(value) as T : value),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      isArabic: language === "ar",
      setLanguage,
      msg: (key: Parameters<typeof message>[1]) => message(language, key),
      t,
    }),
    [language, t, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
