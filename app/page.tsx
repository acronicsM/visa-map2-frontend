"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VisaMap from "./components/VisaMap";
import FilterSidebar from "./components/FilterSidebar";
import TravelCollections from "./components/TravelCollections";
import ArticleSection from "./components/ArticleSection";
import Footer from "./components/Footer";
import type { MapColorMode } from "./types/map";
import { getSeasonFilterRowPresentation } from "./lib/season-colors";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ALL_CATEGORIES = new Set(["free", "evisa", "voa", "embassy", "unavailable"]);
const ALL_SAFETY_LEVELS = new Set(["safe", "unsafe", "dangerous"]);
const ALL_COST_LEVELS = new Set(["low", "medium", "high"]);
const ALL_VACATION_TYPES = new Set([
  "beach",
  "mountain",
  "nature",
  "culture",
  "food",
  "exotic",
]);

interface CountryShortApi {
  iso2: string;
  name_ru?: string | null;
  flag_emoji?: string | null;
  official_language_codes?: string[] | null;
}

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

  const [languageOptions, setLanguageOptions] = useState<string[]>([]);
  const [officialLanguageCodesByIso, setOfficialLanguageCodesByIso] = useState<
    Map<string, string[]>
  >(() => new Map());
  const [selectedLanguageCodes, setSelectedLanguageCodes] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeVacationTypes, setActiveVacationTypes] = useState<Set<string>>(
    () => new Set(ALL_VACATION_TYPES),
  );
  const [selectedDepartureCities, setSelectedDepartureCities] = useState<Set<string>>(
    () => new Set(),
  );
  const [matchingIso2s, setMatchingIso2s] = useState<string[]>([]);
  const [matchingListReady, setMatchingListReady] = useState(false);
  const [countryMetaByIso, setCountryMetaByIso] = useState<
    Map<string, { name_ru: string; flag_emoji?: string | null }>
  >(() => new Map());

  const seasonMonthRef = useRef(seasonMonth);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${API_URL}/countries`)
      .then((r) => r.json())
      .then((data: CountryShortApi[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const codes = new Set<string>();
        const byIso = new Map<string, string[]>();
        const meta = new Map<string, { name_ru: string; flag_emoji?: string | null }>();
        for (const row of data) {
          const iso = String(row.iso2 ?? "").trim().toUpperCase();
          if (!iso) continue;
          const langs = (row.official_language_codes ?? [])
            .map((c) => String(c).trim().toLowerCase())
            .filter(Boolean);
          byIso.set(iso, langs);
          for (const c of langs) codes.add(c);
          const nameRu = String(row.name_ru ?? "").trim() || iso;
          meta.set(iso, { name_ru: nameRu, flag_emoji: row.flag_emoji ?? null });
        }
        setOfficialLanguageCodesByIso(byIso);
        setCountryMetaByIso(meta);
        setLanguageOptions([...codes].sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        if (!cancelled) {
          setLanguageOptions([]);
          setCountryMetaByIso(new Map());
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleMatchingIso2sChange = useCallback((iso2s: string[]) => {
    setMatchingIso2s(iso2s);
    setMatchingListReady(true);
  }, []);

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

  function handleToggleLanguageCode(code: string) {
    setSelectedLanguageCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleToggleVacationType(key: string) {
    setActiveVacationTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleToggleDepartureCity(city: string) {
    setSelectedDepartureCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
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
          languageOptions={languageOptions}
          selectedLanguageCodes={selectedLanguageCodes}
          onToggleLanguageCode={handleToggleLanguageCode}
          activeVacationTypes={activeVacationTypes}
          onToggleVacationType={handleToggleVacationType}
          selectedDepartureCities={selectedDepartureCities}
          onToggleDepartureCity={handleToggleDepartureCity}
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
            selectedLanguageCodes={selectedLanguageCodes}
            officialLanguageCodesByIso={officialLanguageCodesByIso}
            onMatchingIso2sChange={handleMatchingIso2sChange}
          />
        </div>
      </section>

      <TravelCollections
        matchingIso2s={matchingIso2s}
        countryMetaByIso={countryMetaByIso}
        listReady={matchingListReady}
      />
      <ArticleSection />
      <Footer />
    </main>
  );
}
