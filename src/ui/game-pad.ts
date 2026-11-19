import { ActionPad, type ActionPadButton, type PadKey } from "./action-pad";
import { RootMenu } from "./root-menu";

/** A level's own button (Correr, Saltar, Trepar): what it does when pressed (a toggle or a hold also when let go). */
export interface PadMove extends ActionPadButton {
  run(on: boolean): void;
}

/**
 * What the Switch pad does in a level (reglas.md §5.7–5.8, Berón 2026-11-19: «un solo sistema para todos los
 * niveles»). The general buttons are the same everywhere: the left D-pad ↑ / ↓ zoom, «+» the level's list of things
 * to do (Misiones in sanctuary 1, Tareas in sanctuary 3 and the ships), «−» Áreas, capture the view (1.ª / 3.ª
 * persona), home the general settings. A level adds its moves (Correr, Saltar, Trepar where there is gravity); a
 * button a level does not use is faded.
 */
export interface PadSetup {
  /** D-pad ↑ (+1) / ↓ (−1) held, 0 let go. */
  zoom?(dir: -1 | 0 | 1): void;
  /** «+»: the level's list (its name on the button). */
  readonly plus?: { readonly label: string; open(): void };
  /** «−»: Áreas. */
  areas?(): void;
  /** Capture: Vista. */
  view?(): void;
  /** Home: the general settings. */
  home?(): void;
  /** The level's moves on A, B, X… */
  readonly moves?: readonly PadMove[];
  /** True while something is on top of the level (a challenge): only the zoom answers. */
  paused?(): boolean;
}

/** The general buttons' jobs and keys, the same in every level. */
const GENERAL: Readonly<Record<"up" | "down" | "+" | "-" | "capture" | "home", Omit<ActionPadButton, "letter">>> = {
  up: { label: "Acercar", hold: true, key: "Equal" },
  down: { label: "Alejar", hold: true, key: "Minus" },
  "+": { label: "Misiones" },
  "-": { label: "Áreas" },
  capture: { label: "Vista" },
  home: { label: "Ajustes" },
};

let pad: ActionPad | undefined;
let owner: unknown;
/** What every level of a game shares (the ships: Áreas and the settings live in main.ts); a level's own setup wins. */
let shared: PadSetup = {};

function buttons(s: PadSetup): ActionPadButton[] {
  const out: ActionPadButton[] = [...(s.moves ?? []).map(({ run: _r, ...b }) => b)];
  const add = (k: keyof typeof GENERAL, on: unknown, label?: string) => on && out.push({ letter: k, ...GENERAL[k], ...(label ? { label } : {}) });
  add("up", s.zoom);
  add("down", s.zoom);
  add("+", s.plus, s.plus?.label);
  add("-", s.areas);
  add("capture", s.view);
  add("home", s.home);
  return out;
}

function press(s: PadSetup, k: PadKey, on: boolean): void {
  if (k === "up" || k === "down") return s.zoom?.(on ? (k === "up" ? 1 : -1) : 0);
  if (s.paused?.()) return;
  if (k === "+") return s.plus?.open();
  if (k === "-") return s.areas?.();
  if (k === "capture") return s.view?.();
  if (k === "home") return s.home?.();
  s.moves?.find((m) => m.letter === k)?.run(on);
}

/**
 * The one Switch pad of a game, shared by its levels and scenes. A scene that she walks in takes it (`use`) when she
 * enters and lets it go (`release`) when she leaves; with no scene on it, it is hidden (a console's screen, flying).
 */
export const GamePad = {
  /** What every scene of this game shares (set once, e.g. Áreas and the settings of the ships' main.ts). */
  share(s: PadSetup): void {
    shared = s;
  },

  /** The pad now belongs to `who`, with these jobs. */
  use(root: HTMLElement, who: unknown, own: PadSetup): ActionPad {
    const s: PadSetup = { ...shared, ...own };
    owner = who;
    if (!pad) pad = new ActionPad(root, buttons(s), (k, on) => press(s, k, on));
    else pad.configure(buttons(s), (k, on) => press(s, k, on));
    pad.show(true);
    RootMenu.syncAll();
    return pad;
  },

  /** `who` leaves: the pad hides (unless another scene took it meanwhile). */
  release(who: unknown): void {
    if (owner !== who || !pad) return;
    owner = undefined;
    pad.show(false);
    RootMenu.syncAll();
  },

  /** The pad, if a scene has it now. */
  get pad(): ActionPad | undefined {
    return owner !== undefined ? pad : undefined;
  },
};
