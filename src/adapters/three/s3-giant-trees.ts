import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Crown, HollowPlan, PlacedTree } from "@modules/aerial-sanctuary/data/montana";
import { GIANT, HOLLOW } from "@modules/aerial-sanctuary/data/montana";

/**
 * THE GIANT TREES SEEN AS TREES (Berón 2026-11-26: «los árboles colosales deben parecer árboles: corteza con textura,
 * ramas, hojas, frutos y flores; mantén los pisos del campus en ellos»). Ours (ficción, like the trees):
 * - the trunk: the layout's 18 × 18 m column (data/montana.ts, its solid) drawn as a rounded square (a superellipse that
 *   touches each face where the floors are born) with shallow vertical flutes and a bark texture drawn on a canvas
 *   (fissured ridges, darker cracks, a few patches of lichen), laid by world size so its plates keep their size;
 * - buttress roots fanning out under its deck into the clear lake;
 * - short limbs with leaf tufts between the floors, only where no floor of the tree is near (never over a room);
 * - the crown under the ceiling (data/montana.ts crownOf, kept clear by the carpets): limbs and branches, masses of
 *   leaves in several greens, fruit (orange and red) and flowers (white and pink) among the leaves.
 */

/** Deterministic noise (the same trees every time). */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

let bark: THREE.CanvasTexture | undefined;
/** Bark: vertical fissured ridges with darker cracks between them and a few lichen spots (256 × 512 px = 3 × 6 m). */
function barkTexture(): THREE.Texture | undefined {
  if (bark) return bark;
  if (typeof document === "undefined") return undefined;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const g = c.getContext("2d");
  if (!g) return undefined;
  const r = rng(7);
  g.fillStyle = "#6b4a32";
  g.fillRect(0, 0, 256, 512);
  // Ridges: long plates of lighter bark, each a little wavy.
  for (let i = 0; i < 26; i++) {
    const x = r() * 256;
    const w = 6 + r() * 16;
    const shade = 90 + Math.floor(r() * 50);
    g.fillStyle = `rgb(${shade + 20}, ${Math.floor(shade * 0.72)}, ${Math.floor(shade * 0.48)})`;
    g.beginPath();
    for (let y = 0; y <= 512; y += 16) g.lineTo(x + Math.sin(y / 40 + i) * 4 + (r() - 0.5) * 3, y);
    for (let y = 512; y >= 0; y -= 16) g.lineTo(x + w + Math.sin(y / 40 + i) * 4 + (r() - 0.5) * 3, y);
    g.closePath();
    g.fill();
  }
  // Cracks: dark wavy lines, and short cross cracks.
  g.strokeStyle = "rgba(30, 18, 10, 0.85)";
  for (let i = 0; i < 34; i++) {
    g.lineWidth = 1 + r() * 2.5;
    let x = r() * 256;
    g.beginPath();
    g.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 12) g.lineTo((x += (r() - 0.5) * 5), y);
    g.stroke();
  }
  for (let i = 0; i < 60; i++) {
    const x = r() * 256;
    const y = r() * 512;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 14, y + (r() - 0.5) * 4);
    g.stroke();
  }
  // Lichen: pale grey-green spots.
  for (let i = 0; i < 22; i++) {
    g.fillStyle = `rgba(${150 + r() * 30}, ${160 + r() * 30}, ${120 + r() * 20}, 0.55)`;
    g.beginPath();
    g.arc(r() * 256, r() * 512, 2 + r() * 6, 0, Math.PI * 2);
    g.fill();
  }
  bark = new THREE.CanvasTexture(c);
  bark.wrapS = bark.wrapT = THREE.RepeatWrapping;
  bark.colorSpace = THREE.SRGBColorSpace;
  return bark;
}

/** Plan radius of the trunk's rounded square (|x|⁶ + |z|⁶ = h⁶) at angle θ, with shallow inward flutes. */
function trunkR(h: number, th: number): number {
  const c = Math.abs(Math.cos(th));
  const s = Math.abs(Math.sin(th));
  const r = h / Math.pow(Math.pow(c, 6) + Math.pow(s, 6), 1 / 6);
  return r * (1 - 0.025 * (0.5 + 0.5 * Math.sin(th * 20)));
}

/** The trunk: rings every few metres from the lake's bottom to the ceiling; the bark laid by world size (3 × 6 m). */
function trunkGeometry(t: PlacedTree): THREE.BufferGeometry {
  const N = 72;
  const y0 = HOLLOW.floorY - 1;
  const y1 = t.top + 2;
  const rings: number[] = [];
  for (let y = y0; y < y1; y += 6) rings.push(y);
  rings.push(y1);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const h = GIANT.trunkHalf;
  for (const [j, y] of rings.entries()) {
    // The foot flares under the deck (into the roots), never over it: the floors are born at the faces.
    const flare = y < GIANT.deckY ? 1 + 0.35 * Math.min(1, (GIANT.deckY - y) / 4) : 1;
    let arc = 0;
    let prev: { x: number; z: number } | undefined;
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2;
      const r = trunkR(h, th) * flare;
      const p = { x: Math.cos(th) * r, z: Math.sin(th) * r };
      if (prev) arc += Math.hypot(p.x - prev.x, p.z - prev.z);
      prev = p;
      pos.push(t.x + p.x, y, t.z + p.z);
      uv.push(arc / 3, y / 6);
      if (j > 0 && i < N) {
        const a = (j - 1) * (N + 1) + i;
        const b = j * (N + 1) + i;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A limb: a tapered cylinder from a to b (radii ra → rb), its bark laid along it. */
function limb(a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(rb, ra, len, 10, Math.max(1, Math.round(len / 6)), false);
  const uvs = g.attributes.uv!;
  for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * ((2 * Math.PI * ra) / 3), (uvs.getY(i) * len) / 6);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  return g;
}

/** A mass of leaves: a lumpy ball of facets in several greens. */
function leaves(c: THREE.Vector3, r: number, rand: () => number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, 1).toNonIndexed();
  const p = g.attributes.position!;
  const col = new Float32Array(p.count * 3);
  const greens = [0x3f7a2e, 0x4f8f35, 0x2f6a2a, 0x5f9a3a, 0x6aa84a];
  const bump = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(2)},${p.getY(i).toFixed(2)},${p.getZ(i).toFixed(2)}`;
    let k = bump.get(key);
    if (k === undefined) bump.set(key, (k = 0.75 + rand() * 0.45));
    p.setXYZ(i, c.x + p.getX(i) * k, c.y + p.getY(i) * k * 0.8, c.z + p.getZ(i) * k);
  }
  for (let f = 0; f < p.count; f += 3) {
    const cc = new THREE.Color(greens[Math.floor(rand() * greens.length)]!);
    for (let v = 0; v < 3; v++) [col[(f + v) * 3], col[(f + v) * 3 + 1], col[(f + v) * 3 + 2]] = [cc.r, cc.g, cc.b];
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  return g;
}

interface Dot {
  readonly p: THREE.Vector3;
  readonly n: THREE.Vector3;
}

/** The crown of one tree: limbs and branches out from the trunk under the ceiling, leaf masses at their ends. */
function crown(c: Crown, rand: () => number, wood: THREE.BufferGeometry[], leaf: THREE.BufferGeometry[], dots: Dot[]): void {
  const n = 8;
  const depth = c.y1 - c.y0;
  for (let i = 0; i < n; i++) {
    const az = (i / n) * Math.PI * 2 + rand() * 0.5;
    const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    const y = c.y0 + 4 + rand() * depth * 0.35;
    const start = new THREE.Vector3(c.x, y, c.z).addScaledVector(dir, GIANT.trunkHalf * 0.95);
    const reach = c.r * (0.55 + rand() * 0.15);
    const end = new THREE.Vector3(c.x, Math.min(c.y1 - 8, y + depth * (0.35 + rand() * 0.25)), c.z).addScaledVector(dir, reach);
    wood.push(limb(start, end, 2.4, 0.9));
    // Two branches off each limb, and the leaves at their ends and the limb's.
    const tips = [end];
    for (const s of [-1, 1]) {
      const from = start.clone().lerp(end, 0.55 + rand() * 0.15);
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(s);
      const to = from.clone().addScaledVector(dir, 6 + rand() * 6).addScaledVector(side, 7 + rand() * 5);
      to.y = Math.min(c.y1 - 6, from.y + 4 + rand() * 6);
      wood.push(limb(from, to, 1, 0.45));
      tips.push(to);
    }
    for (const tp of tips) {
      const r = 6 + rand() * 4;
      const at = tp.clone();
      at.y = Math.min(at.y, c.y1 - r * 0.6);
      // Within the crown's box (its air kept for it).
      const off = Math.max(Math.abs(at.x - c.x), Math.abs(at.z - c.z));
      if (off + r > c.r) at.lerp(new THREE.Vector3(c.x, at.y, c.z), (off + r - c.r) / off);
      leaf.push(leaves(at, r, rand));
      for (let k = 0; k < 9; k++) {
        const nn = new THREE.Vector3(rand() - 0.5, rand() * 0.8 - 0.2, rand() - 0.5).normalize();
        dots.push({ p: at.clone().addScaledVector(nn, r * 0.95), n: nn });
      }
    }
  }
  // A canopy round the trunk's top, where it meets the ceiling.
  for (let i = 0; i < 6; i++) {
    const az = (i / 6) * Math.PI * 2 + 0.3;
    const at = new THREE.Vector3(c.x + Math.cos(az) * 13, c.y1 - 7, c.z + Math.sin(az) * 13);
    leaf.push(leaves(at, 8, rand));
  }
}

/** Short limbs with a leaf tuft between the floors, off the trunk's corners where no floor of the tree is near. */
function sideLimbs(t: PlacedTree, rand: () => number, wood: THREE.BufferGeometry[], leaf: THREE.BufferGeometry[], dots: Dot[]): void {
  const h = GIANT.trunkHalf;
  const top = Math.max(...t.floors.map((f) => f.top));
  for (let y = GIANT.deckY + 12; y < top + 8; y += 11) {
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      if (rand() < 0.35) continue;
      const a = new THREE.Vector3(t.x + sx * h * 0.72, y, t.z + sz * h * 0.72);
      const b = new THREE.Vector3(t.x + sx * (h + 7), y + 5, t.z + sz * (h + 7));
      // Never over or under a room: clear of every floor of the tree near it, from its slab up to its room's top.
      const clear = t.floors.every((f) => {
        const near = b.x > f.slab.x0 - 6 && b.x < f.slab.x1 + 6 && b.z > f.slab.z0 - 6 && b.z < f.slab.z1 + 6;
        return !near || y + 9 < f.y - 2 || y - 4 > f.top + 2;
      });
      if (!clear) continue;
      wood.push(limb(a, b, 1.3, 0.5));
      leaf.push(leaves(b, 3.5, rand));
      for (let k = 0; k < 3; k++) {
        const nn = new THREE.Vector3(rand() - 0.5, rand() * 0.6, rand() - 0.5).normalize();
        dots.push({ p: b.clone().addScaledVector(nn, 3.3), n: nn });
      }
    }
  }
}

/** Buttress roots fanning out of the foot under the deck into the lake. */
function roots(t: PlacedTree, rand: () => number, wood: THREE.BufferGeometry[]): void {
  for (let i = 0; i < 10; i++) {
    const az = (i / 10) * Math.PI * 2 + rand() * 0.3;
    const d = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    const a = new THREE.Vector3(t.x, GIANT.deckY - 0.6, t.z).addScaledVector(d, GIANT.trunkHalf * 0.9);
    const b = new THREE.Vector3(t.x, HOLLOW.floorY + 0.3, t.z).addScaledVector(d, GIANT.deckHalf + 6 + rand() * 8);
    wood.push(limb(a, b, 1.6, 0.5));
  }
}

/** All the giant trees of the hollow, merged by material (a few draw calls). */
export function buildGiantTrees(plan: HollowPlan): THREE.Group {
  const g = new THREE.Group();
  g.name = "arboles-colosales";
  const map = barkTexture();
  const barkMat = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : 0x6b4a32, roughness: 0.95, metalness: 0, ...(map ? { map } : {}) });
  const trunks: THREE.BufferGeometry[] = [];
  const wood: THREE.BufferGeometry[] = [];
  const leaf: THREE.BufferGeometry[] = [];
  const dots: Dot[] = [];
  plan.trees.forEach((t, i) => {
    const rand = rng(1000 + i * 37);
    trunks.push(trunkGeometry(t));
    roots(t, rand, wood);
    sideLimbs(t, rand, wood, leaf, dots);
    const c = plan.crowns.find((q) => q.tree === t.def.id);
    if (c) crown(c, rand, wood, leaf, dots);
  });
  const add = (geos: THREE.BufferGeometry[], m: THREE.Material, name: string) => {
    if (!geos.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(geos), m);
    mesh.name = name;
    g.add(mesh);
  };
  add(trunks, barkMat, "arbol-tronco");
  add(wood.map((q) => (q.index ? q.toNonIndexed() : q)), barkMat, "arbol-ramas");
  add(leaf, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true }), "arbol-hojas");
  // Fruit (every third dot: orange and red) and flowers (the rest: white and pink, five petals), on the leaves.
  const fruitDots = dots.filter((_, i) => i % 3 === 0);
  const flowerDots = dots.filter((_, i) => i % 3 !== 0);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const fruit = new THREE.InstancedMesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.5 }), fruitDots.length);
  fruitDots.forEach((d, i) => {
    fruit.setMatrixAt(i, m4.compose(d.p, q.identity(), one));
    fruit.setColorAt(i, new THREE.Color(i % 2 ? 0xe0661f : 0xc4282a));
  });
  fruit.name = "arbol-frutos";
  g.add(fruit);
  const petals = mergeGeometries(
    [0, 1, 2, 3, 4].map((k) => {
      const p = new THREE.CircleGeometry(0.45, 8);
      p.translate(0.5, 0, 0);
      p.rotateZ((k * 2 * Math.PI) / 5);
      return p;
    }),
  );
  petals.rotateX(-Math.PI / 2);
  const flowers = new THREE.InstancedMesh(petals, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6, emissive: 0x221a1a }), flowerDots.length);
  const up = new THREE.Vector3(0, 1, 0);
  flowerDots.forEach((d, i) => {
    q.setFromUnitVectors(up, d.n);
    flowers.setMatrixAt(i, m4.compose(d.p, q, one));
    flowers.setColorAt(i, new THREE.Color(i % 3 ? 0xf6f1ea : 0xf2a7c3));
  });
  flowers.name = "arbol-flores";
  g.add(flowers);
  // Each flower's yellow middle.
  const middles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf2c230 }), flowerDots.length);
  flowerDots.forEach((d, i) => middles.setMatrixAt(i, m4.compose(d.p.clone().addScaledVector(d.n, 0.12), q.identity(), one)));
  middles.name = "arbol-flores-centro";
  g.add(middles);
  return g;
}
