import { GRAVITY_MS2, JUMP_V0_MS, jumpHeight } from "./climb";

/**
 * Running and jumping at full effort (Berón 2026-11-19: «correr y saltar no son muy notorios, deben ser realizados al
 * máximo de esfuerzo»). A sprint, not a jog: an active adult flat out runs 6–7 m/s (élite women ≈ 10 m/s; Weyand et
 * al., J Appl Physiol 89:1991, 2000). A jump: the countermovement (a quick crouch with the arms swung back), the
 * take-off with the arms thrown up, the knees tucked at the top, and the landing absorbed on bent legs.
 */
export const SPRINT_MS = 6.5;
/** Swimming hard (Correr in the water): a hard crawl, about 3 m/s (the figure sanctuary 1 has used since its sprint). */
export const SWIM_SPRINT_MS = 3.0;
/** The countermovement before a standing jump, s (≈ 0,2–0,3 s in a CMJ). */
export const CROUCH_S = 0.22;
/** A running take-off: the last stride is the countermovement. */
const CROUCH_RUNNING_S = 0.04;
/** Absorbing the landing on bent legs, s. */
export const LAND_S = 0.2;

export type JumpStage = "agacharse" | "impulso" | "recoger" | "bajar" | "amortiguar";

/** Where a jump is `t` s after pressing Saltar: its stage, the height of her feet over the floor, and whether it ended. */
export function jumpAt(t: number, running: boolean): { stage: JumpStage; height: number; done: boolean } {
  const crouch = running ? CROUCH_RUNNING_S : CROUCH_S;
  const flight = (2 * JUMP_V0_MS) / GRAVITY_MS2;
  if (t < crouch) return { stage: "agacharse", height: 0, done: false };
  const f = t - crouch;
  if (f < flight) {
    const k = f / flight;
    return { stage: k < 0.3 ? "impulso" : k < 0.75 ? "recoger" : "bajar", height: jumpHeight(JUMP_V0_MS, f), done: false };
  }
  return { stage: "amortiguar", height: 0, done: f >= flight + LAND_S };
}
