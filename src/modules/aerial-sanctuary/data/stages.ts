import type { HerSpot, Thing } from "../domain/station-beat";
import type { S3Layout } from "./layout";

/**
 * Where each post's challenge is acted out (domain/station-beat.ts), at its room's real furniture: her spots, the
 * trainer's place and the anchors of the things (the table's top, the wall of the eye chart, the pool's surface).
 * Plan coordinates are the room's own (as `ROOMS` in layout.ts) and are drawn `k` times wider like the room; heights
 * stay true. `layout.test.ts`'s companion, stages.test.ts, checks that nobody stands in a wall or a table (§4.2).
 */
export interface StageSpot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Where she faces, rad: forward is (sin face, cos face) on the plan. */
  readonly face: number;
}

/** Furniture to put things on, and (named like the thing) where a thing stands by itself at the post («sitio»). */
export type Anchor = "mesa" | "pared" | "agua" | "banco" | "bascula" | "techo" | "maqueta" | "pantalla" | "lm" | Thing;

export interface Stage {
  readonly post: number;
  /** The area it is in (`entrenamiento:medico`, `glaciar:pista`). */
  readonly room: string;
  /** The way point the trainer comes in by (a room's «dentro», a glacier site's edge). */
  readonly door: string;
  /**
   * Her spots on a moving rig (the centrifuge's gondola, the Il-76MDK's hold): the scene carries her there each frame
   * (s3-rigs.ts); the spot here is where the rig stands at rest.
   */
  readonly mounted: readonly HerSpot[];
  readonly her: Partial<Record<HerSpot, StageSpot>>;
  /** For a length of the pool: where it starts and ends. */
  readonly lap?: { readonly from: StageSpot; readonly to: StageSpot };
  readonly trainer: StageSpot;
  /** The trainer's way in from the room's door (its «dentro» point) to her place, around the furniture. */
  readonly trainerVia: readonly StageSpot[];
  /** Where the trainer goes with her for some of her spots (the doctor at the scale, the couch, the chart). */
  readonly beside: Partial<Record<HerSpot, StageSpot>>;
  readonly anchors: Partial<Record<Anchor, { readonly x: number; readonly y: number; readonly z: number }>>;
  /** A fixed eye for closed rooms (inside the hypobaric chamber), else the camera orbits her. */
  readonly eye?: { readonly x: number; readonly y: number; readonly z: number };
}

/** Local spots, as (x, y, z, face) on the room's plan. */
type L = readonly [number, number, number, number];
interface Plan {
  /** The area's id. */
  readonly room: string;
  /** The trainer's way in: default the room's «dentro» point. */
  readonly door?: string;
  readonly mounted?: readonly HerSpot[];
  readonly her: Partial<Record<HerSpot, L>>;
  readonly lap?: readonly [L, L];
  readonly trainer: L;
  readonly trainerVia?: readonly L[];
  readonly beside?: Partial<Record<HerSpot, L>>;
  readonly anchors: Partial<Record<Anchor, readonly [number, number, number]>>;
  readonly eye?: readonly [number, number, number];
}

const N = 0;
const S = Math.PI;
const E = Math.PI / 2;
const W = -Math.PI / 2;
const SURFACE = -0.3;
/** Swimming, her feet are about this far under the surface (walk.ts SWIM_DEPTH_M) and a length is along the pool. */
const SWIM_Y = SURFACE - 1.45;

const PLANS: Readonly<Record<number, Plan>> = {
  // Centro médico (95, −100): the tribunal's table at (−9, 2), 3 × 1 m and 0,75 m high.
  1: { room: "entrenamiento:medico", her: { silla: [-9, 0, 0.6, N] }, trainer: [-9, 0, 3.4, S], anchors: { mesa: [-9, 0.75, 2] } },
  // The couch at (−2, 2.5), 2 × 0,8 m and 0,7 m high; the scale by it; the eye chart on the south wall. The doctor goes
  // with her from one to the next.
  2: { room: "entrenamiento:medico", her: { bascula: [-5, 0.05, 1.2, N], "camilla-sentada": [-2, 0.2, 2.25, S], "camilla-tumbada": [-2, 0.7, 2.5, W], "tabla-vista": [-2, 0, -3.2, S] }, trainer: [-0.6, 0, 1.3, W], trainerVia: [[0.2, 0, 2.6, S], [0.2, 0, 1.3, W]], beside: { "camilla-sentada": [-1.6, 0, 1.3, N], "camilla-tumbada": [-1.6, 0, 1.3, N], bascula: [-3.9, 0, 1.2, W], "tabla-vista": [-3.2, 0, -5.2, N] }, anchors: { bascula: [-5, 0, 1.2], pared: [-2, 1.5, -6.55] } },
  // The hypobaric chamber at (8, −1), 6 × 6 m, its floor 0,2 m up and its hatch to the west; she sits on its bench.
  // The trainer is the chamber's inside observer, as in a real altitude chamber run, in by the corridor, the airlock and the hatch (data/fixtures.ts), beside her; the
  // eye in the hatch's corner keeps both in a phone's narrow view.
  4: { room: "entrenamiento:medico", her: { camara: [9.9, 0.2, -1, W] }, trainer: [8.6, 0.2, -2.4, 0.75], trainerVia: [[2.5, 0, 4.6, S], [2.5, 0, -1, E], [3.6, 0, -1, E], [6, 0.2, -1, E]], anchors: { banco: [10.35, 0.65, -1] }, eye: [6, 1.8, 1.2] },
  // The water-survival pool (260, −85), like Pensacola's: 25 × 12 m and 5 m deep at the middle (its south edge at
  // z = −6), surface at −0,3 m; a length is its 25 m; the raft afloat at (−7, 2,5); the hoist's collar at (−4, 0), 8 m
  // up; the METS to the east. The instructor on the south deck by the lifeguard's chair.
  3: { room: "entrenamiento:supervivencia", her: { borde: [-10, 0, -7.6, N], flotando: [-2, SURFACE - 1.35, -2, N], balsa: [-7, SURFACE - 0.15, 2.5, N], izada: [-4, 2.4, 0, N] }, lap: [[-12.5, SWIM_Y + 1.2, -3, E], [12.5, SWIM_Y + 1.2, -3, E]], trainer: [-12.4, 0, -9, N], trainerVia: [[-17, 0, 6, S], [-17, 0, -9, E]], anchors: { agua: [-4, SURFACE, 0], techo: [-4, 8, 0] } },
  // Post 7 by the west end of the same edge; the ISS mock-up on the bottom at the middle (8,5 × 4,3 m).
  7: { room: "entrenamiento:nbl", her: { "banco-traje": [-10, 0, -17.5, N], fondo: [0, -12 + 0.05, -5, N] }, trainer: [-12.5, 0, -18, E], anchors: { maqueta: [0, -12, 0] } },
  // ── Phase 5 ──
  // The centrifuge (225, 55): the arm's 18 m to the gondola (at rest to the east, k times wider on the plan); the
  // medical monitor at the console, out of the arm's sweep, comes to her for the electrodes.
  5: { room: "entrenamiento:centrifuga", her: { "junto-gondola": [17, 0, -3.4, N], gondola: [18, 0.5, 0, W] }, mounted: ["gondola"], trainer: [-16, 0, 10.6, N], trainerVia: [[-19, 0, -10, E], [-19, 0, 10.6, E]], beside: { "junto-gondola": [18.8, 0, -3.6, N] }, anchors: {} },
  // The Crew Dragon simulators (75, 102), like SpaceX's at Hawthorne: the full-scale cabin at (6, 0), its floor 0,6 m
  // up and its hatch to the west; the instructor outside the hatch.
  8: { room: "entrenamiento:simulador-dragon", her: { "dragon-asiento": [5.6, 0.6, 0, E] }, trainer: [2.6, 0, 1.4, E], trainerVia: [[0, 0, -3.5, N], [2.6, 0, -3.5, N]], anchors: { pantalla: [7.55, 1.6, 0] }, eye: [4.75, 1.85, -1.1] },
  // The robotics training centre (225, 102), like the CSA's: the ISS's robotics workstation on the north wall of the
  // 3/4 Destiny mock-up at (4, 0) (floor 0,3 m up, hatch to the west); its three screens before her; the instructor
  // behind her shoulder.
  9: { room: "entrenamiento:robotica", her: { "robotica-puesto": [4.4, 0.3, 0.15, N] }, trainer: [5.7, 0.3, -0.45, -0.6], trainerVia: [[0, 0, 0, E], [5.7, 0.3, 0, E]], anchors: { pantalla: [4.4, 1.8, 1.0], mandos: [4.4, 1.05, 0.7] } },
  // The runway's apron on the glacier: the Il-76MDK (nose east) at (−1380, −82) of the glacier, its stairs to the
  // south, aft; the plan is the runway area's (its centre at (0, −107,5)). In flight she and the coach ride the cabin.
  6: { room: "glaciar:pista", door: "glaciar:pista:escalerilla", her: { "avion-escalerilla": [-1395, 0, 14, N], "avion-asiento": [-1380, 2.2, 25.5, E], "avion-suelo": [-1380, 2.2, 25.5, E], "avion-flotando": [-1380, 2.2, 25.5, E] }, mounted: ["avion-asiento", "avion-suelo", "avion-flotando"], trainer: [-1392, 0, 12.5, N], anchors: {} },
  // The blue-ice field (its centre at (−1260, −10) of the glacier): the line of snowmobiles to the west.
  11: { room: "glaciar:hielo-azul", door: "glaciar:hielo-azul:borde", her: { moto: [-14, 0, 0, E], meteorito: [0, 0, 0, E] }, trainer: [0.8, 0, 1.5, S], anchors: { "moto-nieve": [-2.6, 0, -1.6], meteorito: [0.75, 0, 0], gps: [0.55, 0, 0.35], bandera: [1.3, 0, 0.6] } },
  // The cold-survival site (its centre at (−1442,5, 55) of the glacier): the wind from the south (−z).
  12: { room: "glaciar:supervivencia", door: "glaciar:supervivencia:borde", her: { tienda: [-3, 0, -1.4, N], muro: [3, 0, -6, S], zanja: [-6.2, 0, -6.4, N], hornillo: [0.6, 0, 2.5, W], radio: [4, 0, 3, E] }, trainer: [1.5, 0, -1, W], beside: { tienda: [-1.4, 0, -1.4, W], muro: [3, 0, -4.6, S], zanja: [-7.9, 0, -6.4, E], hornillo: [0.6, 0, 4.1, S], radio: [4, 0, 4.6, S] }, anchors: { "tienda-scott": [-3, 0, 1], "muro-nieve": [3, 0, -6.7], "zanja-techo": [-6.2, 0, -4.5], hornillo: [-0.4, 0, 2.5], olla: [-0.4, 0.28, 2.5], "radio-hf": [4.8, 0, 3], antena: [7, 0, 3] } },
};

/** The stage of post `post` in this layout (undefined for a post with no challenge yet). */
export function stageFor(layout: S3Layout, post: number): Stage | undefined {
  const p = PLANS[post];
  if (!p) return undefined;
  const area = layout.areas.find((a) => a.id === p.room);
  if (!area) return undefined;
  const k = layout.k;
  const c = area.centre;
  const at = (l: L): StageSpot => ({ x: c.x + l[0] * k, y: l[1], z: c.z + l[2] * k, face: l[3] });
  const her: Partial<Record<HerSpot, StageSpot>> = {};
  for (const [key, l] of Object.entries(p.her)) her[key as HerSpot] = at(l as L);
  const anchors: Stage["anchors"] = Object.fromEntries(Object.entries(p.anchors).map(([key, a]) => [key, { x: c.x + a![0] * k, y: a![1], z: c.z + a![2] * k }]));
  // The eye chart hangs on the wall's inner face, whatever the scale (the wall is 0,4 m thick).
  if (anchors.pared) anchors.pared = { ...anchors.pared, z: c.z - area.half.z + 0.45 };
  return {
    post,
    room: p.room,
    door: p.door ?? `${p.room}:dentro`,
    mounted: p.mounted ?? [],
    her,
    ...(p.lap ? { lap: { from: at(p.lap[0]), to: at(p.lap[1]) } } : {}),
    trainer: at(p.trainer),
    trainerVia: (p.trainerVia ?? []).map(at),
    beside: Object.fromEntries(Object.entries(p.beside ?? {}).map(([key, l]) => [key, at(l as L)])),
    anchors,
    ...(p.eye ? { eye: { x: c.x + p.eye[0] * k, y: p.eye[1], z: c.z + p.eye[2] * k } } : {}),
  };
}

/** The posts acted out. */
export const STAGED_POSTS: readonly number[] = Object.keys(PLANS).map(Number).sort((a, b) => a - b);
