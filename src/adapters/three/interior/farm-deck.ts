import * as THREE from "three";
import type { Plant } from "@modules/garden/domain/plant";
import { ROOM } from "./room";

/**
 * The farm deck: a large hall behind the habitat module, with artificial soil shaped into low
 * hills, raised crop beds under an LED "sky", paths, a compost heap for the hens and a corner for
 * the chihuahuas. The ship is big enough for it; the beds feed everyone on board.
 */
export const FARM = { minX: -9, maxX: 9, minZ: ROOM.halfL, maxZ: ROOM.halfL + 18, height: 7 } as const;
/** Where free hens and the dogs wander: the lawn between the doorway and the beds. */
export const FARM_ROAM = { minX: -6, maxX: 6, minZ: ROOM.halfL + 0.9, maxZ: ROOM.halfL + 2.2 } as const;
/** Doorway from the habitat module (centre of its far wall). */
export const DOOR = { halfW: 0.5, z: ROOM.halfL } as const;

/** Bed slots: 4 × 2 beds of 3 m × 5 m (15 m² each), in order. */
export const BED_SLOTS: readonly THREE.Vector3[] = [ROOM.halfL + 5, ROOM.halfL + 11.5].flatMap((z) => [-6, -2, 2, 6].map((x) => new THREE.Vector3(x, 0, z)));
export const BED_SIZE = { x: 3, z: 5 } as const;

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

/** Height of the artificial terrain: flat where the beds and paths are, gentle hills along the walls. */
export function terrainHeight(x: number, z: number): number {
  const edge = Math.max(0, Math.abs(x) - 7.8) + Math.max(0, z - (FARM.maxZ - 1.2));
  return Math.min(1.4, edge * 0.9) + 0.06 * Math.sin(x * 1.3) * Math.sin(z * 0.9) * Math.min(1, edge);
}

export function buildFarmDeck(): THREE.Group {
  const g = new THREE.Group();
  const w = FARM.maxX - FARM.minX;
  const l = FARM.maxZ - FARM.minZ;
  const cz = (FARM.minZ + FARM.maxZ) / 2;
  // Terrain with vertex colours: grass on the hills, trodden soil on the paths.
  const geo = new THREE.PlaneGeometry(w, l, 54, 54);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position!;
  const colors: number[] = [];
  const grass = new THREE.Color(0x5f8f3e);
  const path = new THREE.Color(0x8a7454);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) + cz;
    pos.setY(i, terrainHeight(x, z));
    const onPath = Math.abs(x) < 0.9 || Math.abs(z - (ROOM.halfL + 8.25)) < 0.8;
    const c = (onPath ? path : grass).clone().offsetHSL(0, 0, 0.04 * Math.sin(x * 3.1 + z * 2.3));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.position.z = cz;
  g.add(ground);

  // Hull: walls, and an LED sky panel overhead that runs a day/night cycle.
  const wall = mat(0xb9c2cc);
  const h = FARM.height;
  g.add(box(0.1, h, l, wall, FARM.minX, h / 2, cz), box(0.1, h, l, wall, FARM.maxX, h / 2, cz), box(w, h, 0.1, wall, 0, h / 2, FARM.maxZ));
  for (const [x0, x1] of [
    [FARM.minX, -DOOR.halfW],
    [DOOR.halfW, FARM.maxX],
  ] as const)
    g.add(box(x1 - x0, h, 0.1, wall, (x0 + x1) / 2, h / 2, FARM.minZ));
  g.add(box(2 * DOOR.halfW, h - 2.1, 0.1, wall, 0, 2.1 + (h - 2.1) / 2, FARM.minZ));
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshStandardMaterial({ color: 0xbfe0ff, emissive: 0xa8d4ff, emissiveIntensity: 0.9 }));
  sky.rotation.x = Math.PI / 2;
  sky.position.set(0, h, cz);
  g.add(sky);
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sun.position.set(2, h, cz - 3);
  sun.target.position.set(0, 0, cz);
  g.add(sun, sun.target, new THREE.HemisphereLight(0xcfe6ff, 0x4a5a30, 0.8));

  // Raised beds of artificial soil with drip lines.
  const frame = mat(0x7a5a3a);
  const soil = mat(0x3d2b1d);
  const drip = mat(0x1f2a33);
  for (const s of BED_SLOTS) {
    g.add(box(BED_SIZE.x + 0.15, 0.3, BED_SIZE.z + 0.15, frame, s.x, 0.15, s.z));
    g.add(box(BED_SIZE.x, 0.02, BED_SIZE.z, soil, s.x, 0.31, s.z));
    for (const dx of [-1, 0, 1]) g.add(box(0.03, 0.03, BED_SIZE.z, drip, s.x + dx, 0.33, s.z));
  }
  // Compost heap where free hens scratch for insects.
  const compost = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x4a3622));
  compost.scale.y = 0.5;
  compost.position.set(-4, 0, ROOM.halfL + 8.25);
  g.add(compost);
  // Chihuahua corner: two small beds, bowls and a ball.
  for (const [x, c] of [
    [3.2, 0xc0504d],
    [3.9, 0x4f81bd],
  ] as const) {
    const bed = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 8, 18), mat(c));
    bed.rotation.x = Math.PI / 2;
    bed.position.set(x, 0.07, ROOM.halfL + 1.6);
    g.add(bed);
  }
  g.add(box(0.12, 0.04, 0.12, mat(0xdddddd), 4.6, 0.02, ROOM.halfL + 1.4), box(0.12, 0.04, 0.12, mat(0xdddddd), 4.85, 0.02, ROOM.halfL + 1.4));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(0xf2d32c));
  ball.position.set(2.5, 0.05, ROOM.halfL + 2.4);
  g.add(ball);
  // A couple of fruit trees on the hills.
  for (const [x, z] of [
    [-8.2, ROOM.halfL + 4],
    [8.2, ROOM.halfL + 9],
    [-8.2, ROOM.halfL + 14],
    [4, FARM.maxZ - 0.8],
  ] as const) {
    const y = terrainHeight(x, z);
    g.add(cyl(0.12, 0.16, 1.6, mat(0x6b4a2b), x, y + 0.8, z));
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), mat(0x3f7a34));
    crown.position.set(x, y + 2.1, z);
    g.add(crown);
  }
  return g;
}

function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
}
function cyl(rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 10), m);
  c.position.set(x, y, z);
  return c;
}

/** Rows of one crop filling a bed; height, colour and fruit follow the domain plant. */
export class BedModel {
  readonly root = new THREE.Group();
  private readonly crop: THREE.InstancedMesh;
  private readonly fruit?: THREE.InstancedMesh;
  private readonly mat: THREE.MeshStandardMaterial;
  private lastKey = "";

  constructor(
    readonly plant: Plant,
    at: THREE.Vector3,
  ) {
    this.root.position.copy(at).setY(0.32);
    const sp = plant.species;
    this.mat = new THREE.MeshStandardMaterial({ color: sp.color, roughness: 0.7 });
    const geo =
      sp.form === "grano" || sp.form === "hierba"
        ? new THREE.ConeGeometry(0.05, 0.6, 4)
        : sp.form === "raiz"
          ? new THREE.SphereGeometry(0.16, 6, 4)
          : sp.form === "fruto"
            ? new THREE.DodecahedronGeometry(0.22, 0)
            : new THREE.SphereGeometry(0.14, 7, 5);
    if (sp.form !== "grano" && sp.form !== "hierba") geo.translate(0, 0.1, 0);
    else geo.translate(0, 0.3, 0);
    const dense = sp.form === "grano" || sp.form === "hierba";
    const nx = dense ? 12 : 6;
    const nz = dense ? 20 : 10;
    this.crop = new THREE.InstancedMesh(geo, this.mat, nx * nz);
    const m = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = -BED_SIZE.x / 2 + (i + 0.5) * (BED_SIZE.x / nx) + (dense ? 0.04 * Math.sin(j * 7.1 + i) : 0);
        const z = -BED_SIZE.z / 2 + (j + 0.5) * (BED_SIZE.z / nz);
        m.makeRotationY((i * 13 + j * 7) % 6);
        m.setPosition(x, 0, z);
        this.crop.setMatrixAt(k++, m);
      }
    this.root.add(this.crop);
    if (sp.form === "fruto") {
      this.fruit = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 5), new THREE.MeshStandardMaterial({ color: 0xd23b2a }), nx * nz);
      k = 0;
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < nz; j++) {
          m.makeTranslation(-BED_SIZE.x / 2 + (i + 0.5) * (BED_SIZE.x / nx) + 0.12, 0.22, -BED_SIZE.z / 2 + (j + 0.5) * (BED_SIZE.z / nz));
          this.fruit.setMatrixAt(k++, m);
        }
      this.root.add(this.fruit);
    }
  }

  sync(): void {
    const p = this.plant;
    const first = p.species.harvestDays.value[0]!;
    const g = Math.min(1, p.developmentDays / first);
    const key = `${Math.round(g * 20)}|${Math.round(p.health * 10)}|${p.readyToHarvest}|${p.alive && !p.finished}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.crop.visible = p.alive && !p.finished;
    const s = 0.15 + 0.85 * g;
    this.crop.scale.set(1, s, 1);
    this.mat.color.set(p.species.color).lerp(new THREE.Color(p.species.form === "grano" && p.readyToHarvest ? 0xd9b24a : 0x7a6a3a), p.species.form === "grano" && p.readyToHarvest ? 0.8 : 1 - p.health);
    if (this.fruit) this.fruit.visible = this.crop.visible && (p.readyToHarvest || g > 0.8);
  }
}
