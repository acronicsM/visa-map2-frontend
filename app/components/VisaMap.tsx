"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useState } from "react";
import CountryPopup from "./CountryPopup";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

const VISA_COLORS: Record<string, string> = {
  free: "#22c55e",
  voa: "#3b82f6",
  evisa: "#eab308",
  embassy: "#ef4444",
  restricted: "#ef4444",
  unavailable: "#6b7280",
  unknown: "#1e293b",
};

const VISA_CATEGORIES: { key: string; label: string }[] = [
  { key: "free", label: "Без визы" },
  { key: "evisa", label: "Электронная виза" },
  { key: "voa", label: "По прибытию" },
  { key: "embassy", label: "Нужна виза" },
  { key: "unavailable", label: "Недоступно" },
];

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
}

interface VisaMapProps {
  passport: string;
  passportName: string;
  onPassportChange: (iso2: string, nameRu?: string) => void;
  activeCategories: Set<string>;
  onToggleCategory: (key: string) => void;
  coloringEnabled: boolean;
}

function applyVisaColors(
  mapInstance: maplibregl.Map,
  visaData: VisaDetail[],
  active: Set<string>,
  enabled: boolean,
) {
  if (!enabled) {
    mapInstance.setPaintProperty("countries-fill", "fill-opacity", 0);
    return;
  }

  mapInstance.setPaintProperty("countries-fill", "fill-opacity", 0.6);

  if (visaData.length === 0) {
    mapInstance.setPaintProperty("countries-fill", "fill-color", VISA_COLORS.unknown);
    return;
  }

  const colorExpression: unknown[] = ["match", ["get", "iso2"]];
  visaData.forEach((item) => {
    const color = active.has(item.visa_category)
      ? (VISA_COLORS[item.visa_category] ?? VISA_COLORS.unknown)
      : VISA_COLORS.unknown;
    colorExpression.push(item.iso2);
    colorExpression.push(color);
  });
  colorExpression.push(VISA_COLORS.unknown);

  mapInstance.setPaintProperty("countries-fill", "fill-color", colorExpression);
}

export default function VisaMap({
  passport,
  passportName,
  activeCategories,
  onToggleCategory,
  coloringEnabled,
}: VisaMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mapLoadedRef = useRef(false);
  const visaDataRef = useRef<VisaDetail[]>([]);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCategoriesRef = useRef(activeCategories);

  const [popupCountry, setPopupCountry] = useState<CountryInfo | null>(null);
  const [popupVisa, setPopupVisa] = useState<VisaDetail | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const coloringEnabledRef = useRef(coloringEnabled);

  useEffect(() => {
    activeCategoriesRef.current = activeCategories;
  }, [activeCategories]);

  useEffect(() => {
    coloringEnabledRef.current = coloringEnabled;
  }, [coloringEnabled]);

  const loadVisaMap = useCallback(
    async (passportIso2: string, active: Set<string>, enabled: boolean) => {
      if (!map.current || !mapLoadedRef.current) return;
      try {
        const response = await fetch(`${API_URL}/visa-map/${passportIso2}`);
        const visaData: VisaDetail[] = await response.json();
        visaDataRef.current = visaData;
        applyVisaColors(map.current, visaData, active, enabled);
      } catch (error) {
        console.error("Ошибка загрузки визовых данных:", error);
      }
    },
    []
  );

  useEffect(() => {
    if (map.current && visaDataRef.current.length > 0) {
      applyVisaColors(map.current, visaDataRef.current, activeCategories, coloringEnabled);
    }
  }, [activeCategories, coloringEnabled]);

  useEffect(() => {
    if (passport && mapLoadedRef.current) {
      loadVisaMap(passport, activeCategoriesRef.current, coloringEnabledRef.current);
    }
  }, [passport, loadVisaMap]);

  // Инициализация карты
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [20, 20],
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 8,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", async () => {
      if (!map.current) return;
      try {
        const response = await fetch(`${API_URL}/countries/geodata`);
        const geojson = await response.json();

        map.current.addSource("countries", {
          type: "geojson",
          data: geojson,
          promoteId: "iso2",
        });

        map.current.addLayer({
          id: "countries-fill",
          type: "fill",
          source: "countries",
          paint: {
            "fill-color": VISA_COLORS.unknown,
            "fill-opacity": 0.6,
          },
        });

        map.current.addLayer({
          id: "countries-border",
          type: "line",
          source: "countries",
          paint: {
            "line-color": "#334155",
            "line-width": 0.5,
          },
        });

        map.current.addLayer({
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
        await loadVisaMap(passport, activeCategoriesRef.current, coloringEnabledRef.current);
      } catch (error) {
        console.error("Ошибка загрузки геоданных:", error);
      }
    });

    map.current.on("mousemove", "countries-fill", (e) => {
      if (!map.current || !e.features?.length) return;
      map.current.getCanvas().style.cursor = "pointer";

      const iso2 = e.features[0].properties?.iso2;
      if (iso2) {
        map.current.setFeatureState(
          { source: "countries", id: iso2 },
          { hover: true }
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

    map.current.on("mouseleave", "countries-fill", () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = "";
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      setPopupCountry(null);
      setPopupVisa(null);

      const features = map.current.queryRenderedFeatures(undefined, {
        layers: ["countries-fill"],
      });
      features.forEach((f) => {
        const iso2 = f.properties?.iso2;
        if (iso2) {
          map.current!.setFeatureState(
            { source: "countries", id: iso2 },
            { hover: false }
          );
        }
      });
    });

    return () => {
      map.current?.remove();
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
