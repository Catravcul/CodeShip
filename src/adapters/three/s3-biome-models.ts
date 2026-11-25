import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { AnimalSpec, BiomeDef } from "@modules/aerial-sanctuary/data/bioma";
import { BELTS, BIOME_ISLAND, BIOME_ZONES, HUT_Y, MOUNTAIN, hutPoint } from "@modules/aerial-sanctuary/data/bioma-island";
import { altitudeOf, fbm, gorgeAt, heightAt, slopeAt } from "@modules/aerial-sanctuary/domain/mountain";
import { hash01 } from "@modules/fauna/domain/roam";
import type { Pose } from "@modules/aerial-sanctuary/application/biome-life";
import type { BiomeState } from "@modules/aerial-sanctuary/domain/bioma";
import { AnimalHerd, type HerdModel } from "./animal-bodies";
import { BiomeCrowd, NEAR_CAP } from "./s3-biome-crowd";

/**
 * The air island drawn (docs/design/bioma-s3.md §Escena): ONE GIANT MOUNTAIN, procedural, at its true size. The ground
 * is a height field (domain/mountain.ts) in chunks, coloured by its real belt (artemisia steppe, pine forest floor,
 * tree line, alpine meadow, scree, snow), by its slope (bare rock on the cliffs) and its trails; boulders and rock
 * slabs stand out of the cliffs; the river runs down the gorge. The plants with their real shapes: blue pines and
 * spruce in the forest belt, birches and junipers at the tree line, artemisia bushes on the steppe, sea buckthorn by
 * the river, and near the camera the meadow's sedges, the cushion plants, the blue poppies of the scree and the woolly
 * saussureas of the ridge. The animals are jointed cube bodies (fauna's animal-body) and their crowds. Every kind is
 * one InstancedMesh (or one per chunk for the ground): few draw calls on a phone (PX-51 ≤ 600).
 */
const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, ...o });

/** The ground's grid step (m) and chunks per side. */
const GRID_M = 6;
const CHUNKS = 4;
/** Instances of each plant kind (the mobile budget: docs/design/bioma-s3.md §Presupuesto). */
export const PLANT_BUDGET = { pino: 900, abedul: 160, enebro: 420, artemisa: 700, espino: 140, roca: 900, pradera: 1400, cojines: 500, amapola: 120, saussurea: 140, piedras: 1800 } as const;
/** Near-camera plants (sedges, cushions, flowers) are scattered this far (m), and again when she moved this far. */
const NEAR_PLANTS_M = 70;
const NEAR_MOVE_M = 8;
/** The grid offsets within `r` cells, nearest first (cached by radius). */
const RINGS = new Map<number, readonly (readonly [number, number])[]>();
function ringOrder(r: number): readonly (readonly [number, number])[] {
  let o = RINGS.get(r);
  if (!o) {
    const a: [number, number][] = [];
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) a.push([i, j]);
    o = a.sort((p, q) => p[0] * p[0] + p[1] * p[1] - (q[0] * q[0] + q[1] * q[1]));
    RINGS.set(r, o);
  }
  return o;
}
/** The scree cone below the cliffs (local m): the pikas' pedrera (data/bioma-island.ts, zone «pedrera»). */
const SCREE = { x: 175, z: -75, r: 55 };
const inScree = (lx: number, lz: number): number => Math.max(0, 1 - Math.hypot(lx - SCREE.x, lz - SCREE.z) / SCREE.r);

/** Belt colours (ours, from photographs of the Hunza valley sides). */
const BELT_COLOR: Readonly<Record<string, number>> = { submontano: 0xb09a6a, montano: 0x5d6a3c, subalpino: 0x6c7a44, alpino: 0x7f9a4c, subnival: 0x8c877e, nival: 0xeef1f4 };
const ROCK = new THREE.Color(0x6e665d);
const TRAIL = new THREE.Color(0xb8a888);
const SAND = new THREE.Color(0xa49c88);
const GRAVEL = new THREE.Color(0x8d8a84);
const SCREE_COLOR = new THREE.Color(0x938c80);

interface Placed {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly s: number;
  readonly r: number;
}

export class BiomeScene {
  readonly root = new THREE.Group();
  private readonly herds = new Map<string, { adult: AnimalHerd; young: AnimalHerd; n: number }>();
  private readonly C: { x: number; z: number };
  private readonly M = MOUNTAIN.value;
  /** The crowds on the mountain (s3-biome-crowd.ts). */
  readonly crowd: BiomeCrowd;
  /** Jointed bodies of the crowd at the start of each herd (the chain's animals come after them). */
  private readonly crowdN = new Map<string, number>();
  private frameNo = 0;
  /** Plants by kind: their instances, where they are, and how they grow with their cover. */
  private readonly plants = new Map<string, { mesh: THREE.InstancedMesh; at: Placed[]; base: (p: Placed, f: number, m: THREE.Matrix4) => void; key?: number }>();
  /** Near-camera plants and where they were last scattered. */
  private readonly nearKinds: { id: string; mesh: THREE.InstancedMesh; cap: number; ok: (alt: number, slope: number, lx: number, lz: number) => boolean; spacing: number; size: number }[] = [];
  private nearAt = new THREE.Vector3(1e9, 0, 0);
  private readonly nearCache = new Map<string, Placed | null>();
  private cover: Readonly<Record<string, number>> = {};
  /** Gliders: their wings held still in the air (the Apollo butterfly sails between beats; birds of other biomes). */
  private readonly soarers = new Set(["mariposa", "buitre", "quebrantahuesos", "aguila"]);

  constructor(readonly k: number, def: BiomeDef) {
    this.C = BIOME_ISLAND.centre.value;
    this.root.name = "bioma";
    this.addGround();
    this.addRiver();
    this.addRocks();
    this.addTrees();
    this.addShrubs();
    this.addNearPlants();
    this.crowd = new BiomeCrowd();
    this.root.add(this.crowd.boxes);
    this.addAnimals(def);
    this.addHut(def);
  }

  private world(x: number, z: number) {
    return { x: this.C.x + x, z: this.C.z + z };
  }

  /** The ground at local (x, z). */
  private h(x: number, z: number): number {
    return heightAt(this.M, x, z);
  }

  /** The colour of the ground at local (x, z): its belt, bare rock where it is steep, the trails, the river's gravel. */
  private groundColor(x: number, z: number, y: number, slope: number, c: THREE.Color): THREE.Color {
    const alt = altitudeOf(this.M, y);
    const n = fbm(x, z, 25, 2, 3);
    // Between belts the colours blend over ~150 real metres.
    let belt = BELTS[0]!;
    for (const b of BELTS) if (alt >= b.from - 75) belt = b;
    const i = BELTS.indexOf(belt);
    c.setHex(BELT_COLOR[belt.id]!);
    if (i > 0) {
      const t = Math.min(1, Math.max(0, (alt - (belt.from - 75)) / 150));
      c.lerpColors(new THREE.Color(BELT_COLOR[BELTS[i - 1]!.id]!), new THREE.Color(BELT_COLOR[belt.id]!), t);
    }
    // Patchy snow in the subnival belt (hollows and north faces), none on the steep rock.
    if (belt.id === "subnival" && n > 0.15) c.lerp(new THREE.Color(BELT_COLOR.nival!), Math.min(1, (n - 0.15) * 3));
    const rock = Math.min(1, Math.max(0, (slope - 0.75) / 0.6));
    if (rock > 0) c.lerp(ROCK, belt.id === "nival" ? rock * 0.8 : rock);
    // The scree cone: grey stones over the meadow, thinning at its edge.
    const scree = inScree(x, z);
    if (scree > 0) c.lerp(SCREE_COLOR, Math.min(1, scree * 2.2));
    if (y < 0.9) c.lerp(SAND, Math.min(1, (0.9 - y) / 0.6));
    const g = gorgeAt(this.M, x, z);
    if (g.q < this.M.gorgeFloorHalf + 1 && y < g.floor + 1.5) c.copy(GRAVEL);
    if (this.trailDist(x, z) < 2.2) c.lerp(TRAIL, 0.75);
    return c.offsetHSL(0.01 * n, 0, n * 0.05);
  }

  /** Distance to the nearest trail (local m). */
  private trailDist(x: number, z: number): number {
    let best = Infinity;
    for (const t of this.M.trails ?? [])
      for (let i = 1; i < t.length; i++) {
        const a = t[i - 1]!;
        const b = t[i]!;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
        best = Math.min(best, Math.hypot(x - (a.x + dx * u), z - (a.z + dz * u)));
      }
    return best;
  }

  /** The ground: the height field in chunks (each culled on its own), coloured per vertex. */
  private addGround(): void {
    const X = this.M.half.x * 1.15;
    const Z = this.M.half.z * 1.15;
    const nx = Math.ceil((2 * X) / GRID_M);
    const nz = Math.ceil((2 * Z) / GRID_M);
    const cx = Math.ceil(nx / CHUNKS);
    const cz = Math.ceil(nz / CHUNKS);
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false });
    const c = new THREE.Color();
    for (let a = 0; a < CHUNKS; a++)
      for (let b = 0; b < CHUNKS; b++) {
        const i0 = a * cx;
        const j0 = b * cz;
        const i1 = Math.min(nx, i0 + cx);
        const j1 = Math.min(nz, j0 + cz);
        const w = i1 - i0 + 1;
        const pos: number[] = [];
        const col: number[] = [];
        const idx: number[] = [];
        let land = false;
        for (let j = j0; j <= j1; j++)
          for (let i = i0; i <= i1; i++) {
            const x = -X + i * GRID_M;
            const z = -Z + j * GRID_M;
            const y = this.h(x, z);
            if (y > -0.5) land = true;
            const p = this.world(x, z);
            pos.push(p.x, Math.max(-12, y), p.z);
            this.groundColor(x, z, y, slopeAt(this.M, x, z, GRID_M / 2), c);
            col.push(c.r, c.g, c.b);
          }
        if (!land) continue;
        for (let j = 0; j < j1 - j0; j++)
          for (let i = 0; i < i1 - i0; i++) {
            const q = j * w + i;
            idx.push(q, q + w, q + 1, q + 1, q + w, q + w + 1);
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, material);
        m.name = `bioma-suelo-${a}-${b}`;
        this.root.add(m);
      }
  }

  /** The river down the gorge's floor to the sea: a ribbon a little above the gravel. */
  private addRiver(): void {
    const G = this.M.gorge;
    const pos: number[] = [];
    const idx: number[] = [];
    const half = this.M.gorgeFloorHalf * 0.7;
    let n = 0;
    for (let i = 1; i < G.length; i++) {
      const a = G[i - 1]!;
      const b = G[i]!;
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      const nx = -(b.z - a.z) / L;
      const nz = (b.x - a.x) / L;
      const steps = Math.ceil(L / 8);
      for (let s = i === 1 ? 0 : 1; s <= steps; s++) {
        const u = s / steps;
        const x = a.x + (b.x - a.x) * u;
        const z = a.z + (b.z - a.z) * u;
        const y = Math.max(-0.5, a.floor + (b.floor - a.floor) * u) + 0.25;
        for (const side of [-1, 1]) {
          const p = this.world(x + nx * half * side, z + nz * half * side);
          pos.push(p.x, y, p.z);
        }
        if (n > 0) idx.push((n - 1) * 2, n * 2, (n - 1) * 2 + 1, (n - 1) * 2 + 1, n * 2, n * 2 + 1);
        n++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6f9aa4, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    m.name = "bioma-rio";
    this.root.add(m);
  }

  /** Points over the island accepted by `ok`, on a jittered grid of `spacing` m (seeded), at most `cap`. */
  private sample(spacing: number, seed: number, cap: number, ok: (alt: number, slope: number, lx: number, lz: number, y: number) => boolean): Placed[] {
    const X = this.M.half.x * 1.1;
    const Z = this.M.half.z * 1.1;
    const out: Placed[] = [];
    for (let j = 0, z = -Z; z <= Z; z += spacing, j++)
      for (let i = 0, x = -X; x <= X; x += spacing, i++) {
        const s2 = seed * 7 + j * 1009 + i;
        const lx = x + (hash01(s2, 1) - 0.5) * spacing;
        const lz = z + (hash01(s2, 2) - 0.5) * spacing;
        const y = this.h(lx, lz);
        if (y < 1) continue;
        if (!ok(altitudeOf(this.M, y), slopeAt(this.M, lx, lz), lx, lz, y)) continue;
        out.push({ ...this.world(lx, lz), y, s: 0.7 + 0.6 * hash01(s2, 3), r: hash01(s2, 4) * Math.PI * 2 });
      }
    // Spread over the whole island when there are more than the budget (every n-th, not the first rows).
    if (out.length <= cap) return out;
    const step = out.length / cap;
    return Array.from({ length: cap }, (_, i) => out[Math.floor(i * step)]!);
  }

  /** One instanced kind; `base` places each with its growth `f` (its cover, 0–1,2). */
  private addKind(id: string, at: Placed[], geo: THREE.BufferGeometry, material: THREE.Material, base: (p: Placed, f: number, m: THREE.Matrix4) => void): void {
    const mesh = new THREE.InstancedMesh(geo, material, Math.max(1, at.length));
    mesh.name = `planta-${id}`;
    mesh.count = at.length;
    this.root.add(mesh);
    this.plants.set(id, { mesh, at, base });
    this.paint(id, 1);
  }

  private paint(id: string, f: number): void {
    const p = this.plants.get(id);
    if (!p) return;
    const M = new THREE.Matrix4();
    p.at.forEach((a, i) => {
      p.base(a, f, M);
      p.mesh.setMatrixAt(i, M);
    });
    p.mesh.instanceMatrix.needsUpdate = true;
    p.mesh.computeBoundingSphere();
  }

  /** Geometry painted one colour per vertex (so a merged plant keeps its parts' colours in one draw call). */
  private static paintGeo(g: THREE.BufferGeometry, c: number): THREE.BufferGeometry {
    const geo = g.index ? g.toNonIndexed() : g;
    const col = new THREE.Color(c);
    geo.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: geo.attributes.position!.count }, () => [col.r, col.g, col.b]).flat(), 3));
    return geo;
  }

  /** Boulders and slabs out of the cliffs and the scree, some with orange and pale lichen. */
  private addRocks(): void {
    const at = this.sample(9, 5, PLANT_BUDGET.roca, (alt, slope, lx, lz) => slope > 1.1 || (alt > 4300 && slope > 0.5 && hash01(Math.round(lx), Math.round(lz)) < 0.35));
    const g = new THREE.DodecahedronGeometry(1, 0);
    const mesh = new THREE.InstancedMesh(g, mat(0xffffff, { flatShading: true, roughness: 0.95 }), Math.max(1, at.length));
    mesh.name = "bioma-rocas";
    const M = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const c = new THREE.Color();
    at.forEach((p, i) => {
      e.set(hash01(i, 1) * 0.6, p.r, hash01(i, 2) * 0.6);
      q.setFromEuler(e);
      const s = 0.7 + 2 * hash01(i, 3) ** 2;
      M.compose(v.set(p.x, p.y - s * 0.25, p.z), q, sc.set(s * 1.3, s * 0.7, s));
      mesh.setMatrixAt(i, M);
      const lichen = hash01(i, 4);
      mesh.setColorAt(i, c.setHex(lichen < 0.12 ? 0xc87a32 : lichen < 0.22 ? 0xb4b89a : 0x9a9289).offsetHSL(0, 0, (hash01(i, 5) - 0.5) * 0.1));
    });
    mesh.count = at.length;
    this.root.add(mesh);
    // Bones on the slabs below the bearded vulture's drop (at the gorge's lookout).
    const lookout = BIOME_ZONES.find((z) => z.id === "garganta")!.point;
    const bones = mergeGeometries(
      Array.from({ length: 7 }, (_, i) => {
        const x = lookout.x + (hash01(i, 6) - 0.5) * 10;
        const z = lookout.z + (hash01(i, 7) - 0.5) * 10;
        const p = this.world(x, z);
        return new THREE.BoxGeometry(0.06, 0.06, 0.35 + 0.3 * hash01(i, 8)).rotateY(hash01(i, 9) * 3).translate(p.x, this.h(x, z) + 0.04, p.z);
      }),
    );
    const bm = new THREE.Mesh(bones, mat(0xe8e2d0));
    bm.name = "bioma-huesos";
    this.root.add(bm);
  }

  /** The forest: blue pines and spruce in the montane belt, birches at the tree line (each one merged mesh). */
  private addTrees(): void {
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const trunk = BiomeScene.paintGeo(new THREE.CylinderGeometry(0.18, 0.3, 4, 5).translate(0, 2, 0), 0x4a3828);
    const tiers = [0, 1, 2, 3].map((k) => BiomeScene.paintGeo(new THREE.ConeGeometry(2.6 - k * 0.55, 4.2 - k * 0.5, 7).translate(0, 4 + k * 3, 0), k % 2 ? 0x2f4a2e : 0x2a4429));
    const pine = mergeGeometries([trunk, ...tiers]);
    // Not on the trails nor the hut's flat (a blue pine is 30–50 m in Rakaposhi's forest; drawn ~14 m).
    const clear = (lx: number, lz: number) => this.trailDist(lx, lz) > 6 && Math.hypot(lx + 150, lz + 470) > 60;
    const pines = this.sample(11, 11, PLANT_BUDGET.pino, (alt, slope, lx, lz) => alt > 2850 && alt < 3600 && slope < 0.95 && clear(lx, lz) && hash01(Math.round(lx * 3), Math.round(lz * 3)) < 0.8 + (lz < 0 ? 0 : -0.3));
    this.addKind("pino", pines, pine, mat(0xffffff, { vertexColors: true, flatShading: true }), (p, f, m) => {
      q.setFromAxisAngle(up, p.r);
      const s = p.s * (0.85 + 0.15 * Math.min(1, f));
      m.compose(v.set(p.x, p.y - 0.3, p.z), q, sc.set(s, s * (1 + 0.3 * hash01(Math.round(p.x), 7)), s));
    });
    const birch = mergeGeometries([BiomeScene.paintGeo(new THREE.CylinderGeometry(0.1, 0.16, 5, 5).translate(0, 2.5, 0), 0xe6e0d4), BiomeScene.paintGeo(new THREE.IcosahedronGeometry(1.8, 0).scale(1, 1.3, 1).translate(0, 5.4, 0), 0xffffff)]);
    const birches = this.sample(17, 12, PLANT_BUDGET.abedul, (alt, slope, lx, lz) => alt > 3450 && alt < 3950 && slope < 0.9 && clear(lx, lz));
    this.addKind("abedul", birches, birch, mat(0x8fae5a, { vertexColors: true, flatShading: true }), (p, f, m) => {
      q.setFromAxisAngle(up, p.r);
      m.compose(v.set(p.x, p.y - 0.2, p.z), q, sc.setScalar(p.s * (0.8 + 0.2 * Math.min(1, f))));
    });
  }

  /** Shrubs: junipers at the tree line, artemisia on the steppe, sea buckthorn by the river. */
  private addShrubs(): void {
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const clear = (lx: number, lz: number) => this.trailDist(lx, lz) > 3 && Math.hypot(lx + 150, lz + 470) > 50;
    const juniper = new THREE.DodecahedronGeometry(1, 0).scale(1.4, 0.8, 1.2).translate(0, 0.5, 0);
    this.addKind("enebro", this.sample(9, 21, PLANT_BUDGET.enebro, (alt, slope, lx, lz) => alt > 3300 && alt < 4250 && slope < 1 && clear(lx, lz)), juniper, mat(0x3c5a3a, { flatShading: true }), (p, f, m) => {
      q.setFromAxisAngle(up, p.r);
      m.compose(v.set(p.x, p.y - 0.15, p.z), q, sc.setScalar(p.s * (0.6 + 0.4 * Math.min(1.2, f))));
    });
    const bush = new THREE.SphereGeometry(0.5, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    this.addKind("artemisa", this.sample(7, 22, PLANT_BUDGET.artemisa, (alt, slope, lx, lz) => alt < 2850 && slope < 0.8 && clear(lx, lz)), bush, mat(0x9aa08a, { flatShading: true }), (p, f, m) => {
      q.setFromAxisAngle(up, p.r);
      const s = p.s * (0.5 + 0.5 * Math.min(1.2, f));
      m.compose(v.set(p.x, p.y - 0.05, p.z), q, sc.set(s * 1.3, s * 0.9, s * 1.1));
    });
    // Sea buckthorn: a silvery bush with orange berries, in the river's gravel (Hippophae).
    const buck = mergeGeometries([BiomeScene.paintGeo(new THREE.DodecahedronGeometry(0.9, 0).scale(1, 1.3, 1).translate(0, 1, 0), 0xffffff), BiomeScene.paintGeo(new THREE.IcosahedronGeometry(0.25, 0).translate(0.5, 1.4, 0.4), 0xe07a20), BiomeScene.paintGeo(new THREE.IcosahedronGeometry(0.22, 0).translate(-0.4, 1.1, -0.5), 0xe07a20)]);
    const river = this.sample(6, 23, PLANT_BUDGET.espino, (alt, slope, lx, lz) => {
      const g = gorgeAt(this.M, lx, lz);
      return slope < 0.8 && g.q > this.M.gorgeFloorHalf * 0.8 && g.q < this.M.gorgeFloorHalf + 14 && alt < 2700;
    });
    this.addKind("espino", river, buck, mat(0x9aa898, { vertexColors: true, flatShading: true }), (p, f, m) => {
      q.setFromAxisAngle(up, p.r);
      m.compose(v.set(p.x, p.y, p.z), q, sc.setScalar(p.s * (0.7 + 0.3 * Math.min(1, f))));
    });
  }

  /** Near-camera plants: sedges of the meadow, cushions, blue poppies on the scree, woolly saussureas on the ridge. */
  private addNearPlants(): void {
    const tuft = mergeGeometries(Array.from({ length: 6 }, (_, b) => new THREE.PlaneGeometry(0.05, 0.3).translate(0, 0.15, 0).rotateZ(0.3).rotateY((b / 6) * Math.PI * 2)));
    const cushion = new THREE.SphereGeometry(0.3, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2);
    const poppy = mergeGeometries([BiomeScene.paintGeo(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 4).translate(0, 0.25, 0), 0x6a7a4a), BiomeScene.paintGeo(new THREE.IcosahedronGeometry(0.09, 0).scale(1, 0.6, 1).translate(0, 0.52, 0), 0x6a8ad8)]);
    const saussurea = mergeGeometries([BiomeScene.paintGeo(new THREE.IcosahedronGeometry(0.16, 1).scale(1, 1.5, 1).translate(0, 0.22, 0), 0xf2f0ea), BiomeScene.paintGeo(new THREE.ConeGeometry(0.06, 0.08, 5).translate(0, 0.46, 0), 0x6a3a6a)]);
    const stone = new THREE.DodecahedronGeometry(0.22, 0).scale(1.3, 0.6, 1);
    const kinds: [string, THREE.BufferGeometry, THREE.Material, number, (alt: number, slope: number, lx: number, lz: number) => boolean, number, number][] = [
      // The scree: loose stones over the cones below the cliffs and the subnival slopes.
      ["piedras", stone, mat(0x8f887e, { flatShading: true }), PLANT_BUDGET.piedras, (alt, slope, lx, lz) => (alt > 4600 && slope > 0.35) || inScree(lx, lz) > 0, 1.1, 1],
      ["pradera", tuft, mat(0x8aa64e, { side: THREE.DoubleSide }), PLANT_BUDGET.pradera, (alt, slope) => alt > 3700 && alt < 4700 && slope < 0.75, 1.6, 1],
      ["cojines", cushion, mat(0x5f8a3e, { flatShading: true }), PLANT_BUDGET.cojines, (alt, slope) => alt > 3900 && alt < 5000 && slope < 0.8, 2.6, 1],
      ["amapola", poppy, mat(0xffffff, { vertexColors: true, flatShading: true }), PLANT_BUDGET.amapola, (alt, slope, lx, lz) => alt > 4250 && alt < 4800 && slope < 0.9 && Math.hypot(lx - 190, lz + 84) < 70, 3.2, 1],
      ["saussurea", saussurea, mat(0xffffff, { vertexColors: true }), PLANT_BUDGET.saussurea, (alt, slope) => alt > 4700 && alt < 5250 && slope < 0.9, 3.5, 1],
    ];
    for (const [id, geo, m, cap, ok, spacing, size] of kinds) {
      const mesh = new THREE.InstancedMesh(geo, m, cap);
      mesh.name = `planta-${id}`;
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.root.add(mesh);
      this.nearKinds.push({ id, mesh, cap, ok, spacing, size });
    }
  }

  /** The near plants scattered again round the camera (each cell's plant remembered: the same plant every time). */
  private nearLod(cam: THREE.Vector3, force = false): void {
    if (!force && Math.hypot(cam.x - this.nearAt.x, cam.z - this.nearAt.z) < NEAR_MOVE_M) return;
    this.nearAt.copy(cam);
    const M4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const lc = { x: cam.x - this.C.x, z: cam.z - this.C.z };
    for (const k of this.nearKinds) {
      const f = Math.max(0.15, Math.min(1.2, this.cover[k.id] ?? 1));
      let n = 0;
      const R = NEAR_PLANTS_M;
      const ci = Math.floor(lc.x / k.spacing);
      const cj = Math.floor(lc.z / k.spacing);
      // Nearest cells first: the budget goes to what she sees close, never to one far side of the disc.
      for (const [di, dj] of ringOrder(Math.ceil(R / k.spacing) + 1)) {
        if (n >= k.cap) break;
        const i = ci + di;
        const j = cj + dj;
        const key = `${k.id}:${i}:${j}`;
        let p = this.nearCache.get(key);
        if (p === undefined) {
          const lx = (i + hash01(i * 31 + j, 41)) * k.spacing;
          const lz = (j + hash01(i * 37 + j, 42)) * k.spacing;
          const y = this.h(lx, lz);
          p = y > 1 && k.ok(altitudeOf(this.M, y), slopeAt(this.M, lx, lz), lx, lz) && this.trailDist(lx, lz) > 1.8 ? { ...this.world(lx, lz), y, s: 0.6 + 0.8 * hash01(i, j), r: hash01(j, i) * 6.28 } : null;
          this.nearCache.set(key, p);
        }
        if (!p || Math.hypot(p.x - cam.x, p.z - cam.z) > R) continue;
        q.setFromAxisAngle(up, p.r);
        const sz = p.s * k.size * f;
        M4.compose(v.set(p.x, p.y - 0.02, p.z), q, sc.set(sz, sz, sz));
        k.mesh.setMatrixAt(n++, M4);
      }
      k.mesh.count = n;
      k.mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.nearCache.size > 60000) this.nearCache.clear();
  }

  private addAnimals(def: BiomeDef): void {
    const k = def.drawScale ?? 1;
    const big = (z: { x: number; y: number; z: number }, f = 1) => ({ x: z.x * k * f, y: z.y * k * f, z: z.z * k * f });
    for (const s of def.species.filter((x): x is AnimalSpec => x.kind === "animal")) {
      const shape = s.shape === "pajaro" ? "ave" : s.shape;
      const adult: HerdModel = { id: s.id, shape, size: big(s.size), color: s.color, category: "animal", group: "bioma" };
      // The young: an insect's larva (a grub, a caterpillar) or its nymph (wing buds), at the adult's size (the pose
      // scales it); a mammal's young as its parents, small; chicks of every bird as downy upright chicks.
      const young: HerdModel =
        shape === "insecto"
          ? { id: s.nymph ? `${s.id}-ninfa` : `larva-${s.id}`, shape, size: big(s.size), color: s.color, category: "animal", group: "bioma" }
          : shape === "cuadrupedo"
            ? { id: s.id, shape, size: s.size, color: s.color, category: "animal", group: "bioma" }
            : { id: "polluelo-pinguino", shape: "pinguino", size: { x: s.size.z * 0.6, y: s.size.z * 0.9, z: s.size.z * 0.6 }, color: 0x8a8070, category: "animal", group: "bioma" };
      const extra = NEAR_CAP[s.id] ?? { adult: 0, young: 0 };
      const n = Math.ceil(s.cap * 1.6) + s.young * 3 + extra.adult;
      const a = new AnimalHerd(adult, n, undefined, { merged: true });
      const y = new AnimalHerd(young, Math.ceil(s.cap * 1.2) + s.young * 3 + 2 + extra.young, undefined, { merged: true });
      for (const m of [...a.meshes, ...y.meshes]) this.root.add(m);
      this.herds.set(s.id, { adult: a, young: y, n });
    }
  }

  private addHut(def: BiomeDef): void {
    const Y = HUT_Y();
    const st = BIOME_ISLAND.station.value;
    const board = hutPoint(this.k, 0, st.z / 2 - 0.4);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#c8a46e";
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#1b1b1b";
    g.font = "bold 30px system-ui, sans-serif";
    g.fillText("CENSO DE LA MONTAÑA", 20, 42);
    g.font = "16px system-ui, sans-serif";
    def.species.filter((s) => s.kind === "animal").forEach((s, i) => g.fillText(`· ${s.name}`, 20 + (i % 3) * 165, 78 + Math.floor(i / 3) * 26));
    const tex = new THREE.CanvasTexture(c);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.2), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(board.x, Y + 1.55, board.z - 0.1);
    face.rotation.y = Math.PI;
    face.name = "tablon-censo";
    this.root.add(face);
    // A desk, a bunk and a stove: the furniture of a field hut (ours).
    const furn = (x: number, z: number, sx: number, sy: number, sz: number, col: number) => {
      const p = hutPoint(this.k, x, z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(col));
      m.position.set(p.x, Y + sy / 2, p.z);
      this.root.add(m);
    };
    furn(-4.5, 1.5, 1.6, 0.75, 0.8, 0x8a6a48);
    furn(-4.6, -1.8, 0.9, 0.9, 2, 0x5a4a3a);
    furn(4.6, 1.8, 0.7, 1, 0.7, 0x2b2b2b);
    // On the field table, the tools of the field jobs (s3-biome.ts): the notebook, a camera trap, the binoculars and
    // the spotting scope; one mesh (its colours per vertex).
    const d = this.deskAt;
    const tool = (x: number, z: number, sx: number, sy: number, sz: number, col: number) => BiomeScene.paintGeo(new THREE.BoxGeometry(sx, sy, sz).translate(d.x + x, Y + 0.75 + sy / 2, d.z + z), col);
    const tools = new THREE.Mesh(
      mergeGeometries([tool(-0.35, -0.05, 0.3, 0.03, 0.22, 0xe8e2c8), tool(-0.02, -0.08, 0.12, 0.16, 0.1, 0x4a5a3a), tool(0.25, -0.05, 0.16, 0.06, 0.1, 0x2a2a2a), tool(0.5, 0.05, 0.08, 0.08, 0.32, 0x5a5f66)]),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }),
    );
    tools.name = "mesa-campo";
    this.root.add(tools);
  }

  /** The field table's middle (world m): the field jobs are done there (s3-biome.ts). */
  get deskAt(): { x: number; y: number; z: number } {
    return { ...hutPoint(this.k, -4.5, 1.5), y: HUT_Y() };
  }

  /** Instances of a plant kind drawn now (PX-51). */
  plantCount(id: string): number {
    return this.plants.get(id)?.mesh.count ?? this.nearKinds.find((k) => k.id === id)?.mesh.count ?? 0;
  }

  /** Each frame: animals posed, plants grown or withered with their cover (`t` real s). */
  update(t: number, poses: readonly Pose[], cover: Readonly<Record<string, number>>, st?: BiomeState, cam?: THREE.Vector3): void {
    this.cover = cover;
    // Plants: repainted when their cover moved 3 % (not every frame).
    let nearChanged = false;
    for (const [id, f] of Object.entries(cover)) {
      const key = Math.round(Math.min(1.2, f) * 33);
      const p = this.plants.get(id);
      if (p) {
        if (p.key === key) continue;
        p.key = key;
        this.paint(id, Math.min(1.2, f));
      } else if (this.nearKinds.some((k) => k.id === id)) {
        const k = this.nearKinds.find((q) => q.id === id) as { key?: number };
        if (k.key !== key) {
          k.key = key;
          nearChanged = true;
        }
      }
    }
    if (cam) this.nearLod(cam, nearChanged);
    // The crowds: placed again when the chain's numbers change or the camera has moved; their jointed bodies first in
    // each herd, a third of them posed each frame (a breath, a head turning), the chain's animals after them.
    const resorted = !!st && !!cam && this.crowd.update(st, cam);
    this.frameNo++;
    for (const [sp, h] of this.herds) {
      for (const [herd, key] of [[h.adult, sp], [h.young, `${sp}:cria`]] as const) {
        const near = this.crowd.near.get(key) ?? [];
        const n = Math.min(near.length, herd.capacity);
        this.crowdN.set(key, n);
        for (let i = 0; i < n; i++) {
          const c = near[i]!;
          // A worker flies (or walks) its round about the nest every frame, wings beating; the rest breathe.
          if (c.orbit) {
            const o = c.orbit;
            const a = Math.atan2(c.z - o.cz, c.x - o.cx) + o.w * Math.PI * 2 * t;
            const bob = o.h > 0 ? Math.sin(t * 1.7 + c.seed) * 0.4 : 0;
            herd.pose(i, o.cx + Math.cos(a) * o.r, c.y + bob, o.cz + Math.sin(a) * o.r, o.w > 0 ? -a : Math.PI - a, t + c.seed * 0.37, true, 1);
            continue;
          }
          if (!resorted && (i + this.frameNo) % 3) continue;
          herd.pose(i, c.x, c.y, c.z, c.yaw, t + c.seed * 0.37, false, key.endsWith(":cria") ? 0.55 : 1);
        }
      }
    }
    // The chain's animals (not the ones asleep out of sight); the soaring birds glide with their wings still.
    const used = new Map<string, [number, number]>();
    for (const p of poses) {
      if (p.hidden) continue;
      const h = this.herds.get(p.species);
      if (!h) continue;
      const u = used.get(p.species) ?? [this.crowdN.get(p.species) ?? 0, this.crowdN.get(`${p.species}:cria`) ?? 0];
      const young = p.stage === "cria";
      const herd = young ? h.young : h.adult;
      const k = young ? u[1] : u[0];
      if (k >= herd.capacity) continue;
      const flaps = p.moving && !(p.flying && this.soarers.has(p.species));
      herd.pose(k, p.x, p.y, p.z, p.yaw, t + p.id, flaps, Math.max(0.05, young && h.young.d.shape !== "cuadrupedo" && h.young.d.shape !== "insecto" ? p.scale * 1.4 : p.scale));
      if (young) u[1]++;
      else u[0]++;
      used.set(p.species, u);
    }
    for (const [sp, h] of this.herds) {
      const u = used.get(sp) ?? [this.crowdN.get(sp) ?? 0, this.crowdN.get(`${sp}:cria`) ?? 0];
      h.adult.show(u[0]);
      h.young.show(u[1]);
      h.adult.commit();
      h.young.commit();
    }
  }
}
