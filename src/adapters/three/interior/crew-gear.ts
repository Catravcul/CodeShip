import * as THREE from "three";
import type { Face, Fixture, InteriorVolume } from "@modules/station/domain/interior";
import { FACE_NORMAL } from "@modules/station/domain/interior";
import { CEVIS_FIT } from "@modules/body/data/exercise-motions";
import type { GearKind } from "@modules/wellness/data/gear";
import type { CubeFigure } from "./figure";

/**
 * The real equipment of the crew areas as 3D models (docs/design/equipos.md; reglas.md §4.5): the T2 treadmill with
 * its harness, the CEVIS cycle, the ARED, the yoga mat with its foot loops, the storm shelter lined with water bags,
 * the WHC and the stowage bags. The AQH aquarium is aqh-model.ts.
 *
 * Local frame of every model: +y up from what it is fixed to (the deck, or the wall for the mat), +z where she faces
 * when she uses it (out of the wall for the rack-sized ones), origin on that surface. Where her body meets a machine
 * (belt, pedals, bar, foot loops) it is real size, as she is (src/core/scale.ts); the rest is drawn `k` times bigger.
 */
export interface CrewGear {
  readonly kind: GearKind;
  readonly root: THREE.Group;
  /** Her feet (her body frame's origin) in the model's frame while she uses it; she faces +z, up +y. */
  readonly feet: THREE.Vector3;
  /** Moves the machine with her (the belt, the cranks, the bar, the harness): `figure` while she is on it. */
  tick(dt: number, figure?: CubeFigure): void;
}

const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15, ...extra });
const STEEL = 0xb9c1ca;
const DARK = 0x39424e;
const BLACK = 0x1d2128;

function kit(g: THREE.Object3D) {
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, parent: THREE.Object3D = g) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const cyl = (r: number, h: number, x: number, y: number, z: number, m: THREE.Material, axis: "x" | "y" | "z" = "y", parent: THREE.Object3D = g) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 18), m);
    if (axis === "z") mesh.rotation.x = Math.PI / 2;
    if (axis === "x") mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  return { box, cyl };
}

/** A thin beam from a to b (re-aimed every frame for the moving ones). */
function beam(thick: number, m: THREE.Material): { mesh: THREE.Mesh; set(a: THREE.Vector3, b: THREE.Vector3): void } {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thick, 1, thick), m);
  const up = new THREE.Vector3(0, 1, 0);
  const d = new THREE.Vector3();
  return {
    mesh,
    set(a, b) {
      d.subVectors(b, a);
      const len = Math.max(1e-3, d.length());
      mesh.scale.set(1, len, 1);
      mesh.position.copy(a).addScaledVector(d, 0.5);
      mesh.quaternion.setFromUnitVectors(up, d.divideScalar(len));
    },
  };
}

/** Where a joint of her figure is, in the model's frame. */
const jointIn = (root: THREE.Object3D, o: THREE.Object3D, out: THREE.Vector3) => root.worldToLocal(o.getWorldPosition(out));

/** A belt texture: dark rubber with lighter cross ribs, so its motion shows. */
function beltTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 64;
  const x = c.getContext("2d")!;
  x.fillStyle = "#23272e";
  x.fillRect(0, 0, 16, 64);
  x.fillStyle = "#5a6270";
  for (let i = 0; i < 4; i++) x.fillRect(0, i * 16, 16, 3);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 6);
  return t;
}

/**
 * The T2 (COLBERT): a Woodway treadmill on vibration isolators, its side rails and display, and the harness
 * (Subject Load Device): a waist belt with shoulder straps and two bungees each side pulling her onto the belt.
 */
export function t2Model(k: number): CrewGear {
  const root = new THREE.Group();
  root.name = "gear-t2";
  const { box, cyl } = kit(root);
  const W = 0.8 * k;
  const L = 1.9 * k;
  const H = 0.28;
  box(W, H - 0.06, L, 0, 0.03 + (H - 0.06) / 2, 0, std(STEEL));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.04, 0.06, (sx * W) / 2.4, 0.03, (sz * L) / 2.4, std(0x2f7f8f));
  const tex = beltTexture();
  const belt = box(0.5, 0.01, L * 0.82, 0, H, 0, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  belt.name = "banda";
  for (const sx of [-1, 1]) {
    box(0.08, 0.04, L * 0.86, (sx * (0.25 + 0.06)), H + 0.01, 0, std(DARK));
    // Side rails up from the front corners, a handrail across them and the display.
    box(0.04, 1.0, 0.04, sx * (W / 2 - 0.05), H + 0.5, L / 2 - 0.12, std(STEEL));
  }
  cyl(0.02, W - 0.1, 0, H + 1.0, L / 2 - 0.12, std(DARK), "x");
  box(0.34, 0.2, 0.05, 0, H + 1.12, L / 2 - 0.1, std(0x0b1c2a));
  box(0.28, 0.14, 0.01, 0, H + 1.12, L / 2 - 0.13, new THREE.MeshBasicMaterial({ color: 0x3fd0ff }));
  // The harness on her and the bungees to the deck's sides (drawn only while she runs).
  const harness = new THREE.Group();
  const blue = std(0x1f4e8a, { roughness: 0.9 });
  box(0.42, 0.08, 0.27, 0, 0, 0, blue, harness);
  for (const sx of [-1, 1]) box(0.05, 0.5, 0.04, sx * 0.11, 0.3, 0.12, blue, harness).rotation.x = -0.12;
  harness.visible = false;
  root.add(harness);
  const cord = std(0xe8e2cf, { roughness: 0.9 });
  const bungees = [0, 1, 2, 3].map(() => {
    const b = beam(0.015, cord);
    b.mesh.visible = false;
    root.add(b.mesh);
    return b;
  });
  const anchors = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => new THREE.Vector3(sx * (0.25 + 0.06), H + 0.02, sz * 0.32)));
  const pelvis = new THREE.Vector3();
  const hook = new THREE.Vector3();
  const feet = new THREE.Vector3(0, H + 0.005, -0.1 * k);
  return {
    kind: "t2",
    root,
    feet,
    tick(dt, figure) {
      const ex = figure?.exercising;
      tex.offset.y -= ex ? (dt * ex.pace * 2.8) / ((L * 0.82) / tex.repeat.y) : 0;
      harness.visible = !!ex;
      for (const b of bungees) b.mesh.visible = !!ex;
      if (!ex || !figure) return;
      jointIn(root, figure.root, pelvis);
      harness.position.copy(pelvis);
      anchors.forEach((a, i) => bungees[i]!.set(a, hook.copy(pelvis).add(new THREE.Vector3(a.x > 0 ? 0.21 : -0.21, 0, a.z > 0 ? 0.04 : -0.04))));
    },
  };
}

/**
 * The CEVIS: a cycle ergometer with no seat on its vibration isolators, the flywheel housing with its band brake,
 * the cranks and the clip-in pedals, the handlebar and its display. Her feet ride the pedals, round with her.
 */
export function cevisModel(): CrewGear {
  const root = new THREE.Group();
  root.name = "gear-cevis";
  const { box, cyl } = kit(root);
  // Her body origin floats here (no seat): the crank axle and the bars are where the motion puts them.
  const feet = new THREE.Vector3(0, 0.15, -CEVIS_FIT.axleZ);
  const axle = new THREE.Vector3(0, feet.y + CEVIS_FIT.axleY, 0);
  box(0.46, 0.07, 0.85, 0, 0.035, -0.05, std(DARK));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(0.035, 0.05, sx * 0.18, 0.02, -0.05 + sz * 0.33, std(0x2f7f8f));
  box(0.12, axle.y - 0.07, 0.12, 0, 0.07 + (axle.y - 0.07) / 2, 0.08, std(STEEL));
  cyl(0.2, 0.1, 0, axle.y, 0, std(0x8fa8b8), "x");
  cyl(0.08, 0.11, 0, axle.y, 0, std(DARK), "x");
  const cranks = [-1, 1].map((sx) => {
    const g = new THREE.Group();
    g.position.set(sx * 0.09, axle.y, 0);
    root.add(g);
    box(0.025, CEVIS_FIT.crankM, 0.03, 0, CEVIS_FIT.crankM / 2, 0, std(BLACK), g);
    box(0.1, 0.02, 0.07, sx * (CEVIS_FIT.pedalX - 0.09), CEVIS_FIT.crankM, 0, std(0x2b2f36), g);
    return g;
  });
  const bar = feet.clone().add(new THREE.Vector3(0, CEVIS_FIT.barY, CEVIS_FIT.barZ));
  box(0.05, bar.y - axle.y, 0.05, 0, (bar.y + axle.y) / 2, bar.z + 0.06, std(STEEL));
  cyl(0.018, 2 * CEVIS_FIT.barX + 0.12, 0, bar.y, bar.z, std(BLACK), "x");
  for (const sx of [-1, 1]) cyl(0.025, 0.1, sx * CEVIS_FIT.barX, bar.y, bar.z, std(0x2b2f36), "x");
  box(0.24, 0.16, 0.04, 0, bar.y + 0.12, bar.z + 0.06, std(0x0b1c2a));
  box(0.19, 0.1, 0.01, 0, bar.y + 0.12, bar.z + 0.035, new THREE.MeshBasicMaterial({ color: 0x9ad48a }));
  return {
    kind: "cevis",
    root,
    feet,
    tick(_dt, figure) {
      const ex = figure?.exercising;
      if (!ex) return;
      const a = 2 * Math.PI * ex.phase;
      cranks[0]!.rotation.x = a;
      cranks[1]!.rotation.x = a + Math.PI;
    },
  };
}

/**
 * The ARED: its platform, the bar on a hinged arm, the two vacuum cylinders whose pistons make the load and the
 * flywheels that give it the inertia of free weights. The bar rides on her shoulders; the pistons follow the arm.
 */
export function aredModel(k: number): CrewGear {
  const root = new THREE.Group();
  root.name = "gear-ared";
  const { box, cyl } = kit(root);
  const W = 1.4 * k;
  const D = 1.0 * k;
  const P = 0.12;
  box(W, P, D, 0, P / 2, 0, std(STEEL));
  box(0.7, 0.01, 0.5, 0, P + 0.005, 0.05, std(BLACK, { roughness: 1 }));
  const back = -D / 2 + 0.12;
  for (const sx of [-1, 1]) {
    cyl(0.11, 1.0, sx * (W / 2 - 0.18), P + 0.5, back, std(0xdfe3e8, { metalness: 0.4 }));
    cyl(0.12, 0.04, sx * (W / 2 - 0.18), P + 1.0, back, std(DARK));
  }
  const wheels = [-1, 1].map((sx) => cyl(0.16, 0.05, sx * 0.3, P + 0.2, back, std(0x2f7f8f), "x"));
  const steel = std(0x8a929e);
  const rails = [-1, 1].map(() => {
    const b = beam(0.04, steel);
    root.add(b.mesh);
    return b;
  });
  const rods = [-1, 1].map(() => {
    const b = beam(0.03, std(0xf2f2f2, { metalness: 0.6 }));
    root.add(b.mesh);
    return b;
  });
  const bar = cyl(0.025, 1.3, 0, 1.45, 0, std(BLACK), "x");
  for (const sx of [-1, 1]) cyl(0.04, 0.14, sx * 0.48, 0, 0, std(0xc8c8c8), "x", bar);
  const hinge = [-1, 1].map((sx) => new THREE.Vector3(sx * 0.62, P + 0.15, back));
  const top = [-1, 1].map((sx) => new THREE.Vector3(sx * (W / 2 - 0.18), P + 1.02, back));
  const hl = new THREE.Vector3();
  const hr = new THREE.Vector3();
  const end = new THREE.Vector3();
  let lastY = 1.45;
  const place = () => {
    rails.forEach((r, i) => r.set(hinge[i]!, end.set((i ? 1 : -1) * 0.62, bar.position.y, bar.position.z)));
    rods.forEach((r, i) => r.set(top[i]!, end.set((i ? 1 : -1) * 0.62, bar.position.y, bar.position.z).lerp(hinge[i]!, 0.35)));
  };
  place();
  return {
    kind: "ared",
    root,
    feet: new THREE.Vector3(0, P + 0.01, 0.05),
    tick(dt, figure) {
      if (!figure?.exercising) return;
      // The bar at her hands (both on it).
      root.worldToLocal(figure.handWorld(0, hl));
      root.worldToLocal(figure.handWorld(1, hr));
      bar.position.copy(hl).add(hr).multiplyScalar(0.5);
      const v = (bar.position.y - lastY) / Math.max(dt, 1e-3);
      lastY = bar.position.y;
      for (const w of wheels) w.rotation.x += v * dt * 6;
      place();
    },
  };
}

/**
 * The yoga mat strapped flat to its wall (or deck): the pad, its four corner straps and two foot loops at the
 * middle, where her feet go in 0 g. Local +y is out of the wall; the mat's length runs along +z.
 */
export function matModel(): CrewGear {
  const root = new THREE.Group();
  root.name = "gear-esterilla";
  const { box } = kit(root);
  const purple = std(0x7a4fb0, { roughness: 0.95, metalness: 0 });
  const pad = box(0.6, 0.012, 1.8, 0, 0.006, 0, purple);
  pad.name = "esterilla";
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.08, 0.016, 0.03, sx * 0.31, 0.008, sz * 0.86, std(0x2b2f36));
  const loop = std(0xd8c8f0, { roughness: 0.9 });
  for (const sx of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 14, Math.PI), loop);
    t.rotation.y = Math.PI / 2;
    t.position.set(sx * 0.1, 0.012, 0.02);
    root.add(t);
  }
  return { kind: "esterilla", root, feet: new THREE.Vector3(0, 0.013, 0), tick() {} };
}

/**
 * The storm shelter (licencia: the RadWorks water-wall concept; Orion builds its own from stowage): a rack-sized
 * recess lined on every side with water bags (blue pillows), a fabric door rolled up at the top, a dosimeter and a
 * strap to hold on inside. Local +z out of the wall; the recess goes back into it.
 */
export function shelterModel(k: number, size: { w: number; h: number; d: number }): CrewGear {
  const root = new THREE.Group();
  root.name = "gear-refugio";
  const { box } = kit(root);
  const W = size.w * k;
  const H = size.h * k;
  // It stands out of its wall into the aisle (a rack's depth): the walls of the module would hide a recess.
  const D = size.d * k;
  const wall = std(0xb9c1ca);
  box(W, H, 0.03, 0, 0, 0.015, wall);
  for (const sx of [-1, 1]) box(0.03, H, D, (sx * W) / 2, 0, D / 2, wall);
  for (const sy of [-1, 1]) box(W, 0.03, D, 0, (sy * H) / 2, D / 2, wall);
  // Water bags: on the back, the sides, the top and the bottom (blue pillows, 10 g/cm² of water).
  const bag = std(0x3d7fd1, { roughness: 0.35, metalness: 0 });
  const bagG = new THREE.BoxGeometry(1, 1, 1);
  const put = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(bagG, bag);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    root.add(m);
  };
  const T = 0.1 * k;
  const cols = 3;
  const rows = 6;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) put(W / cols - 0.03, H / rows - 0.03, T, -W / 2 + (i + 0.5) * (W / cols), -H / 2 + (j + 0.5) * (H / rows), 0.03 + T / 2);
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) for (let j = 0; j < rows; j++) put(T, H / rows - 0.03, D / 2 - 0.03, sx * (W / 2 - T / 2 - 0.02), -H / 2 + (j + 0.5) * (H / rows), (i + 0.5) * (D / 2));
  for (const sy of [-1, 1]) for (let i = 0; i < cols; i++) put(W / cols - 0.03, T, D - 0.05, -W / 2 + (i + 0.5) * (W / cols), sy * (H / 2 - T / 2 - 0.02), D / 2);
  // The door: fabric rolled up over the opening, a yellow frame round it.
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, W - 0.1, 12), std(0x5a6270, { roughness: 1 }));
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, H / 2 - 0.12, D + 0.05);
  root.add(roll);
  for (const sx of [-1, 1]) box(0.06, H, 0.06, (sx * (W + 0.06)) / 2, 0, D, std(0xffc84a));
  // A dosimeter reader on the inside wall and a strap across the back to hold on to.
  box(0.04, 0.1, 0.16, W / 2 - T - 0.04, 0.25, D * 0.6, std(0x0b1c2a));
  box(0.01, 0.06, 0.12, W / 2 - T - 0.065, 0.25, D * 0.6, new THREE.MeshBasicMaterial({ color: 0x9ad48a }));
  box(W * 0.6, 0.05, 0.02, 0, 0.15, T + 0.05, std(0x2b2f36));
  return { kind: "refugio", root, feet: new THREE.Vector3(0, -H / 2 + T + 0.3, D * 0.45), tick() {} };
}

/** The WHC: a rack-sized cubicle with its curtain, the urine funnel on its hose, the small seat with thigh bars. */
export function whcModel(k: number, size: { w: number; h: number; d: number }): CrewGear {
  const root = new THREE.Group();
  root.name = "gear-whc";
  const { box, cyl } = kit(root);
  const W = size.w * k;
  const H = size.h * k;
  box(W, H, 0.04, 0, 0, -0.02, std(0xe6e9ec));
  // Seat (a small bowl), its thigh bars and footholds.
  cyl(0.17, 0.12, 0, -0.15, 0.16, std(0xf2f2f2), "y");
  cyl(0.11, 0.13, 0, -0.15, 0.16, std(BLACK), "y");
  for (const sx of [-1, 1]) cyl(0.02, 0.4, sx * 0.22, 0.05, 0.22, std(STEEL), "z");
  box(0.5, 0.05, 0.12, 0, -H / 2 + 0.2, 0.3, std(DARK));
  // The funnel and its hose, on a hook.
  const funnel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 14, 1, true), std(0xffd27f, { side: THREE.DoubleSide }));
  funnel.position.set(W / 2 - 0.22, 0.35, 0.1);
  funnel.rotation.x = Math.PI;
  root.add(funnel);
  cyl(0.02, 0.5, W / 2 - 0.22, 0.03, 0.08, std(0xdfe3e8));
  box(0.32, 0.2, 0.08, -W / 2 + 0.24, 0.45, 0.06, std(0x8a929e));
  // Curtain panels folded at the sides, and a handrail.
  for (const sx of [-1, 1]) box(0.04, H * 0.9, 0.3, (sx * (W / 2 - 0.02)), 0, 0.15, std(0x4c7f77, { transparent: true, opacity: 0.85 }));
  cyl(0.015, W * 0.7, 0, H / 2 - 0.25, 0.08, std(0xffc84a), "x");
  return { kind: "whc", root, feet: new THREE.Vector3(0, -H / 2, 0.6), tick() {} };
}

/** The stowage: white cargo transfer bags packed in the bay and held with straps. */
export function stowageModel(k: number, size: { w: number; h: number; d: number }): CrewGear {
  const root = new THREE.Group();
  root.name = "gear-estiba";
  const { box } = kit(root);
  const W = size.w * k;
  const H = size.h * k;
  const D = Math.min(size.d * k, 0.9);
  box(W, H, 0.03, 0, 0, -D, std(0xb9c1ca));
  const white = std(0xf1efe8, { roughness: 1, metalness: 0 });
  const cols = Math.max(1, Math.round(W / 0.5));
  const rows = Math.max(1, Math.round(H / 0.25));
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const b = box(W / cols - 0.03, H / rows - 0.03, D - 0.05, -W / 2 + (i + 0.5) * (W / cols), -H / 2 + (j + 0.5) * (H / rows), -D / 2, white);
      b.scale.x = 0.94 + ((i * 7 + j * 3) % 5) * 0.012;
      box(0.12, 0.04, 0.005, b.position.x, b.position.y + 0.02, 0.0, std(0x2f5d9a));
    }
  for (const sx of [-0.3, 0.3]) box(0.05, H, 0.02, sx * W, 0, 0.02, std(0x2b2f36));
  return { kind: "estiba", root, feet: new THREE.Vector3(0, -H / 2, 0.6), tick() {} };
}

/**
 * Where a gear model stands for its fixture: on the deck under a wall fixture for the exercise machines (the T2 on
 * the deck along the module; the CEVIS along the wall so she is seen side on; the ARED facing the aisle), flat on its
 * wall for the mat, and on the wall's front for the rack-sized ones. Returns its origin, up and facing (+z) in the
 * plan's frame (drawn metres).
 */
export function gearPose(f: Fixture, vol: InteriorVolume, kind: GearKind): { at: THREE.Vector3; up: THREE.Vector3; forward: THREE.Vector3 } {
  const n = FACE_NORMAL[f.face];
  const into = new THREE.Vector3(n.x, n.y, n.z);
  const aisle = into.clone().negate();
  const at = new THREE.Vector3(f.at.x, f.at.y, f.at.z);
  const floor = vol.centre.y - vol.half.y;
  const alongX = vol.half.x >= vol.half.z;
  const long = alongX ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const up = new THREE.Vector3(0, 1, 0);
  if (kind === "esterilla") {
    const fw = matForward(f.face, vol);
    return { at, up: aisle, forward: fw };
  }
  // The T2 runs along the longer side of its footprint (the plan says which way it lies).
  if (kind === "t2") return { at: at.setY(floor), up, forward: Math.abs(f.size.x) > Math.abs(f.size.z) ? new THREE.Vector3(1, 0, 0) : Math.abs(f.size.z) > Math.abs(f.size.x) ? new THREE.Vector3(0, 0, 1) : long };
  if (kind === "cevis" || kind === "ared") {
    const wallFloor = isWall(f.face) ? at.clone().setY(floor) : at.clone();
    if (kind === "ared") return { at: wallFloor.addScaledVector(aisle, 0.75), up, forward: aisle };
    const along = new THREE.Vector3().crossVectors(up, aisle).normalize();
    return { at: wallFloor.addScaledVector(aisle, 0.5), up, forward: along };
  }
  return { at, up, forward: isWall(f.face) ? aisle : new THREE.Vector3(0, 0, 1) };
}

const isWall = (f: Face) => f !== "suelo" && f !== "techo";

/**
 * Along which way a wall mat runs (her head-to-feet line when she lies on it): across the wall, the way with less
 * room in the module, so the camera can stand off to her side along the longer way.
 */
export function matForward(face: Face, vol: InteriorVolume): THREE.Vector3 {
  const n = FACE_NORMAL[face];
  const inPlane = (["x", "y", "z"] as const).filter((a) => Math.abs(n[a]) < 0.5);
  const roomy = inPlane.reduce((a, b) => (vol.half[a] >= vol.half[b] ? a : b));
  const other = inPlane.find((a) => a !== roomy)!;
  const v = new THREE.Vector3();
  v[other] = 1;
  return v;
}

/** Puts a model at `at`, its +y along `up` and +z along `forward`. */
export function placeGear(g: CrewGear, at: THREE.Vector3, up: THREE.Vector3, forward: THREE.Vector3): void {
  const y = up.clone().normalize();
  const z = forward.clone().sub(y.clone().multiplyScalar(forward.dot(y))).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  g.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  g.root.position.copy(at);
}

/** The model of a fixture's gear (the AQH is built by aqh-model.ts). */
export function gearModel(kind: Exclude<GearKind, "aqh">, k: number, size: { w: number; h: number; d: number }): CrewGear {
  switch (kind) {
    case "t2":
      return t2Model(k);
    case "cevis":
      return cevisModel();
    case "ared":
      return aredModel(k);
    case "esterilla":
      return matModel();
    case "refugio":
      return shelterModel(k, size);
    case "whc":
      return whcModel(k, size);
    case "estiba":
      return stowageModel(k, size);
  }
}
