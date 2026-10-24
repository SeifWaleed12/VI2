import { resolveRegionId } from "./regions";
import { medusa } from "../client";
import type { Cart, CartAddress } from "@/types/cart";

export const CART_FIELDS =
  "*items,*items.variant,*items.product,*shipping_address,*billing_address,*shipping_methods,*promotions,*payment_collection,items.adjustments.code,items.adjustments.amount,shipping_methods.adjustments.code,shipping_methods.adjustments.amount";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapMedusaCart(c: any): Cart {
  if (!c) {
    throw new Error("Cannot map empty cart from Medusa");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (c.items || []).map((item: any) => {
    const product = item.product || {};
    const variant = item.variant || {};
    const meta = product.metadata || item.metadata || {};

    const unitPrice = item.unit_price ?? 0;
    const itemTotal =
      item.total !== undefined ? item.total : unitPrice * item.quantity;

    return {
      id: item.id,
      productId: item.product_id || product.id || "",
      variantId: item.variant_id || variant.id || "",
      name: item.title || product.title || "",
      brand: "",
      image: item.thumbnail || product.thumbnail || String(meta.image || ""),
      slug: product.handle || String(meta.slug || ""),
      price: unitPrice,
      quantity: item.quantity,
      total: itemTotal,
      product: {
        id: item.product_id || product.id || "",
        slug: product.handle || "",
        variantId: item.variant_id || variant.id || "",
        brand: "",
        name: item.title || product.title || "",
        shortName: String(meta.shortName || item.title || product.title || ""),
        category: String(meta.category || ""),
        description: product.description || "",
        price: unitPrice,
        // Reviews are not implemented; never surface unverified metadata ratings.
        rating: 0,
        reviewCount: 0,
        image: item.thumbnail || product.thumbnail || String(meta.image || ""),
        stock: Number(variant.inventory_quantity ?? 0),
      },
    };
  });

  return {
    id: c.id,
    regionId: c.region_id,
    currencyCode: (c.currency_code || "EGP").toUpperCase(),
    email: c.email || undefined,
    customerId: c.customer_id || undefined,
    items,
    shippingAddress: c.shipping_address
      ? {
          firstName: c.shipping_address.first_name || "",
          lastName: c.shipping_address.last_name || "",
          address1: c.shipping_address.address_1 || "",
          city: c.shipping_address.city || "",
          countryCode: c.shipping_address.country_code || "eg",
          postalCode: c.shipping_address.postal_code || undefined,
          phone: c.shipping_address.phone || undefined,
        }
      : undefined,
    billingAddress: c.billing_address
      ? {
          firstName: c.billing_address.first_name || "",
          lastName: c.billing_address.last_name || "",
          address1: c.billing_address.address_1 || "",
          city: c.billing_address.city || "",
          countryCode: c.billing_address.country_code || "eg",
          postalCode: c.billing_address.postal_code || undefined,
          phone: c.billing_address.phone || undefined,
        }
      : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shippingMethods: (c.shipping_methods || []).map((sm: any) => ({
      id: sm.id,
      shippingOptionId: sm.shipping_option_id,
      name: sm.name || "Standard Delivery",
      amount: sm.amount || 0,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    promotions: (c.promotions || []).map((p: any) => ({
      id: p.id,
      code: p.code,
      isAutomatic: p.is_automatic,
    })),
    promotionSavings: promotionSavings(c),
    itemSubtotal: c.item_subtotal ?? c.subtotal ?? 0,
    shippingTotal: c.shipping_total ?? 0,
    discountTotal: c.discount_total ?? 0,
    taxTotal: c.tax_total ?? 0,
    total: c.total ?? 0,
  };
}

// null only when Medusa says the cart is gone (404) or belongs to another
// account's login (403). Any other failure throws, so a network blip never
// makes the caller replace the shopper's cart with an empty one.
export async function getCart(cartId: string): Promise<Cart | null> {
  try {
    const { cart } = await medusa.store.cart.retrieve(cartId, {
      fields: CART_FIELDS,
    });
    return mapMedusaCart(cart);
  } catch (error) {
    const status = (error as { status?: unknown } | null)?.status;
    if (status === 404 || status === 403) return null;
    throw error;
  }
}

export async function createCart(regionId?: string): Promise<Cart> {
  const { cart } = await medusa.store.cart.create(
    {
      region_id: await resolveRegionId(regionId),
    },
    {
      fields: CART_FIELDS,
    },
  );
  return mapMedusaCart(cart);
}

export async function addCartItem(
  cartId: string,
  variantId: string,
  quantity: number,
): Promise<Cart> {
  const { cart } = await medusa.store.cart.createLineItem(
    cartId,
    {
      variant_id: variantId,
      quantity,
    },
    {
      fields: CART_FIELDS,
    },
  );
  return mapMedusaCart(cart);
}

export async function updateCartItem(
  cartId: string,
  lineItemId: string,
  quantity: number,
): Promise<Cart> {
  const { cart } = await medusa.store.cart.updateLineItem(
    cartId,
    lineItemId,
    {
      quantity,
    },
    {
      fields: CART_FIELDS,
    },
  );
  return mapMedusaCart(cart);
}

export async function removeCartItem(
  cartId: string,
  lineItemId: string,
): Promise<Cart> {
  await medusa.store.cart.deleteLineItem(cartId, lineItemId);
  const updated = await getCart(cartId);
  if (!updated) {
    throw new Error("Failed to retrieve cart after removing line item");
  }
  return updated;
}

// Egyptian shoppers rarely know a postal code and Bosta locates by city and
// district, so an empty one is left out rather than saved as a fake value.
function toMedusaAddress(address: CartAddress) {
  return {
    first_name: address.firstName,
    last_name: address.lastName,
    address_1: address.address1,
    city: address.city,
    country_code: address.countryCode.toLowerCase(),
    ...(address.postalCode?.trim() ? { postal_code: address.postalCode.trim() } : {}),
    phone: address.phone || "",
  };
}

export async function setCartAddress(
  cartId: string,
  email: string,
  shippingAddress: CartAddress,
  billingAddress?: CartAddress,
): Promise<Cart> {
  const payload = {
    email,
    shipping_address: toMedusaAddress(shippingAddress),
    billing_address: toMedusaAddress(billingAddress ?? shippingAddress),
  };

  const { cart } = await medusa.store.cart.update(cartId, payload, {
    fields: CART_FIELDS,
  });
  return mapMedusaCart(cart);
}

export async function setCartShippingMethod(
  cartId: string,
  optionId: string,
): Promise<Cart> {
  const { cart } = await medusa.store.cart.addShippingMethod(
    cartId,
    {
      option_id: optionId,
    },
    {
      fields: CART_FIELDS,
    },
  );
  return mapMedusaCart(cart);
}

export async function applyCartPromotion(
  cartId: string,
  promoCode: string,
): Promise<Cart> {
  const { cart } = await medusa.store.cart.addPromotions(
    cartId,
    {
      promo_codes: [promoCode],
    },
    {
      fields: CART_FIELDS,
    },
  );
  return mapMedusaCart(cart);
}

type Adjusted = { adjustments?: ({ code?: string | null; amount?: number | string | null } | null)[] | null };

// Sums the discount each code gives across items and delivery.
function promotionSavings(c: { items?: Adjusted[] | null; shipping_methods?: Adjusted[] | null }) {
  const savings: Record<string, number> = {};
  for (const line of [...(c.items ?? []), ...(c.shipping_methods ?? [])]) {
    for (const adjustment of line?.adjustments ?? []) {
      const code = adjustment?.code?.toUpperCase();
      if (code) savings[code] = (savings[code] ?? 0) + Number(adjustment?.amount ?? 0);
    }
  }
  return savings;
}

export type PromoResult =
  | { ok: true }
  | { ok: false; reason: "loading" | "invalid" | "not_applicable" | "not_eligible" | "network" };

// Medusa accepts a real code that fits nothing in the cart (200) but leaves it
// off the cart; a code it attaches can still take nothing off (for example a
// minimum amount not reached). Only a code that lowers the total is applied.
export function promoOutcome(cart: Cart, code: string): PromoResult {
  const wanted = code.trim().toUpperCase();
  if (!cart.promotions.some((promotion) => promotion.code?.toUpperCase() === wanted)) return { ok: false, reason: "not_applicable" };
  return (cart.promotionSavings[wanted] ?? 0) > 0 ? { ok: true } : { ok: false, reason: "not_eligible" };
}

// Medusa answers 400 for a code that does not exist or has ended.
export function promoFailure(error: unknown): PromoResult {
  return { ok: false, reason: (error as { status?: unknown } | null)?.status === 400 ? "invalid" : "network" };
}

export async function removeCartPromotion(
  cartId: string,
  promoCode: string,
): Promise<Cart> {
  const { cart } = await medusa.store.cart.removePromotions(
    cartId,
    {
      promo_codes: [promoCode],
    },
    {
      fields: CART_FIELDS,
    },
  );
  return mapMedusaCart(cart);
}
