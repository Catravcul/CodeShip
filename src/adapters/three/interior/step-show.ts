import * as THREE from "three";
import type { StepAct } from "@modules/chores/domain/step-visual";
import { P, type CubeFigure, type PoseAngles } from "./figure";
import { GALLEY } from "./room";

/**
 * Solved steps acted out in the habitat (docs/design/vida-a-bordo.md, «Pasos visibles»): Doménica stands
 * at the station, makes the step's gesture and a small prop shows it (eggs cracking into a bowl, the pan
 * steaming, a watering can, a wrench with sparks…) for about two seconds.
 *
 * Performance (docs/testing.md): every prop is built once from a few shared geometries and materials and
 * reused; one `Points` of 32 particles does steam, drops, dust and sparks; no lights, no shadows. Only the
 * props of the current step are visible. `dispose()` frees it all when leaving the module.
 */

/** A spot of the galley or the mill corner, where a kitchen step happens (kitchen-visuals.ts). */
export type KitchenSpot = "nevera" | "despensa" | "encimera" | "fogon" | "horno" | "molino" | "procesador";

/**
 * Where the galley's things are, in world coordinates: the spots where steps happen and the furniture the
 * props use (fridge door, oven door, the mill's spout, the counter). Built from the room's own layout
 * (`GALLEY`, room.ts) through `at` (the room's transform), so the props follow the furniture whatever the
 * room's scale (src/core/scale.ts), instead of fixed offsets.
 */
export interface KitchenLayout {
  readonly spots: Readonly<Record<KitchenSpot, THREE.Vector3>>;
  /** Counter front edge (x), worktop height (y) and its ends (z). */
  readonly counter: { readonly front: number; readonly top: number; readonly z0: number; readonly z1: number };
  /** Fridge door hinge (its −z edge, the counter side, on the aisle face: it opens away from the camera), door height and width. */
  readonly fridgeHinge: THREE.Vector3;
  readonly fridgeDoor: { readonly h: number; readonly w: number };
  /** Oven door centre (the glow) and the oven's inside centre. */
  readonly ovenDoor: THREE.Vector3;
  readonly ovenInside: THREE.Vector3;
  /** Where the mill's flour falls (a bowl on its top, under the hopper's side). */
  readonly millOut: THREE.Vector3;
}

/** The galley layout from room.ts' `GALLEY`, through `at` (room → world). */
export function kitchenLayout(at: (v: THREE.Vector3) => THREE.Vector3 = (v) => v): KitchenLayout {
  const G = GALLEY;
  const W = (x: number, y: number, z: number) => at(new THREE.Vector3(x, y, z));
  const fr = G.fridge;
  const frFront = fr.centre.x - fr.w / 2;
  const top = G.counter.top;
  const c0 = W(G.counter.front, top, G.counter.z0);
  const c1 = W(G.counter.front, top, G.counter.z1);
  return {
    spots: {
      nevera: W(frFront + 0.04, 1.1, fr.centre.z),
      despensa: W(G.cupboard.front - 0.03, G.cupboard.bottom + 0.12, -4.25),
      encimera: W(G.counter.front + 0.2, top, -4.4),
      fogon: W(G.hob.x, G.hob.y + 0.048, G.hob.z),
      horno: W(G.oven.door - 0.05, G.oven.centre.y, G.oven.centre.z),
      molino: W(G.mill.hopper.x, G.mill.hopper.y + 0.17, G.mill.hopper.z),
      procesador: W(G.processor.centre.x - G.processor.w / 2 + 0.01, G.processor.centre.y + G.processor.h / 2 + 0.02, G.processor.centre.z),
    },
    counter: { front: c0.x, top: c0.y, z0: Math.min(c0.z, c1.z), z1: Math.max(c0.z, c1.z) },
    fridgeHinge: W(frFront - 0.02, fr.centre.y, fr.centre.z - fr.d / 2),
    fridgeDoor: { h: fr.h - 0.04, w: fr.d - 0.02 },
    ovenDoor: W(G.oven.door - 0.02, G.oven.centre.y + 0.02, G.oven.centre.z),
    ovenInside: W(G.oven.centre.x, G.oven.centre.y, G.oven.centre.z),
    millOut: W(G.mill.centre.x - G.mill.w / 2 + 0.08, G.mill.centre.y + G.mill.h / 2, G.mill.centre.z - 0.12),
  };
}

/** The unscaled galley (tests and the default when a frame brings none). */
const DEFAULT_KITCHEN = kitchenLayout();
export const KITCHEN_SPOTS: Readonly<Record<KitchenSpot, THREE.Vector3>> = DEFAULT_KITCHEN.spots;

/** A prop on the challenge's target sits this much toward her from its centre (its near face)… */
const TARGET_INSET = 0.12;
/** …and never farther than this from her feet (m, on the floor), so it is within her reach. */
const TARGET_MAX = 0.7;
/** What she holds or works in at a target (a bowl, the tablet) is this far in front of her (m): at her hands. */
const HANDS_AHEAD = 0.35;
/** Actions that work in a vessel (bowl, board, tablet): at a target they happen at her hands. */
const USES_VESSEL: ReadonlySet<string> = new Set(["cascar", "batir", "remover", "calentar", "hervir", "hornear", "moler", "amasar", "cortar", "lavar", "reposar", "emplatar", "sazonar", "programar", "revisar", "tomar"]);
/** The floor bowl with its contents as a box (centre height and half size, m) for the clearance rule… */
const BOWL_BOX = new THREE.Vector3(0, 0.07, 0);
const BOWL_HALF = new THREE.Vector3(0.11, 0.06, 0.11);
/** …and where else it may go when the first spot is taken: distances from her feet and turns from her target (rad), her right hand first. */
const BOWL_RINGS = [0.45, 0.38, 0.55];
const BOWL_FAN = [0, -0.45, 0.45, -0.9, 0.9, -1.3, 1.3];
/** Actions done at a target with something held in her right hand. */
const IN_HAND: ReadonlySet<string> = new Set(["reparar", "reposar"]);
/** At the fridge she stands this much farther back (m). */
const FRIDGE_STEP_BACK = 0.25;

/** How a station is framed while a chore shows its steps. */
export interface StepFrame {
  /**
   * Doménica's feet and the direction she faces (yaw, figure +Z rotated). Heights (work surface, a low
   * target, the floor bowl) count from her feet: 0 on the ring's floor, the foot loops' height in 0 g.
   */
  readonly stand: THREE.Vector3;
  readonly yaw: number;
  readonly camera: THREE.Vector3;
  readonly look: THREE.Vector3;
  /** The challenge's own target (`objetivo`). */
  readonly target: THREE.Vector3;
  /**
   * She steps along this axis to the spot of each step (the galley's counter, the fridge and the mill
   * are one run of furniture), between these limits; the camera keeps its offset from her.
   */
  readonly slide?: { readonly axis: "x" | "z"; readonly min: number; readonly max: number };
  /** The galley, for kitchen steps (spots, fridge, oven, mill). */
  readonly kitchen?: KitchenLayout;
  /** The camera's offset from what it looks at, in drawn metres (it follows the step's spot): the galley. */
  readonly orbit?: THREE.Vector3;
  /**
   * Her whole orientation when «down» is not the deck (0 g: on a mat strapped to a wall her feet are on the wall):
   * replaces `yaw`. Only in frames drawn 1:1 (the 0 g modules).
   */
  readonly orient?: THREE.Quaternion;
  /** The camera's «up» (on a wall mat, out of the wall: the mat reads as the floor on screen). */
  readonly cameraUp?: THREE.Vector3;
}

/**
 * A frame given in real metres, as drawn with the floor plan `k` times bigger (x and z; heights kept): the
 * ring is drawn at 1,5 by its `PlanCamera` (plan-camera.ts) while its logic stays in real metres.
 */
export function drawnFrame(f: StepFrame, k: number): StepFrame {
  const D = (v: THREE.Vector3) => new THREE.Vector3(v.x * k, v.y, v.z * k);
  const look = D(f.look);
  const kitchen = f.kitchen;
  const target = D(f.target);
  // She is drawn at real size: at the galley she stands as far from the counter's (drawn) edge as at 1×.
  // Elsewhere the frame already keeps her clear of the (drawn bigger) machine, so her spot scales with it.
  const stand = kitchen ? D(f.stand).setX(kitchen.counter.front * k - (kitchen.counter.front - f.stand.x)) : D(f.stand);
  return {
    ...f,
    stand,
    look,
    camera: f.orbit ? look.clone().add(f.orbit) : D(f.camera),
    target,
    ...(f.slide ? { slide: { axis: f.slide.axis, min: f.slide.min * k, max: f.slide.max * k } } : {}),
    ...(kitchen
      ? {
          kitchen: {
            spots: Object.fromEntries(Object.entries(kitchen.spots).map(([id, v]) => [id, D(v)])) as Record<KitchenSpot, THREE.Vector3>,
            counter: { front: kitchen.counter.front * k, top: kitchen.counter.top, z0: kitchen.counter.z0 * k, z1: kitchen.counter.z1 * k },
            fridgeHinge: D(kitchen.fridgeHinge),
            fridgeDoor: { h: kitchen.fridgeDoor.h, w: kitchen.fridgeDoor.w * k },
            ovenDoor: D(kitchen.ovenDoor),
            ovenInside: D(kitchen.ovenInside),
            millOut: D(kitchen.millOut),
          },
        }
      : {}),
  };
}

/** Camera offset from the spot being worked at in the galley (m): back across the aisle, up, and to her right. */
const GALLEY_CAMERA = new THREE.Vector3(-1.7, 1.0, 1.4);

/**
 * The galley and the mill corner, framed as one run of furniture: she faces the counter (+x) and walks
 * along it to each step's spot, and the camera follows her over her left shoulder. `focus` is where she
 * starts (the station's look point).
 */
export function galleyFrame(k: KitchenLayout, focus: THREE.Vector3): StepFrame {
  const zs = Object.values(k.spots).map((v) => v.z);
  const stand = new THREE.Vector3(k.counter.front - 0.38, 0, focus.z);
  // The camera looks at the spot of the step from behind her right shoulder (her working hand side):
  // her body does not come between it and the counter.
  const look = new THREE.Vector3(k.counter.front + 0.15, k.counter.top, focus.z);
  return {
    stand,
    yaw: Math.PI / 2,
    camera: look.clone().add(GALLEY_CAMERA),
    look,
    orbit: GALLEY_CAMERA,
    target: focus.clone(),
    slide: { axis: "z", min: Math.min(...zs) - 0.45, max: Math.max(...zs) + 0.2 },
    kitchen: k,
  };
}

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
  /** A space-food package (an ISS-type rehydratable or retort pouch): space-galley-visuals.ts. */
  readonly pouch: THREE.Mesh;
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
  /** Going to sleep in a crew quarter: the bag round her, its zip pull and the quarter's light switch panel. */
  readonly bag: THREE.Mesh;
  readonly zip: THREE.Mesh;
  readonly lamp: THREE.Mesh;
  readonly dots: THREE.Points;
}

/** Acts done in a crew quarter's bag: she turns her back to the wall it is strapped to (modules/wellness/data/sleep.ts). */
const IN_BAG: ReadonlySet<string> = new Set(["saco", "luz", "dormir"]);
/** A crew quarter's act: she floats by the bag on its wall, facing out of the quarter (and the camera). */
const inQuarter = (v: StepAct) => IN_BAG.has(v.action) || v.vessel === "saco";
/** Her feet off the wall the bag hangs on, drawn metres, while she is in it. */
const BAG_OFF_WALL = 0.35;

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
  /** The frame as given (real metres)… */
  private frameDef: StepFrame | undefined;
  /**
   * …and as drawn (`drawnFrame`, plan scale `ds`): every position below (her feet, her hands, the spots,
   * the props) is in drawn metres, so a prop sits at her hand on screen whatever the ring's scale. The
   * props' root is counter-scaled, so its local space is the drawn one.
   */
  private df: StepFrame | undefined;
  private ds = 1;
  private readonly feet = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly w = new THREE.Vector3();
  private readonly hand = new THREE.Vector3();
  private readonly otherHand = new THREE.Vector3();
  private readonly hands = new THREE.Vector3();
  private lastFigure: CubeFigure | undefined;
  private readonly spot = new THREE.Vector3();
  /** Where the previous step happened (food is plated from there). */
  private readonly from = new THREE.Vector3();
  private hasFrom = false;
  /** Her working hand's offset from her feet along the slide axis (she stands so it is over the spot). */
  private reach = 0;
  private readonly camOffset = new THREE.Vector3();
  /** What the camera looks at: the frame's look point, or (walking along the galley) the step's spot. */
  private readonly focus = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private readonly vel = new Float32Array(PARTICLES * 3);
  private readonly life = new Float32Array(PARTICLES);
  private mode: Mode = "off";
  private readonly emit = new THREE.Vector3();
  private clock = 0;
  /** 0…1: how hot the hob is (for the room's hob glow). */
  heat = 0;
  /** Steps acted out since the chore began (test hook). */
  played = 0;
  /**
   * Her pose is set by the caller (a yoga asana, the lotus of the settings): the stage only places her and the
   * camera, and the audit reads the asana or the exercise motion she is in as the step's gesture.
   */
  holdPose = false;
  /**
   * Set by the room: whether a box (world centre and half size, real metres) is clear of the scene's solid
   * geometry (furniture, walls, the animals). The rule (PX-20): a prop set down on the floor never goes
   * into anything; without it the default spot is used.
   */
  clearOf?: (centre: THREE.Vector3, half: THREE.Vector3) => boolean;
  /** Where this step's floor bowl was set down (drawn metres), once chosen clear of the scene. */
  private readonly bowlSpot = new THREE.Vector3();
  private hasBowlSpot = false;

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
    this.drawWith(this.ds);
    // Her right hand (arm 1) is 0,25 m to her right: +z when she faces +x.
    this.reach = frame.slide?.axis === "x" ? -0.25 * Math.cos(frame.yaw) : 0.25 * Math.sin(frame.yaw);
    this.hasFrom = false;
    this.played = 0;
    this.queue.length = 0;
    this.now = this.last = undefined;
    this.hideAll();
    this.root.visible = true;
  }

  /** Draws the frame at plan scale `k`: her feet, the camera and the galley's furniture-bound props. */
  private drawWith(k: number): void {
    const f = this.frameDef!;
    const d = (this.df = drawnFrame(f, k));
    this.ds = k;
    this.root.scale.set(1 / k, 1, 1 / k);
    this.feet.copy(d.stand);
    this.camOffset.copy(d.camera).sub(d.look);
    this.focus.copy(d.look);
    const kd = d.kitchen ?? drawnFrame({ ...f, kitchen: DEFAULT_KITCHEN }, k).kitchen!;
    const door = this.props!.fridgeDoor;
    door.position.copy(kd.fridgeHinge);
    door.children[0]!.scale.set(0.04, kd.fridgeDoor.h, kd.fridgeDoor.w);
    door.children[0]!.position.set(0, 0, kd.fridgeDoor.w / 2);
    this.props!.fridgeInside.position.set(kd.fridgeHinge.x + 0.015, kd.fridgeHinge.y, kd.fridgeHinge.z + kd.fridgeDoor.w / 2);
    this.props!.fridgeInside.scale.z = kd.fridgeDoor.w - 0.08;
    this.props!.ovenGlow.position.copy(kd.ovenDoor);
    this.props!.ovenGlow.scale.z = 0.44 * k;
  }

  play(visuals: readonly StepAct[]): void {
    if (!this.frameDef) return;
    // Away from the ring's galley (the station's compact galley, a machine) a galley spot is the target itself.
    const here = this.frameDef.kitchen ? undefined : "objetivo";
    for (const v of visuals) this.queue.push(here && v.place !== here ? { ...v, place: here } : v);
    while (this.queue.length > MAX_QUEUE) this.queue.shift();
    if (!this.now) this.next();
  }

  clear(): void {
    this.holdPose = false;
    this.queue.length = 0;
    this.now = this.last = undefined;
    this.frameDef = this.df = undefined;
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
  frame(dt: number, camera: THREE.PerspectiveCamera & { planScale?: number }, rig: THREE.Object3D, figure: CubeFigure): boolean {
    if (!this.frameDef || !this.props) return false;
    const k = camera.planScale ?? 1;
    if (k !== this.ds || !this.df) this.drawWith(k);
    const f = this.df!;
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
    // She steps along the counter until her working hand is over the step's spot, then works there.
    if (f.slide && vis) {
      const s = this.spotOf(vis, this.spot);
      const want = Math.max(f.slide.min, Math.min(f.slide.max, (f.slide.axis === "z" ? s.z : s.x) - this.reach));
      const ease6 = 1 - Math.exp(-6 * dt);
      if (f.slide.axis === "z") this.feet.z += (want - this.feet.z) * ease6;
      else this.feet.x += (want - this.feet.x) * ease6;
      // At the fridge she stands back the door's width, so her reach stops at the open door, not inside it.
      const back = vis.place === "nevera" ? FRIDGE_STEP_BACK : 0;
      const across = f.slide.axis === "z" ? "x" : "z";
      const toward = f.slide.axis === "z" ? Math.sin(f.yaw) : Math.cos(f.yaw);
      const wantAcross = f.stand[across] - back * toward;
      this.feet[across] += (wantAcross - this.feet[across]) * ease6;
    }
    // In a crew quarter's bag she floats with her back to the wall it is strapped to, facing the camera.
    const inBag = !!vis && inQuarter(vis);
    if (!f.slide) {
      const want = inBag ? this.tmp.copy(f.stand).sub(f.target).setY(0).normalize().multiplyScalar(BAG_OFF_WALL).add(f.target).setY(f.stand.y) : this.tmp.copy(f.stand);
      this.feet.lerp(want, 1 - Math.exp(-6 * dt));
    }
    rig.visible = true;
    rig.position.set(this.feet.x / k, this.feet.y, this.feet.z / k);
    if (f.orient) rig.quaternion.copy(f.orient);
    else {
      rig.rotation.set(0, inBag ? f.yaw + Math.PI : f.yaw, 0);
      rig.quaternion.setFromEuler(rig.rotation);
    }
    if (!this.holdPose) figure.poseAngles(this.now ? gesture(vis!, t, this.clock, this.low(vis!)) : idle(vis ? this.low(vis) : false));
    figure.update(dt, 9);
    rig.updateMatrixWorld(true);
    // Her hands as drawn (her figure is counter-scaled: drawn at real size where she stands).
    figure.handWorld(1, this.hand).multiply(this.tmp.set(k, 1, k));
    figure.handWorld(0, this.otherHand).multiply(this.tmp.set(k, 1, k));
    // The camera keeps its place over her shoulder as she walks along the counter.
    if (f.slide && vis) {
      // Along the galley the camera keeps its offset from the step's spot (at work height), so the spot,
      // her hands and the props are in the strip above the sheet, seen past her right shoulder.
      const s = this.spotOf(vis, this.spot);
      this.tmp.set(s.x, this.feet.y + Math.max(0.75, Math.min(1.15, s.y - this.feet.y)), s.z);
      this.focus.lerp(this.tmp, 1 - Math.exp(-4 * dt));
    }
    // In real metres for the PlanCamera, which draws them back at this place.
    camera.position.set((this.focus.x + this.camOffset.x) / k, this.focus.y + this.camOffset.y, (this.focus.z + this.camOffset.z) / k);
    if (f.cameraUp) camera.up.copy(f.cameraUp);
    camera.lookAt(this.tmp.set(this.focus.x / k, this.focus.y, this.focus.z / k));
    this.lastFigure = figure;
    const heatOn = !!vis?.heat && (this.now !== undefined || this.last === vis);
    this.heat += ((heatOn ? 1 : 0) - this.heat) * (1 - Math.exp(-3 * dt));
    if (vis) this.animate(vis, t);
    this.particles(dt);
    return true;
  }

  /**
   * What is on stage now, for the animation audit (tools/experiencia/animaciones.mjs, step-audit.ts):
   * the step, how far it has played, her feet and hands, the spot it happens at, the visible props and
   * how far her pose is from waiting (0 = no gesture).
   */
  snapshot(): StepSnapshot | undefined {
    const f = this.df;
    const vis = this.current;
    if (!f || !this.props || !vis) return undefined;
    const p = this.props;
    const props: { name: string; object: THREE.Object3D }[] = [];
    for (const [name, o] of Object.entries(p)) {
      if (name === "dots" || name === "fridgeInside") continue;
      for (const [i, x] of (Array.isArray(o) ? o : [o]).entries()) {
        const obj = x as THREE.Object3D;
        // The fridge door and the oven glow are furniture moving, not props brought in.
        if (!obj.visible || name === "ovenGlow" || name === "fridgeDoor") continue;
        props.push({ name: Array.isArray(o) ? `${name}${i}` : name, object: obj });
      }
    }
    const low = this.low(vis);
    return {
      act: vis,
      playing: !!this.now,
      t: this.now ? this.t : 1,
      played: this.played,
      feet: this.feet.clone(),
      yaw: inQuarter(vis) ? f.yaw + Math.PI : f.yaw,
      hands: [this.otherHand.clone(), this.hand.clone()],
      spot: this.spotOf(vis, new THREE.Vector3()),
      props,
      particles: this.props.dots.visible ? this.emit.clone() : undefined,
      planScale: this.ds,
      gesture: this.holdPose ? (this.lastFigure?.currentAsana || this.lastFigure?.exercising ? 1 : 0) : this.now ? poseDistance(gesture(vis, this.t, this.clock, low), idle(low)) : 0,
    };
  }

  // --- Internals ---------------------------------------------------------------------------------

  private next(): void {
    const prev = this.now ?? this.last;
    this.hasFrom = !!prev && !!this.df;
    if (prev && this.df) this.spotOf(prev, this.from);
    this.now = this.queue.shift();
    this.t = 0;
    this.played++;
    this.hasBowlSpot = false;
    this.hideAll();
  }

  /** Low targets (a cat bowl, a hen) are worked on crouching. */
  private low(v: StepAct): boolean {
    return v.place === "objetivo" && (this.df?.target.y ?? 1) - this.feet.y < 0.5;
  }

  private spotOf(v: StepAct, out: THREE.Vector3): THREE.Vector3 {
    const f = this.df!;
    const s = (f.kitchen ?? DEFAULT_KITCHEN).spots[v.place as KitchenSpot];
    if (s) return out.copy(s);
    // The challenge's own target: its near face, a hand's width toward her (not inside the machine or the wall).
    out.copy(f.target);
    const dx = this.feet.x - out.x;
    const dz = this.feet.z - out.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-3) {
      const k = Math.min(d, Math.max(TARGET_INSET, d - TARGET_MAX)) / d;
      out.x += dx * k;
      out.z += dz * k;
    }
    return out;
  }

  /**
   * A bowl on the floor between her and a low target, within her reach (crouched), and clear of the
   * scene (`clearOf`): the first free spot of a fan in front of her, chosen once per step.
   */
  private floorBowl(out: THREE.Vector3, s: THREE.Vector3): THREE.Vector3 {
    if (this.hasBowlSpot) return out.copy(this.bowlSpot);
    const d = Math.hypot(s.x - this.feet.x, s.z - this.feet.z);
    out.copy(this.feet).lerp(s, d > 1e-3 ? Math.min(0.65, 0.5 / d) : 0).setY(this.feet.y + 0.02);
    const clear = this.clearOf;
    if (clear) {
      const k = this.ds;
      const yaw = d > 1e-3 ? Math.atan2(s.x - this.feet.x, s.z - this.feet.z) : this.df!.yaw;
      const free = (x: number, z: number) => clear(this.tmp.set(x / k, this.feet.y + BOWL_BOX.y, z / k), BOWL_HALF);
      if (!free(out.x, out.z)) {
        search: for (const r of BOWL_RINGS)
          for (const a of BOWL_FAN) {
            const x = this.feet.x + Math.sin(yaw + a) * r;
            const z = this.feet.z + Math.cos(yaw + a) * r;
            if (free(x, z)) {
              out.set(x, this.feet.y + 0.02, z);
              break search;
            }
          }
      }
    }
    this.bowlSpot.copy(out);
    this.hasBowlSpot = true;
    return out;
  }

  /** Shows the floor bowl by a low target and returns where its contents sit (in `this.v`). */
  private bowlAt(s: THREE.Vector3): THREE.Vector3 {
    const bowl = this.floorBowl(this.v, s);
    this.show(this.props!.bowl, bowl.x, bowl.y + 0.02, bowl.z).scale.set(0.08, 0.04, 0.08);
    return bowl.setY(bowl.y + 0.04);
  }

  /** In front of her at her hands (for a target's steps: what she holds or works in), height `y` clamped. */
  private atHands(out: THREE.Vector3, y: number): THREE.Vector3 {
    const f = this.df!;
    const fx = Math.sin(f.yaw);
    const fz = Math.cos(f.yaw);
    const floor = this.feet.y;
    return out.set(this.feet.x + fx * HANDS_AHEAD, floor + Math.max(0.3, Math.min(1.15, y - floor)), this.feet.z + fz * HANDS_AHEAD);
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
      pouch: mesh(BOX, std(0xc9ced6, { metalness: 0.6, roughness: 0.35 }), 0.13, 0.03, 0.17),
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
      bag: mesh(BOX, std(0x2f5d9a, { roughness: 0.9 }), 0.5, 1, 0.5),
      zip: mesh(BOX, std(0xdfe6ee, { metalness: 0.5 }), 0.03, 0.05, 0.02),
      lamp: mesh(BOX, basic(0xffe6a8, 0.95), 0.16, 0.1, 0.02),
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
    for (const o of [p.bowl, p.pot, p.plate, p.jar, p.tray, p.board, p.knife, p.spoon, p.shaker, ...p.food, ...p.shells, p.can, p.scissors, p.basket, p.ball, p.tablet, p.wrench, p.kit, p.bag, p.zip, p.lamp, p.pouch]) o.visible = false;
    p.pouch.scale.set(0.13, 0.03, 0.17);
    p.fridgeInside.visible = p.fridgeDoor.visible = p.ovenGlow.visible = false;
    p.bowl.scale.set(0.085, 0.06, 0.085);
    for (const f of p.food) f.scale.setScalar(0.04);
    for (const sh of p.shells) sh.scale.set(0.024, 0.031, 0.024);
    this.foodMat!.color.setHex(TINT[v.tint ?? "generico"] ?? TINT.generico!);
    const target = this.spotOf(v, this.spot);
    // A vessel at a challenge's target (a lab flask, a feeder) is held at her hands, not set inside the machine.
    // At a target, what she holds in one hand (the wrench, a resting compress) is at her right hand, the side
    // the camera looks over: neither a round tank nor her own body hides it (PX-20).
    const inHand = v.place === "objetivo" && IN_HAND.has(v.action);
    const s = inHand ? this.hands.copy(this.hand).setY(this.hand.y + 0.06) : v.place === "objetivo" && USES_VESSEL.has(v.action) ? this.atHands(this.hands, target.y) : target;
    const food = p.food;
    const vessel = (): THREE.Vector3 => {
      // The vessel the step works in, at its spot; returns where food sits inside it.
      if (v.place === "fogon" && v.vessel === "olla") this.show(p.pot, s.x, s.y + 0.06, s.z);
      else if (v.place === "fogon") return this.v.set(s.x, s.y + 0.02, s.z); // the room's own pan
      else if (v.vessel === "bandeja") this.show(p.tray, s.x, s.y + 0.01, s.z);
      else if (v.vessel === "plato") this.show(p.plate, s.x, s.y + 0.01, s.z);
      else if (v.vessel === "tarro") this.show(p.jar, s.x, s.y + 0.045, s.z);
      else if (v.vessel === "tabla") this.show(p.board, s.x, s.y + 0.012, s.z);
      else if (v.vessel === "bolsa") {
        // The package floats at the galley, held by her hands (0 g: nothing rests on a counter).
        const at = this.v.copy(s).lerp(this.hand, 0.5);
        this.show(p.pouch, at.x, at.y, at.z).rotation.y = this.df!.yaw;
        return at.setY(at.y + 0.03);
      }
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
          p.fridgeDoor.rotation.y = -1.5 * Math.min(ease(clamp01(t / 0.25)), ease(clamp01((1 - t) / 0.25)));
        }
        // From the shelf (at the open door, or the cupboard's edge) into her hand, where it stays for the next step.
        for (let i = 0; i < (v.vessel === "bolsa" ? 1 : 2); i++) {
          const item = v.vessel === "bolsa" ? p.pouch : v.tint === "huevo" ? p.shells[i]! : food[i]!;
          const k1 = ease(clamp01((t - 0.2) / 0.35));
          const from = this.v.set(s.x - (fromFridge ? 0.06 : 0.02), s.y + i * 0.05, s.z + (i - 0.5) * 0.06);
          const pos = from.lerp(this.w.copy(this.hand).add(this.tmp.set(0, 0.03 + i * 0.03, (i - 0.5) * 0.04)), k1);
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
        if (v.vessel === "bolsa") {
          // The dispenser's needle in the package's valve: water goes in, the package swells a little.
          const at = vessel();
          p.pouch.scale.y = 0.03 * (1 + 0.8 * clamp01(t));
          this.show(p.spoon, at.x, at.y + 0.12, at.z);
          this.emitAt(at.x, at.y + 0.1, at.z, "fall", TINT.agua!);
          break;
        }
        const at = v.place === "objetivo" ? (this.low(v) ? this.bowlAt(s) : this.v.copy(s)) : vessel();
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
        // The tray goes from the counter down into the oven, which glows while it roasts, and back up onto the counter.
        const K = this.df!.kitchen ?? DEFAULT_KITCHEN;
        const door = K.ovenDoor;
        const top = this.w.set(K.counter.front + 0.2, K.counter.top + 0.01, door.z);
        // Off the counter's edge first, then down to the door (and the other way round coming back).
        const out = ease(clamp01(t / 0.1)) - ease(clamp01((t - 0.9) / 0.1));
        const low = ease(clamp01((t - 0.1) / 0.15)) - ease(clamp01((t - 0.78) / 0.12));
        const inOven = t > 0.3 && t < 0.75;
        const x = THREE.MathUtils.lerp(top.x, door.x - 0.2, out);
        const y = THREE.MathUtils.lerp(top.y, door.y - 0.05, low);
        const tray = this.show(p.tray, x, y, door.z);
        tray.visible = !inOven;
        if (!inOven) pile(this.v.set(x, y + 0.02, door.z), 3, 0.05);
        p.ovenGlow.visible = true;
        (p.ovenGlow.material as THREE.MeshBasicMaterial).opacity = 0.75 * bump(t, 0.25, 0.85);
        if (t > 0.8) this.emitAt(x, y + 0.05, door.z, "rise", 0xffffff);
        break;
      }
      case "moler": {
        if (v.place === "molino" || v.place === "procesador") {
          // Grain into the hopper, flour or slurry into the bowl below.
          this.emitAt(s.x, s.y + 0.25, s.z, "fall", TINT[v.tint ?? "grano"] ?? 0xc9a85a);
          const out = v.place === "molino" ? this.v.copy((this.df!.kitchen ?? DEFAULT_KITCHEN).millOut) : this.v.set(s.x, s.y, s.z);
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
        // At a machine the row has at most three pieces, centred on the work (a fourth reached the machine's side: PX-20 in CI).
        const kitchenRow = !!this.df!.kitchen;
        // Opening a package cuts no pieces: the scissors at its top are the step.
        const pieces = cut && v.vessel === "bolsa" ? 0 : cut ? 1 + Math.min(kitchenRow ? 3 : 2, Math.floor(t * 4)) : 1;
        const kitchen = !!this.df!.kitchen;
        // In the ring's galley the row runs along the counter's depth. Elsewhere (a machine, a 0 g galley) the
        // pieces float in one row just over the work (not stacked upward, where a shelf or the machine's top can
        // hide the last one: PX-20 in CI, food3 under a box), which she holds clear of her body; the tool is just over it: her
        // arm, her body or the machine do not hide them (PX-20: the printed part's supports and the package's
        // scissors were hidden behind her hand).
        const toCam = this.tmp.set(this.df!.camera.x - at.x, this.df!.camera.y - at.y, this.df!.camera.z - at.z).normalize();
        for (let i = 0; i < pieces; i++) {
          const f = kitchen
            ? this.show(food[i]!, at.x - 0.06 + i * 0.04, at.y + 0.02, at.z)
            : this.show(food[i]!, at.x + toCam.x * 0.05 + (i - (pieces - 1) / 2) * 0.035 * toCam.z, at.y + 0.07, at.z + toCam.z * 0.05 - (i - (pieces - 1) / 2) * 0.035 * toCam.x);
          if (!cut) f.scale.set(0.06, 0.02 + 0.012 * Math.abs(Math.sin(this.clock * 7)), 0.05);
        }
        // The tool: by the board in the ring's galley; elsewhere toward the camera from the work (whatever lets the
        // camera see the work lets it see the tool) but off to the side of the row of pieces and below it, its
        // blade pointing away from them: never between the camera and a piece (PX-20 in CI: the printed part's
        // supports were hidden behind the knife when it sat on the line to the camera).
        // (`at` may be `this.v`: the side is kept in plain numbers.)
        const sl = Math.hypot(toCam.z, toCam.x);
        const side = sl < 1e-3 ? { x: 1, z: 0 } : { x: toCam.z / sl, z: -toCam.x / sl };
        const tool = kitchen ? this.w.set(at.x + 0.02, at.y + 0.03, at.z + 0.06) : this.w.set(at.x + toCam.x * 0.1 - side.x * 0.1, at.y + 0.02, at.z + toCam.z * 0.1 - side.z * 0.1);
        if (cut && v.vessel === "bolsa") {
          const sc = this.show(p.scissors, tool.x, tool.y, tool.z);
          sc.rotation.y = this.df!.yaw + 0.3 * Math.sin(this.clock * 12);
        } else if (cut) {
          const knife = this.show(p.knife, tool.x, tool.y + (kitchen ? 0.05 : 0.01) * Math.abs(Math.sin(this.clock * 10)), tool.z);
          // Its blade (local +x) along the side away from the pieces.
          knife.rotation.y = kitchen ? Math.PI / 2 : Math.atan2(side.z, -side.x);
        }
        break;
      }
      case "lavar": {
        // A low target's drinker is lifted and washed over her right hand, where her body does not hide it.
        const at = v.place === "objetivo" ? (this.low(v) ? this.v.copy(this.hand).setY(this.hand.y + 0.12) : this.v.copy(s)) : vessel();
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
        // From where the last step happened (the pan, the board) onto the plate, one piece after another;
        // from beside the plate when that was elsewhere (the fridge, the mill).
        const from = this.hasFrom && this.from.distanceTo(at) < 0.9 ? this.tmp.copy(this.from) : this.tmp.set(at.x, at.y + 0.02, at.z - 0.22);
        // From the oven or a shelf: the food starts on the worktop by it (the tray came back up there).
        const K = this.df!.kitchen;
        if (K && v.place !== "objetivo") {
          from.x = Math.max(from.x, K.counter.front + 0.15);
          from.y = Math.max(from.y, K.counter.top + 0.02);
        }
        for (let i = 0; i < 3; i++) {
          const k = ease(clamp01((t - 0.15 - i * 0.15) / 0.35));
          const x = THREE.MathUtils.lerp(from.x, at.x + (i - 1) * 0.04, k);
          const z = THREE.MathUtils.lerp(from.z, at.z, k);
          const y = THREE.MathUtils.lerp(from.y + 0.03, at.y, k) + 0.12 * Math.sin(k * Math.PI);
          this.show(food[i]!, x, y, z).visible = k > 0;
        }
        break;
      }
      // --- Care --------------------------------------------------------------------------------
      case "regar": {
        const toHer = this.tmp.set(this.feet.x - s.x, 0, this.feet.z - s.z).normalize().multiplyScalar(0.12);
        const can = this.show(p.can, s.x + toHer.x, s.y + 0.35, s.z + toHer.z);
        can.rotation.z = -0.7 * bump(t, 0.05, 0.95);
        can.rotation.y = this.df!.yaw - Math.PI / 2;
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
        // The basket at her other hand (on the floor by her for a low plant), clear of the racks.
        const basket = this.low(v) ? this.atHands(this.v, this.feet.y + 0.3).setY(this.feet.y + 0.05) : this.v.copy(this.otherHand).add(this.tmp.set(0, -0.1, 0));
        this.show(p.basket, basket.x, basket.y, basket.z);
        const k = ease(clamp01((t - 0.3) / 0.5));
        this.show(food[0]!, THREE.MathUtils.lerp(s.x, basket.x, k), THREE.MathUtils.lerp(s.y + 0.08, basket.y + 0.05, k), THREE.MathUtils.lerp(s.z, basket.z, k));
        break;
      }
      case "servir": {
        if (!this.low(v)) {
          // A high target (the aquarium): she sprinkles from a jar in her hand over it.
          const jar = this.show(p.jar, this.hand.x, this.hand.y + 0.05, this.hand.z);
          jar.rotation.z = 1.6 * bump(t, 0.1, 0.9);
          if (t < 0.85) this.emitAt(s.x, s.y + 0.15, s.z, "fall", TINT[v.tint ?? "comida"] ?? 0x9a5a3a);
          break;
        }
        const bowl = this.bowlAt(s);
        pile(bowl, Math.round(1 + 3 * clamp01(t / 0.7)), 0.025);
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
        const y = THREE.MathUtils.lerp(this.hand.y, this.feet.y + 0.04, k) + 0.5 * Math.sin(k * Math.PI) + 0.08 * Math.abs(Math.sin(k * 12)) * k;
        this.show(p.ball, x, y, z);
        break;
      }
      case "programar":
      case "revisar": {
        // The holographic tablet floats at her hands, facing her; the glow marks the target it works on.
        // Over her right hand, so her body does not hide it from the camera behind her.
        const h = this.hands.copy(this.hand);
        const tab = this.show(p.tablet, h.x, h.y + 0.14 + 0.02 * Math.sin(this.clock * 2), h.z);
        tab.rotation.y = this.df!.yaw;
        this.emitAt(target.x, target.y + 0.1, target.z, v.action === "revisar" ? "orbit" : "rise", 0x5ff0ff);
        break;
      }
      case "reparar": {
        const w = this.show(p.wrench, s.x, s.y + 0.05, s.z);
        w.rotation.z = 0.8 * Math.sin(this.clock * 7);
        w.rotation.y = this.df!.yaw;
        this.emitAt(s.x, s.y + 0.05, s.z, "burst", TINT.chispas!);
        break;
      }
      case "curar": {
        const kit = this.show(p.kit, s.x, s.y + 0.08, s.z);
        kit.rotation.y = this.df!.yaw;
        this.emitAt(s.x, s.y + 0.15, s.z, "drift", 0x7dffb0);
        break;
      }
      case "entrenar":
        this.emitAt(this.feet.x, this.feet.y + 1.5, this.feet.z, "rise", 0x9fd8ff, 0.4);
        break;
      // --- Going to sleep in a crew quarter ----------------------------------------------------
      case "saco":
      case "luz":
      case "dormir": {
        // The bag round her, against the wall: she gets in (up to the waist), zips it to her chest, and it stays.
        const k = this.ds;
        const zip = v.action === "saco" && v.vessel === "cremallera";
        const h = v.action !== "saco" ? 1.25 : zip ? THREE.MathUtils.lerp(0.95, 1.25, ease(clamp01(t / 0.8))) : THREE.MathUtils.lerp(0.6, 0.95, ease(clamp01(t / 0.7)));
        const back = this.tmp.copy(this.df!.target).sub(this.feet).setY(0);
        if (back.lengthSq() > 1e-6) back.normalize().multiplyScalar(0.06);
        const bag = this.show(p.bag, this.feet.x + back.x, this.feet.y + h / 2, this.feet.z + back.z);
        bag.scale.set(0.46 * k, h, 0.46 * k);
        if (zip) this.show(p.zip, this.hand.x, Math.min(this.hand.y, this.feet.y + h), this.hand.z).scale.set(0.03 * k, 0.05, 0.03 * k);
        if (v.action === "luz") {
          // The quarter's light panel at her raised hand: it goes from warm to off.
          const lamp = this.show(p.lamp, this.hand.x, this.hand.y + 0.08, this.hand.z);
          lamp.scale.set(0.16 * k, 0.1, 0.16 * k);
          lamp.rotation.y = this.df!.yaw;
          (p.lamp.material as THREE.MeshBasicMaterial).color.setHex(t < 0.55 ? 0xffe6a8 : 0x3d4552);
        }
        if (v.action === "dormir") this.emitAt(this.feet.x, this.feet.y + 1.75, this.feet.z, "drift", 0xdfe6ff, 0.35);
        break;
      }
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

export interface StepSnapshot {
  readonly act: StepAct;
  readonly playing: boolean;
  readonly t: number;
  readonly played: number;
  readonly feet: THREE.Vector3;
  readonly yaw: number;
  /** Left and right hand, world. */
  readonly hands: readonly [THREE.Vector3, THREE.Vector3];
  /** Where the step happens (a galley spot or the target's near face). */
  readonly spot: THREE.Vector3;
  readonly props: readonly { readonly name: string; readonly object: THREE.Object3D }[];
  /** Where steam, drops or sparks come from, when they show. */
  readonly particles?: THREE.Vector3;
  /** The floor plan's drawn scale: feet, hands and spot are in drawn metres (a prop's world position times (k, 1, k)). */
  readonly planScale: number;
  /** Sum of joint-angle differences between the step's gesture and waiting (rad). */
  readonly gesture: number;
}

/** Sum of absolute joint-angle differences between two poses (rad). */
export function poseDistance(a: PoseAngles, b: PoseAngles): number {
  let d = Math.abs(a.rootY - b.rootY) + Math.abs(a.rootX - b.rootX) + Math.abs(a.torso - b.torso) + Math.abs(a.headX - b.headX) + Math.abs(a.headY - b.headY) + Math.abs(a.headZ - b.headZ);
  for (const k of ["shoulderX", "shoulderZ", "elbow", "hip", "knee"] as const) for (const i of [0, 1] as const) d += Math.abs(a[k][i] - b[k][i]);
  return d;
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
      // Crouched at the oven door; elsewhere (warming a vial at a lab bench) standing like stirring.
      if (v.place !== "horno") return base({ shoulderX: [-0.6, -0.95 + 0.12 * s], shoulderZ: [0.1, -0.2 + 0.15 * c], elbow: [-1.0, -0.8] });
      return CROUCH({ shoulderX: [-1.0, -1.0], elbow: [-0.3, -0.3], headX: 0.1 });
    case "moler":
      return base({ shoulderX: [-0.5, -1.0 + 0.3 * s], shoulderZ: [0.08, -0.3 + 0.3 * c], elbow: [-0.9, -0.9] });
    case "lavar":
      return base({ shoulderX: [-0.8 + 0.1 * s, -0.8 - 0.1 * s], elbow: [-0.9, -0.9] });
    case "reposar":
      // Holding what rests (the snails' dish, the package) out in front of her, where her body does not hide it.
      return base({ shoulderX: [-0.6, -0.6], elbow: [-0.6, -0.6], headX: 0.45 });
    case "emplatar":
      return base({ shoulderX: [-0.9, -0.9 - 0.3 * bump(t, 0.1, 0.8)], elbow: [-0.7, -0.5] });
    case "regar":
      return base({ shoulderX: [-0.3, -1.3], shoulderZ: [0.08, -0.25], elbow: [-0.4, -0.4], headX: 0.2 });
    case "agitar":
      return base({ shoulderX: [-1.1 + 0.08 * Math.sin(clock * 20), -1.1 + 0.08 * Math.sin(clock * 20)], elbow: [-0.6, -0.6] });
    case "cosechar":
      return base({ shoulderX: [-1.0, -1.3], elbow: [-0.6, -0.5 + 0.2 * Math.abs(Math.sin(clock * 8))] });
    case "servir":
      // Crouched by a bowl on the floor; at a high target (the aquarium) she stands and sprinkles.
      if (!low) return base({ shoulderX: [-0.4, -1.2], elbow: [-0.5, -0.4 - 0.2 * bump(t, 0.1, 0.7)] });
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
    case "saco":
      // Into the bag: knees up and hands pulling its edges; the zip: her right hand runs up her front.
      if (v.vessel === "cremallera") return P({ headX: 0.45, shoulderX: [-0.5, THREE.MathUtils.lerp(-0.4, -1.3, ease(clamp01(t / 0.8)))], shoulderZ: [0.1, 0.25], elbow: [-0.9, -1.4] });
      return P({ headX: 0.5, shoulderX: [-0.35, -0.35], shoulderZ: [0.45, -0.45], elbow: [-0.6, -0.6], hip: [-0.9 * bump(t, 0, 0.8), -0.9 * bump(t, 0.1, 0.9)], knee: [1.2 * bump(t, 0, 0.8), 1.2 * bump(t, 0.1, 0.9)] });
    case "luz":
      return P({ headX: -0.2, headY: -0.3, shoulderX: [-0.5, -2.0 * bump(t, 0, 1) - 0.4], shoulderZ: [0.1, -0.5], elbow: [-1.0, -0.3] });
    case "dormir":
      // Asleep in 0 g: arms crossed on her chest, head tipped, a slow breath.
      return P({ headX: 0.55, headZ: 0.25, torso: 0.05 * Math.sin(clock * 1.2), shoulderX: [-0.75, -0.75], shoulderZ: [-0.35, 0.35], elbow: [-1.9, -1.9] });
    default:
      return base({ shoulderX: [-0.8, -0.8], elbow: [-0.8, -0.8] });
  }
}
