import { Vec3 } from "@core/math/vec3";

/**
 * The station's orbital dry dock (docs/design/dique-seco.md): an open, unpressurised truss cradle
 * the mothership slides into and is held in by arms, lit by floodlights and fed by umbilicals, as big
 * ships are serviced in every serious concept (the ISS truss and Canadarm2, space-dock frames,
 * Northrop's MEV). No pressurised hangar: the numbers for one are in `pressurisedEnclosure`.
 */

/** A big craft berthed nose-first at a port, seen from the station (station frame, metres). */
export interface BerthedCraft {
  readonly name: string;
  /** Its nose port, latched to the station's port. */
  readonly nose: Vec3;
  /** Unit vector from the nose to the tail (the station port's normal). */
  readonly axis: Vec3;
  readonly lengthM: number;
  /** Farthest any part reaches from its long axis (the rings' rims), m. */
  readonly reachM: number;
  /** Stretches along the axis (m from the nose) where something sticks out past the spine. */
  readonly bulges: readonly { readonly id: string; readonly fromM: number; readonly toM: number; readonly radiusM: number }[];
  /** Radius of the bare spine an arm can grip, m. */
  readonly spineRadiusM: number;
}

export interface Segment {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly radiusM: number;
}

/** A cradle arm: from the frame to a grapple point on the spine. */
export interface CradleArm extends Segment {
  /** Where along the craft it grips, m from the nose. */
  readonly atM: number;
}

export interface Floodlight {
  readonly at: Vec3;
  /** Unit vector it shines along (at the craft). */
  readonly aim: Vec3;
}

export interface DryDock {
  /** Half the side of the square frame, m. */
  readonly halfWidthM: number;
  /** Where the frame starts and ends along the craft, m from the nose. */
  readonly fromM: number;
  readonly toM: number;
  /** The square hoops' places along the axis, m from the nose. */
  readonly hoopsM: readonly number[];
  /** Longerons (four, at the corners) and the hoops' members. */
  readonly beams: readonly Segment[];
  readonly arms: readonly CradleArm[];
  /** Power, data and xenon lines from the frame to the craft. */
  readonly umbilicals: readonly Segment[];
  readonly lights: readonly Floodlight[];
  /** Struts that tie the frame to the station's truss. */
  readonly links: readonly Segment[];
}

/** Game values of the frame (beam sizes like the ISS truss, 4,5 m section; see the doc). */
export const DRY_DOCK_TUNING = {
  /** Gap between the craft's farthest part (the rings, spinning) and the frame, m. */
  clearanceM: 6,
  /** Beam half-section of the longerons and hoops, m (the ISS truss is about 4,5 m across). */
  beamRadiusM: 1.2,
  armRadiusM: 0.5,
  /** Frame beyond the tail, m. */
  tailMarginM: 6,
  /** A free stretch must be at least this long for a ring of arms, m. */
  minArmSpanM: 8,
} as const;

/** Stretches along the craft where nothing sticks out (arms and umbilicals may reach the spine there). */
export function freeSpans(c: BerthedCraft, fromM = 0): { fromM: number; toM: number }[] {
  const big = c.bulges.filter((b) => b.radiusM > 2 * c.spineRadiusM).sort((a, b) => a.fromM - b.fromM);
  const out: { fromM: number; toM: number }[] = [];
  let at = fromM;
  for (const b of big) {
    if (b.fromM > at) out.push({ fromM: at, toM: b.fromM });
    at = Math.max(at, b.toM);
  }
  if (c.lengthM > at) out.push({ fromM: at, toM: c.lengthM });
  return out;
}

/** Two unit vectors square to the axis (the frame's sides), `up` first. */
function sides(axis: Vec3, up: Vec3): { u: Vec3; w: Vec3 } {
  const u = up.sub(axis.scale(up.dot(axis))).normalize();
  return { u, w: axis.cross(u).normalize() };
}

/**
 * The cradle for a craft: a square frame `reachM + clearance` from its axis, from `fromM` (clear of
 * the station's other ports) to past its tail, with hoops at both ends and at every ring of arms;
 * four arms at the middle of each free stretch long enough; umbilicals at the first free stretch
 * (the nose, where the airlock and the stores are); a floodlight at each hoop corner; struts to the
 * station's truss at `anchors`.
 */
export function dryDockFor(c: BerthedCraft, o: { readonly fromM: number; readonly up: Vec3; readonly anchors: readonly Vec3[] }, t = DRY_DOCK_TUNING): DryDock {
  const { u, w } = sides(c.axis, o.up);
  const H = c.reachM + t.clearanceM + t.beamRadiusM;
  const toM = c.lengthM + t.tailMarginM;
  const along = (m: number) => c.nose.add(c.axis.scale(m));
  const spans = freeSpans(c, o.fromM).filter((s) => s.toM - s.fromM >= t.minArmSpanM);
  // The span at the nose holds the umbilicals; the others (behind the rings) the arms.
  const armAt = spans.filter((s) => s.fromM > o.fromM).map((s) => (s.fromM + s.toM) / 2);
  const hoopsM = [...new Set([o.fromM, ...armAt, toM])].sort((a, b) => a - b);
  const corners = [u.add(w), u.sub(w), u.scale(-1).sub(w), u.scale(-1).add(w)].map((k) => k.scale(H));
  const beams: Segment[] = [];
  for (const k of corners) beams.push({ from: along(o.fromM).add(k), to: along(toM).add(k), radiusM: t.beamRadiusM });
  for (const m of hoopsM) for (let i = 0; i < 4; i++) beams.push({ from: along(m).add(corners[i]!), to: along(m).add(corners[(i + 1) % 4]!), radiusM: t.beamRadiusM * 0.6 });
  const faces = [u, w, u.scale(-1), w.scale(-1)];
  const arms: CradleArm[] = armAt.flatMap((m) => faces.map((f) => ({ from: along(m).add(f.scale(H)), to: along(m).add(f.scale(craftRadiusAt(c, m) + 0.2)), radiusM: t.armRadiusM, atM: m })));
  const nose = spans[0] && spans[0].fromM <= o.fromM + 1 ? spans[0] : undefined;
  const umbAt = nose ? Math.min(nose.toM - 2, o.fromM + 4) : o.fromM;
  const umbilicals: Segment[] = [u, w.scale(-1)].map((f) => ({ from: along(o.fromM).add(f.scale(H)), to: along(umbAt).add(f.scale(craftRadiusAt(c, umbAt) + 0.3)), radiusM: 0.15 }));
  const lights: Floodlight[] = hoopsM.flatMap((m) => corners.map((k) => ({ at: along(m).add(k), aim: k.scale(-1).normalize() })));
  const top = [corners[0]!, corners[1]!].map((k) => along(o.fromM).add(k));
  const links: Segment[] = o.anchors.map((a, i) => ({ from: a, to: top[i % top.length]!, radiusM: t.beamRadiusM * 0.8 }));
  return { halfWidthM: H, fromM: o.fromM, toM, hoopsM, beams, arms, umbilicals, lights, links };
}

/** Distance from a point to the craft's long axis, and how far along it the point is (m from the nose). */
export function craftCoords(c: BerthedCraft, p: Vec3): { alongM: number; offM: number } {
  const r = p.sub(c.nose);
  const alongM = r.dot(c.axis);
  return { alongM, offM: r.sub(c.axis.scale(alongM)).length() };
}

/** Radius the craft fills at a place along it (the spine, or a bulge there). */
export function craftRadiusAt(c: BerthedCraft, alongM: number): number {
  if (alongM < 0 || alongM > c.lengthM) return 0;
  return Math.max(c.spineRadiusM, ...c.bulges.filter((b) => alongM >= b.fromM && alongM <= b.toM).map((b) => b.radiusM));
}

/** The smallest gap between a segment (sampled every metre) and the craft's hull, m (negative: it cuts it). */
export function gapToCraft(c: BerthedCraft, s: Segment, ignoreEndM = 0): number {
  const len = s.to.sub(s.from).length();
  const n = Math.max(1, Math.ceil(len));
  let gap = Infinity;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    if (len * (1 - k) < ignoreEndM) continue;
    const p = s.from.add(s.to.sub(s.from).scale(k));
    const q = craftCoords(c, p);
    // Off the craft's length the gap is to its end disc.
    const r = craftRadiusAt(c, Math.max(0, Math.min(c.lengthM, q.alongM)));
    const out = q.alongM < 0 ? -q.alongM : q.alongM > c.lengthM ? q.alongM - c.lengthM : 0;
    gap = Math.min(gap, out > 0 ? Math.hypot(out, Math.max(0, q.offM - r)) - s.radiusM : q.offM - r - s.radiusM);
  }
  return gap;
}

/** Does the frame hold the whole craft (everything that sticks out inside its square section and its length)? */
export function holdsCraft(d: DryDock, c: BerthedCraft): boolean {
  return c.reachM < d.halfWidthM - DRY_DOCK_TUNING.beamRadiusM && d.toM >= c.lengthM && d.fromM <= Math.min(...c.bulges.filter((b) => b.radiusM > 2 * c.spineRadiusM).map((b) => b.fromM));
}

/** A fabric for a pressurised enclosure: its strength, density and the design safety factor. */
export interface Fabric {
  readonly name: string;
  readonly tensileMPa: number;
  readonly densityKgM3: number;
  readonly safetyFactor: number;
}

/** What a pressurised cylinder round a craft would take: thin-wall hoop stress (σ = p·r/t), wall and air. */
export interface Enclosure {
  readonly volumeM3: number;
  readonly areaM2: number;
  readonly wallMm: number;
  readonly wallKg: number;
  readonly airKg: number;
}

/** Air density at a pressure and a cabin temperature (ideal gas, M = 0,02897 kg/mol). */
export function airDensityKgM3(kPa: number, kelvin = 295): number {
  return (kPa * 1000 * 0.02897) / (8.314 * kelvin);
}

/** A closed pressurised cylinder of radius `radiusM` and length `lengthM` at `kPa`, walled in `fabric`. */
export function pressurisedEnclosure(radiusM: number, lengthM: number, kPa: number, fabric: Fabric): Enclosure {
  const volumeM3 = Math.PI * radiusM * radiusM * lengthM;
  const areaM2 = 2 * Math.PI * radiusM * lengthM + 2 * Math.PI * radiusM * radiusM;
  const wallM = (kPa * 1000 * radiusM * fabric.safetyFactor) / (fabric.tensileMPa * 1e6);
  return { volumeM3, areaM2, wallMm: wallM * 1000, wallKg: areaM2 * wallM * fabric.densityKgM3, airKg: volumeM3 * airDensityKgM3(kPa) };
}
