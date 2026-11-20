import type { TaskTravel } from "@modules/settings/domain/settings";

/**
 * Each carpet station's own «viaje o teletransporte» (Berón 2026-11-20: «las estaciones de alfombras guardan su propia
 * configuración sobre teletransporte/viaje»), kept in localStorage by station id. A station never set flies (viaje).
 */
const KEY = "codeship.alfombras";

function read(): Record<string, TaskTravel> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(v).filter((e): e is [string, TaskTravel] => e[1] === "viaje" || e[1] === "teletransporte"));
  } catch {
    return {};
  }
}

export const carpetTravel = {
  get(station: string): TaskTravel {
    return read()[station] ?? "viaje";
  },
  set(station: string, v: TaskTravel): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...read(), [station]: v }));
    } catch {
      /* private mode: not kept */
    }
  },
};
