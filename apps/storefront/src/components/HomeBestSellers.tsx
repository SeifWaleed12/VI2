"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  ArrowRight,
} from "lucide-react";
import Link from "@/components/LocaleLink";

import BestSellerCard from "@/components/BestSellerCard";
import type { Product } from "@/types/product";

import styles from "./HomeBestSellers.module.css";

export default function HomeBestSellers({
  initialProducts,
}: {
  initialProducts?: Product[];
}) {
  const { msg } = useLanguage();
  const bestSellers = (initialProducts ?? []).slice(0, 8);
  if (!bestSellers.length) return null;

  return (
    <section
      id="best-sellers"
      className={
        styles.section
      }
    >
      <div
        className={
          styles.shell
        }
      >
        <div
          className={
            styles.heading
          }
        >
          <div
            className={
              styles.titleWrap
            }
          >
            <h2>{msg("cart.shopProducts")}</h2>
          </div>

          <Link
            href="/shop"
            className={styles.viewAll}
          >{msg("home.viewAll")}<ArrowRight
              size={15}
              strokeWidth={
                1.5
              }
            />
          </Link>
        </div>

        <div
          className={
            styles.rail
          }
        >
          {bestSellers.map(
            (
              product,
            ) => (
              <BestSellerCard
                key={
                  product.id
                }
                product={
                  product
                }
                compact
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}
