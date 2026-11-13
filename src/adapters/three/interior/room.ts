import * as THREE from "three";
import type { MachineId } from "@modules/life-support/domain/machine";
import { textSign } from "./sign";

/**
 * The habitat module sits in the spinning ring: 4 m wide, 12 m long, at 1 g. Laid out like a
 * long-duration habitat (docs/design/interiores.md): the noisy, wet end with the galley, food
 * processing and growing racks by the elevator; the sickbay and ship-mind panel in the middle;
 * the quiet crew end with Doménica's cabin and the exercise corner next to the sickbay. The hygiene
 * stall and the hens are on the farm deck, through the far doorway.
 */
export const ROOM = { halfW: 2, halfL: 6, height: 2.6 } as const;

export type StationId = "huerto" | "cocina" | "procesado" | "biorreactor" | "enfermeria" | "panel" | "yoga" | "ejercicio" | "camarote" | "gatos" | "gallinero" | "terreno" | "perros" | "navegacion";

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
  // Navigation console on the left wall: repeats the flight deck (map, trips, missions, nano_net).
  { id: "navegacion", label: "Consola de navegación", stand: V(-1.1, 0, 2.75), look: V(-2, 1.3, 2.75) },
  { id: "yoga", label: "Esterilla de yoga", stand: V(0, 0, 3.0), look: V(0, 0.6, 4.0) },
  // Crew end: Doménica's cabin (her letters are read there, like the ISS crew quarters' laptop).
  { id: "camarote", label: "Camarote de Doménica", stand: V(-0.55, 0, 3.95), look: V(-1.7, 0.9, 4.25) },
  { id: "ejercicio", label: "Rincón de ejercicio", stand: V(0.7, 0, 4.95), look: V(1.6, 0.8, 4.95) },
  { id: "gatos", label: "Rincón de los gatos", stand: V(-0.4, 0, 5.2), look: V(-1.2, 0.15, 5.75) },
  // On the farm deck, at the right end of the lawn.
  { id: "gallinero", label: "Gallinero", stand: V(5.7, 0, 7.4), look: V(7.3, 0.4, 7.4) },
  // Through the doorway at the far end: the farm deck (adapters/three/interior/farm-deck.ts).
  { id: "perros", label: "Rincón de los chihuahuas", stand: V(2.4, 0, 7.0), look: V(3.6, 0.15, 7.7) },
  { id: "terreno", label: "Cubierta de cultivo", stand: V(0, 0, 8.6), look: V(-2, 0.5, 11) },
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

/**
 * Walls the walker must not cross: Doménica's cabin (door opening z 3.85–5.2) along the module's
 * left wall, and the hygiene stall on the farm deck.
 */
export function crewEndBlocks(x: number, z: number): boolean {
  if (z > HYGIENE.minZ - 0.25 && z < HYGIENE.maxZ + 0.25 && x > HYGIENE.minX - 0.25 && x < HYGIENE.maxX + 0.25) return true;
  if (z < 3.25 || z > 5.35) return false;
  const door = z > 3.85 && z < 5.2;
  return x < (door ? -1.3 : -0.95);
}

/** The hygiene stall, on the farm deck just left of the doorway (floor rectangle). */
export const HYGIENE = { minX: -2.6, maxX: -1.2, minZ: ROOM.halfL + 0.06, maxZ: ROOM.halfL + 1.3 } as const;

/** Where cats and hens may roam. */
export const CAT_BOUNDS = { minX: -1.2, maxX: 1.0, minZ: -5, maxZ: 5.6 } as const;
export const COOP_BOUNDS = { minX: 6.75, maxX: 8.0, minZ: 6.6, maxZ: 8.2 } as const;
/** The coop on the farm deck: pen centre and size (x, z), its gate on the lawn side (−x). */
export const COOP = { x: 7.4, z: 7.4, w: 1.6, d: 2.0, gateX: 6.6 } as const;

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
 * sickbay, ship-mind panel, exercise corner with the yoga mat, Doménica's cabin and the cats'
 * things; plus the hygiene stall and the chicken coop, which stand on the farm deck.
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
  g.add(boxAt(halfW * 2, height, 0.05, wall, 0, height / 2, -halfL));
  // Far wall with a doorway to the farm deck.
  g.add(boxAt(halfW - 0.5, height, 0.05, wall, -(halfW + 0.5) / 2, height / 2, halfL), boxAt(halfW - 0.5, height, 0.05, wall, (halfW + 0.5) / 2, height / 2, halfL));
  g.add(boxAt(1.0, height - 2.1, 0.05, wall, 0, 2.1 + (height - 2.1) / 2, halfL));
  // The floor curves up out of sight in a real ring (2 m over the farm deck at R = 56 m; flat here);
  // a stripe down the middle runs spinward (+z), along the ring. The spin axis is across it (x).
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
  // Hatch to the next ring segment (the cockpit is reached up the spoke: interior/spoke.ts).
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

  // --- Navigation console: a dark map screen with a few lit targets, on a grey wall panel -----------
  // The ship bay is not here any more: it is at the station (docs/design/accesos.md).
  g.add(boxAt(0.06, 1.1, 0.9, mat(0x7c8796, { metalness: 0.5 }), -halfW + 0.04, 1.3, 2.75));
  g.add(boxAt(0.02, 0.7, 0.78, new THREE.MeshStandardMaterial({ color: 0x050812, emissive: 0x0a1630 }), -halfW + 0.08, 1.35, 2.75));
  for (const [dy, dz, c] of [[0.15, -0.2, 0x58d6ff], [-0.1, 0.12, 0x58d6ff], [0.05, 0.28, 0xffb347], [-0.2, -0.25, 0x58d6ff]] as const)
    g.add(boxAt(0.02, 0.04, 0.04, glow(c, 1.2), -halfW + 0.095, 1.35 + dy, 2.75 + dz));
  g.add(boxAt(0.03, 0.04, 0.9, glow(0x58d6ff, 0.6), -halfW + 0.07, 0.72, 2.75));
  const navSign = textSign("Navegación · mapa y misiones");
  navSign.scale.multiplyScalar(0.6);
  navSign.position.set(-halfW + 0.1, 2.05, 2.75);
  g.add(navSign);

  // --- Exercise corner: yoga mat across the aisle, treadmill, bike and resistance rack ------------
  // Copies of the ISS countermeasure devices (T2, CEVIS, ARED); at 1 g they need no harness or straps.
  g.add(boxAt(1.85, 0.008, 0.65, mat(0x5aa56e), 0, 0.004, 4.0));
  const steel = mat(0x5a626e, { metalness: 0.6, roughness: 0.4 });
  const black = mat(0x22262c);
  g.add(boxAt(0.75, 0.2, 1.6, steel, 1.55, 0.1, 3.65)); // treadmill deck
  g.add(boxAt(0.55, 0.012, 1.4, black, 1.55, 0.206, 3.65)); // belt
  for (const sx of [-1, 1]) g.add(boxAt(0.04, 1.0, 0.04, steel, 1.55 + sx * 0.33, 0.6, 2.95));
  g.add(boxAt(0.7, 0.04, 0.05, steel, 1.55, 1.1, 2.95), boxAt(0.5, 0.3, 0.05, black, 1.55, 1.3, 2.93));
  g.add(boxAt(0.36, 0.2, 0.02, glow(0x3fd0ff, 0.6), 1.55, 1.3, 2.96));
  g.add(boxAt(0.45, 0.06, 0.9, steel, 1.6, 0.03, 4.95)); // bike frame
  g.add(cylAt(0.04, 0.04, 0.75, steel, 1.6, 0.42, 5.2, 8), cylAt(0.04, 0.04, 0.9, steel, 1.6, 0.5, 4.75, 8));
  g.add(boxAt(0.14, 0.05, 0.26, black, 1.6, 0.82, 5.2), boxAt(0.42, 0.04, 0.04, black, 1.6, 0.97, 4.72));
  const flywheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 18), black);
  flywheel.rotation.z = Math.PI / 2;
  flywheel.position.set(1.6, 0.3, 4.8);
  g.add(flywheel);
  g.add(boxAt(0.5, 2.0, 0.08, steel, 1.75, 1.0, 5.85), boxAt(1.0, 0.05, 0.05, mat(0xd0d4da, { metalness: 0.8 }), 1.4, 1.35, 5.75)); // resistance rack and bar
  for (const sx of [-1, 1]) g.add(cylAt(0.1, 0.1, 0.03, black, 1.4 + sx * 0.42, 1.35, 5.75, 14).rotateZ(Math.PI / 2));
  const exSign = textSign("Ejercicio · cinta, bici y fuerza");
  exSign.scale.multiplyScalar(0.7);
  exSign.position.set(1.4, 2.25, 4.4);
  g.add(exSign);

  // --- Doménica's cabin: a closed booth like an ISS crew quarters, sized for a bunk at 1 g --------
  const cabinWall = mat(0xe6dccb);
  g.add(boxAt(0.95, height - 0.1, 0.05, cabinWall, -1.53, (height - 0.1) / 2, 3.3)); // wall to the bay hatch side
  g.add(boxAt(0.95, height - 0.1, 0.05, cabinWall, -1.53, (height - 0.1) / 2, 5.25)); // wall to the hygiene stall
  g.add(boxAt(0.05, height - 0.1, 0.55, cabinWall, -1.05, (height - 0.1) / 2, 3.55)); // front wall, door opening behind
  g.add(boxAt(0.05, 0.5, 1.95, cabinWall, -1.05, height - 0.35, 4.28)); // header over the door
  const curtain = boxAt(0.02, 1.9, 0.5, mat(0x6f8fb0), -1.03, 1.0, 5.0); // drawn-back curtain
  g.add(curtain);
  g.add(boxAt(0.85, 0.45, 1.9, mat(0xb8bec8), -1.55, 0.225, 4.28)); // bunk with drawers
  g.add(boxAt(0.82, 0.12, 1.85, mat(0x3c6e9e), -1.55, 0.51, 4.28)); // mattress
  g.add(boxAt(0.5, 0.1, 0.32, mat(0xffffff), -1.6, 0.62, 3.6)); // pillow
  g.add(boxAt(0.04, 0.5, 0.8, mat(0x30343c), -1.97, 1.35, 4.45)); // personal laptop on the wall
  g.add(boxAt(0.02, 0.4, 0.68, glow(0x7fdcff, 0.5), -1.94, 1.35, 4.45));
  for (const [z, c] of [
    [3.7, 0xf2c6a0],
    [3.9, 0xa0c8f2],
  ] as const)
    g.add(boxAt(0.02, 0.18, 0.14, glow(c, 0.4), -1.95, 1.7, z)); // family photos: Nevaeh and Kushal
  g.add(boxAt(0.7, 0.05, 1.9, mat(0xc8ced6), -1.55, 1.95, 4.28)); // stowage shelf
  const reading = new THREE.PointLight(0xffe2b0, 1.2, 2.2, 1.6);
  reading.position.set(-1.6, 1.6, 3.8);
  g.add(reading);
  const cabinSign = textSign("Camarote de Doménica");
  cabinSign.scale.multiplyScalar(0.7);
  cabinSign.position.set(-1.0, 2.3, 4.3);
  g.add(cabinSign);
  // The cats sleep on her bunk; their scratching post stands at her door.
  const catBed = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.07, 8, 20), mat(0xb08a6a));
  catBed.rotation.x = Math.PI / 2;
  catBed.position.set(-1.55, 0.62, 4.9);
  g.add(catBed, boxAt(0.12, 0.8, 0.12, mat(0xc8a878), -0.95, 0.4, 3.2));

  // --- Cats' corner by her cabin: litter box, bowls -----------------------------------------------
  g.add(boxAt(0.45, 0.16, 0.38, mat(0xd8d0c0), -1.6, 0.08, 5.7), boxAt(0.42, 0.02, 0.35, mat(0xbfb59a), -1.6, 0.165, 5.7)); // litter box
  g.add(boxAt(0.14, 0.05, 0.14, mat(0x3a7bd5), -0.95, 0.025, 5.8), boxAt(0.14, 0.05, 0.14, mat(0xd5823a), -0.75, 0.025, 5.8)); // bowls

  // --- Hygiene stall, through the doorway on the farm deck: away from the galley and the cabin, as
  // NASA's Deep Space Habitat studies ask. Toilet like the ISS/Orion UWMS, hand wash, a door.
  const H = HYGIENE;
  const stallWall = mat(0xd7dde4);
  g.add(boxAt(H.maxX - H.minX, 2.2, 0.05, stallWall, (H.minX + H.maxX) / 2, 1.1, H.maxZ));
  g.add(boxAt(0.05, 2.2, H.maxZ - H.minZ, stallWall, H.minX, 1.1, (H.minZ + H.maxZ) / 2));
  g.add(boxAt(0.05, 2.2, H.maxZ - H.minZ - 0.7, stallWall, H.maxX, 1.1, H.minZ + (H.maxZ - H.minZ - 0.7) / 2));
  g.add(boxAt(0.04, 2.0, 0.66, mat(0x7c8796, { metalness: 0.4 }), H.maxX + 0.02, 1.0, H.maxZ - 0.36)); // door, ajar
  g.add(cylAt(0.18, 0.2, 0.42, mat(0xf2f4f6), H.minX + 0.35, 0.21, H.minZ + 0.45), boxAt(0.3, 0.45, 0.2, mat(0xdfe3e8), H.minX + 0.35, 0.55, H.minZ + 0.18));
  g.add(boxAt(0.3, 0.05, 0.25, mat(0xf2f4f6), H.minX + 0.2, 0.95, H.maxZ - 0.3));
  g.add(boxAt(H.maxX - H.minX, 0.03, H.maxZ - H.minZ, stallWall, (H.minX + H.maxX) / 2, 2.2, (H.minZ + H.maxZ) / 2)); // roof
  const wcSign = textSign("Aseo");
  wcSign.position.set((H.minX + H.maxX) / 2, 2.5, (H.minZ + H.maxZ) / 2);
  g.add(wcSign);

  // --- Chicken coop, on the farm deck past the doorway: pen, nest boxes, perch, feeder, drinker ---
  const wire = new THREE.MeshBasicMaterial({ color: 0x9aa6b6, wireframe: true });
  const pen = new THREE.Mesh(new THREE.BoxGeometry(COOP.w, 0.9, COOP.d, 6, 4, 8), wire);
  pen.position.set(COOP.x, 0.45, COOP.z);
  g.add(pen);
  g.add(boxAt(COOP.w, 0.02, COOP.d, mat(0xd9c38f), COOP.x, 0.011, COOP.z)); // wood-shaving bedding
  for (const dz of [-0.3, 0.3]) g.add(boxAt(0.32, 0.3, 0.3, mat(0xb07a4a), COOP.x + COOP.w / 2 - 0.2, 0.35, COOP.z + dz)); // nest boxes
  const nestEggs = new THREE.Group();
  g.add(nestEggs);
  g.add(cylAt(0.015, 0.015, 1.4, mat(0x8a5a32), COOP.x, 0.45, COOP.z - 0.6, 6).rotateZ(Math.PI / 2)); // perch
  g.add(cylAt(0.08, 0.1, 0.12, mat(0xd04a3a), COOP.x - 0.4, 0.06, COOP.z + 0.75), cylAt(0.07, 0.09, 0.14, mat(0x3a7bd5), COOP.x - 0.1, 0.07, COOP.z + 0.75));
  const coopSign = textSign("Gallinero");
  coopSign.scale.multiplyScalar(0.7);
  coopSign.position.set(COOP.x, 1.35, COOP.z);
  g.add(coopSign);
  lamp(lamps, g, "gallinero", COOP.gateX, 0.95, COOP.z - 0.9);

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
