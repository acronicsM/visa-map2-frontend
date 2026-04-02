This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Run the development server from this directory:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Create `.env.local`:

- `NEXT_PUBLIC_API_URL` — URL бэкенда (например `http://localhost:8000`).
- `NEXT_PUBLIC_MAPTILER_KEY` — ключ MapTiler для подложки карты.

## Карта и режимы раскраски

Главный экран: MapLibre + GeoJSON границ из `GET /countries/geodata` (в properties есть `safety_level`, `cost_level`, `cost_per_day_usd` для режимов карты).

Режимы боковой панели (переключатель «цвет» у секции):

| Режим | Источник данных |
|--------|------------------|
| Гражданство | `GET /visa-map/{passport}` + фильтры категорий виз |
| Безопасность | `safety_level` из геоданных стран |
| Стоимость отдыха | `cost_level` из геоданных стран |
| Сезонность | `GET /country-seasons/{month}/geodata` — отдельный слой по месяцу (1–12) |

Фильтры в боковой панели накладываются **все сразу (И)**: яркая раскраска по текущему режиму только у стран, которые одновременно попадают в выбранные категории визы, уровни безопасности и стоимости и в выбранные типы сезона для выбранного месяца; остальные отображаются приглушённо.

При отсутствии строк в БД API возвращает пустой `FeatureCollection` (HTTP 200). Чтобы карта раскрашивалась, на бэкенде нужно загрузить сезоны: из `visa-map2` выполнить `python scripts/import_country_seasons.py` (переменная окружения `INPUT_FOLDER_SEASONS` с GeoJSON `seasons_month_1..12.geojson`).

Выбор месяца в секции «Сезонность» автоматически включает режим раскраски по сезонам (не нужно отдельно жать «цвет», если вы уже меняете месяц).

## Scripts

```bash
npm run dev    # разработка
npm run build  # production-сборка
npm run lint   # ESLint
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
