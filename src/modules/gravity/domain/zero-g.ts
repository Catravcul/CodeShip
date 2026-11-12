import { Vec3 } from "@core/math/vec3";

/**
 * Game tuning for moving about by hand in microgravity (the mothership's hub and spine, the station).
 * Values chosen to feel like the slow push-and-glide along handrails seen on the ISS.
 */
export const FLOAT_TUNING = {
  /** Push from the handrails, m/s². */
  push: 0.9,
  /** The most she lets herself drift, m/s. */
  maxSpeed: 1.6,
  /** Holding the rails lightly: drift fades by this fraction per second without input. */
  damping: 0.35,
} as const;

export interface FloatState {
  readonly position: Vec3;
  readonly velocity: Vec3;
}

export interface FloatOptions {
  /** On hitting a wall: bounce back off it (default) or slide along it. */
  readonly collide?: "bounce" | "slide";
  readonly maxSpeed?: number;
  readonly damping?: number;
}

/**
 * One step of floating: `input` is the push of her hands (m/s², zero when she lets go, then the drift
 * fades), `extra` any other apparent acceleration (centrifugal and Coriolis in a spinning hub).
 * `fits` says whether her body centre may be at a point.
 */
export function floatStep(s: FloatState, input: Vec3, extra: Vec3, dt: number, fits: (p: Vec3) => boolean, o: FloatOptions = {}): FloatState {
  const maxSpeed = o.maxSpeed ?? FLOAT_TUNING.maxSpeed;
  let v = s.velocity;
  if (input.length() === 0) v = v.scale(Math.exp(-(o.damping ?? FLOAT_TUNING.damping) * dt));
  v = v.add(input.add(extra).scale(dt));
  const speed = v.length();
  if (speed > maxSpeed) v = v.scale(maxSpeed / speed);
  const p = s.position.add(v.scale(dt));
  if (fits(p)) return { position: p, velocity: v };
  if (o.collide !== "slide") return { position: s.position, velocity: v.scale(-0.3) };
  // Slide: keep the axes that still fit, stop the ones that hit a wall.
  let q = s.position;
  const keep = { x: 0, y: 0, z: 0 };
  for (const axis of ["x", "y", "z"] as const) {
    const step = new Vec3(axis === "x" ? v.x * dt : 0, axis === "y" ? v.y * dt : 0, axis === "z" ? v.z * dt : 0);
    const next = q.add(step);
    if (fits(next)) {
      q = next;
      keep[axis] = v[axis];
    }
  }
  return { position: q, velocity: new Vec3(keep.x, keep.y, keep.z) };
}
