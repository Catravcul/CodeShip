import { EAT_PER_DAY, choose, tickNeeds, type Desire, type Needs } from "../domain/desires";
import { canHunt, effectivePower, fears, predatorPower, type Medium, type Traits } from "../domain/predation";
import { COURT_S, type Sex } from "../domain/mating";
import { hash01 } from "../domain/roam";

/**
 * A LIVING FOOD CHAIN, shared by the sanctuaries (sanctuary 1's wild families, sanctuary 3's biome): each animal feels
 * hunger and fatigue (domain/desires.ts, Cold Sanctuary's DesireCatalog), fears what can overpower it and flees it
 * (its ThreatResponder), and a hungry meat eater looks for prey it can take by its stats, its pack's included
 * (domain/predation.ts, Cold Sanctuary's Predation), chases it at its top speed until it catches it or tires, and its
 * attack succeeds as often as the species' real hunts do. A kill is handed to the caller, who takes the prey out (in
 * sanctuary 1 its place waits for the next birth season). It decides; the caller moves the bodies and draws them.
 * No engine, no scene data: any sanctuary passes its species' traits and its animals.
 */
export interface Agent {
  readonly id: number;
  readonly species: string;
  readonly x: number;
  readonly z: number;
  readonly home: { readonly x: number; readonly z: number; readonly r: number };
  /** Size over the adult's; 0: not there (not born yet, or eaten). */
  readonly scale: number;
  readonly young: boolean;
  readonly mother?: number;
  /** Where it is now (an orca never takes a hare on the ice). */
  readonly inWater: boolean;
  /** Someone the animals see but who takes no part (the player): feared by the timid, never hunted. */
  readonly observer?: boolean;
  readonly sex?: Sex;
  /** In its mating season and adult (domain/mating.ts inEstrus). */
  readonly estrus?: boolean;
}

export type Doing = Desire | "devorar" | "buscar" | "cortejar" | "rivalizar";

export interface Intent {
  readonly doing: Doing;
  /** Where it goes (none: it stays, or the caller's own habits move it). */
  readonly to?: { readonly x: number; readonly z: number };
  /** m/s */
  readonly speed: number;
  /** What it does, in words: «huye de un lobo ártico». */
  readonly verb: string;
  /** Its prey or the one it flees. */
  readonly other?: number;
}

/**
 * Countable food for the grazers (fauna/domain/forage.ts): asked for `meals` (in days of its ration) by an animal that
 * is eating, it takes what it finds from the sanctuary's plants or banks and says the share found (0–1). Without it,
 * eating always fills (sanctuary 1).
 */
export type Forage = (a: Agent, meals: number) => number;

/** A pair that mated: the female is pregnant. */
export interface Mating {
  readonly female: number;
  readonly male: number;
}

export interface Kill {
  readonly hunter: number;
  readonly prey: number;
}

/** How a species is named in the verbs: «un lobo ártico», «una foca». */
export type Names = Readonly<Record<string, string>>;
/** Each species' courtship, in words (its real display): «el macho canta bajo el agua». */
export type Courtships = Readonly<Record<string, string>>;
/** Each species' contest between males in the rut, in words: «los machos chocan las cabezas». */
export type Rivalries = Readonly<Record<string, string>>;

/** A chase is given up after this long (a sprint spends it: domain/desires.ts SPRINT_S). */
export const CHASE_S = 45;
/** After a kill it eats there this long, s. */
export const DEVOUR_S = 120;
/** After a failed attack it does not try again for this long, s. */
export const MISS_COOLDOWN_S = 90;
/** Allies of its kind within this distance hunt with it (Cold Sanctuary's EffectivePower radius, 8 m; ours wider for families spread on the plan). */
export const PACK_M = 15;
/** Males closer than this to the same female contest her, m. */
export const RIVAL_M = 10;
/** How long a contest lasts before one gives in, s. */
export const RIVAL_S = 15;
/** A beaten male stays out of the season's mating this long, s (in the game, a good while). */
export const BEATEN_S = 1800;
/** A young one keeps within this many metres of its mother before it feels lost. */
const MOTHER_KEEP_M = 6;

interface State {
  needs: Needs;
  doing: Doing;
  chase?: { prey: number; since: number };
  devourUntil?: number;
  devouring?: string;
  calmUntil?: number;
  attempts: number;
  /** Seconds courting its partner now. */
  court?: { partner: number; s: number };
  /** Mated this season (it stops looking until its estrus is over). */
  mated?: boolean;
  /** A contest with another male over a female: its rival and the seconds so far. */
  duel?: { rival: number; s: number };
  /** Lost a contest: out of the season's mating until then (it leaves the winner the female). */
  beatenUntil?: number;
  beaten?: { by: number; at: number };
}

export class Ecosystem {
  private readonly state = new Map<number, State>();

  constructor(
    private readonly traits: Readonly<Record<string, Traits>>,
    private readonly names: Names,
    private readonly courtships: Courtships = {},
    private readonly rivalries: Rivalries = {},
  ) {}

  needsOf(id: number): Needs | undefined {
    return this.state.get(id)?.needs;
  }

  /** Sets an animal's needs (a sanctuary starting its animals part-way through the day; tests). */
  setNeeds(id: number, n: Needs): void {
    this.st(id).needs = n;
  }

  private st(id: number): State {
    let s = this.state.get(id);
    if (!s) this.state.set(id, (s = { needs: { hunger: hash01(id, 7) * 0.4, fatigue: 0 }, doing: "habito", attempts: 0 }));
    return s;
  }

  /** One decision round: `dtS` seconds since the last (`dtDays` of game time) at clock `t` (s). */
  step(dtS: number, dtDays: number, t: number, agents: readonly Agent[], forage?: Forage): { intents: Map<number, Intent>; kills: Kill[]; matings: Mating[] } {
    const intents = new Map<number, Intent>();
    const kills: Kill[] = [];
    const matings: Mating[] = [];
    const here = agents.filter((a) => a.scale > 0);
    const byId = new Map(here.map((a) => [a.id, a]));
    const eaten = new Set<number>();
    for (const a of here) {
      if (a.observer || eaten.has(a.id)) continue;
      const tr = this.traits[a.species];
      if (!tr) continue;
      const s = this.st(a.id);
      const fed = forage && s.doing === "comer" ? forage(a, ((EAT_PER_DAY + tr.hungerPerDay) * dtDays) / Math.max(1e-9, tr.hungerPerDay)) : 1;
      s.needs = tickNeeds(s.needs, dtS, dtDays, s.doing, tr, fed);
      const name = (sp: string) => this.names[sp] ?? sp;
      const say = (doing: Doing, verb: string, speed = 0, to?: { x: number; z: number }, other?: number) => {
        s.doing = doing;
        intents.set(a.id, { doing, verb, speed, ...(to ? { to } : {}), ...(other !== undefined ? { other } : {}) });
      };
      if (s.devourUntil !== undefined && t < s.devourUntil) {
        say("devorar", `devora ${s.devouring}`);
        continue;
      }
      s.devourUntil = undefined;
      // Its top speed, by its size (a young one is slower) and what is left of its strength.
      const run = tr.runMs * Math.sqrt(Math.max(0.2, a.scale)) * (1 - 0.5 * s.needs.fatigue);
      // The threat: the nearest it fears that could take it (or the player, for the timid), within its senses.
      let threat: Agent | undefined;
      let threatD = Infinity;
      for (const o of here) {
        if (o.id === a.id || o.species === a.species) continue;
        const d = Math.hypot(o.x - a.x, o.z - a.z);
        if (d > tr.senseM * (o.observer ? 0.4 : 1) || d >= threatD) continue;
        const ot = this.traits[o.species];
        if (!ot) continue;
        const power = predatorPower(ot, o.scale);
        const dangerous = o.observer ? fears(tr, a.scale, power) : ot.diet !== "herbivoro" && fears(tr, a.scale, power) && canHunt(ot, power, a.species, tr, a.scale, mediumOf(a), o.species);
        if (dangerous) {
          threat = o;
          threatD = d;
        }
      }
      const mother = a.mother !== undefined ? byId.get(a.mother) : undefined;
      const motherFar = mother ? Math.hypot(mother.x - a.x, mother.z - a.z) / MOTHER_KEEP_M : 0;
      // Mid-chase (or mid-flight) home does not call it back; after, the farther it went the stronger the pull.
      const committed = s.doing === "cazar" || s.doing === "buscar" || s.doing === "huir";
      const homeFar = committed ? 0 : Math.hypot(a.home.x - a.x, a.home.z - a.z) / Math.max(1, a.home.r);
      const calm = s.calmUntil !== undefined && t < s.calmUntil;
      if (!a.estrus) s.mated = false;
      const beaten = s.beatenUntil !== undefined && t < s.beatenUntil;
      // Just beaten: it walks away from the winner.
      const winner = s.beaten && t - s.beaten.at < 10 ? byId.get(s.beaten.by) : undefined;
      if (winner && !threat) {
        const dx = a.x - winner.x;
        const dz = a.z - winner.z;
        const d = Math.hypot(dx, dz) || 1;
        say("huir", "pierde ante otro macho y se aleja", run * 0.5, { x: a.x + (dx / d) * 20, z: a.z + (dz / d) * 20 }, winner.id);
        continue;
      }
      const { desire } = choose({ needs: s.needs, traits: tr, threatened: !!threat, young: a.young && !!mother, motherFar, homeFar, estrus: !!a.estrus && !s.mated && !beaten && !!a.sex });
      if (desire !== "aparearse") {
        s.court = undefined;
        s.duel = undefined;
      }
      switch (calm && desire === "cazar" ? "descansar" : desire) {
        case "huir": {
          const dx = a.x - threat!.x;
          const dz = a.z - threat!.z;
          const d = Math.hypot(dx, dz) || 1;
          say("huir", `huye de ${name(threat!.species)}`, run, { x: a.x + (dx / d) * 20, z: a.z + (dz / d) * 20 }, threat!.id);
          break;
        }
        case "cazar": {
          const power = effectivePower(tr, a.scale, here.filter((o) => o.id !== a.id && o.species === a.species && Math.hypot(o.x - a.x, o.z - a.z) < PACK_M).map((o) => ({ traits: tr, scale: o.scale })));
          const prey = this.preyFor(a, tr, power, s, here, eaten, t);
          if (!prey) {
            // Nothing in sight: it goes looking where prey it can take lives, within its range.
            const far = this.searchFor(a, tr, power, here);
            if (far) say("buscar", "busca presas", tr.runMs * 0.25, { x: far.x, z: far.z });
            else say("habito", "");
            break;
          }
          const d = Math.hypot(prey.x - a.x, prey.z - a.z);
          if (d <= 1.2 + 1.2 * a.scale) {
            // The attack: it succeeds as often as the species' real hunts do.
            s.attempts++;
            s.chase = undefined;
            if (hash01(a.id * 977 + s.attempts, Math.floor(t)) < tr.huntSuccess) {
              kills.push({ hunter: a.id, prey: prey.id });
              eaten.add(prey.id);
              s.needs = { hunger: 0, fatigue: s.needs.fatigue };
              s.devourUntil = t + DEVOUR_S;
              s.devouring = name(prey.species);
              say("devorar", `devora ${name(prey.species)}`, 0, undefined, prey.id);
            } else {
              s.calmUntil = t + MISS_COOLDOWN_S;
              say("descansar", `falla el ataque a ${name(prey.species)}`, 0, undefined, prey.id);
            }
            break;
          }
          say("cazar", `caza ${name(prey.species)}`, run, { x: prey.x, z: prey.z }, prey.id);
          break;
        }
        case "comer":
          say("comer", "", 0);
          break;
        case "aparearse": {
          // The nearest of the other sex of its kind, also in estrus and free, within its senses or its family's reach.
          let mate: Agent | undefined;
          let mateD = Math.max(tr.senseM * 3, a.home.r * 4);
          for (const o of here) {
            const os = this.state.get(o.id);
            if (o.id === a.id || o.species !== a.species || !o.estrus || !o.sex || o.sex === a.sex || os?.mated || (os?.beatenUntil !== undefined && t < os.beatenUntil)) continue;
            // One already courting it counts as right beside it (so two never wait for different partners).
            const d = this.state.get(o.id)?.court?.partner === a.id ? 0 : Math.hypot(o.x - a.x, o.z - a.z);
            if (d < mateD) {
              mate = o;
              mateD = d;
            }
          }
          if (!mate) {
            say("habito", "");
            break;
          }
          mateD = Math.hypot(mate.x - a.x, mate.z - a.z);
          // RIVALRY: another free male in estrus by the same female: they contest her (each species' real contest);
          // the stronger by its stats wins (with a share of luck), the other leaves and is out of the season's mating.
          if (a.sex === "macho") {
            const rival = here.find((o) => {
              const os = this.state.get(o.id);
              return o.id !== a.id && o.species === a.species && o.sex === "macho" && o.estrus && !os?.mated && !(os?.beatenUntil !== undefined && t < os.beatenUntil) && Math.hypot(o.x - mate!.x, o.z - mate!.z) < RIVAL_M && Math.hypot(o.x - a.x, o.z - a.z) < RIVAL_M * 2;
            });
            if (rival && mateD < RIVAL_M * 1.5) {
              const duel = s.duel?.rival === rival.id ? s.duel : (s.duel = { rival: rival.id, s: 0 });
              duel.s += dtS;
              s.court = undefined;
              if (duel.s >= RIVAL_S) {
                const score = (x: Agent) => predatorPower(tr, x.scale) * (0.8 + 0.4 * hash01(x.id * 31 + Math.floor(t), 5));
                const loser = score(a) >= score(rival) ? rival : a;
                const winner = loser === a ? rival : a;
                const ls = this.st(loser.id);
                ls.beatenUntil = t + BEATEN_S;
                ls.beaten = { by: winner.id, at: t };
                ls.duel = undefined;
                ls.court = undefined;
                const ws = this.st(winner.id);
                ws.duel = undefined;
                if (loser === a) say("rivalizar", "pierde ante otro macho", 0, undefined, rival.id);
                else say("rivalizar", "gana a otro macho", 0, undefined, rival.id);
                break;
              }
              const dx = rival.x - a.x;
              const dz = rival.z - a.z;
              const d = Math.hypot(dx, dz) || 1;
              // They face each other, a body's length apart.
              const to = d > 2 + 2 * a.scale ? { x: a.x + (dx / d) * (d - 2), z: a.z + (dz / d) * (d - 2) } : undefined;
              say("rivalizar", this.rivalries[a.species] ?? "se enfrenta a otro macho", to ? tr.runMs * 0.3 : 0, to, rival.id);
              break;
            }
            s.duel = undefined;
          }
          if (mateD <= 1.5 + 2 * a.scale) {
            const court = s.court?.partner === mate.id ? s.court : (s.court = { partner: mate.id, s: 0 });
            court.s += dtS;
            say("cortejar", this.courtships[a.species] ?? `corteja a ${name(a.species)}`, 0, undefined, mate.id);
            const other = this.state.get(mate.id);
            // Both courted long enough: they mate (counted once, by the female).
            if (court.s >= COURT_S && other?.court?.partner === a.id && other.court.s >= COURT_S - 2 * dtS) {
              s.mated = true;
              s.court = undefined;
              if (other) {
                other.mated = true;
                other.court = undefined;
              }
              matings.push(a.sex === "hembra" ? { female: a.id, male: mate.id } : { female: mate.id, male: a.id });
            }
            break;
          }
          say("aparearse", "busca pareja", tr.runMs * 0.5, { x: mate.x, z: mate.z }, mate.id);
          break;
        }
        case "descansar":
          say("descansar", calm ? "recupera el aliento tras el ataque" : "descansa", 0);
          break;
        case "seguir":
          say("seguir", "", Math.min(run, Math.max(0.5, tr.runMs * 0.35)), mother ? { x: mother.x, z: mother.z } : undefined, mother?.id);
          break;
        case "volver":
          say("volver", "vuelve a su territorio", tr.runMs * 0.25, a.home);
          break;
        default:
          say("habito", "");
      }
    }
    for (const k of kills) this.state.delete(k.prey);
    return { intents, kills, matings };
  }

  /** The prey it chases: the one it is after, while it lasts, or the nearest it can take within its senses. */
  private preyFor(a: Agent, tr: Traits, power: number, s: State, here: readonly Agent[], eaten: ReadonlySet<number>, t: number): Agent | undefined {
    if (s.chase) {
      const p = here.find((o) => o.id === s.chase!.prey);
      if (p && !eaten.has(p.id) && t - s.chase.since < CHASE_S && Math.hypot(p.x - a.x, p.z - a.z) < tr.senseM * 1.5) return p;
      if (p && t - s.chase.since >= CHASE_S) s.calmUntil = t + MISS_COOLDOWN_S;
      s.chase = undefined;
      if (s.calmUntil !== undefined && t < s.calmUntil) return undefined;
    }
    let best: Agent | undefined;
    let bestD = tr.senseM;
    for (const o of here) {
      if (o.observer || eaten.has(o.id)) continue;
      const ot = this.traits[o.species];
      const d = Math.hypot(o.x - a.x, o.z - a.z);
      if (!ot || d >= bestD || !canHunt(tr, power, o.species, ot, o.scale, mediumOf(o), a.species)) continue;
      best = o;
      bestD = d;
    }
    if (best) s.chase = { prey: best.id, since: t };
    return best;
  }

  /** Where it goes to look for prey: the nearest animal it could take (with the pack it has now), within its range from home. */
  private searchFor(a: Agent, tr: Traits, power: number, here: readonly Agent[]): Agent | undefined {
    let best: Agent | undefined;
    let bestD = Infinity;
    for (const o of here) {
      if (o.observer) continue;
      const ot = this.traits[o.species];
      if (!ot || Math.hypot(o.x - a.home.x, o.z - a.home.z) > tr.rangeM || !canHunt(tr, power, o.species, ot, o.scale, mediumOf(o), a.species)) continue;
      const d = Math.hypot(o.x - a.x, o.z - a.z);
      if (d < bestD) {
        best = o;
        bestD = d;
      }
    }
    return best;
  }
}

const mediumOf = (a: Agent): Medium => (a.inWater ? "agua" : "tierra");
