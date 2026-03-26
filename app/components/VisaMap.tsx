"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import PassportSelect from "./PassportSelect";
import CountryPopup from './CountryPopup'
import UserMenu from "./UserMenu";

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

const VISA_CATEGORIES: { key: string; label: string }[] = [
  { key: "evisa", label: "E-visa" },
  { key: "voa", label: "По прибытии" },
  { key: "free", label: "Без визы" },
  { key: "restricted", label: "Ограничен въезд" },
  { key: "unavailable", label: "Закрыто" },
  { key: "embassy", label: "Виза в посольстве" },
  { key: "unknown", label: "Нет данных" },
];

interface VisaItem {
  iso2: string;
  visa_category: string;
}

export default function VisaMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [passport, setPassport] = useState<string | null>("RU")
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const visaDataRef = useRef<VisaDetail[]>([])
  const mapLoadedRef = useRef(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [passportName, setPassportName] = useState<string>("РФ")
  const allCategories = new Set(VISA_CATEGORIES.map(c => c.key))
  const [activeCategories, setActiveCategories] = useState<Set<string>>(allCategories)

  function applyVisaColors(
    mapInstance: maplibregl.Map,
    visaData: VisaDetail[],
    active: Set<string>
  ) {
    if (visaData.length === 0) {
      mapInstance.setPaintProperty('countries-fill', 'fill-color', VISA_COLORS.unknown)
      return
    }

    const colorExpression: any[] = ['match', ['get', 'iso2']]
    visaData.forEach(item => {
      const color = active.has(item.visa_category)
        ? (VISA_COLORS[item.visa_category] ?? VISA_COLORS.unknown)
        : VISA_COLORS.unknown
      colorExpression.push(item.iso2)
      colorExpression.push(color)
    })
    colorExpression.push(VISA_COLORS.unknown)

    mapInstance.setPaintProperty('countries-fill', 'fill-color', colorExpression)
  }

  async function loadVisaMap(
    mapInstance: maplibregl.Map,
    passportIso2: string,
    active: Set<string>
  ) {
    try {
      if (!mapLoadedRef.current) {
        return
      }

      const response = await fetch(`${API_URL}/visa-map/${passportIso2}`)
      const visaData: VisaDetail[] = await response.json()

      visaDataRef.current = visaData
      applyVisaColors(mapInstance, visaData, active)

    } catch (error) {
      console.error('Ошибка загрузки визовых данных:', error)
    }
  }

  const handlePassportChange = useCallback((iso2: string, nameRu?: string) => {
    setPassport(iso2);
    if (nameRu) setPassportName(nameRu);
    if (map.current) {
      loadVisaMap(map.current, iso2, activeCategories);
    }
  }, [activeCategories]);

  useEffect(() => {
    if (passport && map.current) {
      loadVisaMap(map.current, passport, activeCategories);
    }
  }, [passport]);

  useEffect(() => {
    if (map.current && visaDataRef.current.length > 0) {
      applyVisaColors(map.current, visaDataRef.current, activeCategories);
    }
  }, [activeCategories]);

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
      } catch (error) {
        console.error("Ошибка загрузки геоданных:", error);
      }
    });

    // Hover эффект + всплывающая карточка
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

      const mouseX = e.originalEvent.clientX
      const mouseY = e.originalEvent.clientY

      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)

      hoverTimerRef.current = setTimeout(async () => {
        if (!iso2) return
        try {
          const response = await fetch(`${API_URL}/countries/${iso2}`)
          const country = await response.json()
          const visa = visaDataRef.current.find(v => v.iso2 === iso2) ?? null
          setPopupCountry(country)
          setPopupVisa(visa)
          setPopupPos({ x: mouseX, y: mouseY })
        } catch (error) {
          console.error('Ошибка загрузки страны:', error)
        }
      }, 400)
    });

    map.current.on("mouseleave", "countries-fill", () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = "";
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      setPopupCountry(null)
      setPopupVisa(null)

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

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Меню профиля как боковая панель */}
      <UserMenu
        isOpen={sidebarOpen}
        onOpen={() => setSidebarOpen(true)}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Выбор паспорта */}
      <div className="absolute top-4 left-16 z-10">
        <PassportSelect value={passport ?? ""} onChange={(iso2, nameRu) => handlePassportChange(iso2, nameRu)} />
      </div>

      {/* Легенда — горизонтальная панель */}
      <div className="absolute bottom-8 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 shadow-lg">
        <div className="text-xs text-slate-400 font-medium mb-2.5">
          Типы виз для граждан <span className="text-slate-600">{passportName}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {VISA_CATEGORIES.map(({ key, label }) => {
            const isActive = activeCategories.has(key)
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveCategories(prev => {
                    const next = new Set(prev)
                    if (next.has(key)) {
                      next.delete(key)
                    } else {
                      next.add(key)
                    }
                    return next
                  })
                }}
                className={`flex items-center gap-1 transition-opacity ${isActive ? "opacity-100" : "opacity-30"}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: VISA_COLORS[key] }}
                />
                <span className="text-xs text-slate-700 whitespace-nowrap">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Карточка страны — tooltip */}
      <CountryPopup
        country={popupCountry}
        visa={popupVisa}
        x={popupPos.x}
        y={popupPos.y}
      />
    </div>
  );
}
