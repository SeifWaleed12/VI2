import { accountMessage } from "./account-copy";
import type { Locale } from "./i18n";

export function accountDate(value: string, locale: Locale) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
        dateStyle: "medium",
        timeZone: "Africa/Cairo",
      }).format(date)
    : accountMessage(locale, "dateUnavailable");
}
export function accountAmount(value: number, currency: string, locale: Locale) {
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return String(value) + " " + currency;
  }
}
