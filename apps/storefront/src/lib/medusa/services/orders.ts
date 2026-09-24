import { medusa } from "../client";
import type { Order, OrderPaymentStatus, OrderStatus } from "@/types/order";

export const ORDER_FIELDS =
  "*items,*items.variant,*items.product,*shipping_address,*shipping_methods";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapMedusaOrder(o: any): Order {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (o.items || []).map((item: any) => {
    const product = item.product || {};
    const meta = product.metadata || item.metadata || {};
    const unitPrice = item.unit_price ?? 0;
    const itemTotal =
      item.total !== undefined ? item.total : unitPrice * item.quantity;

    return {
      id: item.id,
      productId: item.product_id || product.id || "",
      variantId: item.variant_id || item.variant?.id || "",
      name: item.title || product.title || "",
      brand: String(meta.brand || "Vi2"),
      image: item.thumbnail || product.thumbnail || String(meta.image || ""),
      slug: product.handle || String(meta.slug || ""),
      price: unitPrice,
      quantity: item.quantity,
      total: itemTotal,
    };
  });

  return {
    id: o.id,
    displayId: o.display_id,
    reference:
      o.metadata?.vi2_reference || `VI2-${o.display_id || o.id.slice(-6)}`,
    status: (o.status || "pending") as OrderStatus,
    paymentStatus: (o.payment_status || "not_paid") as OrderPaymentStatus,
    currencyCode: (o.currency_code || "EGP").toUpperCase(),
    email: o.email || "",
    items,
    shippingAddress: o.shipping_address
      ? {
          firstName: o.shipping_address.first_name || "",
          lastName: o.shipping_address.last_name || "",
          address1: o.shipping_address.address_1 || "",
          city: o.shipping_address.city || "",
          countryCode: o.shipping_address.country_code || "eg",
          phone: o.shipping_address.phone || undefined,
        }
      : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shippingMethods: (o.shipping_methods || []).map((sm: any) => ({
      id: sm.id,
      shippingOptionId: sm.shipping_option_id,
      name: sm.name || "Delivery",
      amount: sm.amount || 0,
    })),
    itemSubtotal: o.item_subtotal ?? o.subtotal ?? 0,
    shippingTotal: o.shipping_total ?? 0,
    discountTotal: o.discount_total ?? 0,
    taxTotal: o.tax_total ?? 0,
    total: o.total ?? 0,
    createdAt: o.created_at || new Date().toISOString(),
  };
}

export async function getCustomerOrders(limit = 20): Promise<Order[]> {
  try {
    const { orders } = await medusa.store.order.list({
      limit,
      fields: ORDER_FIELDS,
    });
    return (orders || []).map(mapMedusaOrder);
  } catch {
    return [];
  }
}

export async function getOrder(orderId: string): Promise<Order | null> {
  try {
    const { order } = await medusa.store.order.retrieve(orderId, {
      fields: ORDER_FIELDS,
    });
    if (!order) return null;
    return mapMedusaOrder(order);
  } catch {
    return null;
  }
}
