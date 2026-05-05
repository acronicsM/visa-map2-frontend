import type { TravelCurrencyListResponse } from "../types/map";

export const DEFAULT_BUDGET_CURRENCY = "USD";

export function normalizeBudgetCurrency(value: string | null | undefined): string {
  const code = String(value ?? "").trim().toUpperCase();
  return code.length === 3 ? code : DEFAULT_BUDGET_CURRENCY;
}

/** Инвариант как в `use-home-map-state`: список валют и выбранная по умолчанию для UI. */
export function budgetCurrencySelectionFromList(
  data: TravelCurrencyListResponse,
): { available: string[]; selectedDefault: string } {
  const currencies = Array.isArray(data.currencies)
    ? data.currencies.map(normalizeBudgetCurrency)
    : [DEFAULT_BUDGET_CURRENCY];
  const uniqueCurrencies = Array.from(new Set(currencies));
  const available = uniqueCurrencies.length
    ? uniqueCurrencies
    : [DEFAULT_BUDGET_CURRENCY];
  const nextDefault = normalizeBudgetCurrency(data.default_currency);
  const selectedDefault = available.includes(nextDefault)
    ? nextDefault
    : DEFAULT_BUDGET_CURRENCY;
  return { available, selectedDefault };
}
