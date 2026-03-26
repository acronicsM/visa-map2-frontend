const articles = [
  {
    id: 1,
    tag: "Советы",
    title: "Как получить шенгенскую визу самостоятельно в 2025 году",
    date: "15 марта 2025",
    readTime: "8 мин",
    bgColor: "bg-blue-100",
    textColor: "text-blue-600",
  },
  {
    id: 2,
    tag: "Маршруты",
    title: "10 стран Азии, куда россияне могут въехать без визы",
    date: "2 марта 2025",
    readTime: "6 мин",
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-600",
  },
  {
    id: 3,
    tag: "Документы",
    title: "Медицинская страховка для путешествий: что нужно знать",
    date: "24 февраля 2025",
    readTime: "5 мин",
    bgColor: "bg-amber-100",
    textColor: "text-amber-600",
  },
  {
    id: 4,
    tag: "Обзор",
    title: "ОАЭ 2025: всё о визах, въезде и туристических правилах",
    date: "18 февраля 2025",
    readTime: "10 мин",
    bgColor: "bg-orange-100",
    textColor: "text-orange-600",
  },
  {
    id: 5,
    tag: "Советы",
    title: "Электронная виза: страны, где её легче всего оформить",
    date: "10 февраля 2025",
    readTime: "7 мин",
    bgColor: "bg-violet-100",
    textColor: "text-violet-600",
  },
  {
    id: 6,
    tag: "Маршруты",
    title: "Балканы без виз: путешествие по шести странам за две недели",
    date: "1 февраля 2025",
    readTime: "12 мин",
    bgColor: "bg-pink-100",
    textColor: "text-pink-600",
  },
];

const coverGradients = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-orange-400 to-red-500",
  "from-violet-400 to-purple-500",
  "from-pink-400 to-rose-500",
];

export default function ArticleSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Статьи</h2>
          <p className="mt-2 text-gray-500 text-base">
            Гайды, советы и маршруты для ваших путешествий
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article, idx) => (
            <article
              key={article.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            >
              <div
                className={`h-44 bg-linear-to-br ${coverGradients[idx]} flex items-end p-4`}
              >
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${article.bgColor} ${article.textColor}`}
                >
                  {article.tag}
                </span>
              </div>

              <div className="p-5">
                <h3 className="text-gray-900 font-semibold text-base leading-snug line-clamp-2">
                  {article.title}
                </h3>
                <div className="mt-4 flex items-center gap-3 text-gray-400 text-sm">
                  <span>{article.date}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>{article.readTime} чтения</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
