import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { AQUARIUM_AREA, type CrownShape, type S1Layout } from "@modules/sanctuary-one/data/layout";
import { CROWN, TRUNK_OUT } from "@modules/sanctuary-one/data/castillos";
import { model, type Category, type ModelDef } from "@modules/sanctuary-one/data/catalog";
import { BASE, WATER_Y } from "@modules/sanctuary-one/data/site";
import { GLOBE, globeSkin } from "@modules/sanctuary-one/data/globo";
import { EGG, pulpoAt, pulpoBody } from "@modules/sanctuary-one/domain/pulpo";
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

/** A square band round (cx, cz) between two half-widths, as four boxes from y0 to y1. */
function band(cx: number, cz: number, a: number, b: number, y0: number, y1: number): THREE.BufferGeometry[] {
  return [
    box(cx - b, cx + b, y0, y1, cz + a, cz + b),
    box(cx - b, cx + b, y0, y1, cz - b, cz - a),
    box(cx + a, cx + b, y0, y1, cz - a, cz + a),
    box(cx - b, cx - a, y0, y1, cz - a, cz + a),
  ];
}

/**
 * The Residencia's crown (castillos.ts, Berón 2026-11-24, after the photos of a restaurant's play structure): the
 * wooden square round the trunk's top, the garden along its edge, the pillow ring's mattress with its pillows, and the
 * four castles: decks in their team's colour, red posts, see-through rail panels, the towers' roofs and the yellow
 * tube slides down to the ring. The treasures are named meshes (`tesoro-<team>`) the game moves.
 */
function crown(cx: number, cz: number, c: CrownShape): THREE.Group {
  const g = new THREE.Group();
  g.name = "cima-residencia";
  const put = (geos: THREE.BufferGeometry[], m: THREE.Material, name: string) => {
    if (!geos.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(geos), m);
    mesh.name = name;
    g.add(mesh);
  };
  const y = c.y;
  put(band(cx, cz, TRUNK_OUT, CROWN.castles, y - 0.6, y - 0.02).map(woodUV), woodMat(0x9a6a40), "cima-losa");
  put(band(cx, cz, CROWN.castles, CROWN.half, y - 0.6, y + 0.05), mat(0x5f8a46), "cima-jardin");
  put(band(cx, cz, CROWN.walk, CROWN.arena, y, y + 0.25), mat(0x3f6fb5, { roughness: 0.95 }), "ring-colchon");
  // The pillows: a few hundred, scattered on the mattress (fixed by a hash, so every visit is the same).
  const pillows: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 260; i++) {
    const h = (k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
    const side = i % 4;
    const along = (h(1) * 2 - 1) * (CROWN.arena - 1);
    const out = CROWN.walk + 1 + h(2) * (CROWN.arena - CROWN.walk - 2);
    const [px, pz] = side === 0 ? [along, out] : side === 1 ? [along, -out] : side === 2 ? [out, along] : [-out, along];
    const q = box(-0.35, 0.35, 0, 0.18, -0.25, 0.25);
    q.rotateY(h(3) * Math.PI);
    q.translate(cx + px, y + 0.25, cz + pz);
    pillows.push(paint(q, [0xf4f1ea, 0xf2c6d2, 0xc9e3f2, 0xf6e6a8][i % 4]!));
  }
  put(pillows, mat(0xffffff, { vertexColors: true, roughness: 0.95 }), "almohadas");
  const posts: THREE.BufferGeometry[] = [];
  const roofs: THREE.BufferGeometry[] = [];
  const slides: THREE.BufferGeometry[] = [];
  for (const k of c.castles) {
    const deck: THREE.BufferGeometry[] = [];
    for (const d of k.decks) deck.push(box(d.x0, d.x1, d.y - (d.kind === "escalon" ? 0.12 : 0.25), d.y - 0.01, d.z0, d.z1));
    put(deck, mat(new THREE.Color(k.color).lerp(new THREE.Color(0xffffff), 0.25).getHex(), { roughness: 0.6 }), `castillo-${k.team}`);
    put(k.rails.map((r) => box(r.x0, r.x1, r.y0, r.y1, r.z0, r.z1)), mat(k.color, { transparent: true, opacity: 0.45, roughness: 0.3, depthWrite: false }), `barandas-${k.team}`);
    for (const p of k.columns) {
      const cyl = new THREE.CylinderGeometry(0.16, 0.16, p.y1 - p.y0, 10);
      cyl.translate((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2);
      posts.push(cyl);
    }
    // The tower's roof: a four-sided cone over its posts.
    const t = k.tower;
    const r = new THREE.ConeGeometry(Math.hypot(t.x1 - t.x0, t.z1 - t.z0) / 2, 3, 4);
    r.rotateY(Math.PI / 4);
    r.translate((t.x0 + t.x1) / 2, t.y + 2.6 + 1.5, (t.z0 + t.z1) / 2);
    roofs.push(paint(r, k.color));
    // The slides: a tube along each path, open on top (a chute) for the run-out.
    for (const sl of k.slides) {
      const curve = new THREE.CatmullRomCurve3(sl.map((p) => new THREE.Vector3(p.x, p.y + 0.5, p.z)));
      slides.push(new THREE.TubeGeometry(curve, Math.max(24, sl.length * 6), 0.6, 12, false));
    }
    const chest = new THREE.Group();
    chest.name = `tesoro-${k.team}`;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.6), mat(0x8a5a2b));
    body.position.y = 0.28;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.18, 0.64), mat(0xd9a520, { metalness: 0.6, roughness: 0.35 }));
    lid.position.y = 0.64;
    chest.add(body, lid);
    chest.position.set(k.treasure.x, k.treasure.y, k.treasure.z);
    chest.userData = { team: k.team, home: { ...k.treasure } };
    g.add(chest);
  }
  put(posts, mat(0xc62828, { roughness: 0.5 }), "castillos-postes");
  put(roofs, mat(0xffffff, { vertexColors: true, roughness: 0.6 }), "castillos-tejados");
  put(slides, mat(0xf2c230, { roughness: 0.35, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), "toboganes");
  return g;
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
    else if (f.area.startsWith("base:") || (f.y === 0 && f.id.endsWith("rellano-alfombras"))) {
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

  add(baseDeck, mat(0x2a2d33, { roughness: 0.55, metalness: 0.2 }), "bases-cubierta");
  add(hull, mat(0x101114, { roughness: 0.4, metalness: 0.3 }), "bases-casco");
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
  for (const t of L.towers) if (t.cima) root.add(crown(t.x, t.z, t.cima));
  add(slabs, woodMat(0x9a6a40), "losas");
  add(slabsRing, woodMat(0x7a5232), "anillos");
  add(frame, woodMat(0x6b4526), "armazon");
  // Water: the trunks, their branches and columns (Cold Sanctuary's magic: water standing in a field) and the sea.
  const water: THREE.BufferGeometry[] = [];
  for (const w of L.world.waters) if (w.id !== "mar" && w.area !== AQUARIUM_AREA) water.push(box(w.x0, w.x1, w.yBottom, w.yTop, w.z0, w.z1));
  add(water, mat(0x2f8fbf, { transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }), "agua");
  // The whales' globe (data/globo.ts): its outer skin, cell by cell (pixelated, Berón 2026-11-22), one mesh of the
  // faces between water and air; deep blue (a great natural water); and the embryo in its belly.
  {
    const pos = globeSkin();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const globe = new THREE.Mesh(g, mat(0x14507e, { transparent: true, opacity: 0.38, roughness: 0.1, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
    globe.name = "globo-ballenas";
    globe.renderOrder = 2;
    root.add(globe);
    root.add(embryo(GLOBE.x, GLOBE.bellyY, GLOBE.z, GLOBE.embryo));
  }

  add(L.walls.map((s) => box(s.x0, s.x1, s.y0, s.y1, s.z0, s.z1)), mat(0x8fd8ff, { transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false }), "acrilico");
  // Matte (Lambert): seen from just over it, swimming, a glossy plane at a grazing angle turns as white as the sky
  // (Berón 2026-11-20: «en primera persona… oculta el agua»).
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshLambertMaterial({ color: 0x1d4f6b, side: THREE.FrontSide }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = WATER_Y;
  sea.name = "mar";
  root.add(sea);
  // Its surface seen from below (Berón 2026-11-22: «si miro hacia arriba… debería ser posible ver lo que hace fuera»):
  // a bright, see-through ceiling, so the sky and what stands over the water show through it, fainter with depth.
  const underside = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshBasicMaterial({ color: 0xcdeef5, transparent: true, opacity: 0.28, side: THREE.BackSide, depthWrite: false }));
  underside.rotation.x = -Math.PI / 2;
  underside.position.y = WATER_Y;
  underside.name = "mar-desde-abajo";
  root.add(underside);

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

/** The octopus egg's clock (sanctuary-one.ts advances it every frame, seen or not, by the settings' duration). */
export const PULPO = { k: 0 };

/**
 * The octopus egg in the whales' globe, developing until it hatches (domain/pulpo.ts: Naef's stages, real
 * proportions; Berón 2026-11-24), and then growing up in the globe to the adult whose open arms span 66 % of it (Berón
 * 2026-11-28). `size` m is the hatchling's length: a third of the globe across its belly (GLOBE.embryo).
 * Built once; each frame only moves, scales and tints its parts, so it costs a few draw calls. Spheres and tubes, ours.
 */
function embryo(x: number, y: number, z: number, size: number): THREE.Object3D {
  const g = new THREE.Group();
  g.name = "embrion";
  const u = size;
  const fade: THREE.Material[] = [];
  const M = (o: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.45, transparent: true, ...o });
    fade.push(m);
    return m;
  };
  // Blue and green tones, glowing a little (Berón 2026-11-22).
  const skin = M({ color: 0x5fc2b8, emissive: 0x0d4a5e, emissiveIntensity: 0.6, opacity: 0.93 });
  const yolkM = M({ color: 0xbfe6a0, emissive: 0x3a5a1f, emissiveIntensity: 0.45, roughness: 0.6, opacity: 0.97 });
  const capM = M({ color: 0xa8e8c8, emissive: 0x1f5a4a, emissiveIntensity: 0.6, opacity: 0.95 });
  const eyeM = M({ color: 0xcfe8f0, emissive: 0x1a3f5a, emissiveIntensity: 0.4, roughness: 0.2, opacity: 1 });
  const dotM = M({ color: 0xb0452a, emissive: 0x4a1408, emissiveIntensity: 0.5, opacity: 1 });
  const shellM = M({ color: 0xd8f4ff, opacity: 0.16, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const ball = (m: THREE.Material, parent: THREE.Object3D) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), m);
    parent.add(b);
    return b;
  };
  // The chorion: the egg's clear shell, long axis up.
  const shell = ball(shellM, g);
  shell.renderOrder = 2;
  // It drives the whole octopus each frame (onBeforeRender): drawn even when the egg is off screen and only the grown arms show.
  shell.frustumCulled = false;
  shell.scale.set((EGG.width / 2) * u, (EGG.length / 2) * u, (EGG.width / 2) * u);
  // Inside: the yolk and the embryo on it (`whole` turns over in the second inversion and swims off at hatching).
  const whole = new THREE.Group();
  g.add(whole);
  const yolk = ball(yolkM, whole);
  // The embryo's frame: its origin where it touches the yolk, +y away from it (arms, head, then the mantle).
  const emb = new THREE.Group();
  whole.add(emb);
  const cap = ball(capM, emb);
  const body = new THREE.Group();
  emb.add(body);
  const mantle = ball(skin, body);
  const head = ball(skin, body);
  const eyes = [-1, 1].map((side) => {
    const e = ball(eyeM, body);
    e.userData.side = side;
    return e;
  });
  const dots = Array.from({ length: 24 }, (_, i) => {
    const d = ball(dotM, mantle);
    const a = i * 2.39996;
    const h = -0.75 + ((i * 37) % 17) / 11;
    const r = Math.sqrt(Math.max(0, 1 - h * h));
    d.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    d.scale.setScalar(0.045);
    return d;
  });
  // Eight arms round the mouth: each a tapering cone from its root on the head down (unit long, scaled), hung from a
  // pivot that opens it outwards (`splay`): down along the body in the egg, spread wide on the adult.
  const armGeo = new THREE.CylinderGeometry(1, 0.18, 1, 8, 1).translate(0, -0.5, 0);
  const arms = Array.from({ length: 8 }, (_, k) => {
    const pivot = new THREE.Group();
    pivot.userData.a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const arm = new THREE.Mesh(armGeo, skin);
    pivot.add(arm);
    body.add(pivot);
    return pivot;
  });
  const dark = new THREE.Color(0x0d1f2a);
  const clear = new THREE.Color(0xcfe8f0);
  shell.onBeforeRender = () => {
    const t = performance.now() / 1000;
    const p = pulpoAt(PULPO.k);
    const on = p.body > 0.002;
    body.visible = on;
    // The body, from the mouth outwards: arms, head, mantle (pulpoBody: the same measures the tests check).
    const m = pulpoBody(p);
    const armLen = Math.max(1e-3, m.armLen * u);
    const headH = Math.max(1e-3, m.headH * u);
    const mantleLen = Math.max(1e-3, m.mantleLen * u);
    const mR = Math.max(1e-3, m.mR * u);
    const hR = Math.max(1e-3, m.hR * u);
    const thick = Math.max(1e-3, p.armThick * u);
    // Their roots: as high as the hanging arms are long (so the hatchling's arm tips touch the yolk), lower as they open.
    const rootY = armLen * Math.cos(p.splay);
    arms.forEach((a, k) => {
      const ang = a.userData.a as number;
      a.position.set(Math.cos(ang) * m.rootR * u, rootY, Math.sin(ang) * m.rootR * u);
      a.rotation.set(0, -ang, p.splay + p.beat * Math.sin(t * 1.3 + k) * (0.08 + 0.1 * p.grow));
      a.children[0]!.scale.set(thick, armLen, thick);
    });
    head.scale.set(hR, headH / 2, hR);
    head.position.y = rootY + headH / 2;
    const pulse = 1 + p.beat * 0.07 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 0.9));
    mantle.scale.set(mR * pulse, (mantleLen / 2) * (2 - pulse), mR * pulse);
    mantle.position.y = rootY + headH * 0.9 + mantleLen / 2;
    for (const e of eyes) {
      e.scale.setScalar(Math.max(1e-3, (p.eyes * u) / 2));
      e.position.set(e.userData.side * hR * 0.85, head.position.y + headH * 0.05, hR * 0.45);
      (e.material as THREE.MeshStandardMaterial).color.copy(clear).lerp(dark, p.eyeDark);
    }
    dots.forEach((d, i) => (d.visible = i < Math.round(p.chromato * dots.length)));
    const len = on ? rootY + headH * 0.9 + mantleLen : 0;
    // The blastodisc: a flattened cap where the embryo touches the yolk.
    cap.visible = p.cap > 0.001;
    cap.scale.set(p.cap * u * 0.5, p.cap * u * 0.08, p.cap * u * 0.5);
    // The yolk, along the egg; the embryo at the angle `pole` round it (first inversion), facing away from it.
    const yl = Math.max(1e-3, p.yolk * u);
    const yw = Math.max(1e-3, Math.min(p.yolkW * u, yl * 0.9));
    yolk.scale.set(yw / 2, yl / 2, yw / 2);
    emb.position.set(0, (yl / 2) * Math.cos(p.pole), (yw / 2) * Math.sin(p.pole));
    emb.rotation.x = p.pole;
    // Centred in the egg; turned over in the second inversion, made to fit the egg while it turns.
    const span = yl + len;
    const wide = Math.max(yw, 2 * mR);
    const shift = -(len / 2) * Math.cos(p.pole);
    yolk.position.y = shift;
    emb.position.y += shift;
    const c = Math.abs(Math.cos(p.flip));
    const sn = Math.abs(Math.sin(p.flip));
    const fit = Math.min(1, (EGG.length * u * 0.95) / Math.max(1e-6, span * c + wide * sn), (EGG.width * u * 0.95 * 1.6) / Math.max(1e-6, span * sn + wide * c));
    whole.rotation.x = p.flip;
    // Hatched: the shell fades and it grows up in the globe, centred on its arms' roots (where they open), bobbing
    // slowly; the adult leaves at the end and a new egg fades in.
    const fitE = fit + (1 - fit) * (1 - p.chorion);
    whole.scale.setScalar(fitE);
    const hub = (yl / 2 - len / 2 + rootY) * fitE;
    whole.position.y = -hub * Math.min(1, p.grow * 8) + p.grow * u * 0.04 * Math.sin(t * 0.5);
    yolk.visible = p.grow < 0.01;
    const appear = Math.min(1, PULPO.k / 0.01);
    const out = 1 - p.leave;
    for (const m of fade) (m as THREE.MeshStandardMaterial).opacity = (m === shellM ? 0.16 * p.chorion : m === skin ? 0.93 : 1) * appear * (m === shellM ? 1 : out);
  };
  g.position.set(x, y, z);
  return g;
}
