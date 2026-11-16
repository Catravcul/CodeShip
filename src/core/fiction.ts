/**
 * The development switch for what is not real (docs/pendientes.md, Berón 2026-11-16: «empezamos de cero
 * con naves y procesos reales; todo lo demás queda como tareas por hacer»). Off by default: the fiction
 * and the backlog are not wired into the game. `?ficcion` in the URL turns it on for development; the
 * code stays, nothing is deleted.
 */
export const FICTION = { on: false };

/** Read the switch from a URL's query (main.ts calls it once at start). */
export function readFictionSwitch(search: string): boolean {
  FICTION.on = new URLSearchParams(search).has("ficcion");
  return FICTION.on;
}

/**
 * What a piece of data is (brief of the real rebuild): real (flown or flying), in development (funded
 * programme with a date), licence (studied or tested, not built at this scale) or fiction.
 */
export type Reality = "real" | "en-desarrollo" | "licencia" | "ficcion";

export const REALITY_NAME: Readonly<Record<Reality, string>> = { real: "real", "en-desarrollo": "en desarrollo", licencia: "licencia", ficcion: "ficción" };
