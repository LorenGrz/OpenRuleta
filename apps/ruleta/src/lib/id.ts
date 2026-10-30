/** The slice of the Web Crypto API used to make ids (absent or partial on
 *  non-secure origins such as http over a LAN IP). */
export type IdSource = {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView>(array: T) => T;
};

let counter = 0;

/**
 * Unique id for a new row. Uses `randomUUID` when available, else builds a v4
 * UUID from `getRandomValues`, else a timestamp + counter string.
 */
export function createId(source?: IdSource): string {
  if (source?.randomUUID) return source.randomUUID();
  if (source?.getRandomValues) {
    const b = source.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  counter += 1;
  return `id-${Date.now().toString(36)}-${counter}`;
}
