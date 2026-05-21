/**
 * Палитры заливки стран на карте (VisaMap) и кругов в FilterSidebar.
 * Держим в одном месте, чтобы цвета не расходились.
 */

export const MAP_VISA_FILL_COLORS: Record<string, string> = {
  free: "#22c55e",
  voa: "#3b82f6",
  evisa: "#eab308",
  embassy: "#ef4444",
  restricted: "#ef4444",
  unavailable: "#6b7280",
  unknown: "#1e293b",
};

export const MAP_SAFETY_FILL_COLORS: Record<string, string> = {
  safe: "#22c55e",
  unsafe: "#eab308",
  dangerous: "#ef4444",
};

/** Порядок как в панели фильтров */
export const SIDEBAR_VISA_FILTER_ROWS: { key: string; label: string }[] = [
  { key: "free", label: "Без визы" },
  { key: "evisa", label: "Электронная виза" },
  { key: "voa", label: "По прибытию" },
  { key: "embassy", label: "Нужна виза" },
  { key: "unavailable", label: "Недоступно" },
];

export const SIDEBAR_SAFETY_FILTER_ROWS: { key: string; label: string }[] = [
  { key: "safe", label: "Безопасно" },
  { key: "unsafe", label: "Риски" },
  { key: "dangerous", label: "Опасно" },
];

export const MAP_REGION_FILL_COLORS: Record<string, string> = {
  Europe: "#3b82f6",
  Asia: "#f97316",
  Africa: "#eab308",
  Americas: "#22c55e",
  Oceania: "#a855f7",
};

export const SIDEBAR_REGION_FILTER_ROWS: { key: string; label: string }[] = [
  { key: "Europe", label: "Европа" },
  { key: "Asia", label: "Азия" },
  { key: "Africa", label: "Африка" },
  { key: "Americas", label: "Америка" },
  { key: "Oceania", label: "Океания" },
];
