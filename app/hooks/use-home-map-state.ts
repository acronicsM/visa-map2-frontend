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
  ALL_DIRECT_FLIGHT_BAND_KEYS,
  ALL_REGION_KEYS,
  ALL_VACATION_FIT_BAND_KEYS,
  type AffordabilityBandKey,
  type BudgetFilterMode,
  type DirectFlightBandKey,
  type DirectFlightStatus,
  type ExactBudgetData,
  type MapColorMode,
  type TravelFxRateResponse,
  type TravelSpendingTier,
  type VacationDimensionKey,
  type VacationFitBandKey,
  type VisaMapItem,
  type PassportBootstrapStatus,
} from "../types/map";
import {
  mergeDirectCountriesMaps,
  type DirectCountriesResponse,
} from "../lib/direct-flight";
import type { MatchingCountryRow } from "../types/matching-country";
import type { TravelCostScoreBands } from "../lib/travel-cost-score-bands";
import {
  budgetCurrencySelectionFromList,
  DEFAULT_BUDGET_CURRENCY,
  normalizeBudgetCurrency,
} from "../lib/budget-currency";
import { fetchJsonDeduped } from "../lib/json-fetch-dedupe";
import { fetchPassportBootstrap } from "../lib/passport-bootstrap";
import { prefetchPassportBootstrap } from "../lib/passport-bootstrap-prefetch";
import { getSeasonFilterRowPresentation } from "../lib/season-colors";
import {
  computeVacationFit,
  DEFAULT_VACATION_LADDER,
  ladderToWeights,
  type VacationLadderItem,
  type VacationProfilesByIso,
} from "../lib/vacation-fit";
import {
  insertAtToTargetIndex,
  reorderLadderItems,
} from "../lib/vacation-ladder-reorder";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = API_URL.replace(/\/$/, "");

/** Включить в `.env.local`: `NEXT_PUBLIC_DEBUG_TRAVEL_COST_SCORE_BANDS=true` — логи по `/travel-costs/score-bands`. */
const DEBUG_TRAVEL_COST_SCORE_BANDS =
  process.env.NEXT_PUBLIC_DEBUG_TRAVEL_COST_SCORE_BANDS === "true" ||
  process.env.NEXT_PUBLIC_DEBUG_TRAVEL_COST_SCORE_BANDS === "1";

export type TravelCostScoreBandsStatus = "pending" | "ok" | "error";

const ALL_CATEGORIES = new Set(["free", "evisa", "voa", "embassy", "unavailable"]);
const ALL_SAFETY_LEVELS = new Set(["safe", "unsafe", "dangerous"]);
const ALL_REGIONS = new Set<string>(ALL_REGION_KEYS);
const DEFAULT_EXACT_TRIP_DAYS = "10";
const EMPTY_SCORES_BY_TIER: Record<
  TravelSpendingTier,
  Record<string, number>
> = {
  cheap: {},
  normal: {},
  expensive: {},
};

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
  const [activeRegions, setActiveRegions] = useState<Set<string>>(
    () => new Set(ALL_REGIONS),
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

  const [vacationLadder, setVacationLadder] = useState<VacationLadderItem[]>(
    () => DEFAULT_VACATION_LADDER.map((item) => ({ ...item })),
  );
  const [activeVacationFitBands, setActiveVacationFitBands] = useState<
    Set<VacationFitBandKey>
  >(() => new Set());
  const [vacationProfiles, setVacationProfiles] =
    useState<VacationProfilesByIso>({});
  const [vacationExoticByDest, setVacationExoticByDest] = useState<
    Record<string, number>
  >({});
  const [selectedDepartureCities, setSelectedDepartureCities] = useState<
    Set<string>
  >(() => new Set());
  const [activeDirectFlightBands, setActiveDirectFlightBands] = useState<
    Set<DirectFlightBandKey>
  >(() => new Set(ALL_DIRECT_FLIGHT_BAND_KEYS));
  const [directFlightStatus, setDirectFlightStatus] =
    useState<DirectFlightStatus>("idle");
  const [directFlightByDest, setDirectFlightByDest] = useState<
    Record<string, boolean>
  >({});
  const [directFlightError, setDirectFlightError] = useState<string | null>(
    null,
  );
  const [matchingCountries, setMatchingCountries] = useState<
    MatchingCountryRow[]
  >([]);
  const [matchingListReady, setMatchingListReady] = useState(false);
  const [countryMetaByIso, setCountryMetaByIso] = useState<
    Map<string, { name_ru: string; flag_emoji?: string | null }>
  >(() => new Map());
  const [travelCostScoresByTier, setTravelCostScoresByTier] = useState<
    Record<TravelSpendingTier, Record<string, number>>
  >(() => ({ ...EMPTY_SCORES_BY_TIER }));
  const [visaMapItems, setVisaMapItems] = useState<VisaMapItem[] | null>(null);
  const [passportBootstrapStatus, setPassportBootstrapStatus] =
    useState<PassportBootstrapStatus>("idle");
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
  const vacationExoticLoadedPassportRef = useRef("");
  const exactBudgetLoadedPassportRef = useRef("");
  const passportBootstrapSeqRef = useRef(0);

  const setExactBudgetAmount = useCallback((value: string) => {
    setExactBudgetAmountState(value);
    suppressExactBudgetIncomeAutofillRef.current = value.trim() === "";
  }, []);

  useDebugValue(travelCostScoreBandsStatus, (s) => `score-bands: ${s}`);

  const travelCostScores = useMemo(
    () => travelCostScoresByTier[travelSpendingTier] ?? {},
    [travelCostScoresByTier, travelSpendingTier],
  );

  const vacationWeights = useMemo(
    () => ladderToWeights(vacationLadder),
    [vacationLadder],
  );

  const shouldLoadVacationExotic = useMemo(() => {
    if (!passport.trim()) return false;
    if (mapColorMode === "vacation") return true;
    return Object.values(vacationWeights).some((w) => w > 0);
  }, [passport, mapColorMode, vacationWeights]);

  const setMapColorMode = useCallback((mode: MapColorMode) => {
    setMapColorModeState(mode);
    if (mode === "budget") {
      setActiveAffordabilityBands((bands) =>
        bands.size > 0 ? bands : new Set(ALL_AFFORDABILITY_BAND_KEYS),
      );
    }
    if (mode === "vacation") {
      setActiveVacationFitBands((bands) =>
        bands.size > 0 ? bands : new Set(ALL_VACATION_FIT_BAND_KEYS),
      );
    }
    if (mode === "region") {
      setActiveRegions((regions) =>
        regions.size > 0 ? regions : new Set(ALL_REGIONS),
      );
    }
  }, []);

  const seasonMonthRef = useRef(seasonMonth);


  useEffect(() => {
    let cancelled = false;
    void fetchJsonDeduped(`${API_BASE}/vacation-profiles`)
      .then((res) => {
        if (cancelled || !res.ok) return;
        const data = res.data as { profiles?: VacationProfilesByIso };
        setVacationProfiles(data.profiles ?? {});
      })
      .catch(() => {
        if (!cancelled) setVacationProfiles({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const iso = passport.trim().toUpperCase();
    if (!iso) {
      queueMicrotask(() => {
        if (!cancelled) {
          setPassportBootstrapStatus("idle");
          setTravelCostScoresByTier({ ...EMPTY_SCORES_BY_TIER });
          setVisaMapItems(null);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const seq = ++passportBootstrapSeqRef.current;
    queueMicrotask(() => {
      if (!cancelled && seq === passportBootstrapSeqRef.current) {
        setPassportBootstrapStatus("loading");
        setVisaMapItems([]);
      }
    });

    void fetchPassportBootstrap(API_BASE, iso)
      .then((res) => {
        if (cancelled || seq !== passportBootstrapSeqRef.current) return;
        if (!res.ok || !res.data) {
          setPassportBootstrapStatus("error");
          setTravelCostScoresByTier({ ...EMPTY_SCORES_BY_TIER });
          setVisaMapItems([]);
          return;
        }
        const data = res.data;
        setTravelCostScoresByTier(data.scores_by_tier);
        setVisaMapItems(data.visa_map);
        const { available, selectedDefault } = budgetCurrencySelectionFromList(
          data.currencies,
        );
        setAvailableBudgetCurrencies(available);
        setUsdToBudgetCurrencyRate(
          selectedDefault === DEFAULT_BUDGET_CURRENCY ? 1 : null,
        );
        setExactBudgetCurrency(selectedDefault);
        setPassportBootstrapStatus("ready");
      })
      .catch(() => {
        if (cancelled || seq !== passportBootstrapSeqRef.current) return;
        setPassportBootstrapStatus("error");
        setTravelCostScoresByTier({ ...EMPTY_SCORES_BY_TIER });
        setVisaMapItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [passport]);

  useEffect(() => {
    let cancelled = false;
    const iso = passport.trim().toUpperCase();
    if (!iso || !shouldLoadVacationExotic) {
      if (!iso) {
        queueMicrotask(() => {
          if (!cancelled) {
            vacationExoticLoadedPassportRef.current = "";
            setVacationExoticByDest({});
          }
        });
      }
      return () => {
        cancelled = true;
      };
    }
    if (vacationExoticLoadedPassportRef.current === iso) {
      return () => {
        cancelled = true;
      };
    }
    vacationExoticLoadedPassportRef.current = iso;

    void fetchJsonDeduped(`${API_BASE}/vacation-exotic/${encodeURIComponent(iso)}`)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setVacationExoticByDest({});
          return;
        }
        const data = res.data as { scores?: Record<string, number> };
        setVacationExoticByDest(data.scores ?? {});
      })
      .catch(() => {
        if (!cancelled) setVacationExoticByDest({});
      });
    return () => {
      cancelled = true;
    };
  }, [passport, shouldLoadVacationExotic]);

  const vacationFit = useMemo(() => {
    const hasWeight = Object.values(vacationWeights).some((w) => w > 0);
    if (!hasWeight) {
      return { scores: {} as Record<string, number>, destBand: {} };
    }
    return computeVacationFit(
      vacationProfiles,
      vacationExoticByDest,
      vacationWeights,
    );
  }, [vacationProfiles, vacationExoticByDest, vacationWeights]);

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
    prefetchPassportBootstrap(API_BASE, iso2);
  }, []);

  const handlePassportChange = useCallback((iso2: string) => {
    setPassport(iso2);
    suppressExactBudgetIncomeAutofillRef.current = false;
    setExactBudgetAmountState("");
    setExactBudgetDays(DEFAULT_EXACT_TRIP_DAYS);
    setExactBudgetData(null);
    exactBudgetLoadedPassportRef.current = "";
    vacationExoticLoadedPassportRef.current = "";
    pendingBudgetConversionRef.current = null;
    setExactBudgetCurrency(DEFAULT_BUDGET_CURRENCY);
    setUsdToBudgetCurrencyRate(1);
    setSelectedDepartureCities(new Set());
    setActiveDirectFlightBands(new Set(ALL_DIRECT_FLIGHT_BAND_KEYS));
    setDirectFlightStatus("idle");
    setDirectFlightByDest({});
    setDirectFlightError(null);
    setVacationExoticByDest({});
    setTravelCostScoresByTier({ ...EMPTY_SCORES_BY_TIER });
    setVisaMapItems(null);
    setPassportBootstrapStatus(iso2.trim() ? "loading" : "idle");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const iso = passport.trim();
    if (!iso || budgetFilterMode !== "exact") {
      if (!iso) {
        queueMicrotask(() => {
          if (!cancelled) {
            exactBudgetLoadedPassportRef.current = "";
            setExactBudgetData(null);
          }
        });
      }
      return () => {
        cancelled = true;
      };
    }

    const isoUpper = iso.toUpperCase();
    if (exactBudgetLoadedPassportRef.current === isoUpper) {
      return () => {
        cancelled = true;
      };
    }
    exactBudgetLoadedPassportRef.current = isoUpper;

    const isoEncoded = encodeURIComponent(isoUpper);
    void fetchJsonDeduped(`${API_BASE}/travel-costs/${isoEncoded}/exact-budget-data`)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setExactBudgetData(null);
          return;
        }
        const data = res.data as ExactBudgetData;
        setExactBudgetData(data);
      })
      .catch(() => {
        if (!cancelled) setExactBudgetData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [passport, budgetFilterMode]);

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

  const handleToggleRegion = useCallback((key: string) => {
    setActiveRegions((prev) => {
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

  const handleVacationLadderReorder = useCallback(
    (fromIndex: number, insertAt: number) => {
      setVacationLadder((prev) => {
        const toIndex = insertAtToTargetIndex(fromIndex, insertAt, prev.length);
        if (toIndex == null) return prev;
        return reorderLadderItems(
          prev.map((item) => ({ ...item })),
          fromIndex,
          toIndex,
        );
      });
      setMapColorMode("vacation");
      setColoringEnabled(true);
    },
    [setMapColorMode],
  );

  const handleVacationLadderMoveUp = useCallback(
    (slotIndex: number) => {
      if (slotIndex <= 0) return;
      setVacationLadder((prev) =>
        reorderLadderItems(
          prev.map((item) => ({ ...item })),
          slotIndex,
          slotIndex - 1,
        ),
      );
      setMapColorMode("vacation");
      setColoringEnabled(true);
    },
    [setMapColorMode],
  );

  const handleVacationLadderMoveDown = useCallback(
    (slotIndex: number) => {
      setVacationLadder((prev) => {
        if (slotIndex >= prev.length - 1) return prev;
        return reorderLadderItems(
          prev.map((item) => ({ ...item })),
          slotIndex,
          slotIndex + 1,
        );
      });
      setMapColorMode("vacation");
      setColoringEnabled(true);
    },
    [setMapColorMode],
  );

  const handleVacationLadderToggleEnabled = useCallback(
    (slotIndex: number) => {
      setVacationLadder((prev) =>
        prev.map((item, i) =>
          i === slotIndex ? { ...item, enabled: !item.enabled } : item,
        ),
      );
      setMapColorMode("vacation");
      setColoringEnabled(true);
    },
    [setMapColorMode],
  );

  const handleToggleVacationFitBand = useCallback(
    (key: VacationFitBandKey) => {
      setActiveVacationFitBands((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      setMapColorMode("vacation");
      setColoringEnabled(true);
    },
    [setMapColorMode],
  );

  const handleAddDepartureCity = useCallback((city: string) => {
    const trimmed = city.trim();
    if (!trimmed) return;
    setSelectedDepartureCities((prev) => {
      if (prev.has(trimmed)) return prev;
      const next = new Set(prev);
      next.add(trimmed);
      return next;
    });
    setActiveDirectFlightBands(new Set(ALL_DIRECT_FLIGHT_BAND_KEYS));
    setMapColorModeState("flight");
    setColoringEnabled(true);
  }, []);

  const handleRemoveDepartureCity = useCallback((city: string) => {
    setSelectedDepartureCities((prev) => {
      if (!prev.has(city)) return prev;
      const next = new Set(prev);
      next.delete(city);
      return next;
    });
  }, []);

  const handleToggleDirectFlightBand = useCallback((key: DirectFlightBandKey) => {
    setActiveDirectFlightBands((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setMapColorModeState("flight");
    setColoringEnabled(true);
  }, []);

  const departureCitiesKey = useMemo(
    () => [...selectedDepartureCities].sort().join("\0"),
    [selectedDepartureCities],
  );

  useEffect(() => {
    let cancelled = false;
    const iso2 = passport.trim().toUpperCase();
    const cities = [...selectedDepartureCities];

    if (!iso2 || cities.length === 0) {
      queueMicrotask(() => {
        if (!cancelled) {
          setDirectFlightStatus("idle");
          setDirectFlightByDest({});
          setDirectFlightError(null);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setDirectFlightStatus("loading");
        setDirectFlightError(null);
      }
    });

    void (async () => {
      const invalidCities: string[] = [];
      const maps: Record<string, boolean>[] = [];

      await Promise.all(
        cities.map(async (city) => {
          const url =
            `${API_BASE}/flights/direct-countries?` +
            `city=${encodeURIComponent(city)}&country_iso2=${encodeURIComponent(iso2)}`;
          try {
            const res = await fetchJsonDeduped(url);
            if (cancelled) return;
            if (res.status === 404) {
              invalidCities.push(city);
              return;
            }
            if (!res.ok || res.data == null || typeof res.data !== "object") {
              throw new Error(`HTTP ${res.status}`);
            }
            const data = res.data as DirectCountriesResponse;
            maps.push(data.direct_countries ?? {});
          } catch {
            if (!cancelled) {
              throw new Error("fetch failed");
            }
          }
        }),
      );

      if (cancelled) return;

      if (invalidCities.length > 0) {
        setSelectedDepartureCities((prev) => {
          const next = new Set(prev);
          for (const city of invalidCities) next.delete(city);
          return next;
        });
        setDirectFlightError(
          invalidCities.length === 1
            ? `Город «${invalidCities[0]}» не найден в справочнике`
            : "Некоторые города не найдены в справочнике",
        );
      }

      const merged = mergeDirectCountriesMaps(maps);
      const remaining = cities.filter((c) => !invalidCities.includes(c));
      if (remaining.length === 0) {
        setDirectFlightStatus("idle");
        setDirectFlightByDest({});
        return;
      }

      setDirectFlightByDest(merged);
      setDirectFlightStatus("ready");
    })().catch(() => {
      if (cancelled) return;
      setDirectFlightStatus("error");
      setDirectFlightByDest({});
      setDirectFlightError("Не удалось загрузить данные о прямых перелётах");
    });

    return () => {
      cancelled = true;
    };
  }, [passport, departureCitiesKey, selectedDepartureCities]);

  return {
    passport,
    activeCategories,
    activeSafetyLevels,
    activeRegions,
    travelSpendingTier,
    activeAffordabilityBands,
    mapColorMode,
    seasonMonth,
    distinctSeasonKeys,
    activeSeasonTypes,
    coloringEnabled,
    sidebarOpen,
    vacationLadder,
    activeVacationFitBands,
    vacationFitScores: vacationFit.scores,
    vacationDestBands: vacationFit.destBand,
    selectedDepartureCities,
    activeDirectFlightBands,
    directFlightStatus,
    directFlightByDest,
    directFlightError,
    matchingCountries,
    matchingListReady,
    countryMetaByIso,
    travelCostScores,
    travelCostScoresByTier,
    visaMapItems,
    passportBootstrapStatus,
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
    handleToggleRegion,
    handleTravelSpendingTierChange,
    handleBudgetFilterModeChange,
    setExactBudgetAmount,
    setExactBudgetDays,
    handleExactBudgetCurrencyChange,
    resetExactBudgetDefaults,
    handleToggleAffordabilityBand,
    handleToggleSeasonType,
    handleVacationLadderReorder,
    handleVacationLadderMoveUp,
    handleVacationLadderMoveDown,
    handleVacationLadderToggleEnabled,
    handleToggleVacationFitBand,
    handleAddDepartureCity,
    handleRemoveDepartureCity,
    handleToggleDirectFlightBand,
    setColoringEnabled,
  };
}
