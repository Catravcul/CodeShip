import type { HerSpot } from "../domain/station-beat";
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

export type Anchor = "mesa" | "pared" | "agua" | "banco" | "bascula" | "techo" | "maqueta";

export interface Stage {
  readonly post: number;
  readonly room: string;
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
  readonly room: string;
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
  1: { room: "medico", her: { silla: [-9, 0, 0.6, N] }, trainer: [-9, 0, 3.4, S], anchors: { mesa: [-9, 0.75, 2] } },
  // The couch at (−2, 2.5), 2 × 0,8 m and 0,7 m high; the scale by it; the eye chart on the south wall. The doctor goes
  // with her from one to the next.
  2: { room: "medico", her: { bascula: [-5, 0.05, 1.2, N], "camilla-sentada": [-2, 0.2, 2.25, S], "camilla-tumbada": [-2, 0.7, 2.5, W], "tabla-vista": [-2, 0, -3.2, S] }, trainer: [-0.6, 0, 1.3, W], trainerVia: [[0.2, 0, 2.6, S], [0.2, 0, 1.3, W]], beside: { "camilla-sentada": [-1.6, 0, 1.3, N], "camilla-tumbada": [-1.6, 0, 1.3, N], bascula: [-3.9, 0, 1.2, W], "tabla-vista": [-3.2, 0, -5.2, N] }, anchors: { bascula: [-5, 0, 1.2], pared: [-2, 1.5, -6.55] } },
  // The hypobaric chamber at (8, −1), 6 × 6 m, its floor 0,2 m up and its hatch to the west; she sits on its bench.
  // The trainer is the chamber's inside observer, as in a real altitude chamber run, in by the corridor, the airlock and the hatch (data/fixtures.ts), beside her; the
  // eye in the hatch's corner keeps both in a phone's narrow view.
  4: { room: "medico", her: { camara: [9.9, 0.2, -1, W] }, trainer: [8.6, 0.2, -2.4, 0.75], trainerVia: [[2.5, 0, 4.6, S], [2.5, 0, -1, E], [3.6, 0, -1, E], [6, 0.2, -1, E]], anchors: { banco: [10.35, 0.65, -1] }, eye: [6, 1.8, 1.2] },
  // The NBL (95, 45): the pool of 62 × 31 m at the middle (its edge at z = −15,5), surface at −0,3 m.
  3: { room: "nbl", her: { borde: [10, 0, -17.5, N], flotando: [6, SURFACE - 1.35, -12, N], balsa: [9, SURFACE - 0.15, -11, N], izada: [9, 2.4, -11, N] }, lap: [[-15, SWIM_Y + 1.2, -12, E], [10, SWIM_Y + 1.2, -12, E]], trainer: [13, 0, -18, N], anchors: { agua: [9, SURFACE, -11], techo: [9, 18, -11] } },
  // Post 7 by the west end of the same edge; the ISS mock-up on the bottom at the middle (8,5 × 4,3 m).
  7: { room: "nbl", her: { "banco-traje": [-10, 0, -17.5, N], fondo: [0, -12 + 0.05, -5, N] }, trainer: [-12.5, 0, -18, E], anchors: { maqueta: [0, -12, 0] } },
};

/** The stage of post `post` in this layout (undefined for a post with no challenge yet). */
export function stageFor(layout: S3Layout, post: number): Stage | undefined {
  const p = PLANS[post];
  if (!p) return undefined;
  const area = layout.areas.find((a) => a.id === `entrenamiento:${p.room}`);
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
