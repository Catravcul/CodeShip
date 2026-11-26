import * as THREE from "three";
import { BEE_EGG, CELL, beeAt, type BeeLook } from "@modules/aerial-sanctuary/domain/abeja";
import type { PupaPlan } from "@modules/aerial-sanctuary/data/pupa-abeja";
import { HOLLOW } from "@modules/aerial-sanctuary/data/montana";

/**
 * The bee's pupa drawn (docs/design/pupa-abeja.md): at the hollow pyramid's middle a giant worker cell of wax stands
 * on its foot in the lake, translucent (its six walls a clear tube with their edges drawn), with the Asian honeybee
 * worker inside from egg to adult (domain/abeja.ts): egg, embryo, larva, prepupa, pupa, adult, every part a box of
 * one instanced mesh (one draw call), posed each frame from the look of that moment; its wax cap seals it from day 8
 * and the adult chews through it, flies a round under the ceiling and the queen lays again. About six draw calls.
 */
const BEE_BOXES = 96;

/** Eye colour of the pupa, by stage (white, pink, purple, brown: Jay 1962). */
const EYE = [0xf2eee4, 0xe8a8b8, 0x8a4a8a, 0x4a2a1a].map((c) => new THREE.Color(c));
const PEARL = new THREE.Color(0xf4f0e4);
const DARK = new THREE.Color(0x2a1c10);
const BAND = new THREE.Color(0x9a6a28);

export class BeePupaView {
  readonly root = new THREE.Group();
  private readonly bee: THREE.InstancedMesh;
  private readonly cap: THREE.Mesh;
  private n = 0;
  /** The cell's frame: its bottom's middle, axis +z (to the opening, tilted up), in world m. */
  private readonly cell = new THREE.Matrix4();
  private readonly M = new THREE.Matrix4();
  private readonly P = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly v = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  /** The adult's length here, m (the cell's depth over CELL.depth). */
  private readonly L: number;

  constructor(private readonly p: PupaPlan) {
    this.L = p.beeLength;
    this.root.name = "pupa-abeja";
    const L = this.L;
    const w = CELL.width * L;
    const d = CELL.depth * L;
    const r = w / Math.sqrt(3);
    // The cell stands upright: its axis (+z in its frame) up, its bottom on the gallery, its opening under the ceiling.
    this.e.set(-Math.PI / 2, 0, 0);
    this.q.setFromEuler(this.e);
    this.cell.compose(new THREE.Vector3(p.x, p.y0, p.z), this.q, new THREE.Vector3(1, 1, 1));
    const tube = new THREE.CylinderGeometry(r, r, d, 6, 1, true).rotateX(Math.PI / 2).rotateZ(Math.PI / 6).translate(0, 0, d / 2);
    const own = new THREE.Mesh(tube, new THREE.MeshStandardMaterial({ color: 0xd89a30, roughness: 0.4, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    own.applyMatrix4(this.cell);
    own.name = "pupa-abeja-celda";
    own.renderOrder = 4;
    this.root.add(own);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(tube), new THREE.LineBasicMaterial({ color: 0xa07a28 }));
    edges.applyMatrix4(this.cell);
    edges.name = "pupa-abeja-aristas";
    this.root.add(edges);
    // Its foot: a solid prism of wax from the lake's bottom to the gallery, and the cell's floor (the rhombi of a real cell: flat here).
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.12, p.y0 - HOLLOW.floorY - 0.05, 6).rotateY(Math.PI / 6), new THREE.MeshStandardMaterial({ color: 0xc89a40, roughness: 0.7, flatShading: true }));
    // Its top just under the cell's bottom, so the egg and the young larva lie on it, not inside it.
    foot.position.set(p.x, (HOLLOW.floorY + p.y0 - 0.05) / 2, p.z);
    foot.name = "pupa-abeja-pie";
    this.root.add(foot);
    // The wax cap (slightly domed in a worker's cell: a flat hexagon here), translucent so the pupa shows through.
    this.cap = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.2, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6), new THREE.MeshStandardMaterial({ color: 0xd8b058, roughness: 0.8, transparent: true, opacity: 0.55, depthWrite: false }));
    this.cap.name = "pupa-abeja-operculo";
    this.cap.matrixAutoUpdate = false;
    this.root.add(this.cap);
    // The bee (egg, larva, pupa, adult): boxes posed each frame.
    this.bee = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 }), BEE_BOXES);
    this.bee.name = "pupa-abeja-abeja";
    this.bee.frustumCulled = false;
    this.bee.setColorAt(0, PEARL);
    this.root.add(this.bee);
  }

  /** One box in the cell's frame (adult lengths: `u` along the axis from the bottom, `v` up, `w` across), rotated. */
  private box(frame: THREE.Matrix4, u: number, v: number, w: number, su: number, sv: number, sw: number, color: THREE.Color, rx = 0, ry = 0, rz = 0): void {
    if (this.n >= BEE_BOXES) return;
    const L = this.L;
    this.e.set(rx, ry, rz);
    this.q.setFromEuler(this.e);
    this.P.compose(this.v.set(w * L, v * L, u * L), this.q, this.s.set(Math.max(1e-3, sw * L), Math.max(1e-3, sv * L), Math.max(1e-3, su * L)));
    this.M.multiplyMatrices(frame, this.P);
    this.bee.setMatrixAt(this.n, this.M);
    this.bee.setColorAt(this.n, color);
    this.n++;
  }

  /** Each frame: the bee at its moment `k` (domain/abeja.ts), `t` real seconds (wingbeats, breathing). */
  update(k: number, t: number): BeeLook {
    const p = beeAt(k);
    this.n = 0;
    const F = this.cell;
    // The egg: standing on the cell's bottom, leaning and lying down; inside it the embryo shows through the chorion.
    if (p.egg > 0.01) {
      const len = BEE_EGG.length;
      const wid = BEE_EGG.width * p.egg;
      const frame = new THREE.Matrix4().multiplyMatrices(F, new THREE.Matrix4().makeRotationX(p.lean));
      const S = 7;
      for (let i = 0; i < S; i++) {
        const s = (i + 0.5) / S;
        const prof = Math.sin(Math.PI * (0.08 + 0.84 * s)) * (s > 0.5 ? 1 : 0.9);
        // The blastoderm a little opaquer; the germ band a darker strip; the segments its rings.
        this.c.copy(PEARL).lerp(new THREE.Color(0xe8dcc0), 0.5 * p.blastoderm);
        this.box(frame, s * len, 0, 0, len / S, wid * prof, wid * prof, this.c);
      }
      if (p.band > 0) this.box(frame, len * 0.5, -wid * 0.42, 0, len * 0.8 * p.band, wid * 0.2, wid * 0.55, new THREE.Color(0xcab48a));
      const segs = Math.round(p.segments);
      for (let i = 0; i < segs; i++) this.box(frame, len * (0.12 + (0.76 * (i + 0.5)) / 14), -wid * 0.47, 0, len * 0.018, wid * 0.14, wid * 0.62, new THREE.Color(0xa89068));
      if (p.buds > 0) for (let i = 0; i < 4; i++) this.box(frame, len * (0.8 - i * 0.05), -wid * 0.55, (i % 2 ? 1 : -1) * wid * 0.2, len * 0.03 * p.buds, wid * 0.12 * p.buds, wid * 0.1, new THREE.Color(0xb89a70));
    }
    // The royal jelly the nurses lay under the young larva.
    if (p.jelly > 0.01) this.box(F, 0.02, -CELL.width * 0.3, 0, 0.03, CELL.width * 0.12 * p.jelly, CELL.width * 0.6 * p.jelly, new THREE.Color(0xf6f0d0));
    // The larva: a C on the cell's bottom, stretching out along the cell as a prepupa.
    if (p.larva > 0.005) {
      const N = 11;
      const len = p.larva;
      const th = len * (0.22 + 0.06 * p.curl);
      const R = len / (2 * Math.PI * 0.85);
      for (let i = 0; i < N; i++) {
        const s = (i + 0.5) / N;
        const a = -Math.PI / 2 + s * Math.PI * 2 * 0.85;
        const cu = th * 0.6;
        const cv = Math.sin(a) * R;
        const cw = Math.cos(a) * R;
        const su = 0.05 + s * len;
        const u = cu * p.curl + su * (1 - p.curl);
        const v = cv * p.curl;
        const w = cw * p.curl;
        const taper = 0.75 + 0.25 * Math.sin(Math.PI * s);
        // Its segments breathe a little (it is alive).
        const b = 1 + 0.03 * Math.sin(t * 2 + i);
        this.box(F, u, v, w, (len / N) * 1.25, th * taper * b, th * taper * b, i % 2 ? PEARL : this.c.set(0xece6d6), a * p.curl, 0, 0);
      }
    }
    // The pupa and the adult: head to the cap; the eyes darken, then the thorax, then the rest.
    if (p.bee > 0.005) this.drawBee(p, t);
    // The cap.
    const cap = p.cap;
    this.cap.visible = cap > 0.01;
    if (this.cap.visible) this.cap.matrix.multiplyMatrices(F, new THREE.Matrix4().compose(this.v.set(0, 0, CELL.depth * this.L), this.q.identity(), this.s.set(cap, cap, 1)));
    this.bee.count = this.n;
    this.bee.instanceMatrix.needsUpdate = true;
    if (this.bee.instanceColor) this.bee.instanceColor.needsUpdate = true;
    return p;
  }

  private drawBee(p: BeeLook, t: number): void {
    const k = p.bee;
    // In the cell (its head at the cap), or flying out and round the globe's centre.
    let frame = this.cell;
    if (p.out > 0) {
      // Out of the cap, then a round over the cell under the pyramid's ceiling, among the trees.
      const P = this.p;
      const crawl = Math.min(1, p.out / 0.2);
      const fly = Math.max(0, (p.out - 0.2) / 0.8);
      const ang = fly * Math.PI * 2;
      const R = (P.r + 25) * Math.min(1, fly * 4);
      const out = new THREE.Matrix4().multiplyMatrices(this.cell, new THREE.Matrix4().makeTranslation(0, 0, crawl * P.h * 1.05));
      if (fly > 0) {
        const pos = new THREE.Vector3(P.x + Math.sin(ang) * R, P.y0 + P.h * 1.15 + 12 * Math.sin(ang * 2), P.z + Math.cos(ang) * R);
        out.compose(pos, this.q.setFromEuler(this.e.set(0, ang + Math.PI / 2, 0)), this.s.set(1, 1, 1));
        out.multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.5 * this.L));
      }
      frame = out;
    }
    const cut = new THREE.Color().copy(PEARL).lerp(DARK, p.body);
    const tho = new THREE.Color().copy(PEARL).lerp(new THREE.Color(0x3a2814), p.thorax);
    const eye = this.eyeColor(p.eyes);
    const s = 0.98 * k;
    const u0 = 0.04;
    // Abdomen (6 tergites banded when dark), thorax, head with its compound eyes, antennae, legs, wings.
    for (let i = 0; i < 6; i++) {
      const band = new THREE.Color().copy(PEARL).lerp(i % 2 ? BAND : DARK, p.body);
      const w = 0.2 * Math.sin(Math.PI * (0.25 + (0.75 * (i + 0.5)) / 6)) + 0.07;
      this.box(frame, u0 + (0.07 + i * 0.075) * s, 0, 0, 0.08 * s, w * s, w * 1.05 * s, band);
    }
    this.box(frame, u0 + 0.58 * s, 0.01 * s, 0, 0.22 * s, 0.2 * s, 0.22 * s, tho);
    this.box(frame, u0 + 0.78 * s, 0, 0, 0.13 * s, 0.17 * s, 0.2 * s, cut);
    for (const side of [-1, 1]) {
      this.box(frame, u0 + 0.79 * s, 0.02 * s, side * 0.1 * s, 0.1 * s, 0.12 * s, 0.035 * s, eye);
      this.box(frame, u0 + 0.9 * s, 0.07 * s, side * 0.04 * s, 0.16 * s, 0.015 * s, 0.015 * s, cut, -0.5, side * 0.3, 0);
      // Legs: folded under the pupa, out on the adult.
      for (let j = 0; j < 3; j++) {
        const spread = p.out > 0 ? 0.6 : 0.1;
        this.box(frame, u0 + (0.5 + j * 0.08) * s, -0.11 * s, side * (0.08 + spread * 0.1) * s, 0.025 * s, 0.025 * s, (0.14 + spread * 0.1) * s, cut, 0, 0, side * (0.3 + spread));
      }
      // Wing pads on the pupa, wings on the adult (beating ~230 times a second in reality: a blur here).
      const wing = p.wings;
      const beat = p.out > 0.2 ? Math.sin(t * 60) * 0.7 : 0;
      this.box(frame, u0 + (0.5 - 0.15 * wing) * s, 0.12 * s, side * (0.08 + 0.18 * wing) * s, (0.12 + 0.3 * wing) * s, 0.008 * s, (0.08 + 0.2 * wing) * s, this.c.set(0xd8dce0).lerp(new THREE.Color(0xf6f8fa), wing), 0, side * 0.15 * wing, side * (0.1 + beat));
    }
  }

  private eyeColor(x: number): THREE.Color {
    const f = Math.max(0, Math.min(0.999, x)) * (EYE.length - 1);
    const i = Math.floor(f);
    return new THREE.Color().copy(EYE[i]!).lerp(EYE[i + 1]!, f - i);
  }
}
