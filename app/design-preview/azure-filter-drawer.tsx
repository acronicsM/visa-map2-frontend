"use client";

import type { ComponentProps } from "react";
import FilterSidebar from "../components/FilterSidebar";

/** Пропсы панели: все поля классической `FilterSidebar`, плюс `open`/`onClose` превью. */
export type AzureFilterDrawerProps = {
  open: boolean;
  onClose: () => void;
} & Omit<
  ComponentProps<typeof FilterSidebar>,
  "layout" | "hidePassportInPanel" | "isOpen" | "onToggleSidebar"
>;

/**
 * Выезжающая панель превью Azure: полный набор фильтров из главной версии (`FilterSidebar`),
 * без дубля паспорта (его выбирают на плашке над картой).
 */
export default function AzureFilterDrawer({
  open,
  onClose,
  ...sidebar
}: AzureFilterDrawerProps) {
  return (
    <div
      id="azure-filter-drawer"
      aria-hidden={!open}
      className={`absolute top-0 left-0 bottom-0 z-50 flex max-w-[min(100vw,20rem)] w-full flex-col overflow-hidden border-r border-outline-variant/15 bg-surface-container-lowest/95 shadow-2xl backdrop-blur-xl transition-transform duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] sm:max-w-sm ${open ? "translate-x-0" : "-translate-x-full pointer-events-none"}`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/10 px-6 pt-6 pb-4">
        <h2 className="azure-font-headline text-xl font-extrabold tracking-tight text-on-surface">
          Фильтры карты
        </h2>
        <button
          type="button"
          className="rounded-full p-2 transition-colors hover:bg-surface-container"
          onClick={onClose}
          aria-label="Закрыть панель фильтров"
        >
          <span className="material-symbols-outlined text-on-surface" aria-hidden>
            close
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <FilterSidebar
          {...sidebar}
          layout="drawerEmbed"
          hidePassportInPanel
          isOpen
          onToggleSidebar={() => {}}
        />
      </div>
    </div>
  );
}
