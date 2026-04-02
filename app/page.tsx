"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VisaMap from "./components/VisaMap";
import FilterSidebar from "./components/FilterSidebar";
import TravelCollections from "./components/TravelCollections";
import ArticleSection from "./components/ArticleSection";
import Footer from "./components/Footer";
import type { MapColorMode } from "./types/map";
import { getSeasonFilterRowPresentation } from "./lib/season-colors";

const ALL_CATEGORIES = new Set(["free", "evisa", "voa", "embassy", "unavailable"]);
const ALL_SAFETY_LEVELS = new Set(["safe", "unsafe", "dangerous"]);
const ALL_COST_LEVELS = new Set(["low", "medium", "high"]);

export default function Home() {
  const [passport, setPassport] = useState("RU");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(ALL_CATEGORIES));
  const [activeSafetyLevels, setActiveSafetyLevels] = useState<Set<string>>(
    () => new Set(ALL_SAFETY_LEVELS),
  );
  const [activeCostLevels, setActiveCostLevels] = useState<Set<string>>(
    () => new Set(ALL_COST_LEVELS),
  );
  const [mapColorMode, setMapColorMode] = useState<MapColorMode>("citizenship");
  const [seasonMonth, setSeasonMonth] = useState(() => new Date().getMonth() + 1);
  const [distinctSeasonKeys, setDistinctSeasonKeys] = useState<string[]>([]);
  const [activeSeasonTypes, setActiveSeasonTypes] = useState<Set<string>>(
    () => new Set(),
  );
  const [coloringEnabled, setColoringEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const seasonMonthRef = useRef(seasonMonth);

  useEffect(() => {
    seasonMonthRef.current = seasonMonth;
  }, [seasonMonth]);

  const handleSeasonMonthChange = useCallback((month: number) => {
    setSeasonMonth(month);
  }, []);

  const onSeasonDistinctKeysLoaded = useCallback((loadedMonth: number, keys: string[]) => {
    if (loadedMonth !== seasonMonthRef.current) return;
    setDistinctSeasonKeys(keys);
    setActiveSeasonTypes(new Set(keys));
  }, []);

  const seasonFilterRows = useMemo(
    () =>
      distinctSeasonKeys.map((k) => ({
        key: k,
        ...getSeasonFilterRowPresentation(k),
      })),
    [distinctSeasonKeys],
  );

  function handlePassportChange(iso2: string) {
    setPassport(iso2);
  }

  function handleToggleCategory(key: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleToggleSafetyLevel(key: string) {
    setActiveSafetyLevels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleToggleCostLevel(key: string) {
    setActiveCostLevels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleToggleSeasonType(key: string) {
    setActiveSeasonTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <main className="w-full">
      <section className="w-full flex" style={{ height: "100vh" }}>
        <FilterSidebar
          passport={passport}
          onPassportChange={handlePassportChange}
          activeCategories={activeCategories}
          onToggleCategory={handleToggleCategory}
          activeSafetyLevels={activeSafetyLevels}
          onToggleSafetyLevel={handleToggleSafetyLevel}
          activeCostLevels={activeCostLevels}
          onToggleCostLevel={handleToggleCostLevel}
          mapColorMode={mapColorMode}
          onMapColorModeChange={setMapColorMode}
          seasonMonth={seasonMonth}
          onSeasonMonthChange={handleSeasonMonthChange}
          activeSeasonTypes={activeSeasonTypes}
          onToggleSeasonType={handleToggleSeasonType}
          seasonFilterRows={seasonFilterRows}
          coloringEnabled={coloringEnabled}
          onColoringEnabledChange={setColoringEnabled}
          isOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-8 h-full hover:opacity-70 transition-opacity shrink-0"
            style={{ backgroundColor: "#edeae3" }}
            title="Открыть фильтры"
          >
            <svg className="w-4 h-4" style={{ color: "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5l7 7-7 7" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div className="flex-1 relative overflow-hidden">
          <VisaMap
            passport={passport}
            activeCategories={activeCategories}
            mapColorMode={mapColorMode}
            seasonMonth={seasonMonth}
            activeSafetyLevels={activeSafetyLevels}
            activeCostLevels={activeCostLevels}
            activeSeasonTypes={activeSeasonTypes}
            seasonDistinctKeys={distinctSeasonKeys}
            onSeasonDistinctKeysLoaded={onSeasonDistinctKeysLoaded}
            coloringEnabled={coloringEnabled}
          />
        </div>
      </section>

      <TravelCollections />
      <ArticleSection />
      <Footer />
    </main>
  );
}
