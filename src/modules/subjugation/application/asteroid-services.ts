import { Vec3 } from "@core/math/vec3";
import type { AsteroidData } from "@modules/celestial/domain/asteroid";
import { chaseProfile, driveTripS, homeProfile, stepDrive, transitProfile, type DriveProfile } from "@modules/celestial/domain/gravity-drive";
import type { RapportBook } from "../domain/rapport";
import { FullExtraction, packageKg, shipPackage, stationPackage, YIELD_TUNING, type Package } from "../domain/yields";

/** A body that can move itself (the celestial `Asteroid` fits). */
export interface DrivenBody {
  readonly data: AsteroidData;
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly meanRadiusM: number;
  readonly massKg: number;
  moveTo(position: Vec3, velocity: Vec3): void;
}

/** What an angry asteroid is chasing (the wrath module's `pursuit`). */
export interface PursuitPort {
  anger(asteroidId: string): number;
  pursuit(asteroidId: string): { targetId: string; targetName: string; position(): Vec3; velocity(): Vec3; standoffM: number } | undefined;
}

/**
 * Port: the station end. `send` is the station's delivery inbox (`StationInbox` of the imports
 * module: goods land in the store when their hours run out); `goods` turns rock into store materials.
 */
export interface StationEnd {
  position(): Vec3;
  radiusM(): number;
  send(source: string, label: string, goods: Readonly<Record<string, number>>, hours: number): unknown;
  goods(p: Package): Readonly<Record<string, number>>;
}

/** Port: the travel ship's hold (level 2 packages). */
export interface ShipEnd {
  position(): Vec3;
  /** Load a package; returns the kg that fit. */
  load(p: Package): number;
}

export interface ServiceDeps {
  readonly rapport: RapportBook;
  readonly station: StationEnd;
  readonly ship: ShipEnd;
  readonly wrath?: PursuitPort;
  /** Something is anchored on it now (the lander or the probe): a level-4 asteroid waits for it to leave. */
  anchoredOn?(asteroidId: string): boolean;
  /** Game seconds in a game day (life on board: a day every 40 s). */
  readonly secondsPerDay: number;
  /** Station hours per game second (the station clock). */
  readonly stationHoursPerSecond: number;
  /**
   * Hook for compressed travel time (branch viajes-retos): given the game seconds a level-4 trip still
   * needs, how many times faster to run it. Default 1: the trip runs on plain game time.
   */
  travelTimeScale?(etaGameS: number): number;
}

/** What a subjugated asteroid is up to now (map and HUD). */
export type ServiceMode = "en-casa" | "persigue" | "vuelve" | "espera" | "viaja" | "aparcado" | "agotado";

export type ServiceEvent =
  | { readonly type: "paquete-nave"; readonly asteroidId: string; readonly name: string; readonly kg: number; readonly loadedKg: number; readonly flightS: number }
  | { readonly type: "paquete-estacion"; readonly asteroidId: string; readonly name: string; readonly kg: number; readonly hours: number }
  | { readonly type: "persigue"; readonly asteroidId: string; readonly name: string; readonly targetName: string }
  | { readonly type: "deja-de-perseguir"; readonly asteroidId: string; readonly name: string }
  | { readonly type: "sale"; readonly asteroidId: string; readonly name: string; readonly etaS: number }
  | { readonly type: "llega"; readonly asteroidId: string; readonly name: string }
  | { readonly type: "agotado"; readonly asteroidId: string; readonly name: string };

/** Game tuning of the services (labelled game values). */
export const SERVICE_TUNING = {
  /** Packages are thrown with the asteroid's gravity at this speed, m/s: they fly the real distance. */
  packageSpeedMs: 100,
  /** Gap between the station's keep-out sphere and a parked asteroid's surface, m. */
  parkGapM: 300,
  /** Arrived when this close to its goal (m) and this slow relative to it (m/s). */
  arriveM: 2,
  arriveMs: 0.2,
  /** Integration step of the drive, s of game time. */
  stepS: 0.25,
  /** Back home when this close, m. */
  homeM: 1,
} as const;

interface Service {
  readonly body: DrivenBody;
  home: Vec3;
  mode: ServiceMode;
  shipDays: number;
  stationDays: number;
  /** Station-relative park offset once a level-4 trip starts. */
  parkOffset?: Vec3;
  extraction?: FullExtraction;
  chasing?: string;
  inFlight: { kg: Package; leftS: number; flightS: number }[];
}

/**
 * Use case: what a subjugated asteroid does for Doménica, level by level (docs/design/subyugacion.md
 * §«Niveles»), and how every asteroid moves itself with its gravity drive (game fiction):
 * - level 2: a package of its rock to the travel ship's hold every game day;
 * - level 3: a bigger one to the station's delivery inbox every game day;
 * - level 4: it flies itself to the station, parks near it and is extracted whole, lot by lot;
 * - angry (any asteroid): it chases the craft that enraged it until it calms down, then flies home.
 * Level 1 (the nano_net) needs no motion: the wiring makes it eligible as a network core.
 */
export class AsteroidServices {
  private readonly services = new Map<string, Service>();
  private events: ServiceEvent[] = [];
  private acc = 0;

  constructor(
    bodies: readonly DrivenBody[],
    private readonly d: ServiceDeps,
  ) {
    for (const body of bodies) this.services.set(body.data.id, { body, home: body.position, mode: "en-casa", shipDays: 0, stationDays: 0, inFlight: [] });
  }

  drainEvents(): ServiceEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  mode(asteroidId: string): ServiceMode {
    return this.services.get(asteroidId)?.mode ?? "en-casa";
  }

  /** Where it lives now (its placement, or its parking spot by the station). */
  home(asteroidId: string): Vec3 | undefined {
    return this.services.get(asteroidId)?.home;
  }

  extraction(asteroidId: string): FullExtraction | undefined {
    return this.services.get(asteroidId)?.extraction;
  }

  /** Packages flying to the travel ship now. */
  packagesInFlight(asteroidId?: string): number {
    let n = 0;
    for (const s of this.services.values()) if (!asteroidId || s.body.data.id === asteroidId) n += s.inFlight.length;
    return n;
  }

  /** Where a level-4 asteroid is heading: its parking spot by the station (undefined when it is not on that trip). */
  destination(asteroidId: string): Vec3 | undefined {
    const s = this.services.get(asteroidId);
    return s && (s.mode === "viaja" || s.mode === "espera") ? this.parkPoint(s) : undefined;
  }

  /** Game seconds to the station for a level-4 asteroid still on its way (undefined otherwise). */
  etaS(asteroidId: string): number | undefined {
    const s = this.services.get(asteroidId);
    if (!s || (s.mode !== "viaja" && s.mode !== "espera")) return undefined;
    const goal = this.parkPoint(s);
    return driveTripS(goal.sub(s.body.position).length(), transitProfile(s.body.massKg));
  }

  /** Let `dtS` seconds of game time pass. */
  update(dtS: number): void {
    this.acc += Math.min(dtS, 120);
    const step = SERVICE_TUNING.stepS;
    while (this.acc >= step - 1e-9) {
      this.acc -= step;
      for (const s of this.services.values()) this.stepOne(s, step);
    }
  }

  private stepOne(s: Service, dt: number): void {
    const id = s.body.data.id;
    const r = this.d.rapport.peek(id);
    const level = r?.level ?? 0;
    this.fly(s, dt);

    if (s.mode === "aparcado" || s.mode === "agotado") return this.parked(s, dt);

    const chase = this.d.wrath?.pursuit(id);
    if (chase) {
      if (s.chasing !== chase.targetId) {
        s.chasing = chase.targetId;
        this.events.push({ type: "persigue", asteroidId: id, name: s.body.data.name, targetName: chase.targetName });
      }
      s.mode = "persigue";
      return this.drive(s, { position: chase.position(), velocity: chase.velocity() }, chaseProfile(s.body.massKg, this.d.wrath!.anger(id)), dt, chase.standoffM);
    }
    if (s.chasing) {
      s.chasing = undefined;
      this.events.push({ type: "deja-de-perseguir", asteroidId: id, name: s.body.data.name });
    }
    // Still angry but nobody to chase: it stays where it is (and does not work).
    if ((this.d.wrath?.anger(id) ?? 0) > 0) return this.drive(s, { position: s.body.position }, homeProfile(s.body.massKg), dt);

    if (level >= 4) return this.finalTrip(s, dt);

    const away = s.home.sub(s.body.position).length();
    if (away > SERVICE_TUNING.homeM || s.body.velocity.length() > 0.01) {
      s.mode = "vuelve";
      this.drive(s, { position: s.home }, homeProfile(s.body.massKg), dt);
      if (s.home.sub(s.body.position).length() <= SERVICE_TUNING.homeM && s.body.velocity.length() < 0.05) s.body.moveTo(s.home, Vec3.ZERO);
      return;
    }
    s.mode = "en-casa";
    const days = dt / this.d.secondsPerDay;
    r?.serve(days);
    if (level === 2) {
      s.shipDays += days;
      while (s.shipDays >= YIELD_TUNING.shipIntervalDays) {
        s.shipDays -= YIELD_TUNING.shipIntervalDays;
        const flightS = this.d.ship.position().sub(s.body.position).length() / SERVICE_TUNING.packageSpeedMs;
        s.inFlight.push({ kg: shipPackage(s.body.data), leftS: flightS, flightS });
      }
    }
    if (level === 3) {
      s.stationDays += days;
      while (s.stationDays >= YIELD_TUNING.stationIntervalDays) {
        s.stationDays -= YIELD_TUNING.stationIntervalDays;
        const pkg = stationPackage(s.body.data);
        const hours = (this.d.station.position().sub(s.body.position).length() / SERVICE_TUNING.packageSpeedMs) * this.d.stationHoursPerSecond;
        this.d.station.send(id, `Paquete de ${s.body.data.name}`, this.d.station.goods(pkg), hours);
        this.events.push({ type: "paquete-estacion", asteroidId: id, name: s.body.data.name, kg: packageKg(pkg), hours });
      }
    }
  }

  /** Level-2 packages flying to the travel ship land in its hold. */
  private fly(s: Service, dt: number): void {
    if (s.inFlight.length === 0) return;
    for (const p of s.inFlight) p.leftS -= dt;
    for (const p of s.inFlight.filter((x) => x.leftS <= 0)) {
      const loaded = this.d.ship.load(p.kg);
      this.events.push({ type: "paquete-nave", asteroidId: s.body.data.id, name: s.body.data.name, kg: packageKg(p.kg), loadedKg: loaded, flightS: p.flightS });
    }
    s.inFlight = s.inFlight.filter((x) => x.leftS > 0);
  }

  /** Level 4: wait until nothing is anchored on it, then fly to the station and park. */
  private finalTrip(s: Service, dt: number): void {
    const id = s.body.data.id;
    if (s.mode !== "viaja") {
      if (this.d.anchoredOn?.(id)) {
        s.mode = "espera";
        return;
      }
      s.parkOffset ??= this.parkOffset(s);
      s.mode = "viaja";
      this.events.push({ type: "sale", asteroidId: id, name: s.body.data.name, etaS: this.etaS(id) ?? 0 });
    }
    const goal = this.parkPoint(s);
    const p = transitProfile(s.body.massKg);
    const eta = driveTripS(goal.sub(s.body.position).length(), p);
    const k = Math.max(1, this.d.travelTimeScale?.(eta) ?? 1);
    this.drive(s, { position: goal }, p, dt * k);
    if (goal.sub(s.body.position).length() <= SERVICE_TUNING.arriveM && s.body.velocity.length() <= SERVICE_TUNING.arriveMs) {
      s.body.moveTo(goal, Vec3.ZERO);
      s.home = goal;
      s.mode = "aparcado";
      s.extraction = new FullExtraction(s.body.data);
      this.events.push({ type: "llega", asteroidId: id, name: s.body.data.name });
    }
  }

  /** Parked by the station: it rides along if the station moves, and is extracted lot by lot. */
  private parked(s: Service, dt: number): void {
    const goal = this.parkPoint(s);
    s.home = goal;
    s.body.moveTo(goal, Vec3.ZERO);
    const x = s.extraction;
    if (!x || s.mode === "agotado") return;
    const lot = x.step(dt * this.d.stationHoursPerSecond);
    if (lot) this.d.station.send(s.body.data.id, `Extracción de ${s.body.data.name}`, this.d.station.goods(lot), 0);
    if (x.done) {
      s.mode = "agotado";
      this.events.push({ type: "agotado", asteroidId: s.body.data.id, name: s.body.data.name });
    }
  }

  private drive(s: Service, goal: { position: Vec3; velocity?: Vec3 }, p: DriveProfile, dt: number, standoffM = 0): void {
    const next = stepDrive({ position: s.body.position, velocity: s.body.velocity }, goal, p, dt, standoffM);
    s.body.moveTo(next.position, next.velocity);
  }

  private parkPoint(s: Service): Vec3 {
    return this.d.station.position().add(s.parkOffset ?? this.parkOffset(s));
  }

  /**
   * Where it parks, relative to the station: on the side it comes from, clear of the station and of
   * the asteroids already parked there (turned round the station until it fits).
   */
  private parkOffset(s: Service): Vec3 {
    const st = this.d.station.position();
    const dist = this.d.station.radiusM() + SERVICE_TUNING.parkGapM + s.body.meanRadiusM;
    let dir = s.home.sub(st).normalize();
    if (dir.length() === 0) dir = Vec3.X;
    const others = [...this.services.values()].filter((o) => o !== s && o.parkOffset);
    for (let i = 0; i < 12; i++) {
      const off = dir.scale(dist);
      if (others.every((o) => o.parkOffset!.sub(off).length() > o.body.meanRadiusM + s.body.meanRadiusM + SERVICE_TUNING.parkGapM)) return off;
      const a = Math.PI / 6;
      dir = new Vec3(dir.x * Math.cos(a) - dir.z * Math.sin(a), dir.y, dir.x * Math.sin(a) + dir.z * Math.cos(a));
    }
    return dir.scale(dist);
  }
}
