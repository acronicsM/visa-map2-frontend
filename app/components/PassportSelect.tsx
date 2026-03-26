"use client";

import { useEffect, useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Country {
  iso2: string;
  name_ru: string;
  name_en: string;
  flag_emoji: string;
  region: string;
}

interface Props {
  value: string;
  onChange: (iso2: string, nameRu?: string) => void;
}

export default function PassportSelect({ value, onChange }: Props) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Country | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/countries`)
      .then((r) => r.json())
      .then((data: Country[]) => {
        setCountries(data);
        // Синхронизируем selected с текущим value пропсом
        if (value) {
          const found = data.find((c) => c.iso2 === value);
          if (found) setSelected(found);
        }
      })
      .catch(console.error);
  }, []);

  // Закрываем при клике вне
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = countries.filter(
    (c) =>
      c.name_ru.toLowerCase().includes(search.toLowerCase()) ||
      c.name_en.toLowerCase().includes(search.toLowerCase()) ||
      c.iso2.toLowerCase().includes(search.toLowerCase()),
  );

  function select(country: Country) {
    setSelected(country);
    onChange(country.iso2, country.name_ru);
    setOpen(false);
    setSearch("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const handleInputFocus = () => {
    setOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setOpen(true);
  };

  const showOverlay = selected && search === "" && !open;

  return (
    <div ref={ref} className="relative w-60">
      {/* Контейнер с input */}
      <div
        className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-7 shadow-lg cursor-text"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {selected && (
          <span
            className={`fi fi-${selected.iso2.toLowerCase()} shrink-0 rounded-sm`}
            style={{ width: "20px", height: "15px" }}
          />
        )}
        {showOverlay ? (
          /* Двухцветный текст когда страна выбрана и поиск закрыт */
          <span className="flex-1 text-sm select-none">
            <span className="text-slate-400 font-normal">Гражданство: </span>
            <span className="text-slate-800 font-medium">{selected.name_ru}</span>
          </span>
        ) : (
          /* Инпут для поиска */
          <input
            ref={inputRef}
            type="text"
            placeholder="Гражданство..."
            value={search}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 placeholder-slate-400"
          />
        )}
      </div>

      {/* Дропдаун */}
      {open && (
        <div className="absolute top-full left-0 w-60 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          {/* Список */}
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">
                Ничего не найдено
              </div>
            ) : (
              filtered.map((country) => (
                <button
                  key={country.iso2}
                  onClick={() => select(country)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left ${
                    country.iso2 === value
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700"
                  }`}
                >
                  <span
                    className={`fi fi-${country.iso2.toLowerCase()} shrink-0 rounded-sm`}
                    style={{ width: "20px", height: "15px" }}
                  />
                  <span className="flex-1">{country.name_ru}</span>
                  <span className="text-xs text-slate-400">{country.iso2}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
