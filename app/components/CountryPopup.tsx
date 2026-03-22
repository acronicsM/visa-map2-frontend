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
  onClose: () => void
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

const CONFIDENCE_LABELS: Record<number, string> = {
  1: 'Подтверждено МИД',
  2: 'Проверено модератором',
  3: 'Автоматические данные',
}

export default function CountryPopup({ country, visa, onClose }: Props) {
  if (!country) return null

  const category = visa?.visa_category ?? 'unknown'
  const color = VISA_COLORS[category]
  const label = VISA_LABELS[category]

  return (
    <div className="absolute bottom-8 right-4 w-72 bg-white rounded-2xl shadow-2xl z-10 overflow-hidden">
      {/* Шапка */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">{country.flag_emoji}</span>
          <div>
            <div className="font-semibold text-white text-sm">
              {country.name_ru}
            </div>
            <div className="text-white/80 text-xs">{country.name_en}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white text-lg leading-none"
        >
          ✕
        </button>
      </div>

      {/* Контент */}
      <div className="p-4">
        {/* Визовый режим */}
        <div className="mb-3">
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
            Визовый режим
          </div>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {label}
          </div>
        </div>

        {/* Срок пребывания */}
        {visa?.max_stay_days && (
          <div className="mb-3">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              Максимальный срок
            </div>
            <div className="text-sm font-medium text-slate-700">
              {visa.max_stay_days} дней
            </div>
          </div>
        )}

        {/* Столица и регион */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {country.capital && (
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                Столица
              </div>
              <div className="text-sm text-slate-700">{country.capital}</div>
            </div>
          )}
          {country.subregion && (
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                Регион
              </div>
              <div className="text-sm text-slate-700">{country.subregion}</div>
            </div>
          )}
        </div>

        {/* Достоверность данных */}
        {visa && (
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                visa.confidence_level === 1 ? 'bg-green-500' :
                visa.confidence_level === 2 ? 'bg-yellow-500' :
                'bg-slate-300'
              }`} />
              <span className="text-xs text-slate-400">
                {CONFIDENCE_LABELS[visa.confidence_level]}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}