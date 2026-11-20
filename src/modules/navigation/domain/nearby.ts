import type { Vec3 } from "@core/math/vec3";
import { targetDistance, type NavTarget } from "./nav-target";

/**
 * Which destinations a small craft may fly to by itself (Berón, 2026-11-17: «solo los destinos cercanos; los
 * viajes largos los hace la nodriza»). Real basis: neither the Apollo LM nor Juventas makes a cruise of its own.
 * Juventas works within the system Hera brought it to (its link to Hera reaches < 60 km) and the LM only
 * flew between its mother ship and the surface below it. In the game that is the mothership's neighbourhood:
 * the body she is parked at (her parking distance plus the hand-over height, the compressed zone's scale),
 * the structures there and the mothership herself. Anything farther is a mothership trip, from her bridge.
 */
export interface Neighbourhood {
  /** Where the mothership is now, world frame, m. */
  readonly carrier: Vec3;
  /** Reach round her, m: her parking distance plus the hand-over height. */
  readonly radiusM: number;
}

export type NearbyVerdict = { readonly ok: true } | { readonly ok: false; readonly why: string };

/** Whether `t` is within the mothership's neighbourhood (a destination for the lander or the probe on its own). */
export function nearby(t: NavTarget, n: Neighbourhood): NearbyVerdict {
  const d = targetDistance(t, n.carrier);
  if (d <= n.radiusM) return { ok: true };
  return { ok: false, why: `Lejos (${(d / 1000).toFixed(1).replace(".", ",")} km de la nodriza): ese viaje lo hace la nodriza desde su puente` };
}

/** The destinations of the neighbourhood, nearest to the carrier first. */
export function nearbyTargets(targets: readonly NavTarget[], n: Neighbourhood): NavTarget[] {
  return targets.filter((t) => nearby(t, n).ok).sort((a, b) => targetDistance(a, n.carrier) - targetDistance(b, n.carrier));
}

/** Whether a small craft can be sent to a destination from the navigation window, and if not why (shown locked). */
export type Reach = { readonly ok: boolean; readonly why?: string };

/**
 * The navigation window opened from the LM's commander seat or the probe's station (Berón, 2026-11-18): every
 * destination is listed, those out of the craft's reach locked with the reason. Its reach: the probe only goes to
 * asteroids (it works on and over them); both only within the mothership's neighbourhood; then whatever the craft
 * itself cannot do now (`can`: its Δv, its port, a trip already flying).
 */
export function craftReach(t: NavTarget, craft: "lander" | "probe", n: Neighbourhood, can: (t: NavTarget) => { ok: boolean; reason?: string }): Reach {
  if (craft === "probe" && t.kind !== "asteroid") return { ok: false, why: "La sonda solo va a asteroides: se posa en ellos" };
  const near = nearby(t, n);
  if (!near.ok) return { ok: false, why: near.why };
  const c = can(t);
  return c.ok ? { ok: true } : { ok: false, why: c.reason ?? "No puede ir ahora" };
}
