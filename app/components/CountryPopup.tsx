"use client"

interface VisaItem {
  id: string
  iso2: string
  visa_category: string
  max_stay_days: number | null
  confidence_level: number
}

interface Country {
  iso2: string
  name_ru: string
  name_en: string
  flag_emoji: string
  region: string
  subregion: string
  capital: string
}

interface Props {
  country: Country | null
  visa: VisaItem | null
  x: number
  y: number
}

const VISA_LABELS: Record<string, string> = {
  free:        'Без визы',
  voa:         'Виза по прилёту',
  evisa:       'Электронная виза',
  embassy:     'Виза в посольстве',
  restricted:  'Сложно получить',
  unavailable: 'Въезд закрыт',
  unknown:     'Нет данных',
}

const VISA_COLORS: Record<string, string> = {
  free:        '#22c55e',
  voa:         '#3b82f6',
  evisa:       '#eab308',
  embassy:     '#f97316',
  restricted:  '#ef4444',
  unavailable: '#6b7280',
  unknown:     '#94a3b8',
}

export default function CountryPopup({ country, visa, x, y }: Props) {
  if (!country) return null

  const category = visa?.visa_category ?? 'unknown'
  const color = VISA_COLORS[category]
  const label = VISA_LABELS[category]

  const offsetX = 16
  const offsetY = 16
  const cardW = 260
  const cardH = 320
  const left = x + offsetX + cardW > window.innerWidth ? x - cardW - offsetX : x + offsetX
  const top  = y + offsetY + cardH > window.innerHeight ? y - cardH - offsetY : y + offsetY

  return (
    <div
      className="fixed z-50 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-none"
      style={{ left, top }}
    >
      {/* Фото-заглушка */}
      <div className="relative w-full h-36 bg-linear-to-br from-slate-200 to-slate-300 flex items-center justify-center">
        <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9H18.75A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        {/* Бейдж визового режима поверх фото */}
        <div
          className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-white text-xs font-medium"
          style={{ backgroundColor: color }}
        >
          {label}
        </div>
      </div>

      {/* Контент */}
      <div className="p-4">
        {/* Название + флаг */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`fi fi-${country.iso2.toLowerCase()} shrink-0 rounded-sm`}
            style={{ width: "20px", height: "15px" }}
          />
          <div>
            <div className="font-semibold text-slate-800 text-sm leading-tight">{country.name_ru}</div>
            <div className="text-xs text-slate-400">{country.name_en}</div>
          </div>
        </div>

        {/* Иконки-заглушки */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {visa?.max_stay_days ? `${visa.max_stay_days} дней` : '— дней'}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {country.capital || '—'}
          </div>
        </div>

        {/* Текст-заглушка */}
        <div className="space-y-1.5">
          <div className="h-2 bg-slate-100 rounded-full w-full" />
          <div className="h-2 bg-slate-100 rounded-full w-5/6" />
          <div className="h-2 bg-slate-100 rounded-full w-4/6" />
        </div>

        {/* Заглушка-кнопка */}
        <div className="mt-3 h-7 bg-slate-100 rounded-lg w-full" />
      </div>
    </div>
  )
}
