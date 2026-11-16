import * as THREE from "three";
import type { StepShow, StepSnapshot } from "./step-show";

/**
 * The animation audit (docs/qa/animaciones.md, tools/experiencia/animaciones.mjs): measures, in the 3D
 * scene, whether what a solved step shows can be seen and makes sense where it is. A prop must be
 * - within reach: 0,8 m from one of Doménica's hands, or on the spot she is working at (the station she faces);
 * - on screen, in the strip above the challenge sheet, and not hidden behind the furniture or her body;
 * - not inside other geometry (a counter, a wall, a machine).
 * And her gesture must play (her pose leaves the waiting pose).
 */

/** Hand reach (m) the designer asked for. */
export const REACH_M = 0.8;
/** A prop is «on the station» when this near the step's spot (m)… */
export const ON_SPOT_M = 0.45;
/** …and she stands this near that spot (m, on the floor). */
export const AT_SPOT_M = 0.9;
/** Joint-angle difference (rad) from the waiting pose that counts as a gesture. */
export const GESTURE_MIN = 0.3;

export interface PropAudit {
  readonly name: string;
  readonly pos: readonly [number, number, number];
  /** To the nearest hand, m. */
  readonly hand: number;
  /** To the step's spot, m. */
  readonly spot: number;
  /** Screen position (CSS px) of its centre. */
  readonly px: readonly [number, number];
  /** Fraction (0…1) of its sample points that are on screen above the sheet and not hidden. */
  readonly seen: number;
  /** What hides it, when its centre is hidden. */
  readonly hiddenBy?: string;
  /** The mesh it is inside of, if any. */
  readonly inside?: string;
  readonly reach: boolean;
}

export interface StepAudit {
  readonly action: string;
  readonly place: string;
  readonly playing: boolean;
  readonly t: number;
  readonly played: number;
  readonly gesture: number;
  /** Floor distance from her feet to the spot, m. */
  readonly feetToSpot: number;
  /** Her working hand on screen above the sheet. */
  readonly handSeen: boolean;
  readonly spotPx: readonly [number, number];
  readonly spotSeen: boolean;
  readonly props: readonly PropAudit[];
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Whether `o` and its ancestors are all visible. */
function shown(o: THREE.Object3D | null): boolean {
  for (let x = o; x; x = x.parent) if (!x.visible) return false;
  return true;
}

/** Opaque enough to hide what is behind it (glass, holograms and glows do not). */
function opaque(m: THREE.Material | THREE.Material[]): boolean {
  const mm = Array.isArray(m) ? m[0] : m;
  return !!mm && (!mm.transparent || mm.opacity >= 0.5) && mm.visible;
}

/** `p` (world) inside mesh `m`'s solid: boxes, cylinders and spheres by their geometry, others by their box. */
function insideMesh(m: THREE.Mesh, p: THREE.Vector3): boolean {
  const g = m.geometry as THREE.BufferGeometry & { parameters?: Record<string, number> };
  const l = m.worldToLocal(p.clone());
  const prm = g.parameters ?? {};
  const eps = 0.005;
  switch (g.type) {
    case "BoxGeometry":
      return Math.abs(l.x) < prm.width! / 2 - eps && Math.abs(l.y) < prm.height! / 2 - eps && Math.abs(l.z) < prm.depth! / 2 - eps;
    case "CylinderGeometry": {
      const r = Math.max(prm.radiusTop!, prm.radiusBottom!);
      return Math.abs(l.y) < prm.height! / 2 - eps && Math.hypot(l.x, l.z) < r - eps;
    }
    case "SphereGeometry":
      return l.length() < prm.radius! - eps;
    default: {
      if (!g.boundingBox) g.computeBoundingBox();
      return g.boundingBox!.containsPoint(l);
    }
  }
}

/**
 * Audits the step on stage. `scene` holds what may hide or contain a prop (the room, the animals, her
 * figure, `body`); `sheetTop` is the y (CSS px) where the challenge sheet starts; `size` the canvas in CSS px.
 */
export function auditStep(show: StepShow, camera: THREE.PerspectiveCamera, scene: THREE.Object3D, sheetTop: number, size: { readonly w: number; readonly h: number }, body?: THREE.Object3D): StepAudit | undefined {
  const snap: StepSnapshot | undefined = show.snapshot();
  if (!snap) return undefined;
  camera.updateMatrixWorld();
  // World positions are real metres; the ring is drawn with its floor plan k times bigger (plan-camera.ts).
  const drawn = new THREE.Vector3(snap.planScale, 1, snap.planScale);
  const propSet = new Set<THREE.Object3D>();
  for (const p of snap.props) p.object.traverse((o) => propSet.add(o));
  show.root.traverse((o) => propSet.add(o));
  // Solid meshes that can hide or contain a prop: shown, opaque, not a prop, not a huge shell (floor, walls) for containment.
  const solids: THREE.Mesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || propSet.has(m) || !shown(m) || !opaque(m.material)) return;
    solids.push(m);
  });
  // Her body may hide a prop, but a prop in her hand is not «inside» her.
  const bodySet = new Set<THREE.Object3D>();
  body?.traverse((o) => bodySet.add(o));
  const ray = new THREE.Raycaster();
  const toPx = (v: THREE.Vector3): [number, number, boolean] => {
    const n = v.clone().project(camera);
    const x = ((n.x + 1) / 2) * size.w;
    const y = ((1 - n.y) / 2) * size.h;
    return [x, y, n.z > -1 && n.z < 1 && x >= 0 && x <= size.w && y >= 0 && y <= sheetTop];
  };
  const blocker = (v: THREE.Vector3, own: Set<THREE.Object3D>): string | undefined => {
    const d = camera.position.distanceTo(v);
    ray.set(camera.position, v.clone().sub(camera.position).normalize());
    ray.far = d - 0.02;
    ray.near = camera.near;
    const hit = ray.intersectObjects(solids, false).find((h) => !own.has(h.object));
    return hit ? hit.object.name || hit.object.parent?.name || (hit.object as THREE.Mesh).geometry.type : undefined;
  };
  const props: PropAudit[] = snap.props.map(({ name, object }) => {
    const own = new Set<THREE.Object3D>();
    object.traverse((o) => own.add(o));
    const box = new THREE.Box3().setFromObject(object);
    const c = box.getCenter(new THREE.Vector3());
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.3);
    const samples = [c, ...[-1, 1].flatMap((sx) => [-1, 1].flatMap((sy) => [-1, 1].map((sz) => c.clone().add(new THREE.Vector3(sx * half.x, sy * half.y, sz * half.z)))))];
    let seen = 0;
    for (const s of samples) if (toPx(s)[2] && !blocker(s, own)) seen++;
    const hiddenBy = blocker(c, own);
    const inMesh = solids.find((m) => !own.has(m) && !bodySet.has(m) && insideMesh(m, c));
    // Distances in drawn metres (what the player sees): the snapshot's feet, hands and spot are drawn.
    const cd = c.clone().multiply(drawn);
    const hand = Math.min(...snap.hands.map((h) => h.distanceTo(cd)));
    const spot = snap.spot.distanceTo(cd);
    const feetToSpot = Math.hypot(snap.feet.x - snap.spot.x, snap.feet.z - snap.spot.z);
    const px = toPx(c);
    return {
      name,
      pos: [r3(cd.x), r3(cd.y), r3(cd.z)],
      hand: r3(hand),
      spot: r3(spot),
      px: [Math.round(px[0]), Math.round(px[1])],
      seen: r3(seen / samples.length),
      ...(hiddenBy ? { hiddenBy } : {}),
      ...(inMesh ? { inside: inMesh.name || inMesh.geometry.type } : {}),
      reach: hand <= REACH_M || (spot <= ON_SPOT_M && feetToSpot <= AT_SPOT_M),
    };
  });
  const handPx = toPx(snap.hands[1].clone().divide(drawn));
  const spotPx = toPx(snap.spot.clone().divide(drawn));
  return {
    action: snap.act.action,
    place: snap.act.place,
    playing: snap.playing,
    t: r3(snap.t),
    played: snap.played,
    gesture: r3(snap.gesture),
    feetToSpot: r3(Math.hypot(snap.feet.x - snap.spot.x, snap.feet.z - snap.spot.z)),
    handSeen: handPx[2],
    spotPx: [Math.round(spotPx[0]), Math.round(spotPx[1])],
    spotSeen: spotPx[2],
    props,
  };
}
