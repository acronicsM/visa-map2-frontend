import Link from "next/link";

interface TripPageProps {
  params: Promise<{ iso2: string }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { iso2: raw } = await params;
  const iso2 = decodeURIComponent(raw).toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="max-w-xl mx-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500 uppercase tracking-wide">Заглушка</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Подбор путешествия: {iso2}
        </h1>
        <p className="mt-4 text-slate-600 leading-relaxed">
          Здесь позже появятся авиаперелёты, отели, расходы и подробная информация о
          стране. Сейчас это черновая страница для перехода с карты.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center text-sky-700 font-medium hover:underline"
        >
          ← Назад на карту
        </Link>
      </div>
    </main>
  );
}