"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SUGGEST_LIMIT = 12;

/** Список подсказок: скролл колёсиком без видимой полосы (как в примере Google). */
const listScrollNoBar =
  "max-h-[min(20rem,50vh)] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

interface Country {
  iso2: string;
  name_ru: string;
  name_en: string;
}

interface PassportCountrySearchProps {
  value: string;
  onChange: (iso2: string, nameRu?: string) => void;
  /** Прогрев лёгких JSON до коммита родителя (travel-costs, visa-map, курсы…). */
  onWarmPassportCaches?: (iso2: string) => void;
  /** Tailwind-классы корневого блока (ширина, отступы) */
  className?: string;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Региональные индикаторы Юникода для ISO 3166-1 alpha-2 (два латинских символа). */
function iso2ToFlagEmoji(iso2: string): string {
  const cc = iso2.trim().toUpperCase();
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) {
    return "🏳️";
  }
  const base = 0x1f1e6;
  const cp = [...cc].map((c) => base + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...cp);
}

function filterCountries(query: string, list: Country[]): Country[] {
  const q = norm(query);
  if (!q || !list.length) return [];

  type Scored = { c: Country; score: number };
  const scored: Scored[] = [];

  for (const c of list) {
    const iso = c.iso2.trim().toLowerCase();
    const ru = norm(c.name_ru);
    const en = norm(c.name_en);
    let best = Infinity;

    if (iso === q) best = Math.min(best, 0);
    if (iso.startsWith(q)) best = Math.min(best, 10);
    if (ru.startsWith(q)) best = Math.min(best, 20);
    if (en.startsWith(q)) best = Math.min(best, 25);
    if (ru.includes(q)) best = Math.min(best, 40);
    if (en.includes(q)) best = Math.min(best, 45);
    if (iso.includes(q)) best = Math.min(best, 50);

    if (best < Infinity) {
      scored.push({ c, score: best });
    }
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return norm(a.c.name_ru).localeCompare(norm(b.c.name_ru), "ru");
  });

  const seen = new Set<string>();
  const out: Country[] = [];
  for (const { c } of scored) {
    const k = c.iso2.trim().toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
    if (out.length >= SUGGEST_LIMIT) break;
  }
  return out;
}

/** Все страны отсортированные по алфавиту (для пустого запроса). */
function allCountriesSorted(list: Country[]): Country[] {
  return [...list]
    .sort((a, b) => norm(a.name_ru).localeCompare(norm(b.name_ru), "ru"))
    .slice(0, SUGGEST_LIMIT);
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

export default function PassportCountrySearch({
  value,
  onChange,
  onWarmPassportCaches,
  className = "",
}: PassportCountrySearchProps) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const [countries, setCountries] = useState<Country[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canonical = useMemo(() => {
    if (!value.trim() || !countries.length) return "";
    const c = countries.find(
      (x) => x.iso2.trim().toUpperCase() === value.trim().toUpperCase(),
    );
    return c?.name_ru ?? "";
  }, [value, countries]);

  const suggestions = useMemo(() => {
    if (!countries.length) return [];
    if (!open) return [];
    const q = query.trim();
    if (!q.length) return allCountriesSorted(countries);
    return filterCountries(query, countries);
  }, [countries, query, open]);

  const listOpen = open && suggestions.length > 0;

  useEffect(() => {
    queueMicrotask(() => {
      setHighlight(0);
    });
  }, [query, suggestions.length]);

  useEffect(() => {
    fetch(`${API_URL}/countries`)
      .then((r) => r.json())
      .then((data: Country[]) => {
        setCountries(Array.isArray(data) ? data : []);
      })
      .catch(() => setCountries([]));
  }, []);

  // Синхронизируем query с внешним value (canonical) когда пользователь НЕ редактирует
  useEffect(() => {
    if (!open && query !== canonical) {
      setQuery(canonical);
    }
  }, [canonical, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCountry = useCallback(
    (c: Country) => {
      const iso = c.iso2.trim().toUpperCase();
      onWarmPassportCaches?.(iso);
      onChange(c.iso2, c.name_ru);
      setQuery(c.name_ru);
      setOpen(false);
    },
    [onChange, onWarmPassportCaches],
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div
        className="flex flex-col overflow-hidden rounded-3xl border border-outline-variant/80 bg-surface-container-lowest/95 shadow-[var(--shadow-azure-float)] backdrop-blur-md"
        role="search"
      >
        <div className="flex min-h-[29px] w-full items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
          <SearchGlyph className="h-5 w-5 shrink-0 text-primary" />
          <div className="relative flex min-w-0 flex-1 flex-col justify-center">
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              required
              role="combobox"
              aria-expanded={listOpen}
              aria-controls={listboxId}
              aria-activedescendant={
                listOpen ? `${listboxId}-opt-${highlight}` : undefined
              }
              aria-autocomplete="list"
              aria-required="true"
              aria-label="Страна гражданства, поле поиска"
              placeholder="Укажите свою страну…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => {
                inputRef.current?.select();
                setOpen(true);
              }}
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
                    setHighlight((i) =>
                      Math.min(i + 1, suggestions.length - 1),
                    );
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
                    selectCountry(suggestions[highlight]);
                    return;
                  }
                  setOpen(false);
                }
              }}
              className="w-full min-w-0 border-none bg-transparent py-0.5 text-sm font-medium text-on-surface outline-none placeholder:text-outline placeholder:font-normal"
            />
          </div>
        </div>

        {listOpen ? (
          <>
            <div
              className="h-px shrink-0 bg-outline-variant/40"
              aria-hidden
            />
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Страны"
              className={`py-1 ${listScrollNoBar}`}
            >
              {suggestions.map((c, i) => (
                <li
                  key={c.iso2}
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
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-outline-variant/10 sm:px-4"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCountry(c);
                    }}
                    onMouseEnter={() => setHighlight(i)}
                  >
                    <SearchGlyph className="h-4 w-4 shrink-0 text-on-surface-variant/70" />
                    <span className="text-base leading-none" aria-hidden>
                      {iso2ToFlagEmoji(c.iso2)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-normal">
                      {c.name_ru}
                    </span>
                    <span className="shrink-0 rounded-md bg-outline-variant/15 px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                      {c.iso2.trim().toUpperCase()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
