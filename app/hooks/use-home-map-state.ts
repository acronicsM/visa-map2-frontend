"use client";

import {
  useCallback,
  useDebugValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ALL_AFFORDABILITY_BAND_KEYS,
  type AffordabilityBandKey,
  type MapColorMode,
  type TravelSpendingTier,
} from "../types/map";
import type { MatchingCountryRow } from "../types/matching-country";
import type { TravelCostScoreBands } from "../lib/travel-cost-score-bands";
import { getSeasonFilterRowPresentation } from "../lib/season-colors";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Включить в `.env.local`: `NEXT_PUBLIC_DEBUG_TRAVEL_COST_SCORE_BANDS=true` — логи по `/travel-costs/score-bands`. */
const DEBUG_TRAVEL_COST_SCORE_BANDS =
  process.env.NEXT_PUBLIC_DEBUG_TRAVEL_COST_SCORE_BANDS === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_TRAVEL_COST_SCORE_BANDS === "1";

export type TravelCostScoreBandsStatus = "pending" | "ok" | "error";

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
  const [travelSpendingTier, setTravelSpendingTier] =
    useState<TravelSpendingTier>("normal");
  const [activeAffordabilityBands, setActiveAffordabilityBands] = useState<
    Set<AffordabilityBandKey>
  >(() => new Set());
  const [mapColorMode, setMapColorModeState] = useState<MapColorMode>("citizenship");
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
  const [matchingCountries, setMatchingCountries] = useState<
    MatchingCountryRow[]
  >([]);
  const [matchingListReady, setMatchingListReady] = useState(false);
  const [countryMetaByIso, setCountryMetaByIso] = useState<
    Map<string, { name_ru: string; flag_emoji?: string | null }>
  >(() => new Map());
  const [travelCostScores, setTravelCostScores] = useState<Record<string, number>>({});
  const [travelCostScoreBands, setTravelCostScoreBands] =
    useState<TravelCostScoreBands | null>(null);
  const [travelCostScoreBandsStatus, setTravelCostScoreBandsStatus] =
    useState<TravelCostScoreBandsStatus>("pending");
  const scoreBandsSlowLoggedRef = useRef(false);

  useDebugValue(travelCostScoreBandsStatus, (s) => `score-bands: ${s}`);

  const setMapColorMode = useCallback((mode: MapColorMode) => {
    setMapColorModeState(mode);
  }, []);

  /** При первом входе в режим «бюджет» включаем все полосы, если список пуст. Смена только полос без смены режима не трогает набор. */
  const prevMapColorModeRef = useRef<MapColorMode>("citizenship");

  useEffect(() => {
    const prev = prevMapColorModeRef.current;
    if (mapColorMode === "budget" && prev !== "budget") {
      setActiveAffordabilityBands((bands) =>
        bands.size > 0 ? bands : new Set(ALL_AFFORDABILITY_BAND_KEYS),
      );
    }
    prevMapColorModeRef.current = mapColorMode;
  }, [mapColorMode]);

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
    const url = `${API_URL}/travel-costs/score-bands`;
    void fetch(url)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data: TravelCostScoreBands) => {
        if (cancelled) return;
        const okShape =
          data &&
          Array.isArray(data.thresholds) &&
          Array.isArray(data.labels) &&
          Array.isArray(data.colors);
        if (okShape) {
          setTravelCostScoreBands(data);
          setTravelCostScoreBandsStatus("ok");
          if (DEBUG_TRAVEL_COST_SCORE_BANDS) {
            // eslint-disable-next-line no-console
            console.info(
              "[travel-costs/score-bands] OK",
              {
                thresholds: data.thresholds,
                labelsCount: data.labels.length,
              },
              url,
            );
          }
        } else {
          setTravelCostScoreBands(null);
          setTravelCostScoreBandsStatus("error");
          if (DEBUG_TRAVEL_COST_SCORE_BANDS) {
            // eslint-disable-next-line no-console
            console.warn(
              "[travel-costs/score-bands] неверная форма ответа, пороги недоступны (fallback на клиенте)",
              data,
              url,
            );
          }
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTravelCostScoreBands(null);
        setTravelCostScoreBandsStatus("error");
        if (DEBUG_TRAVEL_COST_SCORE_BANDS) {
          const msg = err instanceof Error ? err.message : String(err);
          // eslint-disable-next-line no-console
          console.warn(
            "[travel-costs/score-bands] запрос не удался, пороги недоступны (fallback на клиенте):",
            msg,
            url,
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Пока `fetch` в полёте, `travelCostScoreBands === null` — на карте временно DEFAULT; это не ошибка. */
  useEffect(() => {
    if (!DEBUG_TRAVEL_COST_SCORE_BANDS || travelCostScoreBandsStatus !== "pending") {
      return;
    }
    const t = window.setTimeout(() => {
      if (scoreBandsSlowLoggedRef.current) {
        return;
      }
      scoreBandsSlowLoggedRef.current = true;
      // eslint-disable-next-line no-console
      console.warn(
        "[travel-costs/score-bands] ответ ещё не пришёл (~1.5s): карта может кратко использовать клиентский DEFAULT. " +
          "Проверьте сеть и что API доступен по",
        `${API_URL}/travel-costs/score-bands`,
      );
    }, 1500);
    return () => window.clearTimeout(t);
  }, [travelCostScoreBandsStatus]);

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

  const handleMatchingIso2sChange = useCallback((rows: MatchingCountryRow[]) => {
    setMatchingCountries(rows);
    setMatchingListReady(true);
  }, []);

  const handlePassportChange = useCallback((iso2: string) => {
    setPassport(iso2);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!passport.trim()) {
      queueMicrotask(() => {
        if (!cancelled) setTravelCostScores({});
      });
      return () => {
        cancelled = true;
      };
    }
    void fetch(
      `${API_URL}/travel-costs/${passport}?budget_tier=${travelSpendingTier}`,
    )
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
  }, [passport, travelSpendingTier]);

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

  const handleTravelSpendingTierChange = useCallback((tier: TravelSpendingTier) => {
    setTravelSpendingTier(tier);
  }, []);

  const handleToggleAffordabilityBand = useCallback(
    (key: AffordabilityBandKey) => {
      setActiveAffordabilityBands((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
      setMapColorMode("budget");
      setColoringEnabled(true);
    },
    [setMapColorMode],
  );

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
    travelSpendingTier,
    activeAffordabilityBands,
    mapColorMode,
    seasonMonth,
    distinctSeasonKeys,
    activeSeasonTypes,
    coloringEnabled,
    sidebarOpen,
    activeVacationTypes,
    selectedDepartureCities,
    matchingCountries,
    matchingListReady,
    countryMetaByIso,
    travelCostScores,
    travelCostScoreBands,
    travelCostScoreBandsStatus,
    seasonFilterRows,
    setSidebarOpen,
    setMapColorMode,
    handlePassportChange,
    handleSeasonMonthChange,
    onSeasonDistinctKeysLoaded,
    handleMatchingIso2sChange,
    handleToggleCategory,
    handleToggleSafetyLevel,
    handleTravelSpendingTierChange,
    handleToggleAffordabilityBand,
    handleToggleSeasonType,
    handleToggleVacationType,
    handleToggleDepartureCity,
    setColoringEnabled,
  };
}
