/**
 * A saved game (docs/design/partidas.md; Berón, 2026-11-18: «guardar la partida en localStorage»): one slot,
 * written as JSON text. It says which level it is (3 or 6, the sanctuaries of the start screen), when it was
 * saved, the day on board and a short summary (vehicle and place) for the list; `state` is the level's own
 * snapshot, which only that level reads and checks (space: `space-state.ts`). Pure: no storage here.
 *
 * The text is versioned (`format`). An older format goes through the migration hook one step at a time; one
 * that cannot be read is reported with why (`dañada`, `antigua`, `futura`) and never throws.
 */

/** Today's format. Raise it when the slot or a level's state changes shape, and add the step to `MIGRATIONS`. */
export const SAVE_FORMAT = 1;

/** What the list shows of a game: the vehicle she is in and where in it. */
export interface SaveSummary {
  readonly vehicle: string;
  readonly place: string;
}

export interface SaveSlot {
  /** Where it is kept (the storage key's tail): not part of its text. */
  readonly id: string;
  readonly format: number;
  /** The sanctuary's number (start screen): 6 space, 3 the air. */
  readonly level: number;
  /** ISO 8601, when it was written. */
  readonly savedAt: string;
  /** The day on board, from 1 (a day lasts 24 real minutes: src/core/board-time.ts). */
  readonly boardDay: number;
  readonly summary: SaveSummary;
  /** The level's snapshot (plain JSON). */
  readonly state: unknown;
}

/** One step of the migration hook: the object of format n to that of format n + 1. */
export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/** The steps from each old format to the next. None yet: format 1 is the first. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export type SlotProblem = "dañada" | "antigua" | "futura";

export type ReadSlot =
  | { readonly ok: true; readonly slot: SaveSlot; readonly migrated: boolean }
  | { readonly ok: false; readonly id: string; readonly problem: SlotProblem; readonly text: string; readonly level?: number; readonly savedAt?: string };

const PROBLEM_TEXT: Readonly<Record<SlotProblem, string>> = {
  dañada: "Partida dañada: no se puede leer",
  antigua: "Partida de una versión antigua sin todo lo necesario para seguir",
  futura: "Partida de una versión más nueva de Codeship",
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Write a slot as its stored text (its id is the key, not the text). */
export function writeSlot(s: SaveSlot): string {
  const { id: _id, ...rest } = s;
  return JSON.stringify(rest);
}

/** Read a slot's stored text: the slot, or why it cannot be resumed. Never throws. */
export function readSlot(id: string, raw: string, o: { current?: number; migrations?: Readonly<Record<number, Migration>> } = {}): ReadSlot {
  const current = o.current ?? SAVE_FORMAT;
  const migrations = o.migrations ?? MIGRATIONS;
  const fail = (problem: SlotProblem, v?: Record<string, unknown>): ReadSlot => ({
    ok: false,
    id,
    problem,
    text: PROBLEM_TEXT[problem],
    ...(v && typeof v.level === "number" ? { level: v.level } : {}),
    ...(v && typeof v.savedAt === "string" ? { savedAt: v.savedAt } : {}),
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail("dañada");
  }
  if (!isObject(parsed)) return fail("dañada");
  let v: Record<string, unknown> = parsed;
  // The first kept game (`codeship.partida`, before slots): a level and a date, nothing to resume.
  if (v.format === undefined) return typeof v.level === "number" && v.state === undefined ? fail("antigua", v) : fail("dañada", v);
  if (typeof v.format !== "number" || !Number.isInteger(v.format)) return fail("dañada", v);
  if (v.format > current) return fail("futura", v);
  let migrated = false;
  while ((v.format as number) < current) {
    const step = migrations[v.format as number];
    if (!step) return fail("antigua", v);
    try {
      const next = step(v);
      if (!isObject(next) || typeof next.format !== "number" || next.format <= (v.format as number)) return fail("dañada", v);
      v = next;
    } catch {
      return fail("dañada", v);
    }
    migrated = true;
  }
  const s = v;
  const summary = s.summary;
  if (
    typeof s.level !== "number" ||
    typeof s.savedAt !== "string" ||
    typeof s.boardDay !== "number" ||
    !Number.isFinite(s.boardDay) ||
    !isObject(summary) ||
    typeof summary.vehicle !== "string" ||
    typeof summary.place !== "string" ||
    !isObject(s.state)
  )
    return fail("dañada", s);
  return {
    ok: true,
    migrated,
    slot: { id, format: s.format as number, level: s.level, savedAt: s.savedAt, boardDay: s.boardDay, summary: { vehicle: summary.vehicle, place: summary.place }, state: s.state },
  };
}
