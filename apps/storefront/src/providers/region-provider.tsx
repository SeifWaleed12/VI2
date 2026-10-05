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
import { getRegions, selectRegion, type StoreRegion } from "@/lib/medusa/services/regions";

const REGION_STORAGE_KEY = "vi2-region-id";
const DEFAULT_FALLBACK_REGION_ID =
  process.env.NEXT_PUBLIC_MEDUSA_REGION_ID ||
  "";

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

      const configured = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID;
      const validStored = fetchedRegions.some((r) => r.id === targetId) ? targetId : undefined;
      const activeId = selectRegion(fetchedRegions, configured || validStored || undefined).id;
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
    refreshRegion();
  }, [refreshRegion]);

  const setRegion = useCallback(
    (newRegionId: string) => {
      selectRegion(regions, newRegionId);
      setRegionIdState(newRegionId);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(REGION_STORAGE_KEY, newRegionId);
        } catch {}
      }
    },
    [regions],
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
