import Link from "next/link";

export interface CountryCardMeta {
  name_ru: string;
  flag_emoji?: string | null;
}

interface TravelCollectionsProps {
  matchingIso2s: string[];
  countryMetaByIso: Map<string, CountryCardMeta>;
  listReady: boolean;
}

export default function TravelCollections({
  matchingIso2s,
  countryMetaByIso,
  listReady,
}: TravelCollectionsProps) {
  return (
    <section className="py-16 bg-white">
      <div className="px-6 mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Направления по фильтрам</h2>
        <p className="mt-2 text-gray-500 text-base">
          Страны, которые соответствуют выбранным условиям на карте. Скоро здесь
          будет подбор путешествия: перелёты, отели и справка по стране.
        </p>
      </div>

      {!listReady ? (
        <div className="px-6 pb-4 text-gray-500 text-sm">Загружаем список направлений…</div>
      ) : matchingIso2s.length === 0 ? (
        <div className="px-6 pb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
          <p className="text-gray-700 font-medium">Нет стран по этим фильтрам</p>
          <p className="mt-2 text-gray-500 text-sm max-w-md mx-auto">
            Ослабьте ограничения в боковой панели (виза, безопасность, бюджет, язык или
            сезон), чтобы увидеть больше направлений.
          </p>
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
                    <h3 className="text-gray-900 font-semibold text-lg leading-tight">
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
    </section>
  );
}
