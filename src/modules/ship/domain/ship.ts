import { Vec3 } from "@core/math/vec3";
import type { HullSpec, MountedThruster, Propellant, TankSpec } from "./components";
import { equipmentMassKg, type Equipment } from "./equipment";
import { debrisDamageFactor } from "./mmod";
import type { RcsThruster } from "./rcs-layout";
import { deltaV, massFlow } from "./rocket";

export interface ShipDesign {
  readonly hull: HullSpec;
  readonly tanks: readonly { spec: TankSpec; fillKg: number }[];
  readonly mainEngines: readonly MountedThruster[];
  readonly rcs: readonly RcsThruster[];
  /** Cabin, power, battery, shield and the fixed systems: everything else that has mass. */
  readonly equipment: readonly Equipment[];
  /**
   * Docking port (body frame) on top of the hull, facing +y: where the probe latches to the
   * mothership (docs/design/nave-nodriza.md).
   */
  readonly dockingPort?: Vec3;
}

/** Pilot intent, already normalised: throttle 0..1, axes -1..1 in the body frame. */
export interface ThrustCommand {
  readonly mainThrottle: number;
  readonly translation: Vec3;
  readonly rotation: Vec3;
}

export interface ThrustOutput {
  readonly forceBody: Vec3;
  readonly torqueBody: Vec3;
}

/** What hurt the hull: a crash or contact, or debris thrown by an asteroid. */
export type DamageCause = "choque" | "escombros";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A ship assembled from real components. Owns its propellant state; knows nothing about rendering. */
export class Ship {
  private readonly fuel = new Map<Propellant, number>();
  private _hull = 1;

  private constructor(private _design: ShipDesign) {
    for (const t of _design.tanks) {
      if (t.fillKg < 0 || t.fillKg > t.spec.capacityKg) throw new RangeError(`Tank fill out of range: ${t.fillKg} kg`);
      this.fuel.set(t.spec.propellant, (this.fuel.get(t.spec.propellant) ?? 0) + t.fillKg);
    }
  }

  /** The parts bolted on right now. Changes only through `refit`. */
  get design(): ShipDesign {
    return this._design;
  }

  /**
   * Swap parts: propellant on board stays, except what no longer fits in the new tanks (it is vented).
   * A tank that is swapped leaves with its share of the pool, and the new one comes from the station
   * loaded and pressurised (the last step of the swap). Tank fills in the new design are ignored.
   */
  refit(design: ShipDesign): void {
    const old = this._design;
    design.tanks.forEach((t, i) => {
      const was = old.tanks[i];
      if (was && was.spec === t.spec) return;
      if (was) {
        const p = was.spec.propellant;
        const pool = this.propellantCapacityKg(p);
        const kg = this.propellantKg(p);
        this.fuel.set(p, Math.max(0, kg - (pool > 0 ? (kg * was.spec.capacityKg) / pool : 0)));
      }
      this.fuel.set(t.spec.propellant, this.propellantKg(t.spec.propellant) + t.spec.capacityKg);
    });
    this._design = design;
    for (const [p, kg] of [...this.fuel]) this.fuel.set(p, Math.min(kg, this.propellantCapacityKg(p)));
  }

  static create(design: ShipDesign): Ship {
    return new Ship(design);
  }

  get name(): string {
    return this.design.hull.name;
  }
  get rcsCount(): number {
    return this.design.rcs.length;
  }
  get mainEngines(): readonly MountedThruster[] {
    return this.design.mainEngines;
  }

  get dryMassKg(): number {
    const d = this.design;
    const thrusters = [...d.mainEngines, ...d.rcs].reduce((m, t) => m + t.model.dryMassKg, 0);
    const tanks = d.tanks.reduce((m, t) => m + t.spec.dryMassKg, 0);
    return equipmentMassKg(d.equipment) + thrusters + tanks;
  }

  get massKg(): number {
    let p = 0;
    for (const v of this.fuel.values()) p += v;
    return this.dryMassKg + p;
  }

  /** 1 = intact, 0 = destroyed. */
  get hullIntegrity(): number {
    return this._hull;
  }

  /**
   * Lose hull integrity. Debris (an angry asteroid's rocks) is cut down by the cabin wall and the
   * micrometeoroid shield (`debrisDamageFactor`); a crash or a hard contact is not.
   */
  damage(fraction: number, cause: DamageCause = "choque"): void {
    const k = cause === "escombros" ? debrisDamageFactor(this.design.equipment) : 1;
    this._hull = Math.max(0, this._hull - Math.max(0, fraction) * k);
  }

  repair(fraction: number): void {
    this._hull = Math.min(1, this._hull + Math.max(0, fraction));
  }

  propellantKg(p: Propellant): number {
    return this.fuel.get(p) ?? 0;
  }

  /**
   * Load propellant into the tanks of one propellant (a station's refuelling line): never past their
   * capacity. Returns the kg taken.
   */
  refuel(p: Propellant, kg: number): number {
    const took = Math.max(0, Math.min(kg, this.propellantCapacityKg(p) - this.propellantKg(p)));
    if (took > 0) this.fuel.set(p, this.propellantKg(p) + took);
    return took;
  }

  /** The propellants the tanks hold, each once, in tank order. */
  get propellants(): Propellant[] {
    return [...new Set(this.design.tanks.map((t) => t.spec.propellant))];
  }

  propellantCapacityKg(p: Propellant): number {
    return this.design.tanks.filter((t) => t.spec.propellant === p).reduce((m, t) => m + t.spec.capacityKg, 0);
  }

  /** Principal moments of inertia of a solid box of the hull's size and the ship's current mass. */
  get inertiaKgM2(): Vec3 {
    const { x, y, z } = this.design.hull.size;
    const k = this.massKg / 12;
    return new Vec3(k * (y * y + z * z), k * (x * x + z * z), k * (x * x + y * y));
  }

  /** Delta-v left in the main engines, m/s. */
  mainDeltaV(): number {
    const engine = this.design.mainEngines[0];
    if (!engine) return 0;
    const prop = this.propellantKg(engine.model.propellant);
    return deltaV(engine.model.ispS, this.massKg, this.massKg - prop);
  }

  /** Fires thrusters for dt seconds, burns propellant and returns the resulting body-frame force and torque. */
  /** Force and torque the thrusters would give at this command, without burning anything. */
  preview(cmd: ThrustCommand): ThrustOutput {
    return this.resolve(this.firings(cmd), (p) => (this.propellantKg(p) > 0 ? 1 : 0));
  }

  /** Fires thrusters for dt seconds, burns propellant and returns the resulting body-frame force and torque. */
  fire(cmd: ThrustCommand, dt: number): ThrustOutput {
    const firings = this.firings(cmd);
    const demand = new Map<Propellant, number>();
    for (const { t, duty } of firings) {
      const kg = massFlow(t.model.thrustN, t.model.ispS) * duty * dt;
      demand.set(t.model.propellant, (demand.get(t.model.propellant) ?? 0) + kg);
    }
    // If a tank cannot cover this step, every thruster on it runs at the fraction it can supply.
    const supply = new Map<Propellant, number>();
    for (const [p, kg] of demand) {
      const available = this.propellantKg(p);
      supply.set(p, kg === 0 ? (available > 0 ? 1 : 0) : Math.min(1, available / kg));
      this.fuel.set(p, Math.max(0, available - kg));
    }
    return this.resolve(firings, (p) => supply.get(p) ?? 0);
  }

  private firings(cmd: ThrustCommand): { t: MountedThruster; duty: number }[] {
    const out: { t: MountedThruster; duty: number }[] = [];
    const throttle = clamp01(cmd.mainThrottle);
    for (const t of this.design.mainEngines) if (throttle > 0) out.push({ t, duty: throttle });
    for (const t of this.design.rcs) {
      const duty =
        t.role === "translation"
          ? clamp01(t.direction.dot(cmd.translation))
          : clamp01(t.position.cross(t.direction).normalize().dot(cmd.rotation));
      if (duty > 0) out.push({ t, duty });
    }
    return out;
  }

  private resolve(firings: { t: MountedThruster; duty: number }[], supply: (p: Propellant) => number): ThrustOutput {
    let force = Vec3.ZERO;
    let torque = Vec3.ZERO;
    for (const { t, duty } of firings) {
      const f = t.direction.scale(t.model.thrustN * duty * supply(t.model.propellant));
      force = force.add(f);
      torque = torque.add(t.position.cross(f));
    }
    return { forceBody: force, torqueBody: torque };
  }
}
