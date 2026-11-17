import * as THREE from "three";
import type { StepAct } from "@modules/chores/domain/step-visual";
import type { RingAquarium } from "@modules/sanctuary/domain/aquarium";
import { GEAR } from "@modules/wellness/data/gear";
import type { CrewGear } from "./crew-gear";

const std = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...extra });

/** Animals the two chambers can show (the AQH kept a few medaka per chamber; snails share them). */
const MAX_FISH = 16;
const MAX_SNAILS = 12;
/**
 * Medaka up to about 3.6 cm (https://en.wikipedia.org/wiki/Japanese_rice_fish) and Biomphalaria about 1 cm across,
 * at real size like the chambers (15 × 7 × 7 cm each); the presentation scale `k` grows them all alike.
 */
export const FISH_M = 0.035;
export const SNAIL_M = 0.006;
/** The rack's face stands this far out of the wall, m (on the wall plane it would flicker into it). */
const FACE_M = 0.03;
/** Clear water between a fish and the glass, m. */
const GAP_M = 0.003;

/** A fish chamber in the unit's frame: its centre and inner half-sizes (water). */
export interface AqhChamber {
  readonly centre: THREE.Vector3;
  readonly half: THREE.Vector3;
}

/**
 * Where fish `i` swims at time `t` in its chamber, and which way it heads: a slow loop round the chamber, kept a
 * half-length plus a gap from every glass whatever way it faces, so it never swims through a wall. Pure (tested).
 */
export function fishPose(ch: AqhChamber, length: number, i: number, t: number, school: "libre" | "cristal" | "superficie"): { at: THREE.Vector3; heading: number } {
  const r = length / 2 + GAP_M;
  const ax = Math.max(0, ch.half.x - r);
  const ay = Math.max(0, ch.half.y - r);
  const az = Math.max(0, ch.half.z - r);
  const dir = i % 2 ? 1 : -1;
  const a = dir * t * (0.5 + (i % 5) * 0.08) + i * 1.7;
  // Friends come to the front glass: the loop shifts forward but stays inside.
  const fz = school === "cristal" ? 0.5 * az : 0;
  const x = Math.cos(a) * ax * (0.75 + 0.25 * ((i * 0.37) % 1));
  const z = fz + Math.sin(a) * (az - Math.abs(fz)) * 0.9;
  const y = Math.sin(a * 1.3 + i) * ay * 0.8;
  // Heading along its path (the derivative of the loop), in the chamber's x–z plane.
  const vx = -Math.sin(a) * dir;
  const vz = Math.cos(a) * dir;
  return { at: new THREE.Vector3(ch.centre.x + x, ch.centre.y + y, ch.centre.z + z), heading: Math.atan2(vx, vz) };
}

/**
 * JAXA's Aquatic Habitat (AQH) in its rack bay (docs/design/equipos.md): the unit pulled out on its tray, its two
 * fish chambers of about 15 × 7 × 7 cm with clear fronts, the LED light over each (day and night), the two video
 * cameras, the bacteria filter and the water loop, the automatic feeder. The medaka and the snails adopted from
 * the species catalogue swim and crawl inside (the domain tank says how many), at real size: the chambers are
 * small because the fish are (docs/design/equipos.md, «AQH»). Cleaning steps play here: the wiper goes across the
 * front glass, the feeder drops food, a program glows over the chamber.
 *
 * Same calls as the ring's AquariumModel (setColors, react, update), so the catalogue and the Starship use either.
 * Local frame: origin at the rack's front centre on the wall, +z out into the aisle, +y up. The rack's face stands
 * just off the wall and the unit sits a little below the rack's middle, at her eyes when she holds its handrail.
 */
export class AqhModel implements CrewGear {
  readonly kind = "aqh" as const;
  readonly root = new THREE.Group();
  /** The unit (tray, body, chambers and animals), in the rack's frame. */
  readonly unit = new THREE.Group();
  readonly feet: THREE.Vector3;
  /** Where the camera should look while she works at it (the chambers), in the model's frame. */
  readonly focus: THREE.Vector3;
  school: "libre" | "cristal" | "superficie" = "libre";
  readonly fish: THREE.InstancedMesh;
  readonly snails: THREE.InstancedMesh;
  /** Fish length drawn, m (real size × the presentation scale). */
  readonly fishLength: number;
  readonly chambers: (AqhChamber & { film: THREE.Mesh })[] = [];
  private readonly snailR: number;
  private readonly wiper: THREE.Mesh;
  private readonly flakes: THREE.Points;
  private readonly glow: THREE.Mesh;
  private readonly m = new THREE.Matrix4();
  private t = 0;
  private washT = -1;
  private flakeT = -1;
  private glowT = -1;
  /** Algae on the front glass (0…1), as last read from the tank. */
  algae = 0;

  constructor(k: number, rack: { w: number; h: number } = { w: 1.05, h: 2.0 }) {
    this.root.name = "gear-aqh";
    const W = rack.w * k;
    const H = rack.h * k;
    const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, FACE_M), std(0xb9c1ca));
    shell.position.z = FACE_M / 2;
    this.root.add(shell);
    // The unit out on its tray, at her eyes (a little below the rack's middle).
    this.unit.position.set(0, -0.2 * k, FACE_M);
    this.root.add(this.unit);
    const c = GEAR.aqh.size.value;
    const cw = c.w * k;
    const ch = c.h * k;
    const cd = c.d * k;
    const unitW = 2 * cw + 0.22;
    const bodyD = 0.12;
    const tray = new THREE.Mesh(new THREE.BoxGeometry(unitW + 0.1, 0.03, bodyD + cd + 0.06), std(0x8a929e));
    tray.position.set(0, -ch / 2 - 0.05, (bodyD + cd + 0.06) / 2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(unitW, ch + 0.16, bodyD), std(0xe6e9ec));
    body.position.set(0, 0.03, bodyD / 2);
    this.unit.add(tray, body);
    const glass = new THREE.MeshStandardMaterial({ color: 0xcfe9f2, transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false });
    const water = new THREE.MeshStandardMaterial({ color: 0x6fb8c8, transparent: true, opacity: 0.14, roughness: 0.2, depthWrite: false });
    const frameMat = std(0x5d6672);
    for (const sx of [-1, 1]) {
      const centre = new THREE.Vector3(sx * (cw / 2 + 0.04), -0.01, bodyD + cd / 2);
      const half = new THREE.Vector3(cw / 2, ch / 2, cd / 2);
      const g = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), glass);
      g.position.copy(centre);
      g.renderOrder = 2;
      const w = new THREE.Mesh(new THREE.BoxGeometry(cw - 0.004, ch - 0.004, cd - 0.004), water);
      w.position.copy(centre);
      w.renderOrder = 1;
      // The chamber's edges, so its size reads against the fish inside.
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(cw, ch, cd)), new THREE.LineBasicMaterial({ color: 0x9fb4c4 }));
      edges.position.copy(centre);
      // The LED light over the chamber and a camera at its front corner.
      const led = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.012, cd * 0.6), new THREE.MeshBasicMaterial({ color: 0xfff4d8 }));
      led.position.copy(centre).add(new THREE.Vector3(0, ch / 2 + 0.012, 0));
      const cam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.03), std(0x1d2128));
      cam.position.copy(centre).add(new THREE.Vector3(-sx * (cw / 2 + 0.02), ch / 2, cd / 2));
      const base = new THREE.Mesh(new THREE.BoxGeometry(cw + 0.01, 0.008, cd + 0.01), frameMat);
      base.position.copy(centre).add(new THREE.Vector3(0, -ch / 2 - 0.004, 0));
      const film = new THREE.Mesh(new THREE.PlaneGeometry(cw - 0.006, ch - 0.006), new THREE.MeshStandardMaterial({ color: 0x4f8a2a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      film.position.copy(centre).add(new THREE.Vector3(0, 0, cd / 2 + 0.002));
      film.renderOrder = 3;
      this.unit.add(w, g, edges, led, cam, base, film);
      this.chambers.push({ centre, half: new THREE.Vector3(cw / 2 - 0.002, ch / 2 - 0.002, cd / 2 - 0.002), film });
    }
    // The filter (bacteria) between the chambers, against the body, the loop's pipes, and the feeder on top.
    const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, ch + 0.08, 14), std(0xc8b98a));
    filter.position.set(0, 0.02, bodyD + 0.03);
    const feeder = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.05), std(0xffd27f));
    feeder.position.set(0, ch / 2 + 0.06, bodyD + 0.03);
    this.unit.add(filter, feeder);
    for (const sx of [-1, 1]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 8), std(0x9fd8ff));
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(sx * 0.06, -ch / 2 + 0.01, bodyD + 0.03);
      this.unit.add(pipe);
    }
    // The wiper (a sponge on a stick) that cleans the front glass.
    this.wiper = new THREE.Mesh(new THREE.BoxGeometry(0.03, ch * 0.8, 0.012), std(0xffd24a, { roughness: 1 }));
    this.wiper.visible = false;
    this.unit.add(this.wiper);
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
    this.flakes = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xd9a04a, size: 0.006 * k }));
    this.flakes.visible = false;
    this.unit.add(this.flakes);
    this.glow = new THREE.Mesh(new THREE.BoxGeometry(unitW, ch + 0.06, cd + 0.04), new THREE.MeshBasicMaterial({ color: 0x5ad7ff, transparent: true, opacity: 0, wireframe: true }));
    this.glow.position.set(0, -0.01, bodyD + cd / 2);
    this.unit.add(this.glow);
    // Real-size animals at the drawing scale: a medaka is a slim body with a tail fin; a snail a flat coil.
    this.fishLength = FISH_M * k;
    this.snailR = SNAIL_M * k;
    const fishG = new THREE.ConeGeometry(this.fishLength * 0.16, this.fishLength, 6);
    fishG.rotateX(Math.PI / 2);
    this.fish = new THREE.InstancedMesh(fishG, std(0xffffff, { roughness: 0.4, emissive: 0x3a1c00 }), MAX_FISH);
    this.fish.count = 0;
    this.fish.renderOrder = 1;
    this.snails = new THREE.InstancedMesh(new THREE.TorusGeometry(this.snailR, this.snailR * 0.6, 6, 10), std(0xffffff, { roughness: 0.5 }), MAX_SNAILS);
    this.snails.count = 0;
    this.unit.add(this.fish, this.snails);
    this.setColors("banco", []);
    this.setColors("caracoles", []);
    this.focus = this.unit.position.clone().add(new THREE.Vector3(0, 0, bodyD + cd / 2));
    // She floats in front of the tray, her chest at the chambers.
    this.feet = new THREE.Vector3(0, this.unit.position.y - 1.1, 0.75);
  }

  setColors(group: "banco" | "caracoles", runs: readonly { readonly n: number; readonly color: string }[]): void {
    const mesh = group === "banco" ? this.fish : this.snails;
    const max = group === "banco" ? MAX_FISH : MAX_SNAILS;
    const c = new THREE.Color();
    let i = 0;
    for (const r of runs) for (let k = 0; k < r.n && i < max; k++) mesh.setColorAt(i++, c.set(r.color));
    while (i < max) mesh.setColorAt(i++, c.set(group === "banco" ? 0xffa040 : 0x9a6a3a));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /** Solved steps at the habitat: the wiper cleans the glass, the feeder drops food, a program glows. */
  react(acts: readonly StepAct[]): void {
    for (const a of acts) {
      if (a.action === "servir" || a.action === "verter") this.flakeT = 0;
      else if (a.action === "lavar" || a.action === "revisar") this.washT = 0;
      else if (a.action === "programar") this.glowT = 0;
    }
  }

  tick(): void {}

  update(dt: number, tank: RingAquarium, _viewer?: THREE.Vector3): void {
    this.t += dt;
    const wipe = this.washT >= 0 ? Math.min(1, this.washT / 1.6) : 0;
    this.algae = tank.algae;
    for (const [i, ch] of this.chambers.entries()) {
      const fm = ch.film.material as THREE.MeshStandardMaterial;
      // The wiper clears the glass behind it as it goes across (first the left chamber, then the right).
      const done = this.washT >= 0 ? Math.max(0, Math.min(1, wipe * 2 - i)) : 0;
      fm.opacity = Math.min(0.7, tank.algae * 0.9) * (1 - done);
    }
    if (this.washT >= 0) {
      const ch = this.chambers[wipe < 0.5 ? 0 : 1]!;
      const u = (wipe * 2) % 1;
      this.wiper.visible = true;
      this.wiper.position.copy(ch.centre).add(new THREE.Vector3(-ch.half.x + u * 2 * ch.half.x, 0, ch.half.z + 0.012));
      this.washT += dt;
      if (this.washT > 1.9) {
        this.washT = -1;
        this.wiper.visible = false;
      }
    }
    // The animals that live in it (a new game: none), half in each chamber.
    this.fish.count = Math.min(MAX_FISH, tank.fishCount);
    this.snails.count = Math.min(MAX_SNAILS, tank.snailCount);
    this.school = tank.friends ? "cristal" : "libre";
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const yAxis = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < this.fish.count; i++) {
      const pose = fishPose(this.chambers[i % 2]!, this.fishLength, i, this.t, this.school);
      q.setFromAxisAngle(yAxis, pose.heading);
      this.fish.setMatrixAt(i, this.m.compose(pose.at, q, one));
    }
    this.fish.instanceMatrix.needsUpdate = true;
    const p = new THREE.Vector3();
    const r = this.snailR * 1.6;
    for (let i = 0; i < this.snails.count; i++) {
      const ch = this.chambers[i % 2]!;
      // On the chamber's floor and up its front glass, grazing slowly (in 0 g they hold on wherever they are).
      const s = ((i * 0.37 + this.t * 0.01) % 1) * 2 - 1;
      const onGlass = i % 3 === 0;
      p.set(ch.centre.x + s * (ch.half.x - r), onGlass ? ch.centre.y + Math.sin(i + this.t * 0.05) * (ch.half.y - r) : ch.centre.y - ch.half.y + this.snailR * 0.6, onGlass ? ch.centre.z + ch.half.z - this.snailR * 0.6 : ch.centre.z + (((i * 0.53) % 1) - 0.5) * (ch.half.z - r));
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), onGlass ? 0 : Math.PI / 2);
      this.snails.setMatrixAt(i, this.m.compose(p, q, one));
    }
    this.snails.instanceMatrix.needsUpdate = true;
    if (this.flakeT >= 0) {
      this.flakes.visible = true;
      const attr = this.flakes.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < 24; i++) {
        const ch = this.chambers[i % 2]!;
        attr.setXYZ(i, ch.centre.x + (((i * 0.37) % 1) - 0.5) * ch.half.x, ch.centre.y + ch.half.y - this.flakeT * 0.02 * (1 + (i % 3)), ch.centre.z + (((i * 0.61) % 1) - 0.5) * ch.half.z);
      }
      attr.needsUpdate = true;
      this.flakeT += dt;
      if (this.flakeT > 3) {
        this.flakeT = -1;
        this.flakes.visible = false;
      }
    }
    const gm = this.glow.material as THREE.MeshBasicMaterial;
    if (this.glowT >= 0) {
      gm.opacity = 0.7 * Math.max(0, 1 - this.glowT / 2) * (0.6 + 0.4 * Math.sin(this.glowT * 12));
      this.glowT = this.glowT > 2 ? -1 : this.glowT + dt;
    } else gm.opacity = 0;
  }
}
