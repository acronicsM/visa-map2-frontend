/**
 * Цвета слоя «Сезонность» по полю `season` в GeoJSON.
 * Неизвестные значения получают стабильный цвет по хешу строки — новые сезоны
 * в данных не сольются в один цвет.
 */

/** Цвет, если сезон пустой или свойство не задано */
export const SEASON_COLOR_MISSING = "#1e293b";

/** Серый кружок в фильтре для неизвестного сезона или «нет данных» */
export const SEASON_FILTER_LEGEND_GRAY = "#94a3b8";

/**
 * Канонические ключи — в нижнем регистре (как после импорта на бэкенде).
 * При появлении нового «именованного» сезона добавьте сюда пару и при желании
 * подпись в легенде.
 */
export const KNOWN_SEASON_COLORS: Record<string, string> = {
  cold: "#2563eb",
  very_cold: "#1e40af",
  cool: "#06b6d4",
  mild: "#84cc16",
  pleasant: "#22c55e",
  warm: "#f97316",
  hot: "#ef4444",
  very_hot: "#b91c1c",
  dry: "#ca8a04",
  wet: "#0ea5e9",
  rainy: "#0284c7",
  transitional: "#7c3aed",
  beach: "#f59e0b",
};

const SEASON_LABEL_RU: Record<string, string> = {
  very_cold: "Очень холодно",
  cold: "Холодно",
  cool: "Прохладно",
  mild: "Умеренный климат",
  pleasant: "Комфортно",
  warm: "Тепло",
  hot: "Жарко",
  very_hot: "Очень жарко",
  dry: "Сухо",
  wet: "Влажно",
  rainy: "Дождливо",
  transitional: "Переходный сезон",
  beach: "Пляжный сезон",
};

const SEASON_PROP_EXPR: unknown[] = [
  "downcase",
  ["coalesce", ["get", "season"], ""],
];

/** Подпись и цвет строки фильтра по каноническому ключу из API */
export function getSeasonFilterRowPresentation(canonicalKey: string): {
  label: string;
  color: string;
} {
  const k = canonicalKey.trim().toLowerCase();
  if (k === "") {
    return { label: "Нет данных", color: SEASON_FILTER_LEGEND_GRAY };
  }
  const known = KNOWN_SEASON_COLORS[k];
  if (known) {
    return { label: SEASON_LABEL_RU[k] ?? k, color: known };
  }
  return { label: canonicalKey, color: SEASON_FILTER_LEGEND_GRAY };
}

/**
 * Уникальные сезоны из ответа ``/country-seasons/{m}/geodata``:
 * поле ``distinct_seasons`` или однократный обход ``features`` (старый бэк).
 */
export function extractDistinctSeasonKeysFromGeodataPayload(
  payload: unknown,
): string[] {
  if (!payload || typeof payload !== "object") return [];
  const o = payload as Record<string, unknown>;
  const ds = o.distinct_seasons;
  if (Array.isArray(ds) && ds.length > 0) {
    const out = new Set<string>();
    for (const x of ds) {
      if (typeof x === "string") {
        out.add(x.trim().toLowerCase());
      }
    }
    return [...out].sort((a, b) => a.localeCompare(b));
  }

  const features = o.features;
  if (!Array.isArray(features)) return [];
  const fromFeatures = new Set<string>();
  for (const f of features) {
    if (!f || typeof f !== "object") continue;
    const props = (f as GeoJSON.Feature).properties;
    if (!props || typeof props !== "object") continue;
    const raw = (props as Record<string, unknown>).season;
    const s =
      raw === null || raw === undefined ? "" : String(raw).trim().toLowerCase();
    fromFeatures.add(s);
  }
  return [...fromFeatures].sort((a, b) => a.localeCompare(b));
}

/** Непрозрачность полигона: 0.75 если сезон включён в фильтре, иначе 0 */
export function buildSeasonLayerOpacityExpression(
  active: ReadonlySet<string>,
  distinctKeys: readonly string[],
): unknown[] {
  if (distinctKeys.length === 0) {
    return ["literal", 0];
  }
  const matchBranches: unknown[] = [];
  for (const key of distinctKeys) {
    matchBranches.push(key);
    matchBranches.push(active.has(key) ? 0.75 : 0);
  }
  return ["match", SEASON_PROP_EXPR, ...matchBranches, 0];
}

/** Ключ сезона для сравнения с фильтром (как в GeoJSON/API). */
export function normalizeSeasonKey(raw: string | null | undefined): string {
  if (raw == null) return "";
  return String(raw).trim().toLowerCase();
}

/**
 * Непрозрачность сезонного слоя: тип сезона × прохождение составного фильтра
 * (`filter_pass` 1/0 на фиче).
 */
export function buildSeasonLayerCompositeOpacityExpression(
  active: ReadonlySet<string>,
  distinctKeys: readonly string[],
): unknown[] {
  const byType = buildSeasonLayerOpacityExpression(active, distinctKeys);
  return [
    "*",
    ["case", ["==", ["get", "filter_pass"], 1], 1, 0],
    byType,
  ];
}

function hueFromSeasonKey(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = (h * 33) ^ key.charCodeAt(i);
  }
  return (h >>> 0) % 360;
}

export function colorForUnknownSeasonKey(key: string): string {
  if (!key) return SEASON_COLOR_MISSING;
  const hue = hueFromSeasonKey(key);
  return `hsl(${hue} 58% 46%)`;
}

export function resolveSeasonColor(seasonRaw: string | null | undefined): string {
  const key = normalizeSeasonKey(seasonRaw);
  if (!key) return SEASON_COLOR_MISSING;
  const known = KNOWN_SEASON_COLORS[key];
  if (known) return known;
  return colorForUnknownSeasonKey(key);
}

type FeatureProps = Record<string, unknown> | null;

function seasonFromProperties(props: FeatureProps): string {
  if (!props) return "";
  const s = props.season;
  if (s == null) return "";
  return String(s);
}

export function enrichCountrySeasonsGeoJson(
  fc: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fc.features.map((feature) => {
      const props = feature.properties as FeatureProps;
      const season = seasonFromProperties(props);
      return {
        ...feature,
        properties: {
          ...(props && typeof props === "object" ? props : {}),
          season_color: resolveSeasonColor(season),
        },
      };
    }),
  };
}
