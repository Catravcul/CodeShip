import * as THREE from "three";
import type { S3Layout } from "@modules/aerial-sanctuary/data/layout";
import { CORE_DEF, INNER_H, INNER_HALF, caves } from "@modules/aerial-sanctuary/data/bioma-island";
import { HOLLOW } from "@modules/aerial-sanctuary/data/montana";

/**
 * The hollow mountain seen from inside (docs/design/montana-hueca.md): the pyramid's four inner faces of earth and
 * stone, lit and pale (bright, with no shadows), the caves' holes in its south face, and the flooded Starship standing
 * in the lake: its steel hull with the airlock's door, the nose and the four flaps. The trunks and floors are blocks
 * of the layout (aerial-models.ts buildBlocks, their looks in LOOKS below).
 */
const mat = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.05, ...o });

/** The looks of the hollow's blocks (data/montana.ts). */
export const MOUNTAIN_LOOKS: Record<string, THREE.Material> = {
  "tronco-gigante": mat(0x6b4a32, { flatShading: true }),
  raices: mat(0x5a3d28, { flatShading: true }),
  "piso-arbol": mat(0xb89a72),
  riostra: mat(0x5a3d28),
  "roca-cueva": mat(0x8a7f70, { flatShading: true }),
  "suelo-cueva": mat(0x9a8f7e),
  "repisa-cueva": mat(0x7d7366, { flatShading: true }),
  pasarela: mat(0x9aa1a8, { metalness: 0.5, roughness: 0.4 }),
  "equipo-starship": mat(0xd0d5da, { metalness: 0.4, roughness: 0.5 }),
  "escotilla-starship": mat(0x3d4650, { metalness: 0.5, roughness: 0.4 }),
};

/** The lake and the Starship's water: clear and light, so the bottom shows through it. */
export const isClearWater = (id: string) => id === "lago-montana" || id.startsWith("starship-");

/** One inner face of the pyramid: a triangle in (u along its foot, y up) with holes, mapped onto its slope. */
function face(side: number, holes: readonly { u0: number; u1: number; y0: number; y1: number }[]): THREE.BufferGeometry {
  const y0 = CORE_DEF.baseY;
  const shape = new THREE.Shape([new THREE.Vector2(-INNER_HALF, y0), new THREE.Vector2(INNER_HALF, y0), new THREE.Vector2(0, y0 + INNER_H)]);
  for (const h of holes) shape.holes.push(new THREE.Path([new THREE.Vector2(h.u0, h.y0), new THREE.Vector2(h.u0, h.y1), new THREE.Vector2(h.u1, h.y1), new THREE.Vector2(h.u1, h.y0)]));
  const g = new THREE.ShapeGeometry(shape);
  const pos = g.attributes.position!;
  const turn = (side * Math.PI) / 2;
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const y = pos.getY(i);
    // The south face (side 0) at −z: its distance from the middle shrinks as it rises.
    const d = INNER_HALF * (1 - (y - y0) / INNER_H);
    const lx = u;
    const lz = -d;
    pos.setXYZ(i, HOLLOW.x + lx * c - lz * s, y, HOLLOW.z + lx * s + lz * c);
  }
  g.computeVertexNormals();
  return g;
}

export function buildMountain(L: S3Layout): THREE.Group {
  const g = new THREE.Group();
  g.name = "montana-hueca";
  // The shell, seen from inside: warm pale earth and stone, a little self-lit (the light panels of its ceiling).
  const shell = mat(0xd9cbb0, { side: THREE.DoubleSide, emissive: 0x3a3226, flatShading: true });
  const holes = caves().map((c) => {
    const u = c.to.x - CORE_DEF.x;
    return { u0: u - c.half, u1: u + c.half, y0: c.y, y1: c.y + c.vault };
  });
  for (let side = 0; side < 4; side++) {
    const m = new THREE.Mesh(face(side, side === 0 ? holes : []), shell);
    m.name = `montana-cara-${side}`;
    g.add(m);
  }
  // The lake's bottom: pale sand, seen through the clear water.
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(2 * INNER_HALF, 2 * INNER_HALF), mat(0xe6dcc0));
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
