import type { TravelCurrencyListResponse, TravelSpendingTier } from "../types/map";
import {
  budgetCurrencySelectionFromList,
  DEFAULT_BUDGET_CURRENCY,
} from "./budget-currency";
import { fetchJsonDeduped } from "./json-fetch-dedupe";

function normalizeIso2(iso2: string): string {
  return iso2.trim().toUpperCase();
}

/**
 * Прогревает лёгкие JSON для домашней страны (без geodata полигонов).
 * Fire-and-forget; состояние React заполняют эффекты через тот же dedupe URL.
 */
export function prefetchPassportBootstrap(
  apiUrl: string,
  iso2: string,
  budgetTier: TravelSpendingTier,
): void {
  const iso = normalizeIso2(iso2);
  if (!iso || iso.length !== 2 || !/^[A-Z]{2}$/.test(iso)) return;

  const base = apiUrl.replace(/\/$/, "");
  const scoresUrl = `${base}/travel-costs/${encodeURIComponent(iso)}?budget_tier=${budgetTier}`;
  const currenciesUrl = `${base}/travel-costs/currencies?home_iso2=${encodeURIComponent(iso)}`;
  const exactUrl = `${base}/travel-costs/${encodeURIComponent(iso)}/exact-budget-data`;
  const visaUrl = `${base}/visa-map/${encodeURIComponent(iso)}`;
  const vacationExoticUrl = `${base}/vacation-exotic/${encodeURIComponent(iso)}`;

  void fetchJsonDeduped(scoresUrl).catch(() => {});
  void fetchJsonDeduped(exactUrl).catch(() => {});
  void fetchJsonDeduped(visaUrl).catch(() => {});
  void fetchJsonDeduped(vacationExoticUrl).catch(() => {});

  void fetchJsonDeduped(currenciesUrl)
    .then((res) => {
      if (!res.ok || res.data == null || typeof res.data !== "object") return;
      const data = res.data as TravelCurrencyListResponse;
      const { selectedDefault } = budgetCurrencySelectionFromList(data);
      if (selectedDefault !== DEFAULT_BUDGET_CURRENCY) {
        const fxUrl = `${base}/travel-costs/fx-rate?currency=${encodeURIComponent(selectedDefault)}`;
        void fetchJsonDeduped(fxUrl).catch(() => {});
      }
    })
    .catch(() => {});
}
