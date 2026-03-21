"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const API_URL = "http://localhost:8000";

const VISA_COLORS: Record<string, string> = {
  free: "#22c55e", // зелёный
  voa: "#3b82f6", // синий
  evisa: "#eab308", // жёлтый
  embassy: "#f97316", // оранжевый
  restricted: "#ef4444", // красный
  unavailable: "#6b7280", // серый
  unknown: "#3a3a5c", // тёмно-синий (нет данных)
};

interface VisaItem {
  iso2: string;
  visa_category: string;
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [passport, setPassport] = useState("RU");

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#0f172a" },
          },
        ],
      },
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
        console.log(`Загружено стран: ${geojson.features.length}`);

        map.current.addSource("countries", {
          type: "geojson",
          data: geojson,
          generateId: true,
          promoteId: "iso2",
        });

        map.current.addLayer({
          id: "countries-fill",
          type: "fill",
          source: "countries",
          paint: {
            "fill-color": VISA_COLORS.unknown,
            "fill-opacity": 0.85,
          },
        });

        map.current.addLayer({
          id: "countries-border",
          type: "line",
          source: "countries",
          paint: {
            "line-color": "#1e293b",
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

        // Загружаем визовые режимы для RU
        await loadVisaMap(map.current, "RU");
      } catch (error) {
        console.error("Ошибка загрузки:", error);
      }
    });

    // Hover
    map.current.on("mousemove", "countries-fill", (e) => {
      if (!map.current || !e.features?.length) return;
      map.current.getCanvas().style.cursor = "pointer";
      const iso2 = e.features[0].properties?.iso2;
      if (iso2) {
        map.current.setFeatureState(
          { source: "countries", id: iso2 },
          { hover: true },
        );
      }
    });

    map.current.on("mouseleave", "countries-fill", (e) => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = "";
      const features = map.current.queryRenderedFeatures(undefined, {
        layers: ["countries-fill"],
      });
      features.forEach((f) => {
        const iso2 = f.properties?.iso2;
        if (iso2)
          map.current!.setFeatureState(
            { source: "countries", id: iso2 },
            { hover: false },
          );
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  async function loadVisaMap(
    mapInstance: maplibregl.Map,
    passportIso2: string,
  ) {
    try {
      const response = await fetch(`${API_URL}/visa-map/${passportIso2}`);
      const visaData: VisaItem[] = await response.json();
      console.log(`Загружено визовых режимов: ${visaData.length}`);

      const au = visaData.find((item) => item.iso2 === "AU");
      console.log("AU visa data:", au);

      const auFeature = map.current?.querySourceFeatures("countries", {
        filter: ["==", ["get", "iso2"], "AU"],
      });
      console.log("AU features in source:", auFeature?.length, auFeature);

      // Строим выражение цвета для MapLibre
      const colorExpression: any[] = ["match", ["get", "iso2"]];

      visaData.forEach((item) => {
        colorExpression.push(item.iso2);
        colorExpression.push(
          VISA_COLORS[item.visa_category] || VISA_COLORS.unknown,
        );
      });

      colorExpression.push(VISA_COLORS.unknown);

      mapInstance.setPaintProperty(
        "countries-fill",
        "fill-color",
        colorExpression,
      );
    } catch (error) {
      console.error("Ошибка загрузки визовых данных:", error);
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Легенда */}
      <div className="absolute bottom-8 left-4 bg-slate-900 bg-opacity-90 rounded-lg p-3 text-white text-xs">
        <div className="font-semibold mb-2 text-sm">Визовый режим</div>
        {Object.entries({
          free: "Без визы",
          voa: "Виза по прилёту",
          evisa: "Электронная виза",
          embassy: "Виза в посольстве",
          restricted: "Сложно получить",
          unavailable: "Въезд закрыт",
          unknown: "Нет данных",
        }).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: VISA_COLORS[key] }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Паспорт (временно захардкожен) */}
      <div className="absolute top-4 left-4 bg-slate-900 bg-opacity-90 rounded-lg px-3 py-2 text-white text-sm">
        🇷🇺 Российский паспорт
      </div>
    </div>
  );
}
