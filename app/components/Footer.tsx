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
    <footer className="bg-inverse-surface text-inverse-on-surface">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🗺️</span>
              <span className="text-white font-bold text-lg">VisaMap</span>
            </div>
            <p className="text-sm leading-relaxed text-white/75">
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
                    <span className="cursor-pointer text-sm text-white/75 transition-colors duration-150 hover:text-white">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/70 sm:flex-row">
          <span>© {year} VisaMap. Все права защищены.</span>
          <div className="flex gap-5">
            <span className="cursor-pointer transition-colors duration-150 hover:text-white">
              Политика конфиденциальности
            </span>
            <span className="cursor-pointer transition-colors duration-150 hover:text-white">
              Условия использования
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
