"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getRegions, type StoreRegion } from "@/lib/medusa/services/regions";

const REGION_STORAGE_KEY = "vi2-region-id";
const DEFAULT_FALLBACK_REGION_ID =
  process.env.NEXT_PUBLIC_MEDUSA_REGION_ID ||
  "reg_01M329WR0PPZ3Z6FXFE87D9ABJ";

type RegionContextValue = {
  region: StoreRegion | null;
  regionId: string;
  regions: StoreRegion[];
  loading: boolean;
  setRegion: (regionId: string) => void;
  refreshRegion: () => Promise<void>;
};

const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ children }: { children: ReactNode }) {
  const [regions, setRegions] = useState<StoreRegion[]>([]);
  const [regionId, setRegionIdState] = useState<string>(
    DEFAULT_FALLBACK_REGION_ID,
  );
  const [loading, setLoading] = useState<boolean>(true);

  const refreshRegion = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedRegions = await getRegions();
      setRegions(fetchedRegions);

      let targetId: string | null = null;
      if (typeof window !== "undefined") {
        targetId = window.localStorage.getItem(REGION_STORAGE_KEY);
      }

      if (!targetId && fetchedRegions.length > 0) {
        // Look for Egypt / default region or take the first
        const egyptRegion = fetchedRegions.find(
          (r) =>
            r.currency_code?.toLowerCase() === "egp" ||
            r.countries?.some(
              (c: { iso_2?: string }) => c.iso_2?.toLowerCase() === "eg",
            ),
        );
        targetId = egyptRegion?.id || fetchedRegions[0]?.id || null;
      }

      const activeId = targetId || DEFAULT_FALLBACK_REGION_ID;
      setRegionIdState(activeId);

      if (typeof window !== "undefined" && targetId) {
        window.localStorage.setItem(REGION_STORAGE_KEY, activeId);
      }
    } catch (err) {
      console.error("RegionProvider failed to load regions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial mount hydration
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(REGION_STORAGE_KEY);
      if (stored) {
        setRegionIdState(stored);
      }
    }

    refreshRegion();
  }, [refreshRegion]);

  const setRegion = useCallback(
    (newRegionId: string) => {
      setRegionIdState(newRegionId);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(REGION_STORAGE_KEY, newRegionId);
        } catch {}
      }
    },
    [],
  );

  const activeRegion = useMemo(() => {
    return regions.find((r) => r.id === regionId) || null;
  }, [regions, regionId]);

  const value = useMemo<RegionContextValue>(
    () => ({
      region: activeRegion,
      regionId,
      regions,
      loading,
      setRegion,
      refreshRegion,
    }),
    [activeRegion, regionId, regions, loading, setRegion, refreshRegion],
  );

  return (
    <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
  );
}

export function useRegion(): RegionContextValue {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error("useRegion must be used within a RegionProvider");
  }
  return context;
}
