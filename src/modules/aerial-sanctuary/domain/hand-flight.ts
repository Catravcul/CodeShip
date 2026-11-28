import type { Floor, Solid } from "./walk";
import type { Craft, IslandPad } from "./travel";

/**
 * Flying the island craft by hand (reglas.md §3.6, «Manual»; Berón, 2026-11-18): a helicopter's real controls on the
 * shared tap pad (ui/rcs-pad.ts). The cyclic tilts the rotor disc, so the craft speeds up the way it leans (forward,
 * back, sideways); the collective changes the pitch of every blade at once, so it climbs or sinks; the pedals change
 * the tail rotor's thrust, so the nose turns. Each tap is one step of what the control asks for, and the craft gets
 * there with a lag, as a real one does (it is heavy). The carpet mirrors it with its own limits.
 *
 * Nothing goes through anything (§4.2): the rotor's disc stops against walls, trees and towers; over the sea it holds
 * a hover (no ditching), and it sets down on a deck only slowly; on an island's pad that the craft is allowed on, the
 * flight is over. Pure: the scene and the tests share it.
 */
export type HandControl = "ciclico-adelante" | "ciclico-atras" | "ciclico-izquierda" | "ciclico-derecha" | "colectivo-arriba" | "colectivo-abajo" | "pedal-izquierdo" | "pedal-derecho";

export interface HandLimits {
  /** Fastest forward (the cruise), backwards and sideways, m/s. */
  readonly fwdMs: number;
  readonly backMs: number;
  readonly sideMs: number;
  /** Fastest climb and sink, m/s. */
  readonly climbMs: number;
  /** Fastest turn, °/s. */
  readonly yawDegS: number;
  /** What one tap asks for more. */
  readonly fwdStepMs: number;
  readonly climbStepMs: number;
  readonly yawStepDegS: number;
  /** How long the craft takes to get to what is asked (a first-order lag), s. */
  readonly lagS: number;
  /** The rotor's radius (or the carpet's half length): its reach for walls, m. */
  readonly radiusM: number;
  /** How far up its body goes over its skids, m. */
  readonly heightM: number;
  /**
   * A helicopter's rotor disc is the top of it: the disc reaches `radiusM` only in its top `rotorDiscM` metres, and
   * below it only the fuselage, `bodyRadiusM` round the mast (a low pump beside the deck passes under the blades).
   * Without them (the carpet) its whole height reaches `radiusM`.
   */
  readonly rotorDiscM?: number;
  readonly bodyRadiusM?: number;
  /** Touching down only slower than this, down and across, m/s. */
  readonly touchdownMs: number;
  /** How close to a pad's centre it has to set down, m. */
  readonly padRadiusM: number;
  /** The lowest hover over the sea, m above it. */
  readonly seaHoverM: number;
}

export interface HandState {
  readonly craft: Craft;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Where the nose points, rad: forward is (sin h, cos h) on the plan (as `legPose`). */
  readonly heading: number;
  /** Speeds now, m/s (forward, to the right, up) and the turn, rad/s (positive to the left). */
  readonly vFwd: number;
  readonly vSide: number;
  readonly vUp: number;
  readonly yawRate: number;
  /** What the controls ask for (in steps of the limits), kept until changed. */
  readonly ask: { readonly fwd: number; readonly side: number; readonly up: number; readonly yaw: number };
  /** On a deck. */
  readonly onGround: boolean;
  /** On the pad of this island (the flight can end). */
  readonly landedOn?: string;
  /** What just stopped it, if anything («rotor», «mar», «dura»). */
  readonly bump?: "rotor" | "mar" | "dura";
}

const RAD = Math.PI / 180;

/** On a pad at rest: the start of a hand flight. */
export function handStart(craft: Craft, pad: IslandPad, heading: number): HandState {
  return { craft, x: pad.at.x, y: pad.at.y, z: pad.at.z, heading, vFwd: 0, vSide: 0, vUp: 0, yawRate: 0, ask: { fwd: 0, side: 0, up: 0, yaw: 0 }, onGround: true, landedOn: pad.island };
}

const clampSteps = (n: number, max: number, step: number) => Math.max(-Math.round(max / step), Math.min(Math.round(max / step), n));

/** One tap of a control: what it asks for changes by a step, within the craft's limits. */
export function handTap(s: HandState, c: HandControl, lim: HandLimits): HandState {
  const a = { ...s.ask };
  const fwdMax = Math.round(lim.fwdMs / lim.fwdStepMs);
  const backMax = Math.round(lim.backMs / lim.fwdStepMs);
  switch (c) {
    case "ciclico-adelante":
      a.fwd = Math.min(fwdMax, a.fwd + 1);
      break;
    case "ciclico-atras":
      a.fwd = Math.max(-backMax, a.fwd - 1);
      break;
    case "ciclico-izquierda":
      a.side = clampSteps(a.side - 1, lim.sideMs, lim.fwdStepMs);
      break;
    case "ciclico-derecha":
      a.side = clampSteps(a.side + 1, lim.sideMs, lim.fwdStepMs);
      break;
    case "colectivo-arriba":
      a.up = clampSteps(a.up + 1, lim.climbMs, lim.climbStepMs);
      break;
    case "colectivo-abajo":
      a.up = clampSteps(a.up - 1, lim.climbMs, lim.climbStepMs);
      break;
    case "pedal-izquierdo":
      a.yaw = clampSteps(a.yaw + 1, lim.yawDegS, lim.yawStepDegS);
      break;
    case "pedal-derecho":
      a.yaw = clampSteps(a.yaw - 1, lim.yawDegS, lim.yawStepDegS);
      break;
  }
  const { bump: _b, ...rest } = s;
  return { ...rest, ask: a };
}

/** «Parar»: level the cyclic, the collective at hover and the pedals centred (the craft slows to a hover). */
export function handHover(s: HandState): HandState {
  const { bump: _b, ...rest } = s;
  return { ...rest, ask: { fwd: 0, side: 0, up: 0, yaw: 0 } };
}

/** What is under and around the craft. */
export interface HandWorld {
  readonly floors: readonly Floor[];
  readonly solids: readonly Solid[];
  /** The sea's surface, m. */
  readonly seaY: number;
  readonly pads: readonly IslandPad[];
}

/** The highest deck under (x, z) not above `y` + a little (a floor over her head is a ceiling, not a ground). */
export function groundUnder(w: HandWorld, x: number, z: number, y: number): number | undefined {
  let best: number | undefined;
  for (const f of w.floors) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1 && f.y <= y + 0.3 && (best === undefined || f.y > best)) best = f.y;
  return best;
}

/** Whether the craft (its disc of `radiusM`, from its skids up `heightM`) at (x, y, z) touches a solid or a deck above its skids. */
export function handHits(w: HandWorld, x: number, y: number, z: number, lim: HandLimits): boolean {
  const r = lim.radiusM;
  const touches = (q: { x0: number; x1: number; z0: number; z1: number }, reach = r) => {
    const dx = Math.max(q.x0 - x, 0, x - q.x1);
    const dz = Math.max(q.z0 - z, 0, z - q.z1);
    return dx * dx + dz * dz < reach * reach;
  };
  // The disc's underside (the whole height when it has none of its own) and the fuselage under it.
  const disc = y + lim.heightM - (lim.rotorDiscM ?? lim.heightM);
  const body = lim.bodyRadiusM ?? r;
  for (const s of w.solids) {
    if (!(s.y1 > y + 0.05 && s.y0 < y + lim.heightM)) continue;
    if (s.y1 > disc ? touches(s) : touches(s, body)) return true;
  }
  // A deck higher than the skids and lower than the rotor is a slab it would cut through.
  for (const f of w.floors) if (f.y > y + 0.6 && f.y - 0.5 < y + lim.heightM && touches(f)) return true;
  return false;
}

const toward = (v: number, target: number, dt: number, lag: number) => v + (target - v) * Math.min(1, dt / Math.max(1e-6, lag));

/** `dt` s of flight: speeds go towards what is asked, it moves unless something is in the way, and it lands or hovers. */
export function handStep(s: HandState, dt: number, w: HandWorld, lim: HandLimits): HandState {
  const want = { fwd: s.ask.fwd * lim.fwdStepMs, side: s.ask.side * lim.fwdStepMs, up: s.ask.up * lim.climbStepMs, yaw: s.ask.yaw * lim.yawStepDegS * RAD };
  // On a deck the skids hold it: only the collective lifts it off.
  if (s.onGround && want.up <= 0) return { ...s, vFwd: 0, vSide: 0, vUp: 0, yawRate: 0 };
  let vFwd = toward(s.vFwd, want.fwd, dt, lim.lagS);
  let vSide = toward(s.vSide, want.side, dt, lim.lagS);
  let vUp = toward(s.vUp, want.up, dt, lim.lagS / 2);
  const yawRate = toward(s.yawRate, want.yaw, dt, lim.lagS / 2);
  const heading = s.heading + yawRate * dt;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  // Right of the nose: forward turned a quarter clockwise seen from above.
  const rx = -fz;
  const rz = fx;
  let x = s.x + (fx * vFwd + rx * vSide) * dt;
  let z = s.z + (fz * vFwd + rz * vSide) * dt;
  let y = s.y + vUp * dt;
  let bump: HandState["bump"];
  if (handHits(w, x, y, z, lim)) {
    // Against something: it stops where it was (the rotor never cuts through).
    if (!handHits(w, s.x, y, s.z, lim)) {
      x = s.x;
      z = s.z;
    } else {
      x = s.x;
      y = s.y;
      z = s.z;
      vUp = 0;
    }
    vFwd = 0;
    vSide = 0;
    bump = "rotor";
  }
  const ground = groundUnder(w, x, z, Math.max(y, s.y));
  let onGround = false;
  let landedOn: string | undefined;
  if (ground === undefined) {
    // Over the sea: the lowest hover.
    const floor = w.seaY + lim.seaHoverM;
    if (y < floor) {
      y = floor;
      vUp = Math.max(0, vUp);
      bump = "mar";
    }
  } else if (y <= ground) {
    const across = Math.hypot(vFwd, vSide);
    if (-vUp > lim.touchdownMs || across > lim.touchdownMs) {
      // Too fast to touch down: it holds just over the deck until it slows.
      y = ground + 0.5;
      vUp = 0;
      bump = "dura";
    } else {
      y = ground;
      vUp = 0;
      vFwd = 0;
      vSide = 0;
      onGround = true;
      const pad = w.pads.find((p) => Math.hypot(p.at.x - x, p.at.z - z) <= lim.padRadiusM && Math.abs(p.at.y - ground) < 1 && p.crafts.includes(s.craft));
      if (pad) landedOn = pad.island;
    }
  }
  const { landedOn: _was, bump: _old, ...rest } = s;
  return { ...rest, x, y, z, heading, vFwd, vSide, vUp, yawRate: onGround ? 0 : yawRate, ask: onGround ? { ...s.ask, up: Math.min(0, s.ask.up), fwd: 0, side: 0 } : s.ask, onGround, ...(landedOn ? { landedOn } : {}), ...(bump ? { bump } : {}) };
}
