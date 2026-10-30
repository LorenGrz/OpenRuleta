/** PostgREST caps a single response (1000 rows by default, configurable lower
 *  per project), so lists must be read page by page or large tables silently
 *  come back truncated. */
export const PAGE_SIZE = 1000;

/**
 * Calls `fetchPage(from, to)` (inclusive `.range()` bounds) and returns every
 * row in order. Advances by the number of rows actually received, so a server
 * that caps responses below `pageSize` loses nothing, and stops only on an
 * empty page. The query must have a total order (e.g. created_at + id).
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize: number = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ;) {
    const page = await fetchPage(from, from + pageSize - 1);
    if (page.length === 0) return all;
    all.push(...page);
    from += page.length;
  }
}

/** Keeps the first row per id: a row repeated between pages (concurrent
 *  writes shifting the offsets) must not appear twice in the draw pool. */
export function uniqueById<T extends { id: string }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => !seen.has(r.id) && !!seen.add(r.id));
}
