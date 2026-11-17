import { Vec3 } from "@core/math/vec3";
import type { FlightComputer } from "@modules/flight/application/flight-computer";
import { RigidBodyState } from "@modules/flight/domain/rigid-body";
import { DEEP_SPACE_DEPLOYER } from "../data/deployer";
import type { ThrustCommand } from "@modules/ship/domain/ship";

export type ProbeStatus = "estibada" | "en-vuelo" | "posada" | "sin-sonda";

export type ProbeEvent =
  | { type: "desplegando" }
  | { type: "lanzada" }
  | { type: "posada"; asteroidId: string }
  | { type: "despegada" }
  | { type: "recuperada" }
  | { type: "sacudida" }
  | { type: "perdida"; why: "abandonada" | "destruida" | "sin-bateria" | "fin-de-mision" };

/** Game tuning of the probe's operations (labelled game values). */
export const PROBE_TUNING = {
  /**
   * Push of the deployer's release springs, m/s. Real: ISISPACE's Deep Space Deployer, which carries Juventas
   * and Milani on Hera, releases them at 3 cm/s (below 5 cm/s so the asteroids' gravity keeps them;
   * a LEO deployer pushes at about 1 m/s, the ISS's J-SSOD at 0,77–1,7 m/s):
   * https://isispace.nl/isispace-deep-space-deployer-supports-esas-hera-mission-to-observe-dart-impact-and-beyond/
   */
  releaseMs: DEEP_SPACE_DEPLOYER.releaseMs.value,
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

/**
 * The deployer's sequence (real order, ISISPACE DSD): the door opens, the CubeSat moves out to the deployer's
 * edge still held and on its umbilical, the umbilical lets go and the springs release it. The real checks
 * take minutes to hours; here each motion lasts a few seconds (game timing, licence) so it can be watched.
 */
export const DEPLOYER = {
  /** The door swings open, s (game timing). */
  doorS: 4,
  /** The CubeSat slides out to the edge, s (game timing). */
  pushS: 4,
  /** How far it slides out: about the DSD's open length minus its closed one plus the CubeSat's overhang, m (estimate from the 432 → 555 mm envelope). */
  extensionM: 0.35,
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
 * Use case: the uncrewed probe the travel ship carries (docs/design/subyugacion.md, modulo-lunar-juventas.md).
 * Like Juventas and Milani on Hera, each one rides in its own deployer on the carrier's hull (one slot each):
 * released by the deployer's sequence (door, slide out, springs), flown remotely with its own flight computer,
 * parked on an asteroid (stage 1 of the subjugation). Real Juventas never comes back: its mission ends on the
 * surface (Dimorphos) and the next one in a deployer takes over; an empty set of deployers is refilled only by
 * loading a Juventas built from the station's catalogue (`load`). The arm's catch (`recover`) is the fictional
 * ship's, kept behind `REAL_ONLY`.
 */
export class ProbeOps {
  private _flight: FlightComputer;
  private _status: ProbeStatus = "estibada";
  /** Which deployers hold a probe (one probe per deployer, as on Hera). */
  private readonly full: boolean[];
  /** The deployer of the current probe (the one flying or about to be released). */
  private cur = 0;
  /** Seconds into the deployer's sequence, while it runs. */
  private deployT: number | undefined;
  private away = Vec3.Y;
  private _serial = 1;
  private _batteryWh: number;
  private shaken = false;
  private doseMSv = 0;
  private events: ProbeEvent[] = [];

  /**
   * @param make builds a fresh probe (its own ship and flight computer) on the mission clock `timeS`, latched to the bay
   * @param bay pose of deployer `slot` on the travel ship now (the probe inside, door closed); its +y is the release direction
   */
  constructor(
    private readonly make: (serial: number, timeS: number) => FlightComputer,
    private readonly bay: (slot: number) => RigidBodyState,
    readonly spec: { readonly probes: number; readonly batteryWh: number; readonly loadW: number },
  ) {
    this.full = Array.from({ length: spec.probes }, () => true);
    this._flight = make(1, 0);
    this._flight.dock(this.pose);
    this._flight.drainEvents();
    this._batteryWh = spec.batteryWh;
  }

  get flight(): FlightComputer {
    return this._flight;
  }
  get status(): ProbeStatus {
    return this._status;
  }
  /** Probes still in their deployers or out flying (not lost, mission not ended). */
  get onBoard(): number {
    return this.full.filter(Boolean).length + (this.out ? 1 : 0);
  }
  /** Probes still waiting in their deployers (the current one included until it is released). */
  get inDeployers(): number {
    return this.full.filter(Boolean).length;
  }
  /** Deployers on the carrier (one probe each). */
  get deployers(): number {
    return this.full.length;
  }
  /** The deployer the current probe rides in. */
  get slot(): number {
    return this.cur;
  }
  /** The deployer's sequence is running (door opening, the probe sliding out). */
  get deploying(): boolean {
    return this.deployT !== undefined;
  }
  /** How open deployer `slot`'s door is, 0..1: opening during its sequence, open once empty, shut when loaded. */
  doorOpen(slot: number): number {
    if (slot === this.cur && this.deployT !== undefined) return Math.min(1, this.deployT / DEPLOYER.doorS);
    return this.full[slot] ? 0 : 1;
  }
  /** How far out of its deployer the current probe has slid, 0..1. */
  private extension(): number {
    return this.deployT === undefined ? 0 : Math.max(0, Math.min(1, (this.deployT - DEPLOYER.doorS) / DEPLOYER.pushS));
  }
  /** Where the current probe is held: in its deployer, or slid out to the edge during the sequence. */
  private readonly pose = (): RigidBodyState => {
    const b = this.bay(this.cur);
    const e = this.extension();
    if (e <= 0) return b;
    return new RigidBodyState(b.position.add(b.toWorld(Vec3.Y).scale(e * DEPLOYER.extensionM)), b.velocity, b.orientation, b.angularVelocityBody);
  };
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
    return this._status === "estibada" && this.deployT === undefined;
  }
  /** Id of the asteroid it is parked on. */
  get parkedOn(): string | undefined {
    if (this._status !== "posada") return undefined;
    return (this._flight.target as { data?: { id: string } } | undefined)?.data?.id;
  }
  /** Distance and relative speed to the bay. */
  bayRange(): { distanceM: number; speedMs: number } {
    const b = this.bay(this.cur);
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

  /**
   * Start the deployer's sequence: the door opens, the probe slides out to the edge and the springs release it
   * along `away` (world, unit) at `PROBE_TUNING.releaseMs` (`update` runs it; «lanzada» when it is free).
   */
  launch(away: Vec3): boolean {
    if (!this.canLaunch) return false;
    this.away = away.normalize();
    this.deployT = 0;
    this.events.push({ type: "desplegando" });
    return true;
  }

  private release(): void {
    // Out of the deployer: it is free, at the deployer's edge, pushed by the springs.
    const edge = this.pose();
    this.deployT = undefined;
    this.full[this.cur] = false;
    this._flight.dock(() => edge);
    this._flight.undock(this.away.scale(PROBE_TUNING.releaseMs));
    this._flight.drainEvents();
    this._status = "en-vuelo";
    this.shaken = false;
    this.events.push({ type: "lanzada" });
  }

  /** The arm grabs it and stows it in the bay; the battery is charged from the ship. */
  recover(): boolean {
    if (!this.canRecover) return false;
    this.full[this.cur] = true;
    this._flight.dock(this.pose);
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

  /** Spare probes from the station: every deployer full again (the fictional ship's rule; real: `load`). */
  restock(): void {
    for (let i = 0; i < this.full.length; i++) this.full[i] = true;
    if (this._status === "sin-sonda") this.replace(this._flight.simTimeS);
  }

  /** An empty deployer, if any (where `load` would put a new probe). */
  get emptyDeployer(): number | undefined {
    const i = this.full.findIndex((f) => !f);
    return i < 0 ? undefined : i;
  }

  /**
   * One Juventas built at the station (the catalogue) goes into an empty deployer and its door shuts. With
   * no probe left, it becomes the current one. False when every deployer is full or busy.
   */
  load(): boolean {
    const i = this.emptyDeployer;
    if (i === undefined) return false;
    this.full[i] = true;
    if (this._status === "sin-sonda") {
      this.cur = i;
      this.replace(this._flight.simTimeS);
    }
    return true;
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
    if (this.deployT !== undefined) {
      this.deployT += dtS;
      if (this.deployT >= DEPLOYER.doorS + DEPLOYER.pushS) this.release();
    }
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

  private lose(why: "abandonada" | "destruida" | "sin-bateria" | "fin-de-mision"): void {
    if (why === "fin-de-mision" && this.parkedOn) this.ended.push({ serial: this._serial, asteroidId: this.parkedOn });
    this.events.push({ type: "perdida", why });
    const next = this.full.findIndex(Boolean);
    if (next >= 0) {
      this.cur = next;
      this.replace(this._flight.simTimeS);
    } else this._status = "sin-sonda";
  }

  /** Probes whose mission ended parked on an asteroid (they stay there, like Juventas on Dimorphos). */
  readonly ended: { readonly serial: number; readonly asteroidId: string }[] = [];

  /**
   * End the parked probe's mission where it is (real Juventas: it ends on Dimorphos's surface and never comes
   * back). The next probe in a deployer takes over.
   */
  endMission(): boolean {
    if (this._status !== "posada") return false;
    this.lose("fin-de-mision");
    return true;
  }

  /** The next probe, latched in its deployer, on the same mission clock. */
  private replace(timeS: number): void {
    this._serial++;
    this.deployT = undefined;
    this._flight = this.make(this._serial, timeS);
    this._flight.dock(this.pose);
    this._flight.drainEvents();
    this._status = "estibada";
    this._batteryWh = this.spec.batteryWh;
    this.shaken = false;
    this.doseMSv = 0;
  }
}
