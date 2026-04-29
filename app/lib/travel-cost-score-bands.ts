export type TravelCostScoreBands = {
  thresholds: number[];
  labels: string[];
  colors: string[];
};

/** Совпадает с дефолтом бэкенда (`_DEFAULT_SCORE_BANDS`). */
export const DEFAULT_TRAVEL_COST_SCORE_BANDS: TravelCostScoreBands = {
  thresholds: [0.5, 1.0],
  labels: [
    "Дешевле, чем дома",
    "Примерно как дома",
    "Дороже, чем дома",
  ],
  colors: ["#22c55e", "#eab308", "#ef4444"],
};

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
