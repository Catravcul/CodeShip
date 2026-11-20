/**
 * WHO HUNTS WHOM, by stats (Cold Sanctuary's Predation, Assets/Scripts/Transformation/Predation.cs: «quién es presa /
 * depredador / amenaza sale de los stats (masa/fuerza/textura), no de una tabla fija»). Predator power is body mass,
 * strength, armour and agility plus its weapon (teeth, claws, tusks: the weapon does not scale with mass); defence is
 * mass, strength and armour; a pack adds its allies' power by the species' pack factor (a lone wolf cannot take a
 * musk ox, a pack can). Only a meat eater hunts, only what shares its medium, and only what it can overpower.
 */
export type Diet = "carnivoro" | "herbivoro" | "omnivoro";
/** Where it moves and hunts: the land, the water, both (the polar bear at the ice edge) or the air. */
export type Medium = "tierra" | "agua" | "ambos" | "aire";

export interface Traits {
  /** Adult body mass, kg. */
  readonly massKg: number;
  /** 0–1 */
  readonly strength: number;
  /** Hide, blubber, shell: 0–1. */
  readonly armour: number;
  readonly agility: number;
  /** Teeth, claws, tusks, horns: 0–1. */
  readonly armament: number;
  /** How much its allies near it add to its power (Cold Sanctuary: wolf 0.8, bear 0.3, fox 0.2, deer 0). */
  readonly packFactor: number;
  readonly diet: Diet;
  readonly medium: Medium;
  /** Top speed (a sprint or a burst), m/s. */
  readonly runMs: number;
  /** How far it notices others, m. */
  readonly senseM: number;
  /** Share of its attacks that end in a kill. */
  readonly huntSuccess: number;
  /** Hunger it builds per day (1 = it needs a full meal every day). */
  readonly hungerPerDay: number;
  /** How far it goes from home to find food, m. */
  readonly rangeM: number;
  /**
   * What it eats among the animals, if its diet is narrower than its stats (a walrus could overpower a seal but eats
   * clams). Empty: its food is not among the animals (fish, krill, clams, plants): it feeds like a grazer.
   */
  readonly eats?: readonly string[];
}

/** Body mass on a 0–1 scale: 1 g → 0, 10 t → 1 (log). */
export const massStat = (kg: number): number => Math.max(0, Math.min(1, (Math.log10(Math.max(kg, 0.001)) + 3) / 7));

/** Cold Sanctuary's weight of the weapon in the predator's power (additive, full weight). */
export const ARMAMENT_POWER = 1;

export function predatorPower(t: Traits, scale = 1, sickness = 0): number {
  const mass = massStat(t.massKg * scale ** 3);
  return (t.strength * scale * 0.4 + mass * 0.4 + t.armour * 0.15 + t.agility * 0.05 + t.armament * ARMAMENT_POWER) * (1 - Math.min(1, Math.max(0, sickness)));
}

export function defense(t: Traits, scale = 1, sickness = 0): number {
  return (massStat(t.massKg * scale ** 3) * 0.5 + t.strength * scale * 0.3 + t.armour * 0.2) * (1 - Math.min(1, Math.max(0, sickness)));
}

/** Its power with the allies of its kind near it. */
export function effectivePower(t: Traits, scale: number, allies: readonly { traits: Traits; scale: number }[]): number {
  return predatorPower(t, scale) + allies.reduce((p, a) => p + predatorPower(a.traits, a.scale) * t.packFactor, 0);
}

const meets = (a: Medium, b: Medium) => a === b || a === "ambos" || b === "ambos";

/** Can a hunter (with its power, pack included) take this prey here? `preyIn`: the medium the prey is in now. */
export function canHunt(hunter: Traits, hunterPower: number, preySpecies: string, prey: Traits, preyScale: number, preyIn: Medium, hunterSpecies?: string): boolean {
  if (hunter.diet === "herbivoro" || hunterSpecies === preySpecies || (hunter.eats && !hunter.eats.includes(preySpecies))) return false;
  if (!meets(hunter.medium, preyIn)) return false;
  return hunterPower >= defense(prey, preyScale);
}

/** Does `a` fear `other`? (other is clearly more powerful: Cold Sanctuary uses a 0.5 margin on its stats; on these, 0.3) */
export function fears(a: Traits, aScale: number, otherPower: number, margin = 0.3): boolean {
  return otherPower - predatorPower(a, aScale) > margin;
}
