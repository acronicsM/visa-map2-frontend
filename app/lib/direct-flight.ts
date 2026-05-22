export type DirectFlightBandKey = "direct" | "no_direct";

export const ALL_DIRECT_FLIGHT_BAND_KEYS: readonly DirectFlightBandKey[] = [
  "direct",
  "no_direct",
] as const;

export type DirectFlightStatus = "idle" | "loading" | "ready" | "error";

export type DepartureCityOption = {
  city: string;
  city_normalized: string;
  airports: string[];
};

export type DepartureCitiesResponse = {
  country_iso2: string;
  items: DepartureCityOption[];
};

export type DirectCountriesResponse = {
  origin: {
    city: string;
    country_iso2: string;
    airports: string[];
  };
  direct_countries: Record<string, boolean>;
  source: string;
  cached: boolean;
  fetched_at: string;
  expires_at: string;
};

/** OR-merge: страна с прямым рейсом, если хотя бы один город даёт true. */
export function mergeDirectCountriesMaps(
  maps: Record<string, boolean>[],
): Record<string, boolean> {
  const merged: Record<string, boolean> = {};
  for (const map of maps) {
    for (const [iso2, hasDirect] of Object.entries(map)) {
      const key = iso2.trim().toUpperCase();
      if (!key) continue;
      if (hasDirect) {
        merged[key] = true;
      } else if (!(key in merged)) {
        merged[key] = false;
      }
    }
  }
  return merged;
}

export function directFlightBandForDest(
  iso2: string,
  directFlightByDest: Record<string, boolean>,
): DirectFlightBandKey {
  return directFlightByDest[iso2.trim().toUpperCase()] === true
    ? "direct"
    : "no_direct";
}
