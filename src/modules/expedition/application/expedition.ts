import type { Asteroid } from "@modules/celestial/domain/asteroid";
import { extractToCargo, resourceRichness } from "@modules/celestial/domain/resources";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import { NO_INPUT } from "@modules/flight/application/flight-computer";
import { Aggression } from "@modules/mind-duel/domain/aggression";
import { duelProfileFor } from "@modules/mind-duel/domain/difficulty";
import { MindDuel, type DuelEvent } from "@modules/mind-duel/domain/duel";
import type { Answer, Exercise } from "@modules/mind-duel/domain/exercise";
import type { ThrustCommand } from "@modules/ship/domain/ship";

export type Phase = "flight" | "landed" | "duel" | "persuaded" | "aggressive";

/** Push given to the ship when an enraged asteroid shakes it off, m/s along the surface normal. */
const SHAKE_OFF_SPEED_MS = 0.5;

/**
 * Use case for one visit to an asteroid: fly, land, duel its mind, then either load its
 * resources or flee from it. Orchestrates the flight, celestial and mind-duel modules.
 */
export class Expedition {
  private _phase: Phase = "flight";
  private _duel: MindDuel | undefined;
  private aggression: Aggression | undefined;
  private duelCount = 0;
  readonly cargo: { material: string; kg: number }[] = [];

  constructor(
    readonly flight: FlightComputer,
    readonly asteroid: Asteroid,
    private readonly exercises: readonly Exercise[],
    readonly cargoCapacityKg: number,
    private readonly seed = 1,
  ) {}

  get phase(): Phase {
    return this._phase;
  }
  get duel(): MindDuel | undefined {
    return this._duel;
  }
  get safeDistanceM(): number | undefined {
    return this.aggression?.safeDistanceM;
  }
  get canStartDuel(): boolean {
    return this._phase === "landed";
  }

  update(dtS: number, input: ThrustCommand): void {
    // While in the asteroid's mind the pilot is not at the controls.
    this.flight.update(dtS, this._phase === "duel" ? NO_INPUT : input);
    for (const e of this.flight.drainEvents()) {
      if (e === "landed" && this._phase === "flight") this._phase = "landed";
      if (e === "lifted-off" && this._phase === "landed") this._phase = "flight";
    }
    if (this._phase === "aggressive" && this.aggression) {
      const { hullDamage, calmed } = this.aggression.update(dtS, this.flight.telemetry().distanceToSurface);
      this.flight.ship.damage(hullDamage);
      if (calmed) {
        this.aggression = undefined;
        this._phase = this.flight.landed ? "landed" : "flight";
      }
    }
  }

  startDuel(): void {
    if (!this.canStartDuel) throw new Error(`Cannot start a duel in phase ${this._phase}`);
    const profile = duelProfileFor({ massKg: this.asteroid.massKg, richness: resourceRichness(this.asteroid.data.composition) });
    this._duel = MindDuel.start(profile, this.exercises, this.seed + this.duelCount++);
    this._phase = "duel";
  }

  answer(a: Answer): DuelEvent[] {
    if (this._phase !== "duel" || !this._duel) return [];
    const events = this._duel.submit(a);
    for (const e of events) {
      if (e.type === "asteroid-persuaded") {
        this._phase = "persuaded";
        this.cargo.push(...extractToCargo(this.asteroid.data.composition, this.cargoCapacityKg));
      }
      if (e.type === "asteroid-enraged") {
        this._phase = "aggressive";
        this.aggression = new Aggression(this.asteroid.meanRadiusM);
        this.shakeOff();
      }
    }
    return events;
  }

  private shakeOff(): void {
    this.flight.releaseAnchor();
    const s = this.flight.state;
    const normal = s.position.sub(this.asteroid.position).normalize();
    this.flight.applyImpulse(normal.scale(SHAKE_OFF_SPEED_MS));
  }
}

