"use client";

import { useId } from "react";
import { isPurchasableVariant, matchesSelection, optionValue } from "@/lib/product-variants";
import type { ProductOption, ProductVariant } from "@/types/product";
import styles from "./VariantSelector.module.css";

export type VariantSelectorProps = {
  options: ProductOption[];
  variants?: ProductVariant[];
  selectedOptions: Record<string, string>;
  onSelectOption: (optionTitle: string, value: string) => void;
  outOfStockLabel?: string;
  className?: string;
};

export default function VariantSelector({
  options, variants = [], selectedOptions, onSelectOption,
  outOfStockLabel = "Unavailable", className = "",
}: VariantSelectorProps) {
  const groupId = useId();
  return (
    <div className={`${styles.variantSection} ${className}`}>
      {options.map((option) => {
        const selectedValue = optionValue(selectedOptions, option.title) ?? "";
        return (
          <fieldset key={option.id || option.title} className={styles.optionGroup}>
            <legend className={styles.headerRow}>
              <span className={styles.label}>{option.title}</span>
              <span className={styles.currentValue}>{selectedValue}</span>
            </legend>
            <div className={styles.pillGrid}>
              {option.values.map((value) => {
                const selected = selectedValue.trim().toLowerCase() === value.trim().toLowerCase();
                const available = variants.some((variant) =>
                  matchesSelection(variant, { ...selectedOptions, [option.title]: value })
                  && isPurchasableVariant(variant),
                );
                return (
                  <label key={value} className={styles.choice}>
                    <input
                      className={styles.radio}
                      type="radio"
                      name={`${groupId}-${option.id || option.title}`}
                      value={value}
                      checked={selected}
                      aria-label={available ? value : `${value} (${outOfStockLabel})`}
                      onChange={() => onSelectOption(option.title, value)}
                    />
                    <span className={`${styles.pill} ${selected ? styles.pillSelected : available ? styles.pillDefault : styles.pillOutOfStock}`}>
                      {value}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
