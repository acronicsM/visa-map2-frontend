import type { AffordabilityBandKey } from "../types/map";

export type TravelCostScoreBands = {
  thresholds: number[];
  labels: string[];
  colors: string[];
};

/** Индекс полосы для фильтра «ожидаемая стоимость» (низкий score → дешевле относительно дома). */
export const AFFORDABILITY_TO_BAND_INDEX: Record<AffordabilityBandKey, number> = {
  carefree: 0,
  comfort: 1,
  skimp: 2,
  beyond_budget: 3,
};

/**
 * Дефолт только если ещё нет ответа `GET /travel-costs/score-bands` или запрос упал.
 * Должен бит-в-бит совпадать с `_DEFAULT_SCORE_BANDS` в
 * `visa-map2/app/services/travel_cost_service.py` (когда в env нет `TRAVEL_COST_SCORE_BANDS`).
 */
export const DEFAULT_TRAVEL_COST_SCORE_BANDS: TravelCostScoreBands = {
  thresholds: [0.5, 1, 2],
  labels: [
    "Без забот",
    "Комфортно",
    "Придется экономить",
    "Вне бюджета",
  ],
  colors: ["#22c55e", "#84cc16", "#eab308", "#ef4444"],
};

/** Относит score к полосе и сравнивает с выбранным фильтром; при неверной длине bands фильтр не сужает выборку. */
export function scoreMatchesAffordabilityFilter(
  score: number,
  bands: TravelCostScoreBands,
  key: AffordabilityBandKey,
): boolean {
  const expected = AFFORDABILITY_TO_BAND_INDEX[key];
  const k = bands.thresholds.length;
  if (bands.labels.length !== k + 1 || expected > k) {
    return true;
  }
  return travelCostScoreBandIndex(score, bands.thresholds) === expected;
}

export function travelCostScoreBandIndex(
  score: number,
  thresholds: number[],
): number {
  if (!thresholds.length) return 0;
  if (score < thresholds[0]) return 0;
  for (let i = 1; i < thresholds.length; i++) {
    if (score <= thresholds[i]) return i;
  }
  return thresholds.length;
}

/** Страница подходит, если её полоса входит в выбранные (пустой набор — без сужения). */
export function scoreMatchesActiveAffordabilityBands(
  score: number,
  bands: TravelCostScoreBands,
  activeKeys: Set<AffordabilityBandKey>,
): boolean {
  if (activeKeys.size === 0) {
    return true;
  }
  const k = bands.thresholds.length;
  if (bands.labels.length !== k + 1) {
    return true;
  }
  const idx = travelCostScoreBandIndex(score, bands.thresholds);
  const allowed = new Set(
    [...activeKeys].map((key) => AFFORDABILITY_TO_BAND_INDEX[key]),
  );
  return allowed.has(idx);
}

/** Цвет полосы для кружка в сайдбаре — тот же индекс, что и `travelCostColorForScore` на карте. */
export function affordabilityBandSidebarColor(
  bands: TravelCostScoreBands | null | undefined,
  key: AffordabilityBandKey,
): string {
  const idx = AFFORDABILITY_TO_BAND_INDEX[key];
  const resolved = bands ?? DEFAULT_TRAVEL_COST_SCORE_BANDS;
  return resolved.colors[idx] ?? "#1e293b";
}

export function travelCostColorForScore(
  score: number,
  bands: TravelCostScoreBands,
): string {
  const idx = travelCostScoreBandIndex(score, bands.thresholds);
  return bands.colors[idx] ?? "#1e293b";
}

export function travelCostLabelForScore(
  score: number,
  bands: TravelCostScoreBands,
): string {
  const idx = travelCostScoreBandIndex(score, bands.thresholds);
  return bands.labels[idx] ?? "";
}
