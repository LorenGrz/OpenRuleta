/** PostgREST caps a single response (1000 rows by default), so lists must be
 *  read page by page or large tables silently come back truncated. */
export const PAGE_SIZE = 1000;

/**
 * Calls `fetchPage(from, to)` (inclusive `.range()` bounds) until a page comes
 * back shorter than `pageSize`, and returns every row in order. The query must
 * have a total order (e.g. created_at + id) or pages can overlap/skip rows.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize: number = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    all.push(...page);
    if (page.length < pageSize) return all;
  }
}
