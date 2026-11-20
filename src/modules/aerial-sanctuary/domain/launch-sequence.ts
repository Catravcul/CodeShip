/**
 * Her own launch, the last post of the initiation (docs/design/santuario3-lanzamiento.md; post 13): the steps of a
 * Crew Dragon crew's day in their order, each a challenge, and what each asks before it. Pure.
 *
 * - «traje»: the suit-up at the crew building (post 13's machine, with its trainer); only once posts 1–12 are passed.
 * - she flies to the crew pad (by hand or by program, like any flight: not a step of its own here);
 * - «torre»: up the tower, across the crew access arm and the white room, into Dragon, the hatch closed;
 * - «cuenta-atras»: the arm away, the escape system armed, the propellant loaded, liftoff;
 * - «ascenso»: Max-Q, the stages parting, orbit, Dragon on its own;
 * - «acople»: the rendezvous with the Starship in low orbit and the docking, by hand or by challenge;
 * - then the Starship's trip to Bennu (level 6).
 */
export type LaunchStep = "traje" | "torre" | "cuenta-atras" | "ascenso" | "acople";

export const LAUNCH_STEPS: readonly LaunchStep[] = ["traje", "torre", "cuenta-atras", "ascenso", "acople"];

/** The posts that must be passed before the suit-up: every other post of the initiation. */
export const BEFORE_LAUNCH: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** The posts still to pass before she may suit up (none: she may). */
export function missingBeforeLaunch(passed: ReadonlySet<number>): number[] {
  return BEFORE_LAUNCH.filter((p) => !passed.has(p));
}

/** The next step of her launch day after those done (undefined: she is docked; the trip to Bennu follows). */
export function nextLaunchStep(done: ReadonlySet<LaunchStep>): LaunchStep | undefined {
  return LAUNCH_STEPS.find((s) => !done.has(s));
}

/** Whether `step` can be started now: every step before it is done, and it is not done yet. */
export function canStart(step: LaunchStep, done: ReadonlySet<LaunchStep>): boolean {
  return nextLaunchStep(done) === step;
}

/** «T−2 h 35 min», «T+8 min 49 s», «T−0»: a moment from liftoff, as the countdown says it. */
export function tClock(s: number): string {
  const sign = s < 0 ? "−" : "+";
  let a = Math.abs(Math.round(s));
  if (a === 0) return "T−0";
  const hh = Math.floor(a / 3600);
  a -= hh * 3600;
  const mm = Math.floor(a / 60);
  const ss = a - mm * 60;
  const parts = [hh ? `${hh} h` : "", mm ? `${mm} min` : "", ss ? `${ss} s` : ""].filter(Boolean);
  return `T${sign}${parts.join(" ")}`;
}
