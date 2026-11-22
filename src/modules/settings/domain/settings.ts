/**
 * The player's general settings (docs/design/habitaculo.md §Ajustes): opened only from a yoga mat,
 * where Doménica sits in lotus. Pure rules: defaults, the first-input guess for keyboard help,
 * and a tolerant parser for what was stored.
 */
import { DEFAULT_PRESENTATION, INTERIOR_SCALES, INTERIOR_SPACINGS, type InteriorScale, type InteriorSpacing } from "@core/presentation";

/** Challenge screens as a full panel or floating over the scene like the cockpit HUD. */
export type ChallengeView = "panel" | "hud";
/** Cockpit camera the lander starts in when the pilot sits down. */
export type StartCamera = "cabina" | "exterior" | "ventral" | "trasera";
/** How the task list's «Ir» takes her there: the whole real way, or straight there (docs/design/viaje-a-una-tarea.md). */
export type TaskTravel = "viaje" | "teletransporte";
/**
 * Which vehicle's tasks the list shows (Berón, 2026-11-17): «auto» follows where she is; or the
 * Starship (nodriza), the station, the lander (módulo) or every task (docs/design/viaje-a-una-tarea.md §Ajustes de tareas).
 */
export type TaskVehicle = "auto" | "nodriza" | "estacion" | "modulo" | "todos" | "entrenamiento" | "lanzadera" | "parque" | "muelle" | "plataforma" | "glaciar" | "bioma";
/** How she is seen walking about rooms and modules: through her eyes or from behind/outside. */
export type WalkView = "primera" | "tercera";
/**
 * The trees' wooden grid in sanctuary 1 (Berón 2026-11-22: «más columnas de madera… como una rejilla… por setting para
 * irlo ajustando fácilmente»): a post and a beam every 4, 8 or 16 m, or only the corners and the levels. On the next load.
 */
export type WoodGrid = "4" | "8" | "16" | "no";
export const WOOD_GRIDS: readonly WoodGrid[] = ["4", "8", "16", "no"];
/** The grid's spacing in metres (0: none). */
export const woodGridMetres = (g: WoodGrid): number => (g === "no" ? 0 : Number(g));
/** What the first input of a session was. */
export type FirstInput = "tecla" | "toque" | "raton";

export interface GameSettings {
  /** Names of the Sun, planets and asteroids over the cockpit view. */
  readonly names: boolean;
  /** Keyboard hints («K desacopla», the controls card). */
  readonly keyboardHelp: boolean;
  /** The player set keyboard help on purpose: the first-input guess no longer applies. */
  readonly keyboardHelpChosen: boolean;
  /** The first input of the session has been seen (the guess is made once). */
  readonly firstInputSeen: boolean;
  readonly challengeView: ChallengeView;
  readonly camera: StartCamera;
  /** View on foot in rooms (bridge, cabin, ring, station). First person by default (Berón, 2026-11-14); the eye icon toggles it for the visit. */
  readonly walkView: WalkView;
  /** Synthesised alarms (ram warning, impacts). */
  readonly sound: boolean;
  /** «Ir a una tarea»: travel the real route (default) or teleport. */
  readonly taskTravel: TaskTravel;
  /** Task list's vehicle filter, in the list's own settings (the gear). «auto» by default: where she is. */
  readonly taskVehicle: TaskVehicle;
  /** Presentation layer (src/core/presentation.ts): interiors drawn 1:1 or 1,5×. Applies on the next load. */
  readonly interiorScale: InteriorScale;
  /** Presentation layer: interactables where the data put them, or spread to 2 m. Applies on the next load. */
  readonly spacing: InteriorSpacing;
  /** Sanctuary 1's wooden grid in the trees. Applies on the next load. */
  readonly woodGrid: WoodGrid;
}

export const CHALLENGE_VIEWS: readonly ChallengeView[] = ["panel", "hud"];
export const START_CAMERAS: readonly StartCamera[] = ["cabina", "exterior", "ventral", "trasera"];
export const TASK_TRAVELS: readonly TaskTravel[] = ["viaje", "teletransporte"];
/** The choices of the space game (sanctuary 6). */
export const TASK_VEHICLES: readonly TaskVehicle[] = ["auto", "nodriza", "estacion", "modulo", "todos"];
/** The choices in sanctuary 3: its islands. */
export const ISLAND_TASK_VEHICLES: readonly TaskVehicle[] = ["auto", "entrenamiento", "lanzadera", "parque", "muelle", "plataforma", "glaciar", "bioma", "todos"];
export const WALK_VIEWS: readonly WalkView[] = ["primera", "tercera"];

export const DEFAULT_SETTINGS: GameSettings = {
  names: true,
  keyboardHelp: true,
  keyboardHelpChosen: false,
  firstInputSeen: false,
  challengeView: "panel",
  camera: "cabina",
  walkView: "primera",
  sound: true,
  taskTravel: "viaje",
  taskVehicle: "auto",
  interiorScale: DEFAULT_PRESENTATION.interiorScale,
  spacing: DEFAULT_PRESENTATION.spacing,
  woodGrid: "4",
};

/**
 * Whether keyboard hints start on: yes on a device without touch, no on a touch device; the first
 * input of the session overrides the guess (a key or a mouse click means a keyboard is at hand).
 */
export function initialKeyboardHelp(env: { touchCapable: boolean; firstInput?: FirstInput }): boolean {
  if (env.firstInput) return env.firstInput !== "toque";
  return !env.touchCapable;
}

/** The first input of the session: sets keyboard help unless the player chose it. Later inputs change nothing. */
export function noteFirstInput(s: GameSettings, input: FirstInput): GameSettings {
  if (s.firstInputSeen) return s;
  return { ...s, firstInputSeen: true, keyboardHelp: s.keyboardHelpChosen ? s.keyboardHelp : initialKeyboardHelp({ touchCapable: true, firstInput: input }) };
}

/** A player's change. Setting keyboard help marks it as chosen. */
export function changeSetting<K extends keyof GameSettings>(s: GameSettings, key: K, value: GameSettings[K]): GameSettings {
  return { ...s, [key]: value, ...(key === "keyboardHelp" ? { keyboardHelpChosen: true } : {}) };
}

export function serializeSettings(s: GameSettings): string {
  const { firstInputSeen: _seen, ...kept } = s;
  return JSON.stringify(kept);
}

const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);

/**
 * Settings from storage (JSON or nothing). Unknown or malformed values fall back to the defaults.
 * `legacyChallengeView` is the older «codeship.retos-ui» preference ("compacta" | "panel").
 */
export function parseSettings(raw: string | null, env: { touchCapable: boolean; legacyChallengeView?: string | null }): GameSettings {
  let o: Record<string, unknown> | null = null;
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v === "object") o = v as Record<string, unknown>;
  } catch {
    o = null;
  }
  const legacy = env.legacyChallengeView === "compacta" ? "hud" : "panel";
  const chosen = o ? bool(o.keyboardHelpChosen, false) : false;
  return {
    names: bool(o?.names, DEFAULT_SETTINGS.names),
    keyboardHelp: chosen ? bool(o?.keyboardHelp, true) : initialKeyboardHelp({ touchCapable: env.touchCapable }),
    keyboardHelpChosen: chosen,
    // A stored choice is final; without one the first input of this session still decides.
    firstInputSeen: chosen,
    challengeView: o ? oneOf(o.challengeView, CHALLENGE_VIEWS, legacy) : legacy,
    camera: oneOf(o?.camera, START_CAMERAS, DEFAULT_SETTINGS.camera),
    walkView: oneOf(o?.walkView, WALK_VIEWS, DEFAULT_SETTINGS.walkView),
    sound: bool(o?.sound, DEFAULT_SETTINGS.sound),
    taskTravel: oneOf(o?.taskTravel, TASK_TRAVELS, DEFAULT_SETTINGS.taskTravel),
    taskVehicle: oneOf(o?.taskVehicle, [...TASK_VEHICLES, ...ISLAND_TASK_VEHICLES], DEFAULT_SETTINGS.taskVehicle),
    interiorScale: oneOf(o?.interiorScale, INTERIOR_SCALES, DEFAULT_SETTINGS.interiorScale),
    spacing: oneOf(o?.spacing, INTERIOR_SPACINGS, DEFAULT_SETTINGS.spacing),
    woodGrid: oneOf(o?.woodGrid, WOOD_GRIDS, DEFAULT_SETTINGS.woodGrid),
  };
}
