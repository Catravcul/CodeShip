import { RootMenu } from "./root-menu";
import { ICON } from "./icons";
import type { PickOption, RetoPicker } from "./reto-picker";
import { retoWord } from "@modules/chores/domain/palabra";

/**
 * The orange interaction button under the root menu (reglas.md §5.8, Berón 2026-11-19), the same in every level: when
 * what is at hand gives a challenge it reads «Reto: <cosa>» with the challenge icon; another machine or console (a
 * hatch, a screen) reads its name with the machine icon. A thing with one challenge opens it straight away; with
 * several, the choice (RetoPicker) comes first.
 */

/** «Lavadora (Servicios)» → «Lavadora»: the button's label is short. */
export const shortLabel = (l: string) => l.replace(/\s*\(.*\)\s*/g, " ").trim();

/**
 * A challenge's orange button: its face says in one word what the challenge is about (Berón 2026-11-25: «Cocina»,
 * «Boxeo»; chores/domain/palabra.ts), «Reto: <thing>» stays its accessible name. `word`: the challenge's own (from its
 * data, `retoWord` / `retosWord`); without it, the thing's name tells it.
 */
export function retoButton(thing: string, onClick: () => void, open = false, word?: string): Parameters<typeof RootMenu.interact>[0] {
  return { icon: ICON.reto, label: `Reto: ${shortLabel(thing)}`, word: word ?? retoWord({ title: thing }), onClick, open };
}

/** Show (or hide, with undefined) the orange button for a thing that gives challenges (`word`: as retoButton). */
export function offerReto(thing: string | undefined, onClick: () => void, word?: string): void {
  RootMenu.interact(thing === undefined ? undefined : retoButton(thing, onClick, false, word));
}

/** One challenge: open it; several: let her choose (RetoPicker), locked ones greyed with why. */
export function chooseReto(picker: RetoPicker, title: string, options: readonly (PickOption & { run(): void })[]): void {
  if (options.length === 1 && !options[0]!.locked) return options[0]!.run();
  picker.open(shortLabel(title), options, (k) => options[k]!.run());
}

/**
 * On a machine's card, the buttons that start a challenge: the ships' chores and arm procedures («chore:», «brazo:»),
 * sanctuary 3's posts, simulators and launch. A card with one of them gets the challenge's orange button.
 */
export const RETO_ACTS = '[data-act^="chore:"], [data-act^="brazo:"], [data-act="reto"], [data-act^="sim:"], [data-act="lanzar"], [data-reto]';
