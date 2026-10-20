"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { accountMessage } from "@/lib/account-copy";
import type { Locale } from "@/lib/i18n";
import { deleteAddress, listAddresses, saveAddress, type SavedAddress } from "@/lib/medusa";
import { isValidEgyptPhone, normalizeEgyptPhone } from "@/app/[locale]/checkout/checkout-details";
import GovernorateSelect, { governorateLabel } from "./GovernorateSelect";
import styles from "./Account.module.css";

type Key = Parameters<typeof accountMessage>[1];
type Notice = { key: Key; ok: boolean } | null;
const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

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
  const msg = (key: Key) => accountMessage(locale, key);

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !editing) return;
    const data = new FormData(event.currentTarget);
    const [firstName, ...rest] = text(data, "name").split(/\s+/);
    const phone = normalizeEgyptPhone(text(data, "phone"));
    const address = {
      address_name: text(data, "address_name") || null,
      first_name: firstName,
      last_name: rest.join(" "),
      phone,
      city: text(data, "governorate"),
      address_2: text(data, "area"),
      address_1: text(data, "street"),
    };
    if (!firstName || !address.city || !address.address_2 || !address.address_1 || !phone) return setNotice({ key: "addressRequired", ok: false });
    if (!isValidEgyptPhone(phone)) return setNotice({ key: "invalidPhone", ok: false });
    setBusy(true);
    setNotice(null);
    const result = await saveAddress(address, editing === "new" ? undefined : editing.id);
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
          <button type="button" className={styles.outlineButton} onClick={() => { setNotice(null); setEditing("new"); }}>
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
              <button type="button" className={styles.textButton} disabled={busy} onClick={() => { setNotice(null); setEditing(address); }}>{msg("editAddress")}</button>
              <button type="button" className={styles.textButton} disabled={busy} onClick={() => remove(address)}>{msg("deleteAddress")}</button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <div className={styles.editor}>
          <form className={styles.form} onSubmit={submit} aria-busy={busy} key={current?.id ?? "new"}>
            <label>
              {msg("addressLabel")}
              <input name="address_name" maxLength={100} defaultValue={current?.address_name ?? ""} disabled={busy} />
            </label>
            <label>
              {msg("name")}
              <input name="name" autoComplete="name" required maxLength={255} defaultValue={[current?.first_name, current?.last_name].filter(Boolean).join(" ")} disabled={busy} />
            </label>
            <label>
              {msg("phone")}
              <input name="phone" type="tel" autoComplete="tel" dir="ltr" required maxLength={32} defaultValue={current?.phone ?? ""} disabled={busy} />
            </label>
            <label>
              {msg("governorate")}
              <GovernorateSelect locale={locale} value={current?.city ?? ""} placeholder={msg("chooseGovernorate")} disabled={busy} />
            </label>
            <label>
              {msg("area")}
              <input name="area" required maxLength={255} defaultValue={current?.address_2 ?? ""} disabled={busy} />
            </label>
            <label>
              {msg("street")}
              <input name="street" autoComplete="street-address" required maxLength={255} defaultValue={current?.address_1 ?? ""} disabled={busy} />
            </label>
            <button type="submit" className={styles.darkButton} disabled={busy}>{msg(busy ? "saving" : "save")}</button>
          </form>
          <button type="button" className={styles.textButton} onClick={() => setEditing(null)}>{msg("cancel")}</button>
        </div>
      )}
      {notice && <p role={notice.ok ? "status" : "alert"} className={styles.notice}>{msg(notice.key)}</p>}
    </section>
  );
}
