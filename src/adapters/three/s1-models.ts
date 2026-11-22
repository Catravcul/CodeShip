import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { AQUARIUM_AREA, type S1Layout } from "@modules/sanctuary-one/data/layout";
import { model, type Category, type ModelDef } from "@modules/sanctuary-one/data/catalog";
import { AQUARIUM, BASE, WATER_Y, aquariumRadius } from "@modules/sanctuary-one/data/site";
import { TRUNK_HALF } from "@modules/sanctuary-one/data/paso";
import { TREE } from "@modules/aerial-sanctuary/data/facts";
import { textSign } from "./interior/sign";
import { AnimalHerd } from "./animal-bodies";

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
 * The trees' wood (Berón 2026-11-21: «¿se podría usar una imagen sobre estos objetos para dar más sensación de
 * madera?»): a plank texture drawn once on a canvas (no image to download: planks of 0,5 m with grain, knots and
 * seams), laid on each face by its world position so a 40 m floor shows its planks at their size. Ours.
 */
let woodMap: THREE.CanvasTexture | undefined;
function woodTexture(): THREE.Texture | undefined {
  if (woodMap) return woodMap;
  if (typeof document === "undefined") return undefined;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  if (!g) return undefined;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const planks = 8;
  const h = 256 / planks;
  for (let i = 0; i < planks; i++) {
    const tone = 0.85 + rnd() * 0.3;
    g.fillStyle = `rgb(${Math.round(150 * tone)},${Math.round(105 * tone)},${Math.round(66 * tone)})`;
    g.fillRect(0, i * h, 256, h);
    // Grain: thin wavy lines along the plank.
    for (let k = 0; k < 7; k++) {
      const y0 = i * h + rnd() * h;
      g.strokeStyle = `rgba(70,42,22,${0.15 + rnd() * 0.25})`;
      g.lineWidth = 0.6 + rnd();
      g.beginPath();
      for (let x = 0; x <= 256; x += 8) g.lineTo(x, y0 + Math.sin(x / 23 + k) * 1.6);
      g.stroke();
    }
    if (rnd() < 0.5) {
      g.fillStyle = "rgba(60,35,18,0.55)";
      g.beginPath();
      g.ellipse(rnd() * 256, i * h + h / 2, 5, 2.5, 0, 0, Math.PI * 2);
      g.fill();
    }
    // The seam between planks and the butt joint.
    g.fillStyle = "rgba(40,24,12,0.8)";
    g.fillRect(0, i * h, 256, 1.5);
    g.fillRect(((i * 97) % 256), i * h, 1.5, h);
  }
  woodMap = new THREE.CanvasTexture(c);
  woodMap.wrapS = woodMap.wrapT = THREE.RepeatWrapping;
  woodMap.colorSpace = THREE.SRGBColorSpace;
  woodMap.anisotropy = 4;
  return woodMap;
}

/** How many metres the texture covers (8 planks of 0,5 m). */
const WOOD_M = 4;

/** UVs from the position, face by face (the grain along a beam's length), so the planks keep their size anywhere. */
function woodUV(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  if (!n.attributes.normal) n.computeVertexNormals();
  const pos = n.attributes.position!;
  const nor = n.attributes.normal!;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [y, z] : [y, x];
    uv[2 * i] = u / WOOD_M;
    uv[2 * i + 1] = v / WOOD_M;
  }
  n.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return n;
}

/** A wood material: the plank texture over the colour (brown when there is no canvas, as in the tests). */
const woodMat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
  const map = woodTexture();
  return mat(map ? 0xffffff : c, { ...(map ? { map, color: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.6) } : {}), roughness: 0.8, ...o });
};

/**
 * A model's geometry at its true size, standing on y = 0, its front towards −z, with vertex colours (each part of a
 * composite its own; `plain` paints it all white, for a recoloured copy whose material carries the colour).
 */
function geometryOf(d: ModelDef, plain = false): THREE.BufferGeometry {
  // Wood: white under its wood material (the grain and the model's colour come from it, woodMat).
  if (d.parts && d.wood) return woodUV(mergeGeometries(d.parts.map(([cx, cy, cz, sx, sy, sz]) => paint(box(cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2), 0xffffff))));
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
  /** The instances that move (wandering animals): their herd and index in it. */
  readonly movers: readonly { readonly herd: AnimalHerd; readonly index: number; readonly it: S1Layout["instances"][number] }[];
  /** Every animal, jointed (domain/animal-body.ts): its herd, index and instance; posed each frame by the scene. */
  readonly animals: readonly { readonly herd: AnimalHerd; readonly index: number; readonly it: S1Layout["instances"][number] }[];
  readonly herds: readonly AnimalHerd[];
  /** Bulk change: show/hide or recolour every model of a category (or of one group of it). */
  style(category: Category, o: { visible?: boolean; color?: number; group?: string }): void;
}

export function buildS1Scene(L: S1Layout): S1Scene {
  const root = new THREE.Group();
  // The ground: ice caps (snow over blue sea ice, 2,3 m thick plates) and the land island (tundra), merged by kind.
  const ice: THREE.BufferGeometry[] = [];
  const snow: THREE.BufferGeometry[] = [];
  const land: THREE.BufferGeometry[] = [];
  const decks: THREE.BufferGeometry[] = [];
  const thresholds: THREE.BufferGeometry[] = [];
  const baseDeck: THREE.BufferGeometry[] = [];
  const hull: THREE.BufferGeometry[] = [];
  for (const f of L.world.floors) {
    // Sea ice floats with about a tenth above the water (density ~0,9): 2,3 m of ice under 25 cm of freeboard, the top
    // 30 cm of it snow (docs/design/santuario1.md §Casquetes).
    if (f.area.startsWith("hielo:")) {
      snow.push(box(f.x0, f.x1, -0.3, 0, f.z0, f.z1));
      ice.push(box(f.x0, f.x1, -2.3, -0.3, f.z0, f.z1));
    }
    else if (f.area.startsWith("tierra:")) land.push(box(f.x0, f.x1, -3, 0, f.z0, f.z1));
    else if (f.area.startsWith("base:")) continue; // drawn round below
    else if (f.y === 0 && f.id.endsWith("rellano-alfombras")) {
      // A tree's base at sea and its jetty (Berón 2026-11-21: «una base negra»): a dark deck on a black hull.
      baseDeck.push(box(f.x0, f.x1, -0.12, 0, f.z0, f.z1));
      hull.push(box(f.x0, f.x1, -BASE.hull, -0.12, f.z0, f.z1));
    }
    else if (f.id.endsWith("rellano-alfombras")) thresholds.push(box(f.x0, f.x1, f.y - 0.6, f.y - 0.01, f.z0, f.z1));
    else if (f.id.endsWith("umbral") || f.id.includes("umbral-suelo")) thresholds.push(box(f.x0, f.x1, f.y - 0.3, f.y - 0.01, f.z0, f.z1));
    else if (f.area.endsWith(":techo") || f.area.includes(":punta-")) decks.push(box(f.x0, f.x1, f.y - 0.5, f.y - 0.01, f.z0, f.z1));
  }
  const add = (geos: THREE.BufferGeometry[], m: THREE.Material, name: string) => {
    if (!geos.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(geos), m);
    mesh.name = name;
    root.add(mesh);
  };
  add(snow, mat(0xf3f7fa, { roughness: 0.6 }), "nieve");
  add(ice, mat(0x9fcbe0, { roughness: 0.2 }), "hielo");
  add(land, mat(0x7d8460), "tierra");
  add(thresholds, mat(0x8fa2ad), "umbrales");
  const roundDeck: THREE.BufferGeometry[] = [];
  const roundHull: THREE.BufferGeometry[] = [];
  // The trees' bases: a round black hull (BASE.sides sides) with the trunk's square hole, its deck a shade lighter.
  for (const t of L.towers) {
    const cx = (t.base.x0 + t.base.x1) / 2;
    const cz = (t.base.z0 + t.base.z1) / 2;
    const ring = new THREE.Shape();
    for (let i = 0; i <= BASE.sides; i++) {
      const a = (i / BASE.sides) * Math.PI * 2;
      const p = [Math.cos(a) * BASE.r, Math.sin(a) * BASE.r] as const;
      if (i === 0) ring.moveTo(p[0], p[1]);
      else ring.lineTo(p[0], p[1]);
    }
    const oh = TRUNK_HALF + TREE.wall.value;
    const hole = new THREE.Path();
    hole.moveTo(-oh, -oh);
    hole.lineTo(-oh, oh);
    hole.lineTo(oh, oh);
    hole.lineTo(oh, -oh);
    hole.lineTo(-oh, -oh);
    ring.holes.push(hole);
    const solid = (depth: number, top: number) => {
      const g = new THREE.ExtrudeGeometry(ring, { depth, bevelEnabled: false, curveSegments: 1 });
      // The shape is drawn in x, y and pushed along z: lay it flat (y up) and put its top at `top`.
      g.rotateX(Math.PI / 2);
      g.translate(cx, top, cz);
      return g;
    };
    roundDeck.push(solid(0.12, 0));
    roundHull.push(solid(BASE.hull - 0.12, -0.12));
  }
  add(roundDeck, mat(0x2a2d33, { roughness: 0.55, metalness: 0.2 }), "bases-cubierta");
  add(roundHull, mat(0x101114, { roughness: 0.4, metalness: 0.3 }), "bases-casco");
  add(baseDeck, mat(0x2a2d33, { roughness: 0.55, metalness: 0.2 }), "muelles-cubierta");
  add(hull, mat(0x101114, { roughness: 0.4, metalness: 0.3 }), "muelles-casco");
  add(decks, mat(0x6f8a5a), "puntas-y-techos");
  // Tower floors: wooden slabs straight out of the trunk, held by diagonal braces instead of table legs (Berón
  // 2026-11-21: «el piso debería ser levantado por columnas diagonales que las apoyen en el tronco… el suelo de los pisos
  // también debería ser marrón»); no railing (Berón: «los pisos no deben tener barrera»). The trees' frame: wooden posts.
  const slabs: THREE.BufferGeometry[] = [];
  const slabsRing: THREE.BufferGeometry[] = [];
  const frame: THREE.BufferGeometry[] = [];
  for (const t of L.towers) {
    for (const f of t.floors) slabs.push(woodUV(box(f.rect.x0, f.rect.x1, f.y - 0.6, f.y - 0.01, f.rect.z0, f.rect.z1)));
    for (const ring of t.rings) for (const r of ring.rects) slabsRing.push(woodUV(box(r.x0, r.x1, ring.y - 0.3, ring.y - 0.01, r.z0, r.z1)));
    for (const q of t.frame) frame.push(woodUV(box(q.x0, q.x1, q.y0, q.y1, q.z0, q.z1)));
    // The floors' diagonal braces from the trunk (layout.ts `braces`), 0,4 m square.
    for (const { foot, head } of t.braces) {
      const a = new THREE.Vector3(foot.x, foot.y, foot.z);
      const d = new THREE.Vector3(head.x, head.y, head.z).sub(a);
      const g = new THREE.BoxGeometry(0.4, d.length(), 0.4);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
      g.translate(a.x + d.x / 2, a.y + d.y / 2, a.z + d.z / 2);
      frame.push(woodUV(g));
    }
  }
  add(slabs, woodMat(0x9a6a40), "losas");
  add(slabsRing, woodMat(0x7a5232), "anillos");
  add(frame, woodMat(0x6b4526), "armazon");
  // Water: the trunks, their branches and columns (Cold Sanctuary's magic: water standing in a field) and the sea.
  const water: THREE.BufferGeometry[] = [];
  for (const w of L.world.waters) if (w.id !== "mar" && w.area !== AQUARIUM_AREA) water.push(box(w.x0, w.x1, w.yBottom, w.yTop, w.z0, w.z1));
  add(water, mat(0x2f8fbf, { transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }), "agua");
  // The whales' globe (site.ts AQUARIUM): one smooth round hourglass and globe of water (a lathe), no edges drawn
  // (Berón 2026-11-22: «parece tuviera un borde, ¿se puede quitar?»), and the embryo in its middle.
  {
    const A = AQUARIUM;
    const prof: THREE.Vector2[] = [];
    for (let y = -12; y < A.topY; y += 2) prof.push(new THREE.Vector2(Math.max(0.01, aquariumRadius(Math.max(0, y))), y));
    prof.push(new THREE.Vector2(0, A.topY));
    const g = new THREE.LatheGeometry(prof, 64);
    g.translate(A.x, 0, A.z);
    const globe = new THREE.Mesh(g, mat(0x3a9ad6, { transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
    globe.name = "globo-ballenas";
    globe.renderOrder = 2;
    root.add(globe);
    root.add(embryo(A.x, A.centreY, A.z, A.embryo, A.globeR));
  }

  add(L.walls.map((s) => box(s.x0, s.x1, s.y0, s.y1, s.z0, s.z1)), mat(0x8fd8ff, { transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false }), "acrilico");
  // Matte (Lambert): seen from just over it, swimming, a glossy plane at a grazing angle turns as white as the sky
  // (Berón 2026-11-20: «en primera persona… oculta el agua»).
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshLambertMaterial({ color: 0x1d4f6b, side: THREE.DoubleSide }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WATER_Y;
  sea.name = "mar";
  root.add(sea);

  // The catalogue's instances: one InstancedMesh per model (people are drawn by the scene as figures).
  const meshes = new Map<string, THREE.InstancedMesh>();
  const movers: { herd: AnimalHerd; index: number; it: S1Layout["instances"][number] }[] = [];
  const animals: { herd: AnimalHerd; index: number; it: S1Layout["instances"][number] }[] = [];
  const herds: AnimalHerd[] = [];
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
    if (AnimalHerd.has(d)) {
      // Animals: jointed cube bodies, one InstancedMesh per body part (animal-bodies.ts).
      const herd = new AnimalHerd(d, list.length, tint);
      list.forEach((it, n) => {
        herd.pose(n, it.x, it.y, it.z, it.rot, n * 0.37, false, it.scale ?? 1);
        animals.push({ herd, index: n, it });
        if (it.wander) movers.push({ herd, index: n, it });
      });
      herd.commit();
      herds.push(herd);
      for (const m of herd.meshes) root.add(m);
      continue;
    }
    const gk = `${d.id}|${tint !== undefined}`;
    const geo = geos.get(gk) ?? geometryOf(d, tint !== undefined);
    geos.set(gk, geo);
    const material = d.glow ? new THREE.MeshBasicMaterial({ color: tint ?? 0xffffff, vertexColors: true }) : d.wood ? woodMat(tint ?? d.color, { vertexColors: true }) : mat(tint ?? 0xffffff, { vertexColors: true });
    const mesh = new THREE.InstancedMesh(geo, material, list.length);
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
    movers,
    animals,
    herds,
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

/**
 * The embryo in the whales' globe (Berón 2026-11-22: «el globo de agua es como un vientre donde se está formando un
 * bebé»): curled like a foetus of some 20 weeks, `size` m from head to rump, its cord out to the placenta on the
 * globe's wall; it glows a little and its heart beats (about 140 a minute, as a foetus's). Drawn from spheres and tubes,
 * ours.
 */
function embryo(x: number, y: number, z: number, size: number, wall: number): THREE.Object3D {
  const g = new THREE.Group();
  g.name = "embrion";
  const skin = new THREE.MeshStandardMaterial({ color: 0xf1b9a8, emissive: 0x5a2219, emissiveIntensity: 0.35, roughness: 0.55, transparent: true, opacity: 0.95 });
  const ball = (r: number, px: number, py: number, pz: number, sx = 1, sy = 1, sz = 1, m: THREE.Material = skin) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), m);
    b.position.set(px, py, pz);
    b.scale.set(sx, sy, sz);
    g.add(b);
    return b;
  };
  const S = size;
  // The back's curl: spheres along a C, the head at its top bowed onto the chest.
  const curl = 0.24 * S;
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const a = (110 - 230 * t) * (Math.PI / 180);
    const r = (0.15 - 0.06 * t) * S;
    ball(r, Math.cos(a) * curl * 0.9, Math.sin(a) * curl, 0);
  }
  ball(0.22 * S, 0.12 * S, 0.3 * S, 0, 1, 0.95, 0.9);
  // Arms folded to the face, legs folded to the belly.
  const limb = (pts: [number, number, number][], r: number) => {
    const c = new THREE.CatmullRomCurve3(pts.map(([a, b, c]) => new THREE.Vector3(a * S, b * S, c * S)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, r * S, 10, false), skin));
    ball(r * 1.5 * S, pts[pts.length - 1]![0] * S, pts[pts.length - 1]![1] * S, pts[pts.length - 1]![2] * S);
  };
  for (const side of [-1, 1]) {
    limb([[0.05, 0.12, side * 0.1], [0.2, 0.06, side * 0.14], [0.27, 0.18, side * 0.08]], 0.035);
    limb([[-0.12, -0.2, side * 0.09], [0.12, -0.22, side * 0.15], [0.16, -0.05, side * 0.1]], 0.05);
  }
  // The cord from the belly to the placenta on the globe's wall.
  const belly = new THREE.Vector3(0.12 * S, -0.06 * S, 0);
  const wallAt = new THREE.Vector3(wall * 0.92, -0.25 * wall, 0.2 * wall);
  const cord = new THREE.CatmullRomCurve3([belly, new THREE.Vector3(0.35 * S, -0.3 * S, 0.2 * S), new THREE.Vector3(wall * 0.55, -0.1 * wall, -0.1 * wall), wallAt]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(cord, 64, 0.022 * S, 10, false), new THREE.MeshStandardMaterial({ color: 0xd9a3b6, emissive: 0x40202c, emissiveIntensity: 0.3, roughness: 0.5 })));
  const placenta = ball(0.2 * S, wallAt.x, wallAt.y, wallAt.z, 0.35, 1, 1, new THREE.MeshStandardMaterial({ color: 0xa8434a, emissive: 0x3a0e12, emissiveIntensity: 0.3, roughness: 0.7 }));
  placenta.lookAt(0, 0, 0);
  // Its heartbeat: a soft double pulse, ~140 a minute.
  const body = new THREE.Group();
  body.add(...g.children.splice(0, g.children.length));
  g.add(body);
  // (onBeforeRender fires for meshes only: the head's drives the whole body.)
  body.children[0]!.onBeforeRender = () => {
    const t = (performance.now() / 1000) * (140 / 60);
    const f = t - Math.floor(t);
    const pulse = Math.exp(-((f - 0.1) ** 2) / 0.002) + 0.6 * Math.exp(-((f - 0.3) ** 2) / 0.002);
    body.scale.setScalar(1 + 0.012 * pulse);
  };
  g.position.set(x, y, z);
  return g;
}
