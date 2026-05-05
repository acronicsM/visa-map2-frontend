/** Результат одного запроса с уже распарсенным JSON (тело читается один раз). */
export type DedupedJsonResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

const inflight = new Map<string, Promise<DedupedJsonResult>>();

/**
 * GET JSON с дедупликацией по полному URL (включая query).
 * Параллельные вызовы с тем же URL делят один fetch + один parse.
 */
export function fetchJsonDeduped(url: string): Promise<DedupedJsonResult> {
  let promise = inflight.get(url);
  if (!promise) {
    promise = fetch(url)
      .then(async (response): Promise<DedupedJsonResult> => {
        let data: unknown;
        try {
          data = await response.json();
        } catch {
          data = null;
        }
        return { ok: response.ok, status: response.status, data };
      })
      .finally(() => {
        inflight.delete(url);
      });
    inflight.set(url, promise);
  }
  return promise;
}
