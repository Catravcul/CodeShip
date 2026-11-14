import * as THREE from "three";
import type { Plant } from "@modules/garden/domain/plant";
import { ROOM } from "./room";
import { textSign } from "./sign";

/**
 * The farm deck: a large hall behind the habitat module, with raised crop beds under an LED
 * "sky", fruit trees in planters, a turf mat for the animals, a compost heap for the hens and a corner for
 * the chihuahuas. The ship is big enough for it; the beds feed everyone on board.
 */
export const FARM = { minX: -9, maxX: 9, minZ: ROOM.halfL, maxZ: ROOM.halfL + 18, height: 7 } as const;
/** Where free hens and the dogs wander: the lawn between the doorway and the beds. */
export const FARM_ROAM = { minX: -6, maxX: 6, minZ: ROOM.halfL + 0.9, maxZ: ROOM.halfL + 2.2 } as const;
/** Doorway from the habitat module (centre of its far wall). */
export const DOOR = { halfW: 0.5, z: ROOM.halfL } as const;

/**
 * Bed slots, in order: two rows of 4 beds of 3 m × 5 m (15 m² each) and, at the far wall, a third
 * row of 3 beds turned sideways (5 m along x). Paths: 1 m between rows, the lawn by the doorway.
 */
export const BED_SLOTS: readonly THREE.Vector3[] = [
  ...[ROOM.halfL + 5, ROOM.halfL + 11].flatMap((z) => [-6, -2, 2, 6].map((x) => new THREE.Vector3(x, 0, z))),
  ...[-5.25, 0, 5.25].map((x) => new THREE.Vector3(x, 0, ROOM.halfL + 16)),
];
/** Yaw of each bed slot: the far row is turned a quarter turn. */
export const BED_YAW: readonly number[] = BED_SLOTS.map((_, i) => (i >= 8 ? Math.PI / 2 : 0));
export const BED_SIZE = { x: 3, z: 5 } as const;
/** Planters for the fruit trees, along the side walls. */
export const TREE_SLOTS: readonly THREE.Vector3[] = [
  [-8.4, ROOM.halfL + 4.5],
  [8.4, ROOM.halfL + 8],
  [-8.4, ROOM.halfL + 11.5],
  [8.4, ROOM.halfL + 15],
].map(([x, z]) => new THREE.Vector3(x, 0, z));

const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

/** The deck is flat: crops grow in raised beds and trees in planters, so no loose soil is needed. */
export function terrainHeight(_x: number, _z: number): number {
  return 0;
}

export function buildFarmDeck(): THREE.Group {
  const g = new THREE.Group();
  const w = FARM.maxX - FARM.minX;
  const l = FARM.maxZ - FARM.minZ;
  const cz = (FARM.minZ + FARM.maxZ) / 2;
  // Metal deck plates, and one turf mat where the hens and dogs roam (they need somewhere soft
  // to scratch and run; it is the only "lawn" on board).
  g.add(box(w, 0.02, l, mat(0x8d969e, { roughness: 0.6, metalness: 0.3 }), 0, -0.01, cz));
  for (let x = FARM.minX + 1.5; x < FARM.maxX; x += 1.5) g.add(box(0.015, 0.005, l, mat(0x6d757c), x, 0.002, cz));
  for (let z = FARM.minZ + 1.5; z < FARM.maxZ; z += 1.5) g.add(box(w, 0.005, 0.015, mat(0x6d757c), 0, 0.002, z));
  const rw = FARM_ROAM.maxX - FARM_ROAM.minX + 1;
  const rl = FARM_ROAM.maxZ - FARM_ROAM.minZ + 0.8;
  g.add(box(rw, 0.03, rl, mat(0x5f8f3e), (FARM_ROAM.minX + FARM_ROAM.maxX) / 2, 0.015, (FARM_ROAM.minZ + FARM_ROAM.maxZ) / 2));

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
  BED_SLOTS.forEach((s, i) => {
    const bed = new THREE.Group();
    bed.position.copy(s);
    bed.rotation.y = BED_YAW[i]!;
    bed.add(box(BED_SIZE.x + 0.15, 0.3, BED_SIZE.z + 0.15, frame, 0, 0.15, 0));
    bed.add(box(BED_SIZE.x, 0.02, BED_SIZE.z, soil, 0, 0.31, 0));
    for (const dx of [-1, 0, 1]) bed.add(box(0.03, 0.03, BED_SIZE.z, drip, dx, 0.33, 0));
    g.add(bed);
  });
  // Compost heap where free hens scratch for insects.
  const compost = new THREE.Mesh(new THREE.SphereGeometry(0.65, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x4a3622));
  compost.scale.y = 0.5;
  compost.position.set(-4, 0, ROOM.halfL + 8);
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
  // Big planters along the walls; the fig trees in them are real plants (TreeModel).
  for (const t of TREE_SLOTS) g.add(cyl(0.55, 0.45, 0.7, frame, t.x, 0.35, t.z), cyl(0.5, 0.5, 0.02, soil, t.x, 0.71, t.z));
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

/** A sign that always faces the camera, for naming beds. */
export { textSign };

/** A plant drawn on the farm deck: a bed of one crop or a fruit tree in its planter. */
export interface FarmPlantModel {
  readonly plant: Plant;
  readonly root: THREE.Object3D;
  /** Where Doménica stands to work on it. */
  readonly stand: THREE.Vector3;
  sync(): void;
}

/** Models for the farm deck's plants: beds fill BED_SLOTS in order, trees fill TREE_SLOTS. */
export function farmModels(plants: readonly Plant[]): FarmPlantModel[] {
  const beds = plants.filter((p) => !p.isTree);
  const trees = plants.filter((p) => p.isTree);
  return [
    ...beds.map((p, i) => new BedModel(p, BED_SLOTS[i % BED_SLOTS.length]!, BED_YAW[i % BED_SLOTS.length]!)),
    ...trees.map((p, i) => new TreeModel(p, TREE_SLOTS[i % TREE_SLOTS.length]!)),
  ];
}

/** Rows of one crop filling a bed; height, colour and fruit follow the domain plant. */
export class BedModel implements FarmPlantModel {
  readonly root = new THREE.Group();
  readonly stand: THREE.Vector3;
  private readonly crop: THREE.InstancedMesh;
  private readonly fruit?: THREE.InstancedMesh;
  private readonly mat: THREE.MeshStandardMaterial;
  private lastKey = "";

  constructor(
    readonly plant: Plant,
    at: THREE.Vector3,
    yaw = 0,
  ) {
    this.root.position.copy(at).setY(0.32);
    this.root.rotation.y = yaw;
    // Beside a bed of the long rows; in front of a bed turned sideways.
    this.stand = at.clone().setY(0).add(yaw ? new THREE.Vector3(0, 0, -(BED_SIZE.x / 2 + 0.5)) : new THREE.Vector3(1.9, 0, 0));
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
    const label = textSign(`${sp.name} · ${plant.areaM2} m²`);
    label.position.set(0, 1.5, -BED_SIZE.z / 2);
    this.root.add(label);
    if (sp.form === "fruto") {
      this.fruit = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 5), new THREE.MeshStandardMaterial({ color: sp.fruitColor ?? 0xd23b2a }), nx * nz);
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

/** A fig tree in its planter: the crown grows and the figs show as the domain plant ripens. */
export class TreeModel implements FarmPlantModel {
  readonly root = new THREE.Group();
  readonly stand: THREE.Vector3;
  private readonly crown: THREE.Mesh;
  private readonly crownMat: THREE.MeshStandardMaterial;
  private readonly fruit = new THREE.Group();
  private lastKey = "";

  constructor(
    readonly plant: Plant,
    at: THREE.Vector3,
  ) {
    this.root.position.copy(at).setY(0.72);
    this.stand = at.clone().setY(0).add(new THREE.Vector3(-Math.sign(at.x) * 1.0, 0, 0));
    const sp = plant.species;
    this.root.add(cyl(0.1, 0.14, 1.4, mat(0x6b5a48), 0, 0.7, 0));
    this.crownMat = mat(sp.color, { roughness: 0.75, flatShading: true });
    this.crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), this.crownMat);
    this.crown.position.y = 1.9;
    this.crown.scale.set(1.15, 0.85, 1.15);
    this.root.add(this.crown);
    const figMat = mat(sp.fruitColor ?? 0x5b2a4a, { roughness: 0.6 });
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4;
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), figMat);
      f.scale.y = 1.3;
      const r = 0.9 + 0.08 * (i % 3);
      f.position.set(Math.cos(a) * r, 1.5 + 0.7 * (((i * 37) % 10) / 10), Math.sin(a) * r);
      this.fruit.add(f);
    }
    this.root.add(this.fruit);
    const label = textSign(`${sp.name} · ${plant.areaM2.toLocaleString("es")} m²`);
    label.position.set(0, 3.1, 0);
    this.root.add(label);
  }

  sync(): void {
    const p = this.plant;
    const next = p.species.harvestDays.value[0]!;
    const g = Math.min(1, p.developmentDays / next);
    const key = `${Math.round(g * 20)}|${Math.round(p.health * 10)}|${p.readyToHarvest}|${p.alive && !p.finished}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const s = 0.6 + 0.4 * g;
    this.crown.scale.set(1.15 * s, 0.85 * s, 1.15 * s);
    this.crownMat.color.set(p.species.color).lerp(new THREE.Color(0x7a6a3a), p.alive ? 1 - p.health : 1);
    this.fruit.visible = p.readyToHarvest;
  }
}
