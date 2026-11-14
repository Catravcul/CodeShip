import { Vec3 } from "@core/math/vec3";
import { discRails, tubeRails, type Handrail } from "../domain/handrails";
import type { Launcher } from "../domain/hops";
import type { Interactable } from "@core/spacing";

/**
 * The mothership's hub and spine as data (docs/design/ingravidez.md, «Fase D: la espina»): its
 * handrails, the grab point at every point of interest, the ladders and the launchers. The frame is
 * the ring's: x along the spin axis, y up (toward the axis), z spinward; the axis runs at `axisY`.
 * The numbers match adapters/three/interior/spoke.ts (`spokeLayout`), which draws it.
 */
export interface SpineLayout {
  /** Elevator shaft centre on the floor. */
  readonly x: number;
  readonly z: number;
  readonly shaftR: number;
  readonly axisY: number;
  readonly topY: number;
  readonly hubHalfX: number;
  readonly deckHatchX: number;
  readonly moduleEndX: number;
  readonly tubeR: number;
}

/**
 * The hub and spine for a ring of floor radius `axisY` and a habitat module of half-length
 * `roomHalfL` (the shaft rises from its near end). Game values (docs/design/ingravidez.md, «Túneles
 * más amplios»): open tubes 5,5 m across, a shaft 2 m across.
 */
export function spineLayout(axisY: number, roomHalfL: number): SpineLayout & { readonly carR: number } {
  const tubeR = 2.75;
  return { x: 0, z: -roomHalfL + 0.5, carR: 0.45, shaftR: 1.0, axisY, topY: axisY - tubeR - 2.2, hubHalfX: 2.5, deckHatchX: 11, moduleEndX: 16, tubeR };
}

/** Whether a body centre at p fits in the hub, the spine or the top of the shaft, `margin` from the walls. */
export function spineFits(L: SpineLayout, p: { x: number; y: number; z: number }, margin: number): boolean {
  const r = Math.hypot(p.y - L.axisY, p.z - L.z);
  const tube = p.x > -L.hubHalfX + margin && p.x < L.moduleEndX - margin && r < L.tubeR - margin;
  const shaft = Math.hypot(p.x - L.x, p.z - L.z) < L.shaftR - Math.min(margin, 0.3) && p.y > L.topY + 0.9 && p.y <= L.axisY;
  return tube || shaft;
}

/** What a point of interest of the spine does when she holds its grab point. */
export type SpinePoiAction = "bajar" | "puente" | "atraque" | "lanzador" | "info";

/** A point of interest of the hub and spine: the thing (its centre), its grab bar and what it does. */
export interface SpinePoi {
  readonly id: string;
  readonly label: string;
  readonly action: SpinePoiAction;
  /** One line said when its action is info. */
  readonly info?: string;
  /** The thing's centre, m. */
  readonly centre: Vec3;
}

/** Where along the spine each thing stands, m from the hub's centre (game values, 2 m apart or more: HAB-08). */
export const SPINE_X = {
  lanzadorPopa: 2.9,
  guantera: 5.0,
  impresora: 7.1,
  almacen: 8.6,
  trajes: 13.5,
  lanzadorProa: 14.5,
} as const;

/** Angle round the tube of the launchers' lane: along the floor, a little off its middle (where the ladder runs). */
export const LAUNCH_ANGLE = Math.PI - 0.4;

/** A point at x, at an angle round the tube (rad: 0 the ceiling (+y), π the floor, +π/2 the spinward wall (+z)), r from the axis. */
export function spineAt(L: SpineLayout, x: number, angle: number, r: number): Vec3 {
  return new Vec3(x, L.axisY + Math.cos(angle) * r, L.z + Math.sin(angle) * r);
}
const at = spineAt;
/** Inward normal at that angle. */
const inward = (angle: number) => new Vec3(0, -Math.cos(angle), -Math.sin(angle));

/** The points of interest of the hub and spine (the interactables there). */
export function spinePois(L: SpineLayout): SpinePoi[] {
  const wall = L.tubeR - 0.35;
  return [
    { id: "ascensor", label: "Ascensor al anillo", action: "bajar", centre: new Vec3(L.x, L.axisY - L.tubeR, L.z) },
    { id: "lanzador-popa", label: "Lanzador de popa", action: "lanzador", centre: at(L, SPINE_X.lanzadorPopa, LAUNCH_ANGLE, wall) },
    { id: "guantera", label: "Guantera del taller", action: "info", info: "Guantera del taller: dos puertos de guantes para trabajar sin que el polvo flote por la nave", centre: at(L, SPINE_X.guantera, -Math.PI / 2, wall) },
    { id: "impresora", label: "Impresora 3D", action: "info", info: "Impresora 3D: piezas de plástico y de metal para reparar a bordo, como la de la ISS desde 2014", centre: at(L, SPINE_X.impresora, -Math.PI / 2, wall) },
    { id: "almacen", label: "Almacén", action: "info", info: "Almacén: bolsas de carga atadas a la pared, como en el módulo PMM de la ISS", centre: at(L, SPINE_X.almacen, Math.PI / 2, wall) },
    { id: "puente", label: "Escotilla del puente", action: "puente", centre: at(L, L.deckHatchX, Math.PI / 2, L.tubeR - 0.05) },
    { id: "trajes", label: "Trajes EMU", action: "info", info: "Trajes EMU de la esclusa: para salir a un asteroide se usa la escotilla del módulo de aterrizaje", centre: at(L, SPINE_X.trajes, -Math.PI / 2, wall) },
    { id: "lanzador-proa", label: "Lanzador de proa", action: "lanzador", centre: at(L, SPINE_X.lanzadorProa, LAUNCH_ANGLE, wall) },
    { id: "atraque", label: "Escotilla de atraque", action: "atraque", centre: new Vec3(L.moduleEndX, L.axisY, L.z) },
  ];
}

/** A bar of 0,5 m along x at an angle round the tube, with a point of interest. */
function poiBar(L: SpineLayout, id: string, poi: string, x: number, angle: number): Handrail {
  const r = L.tubeR - 0.08;
  return { id, a: at(L, x - 0.25, angle, r), b: at(L, x + 0.25, angle, r), normal: inward(angle), poi };
}

/**
 * Handrails of the hub and the spine: eight rows round the wall (one every ~2,1 m), one bar per rack
 * bay; bars round the hatches at both ends; the bar at the top of the shaft; a grab bar at every
 * point of interest (just beside it, toward the floor, so her body floats in front of it); a ladder
 * along the spine's floor and one up the hub's end wall.
 */
export function spineHandrails(L: SpineLayout): Handrail[] {
  const fondo = discRails("espina-fondo", L.moduleEndX, -1, L.axisY, L.z, 1.4);
  const below = 0.4;
  return [
    ...tubeRails("cubo", L.axisY, L.z, L.tubeR, -L.hubHalfX + 0.2, L.hubHalfX - 0.2, 8, Math.PI / 8),
    ...tubeRails("espina", L.axisY, L.z, L.tubeR, L.hubHalfX + 0.2, L.moduleEndX - 0.2, 8, Math.PI / 8),
    ...discRails("cubo-fondo", -L.hubHalfX, 1, L.axisY, L.z, 1.4),
    // The docking hatch's side bar, level with the axis, is its grab point (she arrives there looking down the spine).
    ...fondo.map((r) => (r.id === "espina-fondo:1" ? { ...r, poi: "atraque" } : r)),
    { id: "pozo", a: new Vec3(L.x, L.topY + 1.15, L.z - L.shaftR + 0.08), b: new Vec3(L.x, L.axisY - L.tubeR - 0.1, L.z - L.shaftR + 0.08), normal: new Vec3(0, 0, 1), landT: 0.9, poi: "ascensor" },
    poiBar(L, "lanzador-popa", "lanzador-popa", SPINE_X.lanzadorPopa, LAUNCH_ANGLE),
    poiBar(L, "lanzador-proa", "lanzador-proa", SPINE_X.lanzadorProa, LAUNCH_ANGLE),
    poiBar(L, "guantera", "guantera", SPINE_X.guantera, -Math.PI / 2 - below),
    poiBar(L, "impresora", "impresora", SPINE_X.impresora, -Math.PI / 2 - below),
    poiBar(L, "almacen", "almacen", SPINE_X.almacen, Math.PI / 2 + below),
    poiBar(L, "puente", "puente", L.deckHatchX, Math.PI / 2 + below),
    poiBar(L, "trajes", "trajes", SPINE_X.trajes, -Math.PI / 2 - below),
    // Ladders: along the spine's floor (horizontal) and up the hub's end wall (vertical), beside its hatch.
    { id: "escalera-espina", a: at(L, L.hubHalfX + 0.5, Math.PI, L.tubeR - 0.08), b: at(L, L.moduleEndX - 0.5, Math.PI, L.tubeR - 0.08), normal: inward(Math.PI), ladder: true },
    { id: "escalera-cubo", a: new Vec3(-L.hubHalfX + 0.08, L.axisY - 1.2, L.z - 1.8), b: new Vec3(-L.hubHalfX + 0.08, L.axisY + 1.2, L.z - 1.8), normal: new Vec3(1, 0, 0), ladder: true },
  ];
}

/**
 * The spine's launchers (docs/design/ingravidez.md, «Lanzadores»): a sprung foot plate at each end of
 * the long run, low on the floor beside the ladder, each firing her to the other end's catch net.
 * Customised here (one entry per launcher: where, to where, speed, spring travel, net give).
 *
 * - 2,5 m/s: a machine's push, faster than Skylab's «vigorous soaring» (~1,9 m/s) by a person, but
 *   with the loads kept inside what crews have taken (Amir & Newman; NASA-STD-3000 §8.7.2).
 * - Spring travel 1,0 m: F = m v² / 2s = 181 N on her feet, inside the leg push-offs measured in
 *   parabolic flight (66–462 N, mean 225 N).
 * - Net give 1,4 m: 130 N spread over her body, under the 137 N peak measured on Mir.
 */
export function spineLaunchers(): Launcher[] {
  const common = { speedMS: 2.5, strokeM: 1.0, catchM: 1.4 } as const;
  return [
    { id: "lanzador-popa", label: "Lanzador de popa → red de proa", from: "lanzador-popa", to: "lanzador-proa", ...common },
    { id: "lanzador-proa", label: "Lanzador de proa → red de popa", from: "lanzador-proa", to: "lanzador-popa", ...common },
  ];
}

/** A launcher of the spine by id. */
export function spineLauncher(id: string): Launcher | undefined {
  return spineLaunchers().find((l) => l.id === id);
}

/** The interactables of the hub and spine for the spacing rule (HAB-08): each thing and its grab point. */
export function spineInteractables(L: SpineLayout): Interactable[] {
  const rails = spineHandrails(L);
  return spinePois(L).map((p) => {
    const r = rails.find((x) => x.poi === p.id)!;
    const t = r.landT ?? 0.5;
    return { id: p.id, centre: p.centre, anchor: r.a.add(r.b.sub(r.a).scale(t)) };
  });
}
