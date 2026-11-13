import { Vec3 } from "@core/math/vec3";
import { duration, num } from "./trip-chore";

/**
 * What each correctly answered programming step adds to the plan on screen (docs/design/aterrizaje.md,
 * «Cada paso se ve»): the route, the burn, the arrival, the braking point; or the landing site, the
 * ground's drift, the descent curve, the final braking and the anchors. Pure: the 3D adapter draws
 * the items, the sheet shows the caption. Step i of a chain maps to sketch i (challenge step → visual).
 */
export type SketchTone = "plan" | "burn" | "brake" | "site" | "ok";

export type SketchItem =
  | { readonly kind: "line"; readonly points: readonly Vec3[]; readonly tone: SketchTone }
  | { readonly kind: "arrow"; readonly from: Vec3; readonly to: Vec3; readonly tone: SketchTone }
  | { readonly kind: "ring"; readonly centre: Vec3; readonly normal: Vec3; readonly radiusM: number; readonly tone: SketchTone };

export interface SketchStep {
  readonly caption: string;
  readonly items: readonly SketchItem[];
}

const km = (m: number) => (m >= 1000 ? `${num(m / 1000, 1)} km` : `${num(m)} m`);

/** The route of a hop as the trip challenges program it. */
export interface TripRoute {
  readonly from: Vec3;
  /** Detours (and the mothership's leg) before the final straight leg. */
  readonly waypoints: readonly Vec3[];
  /** Hand-over point (approach height above the body, or beside the port/bay). */
  readonly arrival: Vec3;
  /** Distance of the braking burn before the arrival, m. */
  readonly brakeM: number;
  readonly cruiseMS: number;
  readonly deltaVMS: number;
  readonly totalS: number;
  readonly targetName: string;
}

/** Five sketches for the five trip challenges: route, burn, arrival, braking point, the whole plan. */
export function tripSketch(r: TripRoute): SketchStep[] {
  const points = [r.from, ...r.waypoints, r.arrival];
  let length = 0;
  for (let i = 1; i < points.length; i++) length += points[i]!.sub(points[i - 1]!).length();
  const first = (points[1] ?? r.arrival).sub(r.from);
  const dir = first.length() > 1e-9 ? first.normalize() : Vec3.Z;
  const arrow = Math.max(20, Math.min(length * 0.15, 600));
  const last = points[points.length - 2]!;
  const legDir = r.arrival.sub(last).length() > 1e-9 ? r.arrival.sub(last).normalize() : dir;
  const brake = r.arrival.sub(legDir.scale(Math.min(r.brakeM, r.arrival.sub(last).length())));
  const ring = Math.max(10, length * 0.02);
  return [
    { caption: `✓ Ruta trazada: ${points.length - 1} ${points.length === 2 ? "tramo" : "tramos"}, ${km(length)}`, items: [{ kind: "line", points, tone: "plan" }] },
    { caption: `✓ Empuje: ${num(r.cruiseMS)} m/s hacia ${r.targetName}, Δv ${num(r.deltaVMS)} m/s`, items: [{ kind: "arrow", from: r.from, to: r.from.add(dir.scale(arrow)), tone: "burn" }] },
    { caption: `✓ Llegada en ${duration(r.totalS)}`, items: [{ kind: "ring", centre: r.arrival, normal: legDir, radiusM: ring, tone: "site" }] },
    {
      caption: `✓ Punto de frenado a ${km(Math.min(r.brakeM, r.arrival.sub(last).length()))} de la llegada`,
      items: [
        { kind: "ring", centre: brake, normal: legDir, radiusM: ring * 0.7, tone: "brake" },
        { kind: "line", points: [brake, r.arrival], tone: "brake" },
      ],
    },
    { caption: "✓ Plan completo: el piloto automático lo vuela", items: [{ kind: "line", points, tone: "ok" }] },
  ];
}

/** The descent as the landing challenges program it. */
export interface DescentSketch {
  readonly craft: Vec3;
  readonly site: Vec3;
  /** Local up at the site (unit). */
  readonly up: Vec3;
  readonly siteRadiusM: number;
  /** Ground speed under the craft (world, m/s): the drift to match. */
  readonly groundVelocity: Vec3;
  readonly maxDescentMs: number;
  readonly flareM: number;
  readonly touchdownMs: number;
  /** Braking acceleration of the curve (RCS × share), m/s². */
  readonly brakeMs2: number;
}

/** Five sketches for the five landing challenges: site, drift, descent curve, final braking, anchors. */
export function landingSketch(d: DescentSketch): SketchStep[] {
  const height = Math.max(0, d.craft.sub(d.site).dot(d.up));
  const top = d.site.add(d.up.scale(height));
  // Any horizontal axis to draw the curve and the anchors on.
  const side = (Math.abs(d.up.y) < 0.9 ? Vec3.Y : Vec3.X).cross(d.up).normalize();
  const other = d.up.cross(side);
  const g = d.groundVelocity.sub(d.up.scale(d.groundVelocity.dot(d.up)));
  const gLen = g.length();
  // Descent curve: at each height, the allowed speed drawn sideways (100 m per m/s) — the braking curve.
  const curve: Vec3[] = [];
  for (let i = 0; i <= 12; i++) {
    const h = (height * i) / 12;
    const v = h > d.flareM ? Math.min(d.maxDescentMs, d.touchdownMs + Math.sqrt(2 * d.brakeMs2 * (h - d.flareM))) : d.touchdownMs;
    curve.push(d.site.add(d.up.scale(h)).add(side.scale(v * Math.max(4, d.siteRadiusM * 4))));
  }
  const flare = d.site.add(d.up.scale(d.flareM));
  const anchors: SketchItem[] = [0, 1, 2].map((k) => {
    const a = (k * 2 * Math.PI) / 3;
    const foot = d.site.add(side.scale(Math.cos(a) * d.siteRadiusM * 0.5)).add(other.scale(Math.sin(a) * d.siteRadiusM * 0.5));
    return { kind: "arrow", from: foot.add(d.up.scale(d.siteRadiusM * 0.6)), to: foot.sub(d.up.scale(d.siteRadiusM * 0.3)), tone: "ok" };
  });
  return [
    {
      caption: `✓ Sitio fijado bajo la nave, a ${km(height)}`,
      items: [
        { kind: "ring", centre: d.site, normal: d.up, radiusM: d.siteRadiusM, tone: "site" },
        { kind: "line", points: [top, d.site], tone: "plan" },
      ],
    },
    {
      caption: `✓ Igualar el suelo: ${num(gLen, 3)} m/s de deriva`,
      items: [{ kind: "arrow", from: d.craft, to: d.craft.add(gLen > 1e-6 ? g.scale(Math.max(4, d.siteRadiusM * 3) / gLen) : side.scale(0.01)), tone: "burn" }],
    },
    { caption: `✓ Perfil de descenso: hasta ${num(d.maxDescentMs, 1)} m/s, frenando con el RCS`, items: [{ kind: "line", points: curve, tone: "plan" }] },
    { caption: `✓ Frenado final a ${num(d.flareM)} m: ${num(d.touchdownMs, 2)} m/s`, items: [{ kind: "ring", centre: flare, normal: d.up, radiusM: d.siteRadiusM * 0.6, tone: "brake" }] },
    { caption: "✓ Anclas listas: al tocar, se clavan", items: [{ kind: "ring", centre: d.site, normal: d.up, radiusM: d.siteRadiusM, tone: "ok" }, ...anchors] },
  ];
}
