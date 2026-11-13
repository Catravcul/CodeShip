import { Vec3 } from "@core/math/vec3";
import type { FlightComputer, FlightTarget } from "@modules/flight/application/flight-computer";
import { ChoreRun } from "@modules/chores/domain/chore";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { landingFrame, landingReadout, type LandingReadout } from "@modules/flight/domain/landing-frame";
import { LANDING_GUIDANCE, LandingGuidance, type LandingPhase } from "./landing-guidance";
import { landingChore, type LandingFacts } from "./landing-chore";
import { landingSketch, type SketchStep } from "./plan-sketch";

/** Who lands: the uncrewed probe (screw anchors) or the crewed lander (its legs). */
export type LandingCraft = "sonda" | "modulo";

/** Game values of landing by program (docs/design/aterrizaje.md). */
export const LANDING_PROGRAM = {
  /** The readout and the «Aterrizar con un programa» offer appear below this clearance, m (the trips hand over at 300 m). */
  zoneM: 450,
  /** Below this it is too late to program: land by hand, m (a bounce rises past it in a few seconds). */
  minM: 0.3,
  /** Wrong answers the chain takes before the program does not load (one more than a trip: each one costs precision). */
  maxMistakes: 3,
  /**
   * Touchdown speed of the program by wrong answers (0, 1, 2), m/s: the last one is over the 0,10 m/s
   * limit of the legs, so it bounces off (below the 1 m/s that breaks them: no damage). Game values.
   */
  touchdownMs: [0.04, 0.07, 0.16] as readonly number[],
  /** How far off the site it aims, as a share of the site's radius, by wrong answers. Game values. */
  missShare: [0, 0.8, 1.6] as readonly number[],
  /** The descent plays in about this many real seconds (game time-lapse, like a short trip)… */
  realS: 30,
  /** …never faster than this lapse (120 Hz physics steps per frame). */
  maxLapse: 20,
  craft: {
    /** Lander: 5 m site (about its leg span plus margin); RCS ≈0,07 m/s², so 1,5 m/s descents. */
    modulo: { siteRadiusM: 5, maxDescentMs: 1.5 },
    /** Probe: a 1,5 m site; its weak RCS (≈0,03 m/s²) comes down at 0,6 m/s at most. */
    sonda: { siteRadiusM: 1.5, maxDescentMs: 0.6 },
  } as Readonly<Record<LandingCraft, { readonly siteRadiusM: number; readonly maxDescentMs: number }>>,
} as const;

export type LandingStatus = "idle" | "programming" | "flying" | "landed" | "bounced" | "manual" | "failed";

/** What the landing program needs from the craft and the game. */
export interface LandingPorts {
  readonly craft: LandingCraft;
  /** The craft's flight computer now (a lost probe is replaced by the next one). */
  flight(): FlightComputer;
  /** Id and name of the body the flight computer points at, if it is one that can be landed on. */
  describe(target: FlightTarget): { readonly id: string; readonly name: string } | undefined;
  /** Why no landing can be programmed now (another vehicle on a compressed trip…), if so. */
  busy?(): string | undefined;
}

export interface LandingProgress {
  readonly phase: LandingPhase;
  readonly clearanceM: number;
  readonly missM: number;
  readonly speedMs: number;
  readonly etaS: number;
  readonly lapse: number;
}

/**
 * Use case: landing by program (docs/design/aterrizaje.md). In the approach zone the pilot can land by
 * hand (with the landing readout, which shares this site) or program the descent with a chain of code
 * challenges; solved, the guidance computer flies it in a short time-lapse. Wrong answers make a less
 * precise program: off the site, a harder touchdown, a bounce. Too many, and it does not load.
 */
export class LandingProgram {
  private _status: LandingStatus = "idle";
  private run: ChoreRun | undefined;
  private _guidance: LandingGuidance | undefined;
  private flying: FlightComputer | undefined;
  private _lapse = 1;
  /** Landing site in the body's own frame, and the body. */
  private _site: { local: Vec3; body: FlightTarget } | undefined;
  /** Wrong answers the loaded program was built with. */
  private _mistakes = 0;

  constructor(private readonly ports: LandingPorts) {}

  get craft(): LandingCraft {
    return this.ports.craft;
  }
  get status(): LandingStatus {
    return this._status;
  }
  get programming(): ChoreRun | undefined {
    return this._status === "programming" ? this.run : undefined;
  }
  get guidance(): LandingGuidance | undefined {
    return this._guidance;
  }
  /** The craft is flying its landing program. */
  get active(): boolean {
    return this._status === "flying";
  }
  get mistakes(): number {
    return this._mistakes;
  }
  get siteRadiusM(): number {
    return LANDING_PROGRAM.craft[this.ports.craft].siteRadiusM;
  }
  /** Game seconds per real second while the program flies (1 otherwise). */
  get lapse(): number {
    return this._status === "flying" ? this._lapse : 1;
  }

  /** The body the flight computer points at, if it can be landed on. */
  private body(): { target: FlightTarget; id: string; name: string } | undefined {
    const f = this.ports.flight();
    const t = f.target;
    const d = t && this.ports.describe(t);
    return t && d ? { target: t, ...d } : undefined;
  }

  /** Landing site (world) now, shared by the readout and the program. */
  siteWorld(): Vec3 | undefined {
    const s = this._site;
    const f = this.ports.flight();
    return s && s.body === f.target ? s.body.toWorld(s.local, f.simTimeS) : undefined;
  }

  /** The craft is in the approach zone (free, near enough the ground of a body it can land on). */
  inZone(): boolean {
    const f = this.ports.flight();
    if (f.docked || f.landed || !this.body()) return false;
    return f.telemetry().clearance <= LANDING_PROGRAM.zoneM;
  }

  /** Point on the ground straight below the craft (world). */
  private subPoint(f: FlightComputer, target: FlightTarget): Vec3 {
    const pos = f.state.position;
    const r = pos.sub(target.position);
    return target.position.add(r.normalize().scale(r.length() - target.surfaceDistance(pos, f.simTimeS)));
  }

  /** Pick the site below the craft as it enters the zone; forget it when it leaves. */
  private trackSite(): void {
    const f = this.ports.flight();
    const b = this.body();
    if (!b || f.docked) {
      this._site = undefined;
      return;
    }
    if (this._site && this._site.body !== b.target) this._site = undefined;
    if (this._status === "flying" || this._status === "programming") return;
    if (f.landed) return;
    const c = f.telemetry().clearance;
    if (c > LANDING_PROGRAM.zoneM * 1.15) this._site = undefined;
    else if (!this._site && c <= LANDING_PROGRAM.zoneM) this._site = { local: b.target.toLocal(this.subPoint(f, b.target), f.simTimeS), body: b.target };
  }

  /** Pick a new site below the craft now (the pilot moved away from the old one). */
  resetSite(): void {
    this._site = undefined;
    this.trackSite();
  }

  /** Whether a landing can be programmed now, and why not. */
  canProgram(): { ok: boolean; reason?: string } {
    if (this._status === "flying") return { ok: false, reason: "Ya está bajando con su programa" };
    const busy = this.ports.busy?.();
    if (busy) return { ok: false, reason: busy };
    const f = this.ports.flight();
    if (f.docked) return { ok: false, reason: "Acoplada: desacopla antes" };
    if (f.landed) return { ok: false, reason: "Ya está posada" };
    if (!this.body()) return { ok: false, reason: "No hay dónde posarse" };
    const c = f.telemetry().clearance;
    if (c > LANDING_PROGRAM.zoneM) return { ok: false, reason: `Acércate a menos de ${LANDING_PROGRAM.zoneM} m del suelo` };
    if (c < LANDING_PROGRAM.minM) return { ok: false, reason: "Demasiado cerca del suelo: pósala a mano" };
    return { ok: true };
  }

  /** RCS translation acceleration along the craft's up axis, m/s². */
  private rcsUp(f: FlightComputer): number {
    return Math.abs(f.ship.preview({ mainThrottle: 0, translation: Vec3.Y, rotation: Vec3.ZERO }).forceBody.y) / f.ship.massKg;
  }

  /** The real numbers of the descent from here. */
  facts(): LandingFacts {
    const f = this.ports.flight();
    const b = this.body()!;
    const pos = f.state.position;
    const up = pos.sub(b.target.position).normalize();
    const ground = b.target.surfaceVelocity(pos).sub(b.target.surfaceVelocity(b.target.position));
    const groundSpeed = ground.sub(up.scale(ground.dot(up))).length();
    const c = Math.max(0, f.telemetry().clearance);
    const cfg = LANDING_PROGRAM.craft[this.ports.craft];
    const td = LANDING_PROGRAM.touchdownMs[0]!;
    const flare = LANDING_GUIDANCE.flareM;
    return {
      craft: this.ports.craft,
      targetId: b.id,
      targetName: b.name,
      clearanceM: c,
      groundSpeedMs: groundSpeed,
      rcsAccelMs2: this.rcsUp(f),
      maxDescentMs: cfg.maxDescentMs,
      flareM: flare,
      touchdownMs: td,
      descentS: Math.max(0, c - flare) / cfg.maxDescentMs + flare / td,
    };
  }

  /** Start the chain of challenges that programs the descent (the site is the one below the craft now). */
  startProgramming(): ChoreRun {
    const can = this.canProgram();
    if (!can.ok) throw new Error(can.reason);
    this.trackSite();
    this.run = new ChoreRun(landingChore(this.facts()), LANDING_PROGRAM.maxMistakes);
    this._status = "programming";
    return this.run;
  }

  /** Answer the current challenge; once the chain is solved the guidance flies the program. */
  answer(a: Answer): boolean {
    if (this._status !== "programming" || !this.run) return false;
    const ok = this.run.submit(a);
    if (this.run.status === "done") this.engage(this.run.mistakes);
    else if (this.run.status === "failed") {
      this._status = "failed";
      this.run = undefined;
    }
    return ok;
  }

  /** Load a program built with `mistakes` wrong answers into the guidance and fly it (also from tests). */
  engage(mistakes = 0): void {
    const f = this.ports.flight();
    const b = this.body();
    if (!b) return;
    this.trackSite();
    if (!this._site) this._site = { local: b.target.toLocal(this.subPoint(f, b.target), f.simTimeS), body: b.target };
    const m = Math.max(0, Math.min(LANDING_PROGRAM.touchdownMs.length - 1, mistakes));
    const cfg = LANDING_PROGRAM.craft[this.ports.craft];
    // A less precise program aims beside the site, on a side that does not depend on the craft.
    const site = this.siteWorld()!;
    const up = site.sub(b.target.position).normalize();
    const side = (Math.abs(up.y) < 0.9 ? Vec3.Y : Vec3.X).cross(up).normalize();
    const aim = site.add(side.scale(LANDING_PROGRAM.missShare[m]! * cfg.siteRadiusM));
    const aimLocal = b.target.toLocal(aim, f.simTimeS);
    this._mistakes = m;
    this._guidance = new LandingGuidance(f.ship, b.target, { siteLocal: aimLocal, touchdownMs: LANDING_PROGRAM.touchdownMs[m]!, maxDescentMs: cfg.maxDescentMs }, () => f.landed);
    // The belly must face the ground: the flight computer's landing assist levels it.
    f.landingAssist = true;
    f.engage(this._guidance);
    this.flying = f;
    this._lapse = Math.max(1, Math.min(LANDING_PROGRAM.maxLapse, this.facts().descentS / LANDING_PROGRAM.realS));
    this._status = "flying";
    this.run = undefined;
  }

  /** Stop programming or flying: the pilot has the controls. */
  cancel(): void {
    if (this.flying && this._guidance && this.flying.guidance === this._guidance) this.flying.disengage();
    if (this._status === "programming" || this._status === "flying") this._status = "manual";
    this.run = undefined;
    this.flying = undefined;
  }

  /** Each frame, after the craft's physics ran: notices the touchdown, a bounce, the pilot or a lost craft. */
  update(): void {
    this.trackSite();
    if (this._status !== "flying" || !this.flying || !this._guidance) return;
    const f = this.flying;
    const g = this._guidance;
    if (f !== this.ports.flight()) {
      this._status = "failed";
      this.flying = undefined;
      return;
    }
    if (g.phase === "posada") this._status = "landed";
    else if (g.phase === "rebote") this._status = "bounced";
    else if (f.guidance !== g) this._status = "manual";
    else return;
    this.flying = undefined;
  }

  progress(): LandingProgress | undefined {
    const g = this._guidance;
    if (this._status !== "flying" || !g) return undefined;
    const s = g.status;
    return { phase: s.phase, clearanceM: s.clearanceM, missM: s.missM, speedMs: s.speedMs, etaS: s.etaS, lapse: this.lapse };
  }

  /**
   * The landing readout (docs/design/aterrizaje.md) for the craft now: position and velocity from the
   * site in the local frame, predicted touchdown and colours. Undefined outside the approach zone.
   */
  readout(): LandingReadout | undefined {
    const site = this.siteWorld();
    const f = this.ports.flight();
    const t = f.target;
    if (!site || !t || f.docked) return undefined;
    const s = f.state;
    const up = s.position.sub(t.position).normalize();
    const tel = f.telemetry();
    const m = f.ship.massKg;
    const rcs = (axis: Vec3) => Math.abs(f.ship.preview({ mainThrottle: 0, translation: axis, rotation: Vec3.ZERO }).forceBody.dot(axis)) / m;
    return landingReadout({
      frame: landingFrame(up, s.toWorld(Vec3.X), s.toWorld(new Vec3(0, 0, -1)), s.toWorld(Vec3.Y)),
      offset: s.position.sub(site),
      velocity: s.velocity.sub(t.surfaceVelocity(s.position)),
      clearanceM: Math.max(0, tel.clearance),
      tiltDeg: tel.tiltDeg,
      brakeMs2: Math.min(rcs(Vec3.X), rcs(Vec3.Y), rcs(Vec3.Z)),
      siteRadiusM: this.siteRadiusM,
    });
  }

  /** What each landing challenge adds to the plan on screen, once answered right (plan-sketch.ts). */
  sketch(): SketchStep[] {
    const f = this.ports.flight();
    const site = this.siteWorld();
    const t = f.target;
    if (!site || !t) return [];
    const facts = this.facts();
    return landingSketch({
      craft: f.state.position,
      site,
      up: site.sub(t.position).normalize(),
      siteRadiusM: this.siteRadiusM,
      groundVelocity: t.surfaceVelocity(f.state.position).sub(t.surfaceVelocity(t.position)),
      maxDescentMs: facts.maxDescentMs,
      flareM: facts.flareM,
      touchdownMs: facts.touchdownMs,
      brakeMs2: facts.rcsAccelMs2 * LANDING_GUIDANCE.brakeShare,
    });
  }

  /** Horizontal distance from the craft to the site, m (after a landing: how close it came). */
  missM(): number | undefined {
    const site = this.siteWorld();
    const f = this.ports.flight();
    if (!site) return undefined;
    const up = site.sub(f.target!.position).normalize();
    const d = f.state.position.sub(site);
    return d.sub(up.scale(d.dot(up))).length();
  }
}
