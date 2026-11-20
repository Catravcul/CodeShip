import type { FloorPoint } from "@modules/lander-cabin/domain/cabin";
import { HOP, hopSpeed } from "./hops";

/** One hop across a small 0 g room (Starship's flight deck): from one handhold to the next. */
export interface RoomHop {
  readonly from: FloorPoint;
  readonly to: FloorPoint;
  readonly lengthM: number;
}

/**
 * The hops along a route through a small room (docs/design/ingravidez.md, reglas.md: no area has gravity):
 * each leg is cut into equal hops no longer than {@link HOP.preferM}, from handhold to handhold, as crews move in
 * the ISS (a push, a glide and a catch; NASA-STD-3000 §8.9.2). `path` is the points after `from`.
 */
export function roomHops(from: FloorPoint, path: readonly FloorPoint[]): RoomHop[] {
  const out: RoomHop[] = [];
  let at = from;
  for (const p of path) {
    const len = Math.hypot(p.x - at.x, p.z - at.z);
    if (len < 0.05) {
      at = p;
      continue;
    }
    const n = Math.max(1, Math.ceil(len / HOP.preferM - 1e-9));
    for (let i = 1; i <= n; i++) {
      const to = { x: at.x + ((p.x - at.x) * i) / n, z: at.z + ((p.z - at.z) * i) / n };
      const f = out.length ? out[out.length - 1]!.to : at;
      out.push({ from: f, to, lengthM: len / n });
    }
    at = p;
  }
  return out;
}

/** Seconds of one hop: push, glide and catch at the hop's speed (as gravity/domain/hops.ts `hopSeconds`). */
export function roomHopSeconds(lengthM: number, first: boolean): number {
  const v = hopSpeed(lengthM);
  const k = Math.min(1, lengthM / (HOP.pushM + HOP.catchM));
  const push = HOP.pushM * k;
  const ctch = HOP.catchM * k;
  return (first ? HOP.aimS : 0) + (2 * push) / v + Math.max(0, lengthM - push - ctch) / v + (2 * ctch) / v;
}

/** Seconds of a chain of hops (the aim only before the first). */
export function roomHopsSeconds(hops: readonly RoomHop[]): number {
  return hops.reduce((s, h, i) => s + roomHopSeconds(h.lengthM, i === 0), 0);
}

/**
 * Where she is `t` seconds into a hop, and what her body does: «push» off the handhold, «glide», «catch» the next.
 * Speeds up over the push stroke, glides at the hop's speed and slows over the catch (the same profile as the station's).
 */
export function roomHopAt(h: RoomHop, t: number, first: boolean): { at: FloorPoint; phase: "aim" | "push" | "glide" | "catch"; done: boolean } {
  const aim = first ? HOP.aimS : 0;
  if (t < aim) return { at: h.from, phase: "aim", done: false };
  const v = hopSpeed(h.lengthM);
  const k = Math.min(1, h.lengthM / (HOP.pushM + HOP.catchM));
  const push = HOP.pushM * k;
  const ctch = HOP.catchM * k;
  const tp = (2 * push) / v;
  const tg = Math.max(0, h.lengthM - push - ctch) / v;
  const tc = (2 * ctch) / v;
  const s = t - aim;
  let d: number;
  let phase: "push" | "glide" | "catch";
  if (s < tp) {
    // From rest to v over the push stroke: d = v t² / (2 tp).
    d = (v * s * s) / (2 * tp);
    phase = "push";
  } else if (s < tp + tg) {
    d = push + v * (s - tp);
    phase = "glide";
  } else {
    const u = Math.min(tc, s - tp - tg);
    d = push + v * tg + v * u - (v * u * u) / (2 * tc);
    phase = "catch";
  }
  const f = Math.min(1, d / Math.max(1e-9, h.lengthM));
  const done = s >= tp + tg + tc;
  return { at: { x: h.from.x + (h.to.x - h.from.x) * f, z: h.from.z + (h.to.z - h.from.z) * f }, phase, done };
}
