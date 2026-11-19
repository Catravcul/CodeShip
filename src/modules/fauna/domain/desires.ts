import { W_MATE } from "./mating";
import type { Traits } from "./predation";

/**
 * DESIRES (Cold Sanctuary's DesireCatalog, Assets/Animals/DesireCatalog.cs: «cuánto lo quiere el ser AHORA y qué acción
 * despacha»): each desire has a need now; the strongest wins, and a threat is a reflex that beats them all (its
 * ThreatResponder). The weights are Cold Sanctuary's: following the family 0.35, the natural habits 0.2, going home
 * 0.12; eating is the hunger itself and resting the fatigue itself, so a hungry or tired animal leaves its habits.
 */
export type Desire = "huir" | "cazar" | "comer" | "descansar" | "seguir" | "volver" | "habito" | "aparearse";

export interface Needs {
  /** 0 full – 1 starving. */
  readonly hunger: number;
  /** 0 fresh – 1 spent. */
  readonly fatigue: number;
}

export const W_FOLLOW = 0.35;
export const W_HOME = 0.12;
export const W_HABIT = 0.2;
/** A young one keeps to its mother above everything but fear (Cold Sanctuary's «nurse» 1.0 seen from the young). */
export const W_YOUNG = 1;

/** Seconds of sprinting that spend an animal (a chase or a flight), and of rest that restore it. */
export const SPRINT_S = 60;
export const REST_S = 120;
/** How fast grazing (or eating its kill) fills it, per day: a third of a day eating fills it from empty. */
const EAT_PER_DAY = 3;

/** Its needs `dtS` seconds later (`dtDays` of game time) doing `doing`. */
export function tickNeeds(n: Needs, dtS: number, dtDays: number, doing: Desire | "devorar" | "buscar" | "cortejar" | "rivalizar", t: Traits): Needs {
  let hunger = n.hunger + t.hungerPerDay * dtDays;
  if (doing === "comer" || doing === "devorar") hunger -= (EAT_PER_DAY + t.hungerPerDay) * dtDays;
  let fatigue = n.fatigue;
  if (doing === "cazar" || doing === "huir") fatigue += dtS / SPRINT_S;
  else if (doing === "rivalizar") fatigue += dtS / (SPRINT_S * 2);
  else fatigue -= dtS / (doing === "descansar" ? REST_S : REST_S * 5);
  const c = (v: number) => Math.max(0, Math.min(1, v));
  return { hunger: c(hunger), fatigue: c(fatigue) };
}

export interface DesireContext {
  readonly needs: Needs;
  readonly traits: Traits;
  /** Something it fears is near. */
  readonly threatened: boolean;
  readonly young: boolean;
  /** How far from its mother, over the distance it keeps (0 by her – 1 lost); 0 if it has none. */
  readonly motherFar: number;
  /** How far from home, over its territory's radius. */
  readonly homeFar: number;
  /** In estrus and not yet mated this season (domain/mating.ts). */
  readonly estrus?: boolean;
}

/** What it wants most now, and how much. */
export function choose(c: DesireContext): { desire: Desire; need: number } {
  if (c.threatened && c.needs.fatigue < 1) return { desire: "huir", need: 1 };
  // Its food among the animals, or (a grazer, a fish or krill eater) out of the scene.
  const eat: Desire = c.traits.diet === "herbivoro" || c.traits.eats?.length === 0 || c.young ? "comer" : "cazar";
  const options: [Desire, number][] = [
    // A carnivore only sets out to hunt with real hunger (Cold Sanctuary's eat need is the hunger; under the habits it waits).
    [eat, c.young ? 0 : c.needs.hunger],
    ["descansar", c.needs.fatigue],
    ["seguir", c.young ? W_YOUNG * (0.5 + c.motherFar) : 0],
    // Past its territory the pull home grows with the distance (after a long chase it heads back).
    ["volver", W_HOME * c.homeFar],
    ["habito", W_HABIT],
    ["aparearse", c.estrus && !c.young ? W_MATE : 0],
  ];
  let best = options[0]!;
  for (const o of options) if (o[1] > best[1]) best = o;
  return { desire: best[0], need: best[1] };
}
