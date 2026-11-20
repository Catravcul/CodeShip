import * as THREE from "three";
import type { AnimalSpec } from "@modules/aerial-sanctuary/data/bioma";
import { CROWDS, type CrowdSpec } from "@modules/aerial-sanctuary/data/bioma-crowd";
import { BIOME_ISLAND, MOUNTAIN } from "@modules/aerial-sanctuary/data/bioma-island";
import { crowdCounts, crowdSpecies, type CrowdCounts } from "@modules/aerial-sanctuary/domain/bioma-crowd";
import type { BiomeState } from "@modules/aerial-sanctuary/domain/bioma";
import { heightAt, slopeAt } from "@modules/aerial-sanctuary/domain/mountain";
import { hash01 } from "@modules/fauna/domain/roam";

/**
 * THE CROWDS DRAWN (docs/design/bioma-s3.md §Multitudes): around the few animals the food chain lives, the ibex herds
 * on the cliff ring, the markhor nannies on the gorge walls, the bharal on the meadow, the marmot families at their
 * burrows, the pikas of the scree, the griffons' colony on the ledges, the snowcock covey, the pigeons and the choughs,
 * as many as the chain's numbers times their scale factor (domain/bioma-crowd.ts), each standing on the mountain's
 * ground (cliff dwellers only on steep rock). Level of detail: near the camera they are the species' own jointed cube
 * bodies (the same herd as the chain's animals: no extra draw call), farther away one or two plain boxes each; burrows,
 * nests, eggs and the crevices' rocks are boxes too. All the boxes are ONE instanced mesh (one draw call). They are
 * placed again only when the counts change or the camera has moved a few metres.
 */

/** Within this distance of the camera (m) a crowd animal is a jointed body. */
export const NEAR_M = 30;
/** Jointed bodies of the crowd per herd, at most (the iPhone 13's budget, PX-51). */
export const NEAR_CAP: Readonly<Record<string, { adult: number; young: number }>> = {
  ibice: { adult: 30, young: 10 },
  markhor: { adult: 18, young: 8 },
  bharal: { adult: 22, young: 8 },
  marmota: { adult: 36, young: 20 },
  pika: { adult: 32, young: 12 },
  buitre: { adult: 12, young: 6 },
  perdiz: { adult: 12, young: 12 },
  paloma: { adult: 40, young: 10 },
  chova: { adult: 30, young: 10 },
};
/** Boxes for everything far, the burrows, nests and eggs. */
const BOX_CAP = 3000;
/** Eggs are drawn only this near (under a sitting bird they are not seen from afar). */
const EGG_M = 40;
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
}

const COLOR = {
  stick: new THREE.Color(0x6a5238),
  dirt: new THREE.Color(0x7a6248),
  rock: new THREE.Color(0x6a655e),
  egg: new THREE.Color(0xf1ede0),
  scrape: new THREE.Color(0x8a8a60),
  hole: new THREE.Color(0x2a221a),
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
    m.setColorAt(0, COLOR.stick);
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
          // Cliff dwellers stand on the steep rock (ledges); the rest on ground they could walk.
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
    // The group of the first one drawn (a herd, a family): those within 18 m of it.
    const d0 = ds[0]!;
    const g = ds.filter((d) => Math.hypot(d.x - d0.x, d.z - d0.z) < 18);
    const n = g.length;
    return { x: g.reduce((t, d) => t + d.x, 0) / n, y: g.reduce((t, d) => t + d.y, 0) / n, z: g.reduce((t, d) => t + d.z, 0) / n };
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
      if (s) this.place(c, s);
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

  private place(c: CrowdSpec, s: AnimalSpec): void {
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
    const nestH = c.nest === "repisa" ? 0.3 : c.nest === "suelo" ? 0.05 : 0.08;
    // Burrows (a mound of dug earth and its dark mouth), stick nests on the ledges, crevices, scrapes; eggs while sat.
    for (let i = 0; i < nests; i++) {
      const p = P[(i * 3) % P.length]!;
      if (c.nest === "madriguera") {
        this.box(p.x, p.y - 0.1, p.z, p.yaw, 1.4, 0.35, 1.1, COLOR.dirt);
        this.boxAt(p, p.yaw, 0.55, 0, p.y - 0.05, 0.35, 0.28, 0.12, COLOR.hole);
      } else if (c.nest === "repisa") this.box(p.x, p.y, p.z, p.yaw, 1.3, nestH, 1.3, COLOR.stick);
      else if (c.nest === "suelo") this.box(p.x, p.y, p.z, p.yaw, 0.35, nestH, 0.35, COLOR.scrape);
      else {
        this.boxAt(p, p.yaw, 0, -0.4, p.y, 0.45, 0.55, 0.6, COLOR.rock);
        this.boxAt(p, p.yaw, 0, 0.4, p.y, 0.45, 0.45, 0.6, COLOR.rock);
      }
      const egged = c.nest !== "madriguera" && i >= chickNests && i < chickNests + n.broodNests;
      if (egged && dist(p) < EGG_M) {
        const e = c.species === "buitre" ? 0.1 : 0.045;
        for (let k = 0; k < clutch; k++) this.boxAt(p, p.yaw, 0.1 + k * 0.02, (k - (clutch - 1) / 2) * 0.1, p.y + nestH, e, e * 1.3, e, COLOR.egg);
      }
    }
    // Adults: on the nests (sitting), the rest by them; past the places, partners beside them.
    for (let i = 0; i < n.adults; i++) {
      const base = P[i % P.length]!;
      const partner = i >= P.length;
      const at = partner ? { x: base.x + 0.6 * Math.cos(base.yaw), z: base.z - 0.6 * Math.sin(base.yaw) } : base;
      const onNest = !partner && i < nests && (c.nest === "repisa" || c.nest === "suelo");
      const y = base.y + (onNest ? nestH * 0.7 : 0);
      this.drawn.push({ x: at.x, y, z: at.z, species: c.species });
      if (nearA.length < cap.adult && dist(at) < NEAR_M) nearA.push({ x: at.x, y, z: at.z, yaw: base.yaw + (partner ? 2.6 : 0), seed: i });
      else this.impostor(s, at, base.yaw, y, false);
    }
    // Young: chicks in their nest, kids and pups by their mothers.
    const nestBound = s.shape !== "cuadrupedo" && c.nest !== "suelo";
    for (let j = 0; j < n.young; j++) {
      const base = nestBound ? P[((Math.floor(j / clutch) % P.length) * 3) % P.length]! : P[j % P.length]!;
      const side = nestBound ? ((j % clutch) - (clutch - 1) / 2) * 0.3 : 0.9;
      const at = { x: base.x + Math.cos(base.yaw) * side + Math.sin(base.yaw) * (nestBound ? 0.25 : 0), z: base.z - Math.sin(base.yaw) * side + Math.cos(base.yaw) * (nestBound ? 0.25 : 0) };
      const y = base.y + (nestBound ? nestH * 0.7 : 0);
      this.drawn.push({ x: at.x, y, z: at.z, species: c.species });
      if (nearY.length < cap.young && dist(at) < NEAR_M) nearY.push({ x: at.x, y, z: at.z, yaw: base.yaw + 0.4 * (hash01(j, 93) - 0.5), seed: j + 5000 });
      else this.impostor(s, at, base.yaw, y, true);
    }
  }

  /** The simplified body far away: one or two boxes in the species' colours. */
  private impostor(s: AnimalSpec, p: { x: number; z: number }, yaw: number, y: number, young: boolean): void {
    const S = s.size;
    const body = this.c.set(s.color);
    const k = young ? 0.55 : 1;
    if (s.shape === "cuadrupedo") {
      // Body on legs, and the head.
      this.boxAt(p, yaw, 0, 0, y + S.y * 0.45 * k, S.x * k, S.y * 0.45 * k, S.z * 0.8 * k, body);
      this.boxAt(p, yaw, S.z * 0.45 * k, 0, y + S.y * 0.7 * k, S.x * 0.6 * k, S.y * 0.25 * k, S.z * 0.2 * k, body);
      this.boxAt(p, yaw, 0, 0, y, S.x * 0.8 * k, S.y * 0.45 * k, S.z * 0.6 * k, body);
    } else {
      // A bird standing: body and folded wings (size x is the wingspan).
      const L = S.z * k;
      this.boxAt(p, yaw, 0, 0, y, L * 0.4, L * 0.45, L * 0.85, body);
    }
  }
}
