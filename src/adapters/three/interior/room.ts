import * as THREE from "three";
import type { MachineId } from "@modules/life-support/domain/machine";

/** The habitat module sits in the spinning ring: 4 m wide, 12 m long, with gravity for people, cats and hens. */
export const ROOM = { halfW: 2, halfL: 6, height: 2.6 } as const;

export type StationId = "huerto" | "cocina" | "procesado" | "biorreactor" | "enfermeria" | "panel" | "yoga" | "gatos" | "gallinero";

/** Station anchor points the player walks to (floor position + where to look). */
export interface Station {
  readonly id: StationId;
  readonly label: string;
  readonly stand: THREE.Vector3;
  readonly look: THREE.Vector3;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const STATIONS: readonly Station[] = [
  { id: "huerto", label: "Huerto", stand: V(-0.6, 0, -3.2), look: V(-1.75, 0.9, -3.2) },
  { id: "cocina", label: "Cocina", stand: V(0.3, 0, -4.7), look: V(1.7, 1.0, -4.9) },
  { id: "procesado", label: "Molino y procesador de soja", stand: V(0.2, 0, -2.25), look: V(1.7, 0.85, -2.25) },
  { id: "biorreactor", label: "Laboratorio de carne cultivada", stand: V(-0.3, 0, -0.4), look: V(1.6, 1.15, -0.4) },
  { id: "enfermeria", label: "Enfermería", stand: V(0.5, 0, 1.3), look: V(-1.5, 0.75, 0.6) },
  { id: "panel", label: "Mente de la nave", stand: V(0.5, 0, 2.0), look: V(1.95, 1.4, 2.0) },
  { id: "yoga", label: "Esterilla de yoga", stand: V(0, 0, 3.0), look: V(0, 0.6, 4.0) },
  { id: "gatos", label: "Rincón de los gatos", stand: V(-0.6, 0, 4.8), look: V(-1.5, 0.2, 5.4) },
  { id: "gallinero", label: "Gallinero", stand: V(0.5, 0, 4.7), look: V(1.55, 0.4, 4.7) },
];

export const MACHINE_STATION: Readonly<Record<MachineId, StationId>> = {
  bastidores: "huerto",
  cocina: "cocina",
  molino: "procesado",
  "procesador-soja": "procesado",
  biorreactor: "biorreactor",
  enfermeria: "enfermeria",
  gallinero: "gallinero",
};

/** Where cats and hens may roam. */
export const CAT_BOUNDS = { minX: -1.2, maxX: 1.0, minZ: -5, maxZ: 5.6 } as const;
export const COOP_BOUNDS = { minX: 1.35, maxX: 1.85, minZ: 3.75, maxZ: 5.55 } as const;

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
const glow = (color: number, intensity = 1.5) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity });

function boxAt(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
}
function cylAt(rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, seg = 20): THREE.Mesh {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  c.position.set(x, y, z);
  return c;
}

/** Pots on the two-tier growing racks (hydroponic, LED-lit), in order. */
export const POT_SLOTS: readonly THREE.Vector3[] = [0.42, 1.12].flatMap((y) => [-5.4, -4.85, -4.3, -3.75, -3.2, -2.65, -2.1, -1.55, -1.0].map((z) => V(-1.72, y, z)));

/** A wall screen whose canvas is redrawn by `drawScreen`. */
function screen(w: number, h: number, x: number, y: number, z: number, rotY: number): THREE.Mesh {
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  s.position.set(x, y, z);
  s.rotation.y = rotY;
  return s;
}

export interface RoomHandles {
  readonly group: THREE.Group;
  /** Ship-mind panel: the ship's class as code. */
  readonly panel: THREE.Mesh;
  /** Bioreactor console: stage, cells, pH, glucose. */
  readonly reactorScreen: THREE.Mesh;
  /** Sickbay monitor: patients and conditions. */
  readonly medScreen: THREE.Mesh;
  /** Culture medium inside the glass tank (its colour follows the pH, like phenol red). */
  readonly medium: THREE.Mesh;
  /** Status lamp of each machine: green working, red broken. */
  readonly lamps: ReadonlyMap<MachineId, THREE.Mesh>;
  /** Induction hob glow, lit while cooking. */
  readonly hob: THREE.Mesh;
  /** Eggs in the nest boxes. */
  readonly nestEggs: THREE.Group;
}

function lamp(lamps: Map<MachineId, THREE.Mesh>, g: THREE.Group, id: MachineId, x: number, y: number, z: number): void {
  const l = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), glow(0x37e07a, 2));
  l.position.set(x, y, z);
  lamps.set(id, l);
  g.add(l);
}

/**
 * The habitat module: shell, growing racks, galley, mill and soy processor, cultured-meat lab,
 * sickbay, ship-mind panel, yoga mat, cat corner and chicken coop.
 */
export function buildRoom(): RoomHandles {
  const g = new THREE.Group();
  const lamps = new Map<MachineId, THREE.Mesh>();
  const { halfW, halfL, height } = ROOM;
  const wall = mat(0xc9ced6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, halfL * 2), mat(0x5d6672));
  floor.rotation.x = -Math.PI / 2;
  const ceiling = floor.clone();
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = height;
  ceiling.material = mat(0xdfe3e8);
  g.add(floor, ceiling);
  g.add(boxAt(0.05, height, halfL * 2, wall, -halfW, height / 2, 0), boxAt(0.05, height, halfL * 2, wall, halfW, height / 2, 0));
  g.add(boxAt(halfW * 2, height, 0.05, wall, 0, height / 2, -halfL), boxAt(halfW * 2, height, 0.05, wall, 0, height / 2, halfL));
  // The floor curves up out of sight in a real ring; a stripe down the middle hints at the spin axis.
  g.add(boxAt(0.08, 0.002, halfL * 2, mat(0x7b8592), 0, 0.001, 0));
  const rail = mat(0xe8c547, { metalness: 0.4 });
  for (const x of [-halfW + 0.08, halfW - 0.08]) g.add(boxAt(0.03, 0.03, halfL * 1.9, rail, x, 2.05, 0));
  for (const z of [-4.5, -1.5, 1.5, 4.5]) g.add(boxAt(1.2, 0.02, 0.5, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6e8, emissiveIntensity: 1.2 }), 0, height - 0.01, z));
  for (const z of [-3.5, 0.5, 4.5]) {
    const l = new THREE.PointLight(0xfff3e0, 6, 7, 1.5);
    l.position.set(0, height - 0.2, z);
    g.add(l);
  }
  g.add(new THREE.HemisphereLight(0xe8eef8, 0x404650, 0.9));
  // Hatch to the cockpit.
  g.add(boxAt(0.9, 1.9, 0.06, mat(0x7c8796, { metalness: 0.5 }), 0, 0.95, -halfL + 0.04));
  g.add(boxAt(0.5, 0.5, 0.02, new THREE.MeshStandardMaterial({ color: 0x050812, emissive: 0x0a1630 }), 0, 1.45, -halfL + 0.08));

  // --- Growing racks: two tiers of NFT channels under red/blue/green LEDs (BPC, Veggie) -------------
  const white = mat(0xf0f0f0);
  for (const y of [0.4, 1.1]) {
    g.add(boxAt(0.45, 0.04, 4.9, white, -1.72, y, -3.2));
    g.add(boxAt(0.3, 0.03, 4.8, glow(0xff66cc, 2), -1.72, y + 0.62, -3.2));
    g.add(boxAt(0.06, 0.05, 4.9, mat(0x2d6fa8), -1.52, y + 0.03, -3.2)); // nutrient channel
  }
  for (const z of [-5.68, -0.72]) g.add(boxAt(0.45, 1.8, 0.04, white, -1.72, 0.9, z));
  const grow = new THREE.PointLight(0xe060ff, 4, 3.5, 1.5);
  grow.position.set(-1.5, 1.5, -3.2);
  g.add(grow);
  g.add(boxAt(0.3, 0.4, 0.3, mat(0x2d6fa8), -1.75, 0.2, -0.9)); // nutrient tank
  lamp(lamps, g, "bastidores", -1.5, 1.85, -0.75);

  // --- Galley ---------------------------------------------------------------------------------------
  g.add(boxAt(0.6, 0.9, 2.2, mat(0x8a96a6), 1.68, 0.45, -4.5));
  g.add(boxAt(0.62, 0.04, 2.22, mat(0xeeeeee), 1.68, 0.92, -4.5));
  g.add(boxAt(0.4, 0.01, 0.4, new THREE.MeshStandardMaterial({ color: 0x111111 }), 1.68, 0.945, -5.0));
  const hob = boxAt(0.3, 0.004, 0.3, new THREE.MeshStandardMaterial({ color: 0x441111, emissive: 0x991a0a, emissiveIntensity: 0.15 }), 1.68, 0.952, -5.0);
  g.add(hob);
  g.add(cylAt(0.12, 0.12, 0.05, mat(0x30343c, { metalness: 0.7 }), 1.68, 0.98, -5.0)); // pan
  g.add(boxAt(0.4, 0.5, 2.2, mat(0x9aa6b6), 1.78, 1.85, -4.5));
  g.add(boxAt(0.5, 0.45, 0.5, mat(0x30343c), 1.7, 0.6, -4.0)); // oven
  g.add(boxAt(0.45, 0.25, 0.02, glow(0xff9a3c, 0.5), 1.44, 0.62, -4.0));
  g.add(boxAt(0.6, 1.9, 0.7, mat(0xe8ecf0, { metalness: 0.2 }), 1.68, 0.95, -3.0)); // fridge / cold room
  g.add(boxAt(0.02, 0.6, 0.03, mat(0x9aa6b6), 1.37, 1.1, -2.75));
  lamp(lamps, g, "cocina", 1.4, 1.5, -5.4);

  // --- Mill and soy processor ----------------------------------------------------------------------
  g.add(boxAt(0.5, 0.8, 0.5, mat(0x7a6a52), 1.7, 0.4, -2.0));
  g.add(cylAt(0.18, 0.06, 0.3, mat(0xb9a27a), 1.7, 0.95, -2.0, 12)); // hopper
  g.add(boxAt(0.5, 0.7, 0.45, mat(0xdfe6ea, { metalness: 0.3 }), 1.7, 0.35, -2.55));
  g.add(cylAt(0.15, 0.15, 0.35, mat(0xf4f7f8, { metalness: 0.5 }), 1.7, 0.88, -2.55));
  lamp(lamps, g, "molino", 1.43, 0.75, -1.85);
  lamp(lamps, g, "procesador-soja", 1.43, 0.65, -2.4);

  // --- Cultured-meat lab: stirred tank, LN2 dewar, laminar hood and console --------------------------
  const glass = new THREE.MeshStandardMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
  g.add(cylAt(0.28, 0.28, 0.08, mat(0x9aa6b6, { metalness: 0.6 }), 1.55, 0.04, -0.3));
  g.add(cylAt(0.25, 0.25, 1.0, glass, 1.55, 0.6, -0.3));
  const medium = cylAt(0.23, 0.23, 0.75, new THREE.MeshStandardMaterial({ color: 0xff5a7a, transparent: true, opacity: 0.85 }), 1.55, 0.5, -0.3);
  g.add(medium);
  g.add(cylAt(0.27, 0.27, 0.06, mat(0x9aa6b6, { metalness: 0.6 }), 1.55, 1.12, -0.3));
  g.add(cylAt(0.015, 0.015, 0.9, mat(0xcccccc, { metalness: 0.8 }), 1.55, 0.7, -0.3, 8)); // impeller shaft
  for (const dx of [-0.1, 0.1]) g.add(cylAt(0.006, 0.006, 0.8, mat(0x333333), 1.55 + dx, 0.8, -0.38, 6)); // probes
  g.add(cylAt(0.16, 0.16, 0.6, mat(0xb8c4d0, { metalness: 0.7 }), 1.75, 0.3, 0.3)); // LN2 dewar
  g.add(boxAt(0.5, 0.7, 0.55, glass, 1.72, 1.25, 0.65)); // laminar-flow hood
  g.add(boxAt(0.5, 0.05, 0.55, mat(0xdddddd), 1.72, 0.88, 0.65));
  g.add(boxAt(0.5, 0.86, 0.55, mat(0x8a96a6), 1.72, 0.43, 0.65));
  const reactorScreen = screen(0.75, 0.5, halfW - 0.04, 1.6, -0.55, -Math.PI / 2);
  g.add(reactorScreen, boxAt(0.03, 0.55, 0.8, mat(0x30343c), halfW - 0.02, 1.6, -0.55));
  lamp(lamps, g, "biorreactor", 1.3, 1.15, -0.3);

  // --- Sickbay: one bed for people, one exam table for animals, monitor and cabinet -----------------
  g.add(boxAt(0.7, 0.55, 1.9, mat(0xe6edf2), -1.6, 0.275, 1.2)); // bed
  g.add(boxAt(0.68, 0.1, 1.85, mat(0x8fc6e8), -1.6, 0.6, 1.2));
  g.add(boxAt(0.5, 0.12, 0.3, mat(0xffffff), -1.6, 0.7, 0.4)); // pillow
  g.add(boxAt(0.5, 0.8, 0.5, mat(0xc4ccd4, { metalness: 0.4 }), -1.65, 0.4, -0.15)); // vet exam table
  g.add(boxAt(0.55, 0.03, 0.55, mat(0xd8dde2, { metalness: 0.7 }), -1.65, 0.81, -0.15));
  g.add(boxAt(0.4, 0.5, 0.3, mat(0xffffff), -1.85, 1.6, 2.0)); // cabinet
  const cross = glow(0xe0303a, 0.8);
  g.add(boxAt(0.02, 0.2, 0.06, cross, -1.64, 1.6, 2.0), boxAt(0.02, 0.06, 0.2, cross, -1.64, 1.6, 2.0));
  const medScreen = screen(0.75, 0.5, -halfW + 0.04, 1.55, 1.15, Math.PI / 2);
  g.add(medScreen, boxAt(0.03, 0.55, 0.8, mat(0x30343c), -halfW + 0.02, 1.55, 1.15));
  lamp(lamps, g, "enfermeria", -1.45, 1.9, 1.15);

  // --- Ship-mind panel ----------------------------------------------------------------------------
  const panel = screen(1.4, 0.9, halfW - 0.04, 1.4, 2.0, -Math.PI / 2);
  g.add(panel, boxAt(0.03, 1.0, 1.5, mat(0x30343c), halfW - 0.02, 1.4, 2.0));

  // --- Yoga mat, across the room so postures are seen in profile ----------------------------------
  g.add(boxAt(1.85, 0.008, 0.65, mat(0x5aa56e), 0, 0.004, 4.0));

  // --- Cat corner -----------------------------------------------------------------------------------
  const bed = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 8, 20), mat(0xb08a6a));
  bed.rotation.x = Math.PI / 2;
  bed.position.set(-1.5, 0.08, 5.4);
  g.add(bed, boxAt(0.14, 0.05, 0.14, mat(0x3a7bd5), -1.0, 0.025, 5.7), boxAt(0.14, 0.05, 0.14, mat(0xd5823a), -0.75, 0.025, 5.7));
  g.add(boxAt(0.12, 0.8, 0.12, mat(0xc8a878), -1.75, 0.4, 4.4));
  g.add(boxAt(0.5, 0.4, 0.5, mat(0xd8d0c0), -1.65, 0.2, 3.7)); // litter box
  g.add(boxAt(0.46, 0.02, 0.46, mat(0xbfb59a), -1.65, 0.41, 3.7));

  // --- Chicken coop: mesh enclosure, nest boxes, perch, feeder and drinker -------------------------
  const wire = new THREE.MeshBasicMaterial({ color: 0x9aa6b6, wireframe: true });
  const pen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 2.0, 4, 4, 10), wire);
  pen.position.set(1.6, 0.45, 4.65);
  g.add(pen);
  g.add(boxAt(0.8, 0.02, 2.0, mat(0xd9c38f), 1.6, 0.011, 4.65)); // wood-shaving bedding
  for (const z of [5.3, 5.62]) g.add(boxAt(0.32, 0.3, 0.3, mat(0xb07a4a), 1.82, 0.35, z)); // nest boxes
  const nestEggs = new THREE.Group();
  g.add(nestEggs);
  g.add(cylAt(0.015, 0.015, 0.75, mat(0x8a5a32), 1.6, 0.45, 4.0, 6).rotateZ(Math.PI / 2)); // perch
  g.add(cylAt(0.08, 0.1, 0.12, mat(0xd04a3a), 1.45, 0.06, 4.2), cylAt(0.07, 0.09, 0.14, mat(0x3a7bd5), 1.45, 0.07, 4.45));
  lamp(lamps, g, "gallinero", 1.2, 0.95, 3.65);

  return { group: g, panel, reactorScreen, medScreen, medium, lamps, hob, nestEggs };
}

/** Draws text lines onto a wall screen. Lines starting with "!" are warnings. */
export function drawScreen(target: THREE.Mesh, title: string, lines: readonly string[], size: { w: number; h: number } = { w: 1024, h: 660 }): void {
  const c = document.createElement("canvas");
  c.width = size.w;
  c.height = size.h;
  const x = c.getContext("2d")!;
  x.fillStyle = "#07101c";
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#7fdcff";
  x.font = "bold 40px monospace";
  x.fillText(title, 36, 64);
  x.font = "28px monospace";
  lines.forEach((l, i) => {
    const warn = l.startsWith("!");
    x.fillStyle = warn ? "#ffb347" : l.startsWith("+") ? "#7dffb0" : "#c6f0ff";
    if (warn || l.startsWith("+")) x.font = "bold 30px monospace";
    else x.font = "28px monospace";
    x.fillText(warn || l.startsWith("+") ? l.slice(1) : l, 36, 130 + i * 50);
  });
  const m = target.material as THREE.MeshBasicMaterial;
  m.map?.dispose();
  m.map = new THREE.CanvasTexture(c);
  m.map.colorSpace = THREE.SRGBColorSpace;
  m.needsUpdate = true;
}
