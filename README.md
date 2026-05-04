# VisaMap — frontend (Next.js)

Клиент **Visa Map**: интерактивная карта визовых режимов, фильтры по безопасности, бюджету и сезонности. Репозиторий бэкенда: [visa-map2](https://github.com/acronicsM/visa-map2).

## Требования

- Node.js с npm
- Запущенный API (по умолчанию `http://localhost:8000`) и при необходимости Docker с Postgres/Redis на стороне бэкенда

## Быстрый старт

```bash
cd visa-map2-frontend
npm install
```

Скопируйте переменные окружения и подставьте значения:

```bash
copy .env.example .env.local
```

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

### Переменные окружения (`.env.local`)

См. комментарии в [`.env.example`](./.env.example). Ключевые переменные:

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_API_URL` | Базовый URL FastAPI без завершающего слэша |
| `NEXT_PUBLIC_MAPTILER_KEY` | Ключ MapTiler для тайлов/стиля |
| `NEXT_PUBLIC_MAPTILER_STYLE` | ID стиля (по умолчанию в коде — `basic-v2`) |

Опционально: `NEXT_PUBLIC_DEBUG_TRAVEL_COST_SCORE_BANDS` — логи загрузки `/travel-costs/score-bands` в консоли браузера.

## Карта и режимы раскраски

- Подложка: **MapLibre GL JS** + стиль MapTiler (`NEXT_PUBLIC_MAPTILER_STYLE`).
- Границы стран: **`GET /countries/geodata`** (`promoteId: iso2`). В GeoJSON есть, в частности, **`safety_level`**; полей «стоимость отдыха» в свойствах фич нет — бюджет берётся из отдельного API.

| Режим | Источник данных |
|--------|------------------|
| Гражданство | `GET /visa-map/{passport}` + фильтры категорий виз |
| Безопасность | `safety_level` из геоданных стран |
| Стоимость / бюджет | `GET /travel-costs/{passport}?budget_tier=cheap\|normal\|expensive`; пороги/подписи — `GET /travel-costs/score-bands` |
| Сезонность | `GET /country-seasons/{month}/geodata` (при необходимости параллельно `GET /country-seasons/{month}/meta`) |

Фильтры боковой панели накладываются **совместно (И)**: заметная заливка по текущему режиму только у стран, которые одновременно удовлетворяют выбранным визовым категориям, безопасности, **диапазонам относительной стоимости** (bands из score), языку и сезонным типам для выбранного месяца; остальные отображаются приглушённо.

При пустых данных сезонов API отдаёт пустой `FeatureCollection` (HTTP 200). Импорт на бэкенде: `python scripts/import_country_seasons.py` и каталог `INPUT_FOLDER_SEASONS` с файлами `seasons_month_1..12.geojson`.

## Скрипты

```bash
npm run dev    # разработка
npm run build  # production-сборка
npm run lint   # ESLint (next/core-web-vitals)
```

## Документация инструментов

- [Next.js](https://nextjs.org/docs)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
