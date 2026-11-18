/**
 * The trainers' day (Cold Sanctuary's WorkRoster, the working day since 2026-11-05): training 8–9 and 14–15, tasks
 * 9–11, 12–14 and 15–16, lunch 11–12, free from 16 (and at night). In sanctuary 3 a trainer's task is her post: the
 * one on shift at a post gives its challenge. With nobody on shift (training, lunch, free time) the initiation
 * pauses there until the next shift (Berón's default, 2026-11-18: no stand-in), and each trainer sets off early
 * enough to be at her next place when it starts (`leaveFor`). Pure: the scene, the tests and the journeys share it.
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

/** Who gives post `post`'s challenge at hour `h`: the trainer on shift there, if any (else the post pauses). */
export function trainerFor<T extends { readonly id: string; readonly shift: Shift }>(people: readonly T[], post: number, h: number): string | undefined {
  return people.find((p) => {
    const w = whereAt(p.shift, h);
    return w.kind === "puesto" && w.post === post;
  })?.id;
}

/** The hours at which the day's parts change (training, tasks, lunch, tasks, training, tasks, free). */
const CHANGES = [8, 9, 11, 12, 14, 15, 16] as const;

/** The next change of the day after hour `h` (board hours, possibly past 24 for tomorrow's). */
export function nextChange(h: number): number {
  const x = ((h % 24) + 24) % 24;
  const base = h - x;
  const c = CHANGES.find((t) => t > x + 1e-9);
  return base + (c ?? 24 + CHANGES[0]);
}

/** When the next shift at post `post` starts after hour `h`, and who has it (none in the next day: undefined). */
export function nextShift<T extends { readonly id: string; readonly shift: Shift }>(people: readonly T[], post: number, h: number): { readonly at: number; readonly id: string } | undefined {
  let t = h;
  for (let i = 0; i < 16; i++) {
    t = nextChange(t);
    const id = trainerFor(people, post, t + 1e-6);
    if (id) return { at: t, id };
  }
  return undefined;
}

/**
 * Where a trainer heads at hour `h`: to where her shift puts her now, or already to her next place when the walk
 * there (`walkH(next)`, board hours) would not fit in the time left. Once there (`at` says where she is), she stays.
 * A post shift comes first: she skips lunch, training or free time when going there and on to her next post
 * (`walkH(post, from)`) would not fit before that shift starts, and heads (in time) for that post instead; and she
 * leaves a post shift at most `POST_LEAVE_EARLY_H` early. She never
 * walks faster: the walks are measured on the paths at walking pace on the board clock.
 */
export function leaveFor(shift: Shift, h: number, at: Whereabouts | undefined, walkH: (to: Whereabouts, from?: Whereabouts) => number): Whereabouts {
  const now = whereAt(shift, h);
  const t1 = nextChange(h);
  const next = whereAt(shift, t1 + 1e-6);
  if (same(next, now)) return now;
  if (at && same(at, next)) return next;
  if (next.kind !== "puesto") {
    const t2 = nextChange(t1 + 1e-6);
    const after = whereAt(shift, t2 + 1e-6);
    if (after.kind === "puesto" && h + walkH(next) + walkH(after, next) > t2) {
      if (at && same(at, after)) return after;
      return t2 - h <= walkH(after) ? after : now;
    }
  }
  // From her post she leaves at most a quarter of an hour early: a longer walk makes her late for lunch, not the post.
  const early = now.kind === "puesto" ? Math.min(walkH(next), POST_LEAVE_EARLY_H) : walkH(next);
  return t1 - h <= early ? next : now;
}

/** How early (board hours) she may leave a post shift for lunch, training or free time. */
export const POST_LEAVE_EARLY_H = 0.25;

const same = (a: Whereabouts, b: Whereabouts) => a.kind === b.kind && (a.kind !== "puesto" || (b.kind === "puesto" && a.post === b.post));

/** The board hour from the board days played: a new game starts at 9:00, when the first block of tasks begins. */
export const START_HOUR = 9;
export const boardHour = (days: number): number => (((START_HOUR + days * 24) % 24) + 24) % 24;

/** «9:05». */
export const clockText = (h: number): string => {
  const m = Math.floor((((h % 24) + 24) % 24) * 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};
