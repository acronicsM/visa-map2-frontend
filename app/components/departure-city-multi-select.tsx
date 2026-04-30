"use client";

interface DepartureCityMultiSelectProps {
  cityOptions: string[];
  selected: Set<string>;
  onToggle: (city: string) => void;
}

export default function DepartureCityMultiSelect({
  cityOptions,
  selected,
  onToggle,
}: DepartureCityMultiSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px]" style={{ color: "#9ca3af" }}>
        Город вылета
      </span>
      <div className="flex flex-wrap gap-1.5">
        {cityOptions.map((city) => {
          const isOn = selected.has(city);
          return (
            <button
              key={city}
              type="button"
              onClick={() => onToggle(city)}
              className="rounded-full border px-2.5 py-1 text-[13px] transition-colors"
              style={{
                color: "var(--color-on-surface)",
                borderColor: isOn ? "var(--color-primary)" : "var(--color-outline-variant)",
                backgroundColor: isOn
                  ? "color-mix(in srgb, var(--color-primary) 14%, transparent)"
                  : "transparent",
              }}
            >
              {city}
            </button>
          );
        })}
      </div>
    </div>
  );
}
