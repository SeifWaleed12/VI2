import { medusa } from "../client";
import type { Brand } from "@/types/brand";

export async function getBrands(): Promise<Brand[]> {
  try {
    const data = await medusa.client.fetch<{ brands: Brand[] }>("/store/brands", {
      method: "GET",
    });
    return data?.brands || [];
  } catch (error) {
    console.warn("Failed to fetch brands from Medusa backend:", error);
    return [];
  }
}

export async function getBrand(idOrSlug: string): Promise<Brand | null> {
  try {
    const data = await medusa.client.fetch<{ brand: Brand }>(`/store/brands/${encodeURIComponent(idOrSlug)}`, {
      method: "GET",
    });
    return data?.brand || null;
  } catch (error) {
    console.warn(`Failed to fetch brand "${idOrSlug}" from Medusa:`, error);
    return null;
  }
}
