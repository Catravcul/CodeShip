import { blocked, dropTo, step, SWIM_BODY_M, waterAt, type Body, type Floor, type WalkWorld } from "../domain/walk";
import { climbTarget, GRAVITY_MS2, type Climb } from "@modules/sanctuary-one/domain/climb";
import { jumpAt, LAND_S, SPRINT_MS, SWIM_SPRINT_MS, type JumpStage } from "@modules/sanctuary-one/domain/effort";

/**
 * Walking and swimming on Earth with the Switch pad (reglas.md §2.6 and §5.7), the same in every level with gravity
 * (sanctuaries 1 and 3): the «Moverse» stick walks or swims her, B (Correr) sprints or swims hard, A (Saltar) jumps,
 * X (Trepar) climbs onto what is in front, and off an edge she falls under gravity onto what is below. Pure: each level
 * keeps its body and passes it in and out, so its own routes, lifts and flights stay as they are.
 */
export interface WalkSpeeds {
  /** Walking and swimming, m/s (each level's own pace). */
  readonly walk: number;
  readonly swim: number;
  /** With Correr on: a sprint and a hard crawl (domain/effort.ts), the same everywhere unless a level says otherwise. */
  readonly run?: number;
  readonly swimRun?: number;
  /** Highest drop she lets herself fall off an edge, m (no limit if absent). */
  readonly maxDrop?: number;
  /** How much a water's current speeds her swim, by its area (1 if absent: the sea; sanctuary 1's tree water carries her). */
  readonly current?: (area: string) => number;
}

export interface WalkInput {
  /** The «Moverse» stick: forward (+) and right (+), each −1..1. */
  readonly forward: number;
  readonly right: number;
  /** Where the camera looks: forward is (−sin yaw, −cos yaw); swimming, the pitch takes her up or down. */
  readonly yaw: number;
  readonly pitch: number;
  /** Correr (B) on. */
  readonly run: boolean;
}

/** Climbing up: hands first, then she pulls herself up, s. */
export const CLIMB_S = 0.9;

/** The highest a doorway lets her drop out of the water onto its floor (the trunks' doors are 7 m tall). */
const DOOR_DROP_M = 7.5;

export class FreeWalk {
  /** The tops she has climbed onto: floors she can walk on (walk.ts extra floors). */
  readonly climbed: Floor[] = [];
  /** Where her body faces (the way she last moved on foot), for the third-person view. */
  facing: number;
  /** Her gait's phase (a cycle every ~2,1 m walking; ~2,25 cycles/s sprinting). */
  stride = 0;
  private jumpT = -1;
  private jumpRun = false;
  private landT = -1;
  private fall: { x: number; z: number; y: number; vy: number; to: Body } | undefined;
  private climb: { from: { x: number; y: number; z: number }; to: Climb; t: number } | undefined;

  constructor(
    /** The walk world round (x, z) (sanctuary 1 indexes it by cells; sanctuary 3 has one). */
    private readonly world: (x: number, z: number) => WalkWorld,
    private readonly speeds: WalkSpeeds,
    yaw = 0,
  ) {
    this.facing = yaw;
  }

  /** The jump in the air now, if any: its stage and the height of her feet. */
  get jump(): { stage: JumpStage; height: number } | undefined {
    return this.jumpT >= 0 ? jumpAt(this.jumpT, this.jumpRun) : undefined;
  }
  /** Falling off an edge now. */
  get falling(): boolean {
    return !!this.fall;
  }
  /** Absorbing a landing now (after a fall). */
  get landing(): boolean {
    return this.landT >= 0;
  }
  /** Climbing now. */
  get climbing(): boolean {
    return !!this.climb;
  }

  /** Seconds since Saltar was pressed (−1: on the ground). */
  get jumpClock(): number {
    return this.jumpT;
  }
  /** Test hook: put the jump's clock at `t` s (−1: on the ground). */
  setJump(t: number): void {
    this.jumpT = t;
    this.jumpRun = false;
  }

  /** Saltar (A): a jump if she stands on a floor and is not already in the air; running, a running take-off. */
  startJump(b: Body, moving: boolean, running: boolean): boolean {
    if (b.motion !== "gravedad" || this.jumpT >= 0 || this.fall || this.climb) return false;
    this.jumpT = 0;
    this.jumpRun = running && moving;
    return true;
  }

  /** What she would climb onto facing `yaw`, if anything (Trepar is greyed out otherwise). */
  climbAhead(b: Body, yaw: number): Climb | undefined {
    return climbTarget(this.world(b.x, b.z), b, yaw, this.climbed);
  }

  /** Trepar (X): up onto what is in front; false if there is nothing to climb. */
  startClimb(b: Body, yaw: number): boolean {
    const c = this.climbAhead(b, yaw);
    if (!c) return false;
    if (!this.climbed.includes(c.floor) && c.floor.id.startsWith("trepar:")) this.climbed.push(c.floor);
    this.climb = { from: { x: b.x, y: b.y, z: b.z }, to: c, t: 0 };
    return true;
  }

  /**
   * The moves that carry her by themselves (a fall, a climb) and the jump's clock: the body after `dt`, and whether a
   * fall or a climb had her this frame (then the stick does nothing).
   */
  carry(dt: number, b: Body): { body: Body; busy: boolean } {
    if (this.landT >= 0 && (this.landT += dt) > LAND_S) this.landT = -1;
    if (this.fall) {
      const f = this.fall;
      f.vy -= GRAVITY_MS2 * dt;
      f.y += f.vy * dt;
      if (f.y <= f.to.y) {
        this.fall = undefined;
        if (f.to.motion === "gravedad") this.landT = 0;
        return { body: f.to, busy: true };
      }
      return { body: { x: f.x, y: f.y, z: f.z, motion: "gravedad", area: b.area }, busy: true };
    }
    if (this.climb) {
      const c = this.climb;
      c.t += dt / CLIMB_S;
      const k = Math.min(1, c.t);
      const up = Math.min(1, k / 0.7);
      const fwd = Math.max(0, (k - 0.6) / 0.4);
      const a = c.from;
      const t = c.to;
      // Over a thin wall: up to its top, then down the other side.
      const y = t.over !== undefined ? (k < 0.6 ? a.y + (t.over - a.y) * up : t.over + (t.y - t.over) * fwd) : a.y + (t.y - a.y) * up;
      if (k >= 1) {
        this.climb = undefined;
        return { body: { x: t.x, y: t.y, z: t.z, motion: "gravedad", area: t.floor.area }, busy: true };
      }
      return { body: { x: a.x + (t.x - a.x) * fwd, y, z: a.z + (t.z - a.z) * fwd, motion: "gravedad", area: t.floor.area }, busy: true };
    }
    if (this.jumpT >= 0) {
      this.jumpT += dt;
      if (jumpAt(this.jumpT, this.jumpRun).done) this.jumpT = -1;
    }
    return { body: b, busy: false };
  }

  /** One frame of the stick: walking, sprinting or swimming where the camera looks; off an edge, the fall begins. */
  move(dt: number, b: Body, i: WalkInput): Body {
    if (!i.forward && !i.right) return b;
    const swim = b.motion === "agua";
    const speed = (swim ? (i.run ? (this.speeds.swimRun ?? SWIM_SPRINT_MS) : this.speeds.swim) * (this.speeds.current?.(b.area) ?? 1) : i.run ? (this.speeds.run ?? SPRINT_MS) : this.speeds.walk) * dt;
    // Swimming, looking up or down tilts her way: less of it ahead, the rest up or down (Berón 2026-11-22: «en el globo
    // de agua no puedo nadar»: straight up she went as fast ahead as up, and out of the nozzle's side).
    const ahead = swim ? Math.cos(i.pitch) : 1;
    const dx = (-Math.sin(i.yaw) * i.forward * ahead + Math.cos(i.yaw) * i.right) * speed;
    const dz = (-Math.cos(i.yaw) * i.forward * ahead - Math.sin(i.yaw) * i.right) * speed;
    const dy = swim ? Math.sin(i.pitch) * i.forward * speed : 0;
    if (!swim) {
      const want = Math.atan2(-dx, -dz);
      const d = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
      this.facing += d * Math.min(1, 12 * dt);
    } else this.facing = i.yaw;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.2));
    let body = b;
    const still = (q: Body) => Math.abs(q.x - b.x) + Math.abs(q.y - b.y) + Math.abs(q.z - b.z) < 1e-6;
    for (let k = 0; k < n; k++) body = step(this.world(body.x, body.z), body, { dx: dx / n, dy: dy / n, dz: dz / n }, this.climbed);
    // Swimming straight up or down a trunk (looking up or down with nothing ahead): the vertical part alone.
    if (still(body) && swim && Math.abs(dy) > 0.01) body = step(this.world(body.x, body.z), body, { dx: 0, dy, dz: 0 });
    // Out of the water through a doorway high over its floor (Berón 2026-11-20: «no puedo entrar desde esquinas
    // superiores y debo bajar hasta tocar el suelo»): where the water ends and her body fits, she drops onto the floor.
    if (still(body) && swim) {
      const len = Math.hypot(dx, dz);
      if (len > 1e-6) {
        const x = b.x + (dx / len) * 0.5;
        const z = b.z + (dz / len) * 0.5;
        const w = this.world(x, z);
        const to = waterAt(w, x, b.y, z) || blocked(w, x, b.y, z, SWIM_BODY_M) ? undefined : dropTo(w, x, b.y, z, this.climbed);
        if (to?.motion === "gravedad" && b.y - to.y <= DOOR_DROP_M) this.fall = { x, z, y: b.y, vy: 0, to };
      }
    }
    // Off the edge of a floor with no railing (Berón 2026-11-19: «es fácil tirarse abajo»): she falls. Also when the
    // stick pushes her slantwise against the edge and she slides along it (Berón 2026-11-24: «sigo sin poderme tirar
    // de los pisos»: with the touch stick she never pushed straight out, so she never stood still at the edge).
    const held = Math.hypot(body.x - b.x, body.z - b.z) < 0.5 * Math.hypot(dx, dz);
    if (held && b.motion === "gravedad") {
      const len = Math.hypot(dx, dz) || 1;
      const x = b.x + (dx / len) * 0.5;
      const z = b.z + (dz / len) * 0.5;
      const w = this.world(x, z);
      const to = blocked(w, x, b.y, z) ? undefined : dropTo(w, x, b.y, z, this.climbed);
      if (to && b.y - to.y <= (this.speeds.maxDrop ?? Infinity)) this.fall = { x, z, y: b.y, vy: 0, to };
    }
    this.stride += Math.hypot(body.x - b.x, swim ? body.y - b.y : 0, body.z - b.z) * (i.run && !swim ? 2.2 : 3);
    return body;
  }

  /**
   * How it feels in the camera: the feet's height in a jump, the head's dip (the crouch and the landing, each sprint
   * stride) and how much the view widens at a sprint, degrees.
   */
  feel(sprinting: boolean): { hop: number; dip: number; fov: number } {
    const j = this.jump;
    const dip = j && (j.stage === "agacharse" || j.stage === "amortiguar") ? -0.28 : sprinting ? -0.05 + 0.06 * Math.abs(Math.cos(this.stride)) : 0;
    return { hop: j?.height ?? 0, dip, fov: sprinting ? 9 : 0 };
  }
}
