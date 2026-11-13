import { Vec3 } from "@core/math/vec3";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import type { RigidBodyState } from "@modules/flight/domain/rigid-body";
import type { ThrustCommand } from "@modules/ship/domain/ship";

export type ProbeStatus = "estibada" | "en-vuelo" | "posada" | "sin-sonda";

export type ProbeEvent =
  | { type: "lanzada" }
  | { type: "posada"; asteroidId: string }
  | { type: "despegada" }
  | { type: "recuperada" }
  | { type: "sacudida" }
  | { type: "perdida"; why: "abandonada" | "destruida" | "sin-bateria" };

/** Game tuning of the probe's operations (labelled game values). */
export const PROBE_TUNING = {
  /** Push of the release springs when it leaves the travel ship, m/s (like the docking springs). */
  releaseMs: 0.08,
  /**
   * Capture box of the travel ship's arm: within this distance of the bay and slower than
   * `captureSpeedMs` the arm grabs it. Canadarm2 grapples visiting vehicles held about 10 m away.
   */
  captureRangeM: 10,
  captureSpeedMs: 0.1,
  /** Push an angry asteroid gives the parked probe when it shakes it off, m/s. */
  shakeOffMs: 0.4,
  /** Hull fraction per second the probe loses at the surface of an angry asteroid (it is tiny and unshielded). */
  maxDamagePerS: 0.08,
} as const;

/** Where the probe is and the asteroid's anger, as the probe sees it each step. */
export interface ProbeThreat {
  /** The asteroid it is near is angry now. */
  readonly angry: boolean;
  /** Beyond this distance from the surface its debris does not reach, m. */
  readonly safeDistanceM: number;
  /** Trust tempers the anger: 1 = full harm. */
  readonly danger: number;
}

/**
 * Use case: the uncrewed probe the travel ship carries (docs/design/subyugacion.md). It is stowed on
 * the ship (latched to its bay pose), launched by the release springs, flown remotely with its own
 * flight computer, parked on an asteroid (stage 1 of the subjugation), and grabbed back by the arm
 * — or abandoned if the asteroid is angry. A lost probe is replaced by the next one on board.
 */
export class ProbeOps {
  private _flight: FlightComputer;
  private _status: ProbeStatus = "estibada";
  private _onBoard: number;
  private _serial = 1;
  private _batteryWh: number;
  private shaken = false;
  private doseMSv = 0;
  private events: ProbeEvent[] = [];

  /**
   * @param make builds a fresh probe (its own ship and flight computer) on the mission clock `timeS`, latched to the bay
   * @param bay pose of the bay on the travel ship now
   */
  constructor(
    private readonly make: (serial: number, timeS: number) => FlightComputer,
    private readonly bay: () => RigidBodyState,
    readonly spec: { readonly probes: number; readonly batteryWh: number; readonly loadW: number },
  ) {
    this._onBoard = spec.probes;
    this._flight = make(1, 0);
    this._flight.dock(bay);
    this._flight.drainEvents();
    this._batteryWh = spec.batteryWh;
  }

  get flight(): FlightComputer {
    return this._flight;
  }
  get status(): ProbeStatus {
    return this._status;
  }
  /** Probes still on the travel ship or out flying (not lost). */
  get onBoard(): number {
    return this._onBoard;
  }
  get serial(): number {
    return this._serial;
  }
  get batteryWh(): number {
    return this._batteryWh;
  }
  /** Out of the bay: flying or parked. */
  get out(): boolean {
    return this._status === "en-vuelo" || this._status === "posada";
  }
  get canLaunch(): boolean {
    return this._status === "estibada";
  }
  /** Id of the asteroid it is parked on. */
  get parkedOn(): string | undefined {
    if (this._status !== "posada") return undefined;
    return (this._flight.target as { data?: { id: string } } | undefined)?.data?.id;
  }
  /** Distance and relative speed to the bay. */
  bayRange(): { distanceM: number; speedMs: number } {
    const b = this.bay();
    const s = this._flight.state;
    return { distanceM: s.position.sub(b.position).length(), speedMs: s.velocity.sub(b.velocity).length() };
  }
  get canRecover(): boolean {
    if (this._status !== "en-vuelo") return false;
    const r = this.bayRange();
    return r.distanceM <= PROBE_TUNING.captureRangeM && r.speedMs <= PROBE_TUNING.captureSpeedMs;
  }

  drainEvents(): ProbeEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Release it from the bay with the springs, along `away` (world, unit). */
  launch(away: Vec3): boolean {
    if (!this.canLaunch) return false;
    this._flight.undock(away.normalize().scale(PROBE_TUNING.releaseMs));
    this._flight.drainEvents();
    this._status = "en-vuelo";
    this.shaken = false;
    this.events.push({ type: "lanzada" });
    return true;
  }

  /** The arm grabs it and stows it in the bay; the battery is charged from the ship. */
  recover(): boolean {
    if (!this.canRecover) return false;
    this._flight.dock(this.bay);
    this._flight.drainEvents();
    this._status = "estibada";
    this._batteryWh = this.spec.batteryWh;
    this.events.push({ type: "recuperada" });
    return true;
  }

  /** Leave it behind (an angry asteroid, no time to go back for it). The next probe takes its place. */
  abandon(): boolean {
    if (!this.out) return false;
    this.lose("abandonada");
    return true;
  }

  /** Spare probes from the station: back to a full rack. Game rule. */
  restock(): void {
    if (this._status === "sin-sonda") this.replace(this._flight.simTimeS);
    this._onBoard = this.spec.probes;
  }

  /** Radiation on its electronics (an angry asteroid's pulse); past `toleranceMSv` it is lost. */
  irradiate(mSv: number, toleranceMSv: number): void {
    if (!this.out) return;
    this.doseMSv += mSv;
    if (this.doseMSv >= toleranceMSv) this.lose("destruida");
  }

  /** The asteroid throws the parked probe off its surface. */
  shakeOff(): void {
    if (this._status !== "posada") return;
    const f = this._flight;
    const target = f.target;
    f.releaseAnchor();
    if (target) f.applyImpulse(f.state.position.sub(target.position).normalize().scale(PROBE_TUNING.shakeOffMs));
    this.shaken = true;
    this.events.push({ type: "sacudida" });
  }

  /**
   * Fly one frame. Stowed, it rides the bay; out, it answers the remote pilot, drains its battery,
   * and inside an angry asteroid's reach it is shaken off and hit by debris.
   */
  update(dtS: number, input: ThrustCommand, threat?: ProbeThreat): void {
    const f = this._flight;
    f.update(dtS, this.out ? input : { mainThrottle: 0, translation: Vec3.ZERO, rotation: Vec3.ZERO });
    for (const e of f.drainEvents()) {
      if (e === "landed" && this._status === "en-vuelo") {
        this._status = "posada";
        this.events.push({ type: "posada", asteroidId: this.parkedOn ?? "" });
      }
      if (e === "lifted-off" && this._status === "posada") {
        this._status = "en-vuelo";
        this.events.push({ type: "despegada" });
      }
    }
    if (!this.out) return;
    this._batteryWh = Math.max(0, this._batteryWh - (this.spec.loadW * dtS) / 3600);
    if (this._batteryWh <= 0) return this.lose("sin-bateria");
    if (threat?.angry) {
      if (this._status === "posada" && !this.shaken) this.shakeOff();
      const d = f.telemetry().distanceToSurface;
      if (d < threat.safeDistanceM) {
        const closeness = 1 - Math.max(0, d) / threat.safeDistanceM;
        f.ship.damage(PROBE_TUNING.maxDamagePerS * closeness * threat.danger * dtS, "escombros");
      }
    } else this.shaken = false;
    // Whatever hit it (debris here, or an asteroid's attacks through the wrath module).
    if (f.ship.hullIntegrity <= 0) this.lose("destruida");
  }

  private lose(why: "abandonada" | "destruida" | "sin-bateria"): void {
    this._onBoard = Math.max(0, this._onBoard - 1);
    this.events.push({ type: "perdida", why });
    if (this._onBoard > 0) this.replace(this._flight.simTimeS);
    else this._status = "sin-sonda";
  }

  /** The next probe on the rack, latched in the bay, on the same mission clock. */
  private replace(timeS: number): void {
    this._serial++;
    this._flight = this.make(this._serial, timeS);
    this._flight.dock(this.bay);
    this._flight.drainEvents();
    this._status = "estibada";
    this._batteryWh = this.spec.batteryWh;
    this.shaken = false;
    this.doseMSv = 0;
  }
}
