import { isRecord } from "@core/snapshot";

/**
 * The aerial sanctuary's (level 3) saved state (docs/design/partidas.md, docs/design/santuario3-escena.md): where
 * she is and how she looks, the days played and the settings. Only where she is is required; the rest, missing or
 * broken, keeps a new game's value. A game saved mid-flight or mid-lift is kept where the flight or the ride began.
 */
export const AERIAL_LEVEL = 3;

export const AERIAL_ISLANDS = ["entrenamiento", "lanzadera", "parque", "muelle", "plataforma", "glaciar"] as const;
export type AerialIsland = (typeof AERIAL_ISLANDS)[number];

export interface AerialState {
  /** Days since the game began (fractional; a day is 24 real minutes). */
  readonly boardDays: number;
  /** Her feet, m (the sanctuary's frame at the scale it was saved in), and the island she is on. */
  readonly at: { readonly x: number; readonly y: number; readonly z: number; readonly island: AerialIsland };
  /** Where she looks, radians. */
  readonly yaw?: number;
  /** The interior scale the game was saved at (her place is scaled back if it changed). */
  readonly k?: number;
  /** The general settings, as stored (`codeship.ajustes`). */
  readonly settings?: { readonly ajustes?: string };
  /** The training posts whose challenge she has passed (docs/design/santuario3-iniciacion.md §4). */
  readonly posts?: readonly number[];
}

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Why a level-3 state cannot be resumed, or undefined when it can. */
export function checkAerialState(s: unknown): string | undefined {
  if (!isRecord(s)) return "sin estado";
  if (!num(s.boardDays) || s.boardDays < 0) return "sin día";
  const a = s.at;
  if (!isRecord(a) || !num(a.x) || !num(a.y) || !num(a.z) || !AERIAL_ISLANDS.includes(a.island as AerialIsland)) return "sin el sitio de Doménica";
  if (s.settings !== undefined && !isRecord(s.settings)) return "ajustes ilegibles";
  if (s.posts !== undefined && !(Array.isArray(s.posts) && s.posts.every((n) => Number.isInteger(n) && n >= 1 && n <= 13))) return "puestos ilegibles";
  return undefined;
}

/** The island's name in the saved games list. */
export const ISLAND_NAME: Readonly<Record<AerialIsland, string>> = {
  entrenamiento: "Isla de entrenamiento",
  lanzadera: "Lanzadera",
  parque: "Parque energético",
  muelle: "Muelle aéreo",
  plataforma: "Plataforma de tripulación",
  glaciar: "Glaciar",
};
