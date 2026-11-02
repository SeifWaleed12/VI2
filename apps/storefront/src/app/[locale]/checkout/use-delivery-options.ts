"use client";

import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { getShippingOptions } from "@/lib/medusa";
import type { ShippingOption } from "@/types/shipping";
import { deliveryStatus, type ShippingLoad } from "./delivery-status";

export function useDeliveryOptions() {
  const { cartId, loading: cartLoading, refreshCart } = useCart();
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [load, setLoad] = useState<ShippingLoad>("loading");

  const loadOptions = useCallback((id: string) => {
    setLoad("loading");
    getShippingOptions(id)
      .then((opts) => {
        setOptions(opts);
        if (opts.length > 0) setSelectedId((prev) => prev || opts[0].id);
        setLoad("loaded");
      })
      // An outage leaves no options; the order step then refuses to continue.
      .catch(() => {
        setOptions([]);
        setLoad("failed");
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads delivery options when the cart is known
    if (cartId) loadOptions(cartId);
  }, [cartId, loadOptions]);

  const status = deliveryStatus(cartId, cartLoading, load, options.length);
  return {
    options,
    selectedId,
    select: setSelectedId,
    selected: options.find((option) => option.id === selectedId),
    status,
    retry: () => (status === "failed" && cartId ? loadOptions(cartId) : void refreshCart()),
  };
}
