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
  onChange: (iso2: string) => void;
}

export default function PassportSelect({ value, onChange }: Props) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Country | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/countries`)
      .then((r) => r.json())
      .then((data) => {
        setCountries(data);
        const ru = data.find((c: Country) => c.iso2 === "RU");
        if (ru) setSelected(ru);
      })
      .catch(console.error);
  }, []);

  // Закрываем при клике вне
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
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
    onChange(country.iso2);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className="relative">
      {/* Кнопка */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2.5 shadow-lg text-sm font-medium text-slate-700 hover:bg-white transition-colors min-w-48"
      >
        <span className="text-lg">{selected?.flag_emoji ?? "🌍"}</span>
        <span className="flex-1 text-left">
          {selected?.name_ru ?? "Выберите паспорт"}
        </span>
        <span className="text-slate-400 text-xs">▼</span>
      </button>

      {/* Дропдаун */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          {/* Поиск */}
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              placeholder="Поиск страны..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-blue-400 text-slate-700 placeholder-slate-400"
            />
          </div>

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
                  <span className="text-base flex-shrink-0">
                    {country.flag_emoji}
                  </span>
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
