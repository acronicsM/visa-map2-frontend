import type { VacationDimensionKey, VacationFitBandKey } from "../types/map";

/** Синхронизировать с visa-map2/app/services/vacation_fit_compute.py */
export type VacationProfileScalars = {
  beach: number | null;
  ski: number | null;
  food: number | null;
  natural: number | null;
  culture: number | null;
};

export type VacationProfilesByIso = Record<string, VacationProfileScalars>;

export const VACATION_DIMENSION_KEYS: readonly VacationDimensionKey[] = [
  "beach",
  "ski",
  "food",
  "natural",
  "culture",
  "exotic",
] as const;

/** Вес по номеру слота лесенки (1-й сверху = 6 … 6-й = 1). */
export const VACATION_SLOT_WEIGHTS = [6, 5, 4, 3, 2, 1] as const;

export type VacationLadderItem = {
  key: VacationDimensionKey;
  enabled: boolean;
};

export const VACATION_TYPE_META: Record<
  VacationDimensionKey,
  { label: string; color: string }
> = {
  beach: { label: "Пляжный", color: "#22c55e" },
  ski: { label: "Горнолыжный", color: "#3b82f6" },
  natural: { label: "Природа/Трекинг", color: "#eab308" },
  culture: { label: "Культура", color: "#a855f7" },
  food: { label: "Еда", color: "#f97316" },
  exotic: { label: "Экзотика", color: "#ec4899" },
};

/** Дефолт: пляж/еда/экзотика; природа и культура выкл; горы в слоте 6. */
export const DEFAULT_VACATION_LADDER: VacationLadderItem[] = [
  { key: "beach", enabled: true },
  { key: "food", enabled: true },
  { key: "exotic", enabled: true },
  { key: "natural", enabled: false },
  { key: "culture", enabled: false },
  { key: "ski", enabled: true },
];

function emptyWeights(): Record<VacationDimensionKey, number> {
  return {
    beach: 0,
    ski: 0,
    food: 0,
    natural: 0,
    culture: 0,
    exotic: 0,
  };
}

/** Вес = вес слота, если параметр включён; иначе 0. */
export function ladderToWeights(
  ladder: VacationLadderItem[],
): Record<VacationDimensionKey, number> {
  const out = emptyWeights();
  ladder.forEach((item, index) => {
    const slotWeight = VACATION_SLOT_WEIGHTS[index];
    if (slotWeight == null) return;
    out[item.key] = item.enabled ? slotWeight : 0;
  });
  return out;
}

export const DEFAULT_VACATION_WEIGHTS: Record<VacationDimensionKey, number> =
  ladderToWeights(DEFAULT_VACATION_LADDER);

export const VACATION_FIT_BAND_KEYS: readonly VacationFitBandKey[] = [
  "excellent",
  "good",
  "doubtful",
  "unlikely",
] as const;

export const VACATION_FIT_BAND_LABELS: Record<VacationFitBandKey, string> = {
  excellent: "Отлично подходит",
  good: "Подходит",
  doubtful: "Сомнительно",
  unlikely: "Вряд ли подойдут",
};

export const VACATION_FIT_BAND_COLORS: Record<VacationFitBandKey, string> = {
  excellent: "#22c55e",
  good: "#84cc16",
  doubtful: "#eab308",
  unlikely: "#ef4444",
};

/** Пороги по нормализованному индексу 0–100 (после min–max по текущему фильтру). */
export const VACATION_FIT_BAND_THRESHOLDS = {
  excellent: 80,
  good: 50,
  doubtful: 20,
} as const;

const SCALAR_DIMS: VacationDimensionKey[] = [
  "beach",
  "ski",
  "food",
  "natural",
  "culture",
];

function scalarScore(
  profiles: VacationProfilesByIso,
  destIso2: string,
  dim: VacationDimensionKey,
): number | null {
  const row = profiles[destIso2];
  if (!row) return null;
  const raw = row[dim as keyof VacationProfileScalars];
  if (raw == null || !Number.isFinite(raw)) return null;
  return raw * 100;
}

export function computeCountryScores(
  profiles: VacationProfilesByIso,
  exoticByDest: Record<string, number>,
  weights: Record<VacationDimensionKey, number>,
): Record<string, number> {
  const destKeys = new Set([
    ...Object.keys(profiles),
    ...Object.keys(exoticByDest),
  ]);
  const out: Record<string, number> = {};

  for (const dest of destKeys) {
    const iso2 = dest.trim().toUpperCase();
    if (iso2.length !== 2) continue;

    let weightedSum = 0;
    let weightSum = 0;

    for (const dim of SCALAR_DIMS) {
      const w = Math.max(0, Math.floor(weights[dim] ?? 0));
      if (w <= 0) continue;
      const s = scalarScore(profiles, iso2, dim);
      if (s == null) continue;
      weightedSum += s * w;
      weightSum += w;
    }

    const wEx = Math.max(0, Math.floor(weights.exotic ?? 0));
    if (wEx > 0) {
      const rawEx = exoticByDest[iso2] ?? exoticByDest[dest];
      if (rawEx != null && Number.isFinite(rawEx)) {
        weightedSum += rawEx * 100 * wEx;
        weightSum += wEx;
      }
    }

    if (weightSum > 0) {
      out[iso2] = weightedSum / weightSum;
    }
  }

  return out;
}

/** Индекс 0–100 → полоса (после min–max нормализации итогового score). */
export function scoreToVacationFitBand(index: number): VacationFitBandKey {
  if (index >= VACATION_FIT_BAND_THRESHOLDS.excellent) return "excellent";
  if (index >= VACATION_FIT_BAND_THRESHOLDS.good) return "good";
  if (index >= VACATION_FIT_BAND_THRESHOLDS.doubtful) return "doubtful";
  return "unlikely";
}

/**
 * Min–max нормализация сырого итога по всем странам для текущих весов.
 * При равных score: все нули → 0; все положительные → 50 (середина шкалы).
 */
export function normalizeScoresMinMax(
  scores: Record<string, number>,
): Record<string, number> {
  const entries = Object.entries(scores);
  if (entries.length === 0) return {};

  let min = Infinity;
  let max = -Infinity;
  for (const [, score] of entries) {
    if (score < min) min = score;
    if (score > max) max = score;
  }
  const span = max - min;

  const out: Record<string, number> = {};
  for (const [iso2, score] of entries) {
    if (span <= 0) {
      out[iso2] = min > 0 ? 50 : 0;
    } else {
      out[iso2] = ((score - min) / span) * 100;
    }
  }
  return out;
}

export function assignVacationFitBands(
  rawScores: Record<string, number>,
): Record<string, VacationFitBandKey> {
  const indices = normalizeScoresMinMax(rawScores);
  const out: Record<string, VacationFitBandKey> = {};
  for (const [iso2, index] of Object.entries(indices)) {
    out[iso2] = scoreToVacationFitBand(index);
  }
  return out;
}

export type VacationFitResult = {
  scores: Record<string, number>;
  destBand: Record<string, VacationFitBandKey>;
};

export function computeVacationFit(
  profiles: VacationProfilesByIso,
  exoticByDest: Record<string, number>,
  weights: Record<VacationDimensionKey, number>,
): VacationFitResult {
  const rawScores = computeCountryScores(profiles, exoticByDest, weights);
  const scores = normalizeScoresMinMax(rawScores);
  const destBand = assignVacationFitBands(rawScores);
  return { scores, destBand };
}

export function vacationBandColor(band: VacationFitBandKey): string {
  return VACATION_FIT_BAND_COLORS[band] ?? "#1e293b";
}

export function countryMatchesVacationBands(
  iso2: string,
  destBand: Record<string, VacationFitBandKey>,
  activeBands: Set<VacationFitBandKey>,
): boolean {
  if (activeBands.size === 0) return true;
  const key = iso2.trim().toUpperCase();
  const band = destBand[key];
  if (!band) return false;
  return activeBands.has(band);
}
