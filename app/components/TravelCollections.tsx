const collections = [
  {
    id: 1,
    title: "Безвизовая Европа",
    description: "Страны, куда можно въехать без визы",
    count: 26,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    id: 2,
    title: "Экзотическая Азия",
    description: "Таиланд, Вьетнам, Камбоджа и другие",
    count: 14,
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: 3,
    title: "Острова и пляжи",
    description: "Лучшие пляжные направления мира",
    count: 18,
    gradient: "from-cyan-400 to-blue-500",
  },
  {
    id: 4,
    title: "Горные маршруты",
    description: "Трекинг, альпинизм и горные курорты",
    count: 11,
    gradient: "from-slate-500 to-gray-700",
  },
  {
    id: 5,
    title: "Латинская Америка",
    description: "Бразилия, Аргентина, Перу и другие",
    count: 20,
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    id: 6,
    title: "Ближний Восток",
    description: "ОАЭ, Иордания, Оман и Катар",
    count: 9,
    gradient: "from-amber-400 to-yellow-600",
  },
  {
    id: 7,
    title: "Африканское сафари",
    description: "Кения, Танзания, ЮАР и другие",
    count: 12,
    gradient: "from-orange-500 to-red-600",
  },
  {
    id: 8,
    title: "Северная Европа",
    description: "Норвегия, Швеция, Финляндия, Исландия",
    count: 8,
    gradient: "from-violet-500 to-purple-600",
  },
];

export default function TravelCollections() {
  return (
    <section className="py-16 bg-white">
      <div className="px-6 mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Подборки для путешествий
        </h2>
        <p className="mt-2 text-gray-500 text-base">
          Готовые маршруты и направления по типу поездки
        </p>
      </div>

      <div className="flex gap-5 overflow-x-auto px-6 pb-4 scrollbar-hide">
        {collections.map((col) => (
          <div
            key={col.id}
            className={`flex-none w-64 rounded-2xl bg-linear-to-br ${col.gradient} p-5 cursor-pointer hover:scale-105 transition-transform duration-200 shadow-md`}
          >
            <div className="flex flex-col justify-between h-full min-h-[160px]">
              <div>
                <h3 className="text-white font-semibold text-lg leading-tight">
                  {col.title}
                </h3>
                <p className="mt-2 text-white/80 text-sm">{col.description}</p>
              </div>
              <div className="mt-6 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 w-fit">
                <span className="text-white text-sm font-medium">
                  {col.count} направлений
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
