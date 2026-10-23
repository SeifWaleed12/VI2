import type { ProductOption, ProductVariant } from "@/types/product";

const normalized = (value: string) => value.trim().toLowerCase();

export function optionValue(options: Record<string, string>, title: string): string | undefined {
  return Object.entries(options).find(([key]) => normalized(key) === normalized(title))?.[1];
}

// Every displayed choice must belong to this exact native variant.
export function matchesSelection(variant: ProductVariant, selection: Record<string, string>): boolean {
  return Object.entries(selection).every(([title, value]) => {
    const actual = optionValue(variant.options ?? {}, title);
    return actual !== undefined && normalized(actual) === normalized(value);
  });
}

export function initialSelection(options: ProductOption[], variants: ProductVariant[]): Record<string, string> {
  const first = variants.find((variant) => options.every((option) => {
    const value = optionValue(variant.options ?? {}, option.title);
    return value !== undefined && option.values.some((candidate) => normalized(candidate) === normalized(value));
  }));
  return Object.fromEntries(options.map((option) => {
    const actual = first && optionValue(first.options ?? {}, option.title);
    return [option.title, option.values.find((value) => actual !== undefined && normalized(value) === normalized(actual)) ?? option.values[0] ?? ""];
  }));
}
