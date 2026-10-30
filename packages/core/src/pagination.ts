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

/** The part of a Supabase query result `rowsFromPage` reads. */
export type PageResult<T> = {
  data: T[] | null;
  error: { code?: string } | null;
  status?: number;
};

/**
 * Rows of one page. A range starting past the end of the table can answer
 * `PGRST103` / HTTP 416 instead of an empty list; that means "no more rows",
 * not a failure. Any other error is thrown.
 */
export function rowsFromPage<T>(result: PageResult<T>): T[] {
  const { data, error, status } = result;
  if (error) {
    if (error.code === "PGRST103" || status === 416) return [];
    throw error;
  }
  return data ?? [];
}
