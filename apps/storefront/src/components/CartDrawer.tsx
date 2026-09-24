"use client";

import Link from "next/link";
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import { useCart } from "@/context/CartContext";

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

  return (
    <>
      <button
        type="button"
        aria-label="Close cart"
        className={
          isCartOpen
            ? "cart-backdrop cart-backdrop-open"
            : "cart-backdrop"
        }
        onClick={closeCart}
      />

      <aside
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

            <h2>Cart</h2>
          </div>

          <button
            type="button"
            className="nav-icon-button"
            aria-label="Close cart"
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
                  key={item.product.id}
                  className="cart-item"
                >
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="cart-item-image"
                    onClick={closeCart}
                  >
                    <img
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
                            item.product
                              .id,
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
                              item
                                .product
                                .id,
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
                          onClick={() =>
                            updateQuantity(
                              item
                                .product
                                .id,
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
    </>
  );
}