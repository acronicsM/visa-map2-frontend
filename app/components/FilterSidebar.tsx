"use client";

import { Fragment, useId, useRef, useState } from "react";
import PassportSelect from "./PassportSelect";
import DepartureCityMultiSelect from "./departure-city-multi-select";
import type {
  AffordabilityBandKey,
  MapColorMode,
  TravelSpendingTier,
} from "../types/map";
import {
  affordabilityBandSidebarColor,
  type TravelCostScoreBands,
} from "../lib/travel-cost-score-bands";
import { currencyForPassportCountry } from "../lib/country-currency";
import {
  MAP_SAFETY_FILL_COLORS,
  MAP_VISA_FILL_COLORS,
  SIDEBAR_SAFETY_FILTER_ROWS,
  SIDEBAR_VISA_FILTER_ROWS,
} from "../lib/map-fill-palettes";

const SPENDING_TIER_OPTIONS: { key: TravelSpendingTier; label: string }[] = [
  { key: "cheap", label: "Скромно" },
  { key: "normal", label: "Умеренно" },
  { key: "expensive", label: "Щедро" },
];

/** Порядок строк в UI; цвет точки — из `travelCostScoreBands` (как на карте). */
const AFFORDABILITY_OPTIONS: { key: AffordabilityBandKey; label: string }[] = [
  { key: "beyond_budget", label: "Вне бюджета" },
  { key: "skimp", label: "Придется экономить" },
  { key: "comfort", label: "Комфортно" },
  { key: "carefree", label: "Без забот" },
];

const VACATION_TYPES: { key: string; label: string; color: string }[] = [
  { key: "beach", label: "Пляжный", color: "#22c55e" },
  { key: "mountain", label: "Горный", color: "#3b82f6" },
  { key: "nature", label: "Природа", color: "#eab308" },
  { key: "culture", label: "Культура", color: "#a855f7" },
  { key: "food", label: "Еда", color: "#f97316" },
  { key: "exotic", label: "Экзотика", color: "#ec4899" },
];

/** Заглушка: города вылета до появления API */
export const STUB_DEPARTURE_CITIES = [
  "Москва",
  "Санкт-Петербург",
  "Екатеринбург",
  "Новосибирск",
  "Казань",
];

const FILTER_GROUPS = [
  { key: "citizenship" as const, label: "Гражданство" },
  { key: "safety" as const, label: "Безопасность" },
  { key: "budget" as const, label: "Стоимость путешествия" },
  { key: "season" as const, label: "Сезонность" },
  { key: "vacation" as const, label: "Тип отдыха" },
  { key: "flight" as const, label: "Прямой перелет" },
];

type FilterGroupKey = (typeof FILTER_GROUPS)[number]["key"];

const STUB_KEYS = new Set<FilterGroupKey>(["vacation", "flight"]);

const MONTH_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Январь" },
  { value: 2, label: "Февраль" },
  { value: 3, label: "Март" },
  { value: 4, label: "Апрель" },
  { value: 5, label: "Май" },
  { value: 6, label: "Июнь" },
  { value: 7, label: "Июль" },
  { value: 8, label: "Август" },
  { value: 9, label: "Сентябрь" },
  { value: 10, label: "Октябрь" },
  { value: 11, label: "Ноябрь" },
  { value: 12, label: "Декабрь" },
];

function SeasonMonthRail({
  value,
  onChange,
}: {
  value: number;
  onChange: (month: number) => void;
}) {
  const groupRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.min(12, value + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.max(1, value - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(1);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(12);
    }
  }

  function selectMonth(month: number) {
    onChange(month);
    groupRef.current?.focus();
  }

  const monthLabel = MONTH_OPTIONS[value - 1]?.label ?? "";

  const sepClass =
    "w-px shrink-0 self-stretch bg-[#c4c0b8] min-h-9 pointer-events-none select-none";

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label="Месяц для карты погоды"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex w-full items-stretch overflow-hidden rounded-md border border-outline-variant bg-white outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
      >
        <span className={sepClass} aria-hidden />
        {MONTH_OPTIONS.map((m) => {
          const selected = value === m.value;
          return (
            <Fragment key={m.value}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={m.label}
                tabIndex={-1}
                onClick={() => selectMonth(m.value)}
                className="min-h-9 min-w-0 flex-1 px-0.5 py-1 text-center text-[11px] font-medium tabular-nums leading-none transition-colors hover:bg-black/5 sm:text-xs"
                style={{
                  color: selected ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                  backgroundColor: selected ? "color-mix(in srgb, var(--color-primary) 14%, transparent)" : "transparent",
                }}
              >
                {m.value}
              </button>
              <span className={sepClass} aria-hidden />
            </Fragment>
          );
        })}
      </div>
      <p className="text-center text-[14px] text-on-surface" aria-live="polite">
        {monthLabel}
      </p>
    </div>
  );
}

function TravelSpendingRail({
  value,
  onChange,
}: {
  value: TravelSpendingTier;
  onChange: (tier: TravelSpendingTier) => void;
}) {
  const sepClass =
    "w-px shrink-0 self-stretch bg-[#c4c0b8] min-h-9 pointer-events-none select-none";
  return (
    <div
      role="radiogroup"
      aria-label="Уровень расходов: скромно, умеренно или щедро"
      className="flex w-full items-stretch overflow-hidden rounded-md border border-outline-variant bg-white outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface-container"
    >
      <span className={sepClass} aria-hidden />
      {SPENDING_TIER_OPTIONS.map((opt) => {
        const selected = value === opt.key;
        return (
          <Fragment key={opt.key}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.key)}
              className="min-h-9 min-w-0 flex-1 px-1 py-1.5 text-center text-[11px] font-medium leading-tight transition-colors hover:bg-black/5 sm:text-xs"
              style={{
                color: selected
                  ? "var(--color-primary)"
                  : "var(--color-on-surface-variant)",
                backgroundColor: selected
                  ? "color-mix(in srgb, var(--color-primary) 14%, transparent)"
                  : "transparent",
              }}
            >
              {opt.label}
            </button>
            <span className={sepClass} aria-hidden />
          </Fragment>
        );
      })}
    </div>
  );
}

function BudgetLinkChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 text-primary transition-transform duration-300 ease-out ${
        open ? "rotate-180" : ""
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Переключатель «уровни бюджета» (рельса) и числовые поля; ссылка с кавычками и стрелкой вниз. */
function BudgetSpendingSection({
  value,
  onChange,
  passportIso2,
}: {
  value: TravelSpendingTier;
  onChange: (tier: TravelSpendingTier) => void;
  passportIso2: string;
}) {
  const fieldsetId = useId();
  const toggleId = `${fieldsetId}-toggle`;
  const panelId = `${fieldsetId}-numeric`;
  const [numericOpen, setNumericOpen] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [tripDays, setTripDays] = useState("");
  const homeCurrency = currencyForPassportCountry(passportIso2);

  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          numericOpen ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        }`}
      >
        <div
          className={`min-h-0 overflow-hidden ${
            numericOpen ? "pointer-events-none" : ""
          }`}
        >
          <div className="flex flex-col gap-2">
            <span className="block text-[13px] font-medium text-on-surface">
              Ваш бюджет на путешествие
            </span>
            <TravelSpendingRail value={value} onChange={onChange} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setNumericOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-1 py-0.5 text-[13px] font-medium text-primary underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
        aria-expanded={numericOpen}
        aria-controls={panelId}
        id={toggleId}
      >
        <span className="font-serif text-[14px] leading-none text-primary/75" aria-hidden>
          «
        </span>
        <span className="min-w-0">
          {numericOpen ? "Ощущения бюджета" : "Уточнить бюджет"}
        </span>
        <span className="font-serif text-[14px] leading-none text-primary/75" aria-hidden>
          »
        </span>
        <BudgetLinkChevron open={numericOpen} />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          numericOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={panelId}
            role="region"
            aria-labelledby={toggleId}
            className="flex flex-col gap-3 border-t border-outline-variant/50 pt-3"
          >
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-on-surface-variant">
                Бюджет
              </span>
              <div className="flex min-w-0 items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  className="min-w-0 flex-1 rounded-md border border-outline-variant bg-white px-2.5 py-2 text-[14px] text-on-surface outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="Сумма"
                  aria-describedby={
                    homeCurrency ? `${panelId}-budget-currency` : undefined
                  }
                />
                {homeCurrency ? (
                  <span
                    id={`${panelId}-budget-currency`}
                    className="shrink-0 tabular-nums text-[13px] font-medium text-on-surface-variant"
                  >
                    {homeCurrency}
                  </span>
                ) : null}
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-on-surface-variant">
                Дней путешествия
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                className="rounded-md border border-outline-variant bg-white px-2.5 py-2 text-[14px] text-on-surface outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary"
                value={tripDays}
                onChange={(e) => setTripDays(e.target.value)}
                placeholder="Например, 7"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FilterSidebarProps {
  passport: string;
  onPassportChange: (iso2: string, nameRu?: string) => void;
  activeCategories: Set<string>;
  onToggleCategory: (key: string) => void;
  activeSafetyLevels: Set<string>;
  onToggleSafetyLevel: (key: string) => void;
  travelSpendingTier: TravelSpendingTier;
  onTravelSpendingTierChange: (tier: TravelSpendingTier) => void;
  activeAffordabilityBands: Set<AffordabilityBandKey>;
  onToggleAffordabilityBand: (key: AffordabilityBandKey) => void;
  mapColorMode: MapColorMode;
  onMapColorModeChange: (mode: MapColorMode) => void;
  seasonMonth: number;
  onSeasonMonthChange: (month: number) => void;
  activeSeasonTypes: Set<string>;
  onToggleSeasonType: (key: string) => void;
  seasonFilterRows: { key: string; label: string; color: string }[];
  /** Пороги/цвета score с API — кружки «стоимость» совпадают с карточкой карты */
  travelCostScoreBands: TravelCostScoreBands | null;
  coloringEnabled: boolean;
  onColoringEnabledChange: (enabled: boolean) => void;
  isOpen: boolean;
  onToggleSidebar: () => void;
  activeVacationTypes: Set<string>;
  onToggleVacationType: (key: string) => void;
  selectedDepartureCities: Set<string>;
  onToggleDepartureCity: (city: string) => void;
  /** Панель в оверлее превью: на всю ширину, без анимации сворачивания в 0px */
  layout?: "default" | "drawerEmbed";
  /** Паспорт выбран снаружи панели — скрыть блок «Ваш паспорт» */
  hidePassportInPanel?: boolean;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}

function ChevronIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`w-4 h-4 text-outline transition-transform duration-200 ${open ? "rotate-180" : ""} ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ColorBadge({
  active,
  onClick,
}: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-black/5 transition-colors"
    >
      <span
        className="h-2.5 w-2.5 rounded-full transition-colors duration-200"
        style={{
          backgroundColor: active ? "var(--color-primary)" : "var(--color-outline-variant)",
        }}
      />
      <span
        className="text-xs transition-colors duration-200"
        style={{
          color: active ? "var(--color-primary)" : "var(--color-outline)",
        }}
      >
        цвет
      </span>
    </button>
  );
}

export default function FilterSidebar({
  passport,
  onPassportChange,
  activeCategories,
  onToggleCategory,
  activeSafetyLevels,
  onToggleSafetyLevel,
  travelSpendingTier,
  onTravelSpendingTierChange,
  activeAffordabilityBands,
  onToggleAffordabilityBand,
  mapColorMode,
  onMapColorModeChange,
  seasonMonth,
  onSeasonMonthChange,
  activeSeasonTypes,
  onToggleSeasonType,
  seasonFilterRows,
  travelCostScoreBands,
  coloringEnabled,
  onColoringEnabledChange,
  isOpen,
  onToggleSidebar,
  activeVacationTypes,
  onToggleVacationType,
  selectedDepartureCities,
  onToggleDepartureCity,
  layout: layoutProp = "default",
  hidePassportInPanel = false,
}: FilterSidebarProps) {
  const isDrawerEmbed = layoutProp === "drawerEmbed";
  const [openSections, setOpenSections] = useState<Set<FilterGroupKey>>(
    () => new Set(["citizenship"]),
  );

  function toggleSectionOpen(key: FilterGroupKey) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleColorClick(e: React.MouseEvent, key: FilterGroupKey) {
    e.stopPropagation();
    if (STUB_KEYS.has(key)) return;

    if (mapColorMode === key && coloringEnabled) {
      onColoringEnabledChange(false);
    } else {
      onMapColorModeChange(key as MapColorMode);
      onColoringEnabledChange(true);
      setOpenSections((prev) => new Set(prev).add(key));
    }
  }

  return (
    <div
      className={
        isDrawerEmbed
          ? "relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-surface-container"
          : "relative flex flex-col overflow-hidden bg-surface-container transition-all duration-300 ease-in-out"
      }
      style={
        isDrawerEmbed
          ? {
              minHeight: "100%",
              flexShrink: 1,
            }
          : {
              width: isOpen ? "280px" : "0px",
              minHeight: "100%",
              flexShrink: 0,
            }
      }
    >
      {(isOpen || isDrawerEmbed) && (
        <div
          className="flex h-full flex-col overflow-y-auto"
          style={isDrawerEmbed ? { minWidth: 0, width: "100%" } : { minWidth: "280px" }}
        >

          {!isDrawerEmbed && (
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span
                className="text-xs font-semibold tracking-widest text-outline"
                style={{ letterSpacing: "0.12em" }}
              >
                ФИЛЬТРЫ
              </span>
              <button
                type="button"
                onClick={onToggleSidebar}
                className="flex h-6 w-6 items-center justify-center text-outline transition-opacity hover:opacity-60"
                title="Свернуть"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}




          <div className="flex flex-col mx-3">
            {FILTER_GROUPS.map(({ key, label }, idx) => {
              const isColorActive = mapColorMode === key && coloringEnabled;
              const isSectionOpen = openSections.has(key);

              return (
                <div
                  key={key}
                  style={{
                    borderLeft: isColorActive
                      ? "3px solid var(--color-primary)"
                      : "3px solid transparent",
                    borderTop: idx > 0 ? "1px solid var(--color-outline-variant)" : undefined,
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={label.trim() ? label : key}
                    onClick={() => toggleSectionOpen(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") toggleSectionOpen(key);
                    }}
                    className="w-full flex items-center justify-between px-3 py-3 cursor-pointer hover:bg-black/3 transition-colors select-none rounded"
                  >
                    <span className="text-[15px] font-medium text-on-surface">
                      {label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <ColorBadge
                        active={isColorActive}
                        onClick={(e) => handleColorClick(e, key)}
                      />
                      <ChevronIcon open={isSectionOpen} />
                    </div>
                  </div>

                  {isSectionOpen && key === "citizenship" && (
                    <div>
                      {!hidePassportInPanel && (
                        <div className="px-3 pb-3">
                          <span className="mb-2 block text-[13px] text-outline">
                            Ваш паспорт
                          </span>
                          <PassportSelect value={passport} onChange={onPassportChange} />
                        </div>
                      )}

                      <div className="mx-[2px] flex flex-col justify-end gap-1 px-3 pb-4">
                        {SIDEBAR_VISA_FILTER_ROWS.map(({ key: catKey, label: catLabel }) => (
                          <div key={catKey} className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    MAP_VISA_FILL_COLORS[catKey] ?? "#94a3b8",
                                }}
                              />
                              <span className="text-[14px] text-on-surface">
                                {catLabel}
                              </span>
                            </div>
                            <Toggle
                              checked={activeCategories.has(catKey)}
                              onChange={() => onToggleCategory(catKey)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isSectionOpen && key === "safety" && (
                    <div className="px-3 pb-4 flex flex-col gap-1 mx-[2px]">
                      {SIDEBAR_SAFETY_FILTER_ROWS.map(({ key: levKey, label: levLabel }) => (
                        <div key={levKey} className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  MAP_SAFETY_FILL_COLORS[levKey] ?? "#94a3b8",
                              }}
                            />
                            <span className="text-[14px] text-on-surface">
                              {levLabel}
                            </span>
                          </div>
                          <Toggle
                            checked={activeSafetyLevels.has(levKey)}
                            onChange={() => onToggleSafetyLevel(levKey)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {isSectionOpen && key === "budget" && (
                    <div className="mx-[2px] flex flex-col gap-3 px-3 pb-4">
                      <BudgetSpendingSection
                        value={travelSpendingTier}
                        onChange={onTravelSpendingTierChange}
                        passportIso2={passport}
                      />
                      <div className="flex flex-col gap-1">
                        {AFFORDABILITY_OPTIONS.map(({ key: bKey, label: bLabel }) => (
                            <div key={bKey} className="flex items-center justify-between">
                              <div className="flex items-center gap-0.5 min-w-0">
                                <span
                                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: affordabilityBandSidebarColor(
                                      travelCostScoreBands,
                                      bKey,
                                    ),
                                  }}
                                />
                                <span
                                  className="text-[14px] text-on-surface"
                                  title={bLabel}
                                >
                                  {bLabel}
                                </span>
                              </div>
                              <Toggle
                                checked={activeAffordabilityBands.has(bKey)}
                                onChange={() => onToggleAffordabilityBand(bKey)}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {isSectionOpen && key === "season" && (
                    <div className="px-3 pb-4 mx-[2px] flex flex-col gap-3">
                      <SeasonMonthRail
                        value={seasonMonth}
                        onChange={(month) => {
                          onSeasonMonthChange(month);
                          onMapColorModeChange("season");
                          onColoringEnabledChange(true);
                          setOpenSections((prev) => new Set(prev).add("season"));
                        }}
                      />
                      {seasonFilterRows.length === 0 ? (
                        <p className="text-[13px] leading-snug text-outline">
                          Список сезонов подставится из данных выбранного месяца после загрузки слоя
                          (включите «цвет» для «Сезонность»).
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {seasonFilterRows.map(({ key: rowKey, label: rowLabel, color }) => (
                            <div
                              key={rowKey === "" ? "__empty_season__" : rowKey}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-0.5 min-w-0">
                                <span
                                  className="w-3.5 h-3.5 rounded-full shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="truncate text-[14px] text-on-surface" title={rowLabel}>
                                  {rowLabel}
                                </span>
                              </div>
                              <Toggle
                                checked={activeSeasonTypes.has(rowKey)}
                                onChange={() => onToggleSeasonType(rowKey)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}


                  {isSectionOpen && key === "vacation" && (
                    <div className="px-3 pb-4 flex flex-col gap-1 mx-[2px]">
                      {VACATION_TYPES.map(({ key: vk, label: vLabel, color }) => (
                        <div key={vk} className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-[14px] text-on-surface">
                              {vLabel}
                            </span>
                          </div>
                          <Toggle
                            checked={activeVacationTypes.has(vk)}
                            onChange={() => onToggleVacationType(vk)}
                          />
                        </div>
                      ))}
                      <p className="mt-2 text-[12px] leading-snug text-outline">
                        Заглушка: на карту пока не влияет.
                      </p>
                    </div>
                  )}

                  {isSectionOpen && key === "flight" && (
                    <div className="px-3 pb-4 flex flex-col gap-3">
                      <DepartureCityMultiSelect
                        cityOptions={STUB_DEPARTURE_CITIES}
                        selected={selectedDepartureCities}
                        onToggle={onToggleDepartureCity}
                      />
                      <span className="text-[13px] text-outline">
                        Скоро будет доступно
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex-1" />
        </div>
      )}
    </div>
  );
}
