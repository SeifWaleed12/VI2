"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Plus,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCart } from "@/context/CartContext";
import { products as fallbackProducts } from "@/data/products";
import { getProducts } from "@/lib/medusa";
import type { Product } from "@/types/product";

import styles from "./FlashDeals.module.css";

const slugs = [
  "nutri-nations-creatine",
  "doctors-best-high-absorption-magnesium",
  "california-gold-vitamin-d3-5000",
  "now-foods-ashwagandha-450",
  "california-gold-collagenup-206g",
  "now-foods-omega-3-200-softgels",
];

function price(value: number) {
  return new Intl.NumberFormat("en-EG").format(value);
}

export default function FlashDeals({
  initialProducts,
}: {
  initialProducts?: Product[];
}) {
  const { addItem } = useCart();
  const railRef = useRef<HTMLDivElement>(null);
  const [productsList, setProductsList] = useState<Product[]>(
    initialProducts || [],
  );

  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      let active = true;
      getProducts()
        .then((res) => {
          if (active && res.length > 0) {
            setProductsList(res);
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [initialProducts]);

  const candidates = productsList.length > 0 ? productsList : fallbackProducts;

  const dealProducts = useMemo(() => {
    const matched = slugs
      .map((slug) => candidates.find((product) => product.slug === slug))
      .filter(Boolean) as Product[];

    return matched.length > 0 ? matched : candidates.slice(0, 6);
  }, [candidates]);

  function move(direction: -1 | 1) {
    railRef.current?.scrollBy({
      left:
        direction *
        Math.min(760, window.innerWidth * 0.72),
      behavior: "smooth",
    });
  }

  return (
    <section
      id="flash-deals"
      className={styles.section}
    >
      <div className={styles.heading}>
        <div>
          <span>
            <Zap size={13} strokeWidth={1.5} />
            DAILY ROTATION
          </span>

          <h2 data-arabic-text="عروض سريعة.">
            FLASH
            <br />
            DEALS.
          </h2>
        </div>

        <div className={styles.controls}>
          <div className={styles.timer}>
            <Clock3 size={18} strokeWidth={1.4} />
            <div>
              <span>REFRESHES DAILY</span>
              <strong>24H PICKS</strong>
            </div>
          </div>

          <div className={styles.arrows}>
            <button
              type="button"
              aria-label="Previous deals"
              onClick={() => move(-1)}
            >
              <ArrowLeft size={17} strokeWidth={1.4} />
            </button>

            <button
              type="button"
              aria-label="Next deals"
              onClick={() => move(1)}
            >
              <ArrowRight size={17} strokeWidth={1.4} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        className={styles.rail}
      >
        {dealProducts.map((product, index) => (
          <article
            key={product.id}
            className={styles.card}
          >
            <div className={styles.cardTop}>
              <span>
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong>FLASH PICK</strong>
            </div>

            <Link
              href={`/products/${product.slug}`}
              className={styles.imageLink}
            >
              <Image
                src={product.image}
                alt={product.name}
                width={520}
                height={560}
              />
            </Link>

            <div className={styles.cardBody}>
              <span>{product.brand}</span>
              <h3>{product.shortName}</h3>

              <div className={styles.priceRow}>
                <strong>
                  {price(product.price)} EGP
                </strong>

                <button
                  type="button"
                  aria-label={`Add ${product.name}`}
                  onClick={() => addItem(product, 1)}
                >
                  <Plus size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.footer}>
        <p>
          A rotating edit of popular products without
          adding another oversized hero carousel.
        </p>

        <Link href="/shop">
          VIEW ALL PRODUCTS
          <ArrowRight size={16} strokeWidth={1.5} />
        </Link>
      </div>
    </section>
  );
}
