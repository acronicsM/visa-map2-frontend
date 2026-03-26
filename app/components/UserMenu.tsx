"use client";

import { useState, useRef, useEffect } from "react";

interface UserMenuProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const menuItems = [
  { icon: "👤", label: "Профиль" },
  { icon: "📋", label: "Мои путешествия" },
  { icon: "⚙️", label: "Настройки" },
  { icon: "❓", label: "Справка" },
];

const logoutItem = { icon: "🚪", label: "Выход" };

export default function UserMenu({ isOpen, onOpen, onClose }: UserMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="fixed left-0 top-4 z-40">
      {/* Кнопка + Меню контейнер - вертикальный */}
      <div
        className={`flex flex-col bg-white/95 backdrop-blur-sm shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "w-56 rounded-tr-2xl rounded-b-2xl" : "w-14 rounded-tr-2xl rounded-bl-none"
        }`}
      >
        {/* Кнопка профиля - всегда видна */}
        <button
          onClick={isOpen ? onClose : onOpen}
          className="flex items-center justify-center w-14 h-[50px] shrink-0 hover:bg-slate-100 transition-colors"
          title={isOpen ? "Закрыть меню" : "Меню профиля"}
        >
          <svg
            className="w-6 h-6 text-slate-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.925 0m11.925 0a8.966 8.966 0 01-5.982-2.975m5.982 2.975A2.991 2.991 0 0112 21a2.991 2.991 0 00-2.982-2.975M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {/* Меню - видно только когда открыто */}
        {isOpen && (
          <div className="flex flex-col border-t border-slate-200">
            {/* Заголовок */}
            <div className="px-4 py-3 border-b border-slate-200 bg-linear-to-b from-slate-50 to-slate-100">
              <div className="text-sm font-semibold text-slate-900 whitespace-nowrap">Профиль</div>
              <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">user@example.com</div>
            </div>

            {/* Пункты меню */}
            <div className="flex flex-col">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap text-left border-b border-slate-100 last:border-b-0"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              {/* Выход */}
              <button
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap text-left pb-4"
              >
                <span>{logoutItem.icon}</span>
                <span>{logoutItem.label}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
