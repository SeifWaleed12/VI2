"use client";

import { useRef } from "react";
import { useDrawerFocus } from "@/hooks/use-drawer-focus";
import { LegacyTranslations, useLanguage } from "@/context/LanguageContext";
import Link from "@/components/LocaleLink";
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import { useCart } from "@/context/CartContext";
import { useStockLimits } from "@/hooks/use-stock-limits";
import CatalogImage from "@/components/CatalogImage";

function formatPrice(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-EG",
  ).format(value);
}

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    subtotal,
    closeCart,
    updateQuantity,
    removeItem,
  } = useCart();

  const drawerRef = useRef<HTMLElement>(null);
  const { msg, language } = useLanguage();
  // Read fresh each time the drawer opens, so + stops where stock does.
  const limits = useStockLimits(isCartOpen ? items.map((item) => item.product.id) : [], language);
  const limitOf = (variantId?: string) => (variantId ? limits[variantId] : undefined);
  useDrawerFocus(drawerRef, isCartOpen, closeCart);

  return (
    <LegacyTranslations>
      <button
        type="button"
        aria-label={msg("cart.close")}
        aria-hidden="true"
        tabIndex={-1}
        className={
          isCartOpen
            ? "cart-backdrop cart-backdrop-open"
            : "cart-backdrop"
        }
        onClick={closeCart}
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal={isCartOpen ? true : undefined}
        aria-labelledby="cart-drawer-title"
        tabIndex={-1}
        inert={!isCartOpen}
        className={
          isCartOpen
            ? "cart-drawer cart-drawer-open"
            : "cart-drawer"
        }
        aria-hidden={!isCartOpen}
      >
        <div className="cart-drawer-header">
          <div>
            <span className="eyebrow">
              YOUR BAG
            </span>

            <h2 id="cart-drawer-title">Cart</h2>
          </div>

          <button
            type="button"
            className="nav-icon-button"
            aria-label={msg("cart.close")}
            onClick={closeCart}
          >
            <X size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty-cart">
            <ShoppingBag
              size={37}
              strokeWidth={1.3}
            />

            <h3>
              Your bag is empty.
            </h3>

            <p>
              Discover sports nutrition,
              wellness essentials and
              everyday supplements.
            </p>

            <Link
              href="/shop"
              className="button button-dark"
              onClick={closeCart}
            >
              SHOP PRODUCTS
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <article
                  key={item.id ?? item.product.variantId ?? item.product.id}
                  className="cart-item"
                >
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="cart-item-image"
                    onClick={closeCart}
                  >
                    <CatalogImage
                      src={item.product.image}
                      alt={
                        item.product.name
                      }
                    />
                  </Link>

                  <div className="cart-item-content">
                    <div className="cart-item-top">
                      <div>
                        <p className="cart-brand">
                          {
                            item.product
                              .brand
                          }
                        </p>

                        <Link
                          href={`/products/${item.product.slug}`}
                          className="cart-item-name"
                          onClick={
                            closeCart
                          }
                        >
                          {
                            item.product
                              .shortName
                          }
                        </Link>

                        <p className="cart-meta">
                          {[
                            item.product
                              .flavor,
                            item.product
                              .size,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              " · ",
                            )}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="remove-button"
                        aria-label={`Remove ${item.product.name}`}
                        onClick={() =>
                          removeItem(
                            item.id ??
                              item.product.id,
                          )
                        }
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>

                    <div className="cart-item-bottom">
                      <div className="quantity-control quantity-control-small">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            updateQuantity(
                              item.id ??
                                item.product.id,
                              item.quantity -
                                1,
                            )
                          }
                        >
                          <Minus
                            size={13}
                          />
                        </button>

                        <span>
                          {
                            item.quantity
                          }
                        </span>

                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={item.quantity >= (limitOf(item.product.variantId) ?? Infinity)}
                          onClick={() =>
                            updateQuantity(
                              item.id ??
                                item.product.id,
                              item.quantity +
                                1,
                            )
                          }
                        >
                          <Plus
                            size={13}
                          />
                        </button>
                      </div>

                      <strong>
                        {formatPrice(
                          item.product
                            .price *
                            item.quantity,
                        )}{" "}
                        EGP
                      </strong>
                    </div>
                    <StockNote quantity={item.quantity} limit={limitOf(item.product.variantId)} />
                  </div>
                </article>
              ))}
            </div>

            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>
                  Subtotal
                </span>

                <strong>
                  {formatPrice(
                    subtotal,
                  )}{" "}
                  EGP
                </strong>
              </div>

              <p>
                Delivery is calculated
                at checkout.
              </p>

              <Link
                href="/checkout"
                className="button button-dark button-full"
                onClick={closeCart}
              >
                CHECKOUT
              </Link>
            </div>
          </>
        )}
      </aside>
    </LegacyTranslations>
  );
}

// Says when a line is at, or above, what can still be bought.
function StockNote({ quantity, limit }: { quantity: number; limit?: number }) {
  const { msg } = useLanguage();
  if (limit === undefined || quantity < limit) return null;
  const key = quantity === limit ? "cart.maxAvailable" : limit === 0 ? "cart.soldOut" : "cart.overStock";
  return <p className="cart-item-stock" role="status">{msg(key).replace("{count}", String(limit))}</p>;
}
