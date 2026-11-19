import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BIOME, type AnimalSpec } from "@modules/aerial-sanctuary/data/bioma";
import { BIOME_ISLAND, BIOME_ZONES, inside, shoreAt } from "@modules/aerial-sanctuary/data/bioma-island";
import { hash01 } from "@modules/fauna/domain/roam";
import type { Pose } from "@modules/aerial-sanctuary/application/biome-life";
import type { BiomeState } from "@modules/aerial-sanctuary/domain/bioma";
import { DENSITY } from "@modules/aerial-sanctuary/data/bioma-crowd";
import { AnimalHerd, type HerdModel } from "./animal-bodies";
import { BiomeCrowd, NEAR_CAP } from "./s3-biome-crowd";

/**
 * The biome's island drawn (docs/design/bioma-s3.md §Escena): the ground with its shore, beach and zones; plants with
 * their real shapes (tussac on its pedestal with a fountain of blades, moss cushions, hair-grass tufts, lichen on
 * rocks, giant kelp from the bottom to its canopy on the surface), the bloom tinting the water; the banks (krill,
 * lanternfish, icefish, toothfish, squid) as schools; and the birds and seals as jointed cube bodies (fauna's
 * animal-body). Every plant kind is one InstancedMesh per part and every species one herd: few draw calls on a phone.
 */
const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0, ...o });

/** Tussocks a hectare (Lewis Smith y Clymo 1984) and how near (m) a tussock is drawn with its blades. */
const TUSSAC_NEAR_M = 42;
/** Instances of each plant kind (the tussac's: those with blades, near the camera; the mobile budget: docs/design/bioma-s3.md §Presupuesto). */
export const PLANT_BUDGET = { tussac: 300, musgo: 160, hierba: 140, roca: 60, kelp: 60 } as const;
/** Fish and krill drawn at once. */
export const SWARM_BUDGET = { kril: 5 * 40, linterna: 3 * 14, "pez-hielo": 8, austromerluza: 3, calamar: 6 } as const;

interface Placed {
  readonly x: number;
  readonly z: number;
  readonly s: number;
  readonly r: number;
}

export class BiomeScene {
  readonly root = new THREE.Group();
  private readonly plants = new Map<string, { meshes: THREE.InstancedMesh[]; at: Placed[]; base: (p: Placed, i: number, f: number, m: THREE.Matrix4, part: number) => void }>();
  private readonly herds = new Map<string, { adult: AnimalHerd; young: AnimalHerd; n: number }>();
  private readonly swarms = new Map<string, { mesh: THREE.InstancedMesh; centres: { x: number; z: number; y: number }[] }>();
  private readonly bloom: THREE.Mesh;
  private readonly tussacMat: THREE.MeshStandardMaterial;
  private readonly C: { x: number; z: number };
  /** The colonies, beaches and nests around the chain's animals (s3-biome-crowd.ts). */
  readonly crowd: BiomeCrowd;
  /** Jointed bodies of the crowd at the start of each herd (the chain's animals come after them). */
  private readonly crowdN = new Map<string, number>();
  private frameNo = 0;
  /** The tussac's level of detail: every tussock, the near ones with blades, the far as a mound and a cone. */
  private tussac?: { at: Placed[]; far: THREE.InstancedMesh; near: number[]; cam: THREE.Vector3; cover: number };

  constructor(readonly k: number) {
    this.C = BIOME_ISLAND.centre.value;
    this.root.name = "bioma";
    this.root.add(this.ground());
    this.tussacMat = mat(0xb5b45a, { side: THREE.DoubleSide });
    this.addPlants();
    this.bloom = new THREE.Mesh(new THREE.CircleGeometry(BIOME_ISLAND.half.value.x * 1.9 * k, 48), new THREE.MeshBasicMaterial({ color: 0x3f8a5a, transparent: true, opacity: 0, depthWrite: false }));
    this.bloom.rotation.x = -Math.PI / 2;
    this.bloom.position.set(this.C.x, -0.57, this.C.z);
    this.bloom.name = "floracion";
    this.root.add(this.bloom);
    this.addSwarms();
    this.crowd = new BiomeCrowd(k);
    this.root.add(this.crowd.boxes);
    this.addAnimals();
    this.addHut();
  }

  private world(x: number, z: number) {
    return { x: this.C.x + x * this.k, z: this.C.z + z * this.k };
  }

  /** The ground: a radial mesh, flat where she walks, falling to a beach and under the sea past the shore; coloured by zone. */
  private ground(): THREE.Mesh {
    const H = BIOME_ISLAND.half.value;
    const rings = 26;
    const seg = 120;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i <= rings; i++) {
      const f = (i / rings) * 1.16;
      for (let j = 0; j < seg; j++) {
        const a = (j / seg) * Math.PI * 2;
        const s = shoreAt(a);
        const lx = Math.cos(a) * H.x * f * s;
        const lz = Math.sin(a) * H.z * f * s;
        const edge = f - 1;
        const y = edge <= -0.03 ? 0 : edge <= 0.02 ? -0.02 - (edge + 0.03) * 4 : -0.22 - (edge - 0.02) * 14;
        const w = this.world(lx, lz);
        pos.push(w.x, Math.max(-3, y), w.z);
        const n = hash01(i * 131 + j, 3);
        if (edge > -0.04) c.setHex(0x8a8070).offsetHSL(0, 0, (n - 0.5) * 0.08);
        else if (lz < -55) c.setHex(0x7a7262).offsetHSL(0, 0, (n - 0.5) * 0.06);
        else if (lx > 85) c.setHex(0x8b877c).offsetHSL(0, 0, (n - 0.5) * 0.08);
        else if (lz > 30) c.setHex(0x4f6a35).offsetHSL(0.02 * (n - 0.5), 0, (n - 0.5) * 0.1);
        else c.setHex(0x8a8a48).offsetHSL(0.03 * (n - 0.5), 0, (n - 0.5) * 0.1);
        col.push(c.r, c.g, c.b);
        if (i > 0) {
          const a0 = (i - 1) * seg + j;
          const a1 = (i - 1) * seg + ((j + 1) % seg);
          const b0 = i * seg + j;
          const b1 = i * seg + ((j + 1) % seg);
          idx.push(a0, b0, a1, a1, b0, b1);
        }
      }
    }
    // The centre: a fan.
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
    m.name = "bioma-suelo";
    return m;
  }

  /** Scatter `n` points over a zone (on land or, for the kelp, in the sea), seeded. */
  private scatter(zone: string, n: number, seed: number, sea = false): Placed[] {
    const r = BIOME_ZONES.find((q) => q.id === zone)!.r;
    const out: Placed[] = [];
    for (let i = 0; out.length < n && i < n * 20; i++) {
      const x = r.x0 + (r.x1 - r.x0) * hash01(seed, i * 3);
      const z = r.z0 + (r.z1 - r.z0) * hash01(seed, i * 3 + 1);
      const ok = sea ? !inside(x * 0.97, z * 0.97) && inside(x * 0.72, z * 0.72) : inside(x * 1.05, z * 1.05) && Math.hypot(x, z) > 22;
      if (!ok) continue;
      out.push({ ...this.world(x, z), s: 0.7 + 0.6 * hash01(seed, i * 3 + 2), r: hash01(seed, i * 5) * Math.PI * 2 });
    }
    return out;
  }

  private addPlants(): void {
    const M = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    // TUSSAC: a peat pedestal (~0,8 m) and a fountain of blades to ~2 m (Poa flabellata).
    // The fountain: green blades arching out to ~3 m across from the pedestal's top, over a skirt of dead straw
    // hanging down its sides (vertex colours under the season's tint).
    const blade = (len: number, w: number, out: number, drop: number, yaw: number, base: THREE.Color, tip: THREE.Color) => {
      const g = new THREE.PlaneGeometry(w, len, 1, 3).translate(0, len / 2, 0);
      const pos = g.attributes.position!;
      const col: number[] = [];
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getY(i) / len;
        pos.setZ(i, pos.getZ(i) + u ** 1.4 * out);
        pos.setY(i, pos.getY(i) * (1 - drop * u));
        c.copy(base).lerp(tip, u);
        col.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      return g.rotateY(yaw);
    };
    const straw = new THREE.Color(1, 0.86, 0.58);
    const green = new THREE.Color(0.86, 1, 0.78);
    const blades: THREE.BufferGeometry[] = [];
    for (let b = 0; b < 26; b++) blades.push(blade(1.6 + 0.25 * ((b * 7) % 3), 0.24, 0.9 + 0.5 * (((b * 5) % 4) / 3), 0.5, (b / 26) * Math.PI * 2 + (b % 3) * 0.12, straw, green));
    // The skirt: dead leaves from the rim down the pedestal (upside-down blades).
    for (let b = 0; b < 12; b++) blades.push(blade(1.0, 0.5, 0.3, 0, 0, straw.clone().multiplyScalar(0.8), straw.clone().multiplyScalar(0.95)).rotateX(Math.PI).translate(0, 0.02, -0.45).rotateY((b / 12) * Math.PI * 2 + (b % 2) * 0.1));
    const fountain = mergeGeometries(blades);
    fountain.translate(0, 1.0, 0);
    this.tussacMat.vertexColors = true;
    const pedestal = new THREE.CylinderGeometry(0.4, 0.6, 0.92, 9);
    pedestal.translate(0, 0.46, 0);
    // As dense as a real tussac grassland: 650 tussocks a hectare (Lewis Smith y Clymo 1984), on a jittered grid.
    const all = [...this.denseTussac(), ...this.scatter("playa", 40, 12).filter((p) => (p.z - this.C.z) / this.k > -70), ...this.scatter("musgo", 30, 13)];
    this.addKind("tussac", all.slice(0, PLANT_BUDGET.tussac), [pedestal, fountain], [mat(0x5c4632), this.tussacMat], (p, _i, f, m, part) => {
      q.setFromAxisAngle(up, p.r);
      // The canopy spreads ~3 m across (up to 4,5 m: Lewis Smith y Clymo 1984) from a ~1 m pedestal.
      const spread = (DENSITY.tussacCanopyM.value / 3) * p.s;
      const s = part === 0 ? p.s : spread * (0.6 + 0.4 * f);
      m.compose(v.set(p.x, 0, p.z), q, part === 0 ? sc.set(p.s, p.s, p.s) : sc.set(spread, s, spread));
    });
    // Far away: a mound and a cone in one mesh (its pedestal darker by its vertex colours).
    const ped = new THREE.CylinderGeometry(0.5, 0.65, 1, 6).translate(0, 0.5, 0);
    const cone = new THREE.ConeGeometry(1.5, 1.5, 6).translate(0, 1.55, 0);
    const paint = (g: THREE.BufferGeometry, c: number) => {
      const col = new THREE.Color(c);
      g.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: g.attributes.position!.count }, () => [col.r, col.g, col.b]).flat(), 3));
      return g;
    };
    const farGeo = mergeGeometries([paint(ped.toNonIndexed(), 0x5a4030), paint(cone.toNonIndexed(), 0xffffff)]);
    const far = new THREE.InstancedMesh(farGeo, new THREE.MeshStandardMaterial({ color: 0xb5b45a, vertexColors: true, roughness: 0.95, flatShading: true }), all.length);
    far.name = "planta-tussac-lejos";
    far.count = 0;
    this.root.add(far);
    this.tussac = { at: all, far, near: [], cam: new THREE.Vector3(1e9, 0, 0), cover: 1 };
    // MOSS: low cushions of moss banks.
    const cushion = new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
    this.addKind("musgo", this.scatter("musgo", PLANT_BUDGET.musgo, 21), [cushion], [mat(0x3d6b2a)], (p, _i, f, m) => {
      q.setFromAxisAngle(up, p.r);
      m.compose(v.set(p.x, -0.05, p.z), q, sc.set(1.4 * p.s, 0.18 * p.s * (0.7 + 0.3 * f), 1 * p.s));
    });
    // HAIR GRASS: small tufts.
    const tuft = mergeGeometries(Array.from({ length: 7 }, (_, b) => new THREE.PlaneGeometry(0.03, 0.25, 1, 1).translate(0, 0.12, 0).rotateZ(0.25).rotateY((b / 7) * Math.PI * 2)));
    this.addKind("hierba-pilosa", [...this.scatter("musgo", 90, 31), ...this.scatter("tussac", 50, 32)].slice(0, PLANT_BUDGET.hierba), [tuft], [mat(0x8fa64a, { side: THREE.DoubleSide })], (p, _i, f, m) => {
      q.setFromAxisAngle(up, p.r);
      m.compose(v.set(p.x, 0, p.z), q, sc.setScalar(p.s * (0.5 + 0.5 * f)));
    });
    // LICHEN: grey rocks with orange and pale crusts (Usnea and crustose lichens).
    const rock = new THREE.DodecahedronGeometry(0.45, 0);
    const crust = new THREE.CircleGeometry(0.22, 7).rotateX(-Math.PI / 2).translate(0.05, 0.36, 0.05);
    const crust2 = new THREE.CircleGeometry(0.16, 6).rotateX(-Math.PI / 2.4).translate(-0.18, 0.28, -0.1);
    this.addKind("liquen", [...this.scatter("musgo", 40, 41), ...this.scatter("colonia", 20, 42)].slice(0, PLANT_BUDGET.roca), [rock, crust, crust2], [mat(0x6d6b66, { flatShading: true }), mat(0xd27a2a, { side: THREE.DoubleSide }), mat(0xb8c79a, { side: THREE.DoubleSide })], (p, _i, f, m, part) => {
      q.setFromAxisAngle(up, p.r);
      const s = part === 0 ? p.s : p.s * (0.5 + 0.5 * f);
      m.compose(v.set(p.x, 0.05, p.z), q, sc.set(s * 1.2, part === 0 ? p.s * 0.7 : p.s * 0.7, s));
    });
    // KELP: a stipe from the bottom (−10 m) and its fronds lying on the surface.
    const stipe = new THREE.CylinderGeometry(0.04, 0.05, 10, 4).translate(0, -5.6, 0);
    const canopy = mergeGeometries(Array.from({ length: 6 }, (_, b) => new THREE.PlaneGeometry(0.35, 3.2).rotateX(-Math.PI / 2).translate(0, 0, 1.4).rotateY((b / 6) * Math.PI * 2)));
    canopy.translate(0, -0.56, 0);
    this.addKind("kelp", [...this.scatter("kelp", 45, 51, true), ...this.scatter("playa", 15, 52, true)].slice(0, PLANT_BUDGET.kelp), [stipe, canopy], [mat(0x5a4a1c), mat(0x6f5a1e, { side: THREE.DoubleSide })], (p, _i, f, m, part) => {
      q.setFromAxisAngle(up, p.r);
      m.compose(v.set(p.x, 0, p.z), q, sc.set(p.s, part === 0 ? 1 : 1, p.s * (part === 0 ? 1 : 0.4 + 0.6 * f)));
    });
    void M;
  }

  /** Tussocks over the slope at their real density (650 a hectare, as drawn), jittered, never on the hut's ground. */
  private denseTussac(): Placed[] {
    const r = BIOME_ZONES.find((q) => q.id === "tussac")!.r;
    const sp = Math.sqrt(10000 / DENSITY.tussacPerHa.value / 0.866);
    const out: Placed[] = [];
    const k = this.k;
    for (let j = 0, z = r.z0 * k; z <= r.z1 * k; z += sp * 0.866, j++)
      for (let i = 0, x = r.x0 * k + (j % 2) * sp * 0.5; x <= r.x1 * k; x += sp, i++) {
        const seed = j * 977 + i;
        const lx = (x + (hash01(seed, 21) - 0.5) * sp * 0.6) / k;
        const lz = (z + (hash01(seed, 22) - 0.5) * sp * 0.6) / k;
        if (!inside(lx * 1.04, lz * 1.04) || Math.hypot(lx, lz) < 22) continue;
        out.push({ ...this.world(lx, lz), s: 0.75 + 0.5 * hash01(seed, 23), r: hash01(seed, 24) * Math.PI * 2 });
      }
    return out;
  }

  /** The near tussocks get their blades again when the camera moved 4 m or the cover changed; the rest are cones. */
  private tussacLod(cam: THREE.Vector3, force = false): void {
    const T = this.tussac;
    const p = this.plants.get("tussac");
    if (!T || !p) return;
    if (!force && Math.hypot(cam.x - T.cam.x, cam.z - T.cam.z) < 4) return;
    T.cam.copy(cam);
    const cap = p.meshes[0]!.instanceMatrix.count;
    const d = T.at.map((a, i) => ({ i, d: Math.hypot(a.x - cam.x, a.z - cam.z) }));
    const near = d.filter((e) => e.d < TUSSAC_NEAR_M).sort((a, b) => a.d - b.d).slice(0, cap).map((e) => e.i);
    const isNear = new Set(near);
    p.at = near.map((i) => T.at[i]!);
    for (const m of p.meshes) m.count = p.at.length;
    this.paintPlant("tussac", T.cover);
    const M = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    let n = 0;
    T.at.forEach((a, i) => {
      if (isNear.has(i)) return;
      q.setFromAxisAngle(v.set(0, 1, 0), a.r);
      const h = a.s * (0.55 + 0.45 * T.cover);
      M.compose(v.set(a.x, 0, a.z), q, sc.set(a.s, h, a.s));
      T.far.setMatrixAt(n++, M);
    });
    T.far.count = n;
    T.far.instanceMatrix.needsUpdate = true;
    T.far.computeBoundingSphere();
  }

  private addKind(id: string, at: Placed[], geos: THREE.BufferGeometry[], mats: THREE.Material[], base: (p: Placed, i: number, f: number, m: THREE.Matrix4, part: number) => void): void {
    const meshes = geos.map((g, j) => {
      const m = new THREE.InstancedMesh(g, mats[j]!, at.length);
      m.name = `planta-${id}-${j}`;
      this.root.add(m);
      return m;
    });
    this.plants.set(id, { meshes, at, base });
    this.paintPlant(id, 1);
  }

  private paintPlant(id: string, cover: number): void {
    const p = this.plants.get(id);
    if (!p) return;
    const M = new THREE.Matrix4();
    p.at.forEach((a, i) => {
      p.meshes.forEach((m, j) => {
        p.base(a, i, cover, M, j);
        m.setMatrixAt(i, M);
      });
    });
    for (const m of p.meshes) {
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }

  private addSwarms(): void {
    const H = BIOME_ISLAND.half.value;
    const ring = (n: number, d: number, seed: number, y: number) =>
      Array.from({ length: n }, (_, i) => {
        const a = hash01(seed, i) * Math.PI * 2;
        return { ...this.world(Math.cos(a) * H.x * d, Math.sin(a) * H.z * d), y };
      });
    const fish = (len: number, color: number, slim = 0.25) => {
      const g = new THREE.BoxGeometry(len * slim, len * slim * 1.2, len);
      return { g, m: mat(color, { metalness: 0.3, roughness: 0.4 }) };
    };
    const kinds: [string, number, THREE.BufferGeometry, THREE.Material, { x: number; z: number; y: number }[]][] = [];
    // Krill drawn 5× its 6 cm so a swarm shows at a glance (ours: presentation only).
    const kr = fish(0.3, 0xe8763a, 0.3);
    kinds.push(["kril", SWARM_BUDGET.kril, kr.g, kr.m, ring(5, 1.35, 61, -1.5)]);
    const ln = fish(0.11, 0xc8d4dc);
    kinds.push(["linterna", SWARM_BUDGET.linterna, ln.g, ln.m, ring(3, 1.3, 62, -3)]);
    const ic = fish(0.6, 0xdde6ea);
    kinds.push(["pez-hielo", SWARM_BUDGET["pez-hielo"], ic.g, ic.m, ring(2, 1.25, 63, -6)]);
    const tf = fish(1.6, 0x3a3f44, 0.22);
    kinds.push(["austromerluza", SWARM_BUDGET.austromerluza, tf.g, tf.m, ring(1, 1.5, 64, -18)]);
    const sq = new THREE.ConeGeometry(0.12, 0.6, 6).rotateX(Math.PI / 2);
    kinds.push(["calamar", SWARM_BUDGET.calamar, sq, mat(0xa83a3a), ring(2, 1.6, 65, -10)]);
    for (const [id, n, g, m, centres] of kinds) {
      const mesh = new THREE.InstancedMesh(g, m, n);
      mesh.name = `banco-${id}`;
      mesh.frustumCulled = false;
      this.root.add(mesh);
      this.swarms.set(id, { mesh, centres });
    }
  }

  private addAnimals(): void {
    for (const s of BIOME.filter((x): x is AnimalSpec => x.kind === "animal")) {
      const shape = s.shape === "pajaro" ? "ave" : s.shape;
      const adult: HerdModel = { id: s.id === "papua" ? "papua" : s.id, shape, size: s.size, color: s.color, category: "animal", group: "bioma" };
      // The young: seal pups dark and on the beach; chicks of every bird as downy upright chicks.
      const young: HerdModel =
        s.shape === "pinnipedo"
          ? { id: `${s.id}-cria`, shape: "pinnipedo", size: s.size, color: s.id === "lobo" ? 0x2a2522 : s.id === "elefante" ? 0x2b2b2b : 0x8a8f94, category: "animal", group: "bioma" }
          : { id: "polluelo-pinguino", shape: "pinguino", size: s.shape === "pinguino" ? s.size : { x: s.size.z * 0.6, y: s.size.z * 0.9, z: s.size.z * 0.6 }, color: s.id === "albatros" ? 0x8c7f70 : 0x6c6660, category: "animal", group: "bioma" };
      const extra = NEAR_CAP[s.id] ?? { adult: 0, young: 0 };
      const n = Math.ceil(s.cap * 1.6) + s.young * 3 + extra.adult;
      const a = new AnimalHerd(adult, n, undefined, { merged: true });
      const y = new AnimalHerd(young, Math.ceil(s.cap * 1.2) + 2 + extra.young, undefined, { merged: true });
      for (const m of [...a.meshes, ...y.meshes]) this.root.add(m);
      this.herds.set(s.id, { adult: a, young: y, n });
    }
  }

  private addHut(): void {
    // The census board's face: the species in columns (its live text is the card's, opened at the board).
    const st = BIOME_ISLAND.station.value;
    const board = this.world(0, st.z / 2 - 0.4);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#c8a46e";
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#1b1b1b";
    g.font = "bold 34px system-ui, sans-serif";
    g.fillText("CENSO DE LA ISLA", 24, 48);
    g.font = "20px system-ui, sans-serif";
    BIOME.filter((s) => s.kind === "animal").forEach((s, i) => g.fillText(`· ${s.name}`, 24 + (i % 2) * 250, 92 + Math.floor(i / 2) * 30));
    const tex = new THREE.CanvasTexture(c);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.2), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(board.x, 1.55, board.z - 0.1);
    face.rotation.y = Math.PI;
    face.name = "tablon-censo";
    this.root.add(face);
    // A desk, a bunk and a stove: the furniture of a field hut (ours).
    const furn = (x: number, z: number, sx: number, sy: number, sz: number, c: number) => {
      const p = this.world(x, z);
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
      m.position.set(p.x, sy / 2, p.z);
      this.root.add(m);
    };
    furn(-4.5, 1.5, 1.6, 0.75, 0.8, 0x8a6a48);
    furn(-4.6, -1.8, 0.9, 0.9, 2, 0x5a4a3a);
    furn(4.6, 1.8, 0.7, 1, 0.7, 0x2b2b2b);
    // On the field table, the tools of the field jobs (s3-biome.ts): the notebook, the tally counter, the ring pliers
    // and a string of metal rings; one mesh (its colours per vertex).
    const d = this.deskAt;
    const tool = (x: number, z: number, sx: number, sy: number, sz: number, c: number) => {
      const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed().translate(d.x + x, 0.75 + sy / 2, d.z + z);
      const col = new THREE.Color(c);
      g.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: g.attributes.position!.count }, () => [col.r, col.g, col.b]).flat(), 3));
      return g;
    };
    const tools = new THREE.Mesh(
      mergeGeometries([tool(-0.35, -0.05, 0.3, 0.03, 0.22, 0xe8e2c8), tool(-0.05, -0.1, 0.06, 0.04, 0.08, 0x8c9096), tool(0.25, -0.05, 0.22, 0.03, 0.05, 0xb03a2a), tool(0.5, 0.05, 0.18, 0.02, 0.06, 0xc8ccd0)]),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }),
    );
    tools.name = "mesa-campo";
    this.root.add(tools);
  }

  /** Tussocks on the island and those drawn with their blades now (PX-51). */
  get tussacCount(): { all: number; near: number } {
    return { all: this.tussac?.at.length ?? 0, near: this.plants.get("tussac")?.meshes[0]?.count ?? 0 };
  }

  /** The field table's middle (world m): the field jobs are done there (s3-biome.ts). */
  get deskAt(): { x: number; z: number } {
    return this.world(-4.5, 1.5);
  }

  /** Share of each species' adults in moult now (the chain's animals moult with their crowd). */
  private get moultOf(): Map<string, number> {
    return new Map([...["papua", "elefante"]].map((id) => [id, this.crowd.countsOf(id)?.moult ?? 0]));
  }

  /** Each frame: animals posed, plants grown or withered with their cover, schools circling (`t` real s). */
  update(t: number, poses: readonly Pose[], cover: Readonly<Record<string, number>>, season: number, st?: BiomeState, cam?: THREE.Vector3): void {
    // Plants: repainted when their cover moved 3 % (not every frame).
    for (const [id, f] of Object.entries(cover)) {
      const p = this.plants.get(id);
      if (!p) continue;
      const key = Math.round(Math.min(1.2, f) * 33);
      if ((p as { key?: number }).key === key) continue;
      (p as { key?: number }).key = key;
      if (id === "tussac" && this.tussac) {
        this.tussac.cover = Math.min(1.2, f);
        this.tussacLod(this.tussac.cam, true);
        continue;
      }
      this.paintPlant(id, Math.min(1.2, f));
    }
    // The tussac yellows in winter.
    this.tussacMat.color.setHex(0xa3a65a).lerp(new THREE.Color(0xc2a65e), 1 - season);
    if (this.tussac) (this.tussac.far.material as THREE.MeshStandardMaterial).color.copy(this.tussacMat.color);
    (this.bloom.material as THREE.MeshBasicMaterial).opacity = 0.35 * Math.min(1, (cover["fitoplancton"] ?? 0) * season);
    // Schools: as many as the bank's share of what the place holds.
    const M = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    for (const [id, s] of this.swarms) {
      const n = s.mesh.count;
      const show = Math.round(n * Math.max(0.15, Math.min(1, cover[id] ?? 0)));
      const per = Math.ceil(n / s.centres.length);
      for (let i = 0; i < n; i++) {
        const c = s.centres[Math.floor(i / per) % s.centres.length]!;
        const ph = hash01(i, 77) * 6.28;
        const r = (id === "kril" ? 3 : 5) + 4 * hash01(i, 78);
        const w = t * (id === "austromerluza" ? 0.05 : 0.25) + ph;
        const x = c.x + Math.cos(w) * r;
        const z = c.z + Math.sin(w) * r;
        const y = c.y + Math.sin(t * 0.7 + ph) * 0.6 - hash01(i, 79) * 1.5;
        e.set(0, w + Math.PI, 0);
        q.setFromEuler(e);
        M.compose(v.set(x, y, z), q, i < show ? one : v.clone().set(0, 0, 0));
        s.mesh.setMatrixAt(i, M);
      }
      s.mesh.instanceMatrix.needsUpdate = true;
    }
    // The crowds: placed again when the chain's numbers change or the camera has moved; their jointed bodies first in
    // each herd, a third of them posed each frame (a breath, a head turning), the chain's animals after them.
    const resorted = !!st && !!cam && this.crowd.update(st, cam);
    if (cam) this.tussacLod(cam);
    this.frameNo++;
    for (const [sp, h] of this.herds) {
      for (const [herd, key] of [[h.adult, sp], [h.young, `${sp}:cria`]] as const) {
        const near = this.crowd.near.get(key) ?? [];
        const n = Math.min(near.length, herd.capacity);
        this.crowdN.set(key, n);
        for (let i = 0; i < n; i++) {
          if (!resorted && (i + this.frameNo) % 3) continue;
          const c = near[i]!;
          herd.pose(i, c.x, c.y, c.z, c.yaw, t + c.seed * 0.37, false, key.endsWith(":cria") ? (sp === "papua" ? 0.55 : 0.6) : 1);
          herd.mottle(i, c.moult);
        }
      }
    }
    // The chain's animals.
    const moult = this.moultOf;
    const used = new Map<string, [number, number]>();
    for (const p of poses) {
      const h = this.herds.get(p.species);
      if (!h) continue;
      const u = used.get(p.species) ?? [this.crowdN.get(p.species) ?? 0, this.crowdN.get(`${p.species}:cria`) ?? 0];
      const young = p.stage === "cria";
      const herd = young ? h.young : h.adult;
      const k = young ? u[1] : u[0];
      if (k >= herd.capacity) continue;
      const scale = young ? (p.species === "papua" ? p.scale : p.scale * 1.4) : p.scale;
      herd.pose(k, p.x, p.y, p.z, p.yaw, t + p.id, p.moving, Math.max(0.05, scale));
      herd.mottle(k, young ? 0 : (moult.get(p.species) ?? 0) > hash01(p.id, 91) ? 0.7 : 0);
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
