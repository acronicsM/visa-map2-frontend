"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRef } from "react";

import type { MatchingCountryRow } from "../types/matching-country";

export interface CountryCardMeta {
  name_ru: string;
  flag_emoji?: string | null;
}

interface TravelCollectionsProps {
  matchingCountries: MatchingCountryRow[];
  countryMetaByIso: Map<string, CountryCardMeta>;
  listReady: boolean;
}

const VISA_CATEGORY_LABELS: Record<string, string> = {
  free: "Без визы",
  voa: "Виза по прилёту",
  evisa: "Электронная виза",
  embassy: "Виза в посольстве",
  restricted: "Сложный въезд",
  unavailable: "Въезд закрыт",
  unknown: "Нет данных",
};

const SAFETY_LEVEL_LABELS: Record<string, string> = {
  safe: "Норма",
  unsafe: "Повышенный риск",
  dangerous: "Высокий риск",
};

function normKey(raw: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

function visaTypeLabel(category: string): string {
  const k = normKey(category);
  return VISA_CATEGORY_LABELS[k] ?? (k ? category : VISA_CATEGORY_LABELS.unknown);
}

function safetyLevelLabel(level: string | null): string {
  if (!level) return "Нет данных";
  const k = normKey(level);
  return SAFETY_LEVEL_LABELS[k] ?? level;
}

function cardMetaForRow(
  row: MatchingCountryRow,
  countryMetaByIso: Map<string, CountryCardMeta>,
): { iso2Norm: string; title: string } {
  const isoTrim = row.iso2.trim();
  const isoUpper = isoTrim.toUpperCase();
  const meta =
    countryMetaByIso.get(isoUpper) ?? countryMetaByIso.get(isoTrim);
  const name = meta?.name_ru != null ? String(meta.name_ru).trim() : "";
  const title = name || isoUpper || isoTrim;
  return { iso2Norm: isoUpper || isoTrim, title };
}

/** Заглушка: в проде здесь будет 5–6 URL на страну; сейчас один общий кадр. */
const DEFAULT_COUNTRY_IMAGE_URLS: string[] = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBpxI68NJBdaOMtmr8x8BkgueRQyDXqJnhBvEFy8SvovAOo0xjuLKuLWHKswMFyuckfoVsPXZjSp0lkA9t_f4B0IlntWA0ahEi8EE4gw4EVPo6JZrEt6biVCP8uSIbRnxSX-ODcgKlMAcPK6naPGVlQje40RiTpTzKvAM8aLvynsSt5Lvpcft0qxict1DXWVYA6iL21uGF5bFPSrw-7IQ8GwTdB2OZArUEDngosdS0lTURVi_ZaBAS3Y2_ftJBfYfRU1sAKb4fiulUJ",
];

function CountryCardCarousel({
  imageUrls,
  badgeLabel,
}: {
  imageUrls: string[];
  badgeLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBySlide = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  const showInnerArrows = imageUrls.length > 1;

  return (
    <div className="relative h-64 overflow-hidden">
      <div
        ref={trackRef}
        className="flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {imageUrls.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-full w-full min-w-full shrink-0 snap-start overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>
        ))}
      </div>
      {badgeLabel ? (
        <div className="pointer-events-none absolute top-4 left-4 z-20 bg-white/20 px-3 py-1 text-[10px] font-bold tracking-widest text-white uppercase backdrop-blur-md rounded-full">
          {badgeLabel}
        </div>
      ) : null}
      {showInnerArrows ? (
        <>
          <button
            type="button"
            className="absolute left-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/25 text-lg leading-none text-white opacity-70 backdrop-blur-sm transition-opacity hover:opacity-100"
            aria-label="Предыдущее фото"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollBySlide(-1);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/25 text-lg leading-none text-white opacity-70 backdrop-blur-sm transition-opacity hover:opacity-100"
            aria-label="Следующее фото"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              scrollBySlide(1);
            }}
          >
            ›
          </button>
        </>
      ) : null}
    </div>
  );
}

function FilteredCountryCard({
  iso2,
  title,
  imageUrls,
  visaSummary,
  safetySummary,
}: {
  iso2: string;
  title: string;
  imageUrls: string[];
  visaSummary: string;
  safetySummary: string;
}) {
  const tripHref = `/trip/${encodeURIComponent(iso2)}`;
  const isoLc = iso2.trim().slice(0, 2).toLowerCase();
  const cardShadow =
    "shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-(--shadow-azure-card-hover)";
  const cardLayout = "w-72 flex-none snap-start";

  return (
    <div
      className={`group relative h-[465px] overflow-hidden rounded-3xl bg-surface-container-lowest transition-all duration-500 ${cardLayout} ${cardShadow}`}
    >
      <Link
        href={tripHref}
        className="absolute inset-0 z-0"
        aria-label={`Открыть подбор для ${title}`}
      >
        <span className="sr-only">{title}</span>
      </Link>
      <div className="relative z-10 flex flex-col pointer-events-none">
        <div className="pointer-events-auto">
          <CountryCardCarousel imageUrls={imageUrls} />
        </div>
        <div className="p-6">
          <div className="my-2.5 flex items-start gap-3">
            <span
              className={`fi fi-${isoLc} mt-0.5 shrink-0 overflow-hidden rounded-sm border border-outline-variant/30 bg-surface-container shadow-sm`}
              style={{
                width: "2.25rem",
                height: "1.6875rem",
                backgroundSize: "cover",
              }}
              aria-hidden
            />
            <h3 className="min-h-13 max-w-full flex-1 text-xl font-bold leading-snug text-on-surface line-clamp-2">
              {title}
            </h3>
          </div>
          <div className="flex flex-col gap-3 px-[2px]">
            <div className="flex flex-col gap-1.5 text-xs font-medium text-on-surface-variant">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <svg
                    className="size-4 shrink-0 text-outline"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                    />
                  </svg>
                  <span className="min-w-0 truncate">{visaSummary}</span>
                </span>
                <span
                  className="shrink-0 tabular-nums font-semibold text-on-surface"
                  title="Рейтинг страны (заглушка)"
                >
                  4,9*
                </span>
              </div>
              <span className="flex min-w-0 items-center gap-2">
                <svg
                  className="size-4 shrink-0 text-outline"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                <span className="min-w-0">{safetySummary}</span>
              </span>
            </div>
            <div className="h-px bg-outline-variant/10" />
            <p className="line-clamp-2 text-sm text-on-surface-variant">
              Перелёты, отели и справка по стране — на странице направления. Условия
              въезда смотрите на карте и в фильтрах.
            </p>
            <span className="text-sm font-semibold text-primary">
              Подбор путешествия →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HorizontalCollectionsStrip({ children }: { children: ReactNode }) {
  const stripRef = useRef<HTMLDivElement>(null);

  const scrollStrip = (dir: -1 | 1) => {
    const el = stripRef.current;
    if (!el) return;
    const delta = Math.min(el.clientWidth * 0.85, 320);
    el.scrollBy({ left: dir * delta, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={stripRef}
        className="relative z-0 flex snap-x snap-mandatory gap-8 overflow-x-auto px-14 pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        className="pointer-events-auto absolute top-1/2 left-0 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-sm font-bold leading-none shadow-md backdrop-blur-sm transition-opacity hover:opacity-100 sm:left-1"
        aria-label="Прокрутить список влево"
        onClick={() => scrollStrip(-1)}
      >
        {"<<"}
      </button>
      <button
        type="button"
        className="pointer-events-auto absolute top-1/2 right-0 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-sm font-bold leading-none shadow-md backdrop-blur-sm transition-opacity hover:opacity-100 sm:right-1"
        aria-label="Прокрутить список вправо"
        onClick={() => scrollStrip(1)}
      >
        {">>"}
      </button>
    </div>
  );
}

export default function TravelCollections({
  matchingCountries,
  countryMetaByIso,
  listReady,
}: TravelCollectionsProps) {
  const looseFilters =
    "Ослабьте ограничения в боковой панели (виза, безопасность, бюджет, язык или сезон), чтобы увидеть больше направлений.";

  return (
    <section className="py-24 bg-surface px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mt-2 text-[11px] text-on-surface-variant">
            Страны, которые соответствуют выбранным условиям на карте. Скоро здесь будет
            подбор путешествия: перелёты, отели и справка по стране.
          </p>
        </div>

        {!listReady ? (
          <div className="pb-4 text-sm text-on-surface-variant">
            Загружаем список направлений…
          </div>
        ) : matchingCountries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-low px-6 py-8 text-center">
            <p className="font-medium text-on-surface">
              Нет стран по этим фильтрам
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">
              {looseFilters}
            </p>
          </div>
        ) : (
          <HorizontalCollectionsStrip>
            {matchingCountries.map((row) => {
              const { iso2Norm, title } = cardMetaForRow(
                row,
                countryMetaByIso,
              );
              return (
                <FilteredCountryCard
                  key={iso2Norm}
                  iso2={iso2Norm}
                  title={title}
                  visaSummary={visaTypeLabel(row.visa_category)}
                  safetySummary={safetyLevelLabel(row.safety_level)}
                  imageUrls={DEFAULT_COUNTRY_IMAGE_URLS}
                />
              );
            })}
          </HorizontalCollectionsStrip>
        )}
      </div>
    </section>
  );
}
