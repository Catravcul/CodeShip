import { LEVELS } from "@modules/levels/data/levels";
import { SaveBook, type KeyValueStore } from "@modules/saves/application/save-book";
import type { SaveSlot } from "@modules/saves/domain/save-slot";
import { checkSpaceState, SPACE_LEVEL } from "@modules/saves/domain/space-state";

/** The saved games' storage port on the browser's localStorage (docs/design/partidas.md). Throws on a full quota. */
export const browserStore: KeyValueStore = {
  get: (k) => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),
  remove: (k) => localStorage.removeItem(k),
  keys: () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((k): k is string => k !== null),
};

/** A level can be resumed only while it is playable (level 3 joins when its branch makes it so). */
const playable = (level: number) => LEVELS.some((l) => l.number === level && l.state === "jugable");

/** The device's saved games. */
export const savedGames = (): SaveBook => new SaveBook(browserStore, { now: () => new Date(), playable });

/**
 * Each level's check of its own state (level-aware: level 3 adds its own here when it saves). A level with no
 * check yet cannot be resumed.
 */
const STATE_CHECKS: Readonly<Record<number, (state: unknown) => string | undefined>> = {
  [SPACE_LEVEL]: checkSpaceState,
};

/** Why a kept game cannot be resumed now, or undefined when it can. */
export function cannotResume(s: SaveSlot): string | undefined {
  const level = LEVELS.find((l) => l.number === s.level);
  if (!level) return "Santuario desconocido";
  if (!playable(s.level)) return level.note ?? "Este santuario todavía no se puede jugar";
  const check = STATE_CHECKS[s.level];
  if (!check) return "Este santuario todavía no sabe reanudar partidas";
  const why = check(s.state);
  return why ? `Partida incompleta (${why})` : undefined;
}

/**
 * What the game is playing: the slot it saves into (none: all slots are taken and it plays unsaved) and the
 * kept game it resumes, if any. Set by the start screen (boot.ts) before the game loads.
 */
export interface PlaySession {
  readonly slotId: string | undefined;
  readonly resume: SaveSlot | undefined;
}

let session: PlaySession = { slotId: undefined, resume: undefined };

export function startSession(s: PlaySession): void {
  session = s;
}

export function playSession(): PlaySession {
  return session;
}
