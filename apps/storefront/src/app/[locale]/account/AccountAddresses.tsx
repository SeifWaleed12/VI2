"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { accountMessage, type AccountKey } from "@/lib/account-copy";
import { addressErrors, type AddressField, type Errors } from "@/lib/account-validation";
import type { Locale } from "@/lib/i18n";
import { deleteAddress, listAddresses, saveAddress, type SavedAddress } from "@/lib/medusa";
import { normalizeEgyptPhone } from "@/app/[locale]/checkout/checkout-details";
import { AccountField, focusFirstError } from "./AccountField";
import GovernorateSelect, { governorateLabel } from "./GovernorateSelect";
import styles from "./Account.module.css";

type Notice = { key: AccountKey; ok: boolean } | null;
const FIELDS: readonly AddressField[] = ["address_name", "name", "phone", "governorate", "area", "street"];

// Saved delivery addresses (Egypt only). Fields match checkout: the
// governorate is the city, the area is address_2, the street address_1.
export default function AccountAddresses({ locale }: { locale: Locale }) {
  const { customer, isAuthenticated } = useAuth();
  const customerId = isAuthenticated ? customer?.id : undefined;
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ owner: string; attempt: number; addresses: SavedAddress[] | null } | null>(null);
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [errors, setErrors] = useState<Errors<AddressField>>({});
  const msg = (key: AccountKey) => accountMessage(locale, key);

  useEffect(() => {
    if (!customerId) return;
    let active = true;
    listAddresses().then((result) => {
      if (active) setLoaded({ owner: customerId, attempt, addresses: result.ok ? result.addresses : null });
    });
    return () => {
      active = false;
    };
  }, [customerId, attempt]);

  if (!customerId) return null;
  const ready = loaded && loaded.owner === customerId && loaded.attempt === attempt;

  function open(address: SavedAddress | "new") {
    setNotice(null);
    setErrors({});
    setEditing(address);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !editing) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const values = Object.fromEntries(FIELDS.map((field) => [field, String(data.get(field) ?? "")])) as Record<AddressField, string>;
    const found = addressErrors(values);
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length) return focusFirstError(form, found, FIELDS);
    const [firstName, ...rest] = values.name.trim().split(/\s+/);
    setBusy(true);
    const result = await saveAddress({
      address_name: values.address_name.trim() || null,
      first_name: firstName,
      last_name: rest.join(" "),
      phone: normalizeEgyptPhone(values.phone.trim()),
      city: values.governorate,
      address_2: values.area.trim(),
      address_1: values.street.trim(),
    }, editing === "new" ? undefined : editing.id);
    setBusy(false);
    if (!result.ok) return setNotice({ key: "saveFailed", ok: false });
    setEditing(null);
    setNotice({ key: "addressSaved", ok: true });
    setAttempt((value) => value + 1);
  }

  async function remove(address: SavedAddress) {
    if (busy || !window.confirm(`${msg("deleteAddress")}?`)) return;
    setBusy(true);
    setNotice(null);
    const result = await deleteAddress(address.id);
    setBusy(false);
    setNotice(result.ok ? { key: "addressDeleted", ok: true } : { key: "saveFailed", ok: false });
    if (result.ok) setAttempt((value) => value + 1);
  }

  // A field's error clears as soon as it is changed.
  const clearError = (name: string) => setErrors((current) => (name in current ? { ...current, [name]: undefined } : current));
  const current = editing && editing !== "new" ? editing : null;
  return (
    <section className={styles.informationRow} aria-labelledby="saved-addresses">
      <div className={styles.rowSummary}>
        <MapPin size={22} strokeWidth={1.5} aria-hidden="true" />
        <div>
          <h2 id="saved-addresses">{msg("addresses")}</h2>
          <p>{msg("addressesDescription")}</p>
        </div>
        {!editing && (
          <button type="button" className={styles.outlineButton} onClick={() => open("new")}>
            {msg("addAddress")}
          </button>
        )}
      </div>
      {!ready ? (
        <p className={styles.notice} role="status">{msg("addressesLoading")}</p>
      ) : loaded.addresses === null ? (
        <p className={styles.notice} role="alert">
          {msg("addressesError")}{" "}
          <button type="button" className={styles.textButton} onClick={() => setAttempt((value) => value + 1)}>{msg("retry")}</button>
        </p>
      ) : loaded.addresses.length === 0 && !editing ? (
        <p className={styles.notice}>{msg("addressesEmpty")}</p>
      ) : (
        <ul className={styles.items}>
          {loaded.addresses.map((address) => (
            <li key={address.id}>
              <p>
                {address.address_name && <strong><bdi>{address.address_name}</bdi><br /></strong>}
                <bdi>{[address.first_name, address.last_name].filter(Boolean).join(" ")}</bdi><br />
                <bdi>{[address.address_1, address.address_2, address.city && governorateLabel(address.city, locale)].filter(Boolean).join(locale === "ar" ? "، " : ", ")}</bdi><br />
                <bdi dir="ltr">{address.phone}</bdi>
              </p>
              <button type="button" className={styles.textButton} disabled={busy} onClick={() => open(address)}>{msg("editAddress")}</button>
              <button type="button" className={styles.textButton} disabled={busy} onClick={() => remove(address)}>{msg("deleteAddress")}</button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className={styles.editor}>
          {/* noValidate: the messages under each field replace the browser's. */}
          <form className={styles.form} onSubmit={submit} onInput={(event) => clearError((event.target as HTMLInputElement).name)} noValidate aria-busy={busy} key={current?.id ?? "new"}>
            <AccountField name="address_name" label="addressLabel" locale={locale} optional>
              {(props) => <input {...props} maxLength={100} defaultValue={current?.address_name ?? ""} disabled={busy} />}
            </AccountField>
            <AccountField name="name" label="name" locale={locale} error={errors.name}>
              {(props) => <input {...props} autoComplete="name" required maxLength={255} defaultValue={[current?.first_name, current?.last_name].filter(Boolean).join(" ")} disabled={busy} />}
            </AccountField>
            <AccountField name="phone" label="phone" locale={locale} error={errors.phone} hint="phoneHint">
              {(props) => <input {...props} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required maxLength={32} defaultValue={current?.phone ?? ""} disabled={busy} />}
            </AccountField>
            <AccountField name="governorate" label="governorate" locale={locale} error={errors.governorate}>
              {(props) => <GovernorateSelect {...props} locale={locale} value={current?.city ?? ""} placeholder={msg("chooseGovernorate")} disabled={busy} />}
            </AccountField>
            <AccountField name="area" label="area" locale={locale} error={errors.area}>
              {(props) => <input {...props} required maxLength={255} defaultValue={current?.address_2 ?? ""} disabled={busy} />}
            </AccountField>
            <AccountField name="street" label="street" locale={locale} error={errors.street}>
              {(props) => <input {...props} autoComplete="street-address" required maxLength={255} defaultValue={current?.address_1 ?? ""} disabled={busy} />}
            </AccountField>
            {notice && !notice.ok && <p role="alert" className={styles.fieldError}>{msg(notice.key)}</p>}
            <button type="submit" className={styles.darkButton} disabled={busy}>{msg(busy ? "saving" : "save")}</button>
          </form>
          <button type="button" className={styles.textButton} onClick={() => setEditing(null)}>{msg("cancel")}</button>
        </div>
      )}
      {notice && (notice.ok || !editing) && <p role={notice.ok ? "status" : "alert"} className={styles.notice}>{msg(notice.key)}</p>}
    </section>
  );
}
