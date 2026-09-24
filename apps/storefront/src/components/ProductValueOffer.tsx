"use client";

import Image from "next/image";
import {
  Check,
  PackagePlus,
} from "lucide-react";

import { useCart } from "@/context/CartContext";
import { products as fallbackProducts } from "@/data/products";
import type { Product } from "@/types/product";
import { getProductHealthGoals } from "@/lib/catalogMeta";

import styles from "./ProductValueOffer.module.css";

export default function ProductValueOffer({
  product,
  allProducts,
}: {
  product: Product;
  allProducts?: Product[];
}) {
  const { addItem } = useCart();

  const goals = getProductHealthGoals(product);

  const sourceProducts =
    allProducts && allProducts.length > 0
      ? allProducts
      : fallbackProducts;

  const partners = sourceProducts
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        candidate.stock > 0 &&
        getProductHealthGoals(candidate).some(
          (goal) => goals.includes(goal),
        ),
    )
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 2);

  const setProducts = [product, ...partners];

  const total = setProducts.reduce(
    (sum, item) => sum + item.price,
    0,
  );

  return (
    <section className={styles.section}>
      <div className={styles.copy}>
        <span>STACKABLE VALUE SET</span>

        <h2 data-arabic-text="أكمل روتينك.">
          COMPLETE
          <br />
          THE ROUTINE.
        </h2>

        <p>
          Add products sharing the same health goal
          in one step. Final promotion rules can be
          connected to the commerce backend later.
        </p>

        <div className={styles.includes}>
          {setProducts.map((item) => (
            <span key={item.id}>
              <Check size={12} strokeWidth={1.5} />
              {item.shortName}
            </span>
          ))}
        </div>

        <div className={styles.action}>
          <div>
            <span>SET TOTAL</span>
            <strong>
              {new Intl.NumberFormat("en-EG").format(total)} EGP
            </strong>
          </div>

          <button
            type="button"
            onClick={() =>
              setProducts.forEach((item) =>
                addItem(item, 1),
              )
            }
          >
            <PackagePlus size={16} strokeWidth={1.5} />
            ADD ROUTINE
          </button>
        </div>
      </div>

      <div className={styles.products}>
        {setProducts.map((item, index) => (
          <div
            key={item.id}
            className={styles.product}
          >
            <Image
              src={item.image}
              alt={item.name}
              width={430}
              height={500}
            />

            <span>
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
