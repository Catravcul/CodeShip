import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { wallWithGaps } from "@modules/aerial-sanctuary/domain/walk";
import type { Cosa, Edificio, Muro } from "@modules/microcosmos/data/academia";

/**
 * How Plato's Academy looks (Berón 2026-11-24: «me sorprende que todo sea tan opaco y básico… en ese tiempo había más
 * arte, en pintura, arquitectura, estatuas, piletas, columnas, muros, vasijas o cántaros o estanterías, utensilios y
 * vestimenta»): the shapes of its things, drawn into merged meshes (a draw call per material for the whole place).
 *
 * After what is known of 4th-century Athens: Doric columns with their echinus and abacus, painted plaster walls (a red
 * or black dado, a light field, a coloured band and a meander-like frieze: Pompeii's First Style continues the Greek
 * «masonry style», Ling, Roman Painting 1991), gable roofs of terracotta tiles with their pediments, lean-to roofs over
 * a court's porticos, marble statues on their bases, herms, vases of their real shapes (amphora, hydria, krater,
 * pithos, louterion on its foot: Richter y Milne, Shapes and Names of Athenian Vases 1935), couches and klismos chairs
 * (Richter, The Furniture of the Greeks, Etruscans and Romans 1966), scrolls in pigeonholes and wax tablets. Ours.
 */

/** Geometries of one colour each, merged into a single mesh. */
export class Batch {
  private readonly geos: THREE.BufferGeometry[] = [];
  add(geo: THREE.BufferGeometry, color: number, at: THREE.Matrix4): void {
    const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(at);
    const c = new THREE.Color(color);
    const n = g.getAttribute("position").count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.deleteAttribute("uv");
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    this.geos.push(g);
    if (g !== geo) geo.dispose();
  }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number, rot = 0): void {
    const m = new THREE.Matrix4().makeRotationY(rot).setPosition((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.add(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), color, m);
  }
  mesh(mat: THREE.Material): THREE.Mesh | undefined {
    if (!this.geos.length) return undefined;
    const merged = mergeGeometries(this.geos, false)!;
    for (const g of this.geos) g.dispose();
    this.geos.length = 0;
    return new THREE.Mesh(merged, mat);
  }
}

export const M = (x: number, y: number, z: number, rot = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(s, s, s));

const MARBLE = 0xf0ece2;
const MARBLE_SHADE = 0xdcd5c6;
const TERRACOTTA = 0xb8633a;
const BLACK_GLAZE = 0x2a2420;
const WOOD = 0x8a6a42;
const WOOD_DARK = 0x6a4a2a;
const RED_PAINT = 0x9a3a2a;
const BLUE_PAINT = 0x3a5a8a;
const OCHRE = 0xd8b070;

/** A turned shape (a vase, a column's capital) from its profile: [radius, height] pairs, bottom to top, in units of `s`. */
function lathe(b: Batch, profile: readonly (readonly [number, number])[], color: number, x: number, y: number, z: number, s: number, seg = 14): void {
  b.add(new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(Math.max(0.001, r) * s, h * s)), seg), color, M(x, y, z));
}

/** Vase shapes, for a height of 1 (Richter y Milne 1935). */
const VASES = {
  // Transport amphora: pointed toe, swelling body, narrow neck, lip.
  amphora: [[0.02, 0], [0.08, 0.05], [0.2, 0.25], [0.24, 0.45], [0.2, 0.68], [0.09, 0.78], [0.07, 0.9], [0.1, 0.95], [0.09, 1]],
  // Hydria: flat foot, broad shoulder, neck and wide lip (water).
  hydria: [[0.14, 0], [0.16, 0.04], [0.26, 0.3], [0.3, 0.55], [0.22, 0.75], [0.1, 0.82], [0.09, 0.92], [0.15, 1]],
  // Krater: foot, deep wide bowl (wine and water mixed).
  krater: [[0.16, 0], [0.12, 0.12], [0.18, 0.18], [0.36, 0.45], [0.42, 0.85], [0.46, 1]],
  // Pithos: big storage jar sunk or standing.
  pithos: [[0.18, 0], [0.32, 0.15], [0.42, 0.45], [0.4, 0.75], [0.26, 0.92], [0.24, 1]],
  // Louterion: a wide shallow basin on a tall fluted foot (for washing).
  louterion: [[0.14, 0], [0.1, 0.05], [0.07, 0.15], [0.07, 0.7], [0.1, 0.75], [0.5, 0.82], [0.55, 0.92], [0.5, 1]],
} as const;

/** A vase of a shape, `h` tall; the body in red clay with a black-glaze band and lip. */
export function vase(b: Batch, kind: keyof typeof VASES, x: number, y: number, z: number, h: number, color = TERRACOTTA): void {
  lathe(b, VASES[kind], kind === "louterion" ? MARBLE : color, x, y, z, h);
  if (kind !== "louterion" && kind !== "pithos") {
    // A black band at the shoulder (the painted zone of a black-figure vase) and the lip.
    const f = kind === "krater" ? 2 : 1.15;
    lathe(b, [[0.205 * f, 0.62], [0.215 * f, 0.64], [0.19 * f, 0.7]], BLACK_GLAZE, x, y, z, h);
  }
  // Handles: two small loops (boxes) on amphorae and hydriae.
  if (kind === "amphora" || kind === "hydria") for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.03 * h, 0.22 * h, 0.05 * h), color, M(x + s * 0.17 * h, y + 0.74 * h, z));
}

/** A Doric column on its stylobate: the shaft (tapering), the echinus and the abacus. `d` its lower diameter. */
export function doric(b: Batch, x: number, y: number, z: number, h: number, d: number): void {
  const r = d / 2;
  b.add(new THREE.CylinderGeometry(r * 0.8, r, h * 0.88, 16), MARBLE, M(x, y + h * 0.44, z));
  // Fluting: a few vertical grooves suggested by thin darker strips.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(new THREE.BoxGeometry(d * 0.05, h * 0.86, d * 0.03), MARBLE_SHADE, new THREE.Matrix4().makeRotationY(-a).setPosition(x + Math.cos(a) * r * 0.9, y + h * 0.44, z + Math.sin(a) * r * 0.9));
  }
  lathe(b, [[0.8, 0], [1.25, 0.06], [1.15, 0.1]], MARBLE, x, y + h * 0.88, z, r, 16);
  b.box(x - r * 1.35, y + h * 0.94, z - r * 1.35, x + r * 1.35, y + h, z + r * 1.35, MARBLE);
}

/**
 * A marble statue on its base: a standing robed figure (a Muse, Hermes, Athena), its weight on one leg, one arm out
 * (holding a scroll, a lyre or a spear), made of boxes. `h` its height without the base; `pose` varies the arms.
 */
export function statue(b: Batch, x: number, y: number, z: number, h: number, rot: number, pose = 0, color = MARBLE): void {
  const s = h / 1.8;
  const R = (dx: number, dy: number, dz: number) => {
    const c = Math.cos(rot), sn = Math.sin(rot);
    return [x + dx * c + dz * sn, y + dy, z - dx * sn + dz * c] as const;
  };
  const part = (w: number, hh: number, d: number, dx: number, dy: number, dz: number, tilt = 0, c = color) => {
    const [px, py, pz] = R(dx * s, dy * s, dz * s);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, tilt)), new THREE.Vector3(1, 1, 1));
    b.add(new THREE.BoxGeometry(w * s, hh * s, d * s), c, m);
  };
  // Base: a stepped plinth.
  b.box(x - 0.36 * s, y - 0.5 * s, z - 0.36 * s, x + 0.36 * s, y - 0.1 * s, z + 0.36 * s, MARBLE_SHADE, rot);
  b.box(x - 0.3 * s, y - 0.1 * s, z - 0.3 * s, x + 0.3 * s, y, z + 0.3 * s, color, rot);
  // The long robe (a peplos or chiton) to the feet, its folds; the torso, the mantle; the head with its hair.
  part(0.42, 0.95, 0.3, 0, 0.48, 0);
  for (let i = -2; i <= 2; i++) part(0.04, 0.9, 0.02, i * 0.08, 0.47, 0.155, 0, MARBLE_SHADE);
  part(0.4, 0.45, 0.24, 0, 1.18, 0);
  part(0.44, 0.3, 0.27, 0.02, 1.1, 0, 0.15);
  part(0.11, 0.1, 0.11, 0, 1.45, 0);
  part(0.2, 0.24, 0.21, 0, 1.6, 0);
  part(0.22, 0.1, 0.23, 0, 1.72, -0.01, 0, MARBLE_SHADE);
  // Arms: one down along the body, the other out or up by the pose.
  part(0.1, 0.55, 0.1, -0.26, 1.1, 0);
  if (pose % 3 === 0) part(0.1, 0.5, 0.1, 0.3, 1.2, 0.08, 0.7);
  else if (pose % 3 === 1) {
    part(0.1, 0.5, 0.1, 0.28, 1.15, 0.12, 0.3);
    part(0.06, 0.28, 0.2, 0.32, 1.0, 0.25, 0, MARBLE_SHADE);
  } else {
    part(0.1, 0.55, 0.1, 0.27, 1.5, 0, -0.15);
    part(0.04, 1.8, 0.04, 0.33, 1.1, 0);
  }
}

/** A herm: a square pillar with a bearded head of Hermes on top (they stood at gates and in gymnasia). */
export function herm(b: Batch, x: number, y: number, z: number, h: number, rot: number): void {
  b.box(x - 0.18 * h, y, z - 0.15 * h, x + 0.18 * h, y + h * 0.78, z + 0.15 * h, MARBLE, rot);
  b.box(x - 0.13 * h, y + h * 0.78, z - 0.12 * h, x + 0.13 * h, y + h, z + 0.12 * h, MARBLE, rot);
  b.box(x - 0.1 * h, y + h * 0.74, z - 0.13 * h, x + 0.1 * h, y + h * 0.86, z + 0.13 * h, MARBLE_SHADE, rot);
}

/** Painted plaster on a wall piece: a dark red dado, a light field, a blue band and an ochre frieze, on both faces. */
export function paintWall(b: Batch, s: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }, k: number): void {
  const alongX = s.x1 - s.x0 > s.z1 - s.z0;
  const e = 0.02 * k;
  const bands: [number, number, number][] = [
    [0, 0.9, RED_PAINT],
    [1.8, 1.92, BLUE_PAINT],
    [1.92, 2.1, OCHRE],
  ];
  for (const [a, c, col] of bands) {
    const y0 = s.y0 + a * k;
    const y1 = Math.min(s.y1, s.y0 + c * k);
    if (y1 <= y0) continue;
    if (alongX) {
      b.box(s.x0, y0, s.z0 - e, s.x1, y1, s.z0, col);
      b.box(s.x0, y0, s.z1, s.x1, y1, s.z1 + e, col);
    } else {
      b.box(s.x0 - e, y0, s.z0, s.x0, y1, s.z1, col);
      b.box(s.x1, y0, s.z0, s.x1 + e, y1, s.z1, col);
    }
  }
}

/** A wall's pieces, painted, and the lintels over its doors. Real metres in, world units out (`k`). */
export function drawWall(b: Batch, m: Muro, floor: number, color: number, k: number, painted: boolean): void {
  for (const s of wallWithGaps({ axis: m.axis, at: m.at * k, from: m.from * k, to: m.to * k, y0: floor * k, y1: (floor + m.h) * k, thick: m.t * k, gaps: m.gaps?.map((g) => ({ from: g.from * k, to: g.to * k, y1: g.to - g.from > 3 ? undefined : (Math.min(2.3, m.h - 0.1) + floor) * k })) })) {
    b.box(s.x0, s.y0, s.z0, s.x1, s.y1, s.z1, color);
    if (painted && s.y0 < (floor + 0.1) * k) paintWall(b, s, k);
  }
  // A coping on top of the wall.
  const t = m.t * k;
  if (m.axis === "x") b.box(m.from * k, (floor + m.h) * k, m.at * k - t * 0.7, m.to * k, (floor + m.h) * k + 0.08 * k, m.at * k + t * 0.7, MARBLE_SHADE);
  else b.box(m.at * k - t * 0.7, (floor + m.h) * k, m.from * k, m.at * k + t * 0.7, (floor + m.h) * k + 0.08 * k, m.to * k, MARBLE_SHADE);
}

/** A sloping roof slab of tiles over a rectangle, rising from `yLow` at one side to `yHigh` at the other, with its ribs. */
function slope(b: Batch, x0: number, z0: number, x1: number, z1: number, yLow: number, yHigh: number, lowSide: "x0" | "x1" | "z0" | "z1", color: number, k: number): void {
  const alongX = lowSide === "z0" || lowSide === "z1";
  const run = alongX ? z1 - z0 : x1 - x0;
  const len = alongX ? x1 - x0 : z1 - z0;
  const rise = yHigh - yLow;
  const slab = Math.hypot(run, rise);
  const ang = Math.atan2(rise, run);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const cy = (yLow + yHigh) / 2;
  const t = 0.15 * k;
  const sign = lowSide === "x0" || lowSide === "z0" ? 1 : -1;
  const q = alongX ? new THREE.Quaternion().setFromEuler(new THREE.Euler(-sign * ang, 0, 0)) : new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, sign * ang));
  const geo = alongX ? new THREE.BoxGeometry(len, t, slab) : new THREE.BoxGeometry(slab, t, len);
  b.add(geo, color, new THREE.Matrix4().compose(new THREE.Vector3(cx, cy, cz), q, new THREE.Vector3(1, 1, 1)));
  // The cover tiles' ribs running down the slope.
  const n = Math.max(2, Math.floor(len / (0.7 * k)));
  for (let i = 0; i <= n; i++) {
    const u = -len / 2 + (len * i) / n;
    const off = new THREE.Vector3(alongX ? u : 0, t * 0.8, alongX ? 0 : u).applyQuaternion(q);
    const rib = alongX ? new THREE.BoxGeometry(0.1 * k, 0.08 * k, slab) : new THREE.BoxGeometry(slab, 0.08 * k, 0.1 * k);
    b.add(rib, 0x9a4a2a, new THREE.Matrix4().compose(new THREE.Vector3(cx + off.x, cy + off.y, cz + off.z), q, new THREE.Vector3(1, 1, 1)));
  }
}

/** A triangle (a pediment) standing in the plane x = const or z = const. */
function pediment(b: Batch, ax: "x" | "z", at: number, from: number, to: number, y: number, top: number, color: number, k: number): void {
  const shape = new THREE.Shape();
  const w = to - from;
  shape.moveTo(0, 0);
  shape.lineTo(w, 0);
  shape.lineTo(w / 2, top - y);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3 * k, bevelEnabled: false });
  const m = ax === "z" ? new THREE.Matrix4().makeTranslation(from, y, at - 0.15 * k) : new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(at - 0.15 * k, y, from);
  b.add(g, color, m);
  // The tympanum's painted back (blue) and the cornice under it.
  if (ax === "z") b.box(from, y - 0.25 * k, at - 0.25 * k, to, y, at + 0.25 * k, MARBLE_SHADE);
  else b.box(at - 0.25 * k, y - 0.25 * k, from, at + 0.25 * k, y, to, MARBLE_SHADE);
}

/**
 * A building's roof (hidden while she is in it: the cut-away view): over a court, four lean-to roofs sloping in to it
 * (a peristyle, a courtyard house); otherwise a gable along its longer side with a pediment at each end.
 */
export function roofOf(e: Edificio, k: number, thatch = false): THREE.Mesh {
  const b = new Batch();
  const y = (e.floor + e.wallH) * k;
  const o = 0.4 * k;
  const color = thatch ? 0xb59a5a : TERRACOTTA;
  const court = e.courts?.[0];
  if (court) {
    const rise = 1.2 * k;
    slope(b, e.x0 * k - o, e.z0 * k - o, e.x1 * k + o, court.z0 * k, y + rise, y, "z1", color, k);
    slope(b, e.x0 * k - o, court.z1 * k, e.x1 * k + o, e.z1 * k + o, y + rise, y, "z0", color, k);
    slope(b, e.x0 * k - o, court.z0 * k, court.x0 * k, court.z1 * k, y + rise, y, "x1", color, k);
    slope(b, court.x1 * k, court.z0 * k, e.x1 * k + o, court.z1 * k, y + rise, y, "x0", color, k);
  } else {
    const alongZ = e.z1 - e.z0 >= e.x1 - e.x0;
    const half = ((alongZ ? e.x1 - e.x0 : e.z1 - e.z0) / 2) * k;
    // Greek roofs are low: about 1 in 4 (15°).
    const rise = half * 0.27;
    if (alongZ) {
      const mid = ((e.x0 + e.x1) / 2) * k;
      slope(b, e.x0 * k - o, e.z0 * k - o, mid, e.z1 * k + o, y, y + rise, "x0", color, k);
      slope(b, mid, e.z0 * k - o, e.x1 * k + o, e.z1 * k + o, y, y + rise, "x1", color, k);
      if (!thatch) for (const zz of [e.z0 * k - o, e.z1 * k + o]) pediment(b, "z", zz, e.x0 * k - o, e.x1 * k + o, y, y + rise, MARBLE, k);
    } else {
      const mid = ((e.z0 + e.z1) / 2) * k;
      slope(b, e.x0 * k - o, e.z0 * k - o, e.x1 * k + o, mid, y, y + rise, "z0", color, k);
      slope(b, e.x0 * k - o, mid, e.x1 * k + o, e.z1 * k + o, y, y + rise, "z1", color, k);
      if (!thatch) for (const xx of [e.x0 * k - o, e.x1 * k + o]) pediment(b, "x", xx, e.z0 * k - o, e.z1 * k + o, y, y + rise, MARBLE, k);
    }
  }
  return b.mesh(new THREE.MeshLambertMaterial({ vertexColors: true }))!;
}

/** A thing's look (real metres in, world units out by `k`). */
export function drawThing(b: Batch, c: Cosa, floor: number, k: number): void {
  const x = c.x * k;
  const z = c.z * k;
  const y = (floor + (c.y ?? 0)) * k;
  const w = c.w * k;
  const d = c.d * k;
  const h = c.h * k;
  const rot = c.rot ?? 0;
  const box = (color: number, dx = 0, dy = 0, dz = 0, ww = w, hh = h, dd = d) => {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    b.add(new THREE.BoxGeometry(ww, hh, dd), color, M(x + dx * cs + dz * sn, y + dy + hh / 2, z - dx * sn + dz * cs, rot));
  };
  const legs = (color: number, hh: number, inset = 0.05 * k, r = 0.03 * k) => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(color, sx * (w / 2 - inset), 0, sz * (d / 2 - inset), r * 2, hh, r * 2);
  };
  switch (c.kind) {
    case "anforas": {
      // A row of amphorae or pithoi along the wall, leaning on a rack.
      const big = c.h > 1;
      const n = Math.max(1, Math.round(c.w / (big ? 0.9 : 0.5)));
      for (let i = 0; i < n; i++) vase(b, big ? "pithos" : "amphora", x - w / 2 + ((i + 0.5) * w) / n, y, z, h, big ? 0xa8603a : TERRACOTTA);
      if (!big) box(WOOD_DARK, 0, h * 0.55, d * 0.3, w, 0.05 * k, 0.05 * k);
      return;
    }
    case "vasija":
      vase(b, /crátera/i.test(c.label) ? "krater" : /hidria|agua/i.test(c.label) ? "hydria" : "amphora", x, y, z, h);
      if (/crátera/i.test(c.label)) box(WOOD_DARK, 0, 0, 0, w * 1.2, 0.05 * k, d * 1.2);
      return;
    case "pila":
      vase(b, "louterion", x, y, z, h * 1.1);
      return;
    case "pozo":
      // The cistern's well-head: a ring of stone with its windlass.
      lathe(b, [[0.45, 0], [0.5, 0.05], [0.5, 0.95], [0.45, 1], [0.38, 1], [0.38, 0.1]], 0x9a9488, x, y, z, h);
      box(WOOD_DARK, 0, h, 0, w * 1.1, 0.06 * k, 0.06 * k);
      for (const s of [-1, 1]) box(WOOD_DARK, (s * w) / 2, 0, 0, 0.06 * k, h * 1.6, 0.06 * k);
      return;
    case "saco":
      b.add(new THREE.CylinderGeometry(w / 2, w / 2.4, h, 12), 0x7a4a2a, M(x, y + h / 2, z));
      b.add(new THREE.CylinderGeometry(0.02 * k, 0.02 * k, (2.6 - (c.y ?? 0) - c.h) * k, 4), 0x5a4a3a, M(x, y + h + ((2.6 - (c.y ?? 0) - c.h) * k) / 2, z));
      return;
    case "gnomon":
      b.add(new THREE.CylinderGeometry(1.4 * k, 1.4 * k, 0.06 * k, 24), MARBLE_SHADE, M(x, y + 0.03 * k, z));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        b.add(new THREE.BoxGeometry(0.03 * k, 0.02 * k, 0.5 * k), BLACK_GLAZE, new THREE.Matrix4().makeRotationY(-a).setPosition(x + Math.sin(a) * 1.0 * k, y + 0.07 * k, z + Math.cos(a) * 1.0 * k));
      }
      b.add(new THREE.CylinderGeometry(w / 2, w / 2, h, 8), 0x6a5a40, M(x, y + h / 2, z));
      return;
    case "poste":
      b.add(new THREE.CylinderGeometry(w / 2, w / 2, h, 8), MARBLE, M(x, y + h / 2, z));
      return;
    case "tumulo":
      b.add(new THREE.SphereGeometry(w / 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x8a9a5a, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(1, h / (w / 2), 1)));
      b.add(new THREE.CylinderGeometry(w / 2, w / 2, 0.4 * k, 16), MARBLE_SHADE, M(x, y + 0.2 * k, z));
      // A marble loutrophoros on top (the vase for the unmarried dead) or a stele.
      vase(b, "hydria", x, y + h, z, 0.9 * k, MARBLE);
      return;
    case "estela": {
      // A grave stele: a slab with a relief panel and a palmette crown (anthemion).
      box(MARBLE, 0, 0.25 * k, 0, w * 0.75, h - 0.25 * k, d * 0.5);
      box(MARBLE_SHADE, 0, 0.6 * k, d * 0.26, w * 0.55, h * 0.45, 0.04 * k);
      b.add(new THREE.CylinderGeometry(w * 0.38, w * 0.38, d * 0.5, 12, 1, false, 0, Math.PI), MARBLE, new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)).premultiply(M(x, y + h, z, rot)));
      box(MARBLE_SHADE, 0, 0, 0, w, 0.25 * k, d);
      return;
    }
    case "altar":
      // A stepped altar with its mouldings and volutes at the ends.
      box(MARBLE_SHADE, 0, 0, 0, w * 1.15, 0.15 * k, d * 1.15);
      box(MARBLE, 0, 0.15 * k, 0, w, h - 0.3 * k, d);
      box(MARBLE_SHADE, 0, h - 0.15 * k, 0, w * 1.08, 0.12 * k, d * 1.08);
      for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.12 * k, 0.12 * k, d * 1.05, 10), MARBLE, new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(M(x + s * (w / 2) * Math.cos(rot), y + h - 0.02 * k, z - s * (w / 2) * Math.sin(rot), rot)));
      return;
    case "kline":
      // A couch: turned legs, the frame, a mattress and a cushion at the head (raised end).
      legs(WOOD_DARK, h * 0.55);
      box(WOOD, 0, h * 0.55, 0, w, 0.08 * k, d);
      box(0xa83a3a, 0, h * 0.63, 0, w * 0.96, 0.1 * k, d * 0.96);
      box(WOOD, w > d ? w / 2 - 0.05 * k : 0, h * 0.63, w > d ? 0 : d / 2 - 0.05 * k, w > d ? 0.1 * k : w, 0.35 * k, w > d ? d : 0.1 * k);
      box(0xd8c08a, w > d ? w / 2 - 0.2 * k : 0, h * 0.73, w > d ? 0 : d / 2 - 0.2 * k, w > d ? 0.3 * k : w * 0.7, 0.12 * k, w > d ? d * 0.7 : 0.3 * k);
      return;
    case "cama":
      legs(WOOD_DARK, h * 0.6);
      box(WOOD, 0, h * 0.6, 0, w, 0.08 * k, d);
      box(0xd8d0b8, 0, h * 0.68, 0, w * 0.95, 0.1 * k, d * 0.95);
      box(0x8a5a4a, 0, h * 0.78, -d * 0.15, w * 0.96, 0.04 * k, d * 0.6);
      return;
    case "mesa":
      // A Greek table (trapeza): rectangular top on three legs.
      box(WOOD, 0, h - 0.05 * k, 0, w, 0.05 * k, d);
      box(WOOD_DARK, -w / 2 + 0.1 * k, 0, 0, 0.06 * k, h - 0.05 * k, 0.06 * k);
      box(WOOD_DARK, w / 2 - 0.1 * k, 0, -d / 2 + 0.1 * k, 0.06 * k, h - 0.05 * k, 0.06 * k);
      box(WOOD_DARK, w / 2 - 0.1 * k, 0, d / 2 - 0.1 * k, 0.06 * k, h - 0.05 * k, 0.06 * k);
      if (/leer|rollos|escrib/i.test(c.label)) {
        // Open scrolls and wax tablets on it.
        b.add(new THREE.CylinderGeometry(0.04 * k, 0.04 * k, 0.32 * k, 8), 0xe8dcc0, new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(M(x - 0.3 * k, y + h + 0.04 * k, z)));
        b.add(new THREE.CylinderGeometry(0.04 * k, 0.04 * k, 0.32 * k, 8), 0xe8dcc0, new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(M(x + 0.05 * k, y + h + 0.04 * k, z)));
        box(0xf0e6cc, -0.125 * k, h, 0, 0.3 * k, 0.01 * k, 0.3 * k);
        box(WOOD_DARK, 0.4 * k, h, 0.1 * k, 0.24 * k, 0.03 * k, 0.18 * k);
        box(0x3a3028, 0.4 * k, h + 0.03 * k, 0.1 * k, 0.2 * k, 0.005 * k, 0.14 * k);
      }
      if (/cocina|untarse/i.test(c.label)) {
        vase(b, "hydria", x + w * 0.3, y + h, z, 0.3 * k);
        b.add(new THREE.CylinderGeometry(0.18 * k, 0.1 * k, 0.08 * k, 12), 0xb8633a, M(x - w * 0.2, y + h + 0.04 * k, z));
      }
      return;
    case "silla":
      // A klismos: curved back and splayed legs.
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(WOOD_DARK, sx * w * 0.38, 0, sz * d * 0.38, 0.04 * k, 0.45 * k, 0.04 * k);
      box(WOOD, 0, 0.45 * k, 0, w, 0.05 * k, d);
      box(WOOD, 0, 0.5 * k, -d / 2, w, 0.35 * k, 0.04 * k);
      return;
    case "foso":
      b.add(new THREE.BoxGeometry(w, 0.04 * k, d), 0xe9d6a6, M(x, y + 0.02 * k, z, rot));
      return;
    case "bancal":
      b.add(new THREE.BoxGeometry(w, h, d), 0x5a4a2a, M(x, y + h / 2, z, rot));
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) b.add(new THREE.SphereGeometry(0.2 * k, 7, 5), j ? 0x6f9a3a : 0x4f8a3a, M(x - w / 2 + ((i + 0.5) * w) / 8, y + h + 0.12 * k, z + (j - 0.5) * d * 0.5));
      return;
    case "parra":
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) b.add(new THREE.CylinderGeometry(0.06 * k, 0.06 * k, h, 6), 0x6a4a2a, M(x + (dx * w) / 2, y + h / 2, z + (dz * d) / 2));
      for (let i = 0; i < 5; i++) box(0x6a4a2a, 0, h, -d / 2 + (i * d) / 4, w, 0.04 * k, 0.04 * k);
      for (let i = 0; i < 14; i++) b.add(new THREE.SphereGeometry(0.35 * k, 7, 5), i % 4 ? 0x4f7a32 : 0x5a3a6a, M(x + (((i * 37) % 10) / 10 - 0.5) * w, y + h + 0.1 * k, z + (((i * 53) % 10) / 10 - 0.5) * d));
      return;
    case "telar":
      // A warp-weighted loom: two uprights, the beam, the warp threads and the clay weights.
      for (const s of [-1, 1]) box(WOOD_DARK, (s * w) / 2, 0, 0, 0.08 * k, h, 0.08 * k);
      box(WOOD, 0, h - 0.1 * k, 0, w, 0.1 * k, 0.1 * k);
      box(0xc8a070, 0, h * 0.35, 0.02 * k, w * 0.9, h * 0.55, 0.02 * k);
      box(0x8a3a2a, 0, h * 0.75, 0.03 * k, w * 0.9, h * 0.12, 0.02 * k);
      for (let i = 0; i < 10; i++) b.add(new THREE.ConeGeometry(0.05 * k, 0.12 * k, 6), 0xa8603a, M(x - w * 0.42 + (i * w * 0.84) / 9, y + h * 0.3, z + 0.03 * k));
      return;
    case "hogar":
      box(0x8a7a6a, 0, 0, 0, w, h, d);
      box(0x2a2420, 0, h, 0, w * 0.7, 0.02 * k, d * 0.7);
      b.add(new THREE.ConeGeometry(0.2 * k, 0.4 * k, 7), 0xd8642a, M(x, y + h + 0.2 * k, z));
      // A pot on its tripod.
      vase(b, "krater", x, y + h + 0.05 * k, z, 0.35 * k, 0x5a4a3a);
      return;
    case "molino":
      // The saddle quern: a sloping stone and its rubber.
      box(0x8a8478, 0, 0, 0, w, h * 0.6, d);
      box(0x9a948a, 0, h * 0.6, 0, w * 0.4, h * 0.25, d * 0.8);
      return;
    case "arca":
      box(0x7a5a3a, 0, 0, 0, w, h, d);
      box(OCHRE, 0, h * 0.4, d / 2, w * 0.9, 0.05 * k, 0.01 * k);
      box(0x6a4a2a, 0, h, 0, w * 1.02, 0.05 * k, d * 1.02);
      return;
    case "lampara":
      // An oil lamp on its tall lampstand (lychnouchos).
      b.add(new THREE.CylinderGeometry(0.15 * k, 0.2 * k, 0.05 * k, 10), 0x8a6a3a, M(x, y + 0.025 * k, z));
      b.add(new THREE.CylinderGeometry(0.025 * k, 0.025 * k, h * 2, 6), 0x8a6a3a, M(x, y + h, z));
      b.add(new THREE.SphereGeometry(0.08 * k, 8, 6), TERRACOTTA, M(x, y + h * 2 + 0.04 * k, z));
      return;
    case "lampadario":
      b.add(new THREE.CylinderGeometry(0.15 * k, 0.2 * k, 0.05 * k, 10), 0x8a6a3a, M(x, y + 0.025 * k, z));
      b.add(new THREE.CylinderGeometry(0.025 * k, 0.025 * k, h, 6), 0x8a6a3a, M(x, y + h / 2, z));
      b.add(new THREE.CylinderGeometry(0.12 * k, 0.06 * k, 0.06 * k, 10), 0x8a6a3a, M(x, y + h, z));
      b.add(new THREE.SphereGeometry(0.06 * k, 8, 6), TERRACOTTA, M(x, y + h + 0.06 * k, z));
      return;
    case "rollos": {
      // Pigeonholes of scrolls (the books of the time), each hole with its scrolls' ends showing.
      box(WOOD, 0, 0, 0, w, h, d);
      const cols = Math.max(2, Math.round(Math.max(w, d) / (0.35 * k)));
      const rows = Math.max(3, Math.round(h / (0.35 * k)));
      const alongX = w >= d;
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++) {
          const u = -((alongX ? w : d) / 2) + ((i + 0.5) * (alongX ? w : d)) / cols;
          const v = ((j + 0.5) * h) / rows;
          const face = (alongX ? d : w) / 2 + 0.005 * k;
          const px = alongX ? u : face;
          const pz = alongX ? face : u;
          box(0x3a2a1e, px, v - 0.13 * k, pz, alongX ? 0.28 * k : 0.01 * k, 0.26 * k, alongX ? 0.01 * k : 0.28 * k);
          for (let s = 0; s < 3; s++) b.add(new THREE.CylinderGeometry(0.035 * k, 0.035 * k, 0.04 * k, 8), (s + i + j) % 3 ? 0xe8dcc0 : 0xd8c8a0, new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(alongX ? new THREE.Matrix4().makeRotationY(0) : new THREE.Matrix4().makeRotationY(Math.PI / 2)).premultiply(M(x + px + (alongX ? (s - 1) * 0.07 * k : 0.01 * k), y + v - 0.07 * k + (s % 2) * 0.06 * k, z + pz + (alongX ? 0.01 * k : (s - 1) * 0.07 * k))));
        }
      return;
    }
    case "estatua":
      statue(b, x, y + 0.5 * k * (c.h / 1.8), z, c.h * k * 0.8, rot, Math.round(c.x * 7 + c.z * 3), MARBLE);
      return;
    case "herma":
      herm(b, x, y, z, h, rot);
      return;
    case "compuerta":
      box(WOOD_DARK, 0, 0, 0, w, h, d);
      for (const s of [-1, 1]) box(WOOD_DARK, (s * w) / 2, 0, 0, 0.08 * k, h * 1.6, 0.08 * k);
      return;
    case "banco":
      // A stone bench on its blocks.
      box(MARBLE_SHADE, 0, 0, 0, w * 0.95, h * 0.8, d * 0.6);
      box(MARBLE, 0, h * 0.8, 0, w, h * 0.2, d);
      return;
    case "estante":
      box(WOOD, 0, 0, 0, w, h, d);
      for (let j = 1; j < 4; j++) box(WOOD_DARK, 0, (h * j) / 4, 0, w * 1.02, 0.03 * k, d * 1.05);
      if (/pesas|discos/i.test(c.label)) for (let j = 0; j < 3; j++) b.add(new THREE.CylinderGeometry(0.13 * k, 0.13 * k, 0.03 * k, 14), 0x7a6a5a, new THREE.Matrix4().makeRotationZ(Math.PI / 2).premultiply(M(x, y + (h * (j + 0.5)) / 4 + 0.13 * k, z)));
      if (/antorchas/i.test(c.label)) for (let j = 0; j < 6; j++) b.add(new THREE.CylinderGeometry(0.03 * k, 0.025 * k, 0.8 * k, 6), 0x7a5a3a, M(x - w / 2 + (j + 0.5) * (w / 6), y + h * 0.5, z));
      return;
    case "basa":
      box(MARBLE_SHADE, 0, 0, 0, w, h * 0.3, d);
      for (let i = 0; i < 3; i++) statue(b, x - w / 3 + (i * w) / 3, y + h * 0.3 + 0.3 * k, z, h * 0.9, rot, i);
      return;
    default:
      box(0xc8bca8);
  }
}

/** Painted figures on a wall (a frieze of Muses, athletes or a meander): a row of simple silhouettes over the band. */
export function frieze(b: Batch, x0: number, z0: number, x1: number, z1: number, y: number, k: number, n: number, face: 1 | -1): void {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * u;
    const z = z0 + (z1 - z0) * u;
    const off = 0.03 * k * face;
    const col = i % 2 ? RED_PAINT : BLACK_GLAZE;
    const px = alongX ? x : x + off;
    const pz = alongX ? z + off : z;
    const dims = alongX ? ([0.12 * k, 0.45 * k, 0.01 * k] as const) : ([0.01 * k, 0.45 * k, 0.12 * k] as const);
    b.add(new THREE.BoxGeometry(...dims), col, M(px, y + 0.3 * k, pz));
    b.add(new THREE.BoxGeometry(alongX ? 0.09 * k : 0.01 * k, 0.09 * k, alongX ? 0.01 * k : 0.09 * k), col, M(px, y + 0.6 * k, pz));
  }
}
