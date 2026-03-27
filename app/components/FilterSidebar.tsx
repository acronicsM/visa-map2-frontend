"use client";

import { useState } from "react";
import PassportSelect from "./PassportSelect";

const VISA_CATEGORIES: { key: string; label: string; color: string }[] = [
  { key: "free", label: "Без визы", color: "#22c55e" },
  { key: "evisa", label: "Электронная виза", color: "#eab308" },
  { key: "voa", label: "По прибытию", color: "#3b82f6" },
  { key: "embassy", label: "Нужна виза", color: "#ef4444" },
  { key: "unavailable", label: "Недоступно", color: "#6b7280" },
];

const FILTER_GROUPS = [
  { key: "citizenship", label: "Гражданство" },
  { key: "season", label: "Сезонность" },
  { key: "flight", label: "Прямой рейс" },
  { key: "distance", label: "Дальность перелёта" },
  { key: "budget", label: "Бюджет" },
] as const;

type FilterGroupKey = (typeof FILTER_GROUPS)[number]["key"];

const STUB_KEYS = new Set<FilterGroupKey>(["season", "flight", "distance", "budget"]);

interface FilterSidebarProps {
  passport: string;
  passportName: string;
  onPassportChange: (iso2: string, nameRu?: string) => void;
  activeCategories: Set<string>;
  onToggleCategory: (key: string) => void;
  coloringEnabled: boolean;
  onColoringEnabledChange: (enabled: boolean) => void;
  isOpen: boolean;
  onToggleSidebar: () => void;
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
  coloringEnabled,
  onColoringEnabledChange,
  isOpen,
  onToggleSidebar,
}: FilterSidebarProps) {
  const [activeColorGroup, setActiveColorGroup] = useState<FilterGroupKey>("citizenship");
  const [openSections, setOpenSections] = useState<Set<FilterGroupKey>>(new Set(["citizenship"]));

  function toggleSection(key: FilterGroupKey) {
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

    if (activeColorGroup === key && coloringEnabled) {
      onColoringEnabledChange(false);
    } else {
      setActiveColorGroup(key);
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

          {/* ФИЛЬТРЫ — заголовок + кнопка сворачивания */}
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

          {/* Секции фильтров */}
          <div className="flex flex-col mx-3">
            {FILTER_GROUPS.map(({ key, label }, idx) => {
              const isColorActive = activeColorGroup === key && coloringEnabled;
              const isSectionOpen = openSections.has(key);
              const hasCitizenshipContent = key === "citizenship";

              return (
                <div
                  key={key}
                  style={{
                    borderLeft: isColorActive ? "3px solid #3b82f6" : "3px solid transparent",
                    borderTop: idx > 0 ? "1px solid #ddd9d0" : undefined,
                  }}
                >
                  {/* Заголовок секции */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSection(key)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleSection(key); }}
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

                  {/* Содержимое секции */}
                  {isSectionOpen && hasCitizenshipContent && (
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

                      <div className="px-3 pb-4 flex flex-col gap-1">
                        {VISA_CATEGORIES.map(({ key: catKey, label: catLabel, color }) => (
                          <div key={catKey} className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
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

                  {isSectionOpen && !hasCitizenshipContent && (
                    <div className="px-3 pb-4">
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
