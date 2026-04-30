"use client";

import VisaMap from "./components/VisaMap";
import FilterSidebar from "./components/FilterSidebar";
import PassportCountrySearch from "./components/passport-country-search";
import TravelCollections from "./components/TravelCollections";
import ArticleSection from "./components/ArticleSection";
import Footer from "./components/Footer";
import { useHomeMapState } from "./hooks/use-home-map-state";

export default function Home() {
  const s = useHomeMapState();

  return (
    <main className="flex w-full min-h-0 flex-1 flex-col">
      <section
        className="flex w-full min-h-0"
        style={{ height: "calc(100svh - var(--site-header-height))" }}
      >
        <FilterSidebar
          passport={s.passport}
          onPassportChange={s.handlePassportChange}
          hidePassportInPanel
          activeCategories={s.activeCategories}
          onToggleCategory={s.handleToggleCategory}
          activeSafetyLevels={s.activeSafetyLevels}
          onToggleSafetyLevel={s.handleToggleSafetyLevel}
          budgetTier={s.budgetTier}
          onBudgetTierChange={s.handleBudgetTierChange}
          mapColorMode={s.mapColorMode}
          onMapColorModeChange={s.setMapColorMode}
          seasonMonth={s.seasonMonth}
          onSeasonMonthChange={s.handleSeasonMonthChange}
          activeSeasonTypes={s.activeSeasonTypes}
          onToggleSeasonType={s.handleToggleSeasonType}
          seasonFilterRows={s.seasonFilterRows}
          coloringEnabled={s.coloringEnabled}
          onColoringEnabledChange={s.setColoringEnabled}
          isOpen={s.sidebarOpen}
          onToggleSidebar={() => s.setSidebarOpen(!s.sidebarOpen)}
          activeVacationTypes={s.activeVacationTypes}
          onToggleVacationType={s.handleToggleVacationType}
          selectedDepartureCities={s.selectedDepartureCities}
          onToggleDepartureCity={s.handleToggleDepartureCity}
        />
        {!s.sidebarOpen && (
          <button
            type="button"
            onClick={() => s.setSidebarOpen(true)}
            className="flex h-full w-8 shrink-0 items-center justify-center bg-surface-container transition-opacity hover:opacity-70"
            title="Открыть фильтры"
          >
            <svg
              className="h-4 w-4 text-outline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5l7 7-7 7" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div className="relative flex-1 overflow-hidden">
          <VisaMap
            passport={s.passport}
            activeCategories={s.activeCategories}
            mapColorMode={s.mapColorMode}
            seasonMonth={s.seasonMonth}
            activeSafetyLevels={s.activeSafetyLevels}
            budgetTier={s.budgetTier}
            activeSeasonTypes={s.activeSeasonTypes}
            seasonDistinctKeys={s.distinctSeasonKeys}
            onSeasonDistinctKeysLoaded={s.onSeasonDistinctKeysLoaded}
            coloringEnabled={s.coloringEnabled}
            onMatchingIso2sChange={s.handleMatchingIso2sChange}
            travelCostScores={s.travelCostScores}
            travelCostScoreBands={s.travelCostScoreBands}
          />
          <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-3 sm:top-4">
            <PassportCountrySearch
              className="pointer-events-auto w-full max-w-md"
              value={s.passport}
              onChange={s.handlePassportChange}
            />
          </div>
        </div>
      </section>

      <TravelCollections
        matchingIso2s={s.matchingIso2s}
        countryMetaByIso={s.countryMetaByIso}
        listReady={s.matchingListReady}
      />
      <ArticleSection />
      <Footer />
    </main>
  );
}
