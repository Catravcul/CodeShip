import * as THREE from "three";
import type { S3Layout } from "@modules/aerial-sanctuary/data/layout";
import { HOLLOW, NAVE } from "@modules/aerial-sanctuary/data/montana";

/**
 * The hall inside the mountain (docs/design/montana-hueca.md), a scene of its own: its four walls of pale rock dug
 * from under the sea, its pyramid roof lit like a sky (bright, with no shadows), the lake's sandy bed, and the flooded
 * Starship standing in the lake: its steel hull with the airlock's door, the nose and the four flaps. Sanctuary 1's
 * buildings are drawn by sanctuary 1's own scene code (adapters/three/s1-models.ts); the gates' leaves, docks and the
 * training rooms are blocks of the layout (aerial-models.ts buildBlocks, their looks in MOUNTAIN_LOOKS below).
 */
const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.05, ...o });

/** The looks of the mountain's blocks (data/montana.ts, data/bioma-island.ts). */
export const MOUNTAIN_LOOKS: Record<string, THREE.Material> = {
  "suelo-cueva": mat(0x9a8f7e),
  orilla: mat(0x8a7f70, { flatShading: true }),
  raices: mat(0x5a3d28, { flatShading: true }),
  compuerta: mat(0x6f7880, { metalness: 0.6, roughness: 0.4 }),
  "marco-compuerta": mat(0x3d4247, { metalness: 0.5, roughness: 0.5 }),
  "muelle-compuerta": mat(0x8d949a, { metalness: 0.2 }),
  pasarela: mat(0x9aa1a8, { metalness: 0.5, roughness: 0.4 }),
  "equipo-starship": mat(0xd0d5da, { metalness: 0.4, roughness: 0.5 }),
  "escotilla-starship": mat(0x3d4650, { metalness: 0.5, roughness: 0.4 }),
};

/** The lake and the Starship's water: clear and light, so the bottom shows through it. */
export const isClearWater = (id: string) => id === "lago-montana" || id.startsWith("starship-");

/** The hall: walls, roof, the lake's bed and the Starship. */
export function buildMountain(L: S3Layout): THREE.Group {
  const g = new THREE.Group();
  g.name = "nave-montana";
  const N = NAVE;
  // The rock, seen from inside: warm pale stone, a little self-lit (the light panels of its roof).
  const rock = mat(0xd9cbb0, { side: THREE.DoubleSide, emissive: 0x3a3226, flatShading: true });
  const h = N.wallTopY - N.bottomY;
  for (let side = 0; side < 4; side++) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(2 * N.half, h), rock);
    const a = (side * Math.PI) / 2;
    wall.position.set(HOLLOW.x - Math.sin(a) * N.half, N.bottomY + h / 2, HOLLOW.z - Math.cos(a) * N.half);
    wall.rotation.y = a;
    wall.name = `nave-muro-${side}`;
    g.add(wall);
  }
  // The roof: a pyramid of four faces from the walls' top to the apex.
  const roof = new THREE.ConeGeometry(N.half * Math.SQRT2, N.apexY - N.wallTopY, 4, 1, true);
  roof.rotateY(Math.PI / 4);
  const top = new THREE.Mesh(roof, mat(0xf0e8d6, { side: THREE.DoubleSide, emissive: 0x6a6150, flatShading: true }));
  top.position.set(HOLLOW.x, (N.wallTopY + N.apexY) / 2, HOLLOW.z);
  top.name = "nave-techo";
  g.add(top);
  // The lake's bottom: pale sand, seen through the clear water.
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(2 * N.half, 2 * N.half), mat(0xe6dcc0));
  bed.rotation.x = -Math.PI / 2;
  bed.position.set(HOLLOW.x, HOLLOW.floorY + 0.02, HOLLOW.z);
  g.add(bed);
  const ship = L.props.find((p) => p.kind === "lake-starship");
  if (ship?.size) g.add(starship(ship.x, ship.y, ship.z, ship.size.x / 2, ship.size.y, L.hollow.starship.deck3Y));
  return g;
}

/** The Starship (stainless steel, 9 m across at true size): its hull with the airlock's door at deck 3, nose and flaps. */
function starship(x: number, y: number, z: number, r: number, h: number, doorY: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "starship-inundado";
  const steel = mat(0xc9ced3, { metalness: 0.65, roughness: 0.35, side: THREE.DoubleSide });
  const body = 0.82 * h;
  const door = 1.4 / r;
  const band = (y0: number, y1: number, open = false) => {
    // The door (−z, the gangway's side) left open in its band: CylinderGeometry runs x = r sin θ, z = r cos θ.
    const geo = open ? new THREE.CylinderGeometry(r, r, y1 - y0, 40, 1, true, Math.PI + door, 2 * Math.PI - 2 * door) : new THREE.CylinderGeometry(r, r, y1 - y0, 40, 1, true);
    const m = new THREE.Mesh(geo, steel);
    m.position.set(x, (y0 + y1) / 2, z);
    g.add(m);
  };
  band(y, doorY);
  band(doorY, doorY + 2.6, true);
  band(doorY + 2.6, y + body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(r, h - body, 40, 1, true), steel);
  nose.position.set(x, y + body + (h - body) / 2, z);
  g.add(nose);
  const flap = (fy: number, fh: number, sx: number) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(r * 0.9, fh, 0.3), mat(0x2b2f34, { metalness: 0.4 }));
    f.position.set(x + sx * (r + r * 0.45), fy, z);
    g.add(f);
  };
  for (const sx of [-1, 1]) {
    flap(y + 0.12 * h, 0.2 * h, sx);
    flap(y + 0.8 * h, 0.12 * h, sx);
  }
  return g;
}
