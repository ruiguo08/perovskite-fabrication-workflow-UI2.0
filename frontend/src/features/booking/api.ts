import { apiFetch, type RequestOptions } from "../../lib/api";

export function bookingApi<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  return apiFetch<T>(`/api/booking/${path}`, options);
}

/** Exhaust server pages, so busy calendars and old inbox items are not silently lost. */
export async function bookingPages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await bookingApi<T[]>(
      `${path}${path.includes("?") ? "&" : "?"}offset=${offset}`,
    );
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
