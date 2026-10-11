"use client";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { localizedHref } from "@/lib/i18n";
export function useLocaleRouter() {
  const router = useRouter();
  const { language } = useLanguage();
  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) =>
      router.push(localizedHref(href, language), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
      router.replace(localizedHref(href, language), options),
  }), [router, language]);
}
