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
  type BudgetFilterMode,
  type ExactBudgetData,
  type MapColorMode,
  type TravelCurrencyListResponse,
  type TravelFxRateResponse,
  type TravelSpendingTier,
} from "../types/map";
import type { MatchingCountryRow } from "../types/matching-country";
import type { TravelCostScoreBands } from "../lib/travel-cost-score-bands";
import {
  budgetCurrencySelectionFromList,
  DEFAULT_BUDGET_CURRENCY,
  normalizeBudgetCurrency,
} from "../lib/budget-currency";
import { fetchJsonDeduped } from "../lib/json-fetch-dedupe";
import { prefetchPassportBootstrap } from "../lib/passport-bootstrap-prefetch";
import { getSeasonFilterRowPresentation } from "../lib/season-colors";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = API_URL.replace(/\/$/, "");

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

const DEFAULT_EXACT_TRIP_DAYS = "10";

interface CountryShortApi {
  iso2: string;
  name_ru?: string | null;
  flag_emoji?: string | null;
}

function toFiniteNumber(value: string): number | null {
  const normalized = String(value).replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatDefaultBudgetAmount(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value));
}

async function fetchUsdToCurrencyRate(currency: string): Promise<number | null> {
  const code = normalizeBudgetCurrency(currency);
  if (code === DEFAULT_BUDGET_CURRENCY) return 1;
  const url = `${API_BASE}/travel-costs/fx-rate?currency=${encodeURIComponent(code)}`;
  const res = await fetchJsonDeduped(url);
  if (!res.ok || res.data == null || typeof res.data !== "object") return null;
  const data = res.data as TravelFxRateResponse;
  const rate = Number(data.rate);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function exactAffordabilityBand(
  dailyBudgetUsd: number,
  costs: ExactBudgetData["daily_costs"][string],
): AffordabilityBandKey | null {
  const cheap = costs.cheap;
  const normal = costs.normal;
  const expensive = costs.expensive;
  if (cheap == null || normal == null || expensive == null) return null;
  if (dailyBudgetUsd < cheap) return "beyond_budget";
  if (dailyBudgetUsd < normal) return "skimp";
  if (dailyBudgetUsd < expensive) return "comfort";
  return "carefree";
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
  const [budgetFilterMode, setBudgetFilterMode] =
    useState<BudgetFilterMode>("tier");
  const [exactBudgetAmount, setExactBudgetAmountState] = useState("");
  const [exactBudgetDays, setExactBudgetDays] = useState(DEFAULT_EXACT_TRIP_DAYS);
  const [exactBudgetCurrency, setExactBudgetCurrency] = useState(
    DEFAULT_BUDGET_CURRENCY,
  );
  const [availableBudgetCurrencies, setAvailableBudgetCurrencies] = useState<
    string[]
  >([DEFAULT_BUDGET_CURRENCY]);
  const [usdToBudgetCurrencyRate, setUsdToBudgetCurrencyRate] = useState<
    number | null
  >(1);
  const [exactBudgetData, setExactBudgetData] = useState<ExactBudgetData | null>(null);
  const [travelCostScoreBands, setTravelCostScoreBands] =
    useState<TravelCostScoreBands | null>(null);
  const [travelCostScoreBandsStatus, setTravelCostScoreBandsStatus] =
    useState<TravelCostScoreBandsStatus>("pending");
  const scoreBandsSlowLoggedRef = useRef(false);
  /** Только последний ответ FX по `exactBudgetCurrency` (без гонки двух fetch). */
  const fxRateFetchSeqRef = useRef(0);
  /** Конвертация суммы после смены валюты (см. один `fetch` в useEffect). */
  const pendingBudgetConversionRef = useRef<{
    amount: number;
    fromRate: number;
  } | null>(null);
  /** Пользователь очистил сумму — не подставлять снова доход из API (см. useEffect ниже). */
  const suppressExactBudgetIncomeAutofillRef = useRef(false);

  const setExactBudgetAmount = useCallback((value: string) => {
    setExactBudgetAmountState(value);
    suppressExactBudgetIncomeAutofillRef.current = value.trim() === "";
  }, []);

  useDebugValue(travelCostScoreBandsStatus, (s) => `score-bands: ${s}`);

  const setMapColorMode = useCallback((mode: MapColorMode) => {
    setMapColorModeState(mode);
    if (mode === "budget") {
      setActiveAffordabilityBands((bands) =>
        bands.size > 0 ? bands : new Set(ALL_AFFORDABILITY_BAND_KEYS),
      );
    }
  }, []);

  const seasonMonthRef = useRef(seasonMonth);

  useEffect(() => {
    let cancelled = false;
    void fetchJsonDeduped(`${API_BASE}/countries`)
      .then((res) => {
        if (cancelled || !res.ok) return;
        const data = res.data;
        if (!Array.isArray(data)) return;
        const meta = new Map<string, { name_ru: string; flag_emoji?: string | null }>();
        for (const row of data as CountryShortApi[]) {
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
    const url = `${API_BASE}/travel-costs/score-bands`;
    void fetchJsonDeduped(url)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = res.data as TravelCostScoreBands;
        const okShape =
          data &&
          Array.isArray(data.thresholds) &&
          Array.isArray(data.labels) &&
          Array.isArray(data.colors);
        if (okShape) {
          setTravelCostScoreBands(data);
          setTravelCostScoreBandsStatus("ok");
          if (DEBUG_TRAVEL_COST_SCORE_BANDS) {
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
      console.warn(
        "[travel-costs/score-bands] ответ ещё не пришёл (~1.5s): карта может кратко использовать клиентский DEFAULT. " +
          "Проверьте сеть и что API доступен по",
        `${API_BASE}/travel-costs/score-bands`,
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

  const warmPassportCaches = useCallback((iso2: string) => {
    prefetchPassportBootstrap(API_BASE, iso2, travelSpendingTier);
  }, [travelSpendingTier]);

  const handlePassportChange = useCallback((iso2: string) => {
    setPassport(iso2);
    suppressExactBudgetIncomeAutofillRef.current = false;
    setExactBudgetAmountState("");
    setExactBudgetDays(DEFAULT_EXACT_TRIP_DAYS);
    setExactBudgetData(null);
    pendingBudgetConversionRef.current = null;
    setExactBudgetCurrency(DEFAULT_BUDGET_CURRENCY);
    setUsdToBudgetCurrencyRate(1);
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
    const isoUpper = passport.trim().toUpperCase();
    const scoresUrl = `${API_BASE}/travel-costs/${encodeURIComponent(isoUpper)}?budget_tier=${travelSpendingTier}`;
    void fetchJsonDeduped(scoresUrl)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setTravelCostScores({});
          return;
        }
        const data = res.data as { scores?: Record<string, number> };
        setTravelCostScores(data.scores ?? {});
      })
      .catch(() => {
        if (!cancelled) setTravelCostScores({});
      });
    return () => {
      cancelled = true;
    };
  }, [passport, travelSpendingTier]);

  useEffect(() => {
    let cancelled = false;
    const currenciesUrl = passport.trim().length
      ? `${API_BASE}/travel-costs/currencies?home_iso2=${encodeURIComponent(passport.trim().toUpperCase())}`
      : `${API_BASE}/travel-costs/currencies`;
    void fetchJsonDeduped(currenciesUrl)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = res.data as TravelCurrencyListResponse;
        const { available, selectedDefault } = budgetCurrencySelectionFromList(data);
        setAvailableBudgetCurrencies(available);
        setUsdToBudgetCurrencyRate(
          selectedDefault === DEFAULT_BUDGET_CURRENCY ? 1 : null,
        );
        setExactBudgetCurrency(selectedDefault);
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableBudgetCurrencies([DEFAULT_BUDGET_CURRENCY]);
        setUsdToBudgetCurrencyRate(1);
        setExactBudgetCurrency(DEFAULT_BUDGET_CURRENCY);
      });
    return () => {
      cancelled = true;
    };
  }, [passport]);

  useEffect(() => {
    let cancelled = false;
    const iso = passport.trim();
    if (!iso) {
      queueMicrotask(() => {
        if (!cancelled) setExactBudgetData(null);
      });
      return () => {
        cancelled = true;
      };
    }

    const isoEncoded = encodeURIComponent(iso.toUpperCase());
    void fetchJsonDeduped(`${API_BASE}/travel-costs/${isoEncoded}/exact-budget-data`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = res.data as ExactBudgetData;
        if (!cancelled) setExactBudgetData(data);
      })
      .catch(() => {
        if (!cancelled) setExactBudgetData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [passport]);

  useEffect(() => {
    const seq = ++fxRateFetchSeqRef.current;
    let cancelled = false;
    void fetchUsdToCurrencyRate(exactBudgetCurrency)
      .then((rate) => {
        if (cancelled || seq !== fxRateFetchSeqRef.current) return;
        setUsdToBudgetCurrencyRate(rate);
        const pending = pendingBudgetConversionRef.current;
        if (
          pending != null &&
          rate != null &&
          rate > 0 &&
          pending.fromRate > 0
        ) {
          const amountUsd = pending.amount / pending.fromRate;
          suppressExactBudgetIncomeAutofillRef.current = false;
          setExactBudgetAmountState(formatDefaultBudgetAmount(amountUsd * rate));
          pendingBudgetConversionRef.current = null;
        }
      })
      .catch(() => {
        if (cancelled || seq !== fxRateFetchSeqRef.current) return;
        setUsdToBudgetCurrencyRate(null);
        pendingBudgetConversionRef.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, [exactBudgetCurrency]);

  const resetExactBudgetDefaults = useCallback(() => {
    suppressExactBudgetIncomeAutofillRef.current = false;
    setExactBudgetDays(DEFAULT_EXACT_TRIP_DAYS);
    const incomeDailyUsd = exactBudgetData?.income_daily_usd;
    const rate =
      exactBudgetCurrency === DEFAULT_BUDGET_CURRENCY
        ? 1
        : usdToBudgetCurrencyRate;
    setExactBudgetAmountState(
      incomeDailyUsd == null || rate == null
        ? ""
        : formatDefaultBudgetAmount(
            incomeDailyUsd * rate * Number(DEFAULT_EXACT_TRIP_DAYS),
          ),
    );
  }, [exactBudgetCurrency, exactBudgetData, usdToBudgetCurrencyRate]);

  const handleExactBudgetCurrencyChange = useCallback(
    (currency: string) => {
      const nextCurrency = normalizeBudgetCurrency(currency);
      if (nextCurrency === exactBudgetCurrency) return;

      const currentAmount = toFiniteNumber(exactBudgetAmount);
      const currentRate =
        exactBudgetCurrency === DEFAULT_BUDGET_CURRENCY
          ? 1
          : usdToBudgetCurrencyRate;

      pendingBudgetConversionRef.current =
        currentAmount != null &&
        currentRate != null &&
        currentRate > 0
          ? { amount: currentAmount, fromRate: currentRate }
          : null;

      setUsdToBudgetCurrencyRate(
        nextCurrency === DEFAULT_BUDGET_CURRENCY ? 1 : null,
      );
      setExactBudgetCurrency(nextCurrency);
    },
    [exactBudgetAmount, exactBudgetCurrency, usdToBudgetCurrencyRate],
  );

  const handleBudgetFilterModeChange = useCallback(
    (mode: BudgetFilterMode) => {
      setBudgetFilterMode(mode);
      if (mode === "exact") {
        setMapColorMode("budget");
        setColoringEnabled(true);
        setActiveAffordabilityBands((bands) =>
          bands.size > 0 ? bands : new Set(ALL_AFFORDABILITY_BAND_KEYS),
        );
        if (!exactBudgetAmount.trim() || !exactBudgetDays.trim()) {
          resetExactBudgetDefaults();
        }
      }
    },
    [exactBudgetAmount, exactBudgetDays, resetExactBudgetDefaults, setMapColorMode],
  );

  useEffect(() => {
    if (budgetFilterMode !== "exact") return;
    if (suppressExactBudgetIncomeAutofillRef.current) return;
    if (exactBudgetAmount.trim() && exactBudgetDays.trim()) return;
    queueMicrotask(resetExactBudgetDefaults);
  }, [
    budgetFilterMode,
    exactBudgetAmount,
    exactBudgetDays,
    exactBudgetCurrency,
    availableBudgetCurrencies,
    usdToBudgetCurrencyRate,
    exactBudgetData,
    resetExactBudgetDefaults,
  ]);

  const exactBudgetDailyLocal = useMemo(() => {
    const amount = toFiniteNumber(exactBudgetAmount);
    const days = toFiniteNumber(exactBudgetDays);
    if (amount == null || days == null || amount < 0 || days < 1) return null;
    return amount / days;
  }, [exactBudgetAmount, exactBudgetDays]);

  const exactBudgetDailyUsd = useMemo(() => {
    if (exactBudgetDailyLocal == null || !exactBudgetData) return null;
    const rate =
      exactBudgetCurrency === DEFAULT_BUDGET_CURRENCY
        ? 1
        : usdToBudgetCurrencyRate;
    if (rate == null || rate <= 0) return null;
    return exactBudgetDailyLocal / rate;
  }, [
    exactBudgetCurrency,
    exactBudgetDailyLocal,
    exactBudgetData,
    usdToBudgetCurrencyRate,
  ]);

  const exactBudgetAffordabilityBands = useMemo(() => {
    if (exactBudgetDailyUsd == null || !exactBudgetData) {
      return {} as Record<string, AffordabilityBandKey>;
    }
    const out: Record<string, AffordabilityBandKey> = {};
    for (const [iso2, costs] of Object.entries(exactBudgetData.daily_costs ?? {})) {
      const band = exactAffordabilityBand(exactBudgetDailyUsd, costs);
      if (band) out[iso2.toUpperCase()] = band;
    }
    return out;
  }, [exactBudgetDailyUsd, exactBudgetData]);

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
    budgetFilterMode,
    exactBudgetAmount,
    exactBudgetDays,
    exactBudgetCurrency,
    availableBudgetCurrencies,
    usdToBudgetCurrencyRate,
    exactBudgetData,
    exactBudgetDailyLocal,
    exactBudgetDailyUsd,
    exactBudgetAffordabilityBands,
    travelCostScoreBands,
    travelCostScoreBandsStatus,
    seasonFilterRows,
    setSidebarOpen,
    setMapColorMode,
    handlePassportChange,
    warmPassportCaches,
    handleSeasonMonthChange,
    onSeasonDistinctKeysLoaded,
    handleMatchingIso2sChange,
    handleToggleCategory,
    handleToggleSafetyLevel,
    handleTravelSpendingTierChange,
    handleBudgetFilterModeChange,
    setExactBudgetAmount,
    setExactBudgetDays,
    handleExactBudgetCurrencyChange,
    resetExactBudgetDefaults,
    handleToggleAffordabilityBand,
    handleToggleSeasonType,
    handleToggleVacationType,
    handleToggleDepartureCity,
    setColoringEnabled,
  };
}
