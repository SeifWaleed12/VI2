"use client";
import { useId } from "react";
import { Check } from "lucide-react";
import Link from "@/components/LocaleLink";
import { flattenCategories, type Category } from "@/lib/category-tree";
import { message, type Locale } from "@/lib/i18n";
import type { Brand } from "@/types/brand";
import { HEALTH_GOALS, goalLabelKey } from "@/lib/health-goals";
import styles from "./Shop.module.css";

export type FilterSelection = { handle: string; brandIds: string[]; goal: string };
type FilterActions =
  | { linkTo: (value: FilterSelection) => string; onChange?: never }
  | { linkTo?: never; onChange: (value: FilterSelection) => void };

export default function ShopFilters({
  locale,
  categories,
  brands,
  categoryError,
  brandError,
  value,
  onChange,
  linkTo,
  retry,
}: {
  locale: Locale;
  categories: Category[];
  brands: Brand[];
  categoryError: boolean;
  brandError: boolean;
  value: FilterSelection;
  retry: () => void;
} & FilterActions) {
  const group = useId();
  const msg = (key: Parameters<typeof message>[1]) => message(locale, key);
  function choice(
    label: string,
    key: string,
    checked: boolean,
    next: FilterSelection,
    type: "radio" | "checkbox" = "radio",
    accessibleLabel?: string,
    name = group,
  ) {
    if (linkTo)
      return (
        <Link
          key={key}
          href={linkTo(next)}
          className={`${styles.option} ${styles.filterLink} ${checked ? styles.filterSelected : ""}`}
          aria-label={accessibleLabel}
          aria-current={checked ? "true" : undefined}
        >
          <span>{label}</span>
          {checked && <Check size={18} aria-hidden="true" />}
        </Link>
      );
    return (
      <label className={styles.option} key={key}>
        <input
          type={type}
          name={type === "radio" ? name : undefined}
          checked={checked}
          aria-label={accessibleLabel}
          onChange={() => onChange?.(next)}
        />
        <span>{label}</span>
      </label>
    );
  }
  const option = (category: Category) =>
    choice(category.name, category.id, value.handle === category.handle, {
      ...value,
      handle: category.handle,
    });
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
          {choice(
            msg("shop.allInCategory"),
            category.id,
            value.handle === category.handle,
            { ...value, handle: category.handle },
            "radio",
            `${msg("shop.allInCategory")}: ${category.name}`,
          )}
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
    <fieldset className={styles.filterFields}>
      <legend className={styles.srOnly}>{msg("shop.filters")}</legend>
      <fieldset className={styles.filterGroup}>
        <legend>{msg("nav.categories")}</legend>
        {choice(msg("catalog.all"), "all", !value.handle, {
          ...value,
          handle: "",
        })}
        {categoryError ? (
          unavailable("shop.categoriesError")
        ) : categories.length ? (
          categories.map(branch)
        ) : (
          <p className={styles.notice}>{msg("catalog.empty")}</p>
        )}
      </fieldset>
      <fieldset className={styles.filterGroup}>
        <legend>{msg("shop.goal")}</legend>
        {[{ goal: "", label: msg("shop.allGoals") }, ...HEALTH_GOALS.map((goal) => ({ goal, label: msg(goalLabelKey(goal)) }))].map(
          ({ goal, label }) =>
            choice(label, `goal:${goal || "all"}`, value.goal === goal, { ...value, goal }, "radio", undefined, `${group}-goal`),
        )}
      </fieldset>
      <fieldset className={styles.filterGroup}>
        <legend>{msg("nav.brands")}</legend>
        {brandError ? (
          unavailable("shop.brandsError")
        ) : brands.length ? (
          <div className={styles.brandOptions}>
            {brands.map((brand) => {
              const checked = value.brandIds.includes(brand.id);
              return choice(
                brand.name,
                brand.id,
                checked,
                {
                  ...value,
                  brandIds: checked
                    ? value.brandIds.filter((id) => id !== brand.id)
                    : [...value.brandIds, brand.id],
                },
                "checkbox",
              );
            })}
          </div>
        ) : (
          <p className={styles.notice}>{msg("shop.noBrands")}</p>
        )}
      </fieldset>
    </fieldset>
  );
}
