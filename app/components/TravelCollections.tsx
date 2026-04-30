import Link from "next/link";

export interface CountryCardMeta {
  name_ru: string;
  flag_emoji?: string | null;
}

interface TravelCollectionsProps {
  matchingIso2s: string[];
  countryMetaByIso: Map<string, CountryCardMeta>;
  listReady: boolean;
  variant?: "default" | "azure";
}

export default function TravelCollections({
  matchingIso2s,
  countryMetaByIso,
  listReady,
  variant = "default",
}: TravelCollectionsProps) {
  const isAzure = variant === "azure";

  const sectionClass = isAzure
    ? "py-24 bg-surface px-6 lg:px-8"
    : "py-16 bg-white";

  const titleClass = isAzure
    ? "text-3xl font-extrabold tracking-tight text-on-surface azure-font-headline"
    : "text-3xl font-bold text-on-surface";

  const descClass = isAzure
    ? "mt-2 text-base text-on-surface-variant"
    : "mt-2 text-gray-500 text-base";

  const emptyOuter = isAzure
    ? "rounded-xl border border-dashed border-outline-variant/20 bg-surface-container-low py-8 text-center px-6"
    : "px-6 pb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center";

  const looseFilters = isAzure
    ? "Ослабьте ограничения в панели фильтров (виза, безопасность, бюджет, язык или сезон), чтобы увидеть больше направлений."
    : "Ослабьте ограничения в боковой панели (виза, безопасность, бюджет, язык или сезон), чтобы увидеть больше направлений.";

  return (
    <section className={sectionClass}>
      <div className={isAzure ? "max-w-7xl mx-auto" : undefined}>
        <div className={isAzure ? "mb-8" : "px-6 mb-8"}>
          <h2 className={titleClass}>Направления по фильтрам</h2>
          <p className={descClass}>
            Страны, которые соответствуют выбранным условиям на карте. Скоро здесь будет
            подбор путешествия: перелёты, отели и справка по стране.
          </p>
        </div>

        {!listReady ? (
          <div
            className={
              isAzure
                ? "pb-4 text-sm text-on-surface-variant"
                : "px-6 pb-4 text-gray-500 text-sm"
            }
          >
            Загружаем список направлений…
          </div>
        ) : matchingIso2s.length === 0 ? (
          <div className={isAzure ? emptyOuter : `px-6 pb-4 ${emptyOuter}`}>
            <p
              className={
                isAzure
                  ? "text-on-surface font-medium"
                  : "text-gray-700 font-medium"
              }
            >
              Нет стран по этим фильтрам
            </p>
            <p
              className={
                isAzure
                  ? "mt-2 max-w-md mx-auto text-sm text-on-surface-variant"
                  : "mt-2 text-gray-500 text-sm max-w-md mx-auto"
              }
            >
              {looseFilters}
            </p>
          </div>
        ) : isAzure ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {matchingIso2s.map((iso2) => {
              const meta = countryMetaByIso.get(iso2);
              const title = meta?.name_ru ?? iso2;
              const flag = meta?.flag_emoji?.trim() || "🏳️";
              return (
                <Link
                  key={iso2}
                  href={`/trip/${encodeURIComponent(iso2)}`}
                  className="group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[var(--shadow-azure-card-hover)] transition-all duration-500"
                >
                  <div className="flex flex-col gap-3 min-h-[140px] p-6">
                    <span
                      className="text-5xl leading-none transition-transform duration-700 group-hover:scale-105"
                      aria-hidden
                    >
                      {flag}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-on-surface azure-font-headline leading-tight">
                        {title}
                      </h3>
                      <p className="mt-1 text-outline text-xs uppercase tracking-wide">
                        {iso2}
                      </p>
                    </div>
                    <span className="mt-auto text-primary text-sm font-semibold">
                      Подбор путешествия →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto px-6 pb-4 scrollbar-hide">
            {matchingIso2s.map((iso2) => {
              const meta = countryMetaByIso.get(iso2);
              const title = meta?.name_ru ?? iso2;
              const flag = meta?.flag_emoji?.trim() || "🏳️";
              return (
                <Link
                  key={iso2}
                  href={`/trip/${encodeURIComponent(iso2)}`}
                  className="flex-none w-56 rounded-2xl border border-gray-200 bg-linear-to-br from-slate-50 to-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
                >
                  <div className="flex flex-col gap-3 min-h-[120px]">
                    <span className="text-4xl leading-none" aria-hidden>
                      {flag}
                    </span>
                    <div>
                      <h3 className="text-on-surface font-semibold text-lg leading-tight">
                        {title}
                      </h3>
                      <p className="mt-1 text-gray-400 text-xs tracking-wide uppercase">
                        {iso2}
                      </p>
                    </div>
                    <span className="mt-auto text-sky-700 text-sm font-medium">
                      Подбор путешествия →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
