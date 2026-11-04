import { isValidEgyptPhone } from "@/lib/egypt-address";

// The checkout details form, its empty state and its checks.

export type CheckoutForm = {
  name: string;
  phone: string;
  email: string;
  governorate: string;
  area: string;
  address: string;
  notes: string;
};

export const initialForm: CheckoutForm = {
  name: "",
  phone: "",
  email: "",
  governorate: "",
  area: "",
  address: "",
  notes: "",
};

export type DetailsProblem = "empty_order" | "incomplete" | "bad_phone";

export function detailsProblem(form: CheckoutForm, itemCount: number): DetailsProblem | null {
  if (itemCount === 0) return "empty_order";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ||
    !form.name.trim() ||
    !form.phone.trim() ||
    !form.governorate.trim() ||
    !form.area.trim() ||
    !form.address.trim()
  ) return "incomplete";
  return isValidEgyptPhone(form.phone) ? null : "bad_phone";
}
