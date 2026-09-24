import { medusa } from "../client";

export type StoreRegionCountry = {
  id?: string;
  iso_2?: string;
  iso_3?: string;
  name?: string;
  display_name?: string;
  region_id?: string;
};

export type StoreRegion = {
  id: string;
  name: string;
  currency_code: string;
  countries?: StoreRegionCountry[];
  metadata?: Record<string, unknown> | null;
};

export async function getRegions(): Promise<StoreRegion[]> {
  try {
    const { regions } = await medusa.store.region.list();
    return (regions || []) as unknown as StoreRegion[];
  } catch (error) {
    console.error("Failed to retrieve regions from Medusa:", error);
    return [];
  }
}

export async function getRegion(id: string): Promise<StoreRegion | null> {
  try {
    const { region } = await medusa.store.region.retrieve(id);
    return (region || null) as unknown as StoreRegion | null;
  } catch (error) {
    console.error(`Failed to retrieve region "${id}" from Medusa:`, error);
    return null;
  }
}
