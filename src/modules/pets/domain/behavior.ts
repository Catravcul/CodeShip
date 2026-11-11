import type { Cat } from "./cat";

export type Stimulus = "planta-nueva" | "gato-desconocido";
export type CatAction = "morder-planta" | "olfatear" | "ignorar" | "bufar" | "saludar";

/** A line of a cat's mind program: `cuando <stimulus> → <action>`, shown as pseudocode or JS. */
export interface CatRule {
  readonly id: string;
  readonly when: Stimulus;
  readonly then: CatAction;
  readonly pseudo: string;
  readonly js: string;
}

/**
 * Untrained reactions, with game-tuned weights. Cats explore new things by sniffing and chewing,
 * and meeting an unknown cat face to face often starts with hissing (see the AAFP guide in
 * docs/design/vida-a-bordo.md); programming them replaces these instincts.
 */
export const INSTINCTS: Record<Stimulus, readonly (readonly [CatAction, number])[]> = {
  "planta-nueva": [
    ["morder-planta", 0.5],
    ["olfatear", 0.5],
  ],
  "gato-desconocido": [
    ["bufar", 0.6],
    ["olfatear", 0.4],
  ],
};

/** What the cat does now: its programmed rule if calm enough to follow it, otherwise instinct. */
export function decide(cat: Cat, stimulus: Stimulus, rng: () => number): CatAction {
  const rule = cat.ruleFor(stimulus);
  if (rule) return rule.then;
  const options = INSTINCTS[stimulus];
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [action, w] of options) {
    r -= w;
    if (r < 0) return action;
  }
  return options[options.length - 1]![0];
}
