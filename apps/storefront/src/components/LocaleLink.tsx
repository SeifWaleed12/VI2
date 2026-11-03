"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { localizedHref } from "@/lib/i18n";
export default function LocaleLink(props: ComponentProps<typeof Link>) {
  const { language } = useLanguage();
  const href =
    typeof props.href === "string"
      ? localizedHref(props.href, language)
      : props.href;
  const pathname = typeof href === "string" ? href.split(/[?#]/, 1)[0] : href.pathname ?? "";
  // shortcut: avoid stale query metadata in Next 16.3.3; remove after an upgrade passes production navigation checks.
  const catalogLink = /^\/(?:en|ar)\/shop(?:\/|$)/.test(pathname);
  return <Link {...props} href={href} prefetch={catalogLink ? false : props.prefetch} />;
}
