"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  removeCartPromotion,
} from "@/lib/medusa/services/cart";

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
  addItem: (product: Product, quantity?: number) => Promise<void>;
  removeItem: (productIdOrLineId: string) => Promise<void>;
  updateQuantity: (
    productIdOrLineId: string,
    quantity: number,
  ) => Promise<void>;
  applyPromotion: (code: string) => Promise<{ ok: boolean; message?: string }>;
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

  // Sync internal state directly from the authoritative Medusa cart
  const syncFromMedusaCart = useCallback((medusaCart: Cart | null) => {
    if (!medusaCart) {
      setCart(null);
      setCartIdState(null);
      setItems([]);
      return;
    }

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
        stock: 99,
      },
    }));

    setItems(uiItems);

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(CART_ID_KEY, medusaCart.id);
      } catch {}
    }
  }, []);

  // Ensure an active cart exists in Medusa associated with the region
  const getOrCreateCart = useCallback(async (): Promise<Cart> => {
    if (cart) return cart;

    let existingId: string | null = null;
    if (typeof window !== "undefined") {
      existingId = window.localStorage.getItem(CART_ID_KEY);
    }

    if (existingId) {
      const existingCart = await getCart(existingId);
      if (existingCart) {
        syncFromMedusaCart(existingCart);
        return existingCart;
      }
    }

    // Create fresh cart in Medusa associated with regionId
    const newCart = await createCart(regionId);
    syncFromMedusaCart(newCart);
    return newCart;
  }, [cart, regionId, syncFromMedusaCart]);

  // Initial load
  const refreshCart = useCallback(async () => {
    setLoading(true);
    setMutationError(null);
    try {
      let storedId: string | null = null;
      if (typeof window !== "undefined") {
        storedId = window.localStorage.getItem(CART_ID_KEY);
      }

      if (storedId) {
        const existing = await getCart(storedId);
        if (existing) {
          syncFromMedusaCart(existing);
          setLoading(false);
          return;
        }
      }

      // If no valid stored cart, create one with the current region
      const fresh = await createCart(regionId);
      syncFromMedusaCart(fresh);
    } catch (err) {
      console.error("CartProvider initialization error:", err);
    } finally {
      setLoading(false);
    }
  }, [regionId, syncFromMedusaCart]);

  useEffect(() => {
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

  const addItem = useCallback(
    async (product: Product, quantity = 1) => {
      openCart();
      setMutationError(null);

      // Snapshot previous state for rollback
      const prevItems = [...items];
      const prevCart = cart;

      // Optimistic update
      setItems((currentItems) => {
        const existingIndex = currentItems.findIndex(
          (item) => item.product.id === product.id,
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

      try {
        const activeCart = await getOrCreateCart();
        const variantId = product.variantId || product.id;
        const updated = await addCartItem(activeCart.id, variantId, quantity);
        syncFromMedusaCart(updated);
      } catch (err: unknown) {
        console.error("Failed to add item to Medusa cart, rolling back:", err);
        // Rollback to server state
        setItems(prevItems);
        setCart(prevCart);
        setMutationError(
          err instanceof Error
            ? err.message
            : "Failed to add item. Reverting changes.",
        );
      }
    },
    [cart, getOrCreateCart, items, openCart, syncFromMedusaCart],
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

      if (cart && itemToRemove?.id) {
        try {
          const updated = await removeCartItem(cart.id, itemToRemove.id);
          syncFromMedusaCart(updated);
        } catch (err: unknown) {
          console.error(
            "Failed to remove item from Medusa cart, rolling back:",
            err,
          );
          // Rollback to server state
          setItems(prevItems);
          setCart(prevCart);
          setMutationError(
            err instanceof Error
              ? err.message
              : "Failed to remove item. Reverting changes.",
          );
        }
      }
    },
    [cart, items, syncFromMedusaCart],
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

      if (cart && target?.id) {
        try {
          const updated = await updateCartItem(cart.id, target.id, quantity);
          syncFromMedusaCart(updated);
        } catch (err: unknown) {
          console.error(
            "Failed to update quantity in Medusa cart, rolling back:",
            err,
          );
          // Rollback to server state
          setItems(prevItems);
          setCart(prevCart);
          setMutationError(
            err instanceof Error
              ? err.message
              : "Failed to update quantity. Reverting changes.",
          );
        }
      }
    },
    [cart, items, removeItem, syncFromMedusaCart],
  );

  const applyPromotion = useCallback(
    async (code: string): Promise<{ ok: boolean; message?: string }> => {
      if (!cart) return { ok: false, message: "Cart not initialized" };
      try {
        const updated = await applyCartPromotion(cart.id, code.trim());
        syncFromMedusaCart(updated);
        return { ok: true };
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Invalid or expired promotion code";
        return { ok: false, message: msg };
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
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(CART_ID_KEY);
      } catch {}
    }
  }, []);

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
