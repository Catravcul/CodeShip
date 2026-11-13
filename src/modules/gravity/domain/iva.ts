import { Vec3 } from "@core/math/vec3";
import { closestOnRail, railPoint, type Handrail, type RailGraph } from "./handrails";

/**
 * Moving about inside in microgravity the way ISS crews do (docs/design/ingravidez.md): she holds a
 * handrail, pushes off it, flies in a straight line at a steady speed (no steering, no braking:
 * nothing to push against) and catches a rail at the end of the flight. Holding on, she can also go
 * hand over hand to the next rail.
 *
 * Sources (all in the doc): Skylab translation rates 0,4–0,6 m/s point to point and ~1,8 m/s in play
 * (NASA-STD-3000 §8.7.2); contact with the rails mainly at the ends of a free flight and to turn
 * (§8.9.2); Mir crew loads, median 16 N, 96 % under 60 N (Amir & Newman 2000); cabin air
 * 0,08–0,61 m/s (NASA-STD-3001 V2 6107).
 */
export const IVA = {
  /** Her mass, kg (Doménica's body in the crew module). */
  massKg: 58,
  /** Body centre off the rail she is holding (an arm's length), m. Game value. */
  holdM: 0.5,
  /** Furthest rail she reaches without letting go of where she is, m (body centre to grip). Game value, ~arm's length. */
  reachM: 0.75,
  /** Arm extension in a push and arm bend absorbing a catch, m. Game values. */
  strokeM: 0.35,
  catchM: 0.3,
  /** Hand over hand along the rails, m/s. Game value, like moving bulky equipment on Skylab (0,15–0,30 m/s). */
  handSpeed: 0.3,
  /** Push-off speeds, m/s: an ordinary push (Skylab 0,4–0,6) and a hard one. */
  glide: { suave: 0.5, fuerte: 1.0 },
  /** Landing faster than this along a wall's normal, she can no longer soak it up with her arms: she bounces. Game value. */
  catchMaxMS: 0.8,
  /** Bounce off a wall: share of the normal speed kept, and of the speed along the wall. Game values. */
  restitution: 0.3,
  wallFriction: 0.6,
  /** Drag: air density (kg/m³), drag coefficient and frontal area of a body (m²). */
  air: { rho: 1.2, cd: 1.0, areaM2: 0.5 },
  /** Slower than this with nothing in reach, she is adrift, m/s. */
  adriftMS: 0.05,
} as const;

export type PushStrength = keyof typeof IVA.glide;

/** Force on her arms to reach (or stop from) `speed` over an arm `stroke`, at constant force: F = m v² / 2s. */
export function armForceN(speed: number, strokeM: number, massKg: number = IVA.massKg): number {
  return (massKg * speed * speed) / (2 * strokeM);
}

/** Time the push takes at that constant force: t = 2s / v. */
export function pushDurationS(speed: number, strokeM: number = IVA.strokeM): number {
  return speed <= 0 ? 0 : (2 * strokeM) / speed;
}

/** Acceleration of air drag pulling her toward the air's own velocity (quadratic drag). */
export function airDragAccel(v: Vec3, air: Vec3, massKg: number = IVA.massKg): Vec3 {
  const rel = air.sub(v);
  const k = (IVA.air.rho * IVA.air.cd * IVA.air.areaM2) / (2 * massKg);
  return rel.scale(k * rel.length());
}

/** What she is doing. */
export type Motion =
  /** Holding a rail at parameter t. `hands` grows as she moves hand over hand (for the animation). */
  | { readonly kind: "sujeta"; readonly rail: string; readonly t: number; readonly hands: number }
  /** Moving her grip from one rail to another within reach. */
  | { readonly kind: "mano-a-mano"; readonly from: Vec3; readonly rail: string; readonly t: number; readonly progress: number; readonly hands: number }
  /** Pushing off (her hand still on the rail or wall) along `dir`. */
  | { readonly kind: "impulso"; readonly dir: Vec3; readonly speed: number; readonly elapsed: number; readonly target?: GlideTarget }
  /** Flying straight: no steering, no braking. */
  | { readonly kind: "planeo"; readonly target?: GlideTarget }
  /** Catching a rail: the arms bend and bring her to rest at it. */
  | { readonly kind: "agarrando"; readonly rail: string; readonly t: number; readonly start: Vec3; readonly elapsed: number; readonly duration: number }
  /** Braced against a wall with her hands (she landed on a bare wall): she can push off it again. */
  | { readonly kind: "pared"; readonly normal: Vec3 }
  /** Out of reach of everything and (almost) still: only the air moves her. */
  | { readonly kind: "deriva" };

export interface GlideTarget {
  readonly rail: string;
  readonly t: number;
  /** Distance along the flight where she passes it, m. */
  readonly along: number;
}

export interface IvaState {
  /** Body centre, m. */
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly motion: Motion;
}

export interface IvaWorld {
  readonly graph: RailGraph;
  /** Whether her body centre may be at p. */
  fits(p: Vec3): boolean;
  /** Other apparent accelerations while free (centrifugal and Coriolis in a spinning hub), m/s². */
  extra?(p: Vec3, v: Vec3): Vec3;
  /** Velocity of the cabin air at p (ventilation), m/s. */
  air?(p: Vec3): Vec3;
  /** Centres of the hatches between modules: a push roughly at one is aimed through it. */
  readonly portals?: readonly Vec3[];
}

/** Game value: a push within this angle of a hatch that her straight path would miss goes through the hatch. */
export const PORTAL_AIM_RAD = (35 * Math.PI) / 180;

/**
 * Aim assist for hatches (a game help: crew line up on the hatch with the rails around it). If the
 * straight path is blocked soon and a hatch lies within PORTAL_AIM_RAD of it with a longer path, aim at it.
 */
export function aimThroughPortal(world: IvaWorld, p: Vec3, dir: Vec3): Vec3 {
  const d = dir.normalize();
  if (!world.portals?.length) return d;
  const straight = freePath(p, d, (q) => world.fits(q), 4);
  if (straight >= 3) return d;
  let best: { d: Vec3; len: number } | undefined;
  for (const c of world.portals) {
    const to = c.sub(p);
    if (to.length() < 0.2 || to.length() > 6) continue;
    const u = to.normalize();
    if (Math.acos(Math.max(-1, Math.min(1, u.dot(d)))) > PORTAL_AIM_RAD) continue;
    const len = freePath(p, u, (q) => world.fits(q), 8);
    if (len > to.length() + 0.3 && len > straight && (!best || len > best.len)) best = { d: u, len };
  }
  return best ? best.d : d;
}

export interface IvaIntent {
  /** Push off toward this direction (any length). */
  readonly push?: { readonly dir: Vec3; readonly strength: PushStrength };
  /** While holding: hand over hand toward this direction (length 0…1). */
  readonly along?: Vec3;
  /** While flying: grab the nearest rail in reach now. */
  readonly grab?: boolean;
}

export type IvaEvent =
  | { readonly kind: "impulso"; readonly speed: number; readonly forceN: number }
  | { readonly kind: "agarra"; readonly rail: string; readonly speed: number; readonly forceN: number }
  | { readonly kind: "pared"; readonly speed: number; readonly forceN: number }
  | { readonly kind: "golpe"; readonly speed: number }
  | { readonly kind: "deriva" }
  | { readonly kind: "sin-impulso"; readonly why: "en-vuelo" | "a-la-deriva" | "contra-la-pared" };

/** Where she holds a rail: the grip point and her body centre an arm's length off the wall. */
export function holdAt(graph: RailGraph, rail: string, t: number): { grip: Vec3; body: Vec3 } {
  const r = graph.rail(rail);
  const grip = railPoint(r, t);
  return { grip, body: grip.add(r.normal.scale(IVA.holdM)) };
}

/** Start holding the nearest rail to p (coming in through a hatch), or adrift if none is near. */
export function startAt(graph: RailGraph, p: Vec3, searchM = 3): IvaState {
  const n = graph.nearest(p, searchM);
  if (!n) return { position: p, velocity: Vec3.ZERO, motion: { kind: "deriva" } };
  return { position: holdAt(graph, n.rail.id, n.t).body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: n.rail.id, t: n.t, hands: 0 } };
}

/** How far she flies from p along dir before her body meets a wall, m (max `maxM`). */
export function freePath(p: Vec3, dir: Vec3, fits: (q: Vec3) => boolean, maxM = 80, stepM = 0.05): number {
  const d = dir.normalize();
  let s = 0;
  while (s < maxM && fits(p.add(d.scale(s + stepM)))) s += stepM;
  return s;
}

/**
 * Plan a flight: where it ends (her body meets a wall) and the rail she will catch, the one in reach
 * of her path closest to its end (crew touch the rails mainly at the end of a free flight). `skip`
 * is the rail she pushes off from.
 */
export function planGlide(world: IvaWorld, p: Vec3, dir: Vec3, skip?: string, minAlongM = 0.6): { lengthM: number; target?: GlideTarget } {
  const d = dir.normalize();
  const lengthM = freePath(p, d, (q) => world.fits(q));
  let target: GlideTarget | undefined;
  let bestD = Infinity;
  for (const r of world.graph.rails) {
    if (r.id === skip) continue;
    for (let i = 0; i <= 4; i++) {
      const q = railPoint(r, i / 4);
      const along = Math.max(0, Math.min(lengthM, q.sub(p).dot(d)));
      if (along < minAlongM) continue;
      const dist = p.add(d.scale(along)).sub(q).length();
      if (dist > IVA.reachM) continue;
      // The latest along the path wins; at the same point, the closest.
      if (!target || along > target.along + 1e-6 || (Math.abs(along - target.along) <= 1e-6 && dist < bestD)) {
        target = { rail: r.id, t: i / 4, along };
        bestD = dist;
      }
    }
  }
  return target ? { lengthM, target } : { lengthM };
}

/** Whether her body touches a wall (some direction within `touchM` does not fit), and its normal. */
export function wallNormal(p: Vec3, fits: (q: Vec3) => boolean, touchM = 0.12): Vec3 | undefined {
  let n = Vec3.ZERO;
  for (const a of [Vec3.X, Vec3.Y, Vec3.Z])
    for (const s of [-1, 1]) if (!fits(p.add(a.scale(s * touchM)))) n = n.add(a.scale(-s));
  return n.length() === 0 ? undefined : n.normalize();
}

/** The grip she is pushing from: a rail (its wall's normal) or a bare wall. */
function pushNormal(world: IvaWorld, s: IvaState): Vec3 | undefined {
  const m = s.motion;
  if (m.kind === "sujeta") return world.graph.rail(m.rail).normal;
  if (m.kind === "pared") return m.normal;
  return undefined;
}

/** Catch a rail from a flight: arms bend over `catchM`, slower catches take longer. */
function catchRail(s: IvaState, rail: Handrail, t: number, events: IvaEvent[]): IvaState {
  const speed = s.velocity.length();
  const duration = Math.max(0.35, Math.min(1.5, speed > 0 ? (2 * IVA.catchM) / speed : 1));
  events.push({ kind: "agarra", rail: rail.id, speed, forceN: armForceN(speed, IVA.catchM) });
  return { ...s, motion: { kind: "agarrando", rail: rail.id, t, start: s.position, elapsed: 0, duration } };
}

/**
 * One step of moving about inside. Pushing works only with a hand on something (a rail or a wall);
 * in flight the only choices are to grab a rail within reach or wait.
 */
export function ivaStep(s: IvaState, intent: IvaIntent, world: IvaWorld, dt: number): { state: IvaState; events: IvaEvent[] } {
  const events: IvaEvent[] = [];
  const m = s.motion;
  const g = world.graph;

  // --- A push --------------------------------------------------------------------
  if (intent.push && intent.push.dir.length() > 0) {
    const n = pushNormal(world, s);
    if (!n) {
      events.push({ kind: "sin-impulso", why: m.kind === "deriva" ? "a-la-deriva" : "en-vuelo" });
    } else {
      // She cannot push into the wall she is holding on to: keep only the part along it or away from it.
      let d = intent.push.dir.normalize();
      const into = d.dot(n);
      if (into < 0) d = d.sub(n.scale(into));
      if (d.length() < 0.2) events.push({ kind: "sin-impulso", why: "contra-la-pared" });
      else {
        d = aimThroughPortal(world, s.position, d.normalize());
        const speed = IVA.glide[intent.push.strength];
        const skip = m.kind === "sujeta" ? m.rail : undefined;
        const plan = planGlide(world, s.position, d, skip);
        events.push({ kind: "impulso", speed, forceN: armForceN(speed, IVA.strokeM) });
        return { state: { position: s.position, velocity: Vec3.ZERO, motion: { kind: "impulso", dir: d, speed, elapsed: 0, ...(plan.target ? { target: plan.target } : {}) } }, events };
      }
    }
  }

  switch (m.kind) {
    case "sujeta":
      return { state: handOverHand(s, m, intent.along, world, dt), events };
    case "mano-a-mano": {
      const to = holdAt(g, m.rail, m.t);
      const dist = Math.max(0.05, to.grip.sub(m.from).length());
      const progress = Math.min(1, m.progress + (IVA.handSpeed * dt) / dist);
      const fromBody = m.from.add(g.rail(m.rail).normal.scale(IVA.holdM));
      const position = fromBody.add(to.body.sub(fromBody).scale(progress));
      const hands = m.hands + IVA.handSpeed * dt;
      if (progress >= 1) return { state: { position: to.body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: m.rail, t: m.t, hands } }, events };
      return { state: { position, velocity: Vec3.ZERO, motion: { ...m, progress, hands } }, events };
    }
    case "impulso": {
      // Constant force over the arm's stroke: a = v² / 2s.
      const a = (m.speed * m.speed) / (2 * IVA.strokeM);
      const T = pushDurationS(m.speed);
      const elapsed = Math.min(T, m.elapsed + dt);
      const v = Math.min(m.speed, a * elapsed);
      const velocity = m.dir.scale(v);
      const next = s.position.add(velocity.scale(dt));
      const position = world.fits(next) ? next : s.position;
      if (elapsed >= T) return { state: { position, velocity: m.dir.scale(m.speed), motion: { kind: "planeo", ...(m.target ? { target: m.target } : {}) } }, events };
      return { state: { position, velocity, motion: { ...m, elapsed } }, events };
    }
    case "agarrando": {
      const to = holdAt(g, m.rail, m.t);
      const elapsed = Math.min(m.duration, m.elapsed + dt);
      const k = elapsed / m.duration;
      // Ease out: she slows as her arms bend.
      const e = 1 - (1 - k) * (1 - k);
      const position = m.start.add(to.body.sub(m.start).scale(e));
      const prev = m.start.add(to.body.sub(m.start).scale(1 - (1 - m.elapsed / m.duration) ** 2));
      if (k >= 1) return { state: { position: to.body, velocity: Vec3.ZERO, motion: { kind: "sujeta", rail: m.rail, t: m.t, hands: 0 } }, events };
      return { state: { position, velocity: dt > 0 ? position.sub(prev).scale(1 / dt) : Vec3.ZERO, motion: { ...m, elapsed } }, events };
    }
    case "pared": {
      // Braced on a bare wall: she grabs a rail if one is in reach, or crawls toward one with her hands.
      const near = g.nearest(s.position, IVA.reachM);
      if (near) return { state: catchRail(s, near.rail, near.t, events), events };
      return { state: s, events };
    }
    case "planeo":
    case "deriva":
      return { state: fly(s, intent, world, dt, events), events };
  }
}

function handOverHand(s: IvaState, m: Extract<Motion, { kind: "sujeta" }>, along: Vec3 | undefined, world: IvaWorld, dt: number): IvaState {
  const g = world.graph;
  if (!along || along.length() < 0.15) return s;
  const r = g.rail(m.rail);
  const axis = r.b.sub(r.a);
  const len = axis.length();
  const u = axis.scale(1 / len);
  const want = along.normalize();
  const k = want.dot(u);
  // Slide the grip along this bar while the wish is mostly along it and there is bar left.
  const room = k > 0 ? m.t < 1 : m.t > 0;
  if (Math.abs(k) > 0.6 && room) {
    const t = Math.max(0, Math.min(1, m.t + (Math.sign(k) * IVA.handSpeed * Math.min(1, along.length()) * dt) / len));
    const body = holdAt(g, m.rail, t).body;
    if (!world.fits(body)) return s;
    return { position: body, velocity: Vec3.ZERO, motion: { ...m, t, hands: m.hands + Math.abs(t - m.t) * len } };
  }
  // Otherwise reach for the neighbouring bar that lies most that way.
  const grip = railPoint(r, m.t);
  let best: { rail: string; t: number; score: number } | undefined;
  for (const id of g.neighbours(m.rail)) {
    const c = closestOnRail(g.rail(id), grip.add(want.scale(0.4)));
    const to = c.point.sub(grip);
    if (to.length() < 1e-6) continue;
    const score = to.normalize().dot(want);
    if (score < 0.5 || !world.fits(holdAt(g, id, c.t).body)) continue;
    if (!best || score > best.score) best = { rail: id, t: c.t, score };
  }
  if (!best) return s;
  return { position: s.position, velocity: Vec3.ZERO, motion: { kind: "mano-a-mano", from: grip, rail: best.rail, t: best.t, progress: 0, hands: m.hands } };
}

function fly(s: IvaState, intent: IvaIntent, world: IvaWorld, dt: number, events: IvaEvent[]): IvaState {
  const g = world.graph;
  const m = s.motion as Extract<Motion, { kind: "planeo" | "deriva" }>;
  const target = m.kind === "planeo" ? m.target : undefined;
  // Grab: the planned rail when it comes in reach, or any rail in reach when she asks.
  if (target) {
    const r = g.rail(target.rail);
    const c = closestOnRail(r, s.position);
    if (c.distance <= IVA.reachM) return catchRail(s, r, c.t, events);
  }
  if (intent.grab || m.kind === "deriva") {
    const n = g.nearest(s.position, IVA.reachM);
    if (n) return catchRail(s, n.rail, n.t, events);
  }
  // Free flight: only the air (and, in a spinning hub, its apparent forces) changes her velocity.
  let a = world.air ? airDragAccel(s.velocity, world.air(s.position)) : Vec3.ZERO;
  if (world.extra) a = a.add(world.extra(s.position, s.velocity));
  const v = s.velocity.add(a.scale(dt));
  const next = s.position.add(v.scale(dt));
  if (world.fits(next)) {
    const slow = v.length() < IVA.adriftMS && !g.nearest(next, IVA.reachM);
    if (slow && m.kind !== "deriva") events.push({ kind: "deriva" });
    const motion: Motion = slow ? { kind: "deriva" } : m.kind === "deriva" ? { kind: "planeo" } : m;
    return { position: next, velocity: v, motion };
  }
  // She meets a wall: which axes are blocked gives the wall's normal.
  let n = Vec3.ZERO;
  for (const axis of [Vec3.X, Vec3.Y, Vec3.Z]) {
    const step = axis.scale(v.dot(axis) * dt);
    if (step.length() > 0 && !world.fits(s.position.add(step))) n = n.add(axis.scale(-Math.sign(v.dot(axis))));
  }
  if (n.length() === 0) n = v.scale(-1);
  n = n.normalize();
  const vn = -v.dot(n);
  if (vn <= IVA.catchMaxMS) {
    // Slow enough to soak up with her arms: she stops at the wall, then takes a rail if one is in reach.
    const near = g.nearest(s.position, IVA.reachM);
    if (near) return catchRail(s, near.rail, near.t, events);
    events.push({ kind: "pared", speed: vn, forceN: armForceN(vn, IVA.catchM) });
    return { position: s.position, velocity: Vec3.ZERO, motion: { kind: "pared", normal: n } };
  }
  // Too fast: a bump. She bounces off, slowed, and flies on with nothing planned.
  events.push({ kind: "golpe", speed: vn });
  const vt = v.add(n.scale(vn));
  const out = n.scale(vn * IVA.restitution).add(vt.scale(IVA.wallFriction));
  const plan = planGlide(world, s.position, out, undefined, 0.3);
  return { position: s.position, velocity: out, motion: { kind: "planeo", ...(plan.target ? { target: plan.target } : {}) } };
}
