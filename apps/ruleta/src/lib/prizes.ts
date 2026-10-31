/** Pure prize-wheel rules: parsing stored data, validating the editor draft
 *  and the weighted pick. No React, no config imports (tested with node:test). */

export type Prize = { id: string; name: string; weight: number };

export const MIN_PRIZES = 2;
export const MAX_PRIZES = 16;
export const MAX_NAME_LENGTH = 40;
export const MAX_WEIGHT = 100;

function hasSpinnablePrize(prizes: Prize[]): boolean {
  return prizes.some((p) => p.weight > 0);
}

/**
 * Reads the stored prize list. Anything that is not a usable list (bad JSON,
 * not an array, empty names, non-finite or negative weights, repeated ids,
 * fewer than 2 or more than 16 prizes, every weight 0) yields `defaults`.
 */
export function parsePrizes(raw: string | null, defaults: Prize[]): Prize[] {
  if (raw === null) return defaults;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaults;
  }
  if (!Array.isArray(data)) return defaults;
  if (data.length < MIN_PRIZES || data.length > MAX_PRIZES) return defaults;

  const prizes: Prize[] = [];
  const ids = new Set<string>();
  for (const item of data as unknown[]) {
    if (typeof item !== "object" || item === null) return defaults;
    const { id, name, weight } = item as Record<string, unknown>;
    if (typeof id !== "string" || id === "" || ids.has(id)) return defaults;
    if (typeof name !== "string" || name.trim() === "") return defaults;
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
      return defaults;
    }
    ids.add(id);
    prizes.push({ id, name: name.trim(), weight });
  }
  return hasSpinnablePrize(prizes) ? prizes : defaults;
}

/**
 * Weighted random index. Never returns a prize of weight 0; returns -1 when
 * no prize can win. `random` must return a value in [0, 1); a value at or
 * above 1 (or NaN) lands on the last prize that can win.
 */
export function pickWeightedIndex(
  prizes: Prize[],
  random: () => number = Math.random,
): number {
  let total = 0;
  let lastWinnable = -1;
  prizes.forEach((p, i) => {
    if (p.weight > 0) {
      total += p.weight;
      lastWinnable = i;
    }
  });
  if (lastWinnable === -1) return -1;

  const target = random() * total;
  let acc = 0;
  for (let i = 0; i < prizes.length; i++) {
    if (prizes[i].weight <= 0) continue;
    acc += prizes[i].weight;
    if (target < acc) return i;
  }
  return lastWinnable;
}

/** Editor row: the weight stays a string while the operator types. */
export type DraftPrize = { id: string; name: string; weight: string };

export type PrizeDraftError =
  | "nameRequired"
  | "nameTooLong"
  | "weightInvalid"
  | "minPrizes"
  | "maxPrizes"
  | "noWeight";

export type PrizeDraftValidation = {
  /** Per-row errors, keyed by draft id. */
  rows: Record<string, PrizeDraftError[]>;
  /** Errors about the list as a whole. */
  list: PrizeDraftError[];
  /** The prizes to save; null while any error remains. */
  prizes: Prize[] | null;
};

export function toDraft(prizes: Prize[]): DraftPrize[] {
  return prizes.map((p) => ({
    id: p.id,
    name: p.name,
    weight: String(p.weight),
  }));
}

export function validatePrizeDraft(draft: DraftPrize[]): PrizeDraftValidation {
  const rows: Record<string, PrizeDraftError[]> = {};
  const list: PrizeDraftError[] = [];
  const prizes: Prize[] = [];

  for (const row of draft) {
    const errors: PrizeDraftError[] = [];
    const name = row.name.trim();
    if (name === "") errors.push("nameRequired");
    else if (name.length > MAX_NAME_LENGTH) errors.push("nameTooLong");

    const weightText = row.weight.trim();
    const weight = /^\d+$/.test(weightText) ? Number(weightText) : NaN;
    if (!(weight >= 0 && weight <= MAX_WEIGHT)) errors.push("weightInvalid");

    if (errors.length > 0) rows[row.id] = errors;
    else prizes.push({ id: row.id, name, weight });
  }

  if (draft.length < MIN_PRIZES) list.push("minPrizes");
  if (draft.length > MAX_PRIZES) list.push("maxPrizes");
  if (
    draft.length >= MIN_PRIZES &&
    Object.keys(rows).length === 0 &&
    !hasSpinnablePrize(prizes)
  ) {
    list.push("noWeight");
  }

  const valid = list.length === 0 && Object.keys(rows).length === 0;
  return { rows, list, prizes: valid ? prizes : null };
}
