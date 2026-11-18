import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { S1Layout } from "@modules/sanctuary-one/data/layout";
import { model, type Category, type ModelDef } from "@modules/sanctuary-one/data/catalog";
import { WATER_Y } from "@modules/sanctuary-one/data/site";
import { textSign } from "./interior/sign";

/**
 * Sanctuary 1 drawn from its layout (docs/design/santuario1.md). Every catalogue model is ONE geometry and one
 * InstancedMesh holding all its copies: change the entry and every copy changes; each mesh is tagged with its
 * category and group so a whole category can be hidden, recoloured or rescaled at once (`S1Scene.style`).
 */
const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.05, ...o });

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/** Paints a geometry one colour (vertex colours, so composite models keep each part's own). */
function paint(g: THREE.BufferGeometry, c: number): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  const col = new THREE.Color(c);
  const a = new Float32Array(n.attributes.position!.count * 3);
  for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b; }
  n.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return n;
}

/**
 * A model's geometry at its true size, standing on y = 0, its front towards −z, with vertex colours (each part of a
 * composite its own; `plain` paints it all white, for a recoloured copy whose material carries the colour).
 */
function geometryOf(d: ModelDef, plain = false): THREE.BufferGeometry {
  if (d.parts) return mergeGeometries(d.parts.map(([cx, cy, cz, sx, sy, sz, c]) => paint(box(cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2), plain ? 0xffffff : c ?? d.color)));
  const g = shapeOf(d);
  return g.getAttribute("color") && !plain ? g : paint(g, plain ? 0xffffff : d.color);
}

function shapeOf(d: ModelDef): THREE.BufferGeometry {
  const { x, y, z } = d.size;
  switch (d.shape) {
    case "cilindro": {
      const g = new THREE.CylinderGeometry(x / 2, x / 2, y, 16);
      g.scale(1, 1, z / x);
      g.translate(0, y / 2, 0);
      return g;
    }
    case "arbol": {
      // A tree: trunk a fifth of the height, crown the rest (x = crown width).
      const trunk = new THREE.CylinderGeometry(x * 0.06, x * 0.09, y * 0.35, 7);
      trunk.translate(0, y * 0.175, 0);
      const crown = new THREE.IcosahedronGeometry(0.5, 1);
      crown.scale(x, y * 0.7, z);
      crown.translate(0, y * 0.62, 0);
      return mergeGeometries([paint(trunk, 0x6b4f35), paint(crown, d.color)]);
    }
    case "cuadrupedo": {
      // Body, four legs, neck and head: proportions of a standing mammal of this length and height.
      const legH = y * 0.45;
      const bodyH = y * 0.4;
      const parts = [box(-x / 2, x / 2, legH, legH + bodyH, -z * 0.35, z * 0.4)];
      const lw = Math.min(x, z) * 0.18;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(box(sx * x * 0.32 - lw / 2, sx * x * 0.32 + lw / 2, 0, legH, sz * z * 0.3 - lw / 2, sz * z * 0.3 + lw / 2));
      parts.push(box(-x * 0.22, x * 0.22, legH + bodyH * 0.6, y, -z * 0.5, -z * 0.3));
      return mergeGeometries(parts);
    }
    case "cetaceo": {
      const g = new THREE.SphereGeometry(0.5, 14, 10);
      g.scale(x, y, z);
      g.translate(0, y / 2, 0);
      const flukes = box(-x * 0.9, x * 0.9, y * 0.45, y * 0.55, z * 0.46, z * 0.56);
      return mergeGeometries([g.toNonIndexed(), flukes.toNonIndexed()]);
    }
    case "pinnipedo": {
      const g = new THREE.SphereGeometry(0.5, 12, 8);
      g.scale(x, y, z);
      g.translate(0, y / 2, 0);
      return g;
    }
    case "pinguino": {
      const g = new THREE.CapsuleGeometry(x / 2, Math.max(0.01, y - x), 4, 10);
      g.translate(0, y / 2, 0);
      return g;
    }
    case "ave": {
      const body = box(-x * 0.08, x * 0.08, y * 0.3, y, -z / 2, z / 2);
      const wings = box(-x / 2, x / 2, y * 0.6, y * 0.7, -z * 0.15, z * 0.15);
      return mergeGeometries([body, wings]);
    }
    case "maquina": {
      // A weight-stack machine: base frame, the stack's tower at the back, a seat and the top beam (docs/gimnasio-maquinas.md).
      return mergeGeometries([
        box(-x / 2, x / 2, 0, 0.08, -z / 2, z / 2),
        box(-x * 0.15, x * 0.15, 0, y, z / 2 - 0.3, z / 2),
        box(-0.24, 0.24, 0.42, 0.55, -0.25, 0.2),
        box(-0.22, 0.22, 0.55, Math.min(y, 1.3), 0.15, 0.25),
        box(-x / 2, x / 2, y - 0.08, y, z / 2 - 0.3, z / 2 - 0.2),
        box(-x / 2, -x / 2 + 0.08, 0, y, z / 2 - 0.3, z / 2 - 0.2),
        box(x / 2 - 0.08, x / 2, 0, y, z / 2 - 0.3, z / 2 - 0.2),
      ]);
    }
    case "banco": {
      // A bench: the pad on two legs, and the uprights of the bar at its head.
      return mergeGeometries([
        box(-0.15, 0.15, 0.36, 0.45, -z * 0.35, z * 0.35),
        box(-0.2, 0.2, 0, 0.36, -z * 0.3, -z * 0.25),
        box(-0.2, 0.2, 0, 0.36, z * 0.25, z * 0.3),
        ...(x > 1 ? [box(-x * 0.3, -x * 0.3 + 0.08, 0, y, z * 0.3, z * 0.38), box(x * 0.3 - 0.08, x * 0.3, 0, y, z * 0.3, z * 0.38), box(-x / 2, x / 2, y - 0.25, y - 0.2, z * 0.32, z * 0.36)] : []),
      ]);
    }
    case "jaula": {
      // A power rack: four uprights, the top frame and the bar on its hooks.
      const c = 0.65;
      const parts = [box(-c, c, y - 0.08, y, -z / 2, -z / 2 + 0.08), box(-c, c, y - 0.08, y, z / 2 - 0.08, z / 2), box(-x / 2, x / 2, 1.42, 1.47, -0.03, 0.03)];
      for (const sx of [-c, c - 0.08]) for (const sz of [-z / 2, z / 2 - 0.08]) parts.push(box(sx, sx + 0.08, 0, y, sz, sz + 0.08));
      return mergeGeometries(parts);
    }
    default:
      return box(-x / 2, x / 2, 0, y, -z / 2, z / 2);
  }
}

export interface S1Scene {
  readonly root: THREE.Group;
  /** Each catalogue model's mesh (all its copies), by «model id|tint» (tint empty unless a bulk rule recolours it). */
  readonly meshes: ReadonlyMap<string, THREE.InstancedMesh>;
  /** Bulk change: show/hide or recolour every model of a category (or of one group of it). */
  style(category: Category, o: { visible?: boolean; color?: number; group?: string }): void;
}

export function buildS1Scene(L: S1Layout): S1Scene {
  const root = new THREE.Group();
  // The ground: ice caps (white, 1,5 m thick plates) and the land island (tundra), merged by kind.
  const ice: THREE.BufferGeometry[] = [];
  const land: THREE.BufferGeometry[] = [];
  const decks: THREE.BufferGeometry[] = [];
  const thresholds: THREE.BufferGeometry[] = [];
  for (const f of L.world.floors) {
    if (f.area.startsWith("hielo:")) ice.push(box(f.x0, f.x1, -1.5, 0, f.z0, f.z1));
    else if (f.area.startsWith("tierra:")) land.push(box(f.x0, f.x1, -3, 0, f.z0, f.z1));
    else if (f.id.endsWith("umbral") || f.id.includes("umbral-suelo")) thresholds.push(box(f.x0, f.x1, f.y - 0.3, f.y - 0.01, f.z0, f.z1));
    else if (f.area.endsWith(":techo") || f.area.includes(":punta-")) decks.push(box(f.x0, f.x1, f.y - 0.5, f.y - 0.01, f.z0, f.z1));
  }
  const add = (geos: THREE.BufferGeometry[], m: THREE.Material, name: string) => {
    if (!geos.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(geos), m);
    mesh.name = name;
    root.add(mesh);
  };
  add(ice, mat(0xe9f2f7, { roughness: 0.4 }), "hielo");
  add(land, mat(0x7d8460), "tierra");
  add(thresholds, mat(0x8fa2ad), "umbrales");
  add(decks, mat(0x6f8a5a), "puntas-y-techos");
  // Tower floors: slab, struts and railing (Cold Sanctuary's HelixTower: «tornapuntas» under each floor).
  const slabs: THREE.BufferGeometry[] = [];
  const struts: THREE.BufferGeometry[] = [];
  const rails: THREE.BufferGeometry[] = [];
  const slabsRing: THREE.BufferGeometry[] = [];
  for (const t of L.towers) {
    for (const f of t.floors) {
      const r = f.rect;
      slabs.push(box(r.x0, r.x1, f.y - 0.6, f.y - 0.01, r.z0, r.z1));
      const w = r.x1 - r.x0;
      const d = r.z1 - r.z0;
      for (const [sx, sz] of [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]] as const) {
        const cx = r.x0 + w * sx;
        const cz = r.z0 + d * sz;
        struts.push(box(cx - 0.4, cx + 0.4, f.y - 4.6, f.y - 0.6, cz - 0.4, cz + 0.4));
      }
      for (const [x0, x1, z0, z1] of [[r.x0, r.x1, r.z0, r.z0 + 0.08], [r.x0, r.x1, r.z1 - 0.08, r.z1], [r.x0, r.x0 + 0.08, r.z0, r.z1], [r.x1 - 0.08, r.x1, r.z0, r.z1]] as const) rails.push(box(x0, x1, f.y + 1.0, f.y + 1.1, z0, z1));
    }
    for (const ring of t.rings) for (const r of ring.rects) slabsRing.push(box(r.x0, r.x1, ring.y - 0.3, ring.y - 0.01, r.z0, r.z1));
    for (const tip of t.tips) {
      const r = tip.rect;
      struts.push(box(r.x0 + 2, r.x0 + 2.6, tip.y - 4.5, tip.y - 0.5, r.z0 + 2, r.z0 + 2.6));
    }
  }
  add(slabs, mat(0xc9cfd4), "losas");
  add(slabsRing, mat(0x7a6654), "anillos");
  add(struts, mat(0x7d8a94), "tornapuntas");
  add(rails, mat(0x9fb3bf, { metalness: 0.4 }), "barandillas");
  // Water: the trunks, their branches and columns (Cold Sanctuary's magic: water standing in a field) and the sea.
  const water: THREE.BufferGeometry[] = [];
  for (const w of L.world.waters) if (w.id !== "mar") water.push(box(w.x0, w.x1, w.yBottom, w.yTop, w.z0, w.z1));
  add(water, mat(0x2f8fbf, { transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }), "agua");
  add(L.walls.map((s) => box(s.x0, s.x1, s.y0, s.y1, s.z0, s.z1)), mat(0x8fd8ff, { transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false }), "acrilico");
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), mat(0x1d4f6b, { roughness: 0.3, metalness: 0.1 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WATER_Y;
  sea.name = "mar";
  root.add(sea);

  // The catalogue's instances: one InstancedMesh per model (people are drawn by the scene as figures).
  const meshes = new Map<string, THREE.InstancedMesh>();
  const by = new Map<string, S1Layout["instances"][number][]>();
  for (const i of L.instances) {
    if (model(i.model).shape === "figura") continue;
    const key = `${i.model}|${i.tint ?? ""}`;
    by.set(key, [...(by.get(key) ?? []), i]);
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const geos = new Map<string, THREE.BufferGeometry>();
  for (const [key, list] of by) {
    const d = model(list[0]!.model);
    const tint = list[0]!.tint;
    const gk = `${d.id}|${tint !== undefined}`;
    const geo = geos.get(gk) ?? geometryOf(d, tint !== undefined);
    geos.set(gk, geo);
    const mesh = new THREE.InstancedMesh(geo, mat(tint ?? 0xffffff, { vertexColors: true }), list.length);
    list.forEach((it, n) => {
      q.setFromAxisAngle(up, it.rot);
      const p = it.plan ?? 1;
      const sc = it.scale ?? 1;
      m4.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(p * sc, sc, p * sc));
      mesh.setMatrixAt(n, m4);
    });
    mesh.name = `modelo-${key}`;
    mesh.userData = { category: d.category, group: d.group, model: d.id };
    meshes.set(key, mesh);
    root.add(mesh);
  }
  // Signs over each floor and building (each floor's name, as Cold Sanctuary's WorldLabel).
  for (const t of L.towers) {
    const s = textSign(t.building);
    s.scale.multiplyScalar(5);
    s.position.set(t.x, t.rootHeight + 6, t.z);
    root.add(s);
  }
  for (const a of L.areas) {
    if (!a.entry) continue;
    const s = textSign(a.label);
    s.scale.multiplyScalar(1.6);
    s.position.set(a.entry.x, a.y + 5.5, a.entry.z);
    s.userData = { category: "rotulo" };
    root.add(s);
  }
  return {
    root,
    meshes,
    style(category, o) {
      for (const mesh of meshes.values()) {
        const u = mesh.userData as { category: Category; group: string };
        if (u.category !== category || (o.group && u.group !== o.group)) continue;
        if (o.visible !== undefined) mesh.visible = o.visible;
        if (o.color !== undefined) (mesh.material as THREE.MeshStandardMaterial).color.setHex(o.color);   // multiplies the parts' own colours
      }
    },
  };
}
