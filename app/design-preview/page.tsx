"use client";

import Link from "next/link";
import { useState } from "react";
import PassportCountrySearch from "../components/passport-country-search";
import VisaMap from "../components/VisaMap";
import TravelCollections from "../components/TravelCollections";
import { useHomeMapState } from "../hooks/use-home-map-state";
import AzureArticlesBento from "./azure-articles-bento";
import AzureFilterDrawer from "./azure-filter-drawer";

export default function DesignPreviewPage() {
  const s = useHomeMapState();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const year = new Date().getFullYear();

  return (
    <>
      <main className="relative z-10 pt-4">
        <section className="relative flex min-h-[750px] items-center justify-center overflow-hidden bg-surface px-6 py-12 lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

          <div className="relative mx-auto w-full max-w-7xl">
            <div className="relative flex min-h-[min(680px,_75vh)] w-full flex-col overflow-hidden rounded-[2.5rem] bg-surface-container-low shadow-sm ring-1 ring-outline-variant/[0.12] lg:aspect-[16/8]">
              <div className="relative flex min-h-0 w-full flex-1 flex-col p-4 lg:p-8">
                {/*
                  VisaMap задаёт карте h-full — нужна явная высота предка (не только min-h),
                  иначе контейнер MapLibre может быть 0px и стиль тайлов не отрисуется.
                */}
                <div className="relative h-[min(620px,_70vh)] min-h-[min(400px,_45vh)] w-full shrink-0">
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
                </div>

                <div className="pointer-events-none absolute inset-0 z-[45] flex items-start justify-between gap-2 px-2 pt-2 sm:px-4 sm:pt-4">
                  <button
                    type="button"
                    className="group pointer-events-auto flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-surface-container-lowest p-3 shadow-xl ring-1 ring-outline-variant/10 transition-colors hover:bg-surface-container sm:gap-3 sm:p-4"
                    onClick={() => setDrawerOpen((v) => !v)}
                    aria-expanded={drawerOpen}
                    aria-controls="azure-filter-drawer"
                  >
                    <span className="material-symbols-outlined text-primary" aria-hidden>
                      tune
                    </span>
                    <span className="azure-font-headline hidden text-sm font-bold sm:inline">
                      Фильтры карты
                    </span>
                  </button>

                  <div className="pointer-events-auto flex min-w-0 flex-1 justify-center px-1 sm:px-3">
                    <PassportCountrySearch
                      className="w-full max-w-md"
                      value={s.passport}
                      onChange={s.handlePassportChange}
                    />
                  </div>

                  <span className="pointer-events-none w-11 shrink-0 sm:w-28" aria-hidden />
                </div>

                <AzureFilterDrawer
                  open={drawerOpen}
                  onClose={() => setDrawerOpen(false)}
                  passport={s.passport}
                  onPassportChange={s.handlePassportChange}
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
                  activeVacationTypes={s.activeVacationTypes}
                  onToggleVacationType={s.handleToggleVacationType}
                  selectedDepartureCities={s.selectedDepartureCities}
                  onToggleDepartureCity={s.handleToggleDepartureCity}
                />
              </div>
            </div>
          </div>
        </section>

        <TravelCollections
          matchingCountries={s.matchingCountries}
          countryMetaByIso={s.countryMetaByIso}
          listReady={s.matchingListReady}
          variant="azure"
        />

        <AzureArticlesBento />

        <footer className="mt-20 w-full rounded-t-[2rem] bg-surface-container-low px-8 py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex flex-col gap-2">
              <div className="azure-font-headline text-xl font-bold text-on-surface">
                VisaMap
              </div>
              <p className="azure-font-body max-w-xs text-sm text-on-surface-variant">
                Интерактивная карта визовых режимов и подсказки для планирования поездки.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-8 azure-font-body text-sm">
              <Link
                className="text-on-surface opacity-70 transition-opacity hover:opacity-100 hover:underline decoration-primary-container underline-offset-4"
                href="/"
              >
                Классическая версия сайта
              </Link>
              <span className="text-on-surface-variant opacity-70">Поддержка (скоро)</span>
              <span className="text-on-surface-variant opacity-70">Контакты (скоро)</span>
            </div>
            <div className="flex flex-col items-center gap-2 md:items-end">
              <div className="flex gap-4">
                <span className="material-symbols-outlined cursor-pointer text-primary transition-transform hover:scale-110">
                  public
                </span>
                <span className="material-symbols-outlined cursor-pointer text-primary transition-transform hover:scale-110">
                  language
                </span>
              </div>
              <p className="azure-font-body text-xs text-on-surface-variant opacity-60">
                © {year} VisaMap — превью Azure Horizon (макет)
              </p>
            </div>
          </div>
        </footer>
      </main>

      <button
        type="button"
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_12px_40px_rgb(0_93_144_/_0.3)] transition-all hover:scale-110 active:scale-95"
        aria-label="Чат (скоро)"
      >
        <span className="material-symbols-outlined" aria-hidden>
          chat_bubble
        </span>
      </button>
    </>
  );
}
