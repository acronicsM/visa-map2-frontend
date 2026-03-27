"use client";

import { useState } from "react";
import VisaMap from "./components/VisaMap";
import FilterSidebar from "./components/FilterSidebar";
import TravelCollections from "./components/TravelCollections";
import ArticleSection from "./components/ArticleSection";
import Footer from "./components/Footer";

const ALL_CATEGORIES = new Set(["free", "evisa", "voa", "embassy", "unavailable"]);

export default function Home() {
  const [passport, setPassport] = useState("RU");
  const [passportName, setPassportName] = useState("Россия");
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(ALL_CATEGORIES));
  const [coloringEnabled, setColoringEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function handlePassportChange(iso2: string, nameRu?: string) {
    setPassport(iso2);
    if (nameRu) setPassportName(nameRu);
  }

  function handleToggleCategory(key: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <main className="w-full">
      <section className="w-full flex" style={{ height: "100vh" }}>
        <FilterSidebar
          passport={passport}
          passportName={passportName}
          onPassportChange={handlePassportChange}
          activeCategories={activeCategories}
          onToggleCategory={handleToggleCategory}
          coloringEnabled={coloringEnabled}
          onColoringEnabledChange={setColoringEnabled}
          isOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        {/* Кнопка открытия когда сайдбар закрыт */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-8 h-full hover:opacity-70 transition-opacity shrink-0"
            style={{ backgroundColor: "#edeae3" }}
            title="Открыть фильтры"
          >
            <svg className="w-4 h-4" style={{ color: "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5l7 7-7 7" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div className="flex-1 relative overflow-hidden">
          <VisaMap
            passport={passport}
            passportName={passportName}
            onPassportChange={handlePassportChange}
            activeCategories={activeCategories}
            onToggleCategory={handleToggleCategory}
            coloringEnabled={coloringEnabled}
          />
        </div>
      </section>

      <TravelCollections />
      <ArticleSection />
      <Footer />
    </main>
  );
}
