import type { Reality } from "@core/reality";

/**
 * A level of the start screen: one of the six sanctuaries on Cold Sanctuary's «depth = danger» axis
 * (docs/design/santuario3-iniciacion.md §5). Only some can be played; the others say why not.
 */
export interface Level {
  readonly id: string;
  /** Its number on the axis: 1 Terrestre … 5 Núcleo (Cold Sanctuary), 6 Espacio (Codeship). */
  readonly number: number;
  readonly name: string;
  /** How dangerous it is (Cold Sanctuary §3). */
  readonly danger: string;
  /** Its shape (Cold Sanctuary §3: joined, vertical, scattered, a castle, an orbit). */
  readonly topology: string;
  readonly desc: string;
  /**
   * Where it sits on the level map, in map units: `y` is the height on the axis (up: the sky and space; down:
   * the sea, the rock and the core), `x` and `z` spread the nodes so they do not hide each other.
   */
  readonly at: { readonly x: number; readonly y: number; readonly z: number };
  /** `jugable`: it starts; `en-construccion`: it is being built (its card says what); `proximamente`: later. */
  readonly state: "jugable" | "en-construccion" | "proximamente";
  /** What its card says while it cannot be played. */
  readonly note?: string;
  readonly reality: Reality;
  readonly source: string;
}

/** A game kept on this device: the level it was in and when (none is written yet: docs/qa/casos.md HC-06). */
export interface SavedGame {
  readonly level: number;
  readonly savedAt: string;
}

/** Read a kept game from its stored text; anything else (nothing, broken, an unknown level) is no game. */
export function parseSave(raw: string | null | undefined, levels: readonly Level[]): SavedGame | undefined {
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw) as Partial<SavedGame>;
    if (typeof v.level !== "number" || typeof v.savedAt !== "string") return undefined;
    if (!levels.some((l) => l.number === v.level && l.state === "jugable")) return undefined;
    return { level: v.level, savedAt: v.savedAt };
  } catch {
    return undefined;
  }
}

/** A level as an option of the start screen's list. */
export interface LevelChoice {
  readonly id: string;
  readonly number: number;
  /** A tap picks it (and shows its card): the playable ones and the one being built. */
  readonly selectable: boolean;
  /** Why it cannot be started now. */
  readonly locked?: string;
  /** Its button: «Jugar», or «Continuar» for the level of a kept game. */
  readonly action: "Jugar" | "Continuar";
}

/** «Próximamente»: the lock of a level that is neither playable nor being built. */
export const SOON = "Próximamente";

export function levelChoices(levels: readonly Level[], save?: SavedGame): LevelChoice[] {
  return levels.map((l) => ({
    id: l.id,
    number: l.number,
    selectable: l.state !== "proximamente",
    locked: l.state === "jugable" ? undefined : (l.note ?? SOON),
    action: save?.level === l.number && l.state === "jugable" ? "Continuar" : "Jugar",
  }));
}
