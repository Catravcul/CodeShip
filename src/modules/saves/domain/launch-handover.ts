import { isRecord } from "@core/snapshot";

/**
 * From level 3 to level 6 (docs/design/partidas.md, «Del 3 al 6»; docs/design/santuario3-lanzamiento.md): once
 * Doménica has docked with the Starship in low orbit, her level-3 game becomes a level-6 one in the same slot. The
 * space game has no state of its own yet, so the slot keeps a hand-over: the days played, the posts passed and the
 * cruise to Bennu still to fly. The space game starts from it (a new game, with her on the Starship's flight deck and
 * the cruise running) and, from its first save on, the slot holds a full level-6 state.
 */
export interface LaunchHandover {
  readonly boardDays: number;
  readonly fromLaunch: {
    /** The training posts she passed (all of them: the launch is the last step of post 13). */
    readonly posts: readonly number[];
    /** The real cruise from low Earth orbit to Bennu, days (OSIRIS-REx's: licence for the Starship's). */
    readonly cruiseDays: number;
  };
}

/** The level the slot becomes (space-state.ts SPACE_LEVEL; not imported: space-state imports this file). */
export const HANDOVER_LEVEL = 6;

/** The hand-over written when she docks: her days go on, and the cruise is still to fly. */
export function launchHandover(boardDays: number, posts: Iterable<number>, cruiseDays: number): LaunchHandover {
  return { boardDays: Math.max(0, boardDays), fromLaunch: { posts: [...new Set(posts)].sort((a, b) => a - b), cruiseDays } };
}

/** Whether a level-6 state is a hand-over from the launch (not yet a full space state). */
export function isHandover(s: unknown): s is LaunchHandover {
  return isRecord(s) && isRecord(s.fromLaunch);
}

/** Why a hand-over cannot start the space game, or undefined when it can. */
export function checkHandover(s: unknown): string | undefined {
  if (!isRecord(s) || !isRecord(s.fromLaunch)) return "sin el paso del lanzamiento";
  if (typeof s.boardDays !== "number" || !Number.isFinite(s.boardDays) || s.boardDays < 0) return "sin día a bordo";
  const f = s.fromLaunch;
  if (typeof f.cruiseDays !== "number" || !Number.isFinite(f.cruiseDays) || f.cruiseDays < 0) return "sin el crucero a Bennu";
  if (!Array.isArray(f.posts) || !f.posts.every((n) => Number.isInteger(n) && n >= 1 && n <= 13)) return "puestos ilegibles";
  return undefined;
}
