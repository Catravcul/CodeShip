export type Species = "gato" | "perro" | "gallina";

export type Stimulus = "planta-nueva" | "gato-desconocido" | "gallina" | "perro" | "gato" | "cria";
export type AnimalAction =
  | "morder-planta"
  | "olfatear"
  | "ignorar"
  | "bufar"
  | "saludar"
  | "acechar"
  | "acurrucarse"
  | "cobijar"
  | "perseguir"
  | "ladrar"
  | "jugar"
  | "picotear";
/** Kept for the cat-only code written before dogs and hens had minds. */
export type CatAction = AnimalAction;

/** A line of an animal's mind program: `cuando <stimulus> → <action>`, shown as pseudocode or JS. */
export interface AnimalRule {
  readonly id: string;
  readonly when: Stimulus;
  readonly then: AnimalAction;
  readonly pseudo: string;
  readonly js: string;
}
export type CatRule = AnimalRule;

/** Actions that bring two animals closer, and actions that frighten or hurt the other. */
export const WARM_ACTIONS: ReadonlySet<AnimalAction> = new Set(["acurrucarse", "cobijar", "jugar", "saludar"]);
export const HOSTILE_ACTIONS: ReadonlySet<AnimalAction> = new Set(["acechar", "perseguir", "ladrar", "bufar", "picotear"]);

type Instincts = Partial<Record<Stimulus, readonly (readonly [AnimalAction, number])[]>>;

/**
 * Untrained reactions, with game-tuned weights. Cats explore new things by sniffing and chewing,
 * and meeting an unknown cat face to face often starts with hissing (see the AAFP guide in
 * docs/design/vida-a-bordo.md); programming them replaces these instincts.
 */
export const INSTINCTS: Instincts = {
  "planta-nueva": [
    ["morder-planta", 0.5],
    ["olfatear", 0.5],
  ],
  "gato-desconocido": [
    ["bufar", 0.6],
    ["olfatear", 0.4],
  ],
  // Cats are predators of birds; a hen nearby triggers stalking.
  gallina: [
    ["acechar", 0.5],
    ["ignorar", 0.5],
  ],
  perro: [
    ["bufar", 0.5],
    ["olfatear", 0.5],
  ],
  // Cats have been seen mothering puppies and ducklings, but rarely without help.
  cria: [
    ["olfatear", 0.6],
    ["ignorar", 0.3],
    ["acurrucarse", 0.1],
  ],
};

/** Dogs chase what runs (hens, cats) and bark at what they do not know. Game-tuned weights. */
export const DOG_INSTINCTS: Instincts = {
  gallina: [
    ["perseguir", 0.5],
    ["ladrar", 0.2],
    ["olfatear", 0.3],
  ],
  gato: [
    ["ladrar", 0.5],
    ["olfatear", 0.3],
    ["jugar", 0.2],
  ],
  cria: [
    ["olfatear", 0.6],
    ["jugar", 0.3],
    ["ladrar", 0.1],
  ],
};

/**
 * Hens scratch and peck seedlings, and a hen given chicks that are not hers either accepts them,
 * pecks at them or ignores them (SARE FNE08-645). Game-tuned weights; only a broody hen can brood.
 */
export const HEN_INSTINCTS: Instincts = {
  "planta-nueva": [
    ["picotear", 0.6],
    ["ignorar", 0.4],
  ],
  cria: [
    ["picotear", 0.4],
    ["ignorar", 0.4],
    ["cobijar", 0.2],
  ],
};

export const INSTINCTS_BY_SPECIES: Record<Species, Instincts> = { gato: INSTINCTS, perro: DOG_INSTINCTS, gallina: HEN_INSTINCTS };

/** Anything with a programmable mind. */
export interface Minded {
  ruleFor(stimulus: Stimulus): AnimalRule | undefined;
}

/** What the animal does now: its programmed rule if calm enough to follow it, otherwise instinct. */
export function decide(animal: Minded, stimulus: Stimulus, rng: () => number, instincts: Instincts = INSTINCTS): AnimalAction {
  const rule = animal.ruleFor(stimulus);
  if (rule) return rule.then;
  const options = instincts[stimulus];
  if (!options) return "ignorar";
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [action, w] of options) {
    r -= w;
    if (r < 0) return action;
  }
  return options[options.length - 1]![0];
}

/** Rules written into a mind; above `breakStress` the animal follows instinct instead. */
export class AnimalMind {
  private readonly _rules = new Map<string, AnimalRule>();

  get rules(): readonly AnimalRule[] {
    return [...this._rules.values()];
  }

  /** Replaces any rule for the same stimulus. */
  learn(rule: AnimalRule): void {
    for (const [id, r] of this._rules) if (r.when === rule.when) this._rules.delete(id);
    this._rules.set(rule.id, rule);
  }

  ruleFor(stimulus: Stimulus, stress: number, breakStress: number): AnimalRule | undefined {
    if (stress >= breakStress) return undefined;
    return [...this._rules.values()].find((r) => r.when === stimulus);
  }
}
