import { medusa } from "../client";
import type { Cart, CartAddress } from "@/types/cart";

export const CART_FIELDS =
  "*items,*items.variant,*items.product,*shipping_address,*billing_address,*shipping_methods,*promotions,*payment_collection";

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
      brand: String(meta.brand || "Vi2"),
      image: item.thumbnail || product.thumbnail || String(meta.image || ""),
      slug: product.handle || String(meta.slug || ""),
      price: unitPrice,
      quantity: item.quantity,
      total: itemTotal,
      product: {
        id: item.product_id || product.id || "",
        slug: product.handle || "",
        variantId: item.variant_id || variant.id || "",
        brand: String(meta.brand || "Vi2"),
        name: item.title || product.title || "",
        shortName: String(meta.shortName || item.title || product.title || ""),
        category: String(meta.category || ""),
        description: product.description || "",
        price: unitPrice,
        rating: Number(meta.rating || 0),
        reviewCount: Number(meta.reviewCount || 0),
        image: item.thumbnail || product.thumbnail || String(meta.image || ""),
        stock: Number(variant.inventory_quantity ?? meta.stock ?? 99),
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
    itemSubtotal: c.item_subtotal ?? c.subtotal ?? 0,
    shippingTotal: c.shipping_total ?? 0,
    discountTotal: c.discount_total ?? 0,
    taxTotal: c.tax_total ?? 0,
    total: c.total ?? 0,
  };
}

export async function getCart(cartId: string): Promise<Cart | null> {
  try {
    const { cart } = await medusa.store.cart.retrieve(cartId, {
      fields: CART_FIELDS,
    });
    return mapMedusaCart(cart);
  } catch {
    return null;
  }
}

export async function createCart(regionId?: string): Promise<Cart> {
  const { cart } = await medusa.store.cart.create(
    {
      ...(regionId ? { region_id: regionId } : {}),
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

export async function setCartAddress(
  cartId: string,
  email: string,
  shippingAddress: CartAddress,
  billingAddress?: CartAddress,
): Promise<Cart> {
  const payload = {
    email,
    shipping_address: {
      first_name: shippingAddress.firstName,
      last_name: shippingAddress.lastName,
      address_1: shippingAddress.address1,
      city: shippingAddress.city,
      country_code: shippingAddress.countryCode.toLowerCase(),
      postal_code: shippingAddress.postalCode || "00000",
      phone: shippingAddress.phone || "",
    },
    billing_address: billingAddress
      ? {
          first_name: billingAddress.firstName,
          last_name: billingAddress.lastName,
          address_1: billingAddress.address1,
          city: billingAddress.city,
          country_code: billingAddress.countryCode.toLowerCase(),
          postal_code: billingAddress.postalCode || "00000",
          phone: billingAddress.phone || "",
        }
      : {
          first_name: shippingAddress.firstName,
          last_name: shippingAddress.lastName,
          address_1: shippingAddress.address1,
          city: shippingAddress.city,
          country_code: shippingAddress.countryCode.toLowerCase(),
          postal_code: shippingAddress.postalCode || "00000",
          phone: shippingAddress.phone || "",
        },
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
