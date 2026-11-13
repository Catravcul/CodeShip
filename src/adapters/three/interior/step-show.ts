import * as THREE from "three";
import type { StepAct } from "@modules/chores/domain/step-visual";
import { P, type CubeFigure, type PoseAngles } from "./figure";

/**
 * Solved steps acted out in the habitat (docs/design/vida-a-bordo.md, «Pasos visibles»): Doménica stands
 * at the station, makes the step's gesture and a small prop shows it (eggs cracking into a bowl, the pan
 * steaming, a watering can, a wrench with sparks…) for about two seconds.
 *
 * Performance (docs/testing.md): every prop is built once from a few shared geometries and materials and
 * reused; one `Points` of 32 particles does steam, drops, dust and sparks; no lights, no shadows. Only the
 * props of the current step are visible. `dispose()` frees it all when leaving the module.
 */

/** Spots of the galley and the mill corner (room.ts coordinates). */
export const KITCHEN_SPOTS: Readonly<Record<string, THREE.Vector3>> = {
  nevera: new THREE.Vector3(1.42, 1.1, -3.0),
  despensa: new THREE.Vector3(1.55, 1.72, -4.25),
  encimera: new THREE.Vector3(1.58, 0.94, -4.4),
  fogon: new THREE.Vector3(1.68, 1.0, -5.0),
  horno: new THREE.Vector3(1.4, 0.6, -4.0),
  molino: new THREE.Vector3(1.7, 1.12, -2.0),
  procesador: new THREE.Vector3(1.55, 0.72, -2.7),
};

/** How a station is framed while a chore shows its steps. */
export interface StepFrame {
  /** Doménica's feet and the direction she faces (yaw, figure +Z rotated). */
  readonly stand: THREE.Vector3;
  readonly yaw: number;
  readonly camera: THREE.Vector3;
  readonly look: THREE.Vector3;
  /** The challenge's own target (`objetivo`). */
  readonly target: THREE.Vector3;
  /** She steps along this axis toward the spot of each step (kitchen counters), between these limits. */
  readonly slide?: { readonly axis: "x" | "z"; readonly min: number; readonly max: number; readonly offset: number };
}

export const KITCHEN_FRAMES: Readonly<Record<"cocina" | "procesado", Omit<StepFrame, "target">>> = {
  cocina: { stand: new THREE.Vector3(1.0, 0, -4.4), yaw: Math.PI / 2, camera: new THREE.Vector3(-0.95, 2.05, -2.8), look: new THREE.Vector3(1.55, 0.95, -4.3), slide: { axis: "z", min: -5.45, max: -3.3, offset: -0.4 } },
  procesado: { stand: new THREE.Vector3(1.0, 0, -2.3), yaw: Math.PI / 2, camera: new THREE.Vector3(-1.2, 2.1, -0.9), look: new THREE.Vector3(1.5, 0.9, -2.35), slide: { axis: "z", min: -3.2, max: -1.8, offset: -0.4 } },
};

/** Food and material colours of the props (`tint` keys). */
const TINT: Readonly<Record<string, number>> = {
  huevo: 0xf5c542,
  papa: 0xe8cf8a,
  verdura: 0x5cb85c,
  fresa: 0xe0303a,
  higo: 0x6b3a5e,
  fruta: 0xe0603a,
  cacahuete: 0xb07a45,
  tofu: 0xf2ecd8,
  carne: 0xb5544a,
  masa: 0xe8d5a8,
  avena: 0xd9c49a,
  chile: 0xd92b2b,
  soja: 0xd8c27a,
  grano: 0xc9a85a,
  lenteja: 0xe07a3a,
  generico: 0xd9b38c,
  agua: 0x5fb4ff,
  polen: 0xffe04a,
  hojas: 0x4caf50,
  comida: 0x9a5a3a,
  calma: 0xff9ad5,
  pelota: 0xe04040,
  medio: 0xff6a8a,
  chispas: 0xffa030,
  botiquin: 0xffffff,
};

/** Seconds a step takes at normal pace; a queued step speeds the current one up. */
export const STEP_SECONDS = 2;
const MAX_QUEUE = 4;
const PARTICLES = 32;

type Mode = "off" | "rise" | "fall" | "burst" | "orbit" | "drift";

interface Props {
  readonly bowl: THREE.Mesh;
  readonly pot: THREE.Mesh;
  readonly plate: THREE.Mesh;
  readonly jar: THREE.Mesh;
  readonly tray: THREE.Mesh;
  readonly board: THREE.Mesh;
  readonly knife: THREE.Group;
  readonly spoon: THREE.Mesh;
  readonly shaker: THREE.Mesh;
  readonly food: readonly THREE.Mesh[];
  readonly shells: readonly THREE.Mesh[];
  readonly fridgeDoor: THREE.Group;
  readonly fridgeInside: THREE.Mesh;
  readonly ovenGlow: THREE.Mesh;
  readonly can: THREE.Group;
  readonly scissors: THREE.Group;
  readonly basket: THREE.Mesh;
  readonly ball: THREE.Mesh;
  readonly tablet: THREE.Mesh;
  readonly wrench: THREE.Group;
  readonly kit: THREE.Group;
  readonly dots: THREE.Points;
}

const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
/** 0 → 1 → 0 over [a, b]. */
const bump = (t: number, a: number, b: number) => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI));

export class StepShow {
  readonly root = new THREE.Group();
  private props?: Props;
  private readonly owned: { geos: THREE.BufferGeometry[]; mats: THREE.Material[] } = { geos: [], mats: [] };
  private foodMat?: THREE.MeshStandardMaterial;
  private dotMat?: THREE.PointsMaterial;
  private readonly queue: StepAct[] = [];
  private now: StepAct | undefined;
  private last: StepAct | undefined;
  private t = 1;
  private frameDef: StepFrame | undefined;
  private readonly feet = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly w = new THREE.Vector3();
  private readonly hand = new THREE.Vector3();
  private readonly spot = new THREE.Vector3();
  private readonly vel = new Float32Array(PARTICLES * 3);
  private readonly life = new Float32Array(PARTICLES);
  private mode: Mode = "off";
  private readonly emit = new THREE.Vector3();
  private clock = 0;
  /** 0…1: how hot the hob is (for the room's hob glow). */
  heat = 0;
  /** Steps acted out since the chore began (test hook). */
  played = 0;

  get current(): StepAct | undefined {
    return this.now ?? this.last;
  }

  /** Whether a chore is being framed with Doménica at its station. */
  get framing(): boolean {
    return this.frameDef !== undefined;
  }

  /** A chore starts at a station: frame it with Doménica there (props are built the first time). */
  begin(frame: StepFrame): void {
    this.build();
    this.frameDef = frame;
    this.feet.copy(frame.stand);
    this.played = 0;
    this.queue.length = 0;
    this.now = this.last = undefined;
    this.hideAll();
    this.root.visible = true;
  }

  play(visuals: readonly StepAct[]): void {
    if (!this.frameDef) return;
    for (const v of visuals) this.queue.push(v);
    while (this.queue.length > MAX_QUEUE) this.queue.shift();
    if (!this.now) this.next();
  }

  clear(): void {
    this.queue.length = 0;
    this.now = this.last = undefined;
    this.frameDef = undefined;
    this.heat = 0;
    this.mode = "off";
    this.root.visible = false;
    this.hideAll();
  }

  /** Frees every geometry and material (leaving the module); `begin` builds them again. */
  dispose(): void {
    this.clear();
    if (!this.props) return;
    this.root.clear();
    for (const g of this.owned.geos) g.dispose();
    for (const m of this.owned.mats) m.dispose();
    this.owned.geos.length = 0;
    this.owned.mats.length = 0;
    this.props = undefined;
  }

  /**
   * While framing: places Doménica and the camera, poses her for the step and animates its props.
   * Returns false when not framing (the caller places the camera as usual).
   */
  frame(dt: number, camera: THREE.PerspectiveCamera, rig: THREE.Object3D, figure: CubeFigure): boolean {
    const f = this.frameDef;
    if (!f || !this.props) return false;
    this.clock += dt;
    if (this.now) {
      const speed = 1 + 1.5 * this.queue.length;
      this.t += (dt * speed) / STEP_SECONDS;
      if (this.t >= 1) {
        this.last = this.now;
        this.now = undefined;
        this.t = 1;
        if (this.queue.length) this.next();
      }
    }
    const vis = this.current;
    const t = this.now ? this.t : 1;
    // She steps toward the spot of the step (along the counter), then works there.
    if (f.slide && vis) {
      const s = this.spotOf(vis, this.spot);
      const want = Math.max(f.slide.min, Math.min(f.slide.max, (f.slide.axis === "z" ? s.z : s.x) + f.slide.offset));
      const k = 1 - Math.exp(-6 * dt);
      if (f.slide.axis === "z") this.feet.z += (want - this.feet.z) * k;
      else this.feet.x += (want - this.feet.x) * k;
    }
    rig.visible = true;
    rig.position.copy(this.feet);
    rig.rotation.set(0, f.yaw, 0);
    rig.quaternion.setFromEuler(rig.rotation);
    figure.poseAngles(this.now ? gesture(vis!, t, this.clock, this.low(vis!)) : idle(vis ? this.low(vis) : false));
    figure.update(dt, 9);
    rig.updateMatrixWorld(true);
    figure.handWorld(1, this.hand);
    camera.position.copy(f.camera);
    camera.lookAt(f.look);
    const heatOn = !!vis?.heat && (this.now !== undefined || this.last === vis);
    this.heat += ((heatOn ? 1 : 0) - this.heat) * (1 - Math.exp(-3 * dt));
    if (vis) this.animate(vis, t);
    this.particles(dt);
    return true;
  }

  // --- Internals ---------------------------------------------------------------------------------

  private next(): void {
    this.now = this.queue.shift();
    this.t = 0;
    this.played++;
    this.hideAll();
  }

  /** Low targets (a cat bowl, a hen) are worked on crouching. */
  private low(v: StepAct): boolean {
    return v.place === "objetivo" && (this.frameDef?.target.y ?? 1) < 0.5;
  }

  private spotOf(v: StepAct, out: THREE.Vector3): THREE.Vector3 {
    const s = KITCHEN_SPOTS[v.place];
    return out.copy(s ?? this.frameDef!.target);
  }

  private build(): void {
    if (this.props) return;
    const geo = <G extends THREE.BufferGeometry>(g: G) => (this.owned.geos.push(g), g);
    const std = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
      this.owned.mats.push(m);
      return m;
    };
    const basic = (color: number, opacity = 1) => {
      const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
      this.owned.mats.push(m);
      return m;
    };
    const BOX = geo(new THREE.BoxGeometry(1, 1, 1));
    const CYL = geo(new THREE.CylinderGeometry(1, 0.75, 1, 12));
    const ROD = geo(new THREE.CylinderGeometry(1, 1, 1, 6));
    const BALL = geo(new THREE.SphereGeometry(1, 10, 8));
    const metal = std(0xa8b0ba, { metalness: 0.6, roughness: 0.35 });
    const dark = std(0x30343c, { metalness: 0.5 });
    const white = std(0xf4f4f0);
    const wood = std(0xa0784a);
    const green = std(0x3f9a5a);
    const red = std(0xd23a3a);
    this.foodMat = std(TINT.generico!);
    const glow = basic(0xff8a30, 0.0);
    const holo = basic(0x5ff0ff, 0.55);
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material, sx: number, sy: number, sz: number) => {
      const o = new THREE.Mesh(g, m);
      o.scale.set(sx, sy, sz);
      return o;
    };
    const group = (...parts: THREE.Object3D[]) => {
      const g = new THREE.Group();
      g.add(...parts);
      return g;
    };
    const knifeBlade = mesh(BOX, metal, 0.14, 0.006, 0.025);
    knifeBlade.position.x = 0.07;
    const knifeHandle = mesh(BOX, dark, 0.07, 0.014, 0.02);
    knifeHandle.position.x = -0.035;
    const canBody = mesh(BOX, green, 0.14, 0.12, 0.08);
    const canSpout = mesh(ROD, green, 0.008, 0.16, 0.008);
    canSpout.position.set(0.11, 0.05, 0);
    canSpout.rotation.z = -1.0;
    const bladeA = mesh(BOX, metal, 0.11, 0.004, 0.012);
    const bladeB = mesh(BOX, metal, 0.11, 0.004, 0.012);
    const wrenchBar = mesh(BOX, metal, 0.16, 0.018, 0.012);
    const wrenchHead = mesh(BOX, metal, 0.035, 0.04, 0.012);
    wrenchHead.position.x = 0.085;
    const kitBox = mesh(BOX, white, 0.16, 0.1, 0.07);
    const kitCross = mesh(BOX, red, 0.05, 0.015, 0.072);
    const kitCross2 = mesh(BOX, red, 0.015, 0.05, 0.072);
    // Fridge door, hinged on its far edge, and the lit inside it uncovers.
    const doorPanel = mesh(BOX, std(0xe8ecf0, { metalness: 0.2 }), 0.04, 1.86, 0.68);
    doorPanel.position.set(0, 0, -0.34);
    const fridgeDoor = group(doorPanel);
    fridgeDoor.position.set(1.36, 0.95, -2.66);
    const fridgeInside = mesh(BOX, basic(0xdff3ff), 0.01, 1.7, 0.6);
    fridgeInside.position.set(1.375, 0.95, -3.0);
    const ovenGlow = mesh(BOX, glow, 0.01, 0.24, 0.44);
    ovenGlow.position.set(1.43, 0.62, -4.0);
    const positions = new Float32Array(PARTICLES * 3);
    const dotsGeo = geo(new THREE.BufferGeometry());
    dotsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.dotMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.85, depthWrite: false });
    this.owned.mats.push(this.dotMat);
    const dots = new THREE.Points(dotsGeo, this.dotMat);
    dots.frustumCulled = false;
    this.props = {
      bowl: mesh(CYL, white, 0.085, 0.06, 0.085),
      pot: mesh(CYL, metal, 0.11, 0.12, 0.11),
      plate: mesh(CYL, white, 0.12, 0.014, 0.12),
      jar: mesh(CYL, std(0xd8e8f0, { transparent: true, opacity: 0.75 }), 0.04, 0.09, 0.04),
      tray: mesh(BOX, metal, 0.3, 0.012, 0.22),
      board: mesh(BOX, wood, 0.3, 0.02, 0.2),
      knife: group(knifeBlade, knifeHandle),
      spoon: mesh(ROD, metal, 0.006, 0.22, 0.006),
      shaker: mesh(CYL, white, 0.018, 0.06, 0.018),
      food: [0, 1, 2, 3].map(() => mesh(BALL, this.foodMat!, 0.03, 0.03, 0.03)),
      shells: [0, 1].map(() => mesh(BALL, white, 0.024, 0.031, 0.024)),
      fridgeDoor,
      fridgeInside,
      ovenGlow,
      can: group(canBody, canSpout),
      scissors: group(bladeA, bladeB),
      basket: mesh(CYL, wood, 0.12, 0.08, 0.12),
      ball: mesh(BALL, red, 0.04, 0.04, 0.04),
      tablet: mesh(BOX, holo, 0.22, 0.14, 0.008),
      wrench: group(wrenchBar, wrenchHead),
      kit: group(kitBox, kitCross, kitCross2),
      dots,
    };
    for (const p of Object.values(this.props)) for (const o of Array.isArray(p) ? p : [p]) this.root.add(o as THREE.Object3D);
    this.root.visible = false;
    this.hideAll();
  }

  private hideAll(): void {
    if (!this.props) return;
    for (const p of Object.values(this.props)) for (const o of Array.isArray(p) ? p : [p]) (o as THREE.Object3D).visible = false;
    // The fridge door and oven glow are part of the furniture: shown closed and dark while framing.
    this.props.fridgeDoor.rotation.y = 0;
    (this.props.ovenGlow.material as THREE.MeshBasicMaterial).opacity = 0;
    this.mode = "off";
  }

  private show<T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T {
    o.visible = true;
    o.position.set(x, y, z);
    o.rotation.set(0, 0, 0);
    return o;
  }

  /** Puts the step's props where they go at time `t` (0…1) of the step. */
  private animate(v: StepAct, t: number): void {
    const p = this.props!;
    for (const o of [p.bowl, p.pot, p.plate, p.jar, p.tray, p.board, p.knife, p.spoon, p.shaker, ...p.food, ...p.shells, p.can, p.scissors, p.basket, p.ball, p.tablet, p.wrench, p.kit]) o.visible = false;
    p.fridgeInside.visible = p.fridgeDoor.visible = p.ovenGlow.visible = false;
    p.bowl.scale.set(0.085, 0.06, 0.085);
    for (const f of p.food) f.scale.setScalar(0.04);
    for (const sh of p.shells) sh.scale.set(0.024, 0.031, 0.024);
    this.foodMat!.color.setHex(TINT[v.tint ?? "generico"] ?? TINT.generico!);
    const s = this.spotOf(v, this.spot);
    const food = p.food;
    const vessel = (): THREE.Vector3 => {
      // The vessel the step works in, at its spot; returns where food sits inside it.
      if (v.place === "fogon" && v.vessel === "olla") this.show(p.pot, s.x, s.y + 0.06, s.z);
      else if (v.place === "fogon") return this.v.set(s.x, s.y + 0.02, s.z); // the room's own pan
      else if (v.vessel === "bandeja") this.show(p.tray, s.x, s.y + 0.01, s.z);
      else if (v.vessel === "plato") this.show(p.plate, s.x, s.y + 0.01, s.z);
      else if (v.vessel === "tarro") this.show(p.jar, s.x, s.y + 0.045, s.z);
      else if (v.vessel === "tabla") this.show(p.board, s.x, s.y + 0.012, s.z);
      else this.show(p.bowl, s.x, s.y + 0.03, s.z);
      return this.v.set(s.x, s.y + (v.vessel === "olla" ? 0.1 : 0.04), s.z);
    };
    const pile = (at: THREE.Vector3, n: number, spread: number, wobble = 0) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + this.clock * wobble;
        this.show(food[i]!, at.x + Math.cos(a) * spread, at.y + Math.abs(Math.sin(this.clock * 9 + i)) * wobble * 0.01, at.z + Math.sin(a) * spread);
      }
    };
    switch (v.action) {
      case "tomar": {
        const fromFridge = v.place === "nevera";
        if (fromFridge) {
          p.fridgeDoor.visible = true;
          p.fridgeInside.visible = true;
          p.fridgeDoor.rotation.y = 1.5 * Math.min(ease(clamp01(t / 0.25)), ease(clamp01((1 - t) / 0.25)));
        }
        // From the shelf to her hand, then onto the counter.
        const counter = v.place === "objetivo" ? this.frameDef!.target : KITCHEN_SPOTS.encimera!;
        for (let i = 0; i < 2; i++) {
          const item = v.tint === "huevo" ? p.shells[i]! : food[i]!;
          const k1 = ease(clamp01((t - 0.2) / 0.3));
          const k2 = ease(clamp01((t - 0.6) / 0.35));
          const from = this.v.set(s.x + (fromFridge ? 0.15 : 0.05), s.y + i * 0.05, s.z + i * 0.06);
          const pos = from.lerp(this.hand, k1).lerp(this.w.set(counter.x, counter.y + 0.03, counter.z + i * 0.06), k2);
          this.show(item, pos.x, pos.y, pos.z);
        }
        break;
      }
      case "cascar": {
        const at = vessel();
        const crack = clamp01((t - 0.45) / 0.15);
        for (let i = 0; i < 2; i++) {
          const sh = this.show(p.shells[i]!, at.x + (i ? 0.03 : -0.03), at.y + 0.12 - 0.05 * ease(clamp01(t / 0.45)), at.z);
          sh.scale.set(0.024, 0.031, 0.024).multiplyScalar(1 - 0.6 * crack);
          sh.visible = t < 0.75;
        }
        if (t > 0.5) pile(at, 2, 0.02);
        if (t > 0.45 && t < 0.6) this.emitAt(at.x, at.y + 0.08, at.z, "fall", 0xf5c542);
        break;
      }
      case "batir":
      case "remover": {
        const at = vessel();
        pile(at, 3, 0.03, v.heat ? 1 : 0.5);
        const a = this.clock * 9;
        const spoon = this.show(p.spoon, at.x + Math.cos(a) * 0.035, at.y + 0.09, at.z + Math.sin(a) * 0.035);
        spoon.rotation.z = 0.3;
        if (v.heat) this.emitAt(at.x, at.y + 0.04, at.z, "rise", 0xffffff);
        break;
      }
      case "verter":
      case "sazonar": {
        const at = v.place === "objetivo" ? this.v.copy(s) : vessel();
        const tool = v.action === "sazonar" ? p.shaker : p.jar;
        const tip = this.show(tool, at.x, at.y + 0.2 + 0.02 * Math.sin(this.clock * (v.action === "sazonar" ? 30 : 3)), at.z);
        tip.rotation.z = v.action === "sazonar" ? Math.PI : 2.0 * bump(t, 0.1, 0.95);
        pile(at, Math.round(1 + 2 * clamp01(t / 0.8)), 0.025);
        this.emitAt(at.x, at.y + 0.15, at.z, "fall", v.action === "sazonar" ? 0x403a34 : (TINT[v.tint ?? "generico"] ?? 0xffffff));
        break;
      }
      case "calentar":
      case "hervir": {
        const at = vessel();
        pile(at, 3, 0.04, 1.5);
        this.emitAt(at.x, at.y + 0.04, at.z, "rise", 0xffffff);
        break;
      }
      case "hornear": {
        if (v.place !== "horno") {
          const at = vessel();
          pile(at, 3, 0.04, 1);
          this.emitAt(at.x, at.y + 0.04, at.z, "rise", 0xffffff);
          break;
        }
        // The tray goes from the counter into the oven, which glows while it roasts.
        const k = ease(clamp01(t / 0.35));
        const out = ease(clamp01((t - 0.8) / 0.2));
        const x = THREE.MathUtils.lerp(1.45, 1.62, k) - 0.17 * out;
        const y = THREE.MathUtils.lerp(0.95, 0.62, ease(clamp01(t / 0.2)));
        this.show(p.tray, x, y, s.z);
        pile(this.v.set(x, y + 0.02, s.z), 3, 0.05);
        p.ovenGlow.visible = true;
        (p.ovenGlow.material as THREE.MeshBasicMaterial).opacity = 0.75 * bump(t, 0.25, 1.05);
        if (t > 0.8) this.emitAt(x - 0.1, y + 0.05, s.z, "rise", 0xffffff);
        break;
      }
      case "moler": {
        if (v.place === "molino" || v.place === "procesador") {
          // Grain into the hopper, flour or slurry into the bowl below.
          this.emitAt(s.x, s.y + 0.25, s.z, "fall", TINT[v.tint ?? "grano"] ?? 0xc9a85a);
          const out = v.place === "molino" ? this.v.set(1.42, 0.83, -2.15) : this.v.set(s.x, s.y, s.z);
          this.show(p.bowl, out.x, out.y + 0.03, out.z);
          pile(this.v.set(out.x, out.y + 0.05, out.z), Math.round(1 + 2 * t), 0.02);
          break;
        }
        const at = vessel();
        pile(at, 3, 0.02 + 0.02 * (1 - t), 2);
        this.show(p.spoon, at.x, at.y + 0.08, at.z).rotation.z = 0.2 * Math.sin(this.clock * 12);
        this.emitAt(at.x, at.y + 0.05, at.z, "burst", TINT[v.tint ?? "generico"] ?? 0xffffff);
        break;
      }
      case "amasar":
      case "cortar": {
        const at = vessel();
        const cut = v.action === "cortar";
        const pieces = cut ? 1 + Math.min(3, Math.floor(t * 4)) : 1;
        for (let i = 0; i < pieces; i++) {
          const f = this.show(food[i]!, at.x - 0.06 + i * 0.04, at.y + 0.02, at.z);
          if (!cut) f.scale.set(0.06, 0.02 + 0.012 * Math.abs(Math.sin(this.clock * 7)), 0.05);
        }
        if (cut) {
          const knife = this.show(p.knife, at.x + 0.02, at.y + 0.03 + 0.05 * Math.abs(Math.sin(this.clock * 10)), at.z + 0.06);
          knife.rotation.y = Math.PI / 2;
        }
        break;
      }
      case "lavar": {
        const at = v.place === "objetivo" ? this.v.copy(s) : vessel();
        pile(at, 2, 0.025, 1);
        this.emitAt(at.x, at.y + 0.3, at.z, "fall", TINT.agua!);
        break;
      }
      case "reposar": {
        const at = vessel();
        pile(at, 2, 0.03);
        if (v.vessel !== "tarro") this.emitAt(at.x, at.y + 0.03, at.z, "rise", 0xffffff, 0.3);
        break;
      }
      case "emplatar": {
        const at = vessel();
        // From the pan (or the board) onto the plate, one piece after another.
        const from = KITCHEN_SPOTS.fogon!;
        for (let i = 0; i < 3; i++) {
          const k = ease(clamp01((t - 0.15 - i * 0.15) / 0.35));
          const x = THREE.MathUtils.lerp(from.x, at.x + (i - 1) * 0.04, k);
          const z = THREE.MathUtils.lerp(from.z, at.z, k);
          const y = THREE.MathUtils.lerp(from.y + 0.03, at.y, k) + 0.12 * Math.sin(k * Math.PI);
          this.show(food[i]!, x, y, z).visible = v.place === "objetivo" || k > 0;
        }
        break;
      }
      // --- Care --------------------------------------------------------------------------------
      case "regar": {
        const can = this.show(p.can, s.x + 0.15, s.y + 0.35, s.z);
        can.rotation.z = -0.7 * bump(t, 0.05, 0.95);
        can.rotation.y = this.frameDef!.yaw - Math.PI / 2;
        if (t > 0.15 && t < 0.85) this.emitAt(s.x, s.y + 0.3, s.z, "fall", TINT.agua!);
        break;
      }
      case "agitar":
        this.emitAt(s.x, s.y + 0.15, s.z, "drift", TINT.polen!);
        break;
      case "cosechar": {
        const sc = this.show(p.scissors, s.x, s.y + 0.1, s.z);
        sc.children[0]!.rotation.y = 0.4 * Math.abs(Math.sin(this.clock * 8));
        sc.children[1]!.rotation.y = -0.4 * Math.abs(Math.sin(this.clock * 8));
        const basket = this.v.copy(this.feet).lerp(s, 0.5).setY(this.low(v) ? 0.05 : Math.max(0.05, s.y - 0.25));
        this.show(p.basket, basket.x, basket.y, basket.z);
        const k = ease(clamp01((t - 0.3) / 0.5));
        this.show(food[0]!, THREE.MathUtils.lerp(s.x, basket.x, k), THREE.MathUtils.lerp(s.y + 0.08, basket.y + 0.05, k), THREE.MathUtils.lerp(s.z, basket.z, k));
        break;
      }
      case "servir": {
        const bowl = this.v.copy(this.feet).lerp(s, 0.65).setY(0.02);
        this.show(p.bowl, bowl.x, bowl.y + 0.02, bowl.z).scale.set(0.08, 0.04, 0.08);
        pile(this.v.set(bowl.x, bowl.y + 0.04, bowl.z), Math.round(1 + 3 * clamp01(t / 0.7)), 0.025);
        if (t < 0.7) this.emitAt(bowl.x, bowl.y + 0.35, bowl.z, "fall", TINT[v.tint ?? "comida"] ?? 0x9a5a3a);
        break;
      }
      case "mimar":
        this.emitAt(s.x, s.y + 0.15, s.z, "drift", TINT.calma!);
        break;
      case "jugar": {
        // The ball leaves her hand, arcs to the target and bounces.
        const k = clamp01((t - 0.25) / 0.6);
        const x = THREE.MathUtils.lerp(this.hand.x, s.x, k);
        const z = THREE.MathUtils.lerp(this.hand.z, s.z, k);
        const y = THREE.MathUtils.lerp(this.hand.y, 0.04, k) + 0.5 * Math.sin(k * Math.PI) + 0.08 * Math.abs(Math.sin(k * 12)) * k;
        this.show(p.ball, x, y, z);
        break;
      }
      case "programar":
      case "revisar": {
        const tab = this.show(p.tablet, s.x, s.y + 0.3 + 0.02 * Math.sin(this.clock * 2), s.z);
        tab.rotation.y = this.frameDef!.yaw - Math.PI / 2;
        this.emitAt(s.x, s.y + 0.1, s.z, v.action === "revisar" ? "orbit" : "rise", 0x5ff0ff);
        break;
      }
      case "reparar": {
        const w = this.show(p.wrench, s.x, s.y + 0.05, s.z);
        w.rotation.z = 0.8 * Math.sin(this.clock * 7);
        w.rotation.y = this.frameDef!.yaw;
        this.emitAt(s.x, s.y + 0.05, s.z, "burst", TINT.chispas!);
        break;
      }
      case "curar": {
        const kit = this.show(p.kit, s.x, s.y + 0.08, s.z);
        kit.rotation.y = this.frameDef!.yaw;
        this.emitAt(s.x, s.y + 0.15, s.z, "drift", 0x7dffb0);
        break;
      }
      case "entrenar":
        this.emitAt(this.feet.x, 1.5, this.feet.z, "rise", 0x9fd8ff, 0.4);
        break;
      default:
        break;
    }
  }

  /** Points the particle emitter at a spot with a behaviour; particles respawn there while it stays on. */
  private emitAt(x: number, y: number, z: number, mode: Mode, color: number, rate = 1): void {
    this.emit.set(x, y, z);
    if (this.mode !== mode) {
      this.mode = mode;
      this.life.fill(0);
    }
    this.dotMat!.color.setHex(color);
    this.dotMat!.size = mode === "rise" ? 0.07 : 0.04;
    this.rate = rate;
  }
  private rate = 1;

  private particles(dt: number): void {
    const dots = this.props!.dots;
    if (this.mode === "off" || !this.now) {
      // A finished step keeps no particles (the hob's glow fades on its own).
      dots.visible = false;
      this.mode = "off";
      return;
    }
    dots.visible = true;
    const pos = dots.geometry.getAttribute("position") as THREE.BufferAttribute;
    const a = pos.array as Float32Array;
    const e = this.emit;
    for (let i = 0; i < PARTICLES; i++) {
      const j = i * 3;
      this.life[i]! -= dt;
      if (this.life[i]! <= 0) {
        if (Math.random() > this.rate) continue;
        this.life[i] = 0.5 + Math.random() * 0.7;
        const r = () => Math.random() - 0.5;
        a[j] = e.x + r() * 0.06;
        a[j + 1] = e.y;
        a[j + 2] = e.z + r() * 0.06;
        const m = this.mode;
        this.vel[j] = m === "burst" ? r() * 1.6 : m === "orbit" ? i : r() * 0.08;
        this.vel[j + 1] = m === "rise" ? 0.25 + Math.random() * 0.2 : m === "burst" ? 0.6 + Math.random() * 0.6 : m === "drift" ? 0.08 : -0.3;
        this.vel[j + 2] = m === "burst" ? r() * 1.6 : r() * 0.08;
      }
      if (this.mode === "orbit") {
        const ang = this.clock * 3 + (i / PARTICLES) * Math.PI * 2;
        a[j] = e.x + Math.cos(ang) * 0.18;
        a[j + 1] = e.y + 0.1 * Math.sin(this.clock * 2 + i);
        a[j + 2] = e.z + Math.sin(ang) * 0.18;
        continue;
      }
      if (this.mode === "fall" || this.mode === "burst") this.vel[j + 1]! -= 3.5 * dt;
      if (this.mode === "drift") {
        this.vel[j]! += (Math.random() - 0.5) * 0.6 * dt;
        this.vel[j + 2]! += (Math.random() - 0.5) * 0.6 * dt;
      }
      a[j]! += this.vel[j]! * dt;
      a[j + 1]! += this.vel[j + 1]! * dt;
      a[j + 2]! += this.vel[j + 2]! * dt;
    }
    pos.needsUpdate = true;
  }
}

/** Arms over the counter, waiting for the next step (crouched by a low target). */
function idle(low: boolean): PoseAngles {
  return low ? CROUCH({ shoulderX: [-0.5, -0.5], elbow: [-0.6, -0.6] }) : P({ shoulderX: [-0.45, -0.45], elbow: [-0.9, -0.9], headX: 0.35 });
}

const CROUCH = (o: Partial<PoseAngles>): PoseAngles => P({ rootY: 0.62, torso: 0.45, headX: 0.25, hip: [-1.25, -1.25], knee: [1.9, 1.9], ...o });

/**
 * The figure's gesture for a step at time `t` (0…1), `clock` in seconds for repeated motions.
 * Arm 1 is her right arm. Shapes after Cold Sanctuary's KitchenCook.Gesture (stir in circles, cut up and down…).
 */
export function gesture(v: StepAct, t: number, clock: number, low: boolean): PoseAngles {
  const s = Math.sin(clock * 8);
  const c = Math.cos(clock * 8);
  const base = (o: Partial<PoseAngles>) => (low ? CROUCH(o) : P({ headX: 0.4, ...o }));
  switch (v.action) {
    case "tomar": {
      const up = v.place === "despensa" ? -2.3 : -1.5;
      const reach = bump(t, 0.1, 0.65);
      return base({ headX: v.place === "despensa" ? -0.2 : 0.1, shoulderX: [-0.4, -0.4 + (up + 0.4) * reach], shoulderZ: [0.08, -0.08 - 0.5 * reach], elbow: [-0.8, -0.9 * (1 - reach)] });
    }
    case "cascar":
      return base({ shoulderX: [-0.9, -0.9], shoulderZ: [0.25 + 0.2 * bump(t, 0.45, 0.7), -0.25 - 0.2 * bump(t, 0.45, 0.7)], elbow: [-1.1, -1.1] });
    case "batir":
    case "remover":
    case "calentar":
    case "hervir":
      return base({ shoulderX: [-0.6, -0.95 + 0.12 * s], shoulderZ: [0.1, -0.2 + 0.15 * c], elbow: [-1.0, -0.8] });
    case "cortar":
      return base({ shoulderX: [-0.7, -0.8], elbow: [-1.0, -1.0 + 0.45 * Math.abs(Math.sin(clock * 10))] });
    case "amasar":
      return base({ torso: 0.25, shoulderX: [-0.9 + 0.25 * s, -0.9 + 0.25 * s], elbow: [-0.6, -0.6] });
    case "verter":
      return base({ shoulderX: [-0.5, -1.3], shoulderZ: [0.08, -0.08 - 0.5 * bump(t, 0.1, 0.95)], elbow: [-0.8, -0.3] });
    case "sazonar":
      return base({ shoulderX: [-0.4, -1.4], elbow: [-0.6, -0.3 + 0.25 * Math.sin(clock * 30)] });
    case "hornear":
      return CROUCH({ shoulderX: [-1.0, -1.0], elbow: [-0.3, -0.3], headX: 0.1 });
    case "moler":
      return base({ shoulderX: [-0.5, -1.0 + 0.3 * s], shoulderZ: [0.08, -0.3 + 0.3 * c], elbow: [-0.9, -0.9] });
    case "lavar":
      return base({ shoulderX: [-0.8 + 0.1 * s, -0.8 - 0.1 * s], elbow: [-0.9, -0.9] });
    case "reposar":
      return base({ shoulderX: [0, 0], elbow: [-0.2, -0.2], headX: 0.45 });
    case "emplatar":
      return base({ shoulderX: [-0.9, -0.9 - 0.3 * bump(t, 0.1, 0.8)], elbow: [-0.7, -0.5] });
    case "regar":
      return base({ shoulderX: [-0.3, -1.3], shoulderZ: [0.08, -0.25], elbow: [-0.4, -0.4], headX: 0.2 });
    case "agitar":
      return base({ shoulderX: [-1.1 + 0.08 * Math.sin(clock * 20), -1.1 + 0.08 * Math.sin(clock * 20)], elbow: [-0.6, -0.6] });
    case "cosechar":
      return base({ shoulderX: [-1.0, -1.3], elbow: [-0.6, -0.5 + 0.2 * Math.abs(Math.sin(clock * 8))] });
    case "servir":
      return CROUCH({ shoulderX: [-1.0, -1.0], elbow: [-0.4, -0.4 - 0.2 * bump(t, 0.1, 0.7)] });
    case "mimar":
      return CROUCH({ shoulderX: [-0.3, -1.1 + 0.15 * Math.sin(clock * 3)], elbow: [-0.3, -0.2] });
    case "jugar": {
      const throwK = clamp01((t - 0.05) / 0.25);
      return base({ headX: 0, shoulderX: [-0.3, THREE.MathUtils.lerp(0.9, -2.4, ease(throwK))], elbow: [-0.4, -0.3] });
    }
    case "programar":
      return base({ headX: 0.2, shoulderX: [-1.0, -1.0], elbow: [-1.0 + 0.1 * s, -1.0 - 0.1 * s] });
    case "revisar":
      return base({ headX: 0.15 + 0.15 * Math.sin(clock * 2), headY: 0.3 * Math.sin(clock * 1.5), shoulderX: [-0.3, -1.2], elbow: [-0.3, -0.8] });
    case "reparar":
      return base({ shoulderX: [-0.6, -1.1], shoulderZ: [0.1, -0.15 + 0.3 * s], elbow: [-0.7, -0.6] });
    case "curar":
      return base({ torso: 0.35, shoulderX: [-1.0 + 0.1 * s, -1.0 - 0.1 * s], elbow: [-0.6, -0.6] });
    case "entrenar":
      return P({ shoulderX: [0.6 * s, -0.6 * s], elbow: [-1.4, -1.4], hip: [-0.5 * s, 0.5 * s], knee: [0.6 + 0.4 * c, 0.6 - 0.4 * c] });
    default:
      return base({ shoulderX: [-0.8, -0.8], elbow: [-0.8, -0.8] });
  }
}
