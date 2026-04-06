"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface LanguageMultiSelectProps {
  languageOptions: string[];
  selected: Set<string>;
  onToggle: (code: string) => void;
  bgColor?: string;
}

export default function LanguageMultiSelect({
  languageOptions,
  selected,
  onToggle,
  bgColor = "#edeae3",
}: LanguageMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return languageOptions;
    return languageOptions.filter((code) => code.toLowerCase().includes(q));
  }, [languageOptions, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <div
        className="relative rounded-md border border-[#ddd9d0] bg-white"
        style={{ backgroundColor: bgColor === "#edeae3" ? "#fff" : bgColor }}
      >
        <input
          type="text"
          placeholder="Поиск по коду языка…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full px-2 py-1.5 text-[13px] outline-none rounded-md bg-transparent"
          style={{ color: "#374151" }}
          autoComplete="off"
        />
        {open && filtered.length > 0 && (
          <ul
            className="absolute left-0 right-0 top-full z-20 mt-0.5 max-h-40 overflow-y-auto rounded-md border border-[#ddd9d0] bg-white shadow-md"
            role="listbox"
          >
            {filtered.map((code) => {
              const isOn = selected.has(code);
              return (
                <li key={code} role="option">
                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-[13px] hover:bg-black/5"
                    style={{ color: "#374151", fontWeight: isOn ? 600 : 400 }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onToggle(code);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    {code}
                    {isOn ? " ✓" : ""}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1">
          {[...selected].sort((a, b) => a.localeCompare(b)).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => onToggle(code)}
              className="inline-flex items-center gap-1 rounded-full border border-[#c4c0b8] px-2 py-0.5 text-[13px] hover:bg-black/5"
              style={{ color: "#374151" }}
            >
              {code}
              <span aria-hidden className="text-[#9ca3af]">
                ×
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
