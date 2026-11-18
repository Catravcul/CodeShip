/**
 * The trainers' day (Cold Sanctuary's WorkRoster, the working day since 2026-11-05): training 8–9 and 14–15, tasks
 * 9–11, 12–14 and 15–16, lunch 11–12, free from 16 (and at night). In sanctuary 3 a trainer's task is her post: the
 * one on shift at a post gives its challenge; with nobody on shift there, the Magnate does (Cold Sanctuary: «la
 * Magnate, si no hay nadie libre»). Pure: the scene, the tests and the journeys share it.
 */
export type DayPart = "entrenamiento" | "tareas" | "comida" | "libre";

/** What part of the working day hour `h` (0–24, board time) is. */
export function dayPart(h: number): DayPart {
  const x = ((h % 24) + 24) % 24;
  if ((x >= 8 && x < 9) || (x >= 14 && x < 15)) return "entrenamiento";
  if ((x >= 9 && x < 11) || (x >= 12 && x < 14) || (x >= 15 && x < 16)) return "tareas";
  if (x >= 11 && x < 12) return "comida";
  return "libre";
}

/** Which block of tasks: the morning (9–11 and 15–16) or the middle of the day (12–14). */
export type TaskBlock = "manana" | "mediodia";
export const taskBlock = (h: number): TaskBlock | undefined => {
  const x = ((h % 24) + 24) % 24;
  return dayPart(x) !== "tareas" ? undefined : x >= 12 && x < 14 ? "mediodia" : "manana";
};

export interface Shift {
  /** Her post in each task block (a post number of the initiation), if any. */
  readonly manana?: number;
  readonly mediodia?: number;
}

/** Where a trainer is at hour `h`: at a post, at the gym (training), or at the crossroads (lunch, free time). */
export type Whereabouts = { readonly kind: "puesto"; readonly post: number } | { readonly kind: "gimnasio" } | { readonly kind: "cruce" };

export function whereAt(shift: Shift, h: number): Whereabouts {
  const part = dayPart(h);
  if (part === "entrenamiento") return { kind: "gimnasio" };
  const block = taskBlock(h);
  const post = block && shift[block];
  return post ? { kind: "puesto", post } : { kind: "cruce" };
}

/** Who gives post `post`'s challenge at hour `h`: the trainer on shift there, or the fallback (the Magnate). */
export function trainerFor<T extends { readonly id: string; readonly shift: Shift }>(people: readonly T[], post: number, h: number, fallback: string): string {
  const on = people.find((p) => {
    const w = whereAt(p.shift, h);
    return w.kind === "puesto" && w.post === post;
  });
  return on?.id ?? fallback;
}

/** The board hour from the board days played: a new game starts at 9:00, when the first block of tasks begins. */
export const START_HOUR = 9;
export const boardHour = (days: number): number => (((START_HOUR + days * 24) % 24) + 24) % 24;

/** «9:05». */
export const clockText = (h: number): string => {
  const m = Math.floor((((h % 24) + 24) % 24) * 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};
