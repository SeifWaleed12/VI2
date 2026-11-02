"use client";

import { useLanguage } from "@/context/LanguageContext";

// Switches the storefront between English and Arabic.
export default function LocaleToggle() {
  const { msg, isArabic, setLanguage } = useLanguage();
  return (
    <button
      type="button"
      translate="no"
      data-no-translate
      aria-label={msg(isArabic ? "nav.switchEnglish" : "nav.switchArabic")}
      onClick={() => setLanguage(isArabic ? "en" : "ar")}
    >
      {isArabic ? "ENG" : "AR"}
    </button>
  );
}
