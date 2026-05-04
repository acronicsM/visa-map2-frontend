export type MapColorMode =
  | "citizenship"
  | "safety"
  | "budget"
  | "season"
  | "vacation"
  | "flight";

/** Уровень трат на поездку — параметр `budget_tier` в API travel-costs. */
export type TravelSpendingTier = "cheap" | "normal" | "expensive";

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
