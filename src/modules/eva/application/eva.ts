import { Quat } from "@core/math/quat";
import { Vec3 } from "@core/math/vec3";
import type { Asteroid } from "@modules/celestial/domain/asteroid";
import { ChoreRun } from "@modules/chores/domain/chore";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import type { Answer } from "@modules/mind-duel/domain/exercise";
import { BENNU_SAMPLES, SAMPLE_SCOOP_G, type RegolithSample } from "../data/samples";
import { EMU, SAFER, SAFETY_TETHER_M, type JetpackSpec, type SuitSpec } from "../data/suit";
import { SUIT_UP } from "../data/suit-up";
import { Suit, WORKLOAD } from "../domain/suit";
import { EvaBody, NO_EVA_INPUT, effectiveGravity, groundUnder, type EvaInput, type EvaWorld } from "../domain/surface-motion";

export type EvaPhase = "dentro" | "preparando" | "fuera" | "volviendo";

export type EvaEvent =
  | { type: "salida" }
  | { type: "dentro" }
  | { type: "a-la-deriva" }
  | { type: "agarrada" }
  | { type: "cable-tenso" }
  | { type: "muestra"; sample: RegolithSample }
  | { type: "volver" }
  | { type: "reserva" };

/** Airlock hatch on the ship's left flank, body frame (x right, y up, −z forward). Matches the rendered ship. */
export const HATCH_BODY = new Vec3(-1.5, -0.3, 1.9);
/** Close enough to the hatch to climb back in, metres. Game value. */
export const HATCH_REACH_M = 2.2;
/** Close enough to a sample to scoop it, metres. Game value. */
export const SAMPLE_REACH_M = 1.5;
/** Hull footprint she cannot crawl through: half extents right/forward plus a body margin, metres (hull 3 × 5 m, nose 0.9 m). */
const SHIP_FOOTPRINT = { right: 1.5 + 0.3, back: 2.5 + 0.3, front: 2.5 + 0.9 + 0.3 };

/** Pushes a point out of the landed ship's footprint, along the shallowest side. */
export function shipKeepOut(ship: Vec3, right: Vec3, forward: Vec3): (p: Vec3) => Vec3 {
  return (p) => {
    const d = p.sub(ship);
    const x = d.dot(right);
    const z = d.dot(forward);
    const f = SHIP_FOOTPRINT;
    if (Math.abs(x) >= f.right || z >= f.front || z <= -f.back) return p;
    const pushX = f.right - Math.abs(x);
    const pushZ = z >= 0 ? f.front - z : f.back + z;
    return pushX < pushZ ? p.add(right.scale(Math.sign(x || 1) * pushX)) : p.add(forward.scale(z >= 0 ? pushZ : -pushZ));
  };
}

/** Where samples lie around the ship: [metres right of it, metres forward]. Game layout inside the tether, clear of the solar wings. */
const SAMPLE_SPOTS: readonly [number, number][] = [
  [-4, 6],
  [-9, -6],
  [6, 9],
  [-15, 12],
];

export interface SampleSpot {
  readonly sample: RegolithSample;
  readonly position: Vec3;
  collected: boolean;
}

/**
 * Use case: leave the landed ship for a walk on the asteroid and come back. Suit-up is a short
 * chain of code challenges; outside, the suit's consumables run down and she moves by holding on,
 * floating, the jetpack and the tether.
 */
export class Eva {
  private _phase: EvaPhase = "dentro";
  private _run: ChoreRun | undefined;
  private _body: EvaBody | undefined;
  readonly suit: Suit;
  private _world: EvaWorld;
  readonly massKg: number;
  readonly jetAccelMs2: number;
  private _spots: SampleSpot[] = [];
  private _hatch = Vec3.ZERO;
  private _shipUp = Vec3.Y;
  private _shipRight = Vec3.X;
  private _shipForward = Vec3.Z.scale(-1);
  private events: EvaEvent[] = [];
  private wasFloating = false;
  private wasEscaping = false;
  private wasTaut = false;
  private lastStatus = "nominal";
  /** Grams of regolith in the sample bag. */
  collectedG = 0;

  constructor(
    readonly flight: FlightComputer,
    readonly asteroid: Asteroid,
    surface: (local: Vec3) => number,
    crewMassKg = 58,
    readonly suitSpec: SuitSpec = EMU,
    readonly jetpack: JetpackSpec = SAFER,
    readonly samples: readonly RegolithSample[] = BENNU_SAMPLES,
  ) {
    this.suit = new Suit(suitSpec);
    this._world = { mu: asteroid.mu, spinRadS: asteroid.spinRadS, surface, meanRadiusM: asteroid.meanRadiusM };
    this.massKg = crewMassKg + suitSpec.massKg.value + jetpack.massKg.value;
    this.jetAccelMs2 = (jetpack.thrustPerThrusterN.value * jetpack.thrustersPerAxis.value) / this.massKg;
  }

  get world(): EvaWorld {
    return this._world;
  }
  get phase(): EvaPhase {
    return this._phase;
  }
  get outside(): boolean {
    return this._phase === "fuera" || this._phase === "volviendo";
  }
  get canLeave(): boolean {
    return this._phase === "dentro" && this.flight.landed;
  }
  get suitUpRun(): ChoreRun | undefined {
    return this._run;
  }
  get body(): EvaBody | undefined {
    return this._body;
  }
  get spots(): readonly SampleSpot[] {
    return this._spots;
  }
  /** Airlock position, asteroid frame. */
  get hatch(): Vec3 {
    return this._hatch;
  }
  /** Ship axes at the landing site, asteroid frame. */
  get shipAxes(): { up: Vec3; right: Vec3; forward: Vec3 } {
    return { up: this._shipUp, right: this._shipRight, forward: this._shipForward };
  }
  get distanceToHatch(): number {
    return this._body ? this._body.position.sub(this._hatch).length() : 0;
  }
  get canBoard(): boolean {
    return this.outside && this.distanceToHatch <= HATCH_REACH_M;
  }
  /** Ground acceleration (gravity minus spin) where she stands, m/s². */
  get localGravity(): number {
    return this._body ? effectiveGravity(this.world, this._body.position).length() : 0;
  }
  get nearSample(): SampleSpot | undefined {
    const b = this._body;
    if (!b || b.mode !== "agarrada") return undefined;
    return this._spots.find((s) => !s.collected && s.position.sub(b.position).length() <= SAMPLE_REACH_M);
  }

  drainEvents(): EvaEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Start putting on the suit: returns the chain of challenges (pre-breathe and airlock). */
  suitUp(): ChoreRun {
    if (!this.canLeave) throw new Error("The ship must be landed to go outside");
    this._phase = "preparando";
    this._run = new ChoreRun(SUIT_UP);
    return this._run;
  }

  /** Answer a suit-up step; when the chain is done she steps outside. */
  answer(a: Answer): boolean {
    const run = this._run;
    if (this._phase !== "preparando" || !run) return false;
    const ok = run.submit(a);
    if (run.status === "done") this.stepOutside();
    return ok;
  }

  /** Back out of suit-up (closing the sheet, or too many mistakes). */
  cancelSuitUp(): void {
    if (this._phase !== "preparando") return;
    this._phase = "dentro";
    this._run = undefined;
  }

  /** Skip the challenges (debug and tests). */
  stepOutside(): void {
    if (!this.flight.landed) throw new Error("The ship must be landed to go outside");
    const t = this.flight.simTimeS;
    const s = this.flight.state;
    const local = this.asteroid.toLocal(s.position, t);
    const q: Quat = this.asteroid.orientationAt(t).conjugate().multiply(s.orientation);
    this._shipUp = q.rotate(Vec3.Y);
    this._shipRight = q.rotate(Vec3.X);
    this._shipForward = q.rotate(new Vec3(0, 0, -1));
    this._hatch = local.add(q.rotate(HATCH_BODY));
    this._world = { ...this._world, keepOut: shipKeepOut(local, this._shipRight, this._shipForward) };
    const start = groundUnder(this.world, this._hatch.add(this._shipRight.scale(0.8 * Math.sign(HATCH_BODY.x))));
    this._body = new EvaBody(this.world, start, { anchor: this._hatch, lengthM: SAFETY_TETHER_M.value }, { accelMs2: this.jetAccelMs2, deltaVMs: this.jetpack.deltaVMs.value });
    this._spots = this.samples.map((sample, i) => {
      const [r, f] = SAMPLE_SPOTS[i % SAMPLE_SPOTS.length]!;
      return { sample, position: groundUnder(this.world, local.add(this._shipRight.scale(r)).add(this._shipForward.scale(f))), collected: false };
    });
    this.suit.recharge();
    this._phase = "fuera";
    this._run = undefined;
    this.wasFloating = this.wasEscaping = this.wasTaut = false;
    this.lastStatus = "nominal";
    this.events.push({ type: "salida" });
  }

  /** "Volver a la nave": climb in if at the hatch, otherwise head back (crawl and reel) until there. */
  requestReturn(): void {
    if (!this.outside) return;
    if (this.canBoard) this.board();
    else this._phase = "volviendo";
  }

  collect(): RegolithSample | undefined {
    const spot = this.nearSample;
    if (!spot) return undefined;
    spot.collected = true;
    this.collectedG += SAMPLE_SCOOP_G;
    this.events.push({ type: "muestra", sample: spot.sample });
    return spot.sample;
  }

  update(dtS: number, input: EvaInput = NO_EVA_INPUT): void {
    const b = this._body;
    if (!this.outside || !b) return;
    const returning = this._phase === "volviendo";
    const cmd: EvaInput = returning ? { ...NO_EVA_INPUT, reel: true } : input;
    b.update(dtS, cmd);
    const moving = cmd.move.length() > 0 || cmd.reel;
    this.suit.tick(dtS, b.mode === "flotando" ? (cmd.jet.length() > 0 ? WORKLOAD.jet : WORKLOAD.rest) : moving ? WORKLOAD.crawl : WORKLOAD.rest);

    const floating = b.mode === "flotando";
    if (!floating && this.wasFloating) this.events.push({ type: "agarrada" });
    this.wasFloating = floating;
    if (b.escaping && !this.wasEscaping) this.events.push({ type: "a-la-deriva" });
    this.wasEscaping = b.escaping;
    if (b.tetherTaut && !this.wasTaut) this.events.push({ type: "cable-tenso" });
    this.wasTaut = b.tetherTaut;
    const st = this.suit.status;
    if (st !== this.lastStatus) {
      if (st === "volver") this.events.push({ type: "volver" });
      if (st === "reserva" || st === "agotado") this.events.push({ type: "reserva" });
      this.lastStatus = st;
    }
    // Suit nearly out: head back on her own.
    if (st !== "nominal" && this._phase === "fuera") this._phase = "volviendo";
    if (this._phase === "volviendo" && this.canBoard) this.board();
  }

  private board(): void {
    this._phase = "dentro";
    this._body = undefined;
    this.events.push({ type: "dentro" });
  }
}
