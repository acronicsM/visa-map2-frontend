"use client";

import { Fragment, useId, useLayoutEffect, useRef, useState } from "react";
import DepartureCityCombobox from "./departure-city-combobox";
import VacationPriorityLadderDnD from "./vacation-priority-ladder-dnd";
import type { VacationLadderItem } from "../lib/vacation-fit";
import type {
  AffordabilityBandKey,
  BudgetFilterMode,
  DirectFlightBandKey,
  DirectFlightStatus,
  MapColorMode,
  TravelSpendingTier,
  VacationFitBandKey,
} from "../types/map";
import {
  affordabilityBandSidebarColor,
  type TravelCostScoreBands,
} from "../lib/travel-cost-score-bands";
import {
  MAP_REGION_FILL_COLORS,
  MAP_SAFETY_FILL_COLORS,
  MAP_VISA_FILL_COLORS,
  MAP_FLIGHT_FILL_COLORS,
  SIDEBAR_FLIGHT_FILTER_ROWS,
  SIDEBAR_REGION_FILTER_ROWS,
  SIDEBAR_SAFETY_FILTER_ROWS,
  SIDEBAR_VISA_FILTER_ROWS,
} from "../lib/map-fill-palettes";
import {
  VACATION_FIT_BAND_COLORS,
  VACATION_FIT_BAND_LABELS,
} from "../lib/vacation-fit";

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

const VACATION_FIT_OPTIONS: { key: VacationFitBandKey; label: string }[] = [
  { key: "excellent", label: VACATION_FIT_BAND_LABELS.excellent },
  { key: "good", label: VACATION_FIT_BAND_LABELS.good },
  { key: "doubtful", label: VACATION_FIT_BAND_LABELS.doubtful },
  { key: "unlikely", label: VACATION_FIT_BAND_LABELS.unlikely },
];

const FILTER_GROUPS = [
  { key: "citizenship" as const, label: "Визовые режимы" },
  { key: "safety" as const, label: "Безопасность" },
  { key: "budget" as const, label: "Стоимость путешествия" },
  { key: "season" as const, label: "Сезонность" },
  { key: "region" as const, label: "Регионы" },
  { key: "vacation" as const, label: "Интересы" },
  { key: "flight" as const, label: "Прямой перелет" },
];

type FilterGroupKey = (typeof FILTER_GROUPS)[number]["key"];

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

function formatMoney(value: number | null | undefined, currency?: string | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return `${new Intl.NumberFormat("ru-RU").format(rounded)}${currency ? ` ${currency}` : ""}`;
}

/** Целая сумма бюджета без дробной части: только цифры для состояния (пробелы из вставки отбрасываются). */
function budgetAmountIntegerDigits(raw: string): string {
  const trimmed = raw.trim().replace(/\s/g, "");
  const head = trimmed.split(/[.,]/)[0] ?? "";
  return head.replace(/\D/g, "");
}

function formatBudgetAmountGroupedRu(digits: string): string {
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return digits;
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(n);
}

/** Сколько десятичных цифр находится в строке слева от позиции каретки. */
function countDigitsBeforeCaret(raw: string, caretIndex: number): number {
  let n = 0;
  const limit = Math.min(Math.max(caretIndex, 0), raw.length);
  for (let i = 0; i < limit; i++) {
    const ch = raw.charCodeAt(i);
    if (ch >= 48 && ch <= 57) n++;
  }
  return n;
}

/** Позиция каретки после `digitsBeforeCaret`-й цифры в отформатированной строке. */
function caretAfterDigitPrefix(formatted: string, digitsBeforeCaret: number): number {
  if (digitsBeforeCaret <= 0) return 0;
  let counted = 0;
  for (let i = 0; i < formatted.length; i++) {
    const ch = formatted.charCodeAt(i);
    if (ch >= 48 && ch <= 57) {
      counted++;
      if (counted === digitsBeforeCaret) return i + 1;
    }
  }
  return formatted.length;
}

/** Переключатель «уровни бюджета» (рельса) и числовые поля; ссылка «Уточнить бюджет». */
function BudgetSpendingSection({
  value,
  onChange,
  budgetFilterMode,
  onBudgetFilterModeChange,
  exactBudgetAmount,
  onExactBudgetAmountChange,
  exactBudgetDays,
  onExactBudgetDaysChange,
  exactBudgetCurrency,
  availableBudgetCurrencies,
  onExactBudgetCurrencyChange,
  exactBudgetDailyLocal,
  exactBudgetDailyUsd,
}: {
  value: TravelSpendingTier;
  onChange: (tier: TravelSpendingTier) => void;
  budgetFilterMode: BudgetFilterMode;
  onBudgetFilterModeChange: (mode: BudgetFilterMode) => void;
  exactBudgetAmount: string;
  onExactBudgetAmountChange: (amount: string) => void;
  exactBudgetDays: string;
  onExactBudgetDaysChange: (days: string) => void;
  exactBudgetCurrency: string;
  availableBudgetCurrencies: string[];
  onExactBudgetCurrencyChange: (currency: string) => void;
  exactBudgetDailyLocal: number | null;
  exactBudgetDailyUsd: number | null;
}) {
  const fieldsetId = useId();
  const toggleId = `${fieldsetId}-toggle`;
  const panelId = `${fieldsetId}-numeric`;
  const numericOpen = budgetFilterMode === "exact";
  const budgetCurrency = exactBudgetCurrency || "USD";
  const budgetInputRef = useRef<HTMLInputElement>(null);
  /** После обновления суммы — восстановить каретку по числу цифр слева (см. useLayoutEffect). */
  const pendingBudgetCaretDigitsBeforeRef = useRef<number | null>(null);
  /** Если цифры не изменились, а в поле попали посторонние символы — форсируем перерисовку. */
  const [budgetAmountFormatBump, setBudgetAmountFormatBump] = useState(0);

  const tierSlideRef = useRef<HTMLDivElement>(null);
  const numericSlideRef = useRef<HTMLDivElement>(null);
  const [tierPanelHeight, setTierPanelHeight] = useState(0);
  const [numericPanelHeight, setNumericPanelHeight] = useState(0);

  useLayoutEffect(() => {
    const tierEl = tierSlideRef.current;
    const numEl = numericSlideRef.current;
    if (!tierEl || !numEl) return;

    function measure() {
      const t = tierSlideRef.current;
      const n = numericSlideRef.current;
      if (!t || !n) return;
      const th = t.scrollHeight;
      const nh = n.scrollHeight;
      if (th > 0) setTierPanelHeight(Math.ceil(th));
      if (nh > 0) setNumericPanelHeight(Math.ceil(nh));
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(tierEl);
    ro.observe(numEl);
    return () => ro.disconnect();
  }, []);

  const slideReady = tierPanelHeight > 0 && numericPanelHeight > 0;

  const budgetDigits = budgetAmountIntegerDigits(exactBudgetAmount);
  const budgetAmountShown =
    budgetDigits === "" ? "" : formatBudgetAmountGroupedRu(budgetDigits);

  useLayoutEffect(() => {
    const pending = pendingBudgetCaretDigitsBeforeRef.current;
    const el = budgetInputRef.current;
    pendingBudgetCaretDigitsBeforeRef.current = null;
    if (pending == null || el == null || document.activeElement !== el) return;
    const pos = caretAfterDigitPrefix(budgetAmountShown, pending);
    el.setSelectionRange(pos, pos);
  }, [budgetAmountShown, budgetAmountFormatBump]);

  function toggleNumericMode() {
    onBudgetFilterModeChange(numericOpen ? "tier" : "exact");
  }

  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div
        className="overflow-hidden transition-[max-height] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          maxHeight:
            slideReady && numericOpen
              ? 0
              : slideReady
                ? tierPanelHeight
                : undefined,
        }}
      >
        <div
          ref={tierSlideRef}
          className={`flex flex-col gap-2 transition-[opacity,transform] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            numericOpen ? "-translate-y-1 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
          }`}
        >
          <span className="block text-[13px] font-medium text-on-surface">
            Ощущения бюджета
          </span>
          <TravelSpendingRail value={value} onChange={onChange} />
        </div>
      </div>

      <button
        type="button"
        onClick={toggleNumericMode}
        className="flex w-full items-center justify-center py-0.5 text-[13px] font-medium text-primary underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
        aria-expanded={numericOpen}
        aria-controls={panelId}
        id={toggleId}
      >
        <span className="min-w-0">
          {numericOpen ? "Ощущения бюджета" : "Уточнить бюджет"}
        </span>
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          maxHeight:
            slideReady && numericOpen
              ? numericPanelHeight
              : slideReady
                ? 0
                : numericOpen
                  ? undefined
                  : 0,
        }}
      >
        <div
          ref={numericSlideRef}
          className={`transition-[opacity,transform] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            numericOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 pointer-events-none"
          }`}
        >
          <div
            id={panelId}
            role="region"
            aria-label="Калькулятор бюджета"
            className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-outline-variant/70 bg-white/70 p-3 shadow-sm"
          >
            <div className="flex min-w-0 flex-1 basis-[min(100%,10rem)] items-center gap-2">
              <input
                ref={budgetInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="min-w-16 flex-1 rounded-md border border-outline-variant bg-white px-2.5 py-2 text-[14px] text-on-surface outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary"
                value={budgetAmountShown}
                onChange={(e) => {
                  const el = e.target;
                  const caret = el.selectionStart ?? 0;
                  const digitsBefore = countDigitsBeforeCaret(el.value, caret);
                  const newDigits = budgetAmountIntegerDigits(el.value);
                  pendingBudgetCaretDigitsBeforeRef.current = digitsBefore;
                  if (newDigits !== budgetDigits) {
                    onExactBudgetAmountChange(newDigits);
                  } else {
                    setBudgetAmountFormatBump((b) => b + 1);
                  }
                }}
                placeholder="Сумма"
                aria-label="Сумма бюджета на всю поездку"
                aria-describedby={`${panelId}-budget-currency`}
              />
              <select
                id={`${panelId}-budget-currency`}
                value={budgetCurrency}
                onChange={(e) => onExactBudgetCurrencyChange(e.target.value)}
                className="max-w-[84px] shrink-0 rounded-md border border-outline-variant bg-white px-2 py-2 text-[13px] font-medium text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Валюта бюджета"
              >
                {availableBudgetCurrencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="whitespace-nowrap text-[12px] font-medium text-on-surface-variant">
                за
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                className="w-13 shrink-0 rounded-md border border-outline-variant bg-white px-1.5 py-2 text-center text-[14px] tabular-nums text-on-surface outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary"
                value={exactBudgetDays}
                onChange={(e) => onExactBudgetDaysChange(e.target.value)}
                placeholder="—"
                aria-label="Количество дней поездки"
              />
              <span className="whitespace-nowrap text-[12px] font-medium text-on-surface-variant">
                дн
              </span>
            </div>
            <div
              className="basis-full rounded-lg bg-surface-container px-3 py-2 text-[12px] leading-snug text-on-surface-variant"
              aria-live="polite"
            >
              {exactBudgetDailyLocal == null || exactBudgetDailyUsd == null ? (
                <span>
                  Укажите положительную сумму и минимум 1 день, чтобы включить точный
                  расчет.
                </span>
              ) : (
                <span>
                  В день:{" "}
                  <strong className="text-on-surface">
                    {formatMoney(exactBudgetDailyUsd, "USD")}
                  </strong>
                  {budgetCurrency !== "USD" ? (
                    <>
                      {" "}
                      <span>
                        ≈ {formatMoney(exactBudgetDailyLocal, budgetCurrency)}
                      </span>
                    </>
                  ) : null}
                </span>
              )}
            </div>
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
  activeRegions: Set<string>;
  onToggleRegion: (key: string) => void;
  travelSpendingTier: TravelSpendingTier;
  onTravelSpendingTierChange: (tier: TravelSpendingTier) => void;
  budgetFilterMode: BudgetFilterMode;
  onBudgetFilterModeChange: (mode: BudgetFilterMode) => void;
  exactBudgetAmount: string;
  onExactBudgetAmountChange: (amount: string) => void;
  exactBudgetDays: string;
  onExactBudgetDaysChange: (days: string) => void;
  exactBudgetCurrency: string;
  availableBudgetCurrencies: string[];
  onExactBudgetCurrencyChange: (currency: string) => void;
  exactBudgetDailyLocal: number | null;
  exactBudgetDailyUsd: number | null;
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
  vacationLadder: VacationLadderItem[];
  /** insertAt — индекс зазора вставки в лесенке (0…length). */
  onVacationLadderReorder: (fromIndex: number, insertAt: number) => void;
  onVacationLadderMoveUp: (slotIndex: number) => void;
  onVacationLadderMoveDown: (slotIndex: number) => void;
  onVacationLadderToggleEnabled: (slotIndex: number) => void;
  activeVacationFitBands: Set<VacationFitBandKey>;
  onToggleVacationFitBand: (key: VacationFitBandKey) => void;
  selectedDepartureCities: Set<string>;
  onAddDepartureCity: (city: string) => void;
  onRemoveDepartureCity: (city: string) => void;
  activeDirectFlightBands: Set<DirectFlightBandKey>;
  onToggleDirectFlightBand: (key: DirectFlightBandKey) => void;
  directFlightStatus: DirectFlightStatus;
  directFlightError: string | null;
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
  activeRegions,
  onToggleRegion,
  travelSpendingTier,
  onTravelSpendingTierChange,
  budgetFilterMode,
  onBudgetFilterModeChange,
  exactBudgetAmount,
  onExactBudgetAmountChange,
  exactBudgetDays,
  onExactBudgetDaysChange,
  exactBudgetCurrency,
  availableBudgetCurrencies,
  onExactBudgetCurrencyChange,
  exactBudgetDailyLocal,
  exactBudgetDailyUsd,
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
  vacationLadder,
  onVacationLadderReorder,
  onVacationLadderMoveUp,
  onVacationLadderMoveDown,
  onVacationLadderToggleEnabled,
  activeVacationFitBands,
  onToggleVacationFitBand,
  selectedDepartureCities,
  onAddDepartureCity,
  onRemoveDepartureCity,
  activeDirectFlightBands,
  onToggleDirectFlightBand,
  directFlightStatus,
  directFlightError,
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
          className={
            isDrawerEmbed
              ? "flex h-full flex-col overflow-y-auto"
              : "flex h-full flex-col overflow-y-auto px-4"
          }
          style={isDrawerEmbed ? { minWidth: 0, width: "100%" } : { minWidth: "280px" }}
        >

          {!isDrawerEmbed && (
            <div className="flex items-center justify-between pt-5 pb-3">
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

          {!passport ? (
            <div className="flex flex-col flex-1 justify-center items-center py-10 text-center">
              <span className="text-sm text-outline mb-2">
                Для установки фильтров выберите страну своего гражданства
              </span>
            </div>
          ) : (
            <>
              <div className="flex flex-col">
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
                        budgetFilterMode={budgetFilterMode}
                        onBudgetFilterModeChange={onBudgetFilterModeChange}
                        exactBudgetAmount={exactBudgetAmount}
                        onExactBudgetAmountChange={onExactBudgetAmountChange}
                        exactBudgetDays={exactBudgetDays}
                        onExactBudgetDaysChange={onExactBudgetDaysChange}
                        exactBudgetCurrency={exactBudgetCurrency}
                        availableBudgetCurrencies={availableBudgetCurrencies}
                        onExactBudgetCurrencyChange={onExactBudgetCurrencyChange}
                        exactBudgetDailyLocal={exactBudgetDailyLocal}
                        exactBudgetDailyUsd={exactBudgetDailyUsd}
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

                  {isSectionOpen && key === "region" && (
                    <div className="px-3 pb-4 flex flex-col gap-1 mx-[2px]">
                      {SIDEBAR_REGION_FILTER_ROWS.map(({ key: regKey, label: regLabel }) => (
                        <div key={regKey} className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  MAP_REGION_FILL_COLORS[regKey] ?? "#94a3b8",
                              }}
                            />
                            <span className="text-[14px] text-on-surface">
                              {regLabel}
                            </span>
                          </div>
                          <Toggle
                            checked={activeRegions.has(regKey)}
                            onChange={() => onToggleRegion(regKey)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                                    {isSectionOpen && key === "vacation" && (
                    <div className="px-3 pb-4 flex flex-col gap-3 mx-[2px]">
                      <p className="text-[12px] leading-snug text-outline">
                        Расставьте интересы по важности в поездке
                      </p>
                      <VacationPriorityLadderDnD
                        ladder={vacationLadder}
                        onReorder={onVacationLadderReorder}
                        onMoveUp={onVacationLadderMoveUp}
                        onMoveDown={onVacationLadderMoveDown}
                        onToggleEnabled={onVacationLadderToggleEnabled}
                      />
                      <div className="border-t border-outline-variant pt-2 flex flex-col gap-1">
                        {VACATION_FIT_OPTIONS.map(({ key: bk, label: bLabel }) => (
                          <div key={bk} className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: VACATION_FIT_BAND_COLORS[bk],
                                }}
                              />
                              <span className="text-[14px] text-on-surface">{bLabel}</span>
                            </div>
                            <Toggle
                              checked={activeVacationFitBands.has(bk)}
                              onChange={() => onToggleVacationFitBand(bk)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isSectionOpen && key === "flight" && (
                    <div className="px-3 pb-4 flex flex-col gap-3">
                      <DepartureCityCombobox
                        passport={passport}
                        selectedCities={selectedDepartureCities}
                        onAddCity={onAddDepartureCity}
                        onRemoveCity={onRemoveDepartureCity}
                      />
                      {directFlightStatus === "loading" ? (
                        <p className="text-[12px] leading-snug text-outline">
                          Загрузка маршрутов…
                        </p>
                      ) : null}
                      {directFlightError ? (
                        <p className="text-[12px] leading-snug text-error">
                          {directFlightError}
                        </p>
                      ) : null}
                      {selectedDepartureCities.size === 0 ? (
                        <p className="text-[12px] leading-snug text-outline">
                          Выберите город вылета
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {SIDEBAR_FLIGHT_FILTER_ROWS.map(({ key: rowKey, label }) => (
                            <div key={rowKey} className="flex items-center justify-between">
                              <div className="flex items-center gap-0.5">
                                <span
                                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: MAP_FLIGHT_FILL_COLORS[rowKey],
                                  }}
                                />
                                <span className="text-[14px] text-on-surface">{label}</span>
                              </div>
                              <Toggle
                                checked={activeDirectFlightBands.has(
                                  rowKey as DirectFlightBandKey,
                                )}
                                onChange={() =>
                                  onToggleDirectFlightBand(rowKey as DirectFlightBandKey)
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
              </div>

              <div className="flex-1" />
            </>
          )}
        </div>
      )}
    </div>
  );
}
