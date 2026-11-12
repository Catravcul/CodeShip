/**
 * Heat rejection and radiation shadow of the mothership's power system. Pure geometry and the
 * Stefan–Boltzmann law: the data (emissivity, sink, area) comes from data/mothership.ts.
 */

/** Stefan–Boltzmann constant, W m⁻² K⁻⁴ (CODATA 2018). */
export const STEFAN_BOLTZMANN = 5.670374419e-8;

/** Radiating area needed to reject `heatW` at a mean surface temperature `tK`, m². */
export function radiatingAreaM2(heatW: number, tK: number, emissivity: number, sinkK = 0): number {
  return heatW / (emissivity * STEFAN_BOLTZMANN * (tK ** 4 - sinkK ** 4));
}

/** Mean surface temperature a radiator of `areaM2` (radiating area) runs at to reject `heatW`, K. */
export function radiatorTemperatureK(heatW: number, areaM2: number, emissivity: number, sinkK = 0): number {
  return (heatW / (emissivity * STEFAN_BOLTZMANN * areaM2) + sinkK ** 4) ** 0.25;
}

/**
 * One radiator wing seen from above: a trapezoid along the spine from `fromZ` to `toZ`, its inner
 * edge at `innerX`, `spanM` wide at the forward end (fromZ) and `spanAftM` at the aft end (toZ),
 * narrower toward the reactor so it stays in the shield's shadow.
 */
export interface RadiatorWing {
  readonly fromZ: number;
  readonly toZ: number;
  readonly innerX: number;
  readonly spanM: number;
  readonly spanAftM: number;
}

/** Planform area of one wing (one face), m². */
export function wingPlanformM2(w: RadiatorWing): number {
  return ((w.spanM + w.spanAftM) / 2) * (w.toZ - w.fromZ);
}

/** Forward span that gives a wing `planformM2` with the given length and aft span. */
export function forwardSpanFor(planformM2: number, lengthM: number, spanAftM: number): number {
  return (2 * planformM2) / lengthM - spanAftM;
}

/** The four corners of a wing on the +x side (mirror x for the other), body frame. */
export function wingCorners(w: RadiatorWing, side: 1 | -1 = 1): { x: number; y: number; z: number }[] {
  return [
    { x: side * w.innerX, y: 0, z: w.fromZ },
    { x: side * (w.innerX + w.spanM), y: 0, z: w.fromZ },
    { x: side * (w.innerX + w.spanAftM), y: 0, z: w.toZ },
    { x: side * w.innerX, y: 0, z: w.toZ },
  ];
}

/**
 * Shadow shield: a cone with its apex at the reactor (at `reactorZ` on the spine axis) opening
 * forward (−z) with `halfAngleDeg`. Everything that must be protected (crew, rings, radiators,
 * thruster electronics) has to sit inside it. Point source: a game simplification.
 */
export interface ShadowCone {
  readonly reactorZ: number;
  readonly halfAngleDeg: number;
}

/** Radius of the shadow at body z (0 behind the reactor). */
export function shadowRadiusAt(c: ShadowCone, z: number): number {
  const d = c.reactorZ - z;
  return d > 0 ? d * Math.tan((c.halfAngleDeg * Math.PI) / 180) : 0;
}

/** Whether a body-frame point is inside the shield's shadow. */
export function inShadow(c: ShadowCone, p: { x: number; y: number; z: number }): boolean {
  return Math.hypot(p.x, p.y) < shadowRadiusAt(c, p.z);
}
