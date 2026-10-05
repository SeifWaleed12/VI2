import { medusa } from "../client";
import type { Brand } from "@/types/brand";

export async function getBrands(): Promise<Brand[]> {
  try {
    const data = await medusa.client.fetch<{ brands: Brand[] }>("/store/brands", {
      method: "GET",
    });
    return data?.brands || [];
  } catch {
    throw new Error("Brands temporarily unavailable.");
  }
}

export async function getBrand(idOrSlug: string): Promise<Brand | null> {
  try {
    const data = await medusa.client.fetch<{ brand: Brand }>(`/store/brands/${encodeURIComponent(idOrSlug)}`, {
      method: "GET",
    });
    return data?.brand || null;
  } catch {
    throw new Error("Brand temporarily unavailable.");
  }
}
