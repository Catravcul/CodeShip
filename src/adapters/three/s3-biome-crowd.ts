import * as THREE from "three";
import type { AnimalSpec } from "@modules/aerial-sanctuary/data/bioma";
import { CROWDS, type CrowdSpec } from "@modules/aerial-sanctuary/data/bioma-crowd";
import { BIOME_ISLAND, MOUNTAIN } from "@modules/aerial-sanctuary/data/bioma-island";
import { crowdCounts, crowdSpecies, type CrowdCounts } from "@modules/aerial-sanctuary/domain/bioma-crowd";
import type { BiomeState } from "@modules/aerial-sanctuary/domain/bioma";
import { heightAt, slopeAt } from "@modules/aerial-sanctuary/domain/mountain";
import { hash01 } from "@modules/fauna/domain/roam";

/**
 * THE COLONIES DRAWN (docs/design/bioma-s3.md §Colonias): around the queens the food chain lives, their workers out
 * (domain/bioma-crowd.ts): the Asian honeybees' hives in the rock cavities of the meadow, the Gilgit bumblebees' nests
 * in old burrows, the hornets' paper nests hanging in the trees and the wood ants' mounds of needles. The workers fly
 * round their nest (the ants walk round their mound). Level of detail: near the camera they are the species' own
 * jointed cube bodies (the same herd as the chain's animals: no extra draw call), farther away one box each; the nests
 * are boxes too. All the boxes are ONE instanced mesh (one draw call). They are placed again only when the counts
 * change or the camera has moved a few metres; the near workers' flight is posed by the scene each frame (`orbit`).
 *
 * The nests are drawn smaller than the insects' scale (licencia): a hive's cavity ×400 would be a hill of 160 m.
 */

/** Within this distance of the camera (m) a crowd animal is a jointed body. */
export const NEAR_M = 30;
/** Jointed bodies of the crowd per herd, at most (the iPhone 13's budget, PX-51). */
export const NEAR_CAP: Readonly<Record<string, { adult: number; young: number }>> = {
  abeja: { adult: 24, young: 0 },
  abejorro: { adult: 12, young: 0 },
  avispon: { adult: 12, young: 0 },
  hormiga: { adult: 24, young: 0 },
};
/** Boxes for everything far and the nests. */
const BOX_CAP = 2000;
/** Moved this far, the camera's near and far are sorted again. */
const RESORT_M = 3;

interface Place {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
}
export interface CrowdPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  seed: number;
  /** A worker's round about its nest (centre x, z; radius, height over y, turns a second): the scene flies it. */
  orbit?: { cx: number; cz: number; r: number; h: number; w: number };
}

const COLOR = {
  dirt: new THREE.Color(0xa88d68),
  rock: new THREE.Color(0x6a655e),
  hole: new THREE.Color(0x2a221a),
  comb: new THREE.Color(0xe0b040),
  moss: new THREE.Color(0x5a6a3a),
  paper: new THREE.Color(0xb8a68a),
  paperBand: new THREE.Color(0x8a7658),
  trunk: new THREE.Color(0x4a3828),
  needles: new THREE.Color(0x7a5a36),
};

export class BiomeCrowd {
  readonly boxes: THREE.InstancedMesh;
  private readonly places = new Map<string, Place[]>();
  private readonly counts = new Map<string, CrowdCounts>();
  /** Near crowd poses per herd («ibice», «ibice:cria»), filled at each sort. */
  readonly near = new Map<string, CrowdPose[]>();
  private key = "";
  private readonly cam = new THREE.Vector3(1e9, 0, 0);
  private n = 0;
  private readonly M = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();
  private static readonly Y = new THREE.Vector3(0, 1, 0);

  constructor() {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 }), BOX_CAP);
    m.name = "bioma-multitud";
    m.frustumCulled = false;
    m.count = 0;
    m.setColorAt(0, COLOR.dirt);
    this.boxes = m;
    for (const c of CROWDS) this.places.set(c.species, this.placesOf(c));
  }

  /** The places of a crowd: a jittered grid at its spacing over its patches, on its footing, the middles first. */
  private placesOf(c: CrowdSpec): Place[] {
    const C = BIOME_ISLAND.centre.value;
    const M = MOUNTAIN.value;
    const s = c.spacingM;
    const out: (Place & { order: number })[] = [];
    c.patches.forEach((p, pi) => {
      const row = s * 0.866;
      for (let j = -Math.ceil(p.r / row); j <= Math.ceil(p.r / row); j++)
        for (let i = -Math.ceil(p.r / s); i <= Math.ceil(p.r / s); i++) {
          const seed = pi * 7919 + j * 131 + i;
          const dx = (i + (j % 2 ? 0.5 : 0) + (hash01(seed, 1) - 0.5) * 0.4) * s;
          const dz = (j + (hash01(seed, 2) - 0.5) * 0.4) * row;
          const d = Math.hypot(dx, dz);
          if (d > p.r) continue;
          const lx = p.x + dx;
          const lz = p.z + dz;
          const y = heightAt(M, lx, lz);
          if (y < 0.5) continue;
          // Nests on steep rock only if so; the rest on ground she could walk to.
          const sl = slopeAt(M, lx, lz);
          if (c.footing === "roca" ? sl < 0.6 : sl > 0.9) continue;
          out.push({ x: C.x + lx, y, z: C.z + lz, yaw: hash01(seed, 3) * Math.PI * 2, order: d / p.r + 0.35 * hash01(seed, 4) });
        }
    });
    return out.sort((a, b) => a.order - b.order);
  }

  /** Every crowd animal drawn now (near or far), for the journeys' count of what is in view. */
  private readonly drawn: { x: number; y: number; z: number; species: string }[] = [];

  /** Crowd animals inside the camera's view within `maxM` metres, by species (PX-51). */
  inView(camera: THREE.Camera, maxM = 120): Record<string, number> {
    const f = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const v = new THREE.Vector3();
    const out: Record<string, number> = {};
    for (const d of this.drawn) {
      v.set(d.x, d.y + 0.3, d.z);
      if (v.distanceTo(camera.position) > maxM || !f.containsPoint(v)) continue;
      out[d.species] = (out[d.species] ?? 0) + 1;
    }
    return out;
  }

  /** The middle of a crowd drawn now (where to look at it). */
  centreOf(species: string): { x: number; y: number; z: number } | undefined {
    const ds = this.drawn.filter((d) => d.species === species);
    if (!ds.length) {
      const p = this.places.get(species)?.[0];
      return p && { x: p.x, y: p.y, z: p.z };
    }
    // The colony of the first one drawn: those within 30 m of it.
    const d0 = ds[0]!;
    const g = ds.filter((d) => Math.hypot(d.x - d0.x, d.z - d0.z) < 30);
    const n = g.length;
    return { x: g.reduce((t, d) => t + d.x, 0) / n, y: g.reduce((t, d) => t + d.y, 0) / n, z: g.reduce((t, d) => t + d.z, 0) / n };
  }

  /** Where a colony's nests stand (world m): the hives, for the hornets that hunt before them. */
  hivesOf(species: string, max = 12): { x: number; z: number }[] {
    return (this.places.get(species) ?? []).slice(0, max).map((p) => ({ x: p.x, z: p.z }));
  }

  /** How many drawn now, by crowd (the test hook and the census check). */
  countsOf(species: string): CrowdCounts | undefined {
    return this.counts.get(species);
  }

  /** Places them again if the counts changed or the camera moved; true if it did. */
  update(st: BiomeState, camera: THREE.Vector3): boolean {
    let key = "";
    for (const c of CROWDS) {
      const n = crowdCounts(st, c);
      this.counts.set(c.species, n);
      key += `${n.adults},${n.young},${n.eggs},${n.nests}|`;
    }
    const moved = Math.hypot(camera.x - this.cam.x, camera.z - this.cam.z) > RESORT_M;
    if (key === this.key && !moved) return false;
    this.key = key;
    this.cam.copy(camera);
    this.n = 0;
    this.drawn.length = 0;
    for (const c of CROWDS) {
      const s = crowdSpecies(st, c);
      if (s) this.place(c, s, st.def.drawScale ?? 1);
    }
    this.boxes.count = this.n;
    this.boxes.instanceMatrix.needsUpdate = true;
    if (this.boxes.instanceColor) this.boxes.instanceColor.needsUpdate = true;
    return true;
  }

  private box(x: number, y: number, z: number, yaw: number, sx: number, sy: number, sz: number, color: THREE.Color): void {
    if (this.n >= BOX_CAP) return;
    this.q.setFromAxisAngle(BiomeCrowd.Y, yaw);
    this.M.compose(this.v.set(x, y + sy / 2, z), this.q, this.s.set(sx, sy, sz));
    this.boxes.setMatrixAt(this.n, this.M);
    this.boxes.setColorAt(this.n, color);
    this.n++;
  }

  /** A box at an offset (forward `f`, right `r`) from a place facing `yaw`. */
  private boxAt(p: { x: number; z: number }, yaw: number, f: number, r: number, y: number, sx: number, sy: number, sz: number, color: THREE.Color): void {
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    this.box(p.x + sin * f + cos * r, y, p.z + cos * f - sin * r, yaw, sx, sy, sz, color);
  }

  /** The nest of a colony at `p`: a rock cavity with its combs, a mossy burrow, a paper nest in a tree, a mound. */
  private nest(c: CrowdSpec, p: Place): number {
    if (c.nest === "colmena") {
      // A boulder split by a cleft: the combs of Apis cerana hang in parallel inside its dark mouth.
      this.boxAt(p, p.yaw, 0, -1.6, p.y - 0.3, 2.4, 4.2, 3.4, COLOR.rock);
      this.boxAt(p, p.yaw, 0, 1.6, p.y - 0.3, 2.4, 3.8, 3.4, COLOR.rock);
      this.boxAt(p, p.yaw, -0.2, 0, p.y + 3.2, 5.6, 1.2, 3.6, COLOR.rock);
      this.boxAt(p, p.yaw, 0, 0, p.y - 0.3, 0.9, 3.4, 3, COLOR.hole);
      for (const r of [-0.3, 0, 0.3]) this.boxAt(p, p.yaw, 0.6, r, p.y + 0.8, 0.08, 2.2, 1.6, COLOR.comb);
      return 1.5;
    }
    if (c.nest === "hormiguero") {
      // The wood ants' mound of pine needles and twigs, its crown and two doors.
      this.box(p.x, p.y - 0.2, p.z, p.yaw, 7, 1.4, 6.4, COLOR.needles);
      this.box(p.x, p.y + 1, p.z, p.yaw + 0.5, 4.4, 1.2, 4, COLOR.needles);
      this.box(p.x, p.y + 2, p.z, p.yaw, 2, 0.6, 1.8, COLOR.needles);
      this.boxAt(p, p.yaw, 3.3, 0, p.y, 0.6, 0.4, 0.3, COLOR.hole);
      this.boxAt(p, p.yaw, -3.3, 0.6, p.y, 0.6, 0.4, 0.3, COLOR.hole);
      return 0;
    }
    if (c.species === "avispon") {
      // A trunk and the hornets' paper nest hanging from it, banded, its door low on one side.
      this.box(p.x, p.y - 0.5, p.z, p.yaw, 1.2, 14, 1.2, COLOR.trunk);
      this.boxAt(p, p.yaw, 0, 2, p.y + 10.5, 4.6, 0.6, 0.6, COLOR.trunk);
      for (let k = 0; k < 5; k++) {
        const w = [2.4, 3.6, 4.2, 3.8, 2.6][k]!;
        this.boxAt(p, p.yaw, 0, 3.4, p.y + 9.8 - k * 1.1, w, 1.1, w, k % 2 ? COLOR.paperBand : COLOR.paper);
      }
      this.boxAt(p, p.yaw, 2, 3.4, p.y + 5.6, 0.6, 0.5, 0.2, COLOR.hole);
      return 7;
    }
    // The bumblebee's nest in an old rodent burrow under moss: a low mound and its mouth.
    this.box(p.x, p.y - 0.15, p.z, p.yaw, 4, 0.9, 3.4, COLOR.moss);
    this.box(p.x, p.y + 0.5, p.z, p.yaw, 2.4, 0.5, 2, COLOR.dirt);
    this.boxAt(p, p.yaw, 1.8, 0, p.y + 0.05, 0.9, 0.6, 0.3, COLOR.hole);
    return 1.2;
  }

  private place(c: CrowdSpec, s: AnimalSpec, scale: number): void {
    const n = this.counts.get(c.species)!;
    const P = this.places.get(c.species)!;
    if (!P.length) return;
    const nearA: CrowdPose[] = [];
    this.near.set(c.species, nearA);
    this.near.set(`${c.species}:cria`, []);
    const cap = NEAR_CAP[c.species] ?? { adult: 0, young: 0 };
    const cam = this.cam;
    const dist = (p: { x: number; z: number }) => Math.hypot(p.x - cam.x, p.z - cam.z);
    const nests = Math.min(n.nests, P.length);
    const door: number[] = [];
    for (let i = 0; i < nests; i++) door.push(this.nest(c, P[i]!));
    if (!nests) return;
    // The workers out: round their nest (the ants on the ground), each its own radius, height and pace.
    const len = s.size.z * scale;
    const walks = c.nest === "hormiguero";
    for (let i = 0; i < n.adults; i++) {
      const k = i % nests;
      const base = P[k]!;
      const r = (walks ? 4.5 : 3) + len * (walks ? 0.8 : 1.5) * (0.6 + hash01(i, 71));
      const h = walks ? 0 : (door[k] ?? 1) + len * (0.3 + 1.2 * hash01(i, 72));
      const w = (walks ? 0.03 : 0.08) * (0.7 + 0.6 * hash01(i, 73)) * (hash01(i, 74) < 0.5 ? -1 : 1);
      const a = hash01(i, 75) * Math.PI * 2;
      const at = { x: base.x + Math.cos(a) * r, z: base.z + Math.sin(a) * r };
      const y = base.y + h;
      this.drawn.push({ x: at.x, y, z: at.z, species: c.species });
      if (nearA.length < cap.adult && dist(at) < NEAR_M + len * 4) nearA.push({ x: at.x, y, z: at.z, yaw: a + Math.PI / 2, seed: i, orbit: { cx: base.x, cz: base.z, r, h, w } });
      else this.impostor(s, at, a + Math.PI / 2, y, scale);
    }
  }

  /** The simplified insect far away: one box of its body in its colour. */
  private impostor(s: AnimalSpec, p: { x: number; z: number }, yaw: number, y: number, scale: number): void {
    const S = s.size;
    this.boxAt(p, yaw, 0, 0, y, S.x * 0.3 * scale, S.y * scale, S.z * scale, this.c.set(s.color));
  }
}
