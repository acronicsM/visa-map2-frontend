import type { PassportBootstrapResponse } from "../types/map";
import { fetchJsonDeduped } from "./json-fetch-dedupe";

export type FetchPassportBootstrapResult =
  | { ok: true; status: number; data: PassportBootstrapResponse }
  | { ok: false; status: number; data: null };

export async function fetchPassportBootstrap(
  apiBase: string,
  iso2: string,
): Promise<FetchPassportBootstrapResult> {
  const base = apiBase.replace(/\/$/, "");
  const iso = iso2.trim().toUpperCase();
  const url = `${base}/passport-bootstrap/${encodeURIComponent(iso)}`;
  const res = await fetchJsonDeduped(url);
  if (!res.ok || res.data == null || typeof res.data !== "object") {
    return { ok: false, status: res.status, data: null };
  }
  return {
    ok: true,
    status: res.status,
    data: res.data as PassportBootstrapResponse,
  };
}
