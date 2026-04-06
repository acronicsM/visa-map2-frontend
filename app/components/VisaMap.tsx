"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import CountryPopup from "./CountryPopup";
import {
  buildSeasonLayerCompositeOpacityExpression,
  enrichCountrySeasonsGeoJson,
  extractDistinctSeasonKeysFromGeodataPayload,
  normalizeSeasonKey,
  SEASON_COLOR_MISSING,
} from "../lib/season-colors";
import type { MapColorMode } from "../types/map";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

const SEASONS_SOURCE_ID = "country-seasons";
const SEASONS_LAYER_ID = "seasons-fill";

const VISA_COLORS: Record<string, string> = {
  free: "#22c55e",
  voa: "#3b82f6",
  evisa: "#eab308",
  embassy: "#ef4444",
  restricted: "#ef4444",
  unavailable: "#6b7280",
  unknown: "#1e293b",
};

const SAFETY_COLORS: Record<string, string> = {
  safe: "#22c55e",
  unsafe: "#eab308",
  dangerous: "#ef4444",
};

const COST_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#ef4444",
};

const UNKNOWN_COLOR = "#1e293b";

/** Paint сезонного слоя: цвет задаётся при загрузке GeoJSON (`season_color`) */
const SEASON_FILL_COLOR_EXPR: maplibregl.ExpressionSpecification = [
  "coalesce",
  ["get", "season_color"],
  SEASON_COLOR_MISSING,
];
const NEUTRAL_COUNTRIES_COLOR = "#94a3b8";
const DIM_FILL_OPACITY = 0.14;
const HIGH_FILL_OPACITY = 0.6;

interface VisaDetail {
  id: string;
  iso2: string;
  visa_category: string;
  max_stay_days: number | null;
  confidence_level: number;
}

interface CountryInfo {
  iso2: string;
  name_ru: string;
  name_en: string;
  flag_emoji: string;
  region: string;
  subregion: string;
  capital: string;
  safety_level?: string | null;
  cost_level?: string | null;
  cost_per_day_usd?: number | null;
}

interface CountryAttrs {
  safety_level?: string | null;
  cost_level?: string | null;
}

interface VisaMapProps {
  passport: string;
  activeCategories: Set<string>;
  mapColorMode: MapColorMode;
  seasonMonth: number;
  activeSafetyLevels: Set<string>;
  activeCostLevels: Set<string>;
  activeSeasonTypes: Set<string>;
  /** Уникальные сезоны за выбранный месяц (с бэка или из фич) */
  seasonDistinctKeys: string[];
  onSeasonDistinctKeysLoaded?: (month: number, keys: string[]) => void;
  coloringEnabled: boolean;
  /** Коды языков для фильтра (нижний регистр); пусто — язык не ограничивает */
  selectedLanguageCodes: Set<string>;
  /** iso2 (верхний регистр) → коды языков страны */
  officialLanguageCodesByIso: Map<string, string[]>;
}

function normAttr(raw: string | null | undefined): string {
  if (raw == null) return "";
  return String(raw).trim().toLowerCase();
}

/** Обновить источник сезонов: `filter_pass` 1/0 по составному фильтру. */
function syncSeasonSourceWithCompositeFilter(
  mapInstance: maplibregl.Map,
  base: GeoJSON.FeatureCollection | null,
  passes: (iso2: string, seasonKey: string) => boolean,
) {
  if (!base?.features?.length || !mapInstance.getSource(SEASONS_SOURCE_ID)) return;
  const features = base.features.map((f) => {
    const props = (f.properties || {}) as Record<string, unknown>;
    const iso2 = String(props.iso2 ?? "").trim();
    const sk = normalizeSeasonKey(
      props.season == null ? "" : String(props.season),
    );
    const filterPass = iso2 && passes(iso2, sk) ? 1 : 0;
    return {
      ...f,
      properties: { ...props, filter_pass: filterPass },
    };
  });
  (mapInstance.getSource(SEASONS_SOURCE_ID) as maplibregl.GeoJSONSource).setData({
    type: "FeatureCollection",
    features,
  });
}

function buildCountryAttrsIndex(
  geojson: unknown,
): Map<string, CountryAttrs> {
  const out = new Map<string, CountryAttrs>();
  if (!geojson || typeof geojson !== "object") return out;
  const fc = geojson as GeoJSON.FeatureCollection;
  if (!Array.isArray(fc.features)) return out;
  for (const f of fc.features) {
    const p = f.properties as Record<string, unknown> | null | undefined;
    if (!p || typeof p !== "object") continue;
    const iso2 = String(p.iso2 ?? "").trim();
    if (!iso2) continue;
    out.set(iso2, {
      safety_level: p.safety_level as string | null | undefined,
      cost_level: p.cost_level as string | null | undefined,
    });
  }
  return out;
}

function buildSeasonKeyByIsoFromFc(
  fc: GeoJSON.FeatureCollection,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of fc.features) {
    const p = f.properties as Record<string, unknown> | null | undefined;
    if (!p || typeof p !== "object") continue;
    const iso2 = String(p.iso2 ?? "").trim();
    if (!iso2) continue;
    m.set(iso2, normalizeSeasonKey(p.season == null ? "" : String(p.season)));
  }
  return m;
}

function applyVisaColorsWithCompositeFilters(
  mapInstance: maplibregl.Map,
  visaData: VisaDetail[],
  active: Set<string>,
  passes: (iso2: string) => boolean,
  enabled: boolean,
) {
  if (!enabled) {
    mapInstance.setPaintProperty("countries-fill", "fill-opacity", 0);
    return;
  }

  if (visaData.length === 0) {
    mapInstance.setPaintProperty("countries-fill", "fill-color", NEUTRAL_COUNTRIES_COLOR);
    mapInstance.setPaintProperty("countries-fill", "fill-opacity", DIM_FILL_OPACITY);
    return;
  }

  const colorExpression: unknown[] = ["match", ["get", "iso2"]];
  const opacityExpression: unknown[] = ["match", ["get", "iso2"]];
  visaData.forEach((item) => {
    const ok = passes(item.iso2);
    const show =
      ok && active.has(item.visa_category)
        ? (VISA_COLORS[item.visa_category] ?? VISA_COLORS.unknown)
        : NEUTRAL_COUNTRIES_COLOR;
    const op = ok && active.has(item.visa_category) ? HIGH_FILL_OPACITY : DIM_FILL_OPACITY;
    colorExpression.push(item.iso2);
    colorExpression.push(show);
    opacityExpression.push(item.iso2);
    opacityExpression.push(op);
  });
  colorExpression.push(NEUTRAL_COUNTRIES_COLOR);
  opacityExpression.push(DIM_FILL_OPACITY);

  mapInstance.setPaintProperty("countries-fill", "fill-color", colorExpression);
  mapInstance.setPaintProperty("countries-fill", "fill-opacity", opacityExpression);
}

function applyAttributeColorsWithCompositeFilters(
  mapInstance: maplibregl.Map,
  field: "safety_level" | "cost_level",
  palette: Record<string, string>,
  activeLevels: Set<string>,
  countryAttrs: Map<string, CountryAttrs>,
  passes: (iso2: string) => boolean,
  enabled: boolean,
) {
  if (!enabled) {
    mapInstance.setPaintProperty("countries-fill", "fill-opacity", 0);
    return;
  }

  const colorExpression: unknown[] = ["match", ["get", "iso2"]];
  const opacityExpression: unknown[] = ["match", ["get", "iso2"]];

  for (const [iso2, attrs] of countryAttrs) {
    const levelRaw = attrs[field];
    const level = normAttr(levelRaw);
    const inSet = Boolean(level && activeLevels.has(level));
    const show = passes(iso2) && inSet;
    const col =
      inSet && level ? (palette[level] ?? UNKNOWN_COLOR) : UNKNOWN_COLOR;
    colorExpression.push(iso2, show ? col : NEUTRAL_COUNTRIES_COLOR);
    opacityExpression.push(iso2, show ? HIGH_FILL_OPACITY : DIM_FILL_OPACITY);
  }
  colorExpression.push(NEUTRAL_COUNTRIES_COLOR);
  opacityExpression.push(DIM_FILL_OPACITY);

  mapInstance.setPaintProperty("countries-fill", "fill-color", colorExpression);
  mapInstance.setPaintProperty("countries-fill", "fill-opacity", opacityExpression);
}

const LANGUAGE_PASS_COLOR = "#22c55e";

function applyLanguageBinaryColors(
  mapInstance: maplibregl.Map,
  countryAttrs: Map<string, CountryAttrs>,
  passes: (iso2: string) => boolean,
  enabled: boolean,
) {
  if (!enabled) {
    mapInstance.setPaintProperty("countries-fill", "fill-opacity", 0);
    return;
  }

  const colorExpression: unknown[] = ["match", ["get", "iso2"]];
  const opacityExpression: unknown[] = ["match", ["get", "iso2"]];

  for (const [iso2] of countryAttrs) {
    const ok = passes(iso2);
    colorExpression.push(iso2, ok ? LANGUAGE_PASS_COLOR : NEUTRAL_COUNTRIES_COLOR);
    opacityExpression.push(iso2, ok ? HIGH_FILL_OPACITY : DIM_FILL_OPACITY);
  }
  colorExpression.push(NEUTRAL_COUNTRIES_COLOR);
  opacityExpression.push(DIM_FILL_OPACITY);

  mapInstance.setPaintProperty("countries-fill", "fill-color", colorExpression);
  mapInstance.setPaintProperty("countries-fill", "fill-opacity", opacityExpression);
}

function setSeasonLayerVisibility(mapInstance: maplibregl.Map, visible: boolean) {
  if (!mapInstance.getLayer(SEASONS_LAYER_ID)) return;
  mapInstance.setLayoutProperty(
    SEASONS_LAYER_ID,
    "visibility",
    visible ? "visible" : "none",
  );
}

function ensureSeasonLayer(mapInstance: maplibregl.Map) {
  if (mapInstance.getSource(SEASONS_SOURCE_ID)) return;

  // Без promoteId: при дубликате iso2 MapLibre может некорректно отрисовать fill
  mapInstance.addSource(SEASONS_SOURCE_ID, {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  mapInstance.addLayer(
    {
      id: SEASONS_LAYER_ID,
      type: "fill",
      source: SEASONS_SOURCE_ID,
      paint: {
        "fill-color": SEASON_FILL_COLOR_EXPR,
        "fill-opacity": 0.75,
      },
    },
    "countries-border",
  );
}

export default function VisaMap({
  passport,
  activeCategories,
  mapColorMode,
  seasonMonth,
  activeSafetyLevels,
  activeCostLevels,
  activeSeasonTypes,
  seasonDistinctKeys,
  onSeasonDistinctKeysLoaded,
  coloringEnabled,
  selectedLanguageCodes,
  officialLanguageCodesByIso,
}: VisaMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const visaDataRef = useRef<VisaDetail[]>([]);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCategoriesRef = useRef(activeCategories);
  const coloringEnabledRef = useRef(coloringEnabled);
  const mapColorModeRef = useRef(mapColorMode);
  const seasonMonthRef = useRef(seasonMonth);
  const activeSafetyLevelsRef = useRef(activeSafetyLevels);
  const activeCostLevelsRef = useRef(activeCostLevels);
  const activeSeasonTypesRef = useRef(activeSeasonTypes);
  const seasonDistinctKeysRef = useRef(seasonDistinctKeys);
  const seasonFetchGenRef = useRef(0);
  /** Совпадает с последним gen, для которого применили ответ geodata (или осознанно пустой). */
  const seasonDataAppliedGenRef = useRef(0);
  const passportRef = useRef(passport);
  const loadVisaMapRef = useRef<(iso: string) => Promise<void>>(async () => {});
  const refreshMapPaintRef = useRef<() => void>(() => {});
  const countryAttrsRef = useRef<Map<string, CountryAttrs>>(new Map());
  const seasonKeyByIsoRef = useRef<Map<string, string>>(new Map());
  /** Обогащённый сезонный FC без `filter_pass` — последний успешный ответ за месяц. */
  const enrichedSeasonBaseRef = useRef<GeoJSON.FeatureCollection | null>(null);
  /** Месяц данных в `enrichedSeasonBaseRef` (чтобы не смешивать слой при смене месяца до ответа API). */
  const enrichedSeasonBaseMonthRef = useRef<number | null>(null);
  const onSeasonDistinctKeysLoadedRef = useRef(onSeasonDistinctKeysLoaded);
  const runSeasonGeodataFetchRef = useRef<() => void>(() => {});
  const selectedLanguageCodesRef = useRef(selectedLanguageCodes);
  const officialLanguageCodesByIsoRef = useRef(officialLanguageCodesByIso);

  const [popupCountry, setPopupCountry] = useState<CountryInfo | null>(null);
  const [popupVisa, setPopupVisa] = useState<VisaDetail | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    activeCategoriesRef.current = activeCategories;
  }, [activeCategories]);

  useEffect(() => {
    coloringEnabledRef.current = coloringEnabled;
  }, [coloringEnabled]);

  useEffect(() => {
    mapColorModeRef.current = mapColorMode;
  }, [mapColorMode]);

  useEffect(() => {
    seasonMonthRef.current = seasonMonth;
  }, [seasonMonth]);

  useEffect(() => {
    activeSafetyLevelsRef.current = activeSafetyLevels;
  }, [activeSafetyLevels]);

  useEffect(() => {
    activeCostLevelsRef.current = activeCostLevels;
  }, [activeCostLevels]);

  useEffect(() => {
    activeSeasonTypesRef.current = activeSeasonTypes;
  }, [activeSeasonTypes]);

  useEffect(() => {
    seasonDistinctKeysRef.current = seasonDistinctKeys;
  }, [seasonDistinctKeys]);

  useEffect(() => {
    onSeasonDistinctKeysLoadedRef.current = onSeasonDistinctKeysLoaded;
  }, [onSeasonDistinctKeysLoaded]);

  useEffect(() => {
    selectedLanguageCodesRef.current = selectedLanguageCodes;
  }, [selectedLanguageCodes]);

  useEffect(() => {
    officialLanguageCodesByIsoRef.current = officialLanguageCodesByIso;
  }, [officialLanguageCodesByIso]);

  const refreshMapPaint = useCallback(() => {
    const m = map.current;
    if (!m || !mapLoadedRef.current) return;

    const mode = mapColorModeRef.current;
    const enabled = coloringEnabledRef.current;

    const passesComposite = (iso2: string, seasonKeyForFilter: string): boolean => {
      const visa = visaDataRef.current.find((v) => v.iso2 === iso2);
      if (!visa || !activeCategoriesRef.current.has(visa.visa_category)) {
        return false;
      }
      const attrs = countryAttrsRef.current.get(iso2);
      const safety = normAttr(attrs?.safety_level);
      // Если у страны нет уровня безопасности в данных — не блокируем визовую раскраску
      if (safety && !activeSafetyLevelsRef.current.has(safety)) {
        return false;
      }
      const cost = normAttr(attrs?.cost_level);
      if (cost && !activeCostLevelsRef.current.has(cost)) {
        return false;
      }
      const selLang = selectedLanguageCodesRef.current;
      if (selLang.size > 0) {
        const codes = officialLanguageCodesByIsoRef.current.get(iso2) ?? [];
        const have = new Set(codes.map((c) => String(c).trim().toLowerCase()));
        let langHit = false;
        for (const s of selLang) {
          if (have.has(String(s).trim().toLowerCase())) {
            langHit = true;
            break;
          }
        }
        if (!langHit) {
          return false;
        }
      }
      const distinctSeason = seasonDistinctKeysRef.current;
      if (distinctSeason.length > 0) {
        const sk = normalizeSeasonKey(seasonKeyForFilter);
        // Нет сезона в слое сезонов / нет данных — не блокируем (иначе не красятся
        // страны вне сезонного GeoJSON, напр. отдельные территории).
        if (sk && !activeSeasonTypesRef.current.has(sk)) {
          return false;
        }
      }
      return true;
    };

    const passesForNonSeasonLayers = (iso2: string): boolean => {
      const sk = seasonKeyByIsoRef.current.get(iso2) ?? "";
      return passesComposite(iso2, sk);
    };

    if (!enabled) {
      m.setPaintProperty("countries-fill", "fill-opacity", 0);
      setSeasonLayerVisibility(m, false);
      return;
    }

    const baseForSeason = enrichedSeasonBaseRef.current;
    const monthMatchesBase =
      enrichedSeasonBaseMonthRef.current === seasonMonthRef.current;
    if (baseForSeason?.features?.length && monthMatchesBase) {
      ensureSeasonLayer(m);
      syncSeasonSourceWithCompositeFilter(m, baseForSeason, passesComposite);
    }

    if (mode === "season") {
      ensureSeasonLayer(m);
      m.setPaintProperty("countries-fill", "fill-color", NEUTRAL_COUNTRIES_COLOR);
      m.setPaintProperty("countries-fill", "fill-opacity", 0.32);
      const gen = seasonFetchGenRef.current;
      const applied = seasonDataAppliedGenRef.current;
      const geoReady = gen > 0 && gen === applied && monthMatchesBase;
      setSeasonLayerVisibility(m, geoReady);
      if (geoReady) {
        m.setPaintProperty(SEASONS_LAYER_ID, "fill-color", SEASON_FILL_COLOR_EXPR);
        m.setPaintProperty(
          SEASONS_LAYER_ID,
          "fill-opacity",
          buildSeasonLayerCompositeOpacityExpression(
            activeSeasonTypesRef.current,
            seasonDistinctKeysRef.current,
          ) as maplibregl.ExpressionSpecification,
        );
      }
      return;
    }

    setSeasonLayerVisibility(m, false);

    if (mode === "citizenship") {
      applyVisaColorsWithCompositeFilters(
        m,
        visaDataRef.current,
        activeCategoriesRef.current,
        passesForNonSeasonLayers,
        true,
      );
      return;
    }

    if (mode === "safety") {
      applyAttributeColorsWithCompositeFilters(
        m,
        "safety_level",
        SAFETY_COLORS,
        activeSafetyLevelsRef.current,
        countryAttrsRef.current,
        passesForNonSeasonLayers,
        true,
      );
      return;
    }

    if (mode === "budget") {
      applyAttributeColorsWithCompositeFilters(
        m,
        "cost_level",
        COST_COLORS,
        activeCostLevelsRef.current,
        countryAttrsRef.current,
        passesForNonSeasonLayers,
        true,
      );
      return;
    }

    if (mode === "language") {
      applyLanguageBinaryColors(
        m,
        countryAttrsRef.current,
        passesForNonSeasonLayers,
        true,
      );
      return;
    }

    m.setPaintProperty("countries-fill", "fill-opacity", 0);
  }, []);

  useEffect(() => {
    runSeasonGeodataFetchRef.current = () => {
      const mapInstance = map.current;
      if (!mapInstance || !mapLoadedRef.current) return;

      ensureSeasonLayer(mapInstance);

      const gen = ++seasonFetchGenRef.current;
      const month = seasonMonthRef.current;
      const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
      const geoUrl = `${API_URL}/country-seasons/${month}/geodata`;
      const metaUrl = `${API_URL}/country-seasons/${month}/meta`;

      refreshMapPaintRef.current();

      void fetch(metaUrl).then(async (res) => {
        if (seasonFetchGenRef.current !== gen) return;
        if (!res.ok) return;
        try {
          const data = (await res.json()) as { seasons?: unknown };
          const rawList = Array.isArray(data.seasons) ? data.seasons : [];
          const seasons = rawList
            .filter((x): x is string => typeof x === "string")
            .map((s) => s.trim().toLowerCase());
          const uniq = [...new Set(seasons)].sort((a, b) => a.localeCompare(b));
          onSeasonDistinctKeysLoadedRef.current?.(month, uniq);
        } catch {
          /* /meta необязателен */
        }
      });

      void (async () => {
        try {
          const response = await fetch(geoUrl);
          if (seasonFetchGenRef.current !== gen) return;
          if (!mapInstance.getSource(SEASONS_SOURCE_ID)) return;
          if (!response.ok) {
            seasonDataAppliedGenRef.current = gen;
            enrichedSeasonBaseRef.current = null;
            enrichedSeasonBaseMonthRef.current = null;
            seasonKeyByIsoRef.current = new Map();
            (mapInstance.getSource(SEASONS_SOURCE_ID) as maplibregl.GeoJSONSource).setData(
              empty,
            );
            onSeasonDistinctKeysLoadedRef.current?.(month, []);
            refreshMapPaintRef.current();
            return;
          }
          const raw = (await response.json()) as Record<string, unknown>;
          if (seasonFetchGenRef.current !== gen) return;
          const distinctKeys = extractDistinctSeasonKeysFromGeodataPayload(raw);
          const features = Array.isArray(raw.features)
            ? (raw.features as GeoJSON.Feature[])
            : [];
          const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
          if (!features.length) {
            seasonDataAppliedGenRef.current = gen;
            enrichedSeasonBaseRef.current = null;
            enrichedSeasonBaseMonthRef.current = null;
            seasonKeyByIsoRef.current = new Map();
            (mapInstance.getSource(SEASONS_SOURCE_ID) as maplibregl.GeoJSONSource).setData(
              empty,
            );
            onSeasonDistinctKeysLoadedRef.current?.(month, distinctKeys);
            refreshMapPaintRef.current();
            return;
          }
          if (seasonFetchGenRef.current !== gen) return;
          const enriched = enrichCountrySeasonsGeoJson(fc);
          enrichedSeasonBaseRef.current = enriched;
          enrichedSeasonBaseMonthRef.current = month;
          seasonKeyByIsoRef.current = buildSeasonKeyByIsoFromFc(enriched);
          seasonDataAppliedGenRef.current = gen;
          onSeasonDistinctKeysLoadedRef.current?.(month, distinctKeys);
          refreshMapPaintRef.current();
        } catch {
          if (seasonFetchGenRef.current !== gen) return;
          seasonDataAppliedGenRef.current = gen;
          enrichedSeasonBaseRef.current = null;
          enrichedSeasonBaseMonthRef.current = null;
          seasonKeyByIsoRef.current = new Map();
          if (mapInstance.getSource(SEASONS_SOURCE_ID)) {
            (mapInstance.getSource(SEASONS_SOURCE_ID) as maplibregl.GeoJSONSource).setData(
              empty,
            );
          }
          onSeasonDistinctKeysLoadedRef.current?.(month, []);
          refreshMapPaintRef.current();
        }
      })();
    };
  }, []);

  useEffect(() => {
    runSeasonGeodataFetchRef.current();
  }, [seasonMonth]);

  const loadVisaMap = useCallback(async (passportIso2: string) => {
    if (!map.current || !mapLoadedRef.current) return;
    try {
      const response = await fetch(`${API_URL}/visa-map/${passportIso2}`);
      const visaData: VisaDetail[] = await response.json();
      visaDataRef.current = visaData;
      refreshMapPaint();
    } catch (error) {
      console.error("Ошибка загрузки визовых данных:", error);
    }
  }, [refreshMapPaint]);

  useEffect(() => {
    passportRef.current = passport;
    loadVisaMapRef.current = loadVisaMap;
    refreshMapPaintRef.current = refreshMapPaint;
  }, [passport, loadVisaMap, refreshMapPaint]);

  useEffect(() => {
    refreshMapPaint();
  }, [
    refreshMapPaint,
    mapColorMode,
    coloringEnabled,
    activeCategories,
    activeSafetyLevels,
    activeCostLevels,
    activeSeasonTypes,
    seasonDistinctKeys,
    seasonMonth,
    selectedLanguageCodes,
    officialLanguageCodesByIso,
  ]);

  useEffect(() => {
    if (passport && mapLoadedRef.current) {
      loadVisaMap(passport);
    }
  }, [passport, loadVisaMap]);

  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    const mapInstance = new maplibregl.Map({
      container,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [20, 20],
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 8,
    });

    map.current = mapInstance;
    mapInstance.addControl(new maplibregl.NavigationControl(), "top-right");

    mapInstance.on("load", async () => {
      if (!map.current) return;
      try {
        const response = await fetch(`${API_URL}/countries/geodata`);
        const geojson = await response.json();

        countryAttrsRef.current = buildCountryAttrsIndex(geojson);

        mapInstance.addSource("countries", {
          type: "geojson",
          data: geojson,
          promoteId: "iso2",
        });

        mapInstance.addLayer({
          id: "countries-fill",
          type: "fill",
          source: "countries",
          paint: {
            "fill-color": VISA_COLORS.unknown,
            "fill-opacity": 0.6,
          },
        });

        mapInstance.addLayer({
          id: "countries-border",
          type: "line",
          source: "countries",
          paint: {
            "line-color": "#334155",
            "line-width": 0.5,
          },
        });

        mapInstance.addLayer({
          id: "countries-hover",
          type: "fill",
          source: "countries",
          paint: {
            "fill-color": "#ffffff",
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.15,
              0,
            ],
          },
        });

        mapLoadedRef.current = true;
        await loadVisaMapRef.current(passportRef.current);
        refreshMapPaintRef.current();
        runSeasonGeodataFetchRef.current();
      } catch (error) {
        console.error("Ошибка загрузки геоданных:", error);
      }
    });

    mapInstance.on("mousemove", "countries-fill", (e) => {
      if (!map.current || !e.features?.length) return;
      mapInstance.getCanvas().style.cursor = "pointer";

      const iso2 = e.features[0].properties?.iso2;
      if (iso2) {
        mapInstance.setFeatureState(
          { source: "countries", id: iso2 },
          { hover: true },
        );
      }

      const mouseX = e.originalEvent.clientX;
      const mouseY = e.originalEvent.clientY;

      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

      hoverTimerRef.current = setTimeout(async () => {
        if (!iso2) return;
        try {
          const response = await fetch(`${API_URL}/countries/${iso2}`);
          const country = await response.json();
          const visa = visaDataRef.current.find((v) => v.iso2 === iso2) ?? null;
          setPopupCountry(country);
          setPopupVisa(visa);
          setPopupPos({ x: mouseX, y: mouseY });
        } catch (error) {
          console.error("Ошибка загрузки страны:", error);
        }
      }, 400);
    });

    mapInstance.on("mouseleave", "countries-fill", () => {
      if (!map.current) return;
      mapInstance.getCanvas().style.cursor = "";
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setPopupCountry(null);
      setPopupVisa(null);

      const features = mapInstance.queryRenderedFeatures(undefined, {
        layers: ["countries-fill"],
      });
      features.forEach((f) => {
        const iso2 = f.properties?.iso2;
        if (iso2) {
          mapInstance.setFeatureState(
            { source: "countries", id: iso2 },
            { hover: false },
          );
        }
      });
    });

    return () => {
      mapLoadedRef.current = false;
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      <CountryPopup
        country={popupCountry}
        visa={popupVisa}
        x={popupPos.x}
        y={popupPos.y}
      />
    </div>
  );
}
