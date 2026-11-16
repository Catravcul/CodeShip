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

/** Meshes bigger than this across x and z (m) are shells (the floor, the ceiling): a prop on the floor is not «in» them. */
const SHELL_M = 4;

/**
 * The clearance rule for props set down in a room (step-show.ts, `clearOf`): a box (world centre and half
 * size) is clear when it meets no shown, opaque mesh of `scene` but those under `skip` (the props, her
 * figure) and the room's shells. Meshes are tested by their world bounding boxes (a little conservative).
 */
/** How far along `dir` from `from` the first solid of `scene` (but what is in `skip`) is, within `far`; undefined when none. */
export function hitOfScene(scene: THREE.Object3D, skip: readonly THREE.Object3D[]): (from: THREE.Vector3, dir: THREE.Vector3, far: number) => number | undefined {
  const ray = new THREE.Raycaster();
  return (from, dir, far) => {
    const own = new Set<THREE.Object3D>();
    for (const s of skip) s.traverse((o) => own.add(o));
    const solids: THREE.Object3D[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !own.has(m) && shown(m) && opaque(m.material)) solids.push(m);
    });
    ray.set(from, dir.clone().normalize());
    ray.near = 0;
    ray.far = far;
    return ray.intersectObjects(solids, false)[0]?.distance;
  };
}

/**
 * Whether the straight line between two points crosses nothing solid in `scene` (but what is in `skip`):
 * where the camera may go to see her and her hands while the steps play.
 */
export function sightOfScene(scene: THREE.Object3D, skip: readonly THREE.Object3D[]): (from: THREE.Vector3, to: THREE.Vector3) => boolean {
  const ray = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  return (from, to) => {
    const own = new Set<THREE.Object3D>();
    for (const s of skip) s.traverse((o) => own.add(o));
    const solids: THREE.Object3D[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !own.has(m) && shown(m) && opaque(m.material)) solids.push(m);
    });
    const d = from.distanceTo(to);
    ray.set(from, dir.copy(to).sub(from).normalize());
    ray.near = 0;
    ray.far = Math.max(0, d - 0.05);
    return ray.intersectObjects(solids, false).length === 0;
  };
}

export function clearOfScene(scene: THREE.Object3D, skip: readonly THREE.Object3D[]): (centre: THREE.Vector3, half: THREE.Vector3) => boolean {
  const box = new THREE.Box3();
  const mesh = new THREE.Box3();
  const size = new THREE.Vector3();
  return (centre, half) => {
    box.setFromCenterAndSize(centre, size.copy(half).multiplyScalar(2));
    const own = new Set<THREE.Object3D>();
    for (const s of skip) s.traverse((o) => own.add(o));
    let hit = false;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (hit || !m.isMesh || own.has(m) || !shown(m) || !opaque(m.material)) return;
      mesh.setFromObject(m);
      mesh.getSize(size);
      if (size.x > SHELL_M && size.z > SHELL_M) return;
      if (mesh.intersectsBox(box)) hit = true;
    });
    return !hit;
  };
}

/** A mesh by its name, or its first named ancestor, or its geometry and where it is (drawn metres). */
function meshLabel(m: THREE.Mesh): string {
  for (let o: THREE.Object3D | null = m; o; o = o.parent) if (o.name) return o.name;
  const p = m.getWorldPosition(new THREE.Vector3());
  return `${m.geometry.type} en (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;
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
      ...(inMesh ? { inside: meshLabel(inMesh) } : {}),
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
