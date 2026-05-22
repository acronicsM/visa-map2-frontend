import {
  budgetCurrencySelectionFromList,
  DEFAULT_BUDGET_CURRENCY,
} from "./budget-currency";
import { fetchPassportBootstrap } from "./passport-bootstrap";
import { fetchJsonDeduped } from "./json-fetch-dedupe";

function normalizeIso2(iso2: string): string {
  return iso2.trim().toUpperCase();
}

/**
 * Прогревает passport-bootstrap (visa + scores x3 + currencies).
 * Fire-and-forget; состояние React заполняет хук через тот же dedupe URL.
 */
export function prefetchPassportBootstrap(apiUrl: string, iso2: string): void {
  const iso = normalizeIso2(iso2);
  if (!iso || iso.length !== 2 || !/^[A-Z]{2}$/.test(iso)) return;

  const base = apiUrl.replace(/\/$/, "");
  void fetchPassportBootstrap(base, iso)
    .then((res) => {
      if (!res.ok || !res.data) return;
      const { selectedDefault } = budgetCurrencySelectionFromList(
        res.data.currencies,
      );
      if (selectedDefault !== DEFAULT_BUDGET_CURRENCY) {
        const fxUrl = `${base}/travel-costs/fx-rate?currency=${encodeURIComponent(selectedDefault)}`;
        void fetchJsonDeduped(fxUrl).catch(() => {});
      }
    })
    .catch(() => {});
}
