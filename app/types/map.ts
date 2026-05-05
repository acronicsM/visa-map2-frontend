export type MapColorMode =
  | "citizenship"
  | "safety"
  | "budget"
  | "season"
  | "vacation"
  | "flight";

/** Уровень трат на поездку — параметр `budget_tier` в API travel-costs. */
export type TravelSpendingTier = "cheap" | "normal" | "expensive";

/** Как применять бюджетный фильтр: грубая рельса или точная сумма/дни. */
export type BudgetFilterMode = "tier" | "exact";

/** Ключ выбранной полосы относительной стоимости (см. travel-cost-score-bands). */
export type AffordabilityBandKey =
  | "carefree"
  | "comfort"
  | "skimp"
  | "beyond_budget";

/** Все полосы — для «включить всё» при активации режима бюджета. */
export const ALL_AFFORDABILITY_BAND_KEYS: readonly AffordabilityBandKey[] = [
  "beyond_budget",
  "skimp",
  "comfort",
  "carefree",
] as const;

export type ExactBudgetDailyCosts = {
  cheap: number | null;
  normal: number | null;
  expensive: number | null;
};

export type ExactBudgetData = {
  home_iso2: string;
  home_currency: string | null;
  /** Legacy/local value. Use income_daily_usd for exact-budget defaults. */
  income_daily: number | null;
  /** Canonical daily income from the imported travel-cost model, in USD. */
  income_daily_usd: number | null;
  /** USD -> home_currency rate, kept for compatibility with older UI paths. */
  usd_to_home_rate: number | null;
  daily_costs: Record<string, ExactBudgetDailyCosts>;
};

export type TravelCurrencyListResponse = {
  currencies: string[];
  default_currency: string;
};

export type TravelFxRateResponse = {
  base: "USD";
  currency: string;
  rate: number;
};
