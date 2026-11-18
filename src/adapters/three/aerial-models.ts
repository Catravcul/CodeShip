import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Block, Prop, S3Layout } from "@modules/aerial-sanctuary/data/layout";
import type { Floor, Water } from "@modules/aerial-sanctuary/domain/walk";
import { CRAFT, DRAGON, ELECTRON, FALCON9_CREW, S92, TURBINE } from "@modules/aerial-sanctuary/data/facts";
import { textSign } from "./interior/sign";
import { interiorFloor } from "./s3-fixtures";

/**
 * Procedural models of sanctuary 3 (docs/design/santuario3-escena.md), at true size: the walls, floors and water
 * of the layout merged by look (few draw calls on a phone), and the machines and vehicles built from their data:
 * the Electron from Cold Sanctuary's lathe profile, the Falcon 9 with its Crew Dragon, the E-33 turbines with their
 * black blade, the S-92, the flying carpet, the centrifuge, the trees' water trunks and the lift's glass shaft.
 */
const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.05, ...o });

const LOOK: Record<string, THREE.Material> = {
  acrilico: mat(0x8fd8ff, { transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false }),
  pretil: mat(0x8c9196),
  pared: mat(0xd9dde2),
  tejado: mat(0x9aa3ab),
  hormigon: mat(0x9c9c96),
  deposito: mat(0xc4c8cc),
  escudo: mat(0x8f8f8a),
  cubeta: mat(0x8f8f8a),
  "torre-umbilical": mat(0xb43a2a),
  cohete: mat(0xffffff, { transparent: true, opacity: 0 }),
  polvorin: mat(0x8a8a84),
  torre: mat(0xeeeeee),
  panel: mat(0x22406e, { metalness: 0.3, roughness: 0.4 }),
  bateria: mat(0xe6e6e6),
  plataforma: mat(0x6b5f55),
  columna: mat(0x5d534a),
  "torre-acceso": mat(0x55585c),
  kiosco: mat(0x0b2a36),
  maqueta: mat(0xe9ecef),
  "maqueta-techo": mat(0xe9ecef),
  maquina: mat(0x6f7c86),
  gondola: mat(0x2f6f9f),
  consola: mat(0x50565e),
  pantalla: mat(0x1d5a70, { emissive: 0x0d3040 }),
  cinta: mat(0x30343a),
  mesa: mat(0x8a6a48),
  camilla: mat(0xd9e6ef),
};

const FLOOR_LOOK: Record<string, number> = { entrenamiento: 0x7f9a62, lanzadera: 0xd2d7dc, parque: 0xd2d7dc, muelle: 0xc7ccd1, plataforma: 0x77706a };

function boxGeo(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(Math.max(0.01, x1 - x0), Math.max(0.01, y1 - y0), Math.max(0.01, z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/** All the boxes of the layout, merged by look. */
export function buildBlocks(blocks: readonly Block[]): THREE.Group {
  const g = new THREE.Group();
  const by = new Map<string, THREE.BufferGeometry[]>();
  for (const b of blocks) {
    const list = by.get(b.look) ?? [];
    list.push(boxGeo(b.x0, b.x1, b.y0, b.y1, b.z0, b.z1));
    by.set(b.look, list);
  }
  for (const [look, geos] of by) {
    if (look === "cohete" || look === "oculto") continue;
    const m = new THREE.Mesh(mergeGeometries(geos), LOOK[look] ?? mat(0xaaaaaa));
    m.name = `bloques-${look}`;
    g.add(m);
  }
  return g;
}

/** Floors as thin slabs (the island's grass, the caps' ice-white decks), merged by island. */
export function buildFloors(floors: readonly Floor[]): THREE.Group {
  const g = new THREE.Group();
  const by = new Map<number, THREE.BufferGeometry[]>();
  for (const f of floors) {
    const isl = f.area.split(":")[0]!;
    const c = f.area.includes("helipuerto") ? 0x3a3f44 : (interiorFloor(f.area) ?? FLOOR_LOOK[isl] ?? 0xb9c4cc);
    const list = by.get(c) ?? [];
    list.push(boxGeo(f.x0, f.x1, f.y - 0.25, f.y - 0.01, f.z0, f.z1));
    by.set(c, list);
  }
  for (const [c, geos] of by) g.add(new THREE.Mesh(mergeGeometries(geos), mat(c)));
  return g;
}

/** Water that is not the sea: the pool and the trees' trunks, branches and columns. */
export function buildWater(waters: readonly Water[]): THREE.Group {
  const g = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  for (const w of waters) if (w.id !== "mar") geos.push(boxGeo(w.x0, w.x1, w.yBottom, w.yTop, w.z0, w.z1));
  if (geos.length) {
    const m = new THREE.Mesh(mergeGeometries(geos), mat(0x2f8fbf, { transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }));
    m.name = "agua";
    g.add(m);
  }
  return g;
}

export function buildSea(holes: readonly { x0: number; x1: number; z0: number; z1: number }[] = []): THREE.Mesh {
  // The pools on the islands go below the sea's level: the sea has a hole over each, or it would hide their bottoms
  // (the NBL's mock-ups 12 m down). The shape is drawn in (x, −z) and laid flat, so −z on the plane is +z in the world.
  const shape = new THREE.Shape([new THREE.Vector2(-4500, -4500), new THREE.Vector2(4500, -4500), new THREE.Vector2(4500, 4500), new THREE.Vector2(-4500, 4500)]);
  for (const h of holes) shape.holes.push(new THREE.Path([new THREE.Vector2(h.x0, -h.z0), new THREE.Vector2(h.x0, -h.z1), new THREE.Vector2(h.x1, -h.z1), new THREE.Vector2(h.x1, -h.z0)]));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat(0x1f5f80, { roughness: 0.35, metalness: 0.1 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.6;
  m.name = "mar";
  return m;
}

/** A surface of revolution (Cold Sanctuary's RocketModel.Lathe): profile (radius, height) from the bottom axis up. */
function lathe(profile: readonly [number, number][], color: number, sides = 20): THREE.Mesh {
  return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), sides), mat(color, { flatShading: true }));
}

/** The Electron (18 m, Ø 1,2 m): Cold Sanctuary's RocketModel profile, nine nozzles and its stages. Fins left out: the photos show none. */
export function electron(): THREE.Group {
  const g = new THREE.Group();
  const r = ELECTRON.diameterM.value / 2;
  const H = ELECTRON.heightM.value;
  const bell: [number, number][] = [[0.0, 0.12], [0.2, 0], [0.2, 0.06], [0.09, 0.6], [0.13, 0.72], [0, 0.72]];
  for (let i = 0; i < 9; i++) {
    const n = lathe(bell, 0x7a7a80, 10);
    if (i) n.position.set(Math.cos(i * 0.785) * 0.4, 0, Math.sin(i * 0.785) * 0.4);
    g.add(n);
  }
  g.add(lathe([[0, 0.6], [r + 0.05, 0.6], [r, 1.1], [0, 1.1]], 0x242428));
  g.add(lathe([[0, 1.1], [r, 1.1], [r, 12], [0, 12]], 0x1b1b1e));
  g.add(lathe([[0, 12], [r + 0.02, 12], [r - 0.06, 12.6], [0, 12.6]], 0x111114));
  g.add(lathe([[0, 12.6], [r - 0.06, 12.6], [r - 0.06, 14.4], [0, 14.4]], 0x1b1b1e));
  g.add(lathe([[0, 14.4], [r, 14.4], [r, 15.2], [r * 0.9, 15.9], [r * 0.68, 16.6], [r * 0.38, 17.2], [r * 0.16, 17.6], [0, 17.6]], 0xe8e8e4));
  g.add(lathe([[0, 17.6], [r * 0.16, 17.6], [0, H]], 0xb02a20));
  g.name = "Electron";
  return g;
}

/** Falcon 9 Block 5 (70 m, Ø 3,7 m) with Crew Dragon on top (8,1 m with the trunk, Ø 4 m). */
export function falcon9(): THREE.Group {
  const g = new THREE.Group();
  const r = FALCON9_CREW.diameterM.value / 2;
  const total = FALCON9_CREW.heightM.value;
  const dragonH = DRAGON.heightM.value;
  const body = total - dragonH;
  g.add(lathe([[0, 0], [r, 0], [r, body * 0.68], [0, body * 0.68]], 0xf2f2f2));
  g.add(lathe([[0, body * 0.68], [r, body * 0.68], [r, body * 0.7], [0, body * 0.7]], 0x1e1e1e));
  g.add(lathe([[0, body * 0.7], [r, body * 0.7], [r, body], [0, body]], 0xf2f2f2));
  // Grid fins and the legs folded at the base.
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 0.2), mat(0x3a3a3a));
    const a = (i * Math.PI) / 2;
    fin.position.set(Math.cos(a) * (r + 0.6), body * 0.66, Math.sin(a) * (r + 0.6));
    fin.rotation.y = -a;
    g.add(fin);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.3), mat(0x222222));
    leg.position.set(Math.cos(a + 0.78) * (r + 0.1), 5, Math.sin(a + 0.78) * (r + 0.1));
    leg.rotation.y = -(a + 0.78);
    g.add(leg);
  }
  const dr = DRAGON.diameterM.value / 2;
  g.add(lathe([[0, body], [dr, body], [dr, body + 3.4], [0, body + 3.4]], 0xf4f4f4));
  g.add(lathe([[0, body + 3.4], [dr, body + 3.4], [dr * 0.95, body + 4.2], [dr * 0.6, body + 7.3], [dr * 0.3, body + dragonH], [0, body + dragonH]], 0xffffff));
  g.name = "Falcon 9";
  return g;
}

/** The crew access tower: a lattice with the access arm at the Dragon's hatch. */
function crewTower(): THREE.Group {
  const g = new THREE.Group();
  const steel = mat(0x5c6066);
  for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 77, 0.6), steel);
    leg.position.set(x, 38.5, z);
    g.add(leg);
  }
  for (let y = 4; y < 77; y += 7) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 6.6), steel);
    deck.position.y = y;
    g.add(deck);
  }
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.4, 6), mat(0x3d4247));
  arm.position.set(0, FALCON9_CREW.heightM.value - DRAGON.heightM.value + 3.5, -6.5);
  g.add(arm);
  return g;
}

function umbilical(): THREE.Group {
  const g = new THREE.Group();
  for (let k = 0; k < 11; k++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2, 1.8), mat(k % 2 ? 0xd9d9d6 : 0xb43a2a, { wireframe: true }));
    band.position.y = 1 + k * 2;
    g.add(band);
  }
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 5), mat(0x777777));
  arm.position.set(-2, 13, 2);
  arm.rotation.y = -Math.PI / 4;
  g.add(arm);
  return g;
}

/** An E-33 (Ross Island): a tower to 37 m, its nacelle and three blades of 16,5 m, one painted black (Smøla). */
export function turbine(): { group: THREE.Group; rotor: THREE.Group } {
  const t = TURBINE.value;
  const g = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.9, t.hubM, 12), mat(0xf2f2f2));
  tower.position.y = t.hubM / 2;
  g.add(tower);
  const nac = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), mat(0xf2f2f2));
  nac.scale.set(1, 0.9, 1.5);
  nac.position.set(0, t.hubM, 0);
  g.add(nac);
  const rotor = new THREE.Group();
  rotor.position.set(0, t.hubM, 2.6);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.3, t.rotorM / 2, 0.25), mat(i === 0 ? 0x111111 : 0xf2f2f2));
    blade.geometry.translate(0, t.rotorM / 4, 0);
    blade.rotation.z = (i * 2 * Math.PI) / 3;
    rotor.add(blade);
  }
  g.add(rotor);
  return { group: g, rotor };
}

/** The S-92 (20,88 m with the rotor, 4,70 m tall, rotor of 17,17 m): body, tail and a spinning main rotor. */
export function helicopter(): { group: THREE.Group; rotor: THREE.Group; seat: THREE.Object3D } {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 9, 6, 12), mat(0xe8eef2));
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 1.9, 0);
  g.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.4, 9), mat(0xd04a2a));
  stripe.position.set(0, 2.2, 0);
  g.add(stripe);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 7), mat(0xe8eef2));
  tail.position.set(0, 2.8, -8);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 1.4), mat(0xd04a2a));
  fin.position.set(0, 3.8, -11.2);
  g.add(fin);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 10), mat(0x222222));
    w.rotation.z = Math.PI / 2;
    w.position.set(s * 1.3, 0.35, 2);
    g.add(w);
  }
  const rotor = new THREE.Group();
  rotor.position.set(0, S92.heightM.value, 0);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, S92.rotorM.value), mat(0x2a2a2a));
    b.rotation.y = (i * Math.PI) / 4;
    rotor.add(b);
  }
  g.add(rotor);
  // Her seat by a window, facing forward (+z of the craft).
  const seat = new THREE.Object3D();
  seat.position.set(0.6, 2.4, 3.2);
  g.add(seat);
  g.name = "S-92";
  return { group: g, rotor, seat };
}

/** A flying carpet of Cold Sanctuary (fiction): a woven rug with a LED seam, and where she sits. */
export function carpet(): { group: THREE.Group; seat: THREE.Object3D } {
  const g = new THREE.Group();
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 192;
  const x = c.getContext("2d")!;
  x.fillStyle = "#7a1f2b";
  x.fillRect(0, 0, 128, 192);
  x.strokeStyle = "#e9b949";
  x.lineWidth = 8;
  x.strokeRect(10, 10, 108, 172);
  x.fillStyle = "#1f4f7a";
  for (let i = 0; i < 4; i++) x.fillRect(34, 30 + i * 36, 60, 18);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.07, 3.6), [mat(0x7a1f2b), mat(0x7a1f2b), mat(0xffffff, { map: tex }), mat(0x7a1f2b), mat(0x7a1f2b), mat(0x7a1f2b)]);
  rug.position.y = 0.035;
  g.add(rug);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.03, 3.66), mat(0x7fdcff, { emissive: 0x3fa8d0 }));
  seam.position.y = 0.02;
  g.add(seam);
  const seat = new THREE.Object3D();
  seat.position.set(0, 1.1, 0);
  g.add(seat);
  g.name = "Alfombra";
  return { group: g, seat };
}

function helideck(d: number): THREE.Group {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, 0.08, 32), mat(0x2f3439));
  g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(d / 2 - 1, 0.25, 4, 40), mat(0xffd23f));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);
  for (const [w, dd, x] of [[0.9, 6, -1.6], [0.9, 6, 1.6], [3.2, 0.9, 0]] as const) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, dd), mat(0xffffff));
    h.position.set(x, 0.07, 0);
    g.add(h);
  }
  return g;
}

function centrifuge(): { group: THREE.Group; arm: THREE.Group } {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.6, 4, 16), mat(0x6f7c86));
  hub.position.y = 2;
  g.add(hub);
  const arm = new THREE.Group();
  arm.position.y = 3;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 1), mat(0x9aa6ae));
  beam.position.x = 9;
  arm.add(beam);
  g.add(arm);
  return { group: g, arm };
}

function navMachine(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), mat(0x0b2a36));
  post.position.y = 0.55;
  g.add(post);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.06), mat(0x58d6ff, { emissive: 0x1f7fa0 }));
  screen.position.set(0, 1.3, 0.1);
  screen.rotation.x = -0.5;
  g.add(screen);
  return g;
}

export interface SceneParts {
  readonly root: THREE.Group;
  readonly rotors: THREE.Object3D[];
  readonly turbines: { group: THREE.Group; rotor: THREE.Group; x: number; z: number; label: string }[];
  readonly centrifugeArm?: THREE.Group;
  readonly cabs: Map<string, THREE.Mesh>;
}

/** Everything of the layout that is not a box: the props, the trees' shells and the signs over the areas. */
export function buildProps(L: S3Layout): SceneParts {
  const root = new THREE.Group();
  const rotors: THREE.Object3D[] = [];
  const turbines: SceneParts["turbines"] = [];
  const cabs = new Map<string, THREE.Mesh>();
  let centrifugeArm: THREE.Group | undefined;
  // Vehicles and machines with their own true size stay as they are; the rest is widened on the plan with its area (§2.4).
  const trueSize = new Set<Prop["kind"]>(["electron", "falcon9", "turbine", "tidal", "helideck", "lift-shaft", "tree"]);
  const at = (o: THREE.Object3D, p: Prop) => {
    o.position.set(p.x, p.y, p.z);
    if (p.rot) o.rotation.y = p.rot;
    if (p.plan && !trueSize.has(p.kind)) o.scale.set(p.plan, 1, p.plan);
    root.add(o);
    return o;
  };
  for (const p of L.props) {
    switch (p.kind) {
      case "electron":
        at(electron(), p);
        break;
      case "falcon9":
        at(falcon9(), p);
        break;
      case "crew-tower":
        at(crewTower(), p);
        break;
      case "umbilical":
        at(umbilical(), p);
        break;
      case "turbine": {
        const t = turbine();
        at(t.group, p);
        t.group.lookAt(p.x + 10, p.y, p.z);
        turbines.push({ ...t, x: p.x, z: p.z, label: p.label ?? "" });
        break;
      }
      case "tidal": {
        const r = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.3, 6, 24), mat(0xf0c020));
        at(r, p);
        break;
      }
      case "solar-table": {
        const m = new THREE.Mesh(new THREE.BoxGeometry(24, 3, 0.12), mat(p.on ? 0x1d3b7a : 0x4a4f55, p.on ? { metalness: 0.4, roughness: 0.3 } : {}));
        m.position.y = 1.5;
        const g = new THREE.Group().add(m);
        at(g, p);
        break;
      }
      case "helideck":
        at(helideck(p.size?.x ?? 21), p);
        break;
      case "carpet-pad": {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.04, 24), mat(0x6b2a7a));
        at(m, p);
        break;
      }
      case "nav-machine":
        at(navMachine(), p);
        break;
      case "mat": {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.61, 0.02, 1.83), mat(0x6a4fbf));
        m.position.y = 0.02;
        at(new THREE.Group().add(m), p);
        break;
      }
      case "console": {
        const s = new THREE.Mesh(new THREE.BoxGeometry((p.size?.x ?? 2.2) * 0.8, 0.6, 0.06), mat(0x1d5a70, { emissive: 0x0d3040 }));
        s.position.set(0, 1.05, (p.size?.z ?? 0.9) * 0.25);
        at(new THREE.Group().add(s), p);
        break;
      }
      case "iss-mockup": {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(2.15 * L.k, 2.15 * L.k, 8.5 * L.k, 20), mat(0xe9ecef));
        m.rotation.z = Math.PI / 2;
        m.position.y = 2.15;
        at(new THREE.Group().add(m), p);
        break;
      }
      case "centrifuge": {
        const c = centrifuge();
        c.group.scale.set(L.k, 1, L.k);
        centrifugeArm = c.arm;
        at(c.group, p);
        break;
      }
      case "tree":
        if (p.tree) root.add(treeShell(p));
        break;
      case "lift-shaft": {
        const s = p.size!;
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(s.x + 0.2, s.y, s.z + 0.2), mat(0xbfefff, { transparent: true, opacity: 0.18, depthWrite: false }));
        shaft.position.set(p.x, s.y / 2, p.z);
        root.add(shaft);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(s.x, 2.6, s.z), mat(0xffd27f, { transparent: true, opacity: 0.55 }));
        cab.geometry.translate(0, 1.3, 0);
        cab.position.set(p.x, 0, p.z);
        cab.name = "cabina";
        root.add(cab);
        const lift = L.lifts.find((l) => Math.abs(l.x - p.x) < 1e-6 && Math.abs(l.z - p.z) < 1e-6);
        if (lift) cabs.set(lift.id, cab);
        break;
      }
      case "battery":
      case "tank-lox":
      case "tank-rp1":
      case "deflector":
      case "big-screen":
      case "sign":
        break;
    }
    if (p.kind === "tank-lox" || p.kind === "tank-rp1") {
      const s = new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 12), mat(p.kind === "tank-lox" ? 0xd8e2ea : 0xb39e72));
      s.position.set(p.x, 4.5, p.z);
      if (p.plan) s.scale.set(p.plan, 1, p.plan);
      root.add(s);
    }
  }
  // Signs over the areas and the machines (white text on a dark plate), scaled up to read from afar outdoors.
  for (const a of L.areas) {
    if (a.id.endsWith(":tronco")) continue;
    const s = textSign(a.label.replace(/ \(.*\)$/, ""));
    const far = a.half.x > 30 ? 6 : 3;
    s.scale.multiplyScalar(far);
    s.position.set(a.centre.x, a.centre.y + a.half.y + 1.5 * far, a.centre.z);
    s.name = `cartel:${a.id}`;
    root.add(s);
  }
  for (const m of L.machines) {
    const s = textSign(m.label);
    s.scale.multiplyScalar(1.2);
    s.position.set(m.x, m.y + 2.3, m.z);
    s.name = `cartel-m:${m.id}`;
    root.add(s);
  }
  const f9 = L.props.find((p) => p.kind === "falcon9");
  if (f9) {
    const s = textSign("Falcon 9 · Crew Dragon (plataforma de tripulación)");
    s.scale.multiplyScalar(40);
    s.position.set(f9.x, f9.y + 95, f9.z);
    root.add(s);
  }
  const el = L.props.find((p) => p.kind === "electron");
  if (el) {
    const s = textSign("Electron");
    s.scale.multiplyScalar(6);
    s.position.set(el.x, el.y + 22, el.z);
    root.add(s);
  }
  return { root, rotors, turbines, ...(centrifugeArm ? { centrifugeArm } : {}), cabs };
}

/** A tree-building's shell: the floors' undersides and railings, the tips and the crown's slab (walls and water come from the layout). */
function treeShell(p: Prop): THREE.Group {
  const t = p.tree!;
  const g = new THREE.Group();
  const steel = mat(0x7d8a94);
  for (const f of [...t.floors, ...t.tips]) {
    const w = f.rect.x1 - f.rect.x0;
    const d = f.rect.z1 - f.rect.z0;
    // Struts under the floor (Cold Sanctuary: «tornapuntas»), and a railing.
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4, 0.6), steel);
    for (const [sx, sz] of [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]] as const) {
      const s = strut.clone();
      s.position.set(f.rect.x0 + w * sx, f.y - 2.2, f.rect.z0 + d * sz);
      g.add(s);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), mat(0xbfe8ff, { wireframe: true }));
    rail.position.set((f.rect.x0 + f.rect.x1) / 2, f.y + 0.55, (f.rect.z0 + f.rect.z1) / 2);
    g.add(rail);
  }
  return g;
}

/** A cold seabird of the aerial sanctuary: a body and two wings that flap. */
export function bird(wingspanM: number, color: number): { group: THREE.Group; wings: THREE.Mesh[] } {
  const g = new THREE.Group();
  const s = Math.max(0.6, wingspanM);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12 * s, 6, 4), mat(color));
  body.scale.set(1, 0.8, 2.2);
  g.add(body);
  const wings = [-1, 1].map((side) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(s / 2, 0.02, 0.18 * s), mat(color));
    w.geometry.translate((side * s) / 4, 0, 0);
    g.add(w);
    return w;
  });
  return { group: g, wings };
}
