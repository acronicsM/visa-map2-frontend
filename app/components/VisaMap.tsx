"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import PassportSelect from "./PassportSelect";
import CountryPopup from './CountryPopup'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || "";

const VISA_COLORS: Record<string, string> = {
  free: "#22c55e",
  voa: "#3b82f6",
  evisa: "#eab308",
  embassy: "#f97316",
  restricted: "#ef4444",
  unavailable: "#6b7280",
  unknown: "#1e293b",
};

interface VisaItem {
  iso2: string;
  visa_category: string;
}

export default function VisaMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [passport, setPassport] = useState("RU");

  interface CountryInfo {
    iso2: string
    name_ru: string
    name_en: string
    flag_emoji: string
    region: string
    subregion: string
    capital: string
  }

  interface VisaDetail {
    id: string
    iso2: string
    visa_category: string
    max_stay_days: number | null
    confidence_level: number
  }

  const [popupCountry, setPopupCountry] = useState<CountryInfo | null>(null)
  const [popupVisa, setPopupVisa] = useState<VisaDetail | null>(null)
  const visaDataRef = useRef<VisaDetail[]>([])

  async function loadVisaMap(
  mapInstance: maplibregl.Map,
  passportIso2: string
  ) {
    try {
      const response = await fetch(`${API_URL}/visa-map/${passportIso2}`)
      const visaData: VisaDetail[] = await response.json()

      visaDataRef.current = visaData

      const colorExpression: any[] = ['match', ['get', 'iso2']]
      visaData.forEach(item => {
        colorExpression.push(item.iso2)
        colorExpression.push(VISA_COLORS[item.visa_category] ?? VISA_COLORS.unknown)
      })
      colorExpression.push(VISA_COLORS.unknown)

      mapInstance.setPaintProperty('countries-fill', 'fill-color', colorExpression)

    } catch (error) {
      console.error('Ошибка загрузки визовых данных:', error)
    }
  }

  const handlePassportChange = useCallback((iso2: string) => {
    setPassport(iso2);
    if (map.current) {
      loadVisaMap(map.current, iso2);
    }
  }, []);

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

        await loadVisaMap(map.current, "RU");
      } catch (error) {
        console.error("Ошибка загрузки геоданных:", error);
      }
    });

    // Hover эффект
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

    map.current.on("mouseleave", "countries-fill", () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = "";
      const features = map.current.queryRenderedFeatures(undefined, {
        layers: ["countries-fill"],
      });
      features.forEach((f) => {
        const iso2 = f.properties?.iso2;
        if (iso2) {
          map.current!.setFeatureState(
            { source: "countries", id: iso2 },
            { hover: false },
          );
        }
      });
    });

    map.current.on('click', 'countries-fill', async (e) => {
      if (!e.features?.length) return

      const props = e.features[0].properties
      const iso2 = props?.iso2
      if (!iso2) return

      try {
        const response = await fetch(`${API_URL}/countries/${iso2}`)
        const country = await response.json()
        setPopupCountry(country)

        const visa = visaDataRef.current.find(v => v.iso2 === iso2) ?? null
        setPopupVisa(visa)
      } catch (error) {
        console.error('Ошибка загрузки страны:', error)
      }
    })

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Выбор паспорта */}
      <div className="absolute top-4 left-4 z-10">
        <PassportSelect value={passport} onChange={handlePassportChange} />
      </div>

      {/* Легенда */}
      <div className="absolute bottom-8 left-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg z-10">
        <div className="font-semibold mb-3 text-xs tracking-wide uppercase text-slate-500">
          Визовый режим
        </div>
        {(
          Object.entries({
            free: "Без визы",
            voa: "Виза по прилёту",
            evisa: "Электронная виза",
            embassy: "Виза в посольстве",
            restricted: "Сложно получить",
            unavailable: "Въезд закрыт",
            unknown: "Нет данных",
          }) as [string, string][]
        ).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 mb-1.5">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: VISA_COLORS[key] }}
            />
            <span className="text-xs text-slate-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Карточка страны */}
      <CountryPopup
        country={popupCountry}
        visa={popupVisa}
        onClose={() => {
          setPopupCountry(null)
          setPopupVisa(null)
        }}
      />
    </div>
  );
}
