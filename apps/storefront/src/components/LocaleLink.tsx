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
  return <Link {...props} href={href} />;
}
