/**
 * Reading back a saved snapshot (docs/design/partidas.md) without trusting it: each helper takes what is
 * stored and the value to keep when it is missing or of the wrong kind. Shared by every `restore` of the
 * domain, so a broken or old field never crashes the game; it just keeps the value of a new game.
 */

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A finite number, or `keep`. */
export const num = (v: unknown, keep: number): number => (typeof v === "number" && Number.isFinite(v) ? v : keep);

export const str = (v: unknown, keep: string): string => (typeof v === "string" ? v : keep);

export const bool = (v: unknown, keep: boolean): boolean => (typeof v === "boolean" ? v : keep);

/** The string entries of a list (others dropped); `keep` if it is not a list. */
export const strings = (v: unknown, keep: readonly string[] = []): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [...keep]);

/** A `{ id: number }` record: its finite numbers (others dropped); empty if it is not a record. */
export const numbers = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!isRecord(v)) return out;
  for (const [k, x] of Object.entries(v)) if (typeof x === "number" && Number.isFinite(x)) out[k] = x;
  return out;
};

/** A field of a record, or undefined when `v` is not one. */
export const field = (v: unknown, k: string): unknown => (isRecord(v) ? v[k] : undefined);
