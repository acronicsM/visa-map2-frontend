"use client";

import { Fragment, useRef, useState } from "react";
import PassportSelect from "./PassportSelect";
import LanguageMultiSelect from "./language-multi-select";
import DepartureCityMultiSelect from "./departure-city-multi-select";
import type { MapColorMode } from "../types/map";

const VISA_CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: "free", label: "Без визы", color: "#22c55e" },
  { key: "evisa", label: "Электронная виза", color: "#eab308" },
  { key: "voa", label: "По прибытию", color: "#3b82f6" },
  { key: "embassy", label: "Нужна виза", color: "#ef4444" },
  { key: "unavailable", label: "Недоступно", color: "#6b7280" },
];

const SAFETY_LEVELS: { key: string; label: string; color: string }[] = [
  { key: "safe", label: "Безопасно", color: "#22c55e" },
  { key: "unsafe", label: "Риски", color: "#eab308" },
  { key: "dangerous", label: "Опасно", color: "#ef4444" },
];

const BUDGET_TIERS: { key: string; label: string; color: string }[] = [
  { key: "cheap", label: "Эконом", color: "#22c55e" },
  { key: "normal", label: "Средний", color: "#eab308" },
  { key: "expensive", label: "Премиум", color: "#ef4444" },
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
  { key: "budget" as const, label: "Стоимость отдыха" },
  { key: "season" as const, label: "Сезонность" },
  { key: "language" as const, label: "Язык" },
  { key: "vacation" as const, label: "Тип отдыха" },
  { key: "flight" as const, label: "Прямой отдых" },
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
        className="flex w-full items-stretch overflow-hidden rounded-md border border-[#ddd9d0] bg-white outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#edeae3]"
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
                  color: selected ? "#2563eb" : "#6b7280",
                  backgroundColor: selected ? "rgba(59, 130, 246, 0.12)" : "transparent",
                }}
              >
                {m.value}
              </button>
              <span className={sepClass} aria-hidden />
            </Fragment>
          );
        })}
      </div>
      <p className="text-center text-[14px]" style={{ color: "#374151" }} aria-live="polite">
        {monthLabel}
      </p>
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
  budgetTier: string | null;
  onBudgetTierChange: (tier: string | null) => void;
  mapColorMode: MapColorMode;
  onMapColorModeChange: (mode: MapColorMode) => void;
  seasonMonth: number;
  onSeasonMonthChange: (month: number) => void;
  activeSeasonTypes: Set<string>;
  onToggleSeasonType: (key: string) => void;
  seasonFilterRows: { key: string; label: string; color: string }[];
  coloringEnabled: boolean;
  onColoringEnabledChange: (enabled: boolean) => void;
  isOpen: boolean;
  onToggleSidebar: () => void;
  languageOptions: string[];
  selectedLanguageCodes: Set<string>;
  onToggleLanguageCode: (code: string) => void;
  activeVacationTypes: Set<string>;
  onToggleVacationType: (key: string) => void;
  selectedDepartureCities: Set<string>;
  onToggleDepartureCity: (city: string) => void;
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
      className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""} ${className ?? ""}`}
      style={{ color: "#9ca3af" }}
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
        className="w-2.5 h-2.5 rounded-full transition-colors duration-200"
        style={{ backgroundColor: active ? "#3b82f6" : "#d1d5db" }}
      />
      <span
        className="text-xs transition-colors duration-200"
        style={{ color: active ? "#3b82f6" : "#9ca3af" }}
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
  budgetTier,
  onBudgetTierChange,
  mapColorMode,
  onMapColorModeChange,
  seasonMonth,
  onSeasonMonthChange,
  activeSeasonTypes,
  onToggleSeasonType,
  seasonFilterRows,
  coloringEnabled,
  onColoringEnabledChange,
  isOpen,
  onToggleSidebar,
  languageOptions,
  selectedLanguageCodes,
  onToggleLanguageCode,
  activeVacationTypes,
  onToggleVacationType,
  selectedDepartureCities,
  onToggleDepartureCity,
}: FilterSidebarProps) {
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
      className="relative flex flex-col transition-all duration-300 ease-in-out overflow-hidden"
      style={{
        width: isOpen ? "280px" : "0px",
        minHeight: "100%",
        backgroundColor: "#edeae3",
        flexShrink: 0,
      }}
    >
      {isOpen && (
        <div className="flex flex-col h-full overflow-y-auto" style={{ minWidth: "280px" }}>

          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <span
              className="text-xs font-semibold tracking-widest"
              style={{ color: "#a8a39a", letterSpacing: "0.12em" }}
            >
              ФИЛЬТРЫ
            </span>
            <button
              onClick={onToggleSidebar}
              className="w-6 h-6 flex items-center justify-center hover:opacity-60 transition-opacity"
              title="Свернуть"
              style={{ color: "#9ca3af" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col mx-3">
            {FILTER_GROUPS.map(({ key, label }, idx) => {
              const isColorActive = mapColorMode === key && coloringEnabled;
              const isSectionOpen = openSections.has(key);

              return (
                <div
                  key={key}
                  style={{
                    borderLeft: isColorActive ? "3px solid #3b82f6" : "3px solid transparent",
                    borderTop: idx > 0 ? "1px solid #ddd9d0" : undefined,
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSectionOpen(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") toggleSectionOpen(key);
                    }}
                    className="w-full flex items-center justify-between px-3 py-3 cursor-pointer hover:bg-black/3 transition-colors select-none rounded"
                  >
                    <span className="text-[15px] font-medium" style={{ color: "#374151" }}>
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
                      <div className="px-3 pb-3">
                        <span
                          className="block text-[13px] mb-2"
                          style={{ color: "#9ca3af" }}
                        >
                          Ваш паспорт
                        </span>
                        <PassportSelect
                          value={passport}
                          onChange={onPassportChange}
                          bgColor="#edeae3"
                        />
                      </div>

                      <div className="px-3 pb-4 flex flex-col gap-1 justify-end mx-[2px]">
                        {VISA_CATEGORIES.map(({ key: catKey, label: catLabel, color }) => (
                          <div key={catKey} className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-[14px]" style={{ color: "#374151" }}>
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
                      {SAFETY_LEVELS.map(({ key: levKey, label: levLabel, color }) => (
                        <div key={levKey} className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-[14px]" style={{ color: "#374151" }}>
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
                    <div className="px-3 pb-4 flex flex-col gap-1 mx-[2px]">
                      {BUDGET_TIERS.map(({ key: bKey, label: bLabel, color }) => (
                        <div key={bKey} className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-[14px]" style={{ color: "#374151" }}>
                              {bLabel}
                            </span>
                          </div>
                          <Toggle
                            checked={budgetTier === bKey}
                            onChange={() =>
                              onBudgetTierChange(
                                budgetTier === bKey ? null : bKey,
                              )
                            }
                          />
                        </div>
                      ))}
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
                        <p className="text-[13px] leading-snug" style={{ color: "#9ca3af" }}>
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
                                <span
                                  className="text-[14px] truncate"
                                  style={{ color: "#374151" }}
                                  title={rowLabel}
                                >
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

                  {isSectionOpen && key === "language" && (
                    <div className="px-3 pb-4 flex flex-col gap-2">
                      <span className="text-[13px]" style={{ color: "#9ca3af" }}>
                        Языки (коды из данных бэкенда)
                      </span>
                      {languageOptions.length === 0 ? (
                        <p className="text-[13px] leading-snug" style={{ color: "#9ca3af" }}>
                          Загрузка списка языков…
                        </p>
                      ) : (
                        <LanguageMultiSelect
                          languageOptions={languageOptions}
                          selected={selectedLanguageCodes}
                          onToggle={onToggleLanguageCode}
                          bgColor="#edeae3"
                        />
                      )}
                      <p className="text-[12px] leading-snug" style={{ color: "#9ca3af" }}>
                        На карте: зелёный — страна проходит фильтры; серый — нет. Раскраска по языку —
                        без отдельных цветов категорий.
                      </p>
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
                            <span className="text-[14px]" style={{ color: "#374151" }}>
                              {vLabel}
                            </span>
                          </div>
                          <Toggle
                            checked={activeVacationTypes.has(vk)}
                            onChange={() => onToggleVacationType(vk)}
                          />
                        </div>
                      ))}
                      <p className="text-[12px] mt-2 leading-snug" style={{ color: "#9ca3af" }}>
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
                      <span className="text-[13px]" style={{ color: "#9ca3af" }}>
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
