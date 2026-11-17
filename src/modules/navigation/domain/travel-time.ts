import { BOARD_DAYS_PER_REAL_S, BOARD_TIME_LAPSE } from "@core/board-time";

/**
 * Compressed travel (docs/design/viajes.md). Long trips of the travel ship and the probe are
 * programmed with code challenges and then fly themselves; their real duration (the physics of the
 * hop: continuous Hall burn, or burn–coast–brake) is played in time-lapse so the trip never takes
 * more than a cap of real seconds. Meanwhile the player is free to do other things.
 */

/** Who flies a leg. `lander`: the landing module (Explorer); `probe`: the uncrewed Sentinel probe. */
export type TravelVehicle = "carrier" | "lander" | "probe";

/** Game values for compressed travel. */
export const TRAVEL_TIME = {
  /**
   * Safety cap of a trip, real seconds (game value): 10 minutes. Berón (2026-11-17): «no hay problema si
   * tarda minutos, ya que en esos minutos se pueden hacer las tareas internas». Below it every trip plays
   * at the board's pace; only a trip of more than 10 game hours is squeezed into it.
   */
  capS: 600,
  /**
   * Lapse of each vehicle, game seconds per real second: the board's own pace, ×60 (a game hour per real
   * minute, src/core/board-time.ts). One clock for the whole game during a trip: the flight, the crew's
   * hunger, the life support and the station all advance the same game time (docs/design/viajes.md).
   */
  lapse: { carrier: BOARD_TIME_LAPSE, lander: BOARD_TIME_LAPSE, probe: BOARD_TIME_LAPSE } as Readonly<Record<TravelVehicle, number>>,
  /**
   * Top lapse for legs flown by the physics (the 120 Hz flight computer and its guidance): beyond it a
   * frame would need too many steps. Game value.
   */
  maxPhysicsLapse: 60,
  /**
   * Juventas's legs (12 kg, two 1 mN thrusters: hours of game time) may lapse faster: a frame of the
   * probe alone costs a few hundred steps, like a lander frame at 60×. Game value.
   */
  maxProbePhysicsLapse: 400,
} as const;

/**
 * Pace of life on board (crew, plants, animals, bioreactor, nano_net, station machines): one day every
 * 24 real minutes (src/core/board-time.ts, docs/design/vida-a-bordo.md «Ritmo de los días»).
 */
export { BOARD_DAYS_PER_REAL_S } from "@core/board-time";

/** Real seconds a trip of `gameS` takes at its base `lapse`, never more than `capS`. */
export function realSeconds(gameS: number, lapse: number, capS: number = TRAVEL_TIME.capS): number {
  if (gameS <= 0) return 0;
  return Math.min(capS, gameS / Math.max(1, lapse));
}

export interface LegTime {
  readonly gameS: number;
  /** Base lapse of the vehicle flying it. */
  readonly lapse: number;
}

/**
 * Real seconds for each leg of one trip (the mothership's hop and then the lander's last stretch):
 * each at its base lapse if the whole fits under the cap, else the cap shared in the same proportion.
 */
export function legBudgets(legs: readonly LegTime[], capS: number = TRAVEL_TIME.capS): number[] {
  const own = legs.map((l) => (l.gameS > 0 ? l.gameS / Math.max(1, l.lapse) : 0));
  const total = own.reduce((s, x) => s + x, 0);
  const k = total > capS ? capS / total : 1;
  return own.map((x) => x * k);
}

export type TravelState = "en-ruta" | "llegada" | "cancelado";

/** Never plan on less than this real time left (avoids dividing by zero at the end), s. */
const MIN_LEFT_S = 0.05;

/**
 * The time-lapse of one leg. It knows how much game time the leg was planned to take and its real
 * budget; each frame it says how many game seconds pass. Given a live estimate of what is left (the
 * autopilot's), it adapts so the leg still ends on budget; a kinematic leg plays at a steady lapse.
 */
export class TravelClock {
  private real = 0;
  private game = 0;
  private _state: TravelState = "en-ruta";

  constructor(
    readonly plannedGameS: number,
    readonly budgetRealS: number,
    private readonly limits: { readonly minLapse: number; readonly maxLapse: number } = { minLapse: 1, maxLapse: Infinity },
  ) {}

  get state(): TravelState {
    return this._state;
  }
  get realElapsedS(): number {
    return this.real;
  }
  get gameElapsedS(): number {
    return this.game;
  }

  private left(remainingGameS?: number): number {
    const r = remainingGameS !== undefined && Number.isFinite(remainingGameS) ? remainingGameS : this.plannedGameS - this.game;
    return Math.max(0, r);
  }

  /** Game seconds per real second now; 1 once the leg is over. */
  lapse(remainingGameS?: number, stepS = MIN_LEFT_S): number {
    if (this._state !== "en-ruta") return 1;
    // Within the last step, finish what is left in that step.
    const realLeft = Math.max(1e-6, stepS, this.budgetRealS - this.real);
    const l = this.left(remainingGameS) / realLeft;
    return Math.min(this.limits.maxLapse, Math.max(this.limits.minLapse, l));
  }

  /** Let `realDtS` pass; returns the game seconds that pass with it. */
  advance(realDtS: number, remainingGameS?: number): number {
    const g = Math.max(0, realDtS) * this.lapse(remainingGameS, realDtS);
    if (this._state === "en-ruta") {
      this.real += Math.max(0, realDtS);
      this.game += g;
    }
    return g;
  }

  /** Real seconds left at the current pace. */
  etaRealS(remainingGameS?: number): number {
    if (this._state !== "en-ruta") return 0;
    return this.left(remainingGameS) / this.lapse(remainingGameS);
  }

  arrive(): void {
    if (this._state === "en-ruta") this._state = "llegada";
  }
  cancel(): void {
    if (this._state === "en-ruta") this._state = "cancelado";
  }
}

/** How much time passes this frame for each clock of the game. */
export interface WorldStep {
  /** Mission clock (flight physics, asteroids, their wrath, the probe's battery), game seconds. */
  readonly missionS: number;
  /** Life on board (crew, garden, animals, bioreactor, nano_net, station machines), days. */
  readonly lifeDays: number;
}

/**
 * One frame of world time while a trip plays at `lapse`: the mission clock runs at the lapse, and life
 * on board keeps its own pace unless the trip compresses time even more, in which case it follows the
 * trip so nothing on board falls behind the voyage.
 */
export function worldStep(realDtS: number, lapse: number, boardDaysPerRealS: number = BOARD_DAYS_PER_REAL_S): WorldStep {
  const missionS = Math.max(0, realDtS) * Math.max(1, lapse);
  return { missionS, lifeDays: Math.max(Math.max(0, realDtS) * boardDaysPerRealS, missionS / 86400) };
}

/** Every clock the main loop advances in one frame (docs/qa/entrelazamiento.md, «Relojes»). */
export interface FrameClocks extends WorldStep {
  /** Game seconds per real second of the mission clock: the trip's lapse, else the manual time warp. */
  readonly warp: number;
  /** Station hours this frame (machines, biosystems, the import inbox and the asteroids' services). */
  readonly stationHours: number;
  /**
   * A trip is under way but a threat of the asteroids' wrath holds it at ×1 this frame: its time-lapse
   * clock must not count the frame (it resumes its lapse when the threat ends).
   */
  readonly held: boolean;
}

/**
 * The clocks of one frame, as main wires them (docs/qa/entrelazamiento.md):
 * - during a compressed trip the mission clock runs at the trip's lapse (whatever the manual warp asks)
 *   and life on board keeps its own pace, unless the trip compresses more than it;
 * - outside a trip the manual warp (already cleared by main: idle, far, nothing flying at you) speeds up
 *   the mission clock and life on board alike (decision HC-01 in docs/qa);
 * - a `threat` of the wrath to the craft that travels (a projectile, a ram, a chase within reach) drops
 *   everything to ×1, the trip's lapse included (decision HC-03): the trip is `held`;
 * - the station always follows life on board: 24 station hours per day on board.
 */
export function frameClocks(realDtS: number, tripLapse: number, manualWarp: number, stationHoursPerRealS: number, threat = false): FrameClocks {
  const dt = Math.max(0, realDtS);
  const onTrip = tripLapse > 1;
  if (threat) {
    const w = worldStep(dt, 1);
    return { missionS: w.missionS, lifeDays: w.lifeDays, warp: 1, stationHours: w.lifeDays * 24, held: onTrip };
  }
  if (onTrip) {
    const w = worldStep(dt, tripLapse);
    return { missionS: w.missionS, lifeDays: w.lifeDays, warp: tripLapse, stationHours: w.lifeDays * 24, held: false };
  }
  const warp = manualWarp > 1 ? manualWarp : 1;
  const stationHours = dt * warp * stationHoursPerRealS;
  return { missionS: dt * warp, lifeDays: stationHours / 24, warp, stationHours, held: false };
}
