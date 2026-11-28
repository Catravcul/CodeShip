import { WORKDAY, activityAt, hash01, type Activity } from "./motion";

/**
 * Doménica's workday (docs/design/misiones-y-jornada.md §3; Berón 2026-11-18): Cold Sanctuary's timetable
 * (`WorkdayDirector`) gives each block its kind; the roster gives her one mission per block, different each day.
 * During the workday only the block's mission can be done, the rest show their lock and when they come; in the
 * free hours (16–22) every mission is open; at night everything waits for the morning.
 */
export interface MissionRef {
  readonly id: string;
  readonly category: string;
  readonly training?: boolean;
}

/** Where each block starts, and its kind. */
const BLOCKS = WORKDAY.filter(([, a]) => a !== "dormir" && a !== "libre");

/** The mission of each block of `day` (block start hour → mission id), deterministic by day. */
export function rosterOf(day: number, missions: readonly MissionRef[]): ReadonlyMap<number, string> {
  const out = new Map<number, string>();
  const eat = missions.find((m) => m.category === "Comer");
  const train = missions.filter((m) => m.training);
  const work = missions.filter((m) => !m.training && m.category !== "Comer");
  const used = new Set<string>();
  BLOCKS.forEach(([from, act], k) => {
    const pool = act === "entrenamiento" ? train : act === "tareas" ? work : [];
    if (act === "desayuno" || act === "comida") {
      if (eat) out.set(from, eat.id);
      return;
    }
    if (!pool.length) return;
    let i = Math.floor(hash01(day + 1, k + 17) * pool.length);
    for (let n = 0; n < pool.length && used.has(pool[i]!.id); n++) i = (i + 1) % pool.length;
    used.add(pool[i]!.id);
    out.set(from, pool[i]!.id);
  });
  return out;
}

export type MissionState = { readonly open: true; readonly now: boolean } | { readonly open: false; readonly why: string };

const hhmm = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

/** The block start of `hour` (the last WORKDAY start at or before it). */
export function blockStart(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  let s = 0;
  for (const [from] of WORKDAY) if (h >= from) s = from;
  return s;
}

/** Can she do mission `id` now? (open, and whether it is the block's own), else why not. */
export function missionState(id: string, day: number, hour: number, missions: readonly MissionRef[], done: ReadonlySet<string> = new Set()): MissionState {
  const act: Activity = activityAt(hour);
  if (done.has(id) && act !== "libre") return { open: false, why: "Hecha hoy" };
  if (act === "libre") return { open: true, now: false };
  if (act === "dormir") return { open: false, why: `Es hora de dormir: la jornada empieza a las ${hhmm(BLOCKS[0]![0])}` };
  const roster = rosterOf(day, missions);
  const start = blockStart(hour);
  if (roster.get(start) === id) return { open: true, now: true };
  const later = [...roster].find(([from, m]) => m === id && from > start);
  if (later) return { open: false, why: `Te toca a las ${hhmm(later[0])}` };
  return { open: false, why: "Hoy no te toca: libre desde las 16:00" };
}
