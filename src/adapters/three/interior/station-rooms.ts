import * as THREE from "three";
import { Vec3 } from "@core/math/vec3";
import type { MachineId } from "@modules/station/domain/blueprint";
import { FACE_NORMAL, fixtureBox, longAxis, type Box, type Face, type Fixture, type InteriorVolume, type StationInteriorPlan } from "@modules/station/domain/interior";
import { textSign } from "./sign";
import { CubeFigure } from "./figure";
import { buildStarfield } from "../starfield";

/**
 * The station's interior in 3D, in the station's body frame (y = overhead, x = starboard, −z = forward):
 * the aisles of the nodes, the habitat and the fabrication module lined with rack fronts, the hatches,
 * the airlock and the open hangar with its racks and probe cradles (docs/design/interiores.md §5).
 */
export interface StationRooms {
  readonly group: THREE.Group;
  /** Meshes that can be tapped, with `userData.fixture` set to the fixture id. */
  readonly pickables: THREE.Object3D[];
  /** Lamps of the machines, lit while their queue works. */
  readonly lamps: Map<MachineId, THREE.Mesh>;
  /** Crates and probes in the hangar (rebuilt by the caller). */
  readonly store: THREE.Group;
  /** Every label (the caller hides the ones too close to the camera). */
  readonly signs: THREE.Sprite[];
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const v3 = (p: { x: number; y: number; z: number }) => V(p.x, p.y, p.z);
const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });

/** Basis (u, v, inward normal) of each face of a box, with u × v = n. */
const BASIS: Readonly<Record<Face, [THREE.Vector3, THREE.Vector3]>> = {
  suelo: [V(0, 0, 1), V(1, 0, 0)],
  techo: [V(1, 0, 0), V(0, 0, 1)],
  babor: [V(0, 1, 0), V(0, 0, 1)],
  estribor: [V(0, 0, 1), V(0, 1, 0)],
  proa: [V(1, 0, 0), V(0, 1, 0)],
  popa: [V(0, 1, 0), V(1, 0, 0)],
};
const FACES: readonly Face[] = ["suelo", "techo", "babor", "estribor", "proa", "popa"];
const axisOf = (n: THREE.Vector3): "x" | "y" | "z" => (Math.abs(n.x) > 0.5 ? "x" : Math.abs(n.y) > 0.5 ? "y" : "z");

interface Rect {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

/** A flat rectangle with rectangular holes, centred at `c`, spanning ±hu along u and ±hv along v; it faces u × v. */
function rectWithHoles(c: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, hu: number, hv: number, holes: Rect[], m: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-hu, -hv);
  shape.lineTo(hu, -hv);
  shape.lineTo(hu, hv);
  shape.lineTo(-hu, hv);
  shape.closePath();
  const inside = (a: Rect, b: Rect) => a.u0 >= b.u0 && a.u1 <= b.u1 && a.v0 >= b.v0 && a.v1 <= b.v1;
  const kept = holes
    .map((h) => ({ u0: Math.max(h.u0, -hu + 0.02), u1: Math.min(h.u1, hu - 0.02), v0: Math.max(h.v0, -hv + 0.02), v1: Math.min(h.v1, hv - 0.02) }))
    .filter((h) => h.u1 > h.u0 && h.v1 > h.v0);
  for (const h of kept.filter((h, i) => !kept.some((o, j) => j !== i && inside(h, o) && !(inside(o, h) && j > i)))) {
    const p = new THREE.Path();
    p.moveTo(h.u0, h.v0);
    p.lineTo(h.u0, h.v1);
    p.lineTo(h.u1, h.v1);
    p.lineTo(h.u1, h.v0);
    p.closePath();
    shape.holes.push(p);
  }
  const geo = new THREE.ShapeGeometry(shape);
  const n = new THREE.Vector3().crossVectors(u, v);
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, n).setPosition(c));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, m);
}

/** Centre of a box face and its half-sizes along the face's u and v. */
function faceOf(b: Box, f: Face): { c: THREE.Vector3; hu: number; hv: number; u: THREE.Vector3; v: THREE.Vector3; n: THREE.Vector3 } {
  const n = v3(FACE_NORMAL[f]).negate(); // inward
  const [u, v] = BASIS[f];
  const half = v3(b.half);
  const c = v3(b.centre).addScaledVector(n, -half.dot(V(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z))));
  const hu = Math.abs(half.dot(u));
  const hv = Math.abs(half.dot(v));
  return { c, hu, hv, u, v, n };
}

/** Holes in a face where another volume (a hatch, a tunnel, the airlock) passes through it. */
function holesIn(face: ReturnType<typeof faceOf>, self: InteriorVolume, all: readonly InteriorVolume[]): Rect[] {
  const ax = axisOf(face.n);
  const at = face.c[ax];
  return all
    .filter((o) => o !== self && (o.kind === "escotilla" || o.kind === "esclusa"))
    .filter((o) => o.centre[ax] - o.half[ax] < at - 1e-3 && o.centre[ax] + o.half[ax] > at + 1e-3)
    .map((o) => {
      const d = v3(o.centre).sub(face.c);
      const cu = d.dot(face.u);
      const cv = d.dot(face.v);
      const hu = Math.abs(v3(o.half).dot(face.u));
      const hv = Math.abs(v3(o.half).dot(face.v));
      return { u0: cu - hu, u1: cu + hu, v0: cv - hv, v1: cv + hv };
    })
    .filter((r) => r.u1 > -face.hu && r.u0 < face.hu && r.v1 > -face.hv && r.v0 < face.hv);
}

/** Flat text painted on a wall: `up` is the text's up, `n` the wall's inward normal. */
function wallText(text: string, at: THREE.Vector3, up: THREE.Vector3, n: THREE.Vector3, height = 0.16, color = "#2b3340"): THREE.Mesh {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const font = "bold 56px system-ui, sans-serif";
  ctx.font = font;
  c.width = Math.ceil(ctx.measureText(text).width) + 24;
  c.height = 72;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 12, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry((height * c.width) / c.height, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  const right = new THREE.Vector3().crossVectors(up, n);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, n));
  m.position.copy(at).addScaledVector(n, 0.01);
  return m;
}

const FACE_NAME: Readonly<Record<Face, string>> = { suelo: "SUELO", techo: "TECHO", babor: "BABOR", estribor: "ESTRIBOR", proa: "PROA", popa: "POPA" };

/** Look of each fixture's front: panel colour, accent and optional lamp/window colour. */
const STYLE: Readonly<Record<string, { panel: number; accent: number; glow?: number }>> = {
  "salir-sonda": { panel: 0xcfd6de, accent: 0xffc84a },
  "salir-nodriza": { panel: 0xcfd6de, accent: 0xffc84a },
  "carga-nodo2": { panel: 0xe8e2cf, accent: 0x9a8f73 },
  ejercicio: { panel: 0x9fb0c2, accent: 0x2f7f8f },
  aseo: { panel: 0xa9c9c2, accent: 0x4c7f77 },
  cocina: { panel: 0xd8d2c4, accent: 0xb36a3a, glow: 0x7fdcff },
  mesa: { panel: 0xb8bec6, accent: 0x5a6270 },
  botiquin: { panel: 0xf2f2f2, accent: 0xd8282a },
  "camarote-babor": { panel: 0x3b6ea8, accent: 0xdfe6ee },
  "camarote-estribor": { panel: 0x8a5aa8, accent: 0xdfe6ee },
  "puerto-babor": { panel: 0x9aa6b6, accent: 0x5a6270 },
  "puerto-estribor": { panel: 0x9aa6b6, accent: 0x5a6270 },
  refineria: { panel: 0x56606e, accent: 0x8a929e, glow: 0xff7a2a },
  guantera: { panel: 0x7f8a99, accent: 0x111111, glow: 0x9fd8ff },
  fundicion: { panel: 0x6b5a4a, accent: 0x8a929e, glow: 0xffb347 },
  impresora: { panel: 0x3d4552, accent: 0x9fd8ff, glow: 0x2fd0ff },
  "esclusa-carga": { panel: 0x9aa6b6, accent: 0xffc84a },
  planta: { panel: 0x4f6b7a, accent: 0x9fd8ff, glow: 0x7fffd4 },
  "reactor-carbonilo": { panel: 0x5d5466, accent: 0xb0a0c8, glow: 0xffd27f },
  "soldadora-haz": { panel: 0x3a4250, accent: 0x7fdcff, glow: 0x6f8cff },
  "celda-compuestos": { panel: 0x2b2f36, accent: 0x9aa6b6, glow: 0xffb347 },
  "impresora-grande": { panel: 0x3d4552, accent: 0x9fd8ff, glow: 0x2fd0ff },
  "planta-grande": { panel: 0x4f6b7a, accent: 0x9fd8ff, glow: 0x7fffd4 },
  "campos-cultivo": { panel: 0x2f5a35, accent: 0x9ad48a, glow: 0xe070ff },
  trajes: { panel: 0x7f8a99, accent: 0xf2f2f2 },
  "consola-hangar": { panel: 0x0b1c2a, accent: 0x7fdcff, glow: 0x7fdcff },
  "consola-bahia": { panel: 0x0b1c2a, accent: 0xffb347, glow: 0x7fdcff },
};

/** Basis (u across, v up the front, u × v = inward normal) of a fixture's front: upright on the walls. */
const FRONT: Readonly<Record<Face, [THREE.Vector3, THREE.Vector3]>> = {
  babor: [V(0, 0, -1), V(0, 1, 0)],
  estribor: [V(0, 0, 1), V(0, 1, 0)],
  proa: [V(1, 0, 0), V(0, 1, 0)],
  popa: [V(-1, 0, 0), V(0, 1, 0)],
  suelo: [V(1, 0, 0), V(0, 0, -1)],
  techo: [V(1, 0, 0), V(0, 0, 1)],
};

/** The front of a wall fixture: a panel just inside the aisle with an accent and, for machines, a lamp. */
function fixtureFront(f: Fixture, lamps: Map<MachineId, THREE.Mesh>): THREE.Group {
  const g = new THREE.Group();
  const st = STYLE[f.id] ?? { panel: 0x9aa6b6, accent: 0x5a6270 };
  const n = v3(FACE_NORMAL[f.face]).negate();
  const [u, v] = FRONT[f.face];
  const size = v3(f.size);
  const w = Math.abs(size.dot(u));
  const h = Math.abs(size.dot(v));
  const basis = new THREE.Matrix4().makeBasis(u, v, n);
  const q = new THREE.Quaternion().setFromRotationMatrix(basis);
  const at = v3(f.at);
  const plate = (pw: number, ph: number, du: number, dv: number, out: number, color: number, basic = false, depth = 0.04) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, depth), basic ? new THREE.MeshBasicMaterial({ color }) : mat(color));
    m.quaternion.copy(q);
    m.position.copy(at).addScaledVector(u, du).addScaledVector(v, dv).addScaledVector(n, out);
    g.add(m);
    return m;
  };
  const body = plate(w, h, 0, 0, 0.02, st.panel);
  body.userData.fixture = f.id;
  if (f.id === "campos-cultivo") {
    // Crop trays: green shelves of plants under pink grow lights.
    const tiers = Math.max(2, Math.floor(h / 0.7));
    for (let t = 0; t < tiers; t++) {
      const dv = -h / 2 + (t + 0.5) * (h / tiers);
      plate(w * 0.96, 0.05, 0, dv + 0.25, 0.06, 0xe070ff, true, 0.02);
      plate(w * 0.94, 0.22, 0, dv - 0.05, 0.12, 0x4caf50, false, 0.18);
    }
  } else if (f.id.startsWith("salir") || f.id.startsWith("puerto") || f.id === "esclusa-carga") {
    // Hatch: frame and a handle.
    for (const s of [-1, 1]) {
      plate(0.08, h, (s * (w - 0.08)) / 2, 0, 0.05, st.accent);
      plate(w, 0.08, 0, (s * (h - 0.08)) / 2, 0.05, st.accent);
    }
    plate(w * 0.4, 0.06, 0, 0, 0.08, 0x333a44);
  } else if (f.id === "mesa") {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.35, 10), mat(0x5a6270));
    leg.position.copy(at).add(V(0, -0.2, 0));
    g.add(leg);
    for (const s of [-1, 1]) plate(w * 0.9, 0.04, 0, s * h * 0.3, 0.04, st.accent);
  } else {
    // Rack-like front: a band of accent and, for machines, a window that glows.
    plate(w * 0.9, 0.08, 0, h / 2 - 0.12, 0.05, st.accent);
    if (st.glow) {
      const lamp = plate(w * 0.55, Math.min(0.4, h * 0.3), 0, h * 0.05, 0.05, st.glow, true, 0.02);
      if (f.machine) lamps.set(f.machine, lamp);
    }
    if (f.id === "guantera") for (const s of [-1, 1]) plate(0.3, 0.3, s * 0.25, -h * 0.2, 0.05, 0x111111);
    if (f.id.startsWith("camarote")) plate(0.12, h * 0.6, w * 0.35, 0, 0.05, st.accent);
    if (f.id === "trajes")
      for (const s of [-1, 1]) {
        // Two suits hung on the wall, like the EMUs in Quest's crew lock.
        const suit = new CubeFigure(0xf2f2f2, 0xe9ecef);
        suit.update(1, 10);
        // CubeFigure sets its own root's height and pitch: hang it from a holder.
        const holder = new THREE.Group();
        holder.add(suit.root);
        holder.scale.setScalar(0.85);
        holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(V(0, 1, 0), n), V(0, 1, 0), n));
        holder.position.copy(at).addScaledVector(u, s * w * 0.27).addScaledVector(n, 0.2).add(V(0, -0.85, 0));
        g.add(holder);
      }
  }
  // Name above the fixture (or just off a deck/overhead one), always facing the camera.
  const sign = textSign(f.label);
  sign.scale.multiplyScalar(f.volume === "hangar" ? 1.2 : 0.6);
  const off = f.face === "techo" || f.face === "suelo" ? at.clone().addScaledVector(n, 0.25) : at.clone().addScaledVector(n, 0.2).addScaledVector(V(0, 1, 0), Math.min(h / 2 + 0.05, 0.75));
  sign.position.copy(off);
  g.add(sign);
  return g;
}

/** The hangar's racks, door frame and floodlights (crates and probes go in `store`). */
function hangarDressing(h: InteriorVolume, plan: StationInteriorPlan, g: THREE.Group): void {
  const steel = mat(0x56606e, { metalness: 0.4 });
  for (const f of plan.fixtures.filter((x) => x.id.startsWith("estante"))) {
    const b = fixtureBox(f);
    const c = v3(b.centre);
    const half = v3(b.half);
    // Uprights and three shelves.
    for (const dz of [-1, -0.5, 0, 0.5, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2 * half.y, 0.12), steel);
      post.position.set(c.x + Math.sign(-c.x) * half.x, c.y, c.z + dz * half.z);
      g.add(post);
    }
    for (let s = 0; s < 3; s++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(2 * half.x, 0.08, 2 * half.z), steel);
      shelf.position.set(c.x, c.y - half.y + 0.5 + s * 2.1, c.z);
      shelf.userData.fixture = f.id;
      g.add(shelf);
    }
    const sign = textSign("Piezas de repuesto");
    sign.scale.multiplyScalar(1.6);
    sign.position.set(c.x + Math.sign(-c.x) * (half.x + 0.3), c.y + half.y + 0.6, c.z);
    g.add(sign);
  }
  // Cradles on the deck.
  for (const p of plan.storage.cradles) {
    const cr = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 3.4), mat(0x3d4552));
    cr.position.set(p.x, h.centre.y - h.half.y + 0.15, p.z);
    cr.userData.fixture = "cunas";
    g.add(cr);
  }
  const cunas = textSign("Sondas fabricadas");
  cunas.scale.multiplyScalar(1.6);
  const cf = plan.fixtures.find((f) => f.id === "cunas");
  if (cf) cunas.position.set(cf.at.x, cf.at.y + 1.6, cf.at.z - 4.5);
  g.add(cunas);
  // The open door at the aft end, with its yellow frame and stars beyond.
  const z = h.centre.z + h.half.z;
  const frame = new THREE.MeshBasicMaterial({ color: 0xffd27f });
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2 * h.half.y, 0.3), frame);
    side.position.set(s * (h.half.x - 0.15), h.centre.y, z);
    g.add(side);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2 * h.half.x, 0.3, 0.3), frame);
    bar.position.set(0, h.centre.y + s * (h.half.y - 0.15), z);
    g.add(bar);
  }
  const door = textSign("Puerta del hangar · abierta al vacío");
  door.scale.multiplyScalar(2.0);
  door.position.set(0, h.centre.y + h.half.y - 1.2, z - 0.4);
  g.add(door);
  const stars = buildStarfield(400, 1500);
  stars.position.copy(v3(h.centre));
  g.add(stars);
  for (let i = -1; i <= 1; i++) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.5), new THREE.MeshBasicMaterial({ color: 0xeef4ff }));
    lamp.position.set(i * 6, h.centre.y + h.half.y - 0.1, h.centre.z);
    g.add(lamp);
    const light = new THREE.PointLight(0xeef4ff, 160, 40, 1.4);
    light.position.set(i * 6, h.centre.y + h.half.y - 1, h.centre.z);
    g.add(light);
  }
}

export function buildStationRooms(plan: StationInteriorPlan): StationRooms {
  const group = new THREE.Group();
  const lamps = new Map<MachineId, THREE.Mesh>();
  const pickables: THREE.Object3D[] = [];
  const faceMat: Readonly<Record<Face, THREE.Material>> = {
    suelo: mat(0x58626f),
    techo: mat(0xe4e9ef),
    babor: mat(0xb3bdc8),
    estribor: mat(0xb3bdc8),
    proa: mat(0x98a3b0),
    popa: mat(0x98a3b0),
  };
  const hangarMat = mat(0x2a3140, { roughness: 0.9 });
  const tubeMat = mat(0x9aa6b6, { metalness: 0.4 });
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc84a });
  const strip = new THREE.MeshBasicMaterial({ color: 0xf4f8ff });

  for (const vol of plan.volumes) {
    if (vol.kind === "escotilla") {
      // A short square tube along its axis, and a yellow frame where it meets each bulkhead.
      const ax = vol.through ?? "z";
      for (const f of FACES) {
        if (axisOf(v3(FACE_NORMAL[f])) === ax) continue;
        const fc = faceOf(vol, f);
        group.add(rectWithHoles(fc.c, fc.u, fc.v, fc.hu, fc.hv, [], tubeMat));
      }
      continue;
    }
    const hangar = vol.kind === "hangar";
    const k = longAxis(vol);
    for (const f of FACES) {
      if (hangar && f === "popa") continue; // the door is open
      const fc = faceOf(vol, f);
      const m = rectWithHoles(fc.c, fc.u, fc.v, fc.hu, fc.hv, holesIn(fc, vol, plan.volumes), hangar ? hangarMat : faceMat[f]);
      group.add(m);
      // Local-vertical labels near both ends of each long wall (V2 8011: cues to find one's way).
      if (!hangar && axisOf(fc.n) !== k && vol.half[k] > 1) {
        for (const s of [-1, 1]) {
          // Upright for someone facing forward: on the deck the text's top points forward, on the overhead aft.
          const up = f === "suelo" ? V(0, 0, -1) : f === "techo" ? V(0, 0, 1) : V(0, 1, 0);
          const along = vol.centre[k] + s * (vol.half[k] - 0.45);
          const base = f === "suelo" || f === "techo" ? fc.c.clone() : V(fc.c.x, vol.centre.y + vol.half.y - 0.14, fc.c.z);
          base[k] = along;
          group.add(wallText(`${vol.code} · ${FACE_NAME[f]}`, base, up, fc.n));
        }
      }
    }
    if (hangar) {
      const grid = new THREE.GridHelper(2 * vol.half.x, 20, 0x3d4c66, 0x283244);
      grid.scale.z = vol.half.z / vol.half.x;
      grid.position.set(vol.centre.x, vol.centre.y - vol.half.y + 0.02, vol.centre.z);
      group.add(grid);
      hangarDressing(vol, plan, group);
      continue;
    }
    // Seams between rack bays (ISPR racks are 1,05 m wide) on the four long faces, along the module.
    const across = k === "z" ? "x" : "z";
    const bays = Math.max(1, Math.round((2 * vol.half[k]) / 1.05));
    const seamMat = mat(0x6f7a88);
    for (let i = 1; i < bays; i++) {
      const at = vol.centre[k] - vol.half[k] + (i * 2 * vol.half[k]) / bays;
      for (const [w, h, a, y] of [
        [0.03, 2 * vol.half.y, vol.half[across] - 0.01, 0],
        [0.03, 2 * vol.half.y, -vol.half[across] + 0.01, 0],
        [2 * vol.half[across], 0.03, 0, vol.half.y - 0.01],
        [2 * vol.half[across], 0.03, 0, -vol.half.y + 0.01],
      ] as const) {
        const seam = new THREE.Mesh(k === "z" ? new THREE.BoxGeometry(w, h, 0.03) : new THREE.BoxGeometry(0.03, h, w), seamMat);
        seam.position.set(vol.centre.x, vol.centre.y + y, vol.centre.z);
        seam.position[across] += a;
        seam.position[k] = at;
        group.add(seam);
      }
    }
    // Light strips on the overhead and a lamp, like the ISS's overhead lights.
    for (const s of [-1, 1]) {
      const len = 2 * vol.half[k] - 0.8;
      const l = new THREE.Mesh(k === "z" ? new THREE.BoxGeometry(0.12, 0.02, len) : new THREE.BoxGeometry(len, 0.02, 0.12), strip);
      l.position.set(vol.centre.x, vol.centre.y + vol.half.y - 0.02, vol.centre.z);
      l.position[across] += s * vol.half[across] * 0.5;
      group.add(l);
    }
    const light = new THREE.PointLight(0xf2f6ff, 6, 2 * vol.half[k] + 4, 1.4);
    light.position.set(vol.centre.x, vol.centre.y + vol.half.y - 0.3, vol.centre.z);
    group.add(light);
    // Module sign at one end.
    if (vol.kind !== "esclusa") {
      const sign = textSign(vol.label);
      sign.scale.multiplyScalar(0.7);
      sign.position.set(vol.centre.x, vol.centre.y + vol.half.y - 0.35, vol.centre.z);
      // Along the stack it hangs at the forward end, as before; on a side module at the node 1 end.
      if (k === "z") sign.position.z = vol.centre.z - vol.half.z + 0.35;
      else sign.position.x = vol.centre.x - Math.sign(vol.centre.x) * (vol.half.x - 0.35);
      group.add(sign);
    }
  }
  // Yellow frames on every hatch's bulkhead planes.
  for (const h of plan.volumes.filter((v) => v.kind === "escotilla")) {
    const ax = h.through ?? "z";
    const [u, v] = ax === "y" ? [V(1, 0, 0), V(0, 0, 1)] : ax === "x" ? [V(0, 1, 0), V(0, 0, 1)] : [V(1, 0, 0), V(0, 1, 0)];
    const hu = Math.abs(v3(h.half).dot(u));
    const hv = Math.abs(v3(h.half).dot(v));
    const axis = ax === "x" ? V(1, 0, 0) : ax === "y" ? V(0, 1, 0) : V(0, 0, 1);
    const bar = (dir: THREE.Vector3, len: number) => {
      const d = V(Math.abs(dir.x), Math.abs(dir.y), Math.abs(dir.z)).multiplyScalar(len - 0.05).addScalar(0.05);
      return new THREE.Mesh(new THREE.BoxGeometry(d.x, d.y, d.z), ringMat);
    };
    for (const end of [-1, 1]) {
      const c = v3(h.centre).addScaledVector(axis, end * Math.abs(v3(h.half).dot(axis)) * 0.4);
      for (const s of [-1, 1]) {
        const a = bar(u, 2 * hu);
        a.position.copy(c).addScaledVector(v, s * hv);
        const b = bar(v, 2 * hv);
        b.position.copy(c).addScaledVector(u, s * hu);
        group.add(a, b);
      }
    }
  }
  // The airlock's shell seen from the hangar, with the outer hatch in its aft face.
  const lock = plan.volumes.find((v) => v.kind === "esclusa");
  const outer = plan.volumes.find((v) => v.needs === "traje");
  if (lock) {
    const shell: Box = { centre: lock.centre, half: lock.half.add(new Vec3(0.2, 0.2, 0)) };
    const hull = mat(0xdfe3e8);
    for (const f of FACES) {
      if (f === "proa") continue;
      const fc = faceOf(shell, f);
      // Outward-facing: flip the basis (v, u).
      const holes = f === "popa" && outer ? holesIn(fc, lock, [outer]).map((r) => ({ u0: r.v0, u1: r.v1, v0: r.u0, v1: r.u1 })) : [];
      group.add(rectWithHoles(fc.c, fc.v, fc.u, fc.hv, fc.hu, holes, hull));
    }
    const sign = textSign("Esclusa");
    sign.scale.multiplyScalar(1.2);
    sign.position.set(lock.centre.x, lock.centre.y + lock.half.y + 0.7, lock.centre.z + lock.half.z);
    group.add(sign);
  }
  for (const f of plan.fixtures) {
    if (f.volume === "hangar" && f.id !== "consola-hangar") continue;
    const g = fixtureFront(f, lamps);
    group.add(g);
  }
  const signs: THREE.Sprite[] = [];
  group.traverse((o) => {
    if (o.userData.fixture) pickables.push(o);
    if (o instanceof THREE.Sprite) signs.push(o);
  });
  const store = new THREE.Group();
  group.add(store);
  group.add(new THREE.HemisphereLight(0xeef4ff, 0x3a404a, 1.4));
  group.add(new THREE.AmbientLight(0xffffff, 0.25));
  return { group, pickables, lamps, store, signs };
}

/** A built probe on its cradle: a white bus with solar wings and its name. */
export function probeModel(name: string): THREE.Group {
  const g = new THREE.Group();
  const bus = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.8), mat(0xe8e8ee));
  g.add(bus);
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 14, 1, true), mat(0x56606e, { side: THREE.DoubleSide }));
  nozzle.rotation.x = -Math.PI / 2;
  nozzle.position.z = 1.2;
  g.add(nozzle);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 1.1), mat(0x1d3a7a, { metalness: 0.3 }));
  g.add(wing);
  const sign = textSign(name);
  sign.scale.multiplyScalar(1.3);
  sign.position.y = 1.5;
  g.add(sign);
  return g;
}

/** A crate for a spare part. */
export function crateModel(size: { x: number; y: number; z: number }, label?: string): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat(0xd9a441)));
  if (label) {
    const sign = textSign(label);
    sign.scale.multiplyScalar(1.0);
    sign.position.y = size.y / 2 + 0.3;
    g.add(sign);
  }
  return g;
}
