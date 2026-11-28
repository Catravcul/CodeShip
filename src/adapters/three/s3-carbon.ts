import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { AnimalSpec, BiomeDef } from "@modules/aerial-sanctuary/data/bioma";
import { INSECT_SCALE } from "@modules/aerial-sanctuary/data/bioma";
import { BIOME_ISLAND, MOUNTAIN } from "@modules/aerial-sanctuary/data/bioma-island";
import { CARBON_SUMMIT, CARBON_ZONE } from "@modules/aerial-sanctuary/data/carbonifero";
import { LAKE_LARVAE } from "@modules/aerial-sanctuary/data/larvas-lago";
import { larvaPose, type LakeFrame, type LarvaPose } from "@modules/aerial-sanctuary/domain/larvas-lago";
import { heightAt, slopeAt } from "@modules/aerial-sanctuary/domain/mountain";
import type { Pose } from "@modules/aerial-sanctuary/application/biome-life";
import { hash01 } from "@modules/fauna/domain/roam";
import { AnimalHerd, type HerdModel } from "./animal-bodies";
import { BiomeCrowd, NEAR_CAP, poseCrowd, type CrowdFrame } from "./s3-biome-crowd";
import type { BiomeState } from "@modules/aerial-sanctuary/domain/bioma";

/**
 * The Carboniferous forest at the pyramid's foot and on its summit, and the larvae of the pyramid's lake (docs/design/
 * carbonifero.md, larvas-lago.md). Five trees of the coal swamps, each a procedural shape of its fossils at real size,
 * one instanced mesh a species (vertex colours: five draw calls): Lepidodendron's tall trunk with its diamond leaf
 * cushions and a crown forking two by two with cones at the tips; Sigillaria's ribbed column with a tuft of long leaves;
 * Calamites' jointed stems with whorls of branches at each node; Psaronius, the tree fern, wide at its foot with its
 * mantle of roots and a crown of drooping fronds; Cordaites with its strap leaves at the branch ends. The giants of
 * the chain are fauna's jointed bodies (one merged mesh a species and stage), and so are the lake's larvae, ×400.
 */
const col = (g: THREE.BufferGeometry, c: number, jitter = 0): THREE.BufferGeometry => {
  const geo = g.index ? g.toNonIndexed() : g;
  const n = geo.attributes.position!.count;
  const a = new Float32Array(n * 3);
  const base = new THREE.Color(c);
  const k = new THREE.Color();
  for (let i = 0; i < n; i++) {
    k.copy(base);
    // Faces a little lighter and darker by height (the bark's rows, the leaves' shading).
    if (jitter) k.offsetHSL(0, 0, (Math.sin(geo.attributes.position!.getY(i) * 3.1) * 0.5) * jitter);
    a.set([k.r, k.g, k.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(a, 3));
  geo.deleteAttribute("uv");
  return geo;
};
/** A stick from a to b of radius r0 → r1 (a branch). */
function stick(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, c: number, seg = 5): THREE.BufferGeometry {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r1, r0, d.length(), seg, 1).translate(0, d.length() / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate(a.x, a.y, a.z);
  return col(g, c);
}

const BARK = 0x5a5040;
const LEAF = 0x3f6a2a;

/** Lepidodendron: ~35 m, trunk 1 m across with rows of diamond cushions (bands), the crown forking dichotomously. */
function lepidodendron(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const H = 26;
  // The trunk in stacked bands, light and dark (the spiral rows of leaf cushions).
  for (let i = 0; i < 13; i++) {
    const y0 = (i * H) / 13;
    const r = 0.55 - 0.15 * (i / 13);
    parts.push(col(new THREE.CylinderGeometry(r * 0.97, r, H / 13, 8, 1).rotateY(i * 0.39).translate(0, y0 + H / 26, 0), i % 2 ? 0x6a604a : 0x4e4636));
  }
  // The crown: each branch forks in two, four times; needles round the last twigs and a cone at each tip.
  const fork = (p: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number, turn: number): void => {
    const q = p.clone().addScaledVector(dir, len);
    parts.push(stick(p, q, r, r * 0.7, BARK, 5));
    if (depth === 0) {
      parts.push(col(new THREE.CylinderGeometry(0.5, 0.25, len * 0.9, 6, 1, true).translate(0, len * 0.45, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)).translate(p.x, p.y, p.z), LEAF, 0.15));
      parts.push(col(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 6).translate(q.x, q.y - 0.4, q.z), 0x8a6a3a));
      return;
    }
    for (const s of [-1, 1]) {
      const axis = new THREE.Vector3(Math.cos(turn), 0, Math.sin(turn));
      const d = dir.clone().applyAxisAngle(axis, s * 0.45).normalize();
      fork(q, d, len * 0.75, r * 0.7, depth - 1, turn + Math.PI / 2);
    }
  };
  fork(new THREE.Vector3(0, H, 0), new THREE.Vector3(0, 1, 0), 3.2, 0.42, 4, 0.3);
  return mergeGeometries(parts);
}

/** Sigillaria: ~22 m, a ribbed column (vertical rows of seal-like scars), once forked, each top a tuft of long leaves. */
function sigillaria(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const H = 16;
  parts.push(col(new THREE.CylinderGeometry(0.4, 0.55, H, 12, 1).translate(0, H / 2, 0), 0x5a5442));
  // Its ribs: twelve vertical strips a little out.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    parts.push(col(new THREE.BoxGeometry(0.08, H * 0.98, 0.1).translate(Math.cos(a) * 0.47, H / 2, Math.sin(a) * 0.47).rotateY(0), 0x6e6650));
  }
  for (const s of [-1, 1]) {
    const top = new THREE.Vector3(s * 1.4, H + 3.5, 0);
    parts.push(stick(new THREE.Vector3(0, H, 0), top, 0.35, 0.28, 0x5a5442, 8));
    // The tuft: 24 grass-like leaves a metre long and more, out and up.
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const up = 0.35 + 0.5 * hash01(i, s + 3);
      const d = new THREE.Vector3(Math.cos(a) * Math.cos(up), Math.sin(up), Math.sin(a) * Math.cos(up));
      const leaf = new THREE.BoxGeometry(0.06, 0.02, 1.9).translate(0, 0, 0.95);
      leaf.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d));
      parts.push(col(leaf.translate(top.x, top.y, top.z), LEAF));
    }
  }
  return mergeGeometries(parts);
}

/** Calamites: ~12 m, a jointed hollow stem, a whorl of thin branches at every node with star leaves (Annularia). */
function calamites(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const nodes = 11;
  const seg = 1.05;
  for (let i = 0; i < nodes; i++) {
    const y = i * seg;
    const r = 0.22 - 0.012 * i;
    parts.push(col(new THREE.CylinderGeometry(r, r, seg - 0.06, 8).translate(0, y + seg / 2, 0), 0x6a7a42, 0.1));
    parts.push(col(new THREE.CylinderGeometry(r + 0.05, r + 0.05, 0.08, 8).translate(0, y + seg, 0), 0x4a5a2a));
    if (i < 3) continue;
    // The whorl: 8 branches out and a little up, shorter towards the top.
    const L = 1.8 * (1 - (i - 3) / (nodes - 2)) + 0.4;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + i * 0.4;
      const b = new THREE.Vector3(Math.cos(a) * L, y + seg + L * 0.35, Math.sin(a) * L);
      parts.push(stick(new THREE.Vector3(0, y + seg, 0), b, 0.04, 0.025, 0x5a6a38, 4));
      parts.push(col(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 8).translate(b.x, b.y, b.z), LEAF));
    }
  }
  return mergeGeometries(parts);
}

/** Psaronius: ~8 m, the trunk wide at its foot with the mantle of roots, a crown of big drooping fronds (Pecopteris). */
function psaronius(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(col(new THREE.CylinderGeometry(0.28, 1.1, 3, 10).translate(0, 1.5, 0), 0x4a3a28, 0.2));
  parts.push(col(new THREE.CylinderGeometry(0.22, 0.3, 4.5, 8).translate(0, 5.2, 0), 0x5a4a32, 0.2));
  // The fronds: 12, each a long blade of pinnae, out and drooping at the tip.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2;
    const base = new THREE.Vector3(0, 7.3, 0);
    const mid = new THREE.Vector3(Math.cos(a) * 1.8, 8.3, Math.sin(a) * 1.8);
    const tip = new THREE.Vector3(Math.cos(a) * 3.4, 7.2, Math.sin(a) * 3.4);
    for (const [p, q] of [[base, mid], [mid, tip]] as const) {
      const d = new THREE.Vector3().subVectors(q, p);
      const blade = new THREE.BoxGeometry(1.1, 0.03, d.length()).translate(0, 0, d.length() / 2);
      blade.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize()));
      parts.push(col(blade.translate(p.x, p.y, p.z), 0x4f7a32, 0.1));
      parts.push(stick(p, q, 0.05, 0.03, 0x5a5a2a, 4));
    }
  }
  return mergeGeometries(parts);
}

/** Cordaites: ~28 m, a straight trunk branching in its upper third, strap leaves up to 1 m in tufts at the branch ends. */
function cordaites(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const H = 22;
  parts.push(col(new THREE.CylinderGeometry(0.3, 0.5, H, 8).translate(0, H / 2, 0), 0x5e4a34, 0.15));
  for (let i = 0; i < 9; i++) {
    const y = H * 0.62 + (i / 9) * H * 0.4;
    const a = i * 2.4;
    const L = 4 * (1 - i / 12);
    const end = new THREE.Vector3(Math.cos(a) * L, y + L * 0.5, Math.sin(a) * L);
    parts.push(stick(new THREE.Vector3(0, y, 0), end, 0.14, 0.07, 0x5e4a34, 5));
    for (let k = 0; k < 10; k++) {
      const b = (k / 10) * Math.PI * 2;
      const up = 0.2 + 0.6 * hash01(i, k);
      const d = new THREE.Vector3(Math.cos(b) * Math.cos(up), Math.sin(up), Math.sin(b) * Math.cos(up));
      const leaf = new THREE.BoxGeometry(0.14, 0.02, 1).translate(0, 0, 0.5);
      leaf.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d));
      parts.push(col(leaf.translate(end.x, end.y, end.z), 0x355a26));
    }
  }
  return mergeGeometries(parts);
}

/** How many of each tree in the forest and on the summit (ours; the scene's budget). */
export const CARBON_TREES = {
  lepidodendron: { geo: lepidodendron, forest: 22, summit: 0 },
  sigillaria: { geo: sigillaria, forest: 16, summit: 2 },
  calamites: { geo: calamites, forest: 30, summit: 4 },
  psaronius: { geo: psaronius, forest: 26, summit: 6 },
  cordaites: { geo: cordaites, forest: 12, summit: 4 },
} as const;

export class CarbonScene {
  readonly root = new THREE.Group();
  private readonly herds = new Map<string, { adult: AnimalHerd; young: AnimalHerd }>();
  private readonly larvae = new Map<string, AnimalHerd>();
  /** Where every tree stands (world m): the tests and PX read it. */
  readonly trees: { species: string; x: number; y: number; z: number }[] = [];
  /** The larvae posed last (the label near her). */
  lastLarvae: LarvaPose[] = [];

  /** The colonies of the social insects about their nests (s3-biome-crowd.ts), when drawn here (inside the hall). */
  readonly crowd?: BiomeCrowd;
  private frameNo = 0;

  /**
   * `o.place`: where the trees stand (world m; by default on the mountain at the forest's zone: inside the hall, its
   * shore); `o.trees` false: none (the giant insects of Gilgit-Baltistán drawn the same way); `o.larvae` false: none;
   * `o.crowd`: the colonies' frame (the hall's shore), their nests and workers drawn as outside (bioma-s3.md §Colonias).
   */
  constructor(def: BiomeDef, private readonly lake: LakeFrame, private readonly o: { readonly trees?: boolean; readonly larvae?: boolean; readonly place?: (n: number, seed: number) => { x: number; y: number; z: number }[]; readonly crowd?: CrowdFrame } = {}) {
    this.root.name = "carbonifero";
    const C = BIOME_ISLAND.centre.value;
    const M = MOUNTAIN.value;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
    const place = (n: number, at: { x: number; z: number }, r: number, seed: number) => {
      const out: { x: number; z: number; y: number }[] = [];
      for (let i = 0; out.length < n && i < n * 12; i++) {
        const a = hash01(seed, i * 2) * Math.PI * 2;
        const d = Math.sqrt(hash01(seed, i * 2 + 1)) * r;
        const lx = at.x + Math.cos(a) * d;
        const lz = at.z + Math.sin(a) * d;
        const y = heightAt(M, lx, lz);
        if (y < 1 || slopeAt(M, lx, lz) > 1.4) continue;
        if (out.some((p) => Math.hypot(p.x - lx, p.z - lz) < 6)) continue;
        out.push({ x: lx, z: lz, y });
      }
      return out;
    };
    if (o.trees !== false) Object.entries(CARBON_TREES).forEach(([id, t], k) => {
      const spots = o.place ? o.place(t.forest + t.summit, 101 + k).map((p) => ({ x: p.x - C.x, y: p.y, z: p.z - C.z })) : [...place(t.forest, CARBON_ZONE.value.point, CARBON_ZONE.value.r, 101 + k), ...place(t.summit, CARBON_SUMMIT.value.point, CARBON_SUMMIT.value.r, 211 + k)];
      const mesh = new THREE.InstancedMesh(t.geo(), mat, Math.max(1, spots.length));
      mesh.name = `carbonifero-${id}`;
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      spots.forEach((p, i) => {
        const s = 0.75 + 0.5 * hash01(i, k + 9);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash01(k, i) * 6.28);
        m4.compose(new THREE.Vector3(C.x + p.x, p.y - 0.3, C.z + p.z), q, new THREE.Vector3(s, s, s));
        mesh.setMatrixAt(i, m4);
        this.trees.push({ species: id, x: C.x + p.x, y: p.y, z: C.z + p.z });
      });
      mesh.count = spots.length;
      this.root.add(mesh);
    });
    // The chain's giants (real size) and their young: an insect's nymph with wing buds; an Arthropleura's young, small.
    for (const s of def.species.filter((x): x is AnimalSpec => x.kind === "animal")) {
      const adult: HerdModel = { id: s.id, shape: s.shape === "pajaro" ? "ave" : s.shape, size: s.size, color: s.color, category: "animal", group: "carbonifero" };
      const young: HerdModel = { ...adult, id: s.shape === "insecto" && s.nymph ? `${s.id}-ninfa` : s.id };
      const extra = o.crowd ? (NEAR_CAP[s.id] ?? { adult: 0, young: 0 }) : { adult: 0, young: 0 };
      const a = new AnimalHerd(adult, s.cap * 2 + 2 + extra.adult, undefined, { merged: true });
      const y = new AnimalHerd(young, s.cap * 2 + s.young * 3 + extra.young, undefined, { merged: true });
      for (const m of [...a.meshes, ...y.meshes]) this.root.add(m);
      this.herds.set(s.id, { adult: a, young: y });
    }
    if (o.crowd) {
      this.crowd = new BiomeCrowd(o.crowd);
      this.root.add(this.crowd.boxes);
    }
    // The lake's larvae, ×400 like the island's insects.
    const k = INSECT_SCALE.value;
    if (o.larvae !== false) for (const s of LAKE_LARVAE) {
      const h = new AnimalHerd({ id: s.body, shape: "insecto", size: { x: s.size.x * k, y: s.size.y * k, z: s.size.z * k }, color: s.color, category: "animal", group: "lago" }, s.drawn, undefined, { merged: true });
      for (const m of h.meshes) this.root.add(m);
      this.larvae.set(s.id, h);
    }
  }

  /** Each frame: the giants posed from the chain; the larvae from their cycle (`bioDay`), when the camera is near. */
  update(t: number, poses: readonly Pose[], bioDay: number, cam: THREE.Vector3, st?: BiomeState): void {
    // The colonies first: their jointed workers at the start of each herd, the chain's animals after them.
    const first = new Map<string, [number, number]>();
    if (this.crowd && st) {
      const resorted = this.crowd.update(st, cam);
      this.frameNo++;
      for (const [sp, h] of this.herds)
        first.set(sp, [poseCrowd(h.adult, this.crowd.near.get(sp) ?? [], t, resorted, this.frameNo, false), poseCrowd(h.young, this.crowd.near.get(`${sp}:cria`) ?? [], t, resorted, this.frameNo, true)]);
    }
    const used = new Map<string, [number, number]>();
    for (const p of poses) {
      if (p.hidden) continue;
      const h = this.herds.get(p.species);
      if (!h) continue;
      const u = used.get(p.species) ?? [...(first.get(p.species) ?? [0, 0])] as [number, number];
      const young = p.stage === "cria" || p.stage === "joven";
      const herd = young ? h.young : h.adult;
      const i = young ? u[1] : u[0];
      if (i >= herd.capacity) continue;
      herd.pose(i, p.x, p.y, p.z, p.yaw, t + p.id, p.moving, Math.max(0.05, p.scale));
      u[young ? 1 : 0]++;
      used.set(p.species, u);
    }
    for (const [sp, h] of this.herds) {
      const u = used.get(sp) ?? first.get(sp) ?? [0, 0];
      h.adult.show(u[0]);
      h.young.show(u[1]);
      h.adult.commit();
      h.young.commit();
    }
    const L = this.lake;
    const near = Math.hypot(cam.x - L.x, cam.z - L.z) < 400;
    this.lastLarvae = [];
    for (const s of LAKE_LARVAE) {
      const h = this.larvae.get(s.id);
      if (!h) continue;
      if (!near) {
        h.show(0);
        continue;
      }
      const len = s.size.z * INSECT_SCALE.value;
      for (let i = 0; i < s.drawn; i++) {
        const p = larvaPose(s, i, bioDay, t, L, len);
        this.lastLarvae.push(p);
        h.pose(i, p.x, p.y, p.z, p.yaw, t + i, p.moving, Math.max(0.04, p.scale));
      }
      h.show(s.drawn);
      h.commit();
    }
  }
}
