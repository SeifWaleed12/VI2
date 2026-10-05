"use client";

import React, { useMemo } from "react";
import type { ProductOption, ProductVariant } from "@/types/product";
import styles from "./VariantSelector.module.css";

export type VariantSelectorProps = {
  options: ProductOption[];
  variants?: ProductVariant[];
  selectedOptions: Record<string, string>;
  onSelectOption: (optionTitle: string, value: string) => void;
  className?: string;
};

export default function VariantSelector({
  options,
  variants = [],
  selectedOptions,
  onSelectOption,
  className = "",
}: VariantSelectorProps) {
  // Check if a specific option value has in-stock inventory
  const availabilityMap = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};

    options.forEach((opt) => {
      map[opt.title] = {};
      opt.values.forEach((val) => {
        // Find variants that have this option value
        const matchingVariants = variants.filter((v) => {
          const vVal =
            v.options?.[opt.title] ||
            v.options?.[opt.title.toLowerCase()] ||
            v.title;
          return vVal?.toLowerCase() === val.toLowerCase();
        });

        if (matchingVariants.length === 0) {
          // An option without a matching variant cannot be purchased.
          map[opt.title][val] = false;
        } else {
          // In stock if at least one matching variant is available
          map[opt.title][val] = matchingVariants.some(
            (v) => v.inStock ?? (v.stock > 0)
          );
        }
      });
    });

    return map;
  }, [options, variants]);

  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.variantSection} ${className}`}>
      {options.map((option) => {
        const selectedValue = selectedOptions[option.title] || option.values[0] || "";
        const isSelectedOutOfStock =
          availabilityMap[option.title]?.[selectedValue] === false;

        return (
          <div key={option.id || option.title} className={styles.optionGroup}>
            <div className={styles.headerRow}>
              <span className={styles.label}>{option.title}</span>
              <span className={styles.currentValue}>{selectedValue}</span>
              {isSelectedOutOfStock && (
                <span className={styles.outOfStockNotice}>— Out of stock</span>
              )}
            </div>

            <div
              className={styles.pillGrid}
              role="radiogroup"
              aria-label={option.title}
            >
              {option.values.map((val) => {
                const isSelected =
                  selectedValue.toLowerCase() === val.toLowerCase();
                const isAvailable =
                  availabilityMap[option.title]?.[val] ?? true;

                let pillClass = styles.pillDefault;
                if (isSelected) {
                  pillClass = styles.pillSelected;
                } else if (!isAvailable) {
                  pillClass = styles.pillOutOfStock;
                }

                return (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    title={!isAvailable ? `${val} (Out of stock)` : val}
                    className={`${styles.pill} ${pillClass}`}
                    onClick={() => onSelectOption(option.title, val)}
                  >
                    <span>{val}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
