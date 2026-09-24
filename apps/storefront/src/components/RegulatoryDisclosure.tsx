"use client";

import {
  BadgeCheck,
  Globe2,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import type { Product } from "@/types/product";

import styles from "./RegulatoryDisclosure.module.css";

type Props = {
  product: Product;
};

type Market =
  | "egypt"
  | "us"
  | "eu";

const marketCopy: Record<
  Market,
  {
    short: string;
    authority: string;
    title: string;
    body: string;
  }
> = {
  egypt: {
    short: "EG",
    authority: "EDA",
    title: "EGYPT MARKET",
    body:
      "Egyptian regulatory status and any applicable EDA registration or approval information should be displayed from the verified product record supplied to Vi2.",
  },
  us: {
    short: "US",
    authority: "FDA",
    title: "U.S. MARKET",
    body:
      "Where a U.S. market notice is required, the product record can provide the applicable FDA dietary-supplement wording and labeling information.",
  },
  eu: {
    short: "EU",
    authority: "EFSA",
    title: "EU MARKET",
    body:
      "Where an EU market notice is required, the product record can provide the applicable EFSA-authorized claim or regulatory wording.",
  },
};

export default function RegulatoryDisclosure({
  product,
}: Props) {
  const [market, setMarket] =
    useState<Market>("egypt");

  const selected =
    marketCopy[market];

  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>
        <div>
          <Globe2
            size={17}
            strokeWidth={1.4}
          />

          <div>
            <strong>
              MARKET REGULATORY INFORMATION
            </strong>

            <span>
              Dynamic compliance presentation
            </span>
          </div>
        </div>

        <BadgeCheck
          size={18}
          strokeWidth={1.35}
        />
      </div>

      <div
        className={styles.marketTabs}
        role="tablist"
        aria-label="Regulatory market"
      >
        {(
          Object.keys(
            marketCopy,
          ) as Market[]
        ).map((item) => {
          const option =
            marketCopy[item];

          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={
                market === item
              }
              className={
                market === item
                  ? styles.active
                  : ""
              }
              onClick={() =>
                setMarket(item)
              }
            >
              <span>
                {option.short}
              </span>

              <strong>
                {option.authority}
              </strong>
            </button>
          );
        })}
      </div>

      <div className={styles.notice}>
        <ShieldCheck
          size={17}
          strokeWidth={1.4}
        />

        <div>
          <span>
            {selected.title}
          </span>

          <strong>
            {selected.authority}
          </strong>

          <p>
            {selected.body}
          </p>

          <small>
            Vi2 does not infer regulatory
            approval. Final status must come
            from verified catalog data for{" "}
            {product.shortName}.
          </small>
        </div>
      </div>
    </div>
  );
}
