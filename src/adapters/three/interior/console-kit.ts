import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural machinery for interiors, built for a phone (docs/design/puente.md §Rendimiento): every part
 * goes into one of two merged meshes per group (lit hardware and glowing bits, colour per vertex, shared
 * materials), screens into one mesh over a canvas atlas, status lamps into one instanced mesh. A whole
 * room of consoles costs a handful of draw calls and no new lights.
 */

/** A place and turn, m and radians, relative to a parent frame. */
export const at = (parent: THREE.Matrix4, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Matrix4 =>
  parent.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(1, 1, 1)));

const SOLID = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.35 });
const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

/** Collects parts and merges them into one lit mesh and one glowing mesh. */
export class PartKit {
  private readonly solid: THREE.BufferGeometry[] = [];
  private readonly glow: THREE.BufferGeometry[] = [];

  add(geo: THREE.BufferGeometry, color: number, m: THREE.Matrix4, glow = false): void {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.deleteAttribute("uv");
    g.applyMatrix4(m);
    const c = new THREE.Color(color);
    const n = g.getAttribute("position").count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    (glow ? this.glow : this.solid).push(g);
  }

  box(w: number, h: number, d: number, color: number, m: THREE.Matrix4, glow = false): void {
    this.add(new THREE.BoxGeometry(w, h, d), color, m, glow);
  }

  /** A cylinder along local Y. */
  cyl(r: number, h: number, color: number, m: THREE.Matrix4, seg = 10, glow = false): void {
    this.add(new THREE.CylinderGeometry(r, r, h, seg), color, m, glow);
  }

  /** A bar between two points (handholds, rails, sticks). */
  bar(a: THREE.Vector3, b: THREE.Vector3, r: number, color: number, seg = 8): void {
    const d = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
    this.add(new THREE.CylinderGeometry(r, r, d.length(), seg), color, m);
  }

  /** The merged meshes (none for an empty bucket). `noCut`: the dollhouse camera never hides them. */
  build(noCut = true): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [list, mat] of [
      [this.solid, SOLID],
      [this.glow, GLOW],
    ] as const) {
      if (!list.length) continue;
      const mesh = new THREE.Mesh(mergeGeometries(list, false)!, mat);
      for (const g of list) g.dispose();
      mesh.userData.noCut = noCut;
      out.push(mesh);
    }
    return out;
  }
}

/** A 2D canvas shared by every screen of a room, cut into cells (one texture, one draw call). */
export class ScreenAtlas {
  readonly canvas = document.createElement("canvas");
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  private readonly quads = new Map<string, THREE.BufferGeometry[]>();

  constructor(
    readonly cellW = 512,
    readonly cellH = 320,
    readonly cols = 4,
    readonly rows = 6,
  ) {
    this.canvas.width = cellW * cols;
    this.canvas.height = THREE.MathUtils.ceilPowerOfTwo(cellH * rows);
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
  }

  /** The pixel rectangle of the block of `w × h` cells whose top left cell is at column `c`, row `r`. */
  cell(c: number, r: number, w = 1, h = 1): { x: number; y: number; w: number; h: number } {
    if (c + w > this.cols || r + h > this.rows) throw new Error("ScreenAtlas: celda fuera del atlas");
    return { x: c * this.cellW, y: r * this.cellH, w: w * this.cellW, h: h * this.cellH };
  }

  /** A screen of `w × h` m showing the pixel rectangle `px`, placed by `m` (facing local +Z). */
  quad(px: { x: number; y: number; w: number; h: number }, w: number, h: number, m: THREE.Matrix4, group = "main"): void {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.getAttribute("uv");
    const W = this.canvas.width;
    const H = this.canvas.height;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      // Canvas y goes down; texture v goes up (flipY).
      uv.setXY(i, (px.x + u * px.w) / W, 1 - (px.y + (1 - v) * px.h) / H);
    }
    g.applyMatrix4(m);
    if (!this.quads.has(group)) this.quads.set(group, []);
    this.quads.get(group)!.push(g);
  }

  private material: THREE.MeshBasicMaterial | undefined;

  /** The screens of one group, merged (one draw call; every group shares the texture and material). */
  build(group = "main"): THREE.Mesh {
    const list = this.quads.get(group) ?? [];
    this.material ??= new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false });
    const mesh = new THREE.Mesh(mergeGeometries(list, false)!, this.material);
    for (const g of list) g.dispose();
    mesh.userData.noCut = group === "main";
    return mesh;
  }

  /** After painting: upload the canvas again. */
  refresh(): void {
    this.texture.needsUpdate = true;
  }
}
