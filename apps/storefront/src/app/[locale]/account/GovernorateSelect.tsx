import { governorates } from "@/app/[locale]/checkout/checkout-details";
import type { Locale } from "@/lib/i18n";

// The saved value stays the English name checkout uses; only the label changes.
const ARABIC: Record<string, string> = {
  Cairo: "القاهرة", Giza: "الجيزة", Alexandria: "الإسكندرية", Qalyubia: "القليوبية",
  Sharqia: "الشرقية", Dakahlia: "الدقهلية", Gharbia: "الغربية", Monufia: "المنوفية",
  Beheira: "البحيرة", Fayoum: "الفيوم", "Beni Suef": "بني سويف", Minya: "المنيا",
  Assiut: "أسيوط", Sohag: "سوهاج", Qena: "قنا", Luxor: "الأقصر", Aswan: "أسوان",
  "Red Sea": "البحر الأحمر", Suez: "السويس", Ismailia: "الإسماعيلية", "Port Said": "بورسعيد",
};

export const governorateLabel = (value: string, locale: Locale) => (locale === "ar" && ARABIC[value]) || value;

// A saved city that is not in the list (typed elsewhere, for example in Arabic)
// is kept as its own option, so editing another field never changes it.
export default function GovernorateSelect({ locale, value, placeholder, disabled }: { locale: Locale; value: string; placeholder: string; disabled?: boolean }) {
  const options = value && !governorates.includes(value) ? [value, ...governorates] : governorates;
  return (
    <select name="governorate" required defaultValue={value} disabled={disabled}>
      <option value="" disabled>{placeholder}</option>
      {options.map((governorate) => <option key={governorate} value={governorate}>{governorateLabel(governorate, locale)}</option>)}
    </select>
  );
}
