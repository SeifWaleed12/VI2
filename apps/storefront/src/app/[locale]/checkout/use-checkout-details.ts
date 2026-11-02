"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { governorates } from "@/lib/egypt-address";
import { listAddresses } from "@/lib/medusa";
import { saveDetails, savedDetails } from "@/lib/pending-checkout";
import { initialForm, type CheckoutForm } from "./checkout-details";

export function useCheckoutDetails() {
  const [form, setForm] = useState<CheckoutForm>(initialForm);
  // Saving starts only after the saved details are read, so the empty first
  // render never overwrites them.
  const [restored, setRestored] = useState(false);

  // Runs after hydration because sessionStorage is unavailable during server render.
  useEffect(() => {
    const saved = savedDetails(initialForm);
    /* eslint-disable react-hooks/set-state-in-effect -- browser storage exists only after hydration */
    if (saved) setForm(saved);
    setRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onSignedOut = () => setForm(initialForm);
    window.addEventListener("vi2-signed-out", onSignedOut);
    return () => window.removeEventListener("vi2-signed-out", onSignedOut);
  }, []);

  useEffect(() => {
    if (restored) saveDetails(form);
  }, [restored, form]);

  // A signed-in customer starts with their name, contact and first saved
  // address; only empty fields are filled, so nothing typed is replaced.
  const { customer } = useAuth();
  useEffect(() => {
    if (!restored || !customer) return;
    let active = true;
    const fill = (values: Partial<CheckoutForm>) => setForm((current) => ({
      ...current,
      ...Object.fromEntries(Object.entries(values).filter(([key, value]) => value && !current[key as keyof CheckoutForm])),
    }));
    fill({ name: `${customer.firstName} ${customer.lastName}`.trim(), email: customer.email, phone: customer.phone ?? "" });
    void listAddresses().then((result) => {
      const address = result.ok ? result.addresses[0] : undefined;
      if (!active || !address) return;
      fill({
        governorate: address.city && governorates.includes(address.city) ? address.city : "",
        area: address.address_2 ?? "", address: address.address_1 ?? "",
        phone: address.phone ?? "",
      });
    });
    return () => { active = false; };
  }, [restored, customer]);

  return { form, setField: (key: keyof CheckoutForm, value: string) => setForm((current) => ({ ...current, [key]: value })) };
}
