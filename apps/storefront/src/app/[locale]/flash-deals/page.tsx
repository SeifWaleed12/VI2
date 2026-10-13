import { redirect } from "next/navigation"
import { localizedHref, isLocale } from "@/lib/i18n"
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(localizedHref("/deals",isLocale(locale) ? locale : "en"))
}
