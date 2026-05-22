"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DepartureCityOption } from "../lib/direct-flight";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SUGGEST_LIMIT = 12;

const listScrollNoBar =
  "max-h-48 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

interface DepartureCityComboboxProps {
  passport: string;
  selectedCities: Set<string>;
  onAddCity: (city: string) => void;
  onRemoveCity: (city: string) => void;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function filterCities(query: string, list: DepartureCityOption[]): DepartureCityOption[] {
  const q = norm(query);
  if (!q || !list.length) return [];

  type Scored = { item: DepartureCityOption; score: number };
  const scored: Scored[] = [];

  for (const item of list) {
    const city = norm(item.city);
    const cityNorm = item.city_normalized;
    let best = Infinity;

    if (cityNorm === q) best = Math.min(best, 0);
    if (cityNorm.startsWith(q)) best = Math.min(best, 10);
    if (city.startsWith(q)) best = Math.min(best, 15);
    if (cityNorm.includes(q)) best = Math.min(best, 30);
    if (city.includes(q)) best = Math.min(best, 35);
    for (const iata of item.airports) {
      const code = iata.toLowerCase();
      if (code === q) best = Math.min(best, 5);
      if (code.startsWith(q)) best = Math.min(best, 20);
    }

    if (best < Infinity) {
      scored.push({ item, score: best });
    }
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return norm(a.item.city).localeCompare(norm(b.item.city), "en");
  });

  const seen = new Set<string>();
  const out: DepartureCityOption[] = [];
  for (const { item } of scored) {
    const key = item.city_normalized;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= SUGGEST_LIMIT) break;
  }
  return out;
}

function topCities(list: DepartureCityOption[]): DepartureCityOption[] {
  return list.slice(0, SUGGEST_LIMIT);
}

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export default function DepartureCityCombobox({
  passport,
  selectedCities,
  onAddCity,
  onRemoveCity,
}: DepartureCityComboboxProps) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [cities, setCities] = useState<DepartureCityOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const availableCities = useMemo(
    () =>
      cities.filter((c) => !selectedCities.has(c.city)),
    [cities, selectedCities],
  );

  const suggestions = useMemo(() => {
    if (!open || !availableCities.length) return [];
    const q = query.trim();
    if (!q.length) return topCities(availableCities);
    return filterCities(query, availableCities);
  }, [availableCities, query, open]);

  const listOpen = open && suggestions.length > 0;

  useEffect(() => {
    queueMicrotask(() => setHighlight(0));
  }, [query, suggestions.length]);

  useEffect(() => {
    const iso2 = passport.trim().toUpperCase();
    if (!iso2) {
      queueMicrotask(() => {
        setCities([]);
        setLoadError(null);
        setQuery("");
      });
      return;
    }

    let cancelled = false;
    const url = `${API_URL}/flights/departure-cities?country_iso2=${encodeURIComponent(iso2)}&international_only=true`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { items?: DepartureCityOption[] }) => {
        if (cancelled) return;
        setCities(Array.isArray(data.items) ? data.items : []);
        setLoadError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setCities([]);
        setLoadError("Не удалось загрузить города");
      });

    return () => {
      cancelled = true;
    };
  }, [passport]);

  const selectCity = useCallback(
    (item: DepartureCityOption) => {
      onAddCity(item.city);
      setQuery("");
      setOpen(false);
      inputRef.current?.focus();
    },
    [onAddCity],
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-outline">Город вылета</span>

      <div ref={rootRef} className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5">
          <SearchGlyph className="h-4 w-4 shrink-0 text-outline" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            role="combobox"
            aria-expanded={listOpen}
            aria-controls={listboxId}
            aria-activedescendant={
              listOpen ? `${listboxId}-opt-${highlight}` : undefined
            }
            aria-autocomplete="list"
            aria-label="Город вылета, поле поиска"
            placeholder="Начните вводить город (латиница)"
            disabled={!passport.trim()}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={(e) => {
              const rt = e.relatedTarget;
              if (rt instanceof Node && rootRef.current?.contains(rt)) {
                return;
              }
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (listOpen) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((i) => Math.min(i + 1, suggestions.length - 1));
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((i) => Math.max(i - 1, 0));
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                  return;
                }
              }
              if (e.key === "Enter") {
                e.preventDefault();
                if (listOpen && suggestions[highlight]) {
                  selectCity(suggestions[highlight]);
                }
              }
            }}
            className="min-w-0 flex-1 border-none bg-transparent py-0.5 text-[13px] text-on-surface outline-none placeholder:text-outline"
          />
        </div>

        {listOpen ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Города вылета"
            className={`absolute z-20 mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-1 shadow-md ${listScrollNoBar}`}
          >
            {suggestions.map((item, i) => (
              <li
                key={item.city_normalized}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={highlight === i}
                className={
                  highlight === i
                    ? "bg-primary-container/20 text-on-surface"
                    : "text-on-surface"
                }
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[13px] hover:bg-outline-variant/10"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectCity(item);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <span className="min-w-0 flex-1 truncate">{item.city}</span>
                  {item.airports.length > 0 ? (
                    <span className="shrink-0 text-[11px] text-outline">
                      ({item.airports.join(", ")})
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {loadError ? (
        <p className="text-[12px] leading-snug text-error">{loadError}</p>
      ) : null}

      {selectedCities.size > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {[...selectedCities].map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => onRemoveCity(city)}
              className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] transition-colors"
              style={{
                color: "var(--color-on-surface)",
                borderColor: "var(--color-primary)",
                backgroundColor:
                  "color-mix(in srgb, var(--color-primary) 14%, transparent)",
              }}
              title="Убрать город"
            >
              <span>{city}</span>
              <span className="text-outline" aria-hidden>
                ×
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
