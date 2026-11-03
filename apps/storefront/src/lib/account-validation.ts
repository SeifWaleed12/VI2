import { isValidEgyptPhone, normalizeEgyptPhone } from "@/app/[locale]/checkout/checkout-details";
import type { AccountKey } from "./account-copy";

// What each account form field accepts. Each rule returns the message to show
// under the field, or nothing when the value is fine.

export type Errors<F extends string> = Partial<Record<F, AccountKey>>;

// Egyptian mobile: 11 digits starting 010, 011, 012 or 015; +20 / 0020 and
// spaces, dashes or brackets are accepted (as at checkout).
function phoneError(value: string, required: boolean): AccountKey | undefined {
  if (!value.trim()) return required ? "phoneRequired" : undefined;
  return isValidEgyptPhone(normalizeEgyptPhone(value)) ? undefined : "invalidPhone";
}

export type AddressField = "address_name" | "name" | "phone" | "governorate" | "area" | "street";
export function addressErrors(values: Record<AddressField, string>): Errors<AddressField> {
  const errors: Errors<AddressField> = {};
  if (!values.name.trim()) errors.name = "nameRequired";
  const phone = phoneError(values.phone, true);
  if (phone) errors.phone = phone;
  if (!values.governorate.trim()) errors.governorate = "governorateRequired";
  if (!values.area.trim()) errors.area = "areaRequired";
  if (!values.street.trim()) errors.street = "streetRequired";
  return errors;
}

export type ProfileField = "first_name" | "last_name" | "phone";
export function profileErrors(values: Partial<Record<ProfileField, string>>): Errors<ProfileField> {
  const errors: Errors<ProfileField> = {};
  if (values.first_name !== undefined && !values.first_name.trim()) errors.first_name = "firstNameRequired";
  const phone = values.phone === undefined ? undefined : phoneError(values.phone, false);
  if (phone) errors.phone = phone;
  return errors;
}

export type EmailField = "email" | "password";
export function emailChangeErrors(values: Record<EmailField, string>): Errors<EmailField> {
  const errors: Errors<EmailField> = {};
  const email = values.email.trim();
  if (!email) errors.email = "emailRequired";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "emailFormat";
  if (!values.password) errors.password = "currentPasswordRequired";
  return errors;
}
