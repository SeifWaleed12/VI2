"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "@/types/product";
import type { Cart, CartPromotion } from "@/types/cart";
import { useRegion } from "./region-provider";
import {
  getCart,
  createCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  applyCartPromotion,
  promoFailure,
  promoOutcome,
  type PromoResult,
  removeCartPromotion,
} from "@/lib/medusa/services/cart";
import { cartQueue } from "@/lib/medusa/cart-queue";

export type CartItem = {
  id?: string;
  product: Product;
  quantity: number;
};

export type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  promotions: CartPromotion[];
  cartId: string | null;
  cart: Cart | null;
  isCartOpen: boolean;
  loading: boolean;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: Product, quantity?: number, options?: { quiet?: boolean }) => Promise<boolean>;
  removeItem: (productIdOrLineId: string) => Promise<void>;
  updateQuantity: (
    productIdOrLineId: string,
    quantity: number,
  ) => Promise<void>;
  applyPromotion: (code: string) => Promise<PromoResult>;
  removePromotion: (code: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

const CART_ID_KEY = "vi2-medusa-cart-id";

export function CartProvider({ children }: { children: ReactNode }) {
  const { regionId } = useRegion();

  const [cart, setCart] = useState<Cart | null>(null);
  const [cartId, setCartIdState] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [queue] = useState(cartQueue<Cart>);

  // Sync internal state directly from the authoritative Medusa cart
  const syncFromMedusaCart = useCallback((medusaCart: Cart | null) => {
    if (!medusaCart) {
      setCart(null);
      setCartIdState(null);
      setItems([]);
      return;
    }

    queue.confirm(medusaCart);
    setCart(medusaCart);
    setCartIdState(medusaCart.id);

    const uiItems: CartItem[] = (medusaCart.items || []).map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: item.product || {
        id: item.productId,
        slug: item.slug || item.productId,
        variantId: item.variantId,
        brand: item.brand || "Vi2",
        name: item.name,
        shortName: item.name,
        category: "",
        description: "",
        price: item.price,
        rating: 0,
        reviewCount: 0,
        image: item.image || "",
        stock: 0,
      },
    }));

    setItems(uiItems);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CART_ID_KEY, medusaCart.id);
      } catch {}
    }
  }, [queue]);

  // One load-or-create at a time. React runs effects twice in development, and
  // an add can start before the first load ends; without this each caller
  // creates its own cart and all but one are orphaned.
  const pendingCart = useRef<Promise<Cart> | null>(null);
  const loadOrCreateCart = useCallback((): Promise<Cart> => {
    pendingCart.current ??= (async () => {
      let storedId: string | null = null;
      try {
        storedId = window.localStorage.getItem(CART_ID_KEY);
      } catch {}
      // getCart throws on outages, so only a gone or foreign cart is replaced.
      const existing = storedId ? await getCart(storedId) : null;
      return existing ?? (await createCart(regionId));
    })().finally(() => {
      pendingCart.current = null;
    });
    return pendingCart.current;
  }, [regionId]);

  // Ensure an active cart exists in Medusa associated with the region
  const getOrCreateCart = useCallback(async (): Promise<Cart> => {
    if (cart) return cart;
    const active = await loadOrCreateCart();
    syncFromMedusaCart(active);
    return active;
  }, [cart, loadOrCreateCart, syncFromMedusaCart]);

  // Initial load
  const refreshCart = useCallback(async () => {
    setLoading(true);
    setMutationError(null);
    try {
      syncFromMedusaCart(await loadOrCreateCart());
    } catch (err) {
      console.error("CartProvider initialization error:", err);
    } finally {
      setLoading(false);
    }
  }, [loadOrCreateCart, syncFromMedusaCart]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the saved cart on mount
    refreshCart();
  }, [refreshCart]);

  // ─── Authoritative Medusa Totals (No frontend calculations) ───────────────────

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = cart?.itemSubtotal ?? 0;
  const shippingTotal = cart?.shippingTotal ?? 0;
  const discountTotal = cart?.discountTotal ?? 0;
  const taxTotal = cart?.taxTotal ?? 0;
  const total = cart?.total ?? 0;
  const promotions = useMemo(() => cart?.promotions || [], [cart]);

  // ─── Cart Drawer Controls ───────────────────────────────────────────────────

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  // ─── Optimistic Mutations with Automatic Rollback on Failure ────────────────

  // Sends one change through the queue. A failure shows Medusa's last confirmed
  // cart (see cart-queue.ts), or the snapshot when there never was one.
  const sendChange = useCallback(
    async (task: () => Promise<Cart>, rollback: () => void, failure: string) => {
      const { show, latest, error } = await queue.run(task);
      if (show) syncFromMedusaCart(show);
      else if (error && latest) rollback();
      if (error === undefined) return true;
      console.error(failure, error);
      setMutationError(error instanceof Error ? error.message : failure);
      return false;
    },
    [queue, syncFromMedusaCart],
  );

  const addItem = useCallback(
    async (product: Product, quantity = 1, options?: { quiet?: boolean }) => {
      if (!options?.quiet) openCart();
      setMutationError(null);

      // Snapshot previous state for rollback
      const prevItems = [...items];
      const prevCart = cart;

      // Optimistic update; flavors of one product are separate lines.
      const variantOf = (p: Product) => p.variantId || p.id;
      setItems((currentItems) => {
        const existingIndex = currentItems.findIndex(
          (item) => variantOf(item.product) === variantOf(product),
        );
        if (existingIndex > -1) {
          const updated = [...currentItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity,
          };
          return updated;
        }
        return [...currentItems, { product, quantity }];
      });

      const rollback = () => {
        setItems(prevItems);
        setCart(prevCart);
      };
      let activeCart: Cart;
      try {
        activeCart = await getOrCreateCart();
      } catch (err: unknown) {
        console.error("Failed to add item to Medusa cart, rolling back:", err);
        rollback();
        setMutationError(err instanceof Error ? err.message : "Failed to add item. Reverting changes.");
        return false;
      }
      return sendChange(
        () => addCartItem(activeCart.id, variantOf(product), quantity),
        rollback,
        "Failed to add item. Reverting changes.",
      );
    },
    [cart, getOrCreateCart, items, openCart, sendChange],
  );

  const removeItem = useCallback(
    async (productIdOrLineId: string) => {
      setMutationError(null);

      // Snapshot previous state for rollback
      const prevItems = [...items];
      const prevCart = cart;

      const itemToRemove = items.find(
        (item) =>
          item.id === productIdOrLineId ||
          item.product.id === productIdOrLineId ||
          item.product.slug === productIdOrLineId,
      );

      // Optimistic update
      setItems((current) =>
        current.filter(
          (item) =>
            item.id !== productIdOrLineId &&
            item.product.id !== productIdOrLineId &&
            item.product.slug !== productIdOrLineId,
        ),
      );

      const lineId = itemToRemove?.id;
      if (cart && lineId) {
        await sendChange(
          () => removeCartItem(cart.id, lineId),
          () => { setItems(prevItems); setCart(prevCart); },
          "Failed to remove item. Reverting changes.",
        );
      }
    },
    [cart, items, sendChange],
  );

  const updateQuantity = useCallback(
    async (productIdOrLineId: string, quantity: number) => {
      if (quantity <= 0) {
        await removeItem(productIdOrLineId);
        return;
      }

      setMutationError(null);

      // Snapshot previous state for rollback
      const prevItems = [...items];
      const prevCart = cart;

      const target = items.find(
        (item) =>
          item.id === productIdOrLineId ||
          item.product.id === productIdOrLineId ||
          item.product.slug === productIdOrLineId,
      );

      // Optimistic update
      setItems((current) =>
        current.map((item) => {
          if (
            item.id === productIdOrLineId ||
            item.product.id === productIdOrLineId ||
            item.product.slug === productIdOrLineId
          ) {
            return { ...item, quantity };
          }
          return item;
        }),
      );

      const lineId = target?.id;
      if (cart && lineId) {
        await sendChange(
          () => updateCartItem(cart.id, lineId, quantity),
          () => { setItems(prevItems); setCart(prevCart); },
          "Failed to update quantity. Reverting changes.",
        );
      }
    },
    [cart, items, removeItem, sendChange],
  );

  const applyPromotion = useCallback(
    async (code: string): Promise<PromoResult> => {
      if (!cart) return { ok: false, reason: "loading" };
      try {
        const updated = await applyCartPromotion(cart.id, code.trim());
        const outcome = promoOutcome(updated, code);
        let synced = updated;
        if (!outcome.ok && outcome.reason === "not_eligible") {
          // A code that takes nothing off is removed. If that fails, the cart
          // still matches Medusa and PromoCode marks the code as not applying.
          synced = await removeCartPromotion(cart.id, code.trim()).catch(() => updated);
        }
        syncFromMedusaCart(synced);
        return outcome;
      } catch (err: unknown) {
        return promoFailure(err);
      }
    },
    [cart, syncFromMedusaCart],
  );

  const removePromotion = useCallback(
    async (code: string): Promise<void> => {
      if (!cart) return;
      try {
        const updated = await removeCartPromotion(cart.id, code.trim());
        syncFromMedusaCart(updated);
      } catch (err) {
        console.error("Failed to remove promotion code:", err);
      }
    },
    [cart, syncFromMedusaCart],
  );

  const clearCart = useCallback(async () => {
    setItems([]);
    setCart(null);
    setCartIdState(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(CART_ID_KEY);
      } catch {}
    }
  }, []);

  // Signing out leaves no cart (items, email, address) for the next person on
  // this browser.
  useEffect(() => {
    const onSignedOut = () => { void clearCart(); };
    window.addEventListener("vi2-signed-out", onSignedOut);
    return () => window.removeEventListener("vi2-signed-out", onSignedOut);
  }, [clearCart]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      shippingTotal,
      discountTotal,
      taxTotal,
      total,
      promotions,
      cartId,
      cart,
      isCartOpen,
      loading,
      error: mutationError,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      removeItem,
      updateQuantity,
      applyPromotion,
      removePromotion,
      clearCart,
      refreshCart,
    }),
    [
      items,
      itemCount,
      subtotal,
      shippingTotal,
      discountTotal,
      taxTotal,
      total,
      promotions,
      cartId,
      cart,
      isCartOpen,
      loading,
      mutationError,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      removeItem,
      updateQuantity,
      applyPromotion,
      removePromotion,
      clearCart,
      refreshCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
