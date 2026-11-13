import { Vec3 } from "@core/math/vec3";
import type { AsteroidData } from "@modules/celestial/domain/asteroid";
import { Anger, type DuelPhase } from "../domain/anger";
import { BLAST, fragmentEnergyOnTargetJ, nuclearDoseMSv, nuclearEnergyOnTargetJ, volatileCharge } from "../domain/blast";
import { escapeImpossible, gripAt, gripRadiusM } from "../domain/grip";
import { powerOf, reaches, TIERS, type AsteroidPower, type PowerTier, type TargetKind } from "../domain/power";
import { closestApproachM, interceptVelocity, kineticEnergyJ, rockDiameterM, sphereMassKg, stepProjectile, type Projectile, type ProjectileKind } from "../domain/projectile";
import { BLUNT_ROCK_KG, impactFraction, type Protection } from "../domain/protection";
import { PULSE, pulseDoseMSv, shieldedDoseMSv } from "../domain/radiation";
import { JET, jetOnTarget } from "../domain/jet";
import { chooseAttack, chargeTimeS, dodgeDirection, dodgeNeeded, overshoot, RAM, ramCapable, ramImpact } from "../domain/ram";
import { chargeProfile, chaseProfile, type DriveProfile } from "@modules/celestial/domain/gravity-drive";

/** An asteroid that can get angry: the celestial `Asteroid` fits this. */
export interface WrathBody {
  readonly data: AsteroidData;
  readonly position: Vec3;
  readonly meanRadiusM: number;
  /** How fast it moves (its gravity drive); still if absent. */
  readonly velocity?: Vec3;
  gravityAt(p: Vec3): Vec3;
}

/**
 * Port for anything an angry asteroid can attack: the probe, the lander, Doménica in her suit, the
 * travel ship, the station. The wiring decides how damage, dose and pull land on the real objects.
 */
export interface WrathTarget {
  readonly id: string;
  readonly kind: TargetKind;
  readonly name: string;
  /** Cross-section radius for hits, m. */
  readonly radiusM: number;
  position(): Vec3;
  velocity(): Vec3;
  /** Out in space and attackable now (a docked or stowed craft is not a separate target). */
  active(): boolean;
  protection(): Protection;
  /** Lose hull integrity (already cut down by its protection). */
  damage(fraction: number, cause: ProjectileKind | "pulso" | "chorro" | "embestida"): void;
  /** Resting on a surface (a landed craft is shaken off, never rammed). */
  landed?(): boolean;
  /** Crew dose behind its shield, mSv. */
  dose?(mSv: number): void;
  /** Velocity change from a gravity grip, m/s (world). */
  pull?(deltaV: Vec3): void;
  /** Thrust acceleration it can make now, m/s² (to tell whether escape is possible). */
  thrustAccelMs2?(): number;
  /** Its mass, kg: a comet's jet pushes it by momentum / mass. Without it the jet only sandblasts. */
  massKg?(): number;
}

export type WrathEvent =
  | { readonly type: "enraged"; readonly asteroidId: string; readonly tier: number; readonly level: number }
  | { readonly type: "calmed"; readonly asteroidId: string }
  | { readonly type: "launched"; readonly projectile: Projectile; readonly asteroidId: string }
  | { readonly type: "hit"; readonly targetId: string; readonly kind: ProjectileKind; readonly energyJ: number; readonly fraction: number }
  | { readonly type: "burst"; readonly kind: "carga" | "nuclear"; readonly position: Vec3; readonly radiusM: number }
  | { readonly type: "pulse"; readonly asteroidId: string; readonly targetId: string; readonly from: Vec3; readonly to: Vec3; readonly doseMSv: number }
  | { readonly type: "escaped"; readonly asteroidId: string; readonly targetId: string }
  /** A comet's outgassing jet: the dust it put on the target and the push it gave. */
  | { readonly type: "jet"; readonly asteroidId: string; readonly targetId: string; readonly from: Vec3; readonly to: Vec3; readonly interceptedKg: number; readonly deltaVMs: number; readonly fraction: number }
  /** A ram is coming: it gathers itself for `windupS`, then sprints at the craft (docs/design/poderes-ira.md, «Embestida»). */
  | { readonly type: "ram-windup"; readonly asteroidId: string; readonly targetId: string; readonly windupS: number; readonly etaS: number; readonly topSpeedMs: number; readonly dodgeM: number; readonly dodgeAccelMs2: number }
  | { readonly type: "ram-charge"; readonly asteroidId: string; readonly targetId: string; readonly from: Vec3; readonly aim: Vec3 }
  | { readonly type: "ram-hit"; readonly asteroidId: string; readonly targetId: string; readonly position: Vec3; readonly closingMs: number; readonly energyJ: number; readonly absorbedJ: number; readonly deltaVMs: number; readonly fraction: number }
  /** Dodged: it flies on `stopM` past the craft and needs `turnaroundS` to come back. */
  | { readonly type: "ram-miss"; readonly asteroidId: string; readonly targetId: string; readonly speedMs: number; readonly stopM: number; readonly turnaroundS: number }
  /** A craft landed on it is shaken off its back instead of rammed. */
  | { readonly type: "shaken"; readonly asteroidId: string; readonly targetId: string; readonly deltaVMs: number };

/** Where to go to be out of reach: straight away from the asteroid, this far. */
export interface FleeGuidance {
  readonly asteroidId: string;
  readonly asteroidName: string;
  /** Unit vector, world frame. */
  readonly direction: Vec3;
  /** Metres still to cover to leave the reach (0 = already out). */
  readonly distanceM: number;
  readonly timeToCalmS: number;
  /** Inside a gravity grip stronger than its engine. */
  readonly trapped: boolean;
}

export interface Threat {
  readonly projectile: Projectile;
  /** Seconds to arrival at the current closing speed (Infinity if not closing). */
  readonly etaS: number;
  readonly distanceM: number;
}

/** At most this many projectiles in flight from all asteroids (game value, keeps phones smooth). */
export const MAX_PROJECTILES = 24;
/** Throws per asteroid slow down below this anger (fire interval / max(anger, this)). */
const MIN_RATE_ANGER = 0.25;
/** Longest a projectile flies before it is lost among the rocks, s. */
const MAX_AGE_S = 300;
/** Integration step, s. */
const STEP_S = 0.1;
/** Fragments and X-rays reach this far from a burst before they are negligible, m. */
const BURST_RANGE_M = 400;

/** Reach of an asteroid: its tier's, or for a gripping body at least out to the edge of its grip. */
function reachOf(m: Mood): number {
  const r = m.power.spec.reachM;
  return m.power.spec.weapons.includes("agarre") ? Math.max(r, gripRadiusM(m.body.meanRadiusM) - m.body.meanRadiusM) : r;
}

interface RamState {
  phase: "preparando" | "embistiendo";
  readonly targetId: string;
  /** Wind-up seconds left. */
  leftS: number;
  /** Seconds since it set off. */
  ageS: number;
  /** Where it set off from, and where it aims (the craft's predicted position). */
  from: Vec3;
  aim: Vec3;
  direction: Vec3;
  profile: DriveProfile;
  /** Craft relative to its centre on the last step (for the swept hit test). */
  prevRel?: Vec3;
}

interface Mood {
  readonly body: WrathBody;
  readonly power: AsteroidPower;
  readonly anger: Anger;
  cooldownS: number;
  throws: number;
  /** Targets that were in reach on the last step (to announce escapes). */
  inReach: Set<string>;
  /** Who enraged it (target ids): it chases them with its gravity drive until it calms down. */
  offenders: Set<string>;
  ram?: RamState;
  /** Seconds until it may charge (or shake a craft off) again. */
  ramCooldownS: number;
}

/** Who a failed duel at each phase enrages it against: the craft in contact with it. */
export const OFFENDERS_BY_PHASE: Readonly<Record<DuelPhase, readonly string[]>> = { 1: ["sonda"], 2: ["aterrizador"], 3: ["traje", "aterrizador"] };
/** A chasing asteroid holds this fraction of its reach from the craft it chases (game value): close enough to hit it. */
export const CHASE_STANDOFF_OF_REACH = 0.4;

/** What an angry asteroid is chasing now (docs/design/poderes-ira.md, «Persecución»). */
export interface Pursuit {
  readonly targetId: string;
  readonly targetName: string;
  position(): Vec3;
  velocity(): Vec3;
  /** Centre-to-craft distance it keeps, m. */
  readonly standoffM: number;
  /** A ram under way: winding up (it holds) or charging (it sprints along `direction` with this profile, no braking). */
  readonly charge?: { readonly phase: "preparando" | "embistiendo"; readonly aim: Vec3; readonly direction: Vec3; readonly accelMs2: number; readonly topSpeedMs: number };
}

/** A ram for the HUD, the map and the 3D view. */
export interface RamView {
  readonly asteroidId: string;
  readonly asteroidName: string;
  readonly targetId: string;
  readonly phase: "preparando" | "embistiendo";
  /** Wind-up seconds left (0 once it has set off). */
  readonly windupLeftS: number;
  /** Seconds to impact if the craft holds its course. */
  readonly etaS: number;
  readonly from: Vec3;
  readonly aim: Vec3;
  readonly speedMs: number;
  readonly topSpeedMs: number;
  /** Sideways shift that dodges it, m, and the way to go (world unit vector). */
  readonly dodgeM: number;
  readonly dodgeDirection: Vec3;
}

/**
 * Use case: what happens after a failed mind duel. Each asteroid keeps its own anger; while angry it
 * throws at whatever its tier can reach, the projectiles fly real kinematics with limited homing,
 * and every hit goes through the target's real protection. Anger decays with game time; once it is
 * calm the duel can be tried again. See docs/design/poderes-ira.md.
 */
export class AsteroidWrath {
  private readonly moods = new Map<string, Mood>();
  private readonly targets = new Map<string, WrathTarget>();
  private _projectiles: Projectile[] = [];
  private events: WrathEvent[] = [];
  private nextId = 1;
  private rng: () => number;
  private accumulator = 0;

  constructor(bodies: readonly WrathBody[], seed = 7) {
    for (const b of bodies) {
      const power = powerOf(b.data);
      this.moods.set(b.data.id, { body: b, power, anger: new Anger(power.spec.angerHalfLifeS), cooldownS: 0, throws: 0, inReach: new Set(), offenders: new Set(), ramCooldownS: 0 });
    }
    let s = seed >>> 0 || 1;
    this.rng = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  }

  // --- Asteroids ---------------------------------------------------------------

  power(asteroidId: string): AsteroidPower | undefined {
    return this.moods.get(asteroidId)?.power;
  }

  anger(asteroidId: string): number {
    return this.moods.get(asteroidId)?.anger.level ?? 0;
  }

  timeToCalmS(asteroidId: string): number {
    return this.moods.get(asteroidId)?.anger.timeToCalmS ?? 0;
  }

  /**
   * Entry point for the subjugation flow: a duel failed at `phase` on an asteroid. Its anger jumps,
   * and it starts throwing at the next step.
   */
  duelFailed(asteroidId: string, phase: DuelPhase, offenders: readonly string[] = OFFENDERS_BY_PHASE[phase]): void {
    const m = this.mood(asteroidId);
    m.anger.provoke(phase);
    for (const o of offenders) m.offenders.add(o);
    m.cooldownS = Math.min(m.cooldownS, 1);
    this.events.push({ type: "enraged", asteroidId, tier: m.power.tier, level: m.anger.level });
  }

  /**
   * The craft an angry asteroid chases (its gravity drive moves it, game fiction): the nearest active
   * one among those that enraged it. Undefined when it is calm or none of them is out in space.
   */
  pursuit(asteroidId: string): Pursuit | undefined {
    const m = this.moods.get(asteroidId);
    if (!m || m.anger.calm) return undefined;
    const t = this.quarry(m);
    if (!t) return undefined;
    const r = m.ram;
    const standoffM = m.body.meanRadiusM + (this.ramProne(m, t) ? RAM.chargeGapM : CHASE_STANDOFF_OF_REACH * reachOf(m));
    const charge = r ? { phase: r.phase, aim: r.aim, direction: r.direction, accelMs2: r.profile.accelMs2, topSpeedMs: r.profile.topSpeedMs } : undefined;
    return { targetId: t.id, targetName: t.name, position: () => t.position(), velocity: () => t.velocity(), standoffM, charge };
  }

  /** The craft it chases: the one it is ramming, or the nearest active one that enraged it. */
  private quarry(m: Mood): WrathTarget | undefined {
    if (m.ram) return this.targets.get(m.ram.targetId);
    let best: WrathTarget | undefined;
    let bestD = Infinity;
    for (const id of m.offenders) {
      const t = this.targets.get(id);
      if (!t || !t.active()) continue;
      const d = t.position().sub(m.body.position).length();
      if (d < bestD) [best, bestD] = [t, d];
    }
    return best;
  }

  /** Fast enough to ram this craft some time: it then closes to its charge gap instead of holding back to throw. */
  private ramProne(m: Mood, t: WrathTarget): boolean {
    return RAM.targets.includes(t.kind) && !!t.massKg?.() && ramCapable(chargeProfile(m.body.data.massKg.value, m.anger.level).topSpeedMs);
  }

  /** The ram an asteroid is winding up or charging, if any. */
  ram(asteroidId: string): RamView | undefined {
    const m = this.moods.get(asteroidId);
    const r = m?.ram;
    const t = r && this.targets.get(r.targetId);
    if (!m || !r || !t) return undefined;
    const rel = t.position().sub(m.body.position);
    const v = m.body.velocity ?? Vec3.ZERO;
    const closing = v.sub(t.velocity()).dot(r.direction);
    const gap = Math.max(0, rel.length() - m.body.meanRadiusM - t.radiusM);
    const etaS = (r.phase === "preparando" ? r.leftS : 0) + chargeTimeS(gap, r.profile.accelMs2, r.profile.topSpeedMs, r.phase === "preparando" ? 0 : closing);
    return {
      asteroidId,
      asteroidName: m.body.data.name,
      targetId: r.targetId,
      phase: r.phase,
      windupLeftS: r.phase === "preparando" ? r.leftS : 0,
      etaS,
      from: r.phase === "preparando" ? m.body.position : r.from,
      aim: r.aim,
      speedMs: v.length(),
      topSpeedMs: r.profile.topSpeedMs,
      dodgeM: m.body.meanRadiusM + t.radiusM,
      dodgeDirection: dodgeDirection(r.direction, rel),
    };
  }

  /** The ram coming at a craft, if any (the soonest). */
  ramAt(targetId: string): RamView | undefined {
    let best: RamView | undefined;
    for (const id of this.moods.keys()) {
      const r = this.ram(id);
      if (r && r.targetId === targetId && (!best || r.etaS < best.etaS)) best = r;
    }
    return best;
  }

  /** Whether a new duel can be tried: the asteroid is calm again. */
  canRetry(asteroidId: string): boolean {
    return this.anger(asteroidId) === 0;
  }

  /** Asteroids angry now, the most furious first. */
  angry(): { body: WrathBody; power: AsteroidPower; level: number; timeToCalmS: number }[] {
    return [...this.moods.values()]
      .filter((m) => !m.anger.calm)
      .sort((a, b) => b.anger.level - a.anger.level)
      .map((m) => ({ body: m.body, power: m.power, level: m.anger.level, timeToCalmS: m.anger.timeToCalmS }));
  }

  /** Test and demo hook: set an asteroid's anger directly (0..1). */
  setAnger(asteroidId: string, level: number): void {
    this.mood(asteroidId).anger.set(level);
  }

  /**
   * Demo hook (screenshots, manual checks): give an asteroid another tier's powers while keeping its real
   * size and composition. The game never calls it; tiers come from real data.
   */
  demoTier(asteroidId: string, tier: PowerTier): void {
    const m = this.mood(asteroidId);
    const spec = m.power.comet ? { ...TIERS[tier], weapons: [...TIERS[tier].weapons, "chorro" as const] } : TIERS[tier];
    const power: AsteroidPower = { ...m.power, tier, spec, reason: `demostración: poder ${tier}` };
    this.moods.set(asteroidId, { ...m, power, anger: new Anger(TIERS[tier].angerHalfLifeS), ram: undefined });
  }

  // --- Targets -----------------------------------------------------------------

  addTarget(t: WrathTarget): void {
    this.targets.set(t.id, t);
  }

  removeTarget(id: string): void {
    this.targets.delete(id);
  }

  target(id: string): WrathTarget | undefined {
    return this.targets.get(id);
  }

  /** Metres from the target to the asteroid's surface (sphere of the mean radius). */
  private surfaceDistance(m: Mood, p: Vec3): number {
    return p.sub(m.body.position).length() - m.body.meanRadiusM;
  }

  /** Whether an asteroid can attack a target now: right kind for its tier, and inside its reach. */
  inReach(asteroidId: string, targetId: string): boolean {
    const m = this.moods.get(asteroidId);
    const t = this.targets.get(targetId);
    return !!m && !!t && this.canReach(m, t);
  }

  private canReach(m: Mood, t: WrathTarget): boolean {
    return t.active() && reaches(m.power.tier, t.kind) && this.surfaceDistance(m, t.position()) < reachOf(m);
  }

  /** How far from its surface an asteroid can attack, m. */
  reachM(asteroidId: string): number {
    return reachOf(this.mood(asteroidId));
  }

  /** Survival mode: an angry asteroid has the station in reach, so the station must move away. */
  get survival(): boolean {
    return [...this.targets.values()].some((t) => t.kind === "estacion" && [...this.moods.values()].some((m) => !m.anger.calm && this.canReach(m, t)));
  }

  /**
   * Where a target should flee: away from the angry asteroid that keeps it in reach the deepest,
   * and how far. Null when nothing can reach it.
   */
  fleeGuidance(targetId: string): FleeGuidance | null {
    const t = this.targets.get(targetId);
    if (!t) return null;
    let best: FleeGuidance | null = null;
    for (const m of this.moods.values()) {
      if (m.anger.calm || !reaches(m.power.tier, t.kind)) continue;
      const p = t.position();
      const rel = p.sub(m.body.position);
      const d = rel.length();
      const distanceM = Math.max(0, reachOf(m) - (d - m.body.meanRadiusM));
      if (distanceM <= 0) continue;
      const trapped = m.power.spec.weapons.includes("agarre") && !!t.thrustAccelMs2 && escapeImpossible(t.thrustAccelMs2(), m.power.surfaceGravityMs2, m.body.meanRadiusM, d, m.anger.level);
      const g: FleeGuidance = {
        asteroidId: m.body.data.id,
        asteroidName: m.body.data.name,
        direction: d < 1e-9 ? Vec3.Y : rel.scale(1 / d),
        distanceM,
        timeToCalmS: m.anger.timeToCalmS,
        trapped,
      };
      if (!best || g.distanceM > best.distanceM) best = g;
    }
    return best;
  }

  // --- Projectiles -------------------------------------------------------------

  get projectiles(): readonly Projectile[] {
    return this._projectiles;
  }

  /** Projectiles flying at a target, the soonest first. */
  threats(targetId: string): Threat[] {
    const t = this.targets.get(targetId);
    if (!t) return [];
    const tp = t.position();
    const tv = t.velocity();
    return this._projectiles
      .filter((p) => p.targetId === targetId)
      .map((p) => {
        const rel = tp.sub(p.position);
        const d = rel.length();
        const closing = d > 0 ? p.velocity.sub(tv).dot(rel) / d : 0;
        return { projectile: p, distanceM: d, etaS: closing > 1e-3 ? d / closing : Infinity };
      })
      .sort((a, b) => a.etaS - b.etaS);
  }

  drainEvents(): WrathEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** Let `dtS` seconds of game time pass. */
  update(dtS: number): void {
    this.accumulator += Math.min(dtS, 60);
    while (this.accumulator >= STEP_S - 1e-9) {
      this.step(STEP_S);
      this.accumulator -= STEP_S;
    }
  }

  private step(dt: number): void {
    for (const m of this.moods.values()) {
      if (m.anger.calm) continue;
      if (m.anger.tick(dt)) {
        m.inReach.clear();
        m.offenders.clear();
        m.ram = undefined;
        this.events.push({ type: "calmed", asteroidId: m.body.data.id });
        continue;
      }
      this.trackEscapes(m);
      this.grip(m, dt);
      this.rams(m, dt);
      m.cooldownS -= dt;
      // Committed to a ram: nothing is thrown until it is over.
      if (m.ram) m.cooldownS = Math.max(m.cooldownS, 0.5);
      else if (m.cooldownS <= 0) {
        m.cooldownS = m.power.spec.fireIntervalS / Math.max(m.anger.level, MIN_RATE_ANGER);
        this.fire(m);
      }
    }
    this.fly(dt);
  }

  private trackEscapes(m: Mood): void {
    for (const t of this.targets.values()) {
      const inside = this.canReach(m, t);
      if (inside) m.inReach.add(t.id);
      else if (m.inReach.delete(t.id) && t.active()) this.events.push({ type: "escaped", asteroidId: m.body.data.id, targetId: t.id });
    }
  }

  private grip(m: Mood, dt: number): void {
    if (!m.power.spec.weapons.includes("agarre")) return;
    for (const t of this.targets.values()) {
      if (!t.pull || !t.active() || !reaches(m.power.tier, t.kind)) continue;
      const p = t.position();
      if (p.sub(m.body.position).length() >= gripRadiusM(m.body.meanRadiusM)) continue;
      t.pull(gripAt(m.body.position, p, m.power.surfaceGravityMs2, m.body.meanRadiusM, m.anger.level).scale(dt));
    }
  }

  // --- Ram (docs/design/poderes-ira.md, «Embestida») -----------------------------

  private rams(m: Mood, dt: number): void {
    m.ramCooldownS -= dt;
    if (!m.ram) return this.considerRam(m);
    const r = m.ram;
    const t = this.targets.get(r.targetId);
    if (!t || !t.active()) {
      m.ram = undefined;
      m.ramCooldownS = RAM.cooldownS;
      return;
    }
    if (r.phase === "preparando") {
      r.leftS -= dt;
      r.aim = this.predictAim(m, t, r.profile);
      if (r.leftS > 0) return;
      r.phase = "embistiendo";
      r.from = m.body.position;
      r.direction = r.aim.sub(m.body.position).normalize();
      r.prevRel = t.position().sub(m.body.position);
      this.events.push({ type: "ram-charge", asteroidId: m.body.data.id, targetId: t.id, from: r.from, aim: r.aim });
      return;
    }
    r.ageS += dt;
    const rel = t.position().sub(m.body.position);
    const prev = r.prevRel ?? rel;
    r.prevRel = rel;
    // Swept test: the closest the craft came to its centre between the two steps.
    const seg = rel.sub(prev);
    const k = seg.dot(seg) > 1e-12 ? Math.min(1, Math.max(0, -prev.dot(seg) / seg.dot(seg))) : 1;
    const closest = prev.add(seg.scale(k));
    const hitR = m.body.meanRadiusM + t.radiusM;
    if (closest.length() <= hitR) return this.ramHit(m, t, closest.length() > 1e-9 ? closest.normalize() : r.direction);
    const vRel = (m.body.velocity ?? Vec3.ZERO).sub(t.velocity()).dot(r.direction);
    if (rel.dot(r.direction) < 0 || r.ageS > RAM.maxChargeS) {
      const o = overshoot(Math.max(0, vRel), chaseProfile(m.body.data.massKg.value, m.anger.level).accelMs2);
      this.events.push({ type: "ram-miss", asteroidId: m.body.data.id, targetId: t.id, speedMs: Math.max(0, vRel), stopM: o.stopM, turnaroundS: o.turnaroundS });
      m.ram = undefined;
      m.ramCooldownS = RAM.cooldownS + o.turnaroundS;
    }
  }

  /** Not ramming: should it start (or shake off a craft sitting on it)? */
  private considerRam(m: Mood): void {
    if (m.ramCooldownS > 0) return;
    const t = this.quarry(m);
    if (!t) return;
    const c = m.body.position;
    const rel = t.position().sub(c);
    const d = rel.length();
    const n = d > 1e-9 ? rel.scale(1 / d) : Vec3.Y;
    const gapM = d - m.body.meanRadiusM;
    const profile = chargeProfile(m.body.data.massKg.value, m.anger.level);
    const { attack } = chooseAttack({
      kind: t.kind,
      landed: t.landed?.() ?? false,
      onThisBody: gapM < RAM.onSurfaceM,
      chargeTopSpeedMs: profile.topSpeedMs,
      recedeMs: t.velocity().sub(m.body.velocity ?? Vec3.ZERO).dot(n),
      gapM,
      craftMassKg: t.massKg?.(),
    });
    if (attack === "sacudir") {
      t.pull?.(n.scale(RAM.shakeOffMs));
      this.events.push({ type: "shaken", asteroidId: m.body.data.id, targetId: t.id, deltaVMs: RAM.shakeOffMs });
      m.ramCooldownS = RAM.cooldownS;
      return;
    }
    if (attack !== "embestir") return;
    const aim = this.predictAim(m, t, profile);
    m.ram = { phase: "preparando", targetId: t.id, leftS: RAM.windupS, ageS: 0, from: c, aim, direction: aim.sub(c).normalize(), profile };
    const etaS = RAM.windupS + chargeTimeS(Math.max(0, gapM - t.radiusM), profile.accelMs2, profile.topSpeedMs);
    const dodge = dodgeNeeded(m.body.meanRadiusM, t.radiusM, etaS);
    this.events.push({ type: "ram-windup", asteroidId: m.body.data.id, targetId: t.id, windupS: RAM.windupS, etaS, topSpeedMs: profile.topSpeedMs, dodgeM: dodge.lateralM, dodgeAccelMs2: dodge.accelMs2 });
  }

  /** Where the craft will be when it gets there if it holds its velocity (two passes of the charge time). */
  private predictAim(m: Mood, t: WrathTarget, p: DriveProfile): Vec3 {
    const c = m.body.position;
    let aim = t.position();
    for (let i = 0; i < 2; i++) {
      const gap = Math.max(0, aim.sub(c).length() - m.body.meanRadiusM - t.radiusM);
      aim = t.position().add(t.velocity().scale(chargeTimeS(gap, p.accelMs2, p.topSpeedMs)));
    }
    return aim;
  }

  private ramHit(m: Mood, t: WrathTarget, normal: Vec3): void {
    const craftKg = t.massKg?.() ?? 1;
    const relV = (m.body.velocity ?? Vec3.ZERO).sub(t.velocity());
    const h = ramImpact(m.body.data.massKg.value, craftKg, relV, normal);
    // A whole asteroid is the bluntest impact there is: the micrometeoroid shield does not help.
    const fraction = impactFraction(h.absorbedJ, t.protection(), true);
    if (fraction > 0) t.damage(fraction, "embestida");
    t.pull?.(h.craftDeltaV);
    this.events.push({ type: "ram-hit", asteroidId: m.body.data.id, targetId: t.id, position: t.position(), closingMs: h.closingMs, energyJ: h.energyJ, absorbedJ: h.absorbedJ, deltaVMs: h.craftDeltaV.length(), fraction });
    const o = overshoot(h.closingMs, chaseProfile(m.body.data.massKg.value, m.anger.level).accelMs2);
    m.ram = undefined;
    m.ramCooldownS = RAM.cooldownS + o.turnaroundS;
  }

  /** Pick the next target in reach (round robin) and throw what the tier allows. */
  private fire(m: Mood): void {
    const inReach = [...this.targets.values()].filter((t) => this.canReach(m, t));
    if (inReach.length === 0) return;
    const t = inReach[m.throws % inReach.length]!;
    m.throws++;
    const w = m.power.spec.weapons;
    if (w.includes("chorro") && m.throws % JET.everyThrows === 0) return this.jet(m, t);
    if (w.includes("pulso") && m.throws % PULSE.everyThrows === 0) return this.pulse(m, t);
    if (this._projectiles.length >= MAX_PROJECTILES) return;
    const kind: ProjectileKind = w.includes("nuclear") && m.anger.level > 0.8 && m.throws % 5 === 0 ? "nuclear" : w.includes("carga") && m.throws % 2 === 0 ? "carga" : "roca";
    this.launch(m, t, kind);
  }

  private launch(m: Mood, t: WrathTarget, kind: ProjectileKind): void {
    const spec = m.power.spec;
    const c = m.body.position;
    const R = m.body.meanRadiusM;
    // From the surface on the side facing the target, a little off the line (seeded).
    const toT = t.position().sub(c).normalize();
    const jitter = new Vec3(this.rng() - 0.5, this.rng() - 0.5, this.rng() - 0.5).scale(0.3);
    const from = c.add(toT.add(jitter).normalize().scale(R * 1.02));
    const speed = kind === "roca" ? spec.rockSpeedMs : kind === "carga" ? spec.rockSpeedMs * 1.5 : spec.rockSpeedMs * 2;
    const d = rockDiameterM(m.power.diameterM);
    const massKg = kind === "roca" ? sphereMassKg(d, m.body.data.densityKgM3.value) : kind === "carga" ? BLAST.chargeMassKg : 100;
    const radiusM = kind === "roca" ? d / 2 : 0.3;
    // Aimed at the intercept point; the homing then follows the target's manoeuvres.
    const velocity = interceptVelocity(from, t.position(), t.velocity(), speed);
    const p: Projectile = { id: this.nextId++, kind, sourceId: m.body.data.id, targetId: t.id, position: from, velocity, massKg, radiusM, ageS: 0 };
    this._projectiles.push(p);
    this.events.push({ type: "launched", projectile: p, asteroidId: m.body.data.id });
  }

  private pulse(m: Mood, t: WrathTarget): void {
    const to = t.position();
    const raw = pulseDoseMSv(m.body.meanRadiusM, to.sub(m.body.position).length(), m.anger.level);
    const dose = this.irradiate(t, raw);
    this.events.push({ type: "pulse", asteroidId: m.body.data.id, targetId: t.id, from: m.body.position, to, doseMSv: dose });
  }

  /** A comet's jet: dust from the vent facing the target, a push of momentum / mass and a sandblast through its protection. */
  private jet(m: Mood, t: WrathTarget): void {
    const c = m.body.position;
    const to = t.position();
    const rel = to.sub(c);
    const dir = rel.length() > 1e-9 ? rel.normalize() : Vec3.Y;
    const from = c.add(dir.scale(m.body.meanRadiusM));
    const hit = jetOnTarget(this.surfaceDistance(m, to), t.radiusM, m.anger.level, m.power.spec.rockSpeedMs);
    const mass = t.massKg?.();
    const deltaVMs = mass && mass > 0 ? hit.momentumKgMs / mass : 0;
    if (deltaVMs > 0) t.pull?.(dir.scale(deltaVMs));
    const fraction = impactFraction(hit.energyJ, t.protection(), false);
    if (fraction > 0) t.damage(fraction, "chorro");
    this.events.push({ type: "jet", asteroidId: m.body.data.id, targetId: t.id, from, to, interceptedKg: hit.interceptedKg, deltaVMs, fraction });
  }

  /** Apply an unshielded dose to a target: crew dose behind its shield, or electronics damage. Returns the dose that got in. */
  private irradiate(t: WrathTarget, rawMSv: number): number {
    const prot = t.protection();
    if (prot.radiation) {
      const dose = shieldedDoseMSv(rawMSv, prot.radiation);
      t.dose?.(dose);
      return dose;
    }
    if (prot.electronicsToleranceMSv) t.damage(rawMSv / prot.electronicsToleranceMSv, "pulso");
    return rawMSv;
  }

  private fly(dt: number): void {
    const keep: Projectile[] = [];
    for (const p0 of this._projectiles) {
      const m = this.moodOfProjectile(p0);
      const t = this.targets.get(p0.targetId);
      const homing = !!m && !!t && !m.anger.calm && this.canReach(m, t);
      const ctx = {
        asteroidPosition: m?.body.position ?? Vec3.ZERO,
        asteroidRadiusM: m?.body.meanRadiusM ?? 1,
        gravityAt: (q: Vec3) => m?.body.gravityAt(q) ?? Vec3.ZERO,
        guidanceMs2: m?.power.spec.guidanceMs2 ?? 0,
        anger: m?.anger.level ?? 0,
        maxSpeedMs: (m?.power.spec.rockSpeedMs ?? 10) * (p0.kind === "roca" ? 1 : p0.kind === "carga" ? 1.5 : 2),
        target: homing ? { position: t!.position(), velocity: t!.velocity() } : undefined,
      };
      const p = stepProjectile(p0, ctx, dt);
      if (t && t.active() && this.resolve(p0, p, t, dt)) continue;
      const far = m ? this.surfaceDistance(m, p.position) > reachOf(m) * 1.5 : true;
      const buried = m ? p.ageS > 2 && this.surfaceDistance(m, p.position) < 0 : false;
      if (p.ageS > MAX_AGE_S || far || buried) continue;
      keep.push(p);
    }
    this._projectiles = keep;
  }

  /** Hit or burst during this step? Returns true when the projectile is spent. */
  private resolve(before: Projectile, after: Projectile, t: WrathTarget, dt: number): boolean {
    const miss = closestApproachM(before.position, after.velocity, t.position(), t.velocity(), dt);
    if (before.kind === "roca") {
      if (miss > t.radiusM + before.radiusM) return false;
      const energyJ = kineticEnergyJ(before.massKg, after.velocity.sub(t.velocity()).length());
      const fraction = impactFraction(energyJ, t.protection(), before.massKg > BLUNT_ROCK_KG);
      t.damage(fraction, "roca");
      this.events.push({ type: "hit", targetId: t.id, kind: "roca", energyJ, fraction });
      return true;
    }
    const fuse = before.kind === "carga" ? BLAST.fuseM : BLAST.nuclearFuseM;
    if (miss > fuse) return false;
    this.burst(before.kind, after.position, before);
    return true;
  }

  /** A charge bursts: every active target nearby takes its share of fragments (and, if nuclear, X-rays and dose). */
  private burst(kind: "carga" | "nuclear", at: Vec3, p: Projectile): void {
    const m = this.moodOfProjectile(p);
    const cloud = volatileCharge(p.massKg, m?.power.volatileFraction ?? 0.05);
    this.events.push({ type: "burst", kind, position: at, radiusM: kind === "carga" ? 40 : 150 });
    for (const t of this.targets.values()) {
      if (!t.active()) continue;
      const d = Math.max(t.position().sub(at).length() - t.radiusM, 0.5);
      if (d > BURST_RANGE_M) continue;
      const energyJ = kind === "carga" ? fragmentEnergyOnTargetJ(cloud, d, t.radiusM) : nuclearEnergyOnTargetJ(d, t.radiusM);
      const fraction = impactFraction(energyJ, t.protection(), kind === "nuclear");
      if (fraction > 0) {
        t.damage(fraction, kind);
        this.events.push({ type: "hit", targetId: t.id, kind, energyJ, fraction });
      }
      if (kind === "nuclear") this.irradiate(t, nuclearDoseMSv(d));
    }
  }

  private moodOfProjectile(p: Projectile): Mood | undefined {
    return this.moods.get(p.sourceId);
  }

  private mood(asteroidId: string): Mood {
    const m = this.moods.get(asteroidId);
    if (!m) throw new Error(`Unknown asteroid ${asteroidId}`);
    return m;
  }
}
