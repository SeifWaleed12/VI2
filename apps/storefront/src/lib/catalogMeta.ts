import type { Product } from "@/types/product";

export const healthGoals = [
  "All Goals",
  "Immune Support",
  "Gut Health",
  "Muscle & Recovery",
  "Energy & Fitness",
  "Heart Health",
  "Stress & Sleep",
  "Daily Wellness",
] as const;

export const productForms = [
  "All Forms",
  "Powder",
  "Tablets",
  "Capsules",
  "Softgels",
] as const;

const goalsBySlug: Record<string, string[]> = {
  "for-him-multivitamin": [
    "Daily Wellness",
    "Energy & Fitness",
  ],
  "nutri-nations-creatine": [
    "Muscle & Recovery",
    "Energy & Fitness",
  ],
  "nutri-nations-glutamine": [
    "Muscle & Recovery",
    "Gut Health",
  ],
  "omega-x": [
    "Heart Health",
    "Daily Wellness",
  ],
  "whey-x": [
    "Muscle & Recovery",
    "Energy & Fitness",
  ],
  "doctors-best-high-absorption-magnesium": [
    "Stress & Sleep",
    "Muscle & Recovery",
    "Daily Wellness",
  ],
  "now-foods-omega-3-200-softgels": [
    "Heart Health",
    "Daily Wellness",
  ],
  "california-gold-vitamin-d3-5000": [
    "Immune Support",
    "Daily Wellness",
  ],
  "now-foods-ultra-omega-3": [
    "Heart Health",
    "Daily Wellness",
  ],
  "california-gold-collagenup-206g": [
    "Daily Wellness",
    "Muscle & Recovery",
  ],
  "california-gold-gold-c-vitamin-c-1000": [
    "Immune Support",
    "Daily Wellness",
  ],
  "now-foods-zinc-picolinate-50": [
    "Immune Support",
    "Daily Wellness",
  ],
  "now-foods-creatine-capsules": [
    "Muscle & Recovery",
    "Energy & Fitness",
  ],
  "now-foods-ashwagandha-450": [
    "Stress & Sleep",
    "Daily Wellness",
  ],
  "california-gold-lactobif-30": [
    "Gut Health",
    "Daily Wellness",
  ],
  "california-gold-coq10-100": [
    "Heart Health",
    "Energy & Fitness",
  ],
  "optimum-nutrition-gold-standard-whey-chocolate-malt": [
    "Muscle & Recovery",
    "Energy & Fitness",
  ],
};

export function getProductHealthGoals(
  product: Product,
) {
  return (
    goalsBySlug[product.slug] ??
    (product.category === "Protein" ||
    product.category === "Creatine"
      ? ["Muscle & Recovery", "Energy & Fitness"]
      : product.category === "Vitamins"
        ? ["Daily Wellness", "Immune Support"]
        : ["Daily Wellness"])
  );
}

export function getProductForm(
  product: Product,
) {
  const text = [
    product.name,
    product.shortName,
    product.size ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (
    text.includes("powder") ||
    text.includes(" g") ||
    product.category === "Protein" ||
    product.category === "Creatine"
  ) {
    if (
      text.includes("capsule") ||
      text.includes("softgel")
    ) {
      // Continue to the more specific checks below.
    } else {
      return "Powder";
    }
  }

  if (text.includes("softgel")) {
    return "Softgels";
  }

  if (
    text.includes("capsule") ||
    text.includes("caps")
  ) {
    return "Capsules";
  }

  if (text.includes("tablet")) {
    return "Tablets";
  }

  return "Capsules";
}

export function getProductDietaryTags(
  product: Product,
) {
  const text = [
    product.name,
    product.size ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const tags: string[] = [];

  if (
    text.includes("veggie") ||
    text.includes("vegetarian")
  ) {
    tags.push("Vegetarian");
  }

  if (text.includes("unflavored")) {
    tags.push("Unflavored");
  }

  return tags;
}

export function getStockLabel(
  product: Product,
) {
  if (product.stock <= 0) {
    return "OUT OF STOCK";
  }

  if (product.stock <= 8) {
    return `ONLY ${product.stock} LEFT`;
  }

  return "IN STOCK";
}

export function matchesGoal(
  product: Product,
  goal: string,
) {
  return (
    goal === "All Goals" ||
    getProductHealthGoals(product).includes(goal)
  );
}

export function matchesForm(
  product: Product,
  form: string,
) {
  return (
    form === "All Forms" ||
    getProductForm(product) === form
  );
}
