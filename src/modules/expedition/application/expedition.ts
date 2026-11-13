import type { Asteroid } from "@modules/celestial/domain/asteroid";
import { extractToCargo, resourceRichness } from "@modules/celestial/domain/resources";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import { NO_INPUT } from "@modules/flight/application/flight-computer";
import { Aggression } from "@modules/mind-duel/domain/aggression";
import { duelProfileFor } from "@modules/mind-duel/domain/difficulty";
import { MindDuel, type DuelEvent } from "@modules/mind-duel/domain/duel";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import type { ThrustCommand } from "@modules/ship/domain/ship";
import { RapportBook, STAGE_REWARD, type Rapport, type Stage, type StageReward } from "@modules/subjugation/domain/rapport";

export type Phase = "flight" | "landed" | "duel" | "persuaded" | "aggressive";

/** Push given to the ship when an enraged asteroid shakes it off, m/s along the surface normal. */
const SHAKE_OFF_SPEED_MS = 0.5;

/**
 * What the expedition needs to know about the other two ways of touching an asteroid: the probe
 * parked on it (stage 1) and Doménica lying on it in her suit (stage 3). Set by the caller.
 */
export interface ContactPorts {
  /** Id of the asteroid the uncrewed probe is parked on, if any. */
  probeParkedOn?(): string | undefined;
  /** Doménica is outside in her suit, lying on the asteroid. */
  suitLying?(): boolean;
  /** Doménica is outside the lander (the lander must not be shaken off with her outside). */
  suitOutside?(): boolean;
}

/** How the last duel ended: the stage and what it gave. */
export interface DuelResult {
  readonly stage: Stage;
  readonly persuaded: boolean;
  readonly reward?: StageReward;
  readonly cargo: readonly { material: string; kg: number }[];
}

/**
 * Use case for one visit to an asteroid: fly, land, duel its mind, then either load its
 * resources or flee from it. Orchestrates the flight, celestial, mind-duel and subjugation modules.
 * The mind is entered in three stages (probe, lander, suit), each opened by the one before on the
 * same asteroid (docs/design/subyugacion.md).
 */
export class Expedition {
  private _phase: Phase = "flight";
  private _duel: MindDuel | undefined;
  private aggression: Aggression | undefined;
  private duelCount = 0;
  private _stage: Stage | undefined;
  private _result: DuelResult | undefined;
  /** An enraged asteroid shakes the lander off once Doménica is back aboard. */
  private pendingShakeOff = false;
  readonly cargo: { material: string; kg: number }[] = [];
  contacts: ContactPorts = {};

  constructor(
    readonly flight: FlightComputer,
    private _asteroid: Asteroid,
    private readonly exercises: readonly Exercise[],
    readonly cargoCapacityKg: number,
    private readonly seed = 1,
    /** Trust and stages of every asteroid met (shared with the map and the missions). */
    readonly rapport = new RapportBook(),
  ) {}

  get asteroid(): Asteroid {
    return this._asteroid;
  }

  /** Whether the visit can switch to another asteroid now: flying free, not in a duel or fleeing. */
  get canRetarget(): boolean {
    return !this.flight.landed && (this._phase === "flight" || this._phase === "persuaded");
  }

  /** Subjugated: all three stages done. Eligible as a nano_net core and for Nevaeh's missions. */
  isPersuaded(asteroidId: string): boolean {
    return this.rapport.isSubjugated(asteroidId);
  }

  /** The current asteroid's rapport. */
  get bond(): Rapport {
    return this.rapport.of(this._asteroid.data.id);
  }

  /** Stage of the duel running now or of the last one. */
  get stage(): Stage | undefined {
    return this._stage;
  }

  /** How the last duel ended (undefined while one runs or before the first). */
  get lastResult(): DuelResult | undefined {
    return this._result;
  }

  /** Make another asteroid the target of the visit: flight telemetry, landing and duel follow it. */
  retarget(asteroid: Asteroid): boolean {
    if (!this.canRetarget) return false;
    if (asteroid === this._asteroid) return true;
    this._asteroid = asteroid;
    this.flight.setTarget(asteroid);
    this._duel = undefined;
    this._phase = "flight";
    return true;
  }

  get phase(): Phase {
    return this._phase;
  }
  get duel(): MindDuel | undefined {
    return this._duel;
  }
  get safeDistanceM(): number | undefined {
    return this.aggression?.safeDistanceM;
  }
  /** The lander's duel (stage 2) can start: landed, and the probe's stage already done here. */
  get canStartDuel(): boolean {
    return this.canStartStage("nave");
  }

  /** Whether the duel of `stage` can start now against the current asteroid. */
  canStartStage(stage: Stage): boolean {
    if (!this.bond.canAttempt(stage)) return false;
    const c = this.contacts;
    switch (stage) {
      case "sonda":
        return (this._phase === "flight" || this._phase === "landed") && c.probeParkedOn?.() === this._asteroid.data.id;
      case "nave":
        return this._phase === "landed" && !c.suitOutside?.();
      case "traje":
        return this._phase === "landed" && !!c.suitLying?.();
    }
  }

  /** Back from a won duel: to the lander's state (landed or flying). */
  acknowledge(): void {
    if (this._phase === "persuaded") this._phase = this.flight.landed ? "landed" : "flight";
  }

  /** Empty the hold (e.g. at the space station) and return what was in it. */
  unloadCargo(): { material: string; kg: number }[] {
    return this.cargo.splice(0, this.cargo.length);
  }

  update(dtS: number, input: ThrustCommand): void {
    // While in the asteroid's mind the pilot is not at the controls.
    this.flight.update(dtS, this._phase === "duel" ? NO_INPUT : input);
    for (const e of this.flight.drainEvents()) {
      if (e === "landed" && this._phase === "flight") this._phase = "landed";
      if (e === "lifted-off" && this._phase === "landed") this._phase = "flight";
    }
    if (this._phase === "aggressive" && this.aggression) {
      // With Doménica outside the lander stays put; once she is aboard the asteroid shakes it off.
      const outside = !!this.contacts.suitOutside?.();
      if (this.pendingShakeOff && !outside) {
        this.pendingShakeOff = false;
        this.shakeOff();
      }
      const { hullDamage, calmed } = this.aggression.update(dtS, this.flight.telemetry().distanceToSurface);
      // Trust tempers its anger (docs/design/subyugacion.md).
      if (!outside) this.flight.ship.damage(hullDamage * this.bond.danger, "escombros");
      if (calmed) {
        this.aggression = undefined;
        this._phase = this.flight.landed ? "landed" : "flight";
      }
    }
  }

  /** Enter the asteroid's mind at `stage` (default: the lander's, stage 2). */
  startDuel(stage: Stage = "nave"): void {
    if (!this.canStartStage(stage)) throw new Error(`Cannot start the ${stage} duel in phase ${this._phase}`);
    const base = duelProfileFor({ massKg: this.asteroid.massKg, richness: resourceRichness(this.asteroid.data.composition) });
    this._duel = MindDuel.start(this.bond.profile(base, stage), this.exercises, this.seed + this.duelCount++);
    this._stage = stage;
    this._result = undefined;
    this._phase = "duel";
  }

  answer(a: Answer): DuelEvent[] {
    if (this._phase !== "duel" || !this._duel) return [];
    const events = this._duel.submit(a);
    for (const e of events) {
      const stage = this._stage ?? "nave";
      if (e.type === "asteroid-persuaded") {
        this._phase = "persuaded";
        const reward = this.bond.succeed(stage);
        const cargo = this.load(reward);
        this._result = { stage, persuaded: true, reward, cargo };
      }
      if (e.type === "asteroid-enraged") {
        this._phase = "aggressive";
        this.bond.fail();
        this._result = { stage, persuaded: false, cargo: [] };
        this.aggression = new Aggression(this.asteroid.meanRadiusM);
        // The probe's own shake-off belongs to the probe; the lander is shaken off at once, or
        // as soon as Doménica is back aboard after the suit stage.
        if (stage === "nave") this.shakeOff();
        if (stage === "traje") this.pendingShakeOff = true;
      }
    }
    return events;
  }

  /** Fill the hold with the stage's share of what fits (the suit stage fills the rest). */
  private load(reward: StageReward): { material: string; kg: number }[] {
    if (reward.cargoShare <= 0) return [];
    const held = this.cargo.reduce((s, c) => s + c.kg, 0);
    const room = Math.max(0, this.cargoCapacityKg - held);
    const kg = reward === STAGE_REWARD.traje ? room : Math.min(room, this.cargoCapacityKg * reward.cargoShare);
    const got = extractToCargo(this.asteroid.data.composition, kg);
    this.cargo.push(...got);
    return got;
  }

  private shakeOff(): void {
    this.flight.releaseAnchor();
    const s = this.flight.state;
    const normal = s.position.sub(this.asteroid.position).normalize();
    this.flight.applyImpulse(normal.scale(SHAKE_OFF_SPEED_MS));
  }
}

