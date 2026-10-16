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

export function selectRegion(regions: StoreRegion[], configuredId?: string): StoreRegion {
  const eligible = regions.filter((r) => r.currency_code.toLowerCase() === "egp" && r.countries?.some((c) => c.iso_2?.toLowerCase() === "eg"));
  const region = configuredId ? eligible.find((r) => r.id === configuredId) : eligible.length === 1 ? eligible[0] : undefined;
  if (!region) throw new Error("An Egyptian EGP region must be configured in Medusa.");
  return region;
}

// Every product and cart call needs the region first; share one lookup between them.
// shortcut: a region added in Medusa shows up after the TTL, not at once; an empty
// answer (Medusa down) is never kept, so the next call asks again.
const REGION_TTL_MS = 60_000;
let cachedRegions: { at: number; regions: Promise<StoreRegion[]> } | undefined;

function sharedRegions(): Promise<StoreRegion[]> {
  if (!cachedRegions || Date.now() - cachedRegions.at > REGION_TTL_MS) {
    const regions = getRegions();
    cachedRegions = { at: Date.now(), regions };
    void regions.then((list) => {
      if (!list.length && cachedRegions?.regions === regions) cachedRegions = undefined;
    });
  }
  return cachedRegions.regions;
}

export async function resolveRegionId(id?: string): Promise<string> {
  return selectRegion(await sharedRegions(), id || process.env.NEXT_PUBLIC_MEDUSA_REGION_ID).id;
}
