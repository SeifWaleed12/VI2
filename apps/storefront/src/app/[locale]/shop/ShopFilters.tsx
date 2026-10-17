"use client";
import { useId } from "react";
import type { Category } from "@/lib/category-tree";
import { flattenCategories } from "@/lib/category-tree";
import { message, type Locale } from "@/lib/i18n";
import type { Brand } from "@/types/brand";
import styles from "./Shop.module.css";

export type FilterSelection = { handle: string; brandIds: string[] };
export default function ShopFilters({
  locale,
  categories,
  brands,
  categoryError,
  brandError,
  value,
  onChange,
  retry,
  disabled,
}: {
  locale: Locale;
  categories: Category[];
  brands: Brand[];
  categoryError: boolean;
  brandError: boolean;
  value: FilterSelection;
  onChange: (value: FilterSelection) => void;
  retry: () => void;
  disabled?: boolean;
}) {
  const group = useId();
  const msg = (key: Parameters<typeof message>[1]) => message(locale, key);
  const option = (category: Category) => (
    <label className={styles.option} key={category.id}>
      <input
        type="radio"
        name={group}
        checked={value.handle === category.handle}
        onChange={() => onChange({ ...value, handle: category.handle })}
      />
      <span>{category.name}</span>
    </label>
  );
  const branch = (category: Category) =>
    category.children.length ? (
      <details
        key={category.id}
        className={styles.categoryBranch}
        open={
          flattenCategories([category]).some(
            (item) => item.handle === value.handle,
          ) || undefined
        }
      >
        <summary>{category.name}</summary>
        <div className={styles.children}>
          <label className={styles.option}>
            <input
              type="radio"
              name={group}
              aria-label={`${msg("shop.allInCategory")}: ${category.name}`}
              checked={value.handle === category.handle}
              onChange={() => onChange({ ...value, handle: category.handle })}
            />
            <span>{msg("shop.allInCategory")}</span>
          </label>
          {category.children.map(branch)}
        </div>
      </details>
    ) : (
      option(category)
    );
  const unavailable = (key: "shop.categoriesError" | "shop.brandsError") => (
    <div className={styles.directoryNotice} role="status">
      <p>{msg(key)}</p>
      <button type="button" onClick={retry}>
        {msg("catalog.retry")}
      </button>
    </div>
  );
  return (
    <fieldset className={styles.filterFields} disabled={disabled}>
      <legend className={styles.srOnly}>{msg("shop.filters")}</legend>
      <fieldset className={styles.filterGroup}>
        <legend>{msg("nav.categories")}</legend>
        <label className={styles.option}>
          <input
            type="radio"
            name={group}
            checked={!value.handle}
            onChange={() => onChange({ ...value, handle: "" })}
          />
          <span>{msg("catalog.all")}</span>
        </label>
        {categoryError ? (
          unavailable("shop.categoriesError")
        ) : categories.length ? (
          categories.map(branch)
        ) : (
          <p className={styles.notice}>{msg("catalog.empty")}</p>
        )}
      </fieldset>
      <fieldset className={styles.filterGroup}>
        <legend>{msg("nav.brands")}</legend>
        {brandError ? (
          unavailable("shop.brandsError")
        ) : brands.length ? (
          <div className={styles.brandOptions}>
            {brands.map((brand) => (
              <label className={styles.option} key={brand.id}>
                <input
                  type="checkbox"
                  checked={value.brandIds.includes(brand.id)}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      brandIds: event.target.checked
                        ? [...value.brandIds, brand.id]
                        : value.brandIds.filter((id) => id !== brand.id),
                    })
                  }
                />
                <span>{brand.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className={styles.notice}>{msg("shop.noBrands")}</p>
        )}
      </fieldset>
    </fieldset>
  );
}
