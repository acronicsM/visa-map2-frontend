"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapColorMode } from "../types/map";
import type { TravelCostScoreBands } from "../lib/travel-cost-score-bands";
import { getSeasonFilterRowPresentation } from "../lib/season-colors";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ALL_CATEGORIES = new Set(["free", "evisa", "voa", "embassy", "unavailable"]);
const ALL_SAFETY_LEVELS = new Set(["safe", "unsafe", "dangerous"]);
const ALL_VACATION_TYPES = new Set([
  "beach",
  "mountain",
  "nature",
  "culture",
  "food",
  "exotic",
]);

interface CountryShortApi {
  iso2: string;
  name_ru?: string | null;
  flag_emoji?: string | null;
}

export function useHomeMapState() {
  const [passport, setPassport] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set(ALL_CATEGORIES),
  );
  const [activeSafetyLevels, setActiveSafetyLevels] = useState<Set<string>>(
    () => new Set(ALL_SAFETY_LEVELS),
  );
  const [budgetTier, setBudgetTier] = useState<string | null>(null);
  const [mapColorMode, setMapColorMode] = useState<MapColorMode>("citizenship");
  const [seasonMonth, setSeasonMonth] = useState(() => new Date().getMonth() + 1);
  const [distinctSeasonKeys, setDistinctSeasonKeys] = useState<string[]>([]);
  const [activeSeasonTypes, setActiveSeasonTypes] = useState<Set<string>>(
    () => new Set(),
  );
  const [coloringEnabled, setColoringEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [activeVacationTypes, setActiveVacationTypes] = useState<Set<string>>(
    () => new Set(ALL_VACATION_TYPES),
  );
  const [selectedDepartureCities, setSelectedDepartureCities] = useState<
    Set<string>
  >(() => new Set());
  const [matchingIso2s, setMatchingIso2s] = useState<string[]>([]);
  const [matchingListReady, setMatchingListReady] = useState(false);
  const [countryMetaByIso, setCountryMetaByIso] = useState<
    Map<string, { name_ru: string; flag_emoji?: string | null }>
  >(() => new Map());
  const [travelCostScores, setTravelCostScores] = useState<Record<string, number>>({});
  const [travelCostScoreBands, setTravelCostScoreBands] =
    useState<TravelCostScoreBands | null>(null);

  const seasonMonthRef = useRef(seasonMonth);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_URL}/countries`)
      .then((r) => r.json())
      .then((data: CountryShortApi[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const meta = new Map<string, { name_ru: string; flag_emoji?: string | null }>();
        for (const row of data) {
          const iso = String(row.iso2 ?? "").trim().toUpperCase();
          if (!iso) continue;
          const nameRu = String(row.name_ru ?? "").trim() || iso;
          meta.set(iso, { name_ru: nameRu, flag_emoji: row.flag_emoji ?? null });
        }
        setCountryMetaByIso(meta);
      })
      .catch(() => {
        if (!cancelled) {
          setCountryMetaByIso(new Map());
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_URL}/travel-costs/score-bands`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: TravelCostScoreBands) => {
        if (cancelled) return;
        if (
          data &&
          Array.isArray(data.thresholds) &&
          Array.isArray(data.labels) &&
          Array.isArray(data.colors)
        ) {
          setTravelCostScoreBands(data);
        } else {
          setTravelCostScoreBands(null);
        }
      })
      .catch(() => {
        if (!cancelled) setTravelCostScoreBands(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    seasonMonthRef.current = seasonMonth;
  }, [seasonMonth]);

  const handleSeasonMonthChange = useCallback((month: number) => {
    setSeasonMonth(month);
  }, []);

  const onSeasonDistinctKeysLoaded = useCallback((loadedMonth: number, keys: string[]) => {
    if (loadedMonth !== seasonMonthRef.current) return;
    setDistinctSeasonKeys(keys);
    setActiveSeasonTypes(new Set(keys));
  }, []);

  const seasonFilterRows = useMemo(
    () =>
      distinctSeasonKeys.map((k) => ({
        key: k,
        ...getSeasonFilterRowPresentation(k),
      })),
    [distinctSeasonKeys],
  );

  const handleMatchingIso2sChange = useCallback((iso2s: string[]) => {
    setMatchingIso2s(iso2s);
    setMatchingListReady(true);
  }, []);

  const handlePassportChange = useCallback((iso2: string) => {
    setPassport(iso2);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!budgetTier || !passport.trim()) {
      queueMicrotask(() => {
        if (!cancelled) setTravelCostScores({});
      });
      return () => {
        cancelled = true;
      };
    }
    void fetch(`${API_URL}/travel-costs/${passport}?budget_tier=${budgetTier}`)
      .then((r) => r.json())
      .then((data: { scores: Record<string, number> }) => {
        if (!cancelled) setTravelCostScores(data.scores ?? {});
      })
      .catch(() => {
        if (!cancelled) setTravelCostScores({});
      });
    return () => {
      cancelled = true;
    };
  }, [passport, budgetTier]);

  const handleToggleCategory = useCallback((key: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleToggleSafetyLevel = useCallback((key: string) => {
    setActiveSafetyLevels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleBudgetTierChange = useCallback((tier: string | null) => {
    setBudgetTier(tier);
    if (tier) {
      setMapColorMode("budget");
      setColoringEnabled(true);
    }
  }, []);

  const handleToggleSeasonType = useCallback((key: string) => {
    setActiveSeasonTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleToggleVacationType = useCallback((key: string) => {
    setActiveVacationTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleToggleDepartureCity = useCallback((city: string) => {
    setSelectedDepartureCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
      return next;
    });
  }, []);

  return {
    passport,
    activeCategories,
    activeSafetyLevels,
    budgetTier,
    mapColorMode,
    seasonMonth,
    distinctSeasonKeys,
    activeSeasonTypes,
    coloringEnabled,
    sidebarOpen,
    activeVacationTypes,
    selectedDepartureCities,
    matchingIso2s,
    matchingListReady,
    countryMetaByIso,
    travelCostScores,
    travelCostScoreBands,
    seasonFilterRows,
    setSidebarOpen,
    setMapColorMode,
    handlePassportChange,
    handleSeasonMonthChange,
    onSeasonDistinctKeysLoaded,
    handleMatchingIso2sChange,
    handleToggleCategory,
    handleToggleSafetyLevel,
    handleBudgetTierChange,
    handleToggleSeasonType,
    handleToggleVacationType,
    handleToggleDepartureCity,
    setColoringEnabled,
  };
}
