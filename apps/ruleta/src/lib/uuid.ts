/** RFC 4122 UUID (any version/variant), case-insensitive. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * True when `value` is a syntactically valid UUID. Route handlers should
 * check this before passing an id to the database: Postgres throws on a
 * malformed UUID literal instead of simply not matching (M2).
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
