import { cache } from "react";
import { getCategoryTree } from "./services/categories";
import type { Locale } from "@/lib/i18n";
import type { CategoryDirectory } from "@/lib/category-tree";
// React cache deduplicates within the render request, with locale as part of its identity.
export const loadCategoryDirectory = cache(
  async (locale: Locale): Promise<CategoryDirectory> => {
    try {
      return { roots: await getCategoryTree(locale), error: false };
    } catch {
      return { roots: [], error: true };
    }
  },
);
