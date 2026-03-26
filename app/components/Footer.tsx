const footerLinks = [
  {
    heading: "О проекте",
    links: ["Как это работает", "О нас", "Блог", "Пресс-кит"],
  },
  {
    heading: "Статьи",
    links: ["Визовые гайды", "Маршруты", "Советы путешественникам", "FAQ"],
  },
  {
    heading: "Контакты",
    links: ["Написать нам", "Telegram", "ВКонтакте", "Сотрудничество"],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🗺️</span>
              <span className="text-white font-bold text-lg">VisaMap</span>
            </div>
            <p className="text-sm leading-relaxed">
              Интерактивная карта визовых требований для путешественников. Узнай,
              куда ты можешь поехать прямо сейчас.
            </p>
          </div>

          {footerLinks.map((col) => (
            <div key={col.heading}>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {col.heading}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <span className="text-sm hover:text-white transition-colors duration-150 cursor-pointer">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <span>© {year} VisaMap. Все права защищены.</span>
          <div className="flex gap-5">
            <span className="hover:text-white cursor-pointer transition-colors duration-150">
              Политика конфиденциальности
            </span>
            <span className="hover:text-white cursor-pointer transition-colors duration-150">
              Условия использования
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
