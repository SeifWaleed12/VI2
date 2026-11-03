import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { accountMessage } from "@/lib/account-copy";
import ConfirmEmail from "./ConfirmEmail";

type Props = { params: Promise<{ locale: string }> };

// The link in the email-change message opens this page. No referrer, so the
// token in the address is never sent to another site.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return { title: `${accountMessage(locale, "confirmEmailTitle")} | Vi2`, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ConfirmEmail locale={locale} />;
}
