import * as THREE from "three";
import { BIOME, type AnimalSpec } from "@modules/aerial-sanctuary/data/bioma";
import { CROWDS, DENSITY, type CrowdSpec } from "@modules/aerial-sanctuary/data/bioma-crowd";
import { BIOME_ISLAND, inside } from "@modules/aerial-sanctuary/data/bioma-island";
import { crowdCounts, type CrowdCounts } from "@modules/aerial-sanctuary/domain/bioma-crowd";
import type { BiomeState } from "@modules/aerial-sanctuary/domain/bioma";
import { hash01 } from "@modules/fauna/domain/roam";
import type { AnimalHerd } from "./animal-bodies";

/**
 * THE CROWDS DRAWN (docs/design/bioma-s3.md §Multitudes): around the few animals the food chain lives, the colony,
 * the beach, the harem, the albatross nests and the petrel cliff at their real density, as many as the chain's numbers
 * times their scale factor (domain/bioma-crowd.ts). Level of detail: near the camera they are the species' own jointed
 * cube bodies (the same herd as the chain's animals: no extra draw call), farther away one or two plain boxes each;
 * nests, eggs and the crevices' rocks are boxes too. All the boxes are ONE instanced mesh (one draw call). They are
 * placed again only when the counts change or the camera has moved a few metres.
 */

/** Within this distance of the camera (m) a crowd animal is a jointed body. */
export const NEAR_M = 24;
/** Jointed bodies of the crowd per herd, at most (the iPhone 13's budget, PX-51). */
export const NEAR_CAP: Readonly<Record<string, { adult: number; young: number }>> = {
  papua: { adult: 200, young: 160 },
  lobo: { adult: 90, young: 60 },
  elefante: { adult: 30, young: 12 },
  albatros: { adult: 12, young: 10 },
  damero: { adult: 40, young: 20 },
};
/** Boxes for everything far, the nests and the eggs. */
const BOX_CAP = 12000;
/** Eggs are drawn only this near (under a sitting bird they are not seen from afar). */
const EGG_M = 40;
/** Moved this far, the camera's near and far are sorted again. */
const RESORT_M = 3;

interface Place {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
}
export interface CrowdPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Moult: 0–1. */
  moult: number;
  seed: number;
}

const specOf = new Map(BIOME.filter((s): s is AnimalSpec => s.kind === "animal").map((s) => [s.id, s]));
const COLOR = {
  nest: new THREE.Color(0x7d7a74),
  mud: new THREE.Color(0x4a3a26),
  rock: new THREE.Color(0x5f5d58),
  egg: new THREE.Color(0xf1ede0),
  worn: new THREE.Color(0x8a7458),
};

export class BiomeCrowd {
  readonly boxes: THREE.InstancedMesh;
  private readonly places = new Map<string, Place[]>();
  private readonly counts = new Map<string, CrowdCounts>();
  /** Near crowd poses per herd («papua», «papua:cria»), filled at each sort. */
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

  constructor(readonly k: number) {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 }), BOX_CAP);
    m.name = "bioma-multitud";
    m.frustumCulled = false;
    m.count = 0;
    m.setColorAt(0, COLOR.nest);
    this.boxes = m;
    for (const c of CROWDS) this.places.set(c.species, this.placesOf(c));
  }

  /** The places of a crowd: a hex grid at its spacing over its patches, the patches' middles first (as colonies fill). */
  private placesOf(c: CrowdSpec): Place[] {
    const C = BIOME_ISLAND.centre.value;
    const k = this.k;
    const s = c.spacingM;
    const out: (Place & { order: number })[] = [];
    c.patches.forEach((p, pi) => {
      const R = p.r * k;
      const row = s * 0.866;
      for (let j = -Math.ceil(R / row); j <= Math.ceil(R / row); j++)
        for (let i = -Math.ceil(R / s); i <= Math.ceil(R / s); i++) {
          const seed = pi * 7919 + j * 131 + i;
          const dx = (i + (j % 2 ? 0.5 : 0) + (hash01(seed, 1) - 0.5) * 0.3) * s;
          const dz = (j + (hash01(seed, 2) - 0.5) * 0.3) * row;
          const d = Math.hypot(dx, dz);
          if (d > R) continue;
          const lx = p.x + dx / k;
          const lz = p.z + dz / k;
          if (!inside(lx * 1.03, lz * 1.03)) continue;
          const yaw = hash01(seed, 3) * Math.PI * 2;
          out.push({ x: C.x + lx * k, z: C.z + lz * k, yaw, order: d / R + 0.35 * hash01(seed, 4) });
        }
    });
    return out.sort((a, b) => a.order - b.order);
  }

  /** Every crowd animal drawn now (near or far), for the journeys' count of what is in view. */
  private readonly drawn: { x: number; z: number; species: string }[] = [];

  /** Crowd animals inside the camera's view within `maxM` metres, by species (PX-51). */
  inView(camera: THREE.Camera, maxM = 80): Record<string, number> {
    const f = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const v = new THREE.Vector3();
    const out: Record<string, number> = {};
    for (const d of this.drawn) {
      v.set(d.x, 0.3, d.z);
      if (v.distanceTo(camera.position) > maxM || !f.containsPoint(v)) continue;
      out[d.species] = (out[d.species] ?? 0) + 1;
    }
    return out;
  }

  /** The middle of the patch with most of a crowd drawn (where to look at it). */
  centreOf(species: string): { x: number; z: number } | undefined {
    const ds = this.drawn.filter((d) => d.species === species);
    if (!ds.length) return undefined;
    return { x: ds.reduce((t, d) => t + d.x, 0) / ds.length, z: ds.reduce((t, d) => t + d.z, 0) / ds.length };
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
      key += `${n.adults},${n.young},${n.eggs},${n.nests},${Math.round(n.moult * 10)}|`;
    }
    const moved = Math.hypot(camera.x - this.cam.x, camera.z - this.cam.z) > RESORT_M;
    if (key === this.key && !moved) return false;
    this.key = key;
    this.cam.copy(camera);
    this.n = 0;
    this.drawn.length = 0;
    for (const c of CROWDS) this.place(c);
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

  private place(c: CrowdSpec): void {
    const s = specOf.get(c.species)!;
    const n = this.counts.get(c.species)!;
    const P = this.places.get(c.species)!;
    if (!P.length) return;
    const nearA: CrowdPose[] = [];
    const nearY: CrowdPose[] = [];
    this.near.set(c.species, nearA);
    this.near.set(`${c.species}:cria`, nearY);
    const cap = NEAR_CAP[c.species] ?? { adult: 0, young: 0 };
    const cam = this.cam;
    const dist = (p: { x: number; z: number }) => Math.hypot(p.x - cam.x, p.z - cam.z);
    const clutch = Math.max(1, s.young);
    const nests = Math.min(n.nests, P.length);
    const chickNests = n.phase === "pollos" ? Math.min(nests, Math.ceil(n.young / clutch)) : 0;
    const nestH = c.nest === "barro" ? DENSITY.albatrossNest.value.h : c.nest === "piedras" ? DENSITY.gentooNest.value.h : 0.05;
    // Nests: pebble mounds, mud bowls on the tussac, or a crevice between two rocks; their eggs while they are sat.
    for (let i = 0; i < nests; i++) {
      const p = P[i]!;
      if (c.nest === "piedras") this.box(p.x, 0, p.z, p.yaw, 0.45, nestH, 0.45, COLOR.nest);
      else if (c.nest === "barro") {
        this.box(p.x, 0, p.z, p.yaw, 1, nestH * 0.6, 1, COLOR.mud);
        this.box(p.x, nestH * 0.6, p.z, p.yaw, 0.6, nestH * 0.4, 0.6, COLOR.mud);
      } else {
        this.boxAt(p, p.yaw, 0, -0.45, 0, 0.45, 0.55, 0.7, COLOR.rock);
        this.boxAt(p, p.yaw, 0, 0.45, 0, 0.45, 0.45, 0.7, COLOR.rock);
      }
      const egged = i >= chickNests && i < chickNests + n.broodNests;
      if (egged && dist(p) < EGG_M) {
        const e = s.id === "albatros" ? 0.1 : s.id === "papua" ? 0.07 : 0.05;
        for (let k = 0; k < clutch; k++) this.boxAt(p, p.yaw, 0.12 + k * 0.02, (k - (clutch - 1) / 2) * 0.12, nestH, e, e * 1.3, e, COLOR.egg);
      }
    }
    // Adults: one on each nest (sitting), the rest standing by; past the places, partners beside them.
    for (let i = 0; i < n.adults; i++) {
      const base = P[i % P.length]!;
      const partner = i >= P.length;
      const at = partner ? { x: base.x + 0.45 * Math.cos(base.yaw), z: base.z - 0.45 * Math.sin(base.yaw) } : base;
      const onNest = !partner && i < nests && c.nest !== "grieta";
      const y = onNest ? nestH * 0.7 : 0;
      const moult = hash01(i, 91) < n.moult ? 0.6 + 0.4 * hash01(i, 92) : 0;
      this.drawn.push({ x: at.x, z: at.z, species: c.species });
      if (nearA.length < cap.adult && dist(at) < NEAR_M) nearA.push({ x: at.x, y, z: at.z, yaw: base.yaw + (partner ? 2.6 : 0), moult, seed: i });
      else this.impostor(s, at, base.yaw, y, false, moult);
    }
    // Young: chicks two to a nest, pups by their mothers.
    for (let j = 0; j < n.young; j++) {
      const bird = s.shape !== "pinnipedo";
      const base = bird ? P[Math.floor(j / clutch) % P.length]! : P[j % P.length]!;
      const side = bird ? (j % clutch - (clutch - 1) / 2) * 0.3 : 0.8;
      const at = { x: base.x + Math.cos(base.yaw) * side + Math.sin(base.yaw) * (bird ? 0.25 : 0), z: base.z - Math.sin(base.yaw) * side + Math.cos(base.yaw) * (bird ? 0.25 : 0) };
      const y = bird && Math.floor(j / clutch) < nests ? nestH * 0.7 : 0;
      this.drawn.push({ x: at.x, z: at.z, species: c.species });
      if (nearY.length < cap.young && dist(at) < NEAR_M) nearY.push({ x: at.x, y, z: at.z, yaw: base.yaw + 0.4 * (hash01(j, 93) - 0.5), moult: 0, seed: j + 5000 });
      else this.impostor(s, at, base.yaw, y, true, 0);
    }
  }

  /** The simplified body far away: one or two boxes in the species' colours. */
  private impostor(s: AnimalSpec, p: { x: number; z: number }, yaw: number, y: number, young: boolean, moult: number): void {
    const S = s.size;
    const body = this.c.set(young ? (s.shape === "pinnipedo" ? 0x2a2522 : 0x7a746c) : s.color);
    if (moult) body.lerp(COLOR.worn, moult * 0.4);
    const k = young ? (s.shape === "pinguino" ? 0.55 : s.shape === "pinnipedo" ? 0.45 : 0.6) : 1;
    if (s.shape === "pinguino") {
      this.boxAt(p, yaw, 0, 0, y, S.x * 0.9 * k, S.y * 0.95 * k, S.z * 0.8 * k, body);
      if (!young) this.boxAt(p, yaw, S.z * 0.38, 0, y + S.y * 0.1, S.x * 0.7, S.y * 0.6, 0.04, COLOR.egg);
    } else if (s.shape === "pinnipedo") {
      this.boxAt(p, yaw, 0, 0, y, S.x * 0.9 * k, S.y * 0.7 * k, S.z * 0.85 * k, body);
      this.boxAt(p, yaw, S.z * 0.45 * k, 0, y + S.y * 0.25 * k, S.x * 0.5 * k, S.y * 0.4 * k, S.z * 0.15 * k, body);
    } else {
      // A seabird sitting: body and folded wings (size x is the wingspan).
      const L = S.z * k;
      this.boxAt(p, yaw, 0, 0, y, L * 0.4, L * 0.35, L * 0.85, young ? body : COLOR.egg);
      if (!young) this.boxAt(p, yaw, -L * 0.05, 0, y + L * 0.2, L * 0.44, L * 0.08, L * 0.7, this.c.set(s.id === "damero" ? 0x2a2a2a : 0x3a3a3a));
    }
  }
}
