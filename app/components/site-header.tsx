import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 h-14 shrink-0 border-b border-outline-variant/70 bg-azure-nav-glass backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span aria-hidden className="text-xl sm:text-2xl">
            🗺️
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-lg font-semibold tracking-tight text-on-surface sm:text-xl">
              VisaMap
            </span>
            <span className="hidden truncate text-xs text-on-surface-variant sm:block">
              Визовая карта мира
            </span>
          </div>
        </Link>

        <nav
          className="flex items-center gap-1 sm:gap-4 text-sm font-medium"
          aria-label="Основная навигация"
        >
          <Link
            href="/"
            className="rounded-md px-2 py-1.5 text-primary transition-colors hover:bg-primary-fixed-dim/40 hover:text-primary-container sm:px-3"
          >
            Карта
          </Link>
          <Link
            href="/design-preview"
            className="rounded-md px-2 py-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface sm:px-3"
          >
            Превью UI
          </Link>
        </nav>
      </div>
    </header>
  );
}
