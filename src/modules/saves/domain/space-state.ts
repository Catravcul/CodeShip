import { isRecord } from "@core/snapshot";
import { checkHandover } from "./launch-handover";

/**
 * The space sanctuary's (level 6) saved state (docs/design/partidas.md, «Qué se guarda»): plain JSON written by
 * the game (src/game-save.ts) and checked here before it is resumed. Only the parts the game cannot do without
 * are required (where the craft are and where she is); every other part is optional and, missing or broken,
 * keeps the value of a new game. Another level (3) brings its own state and its own check.
 */
export const SPACE_LEVEL = 6;

export type V3 = readonly [number, number, number];
export type Q4 = readonly [number, number, number, number];

export interface PoseState {
  readonly p: V3;
  /** Orientation quaternion as [w, x, y, z]. */
  readonly q: Q4;
}

/** A free craft: pose, velocity (world) and body rates. */
export interface BodyState extends PoseState {
  readonly v: V3;
  readonly w: V3;
}

export type CrewVehicle = "modulo" | "nodriza" | "estacion";
/** Where in the vehicle: at the LM's controls, in its cabin, on Starship's flight deck, or in a walkable interior. */
export type CrewSpot = "asiento" | "cabina" | "cubierta-vuelo" | "interior";

export interface CrewPlace {
  readonly vehicle: CrewVehicle;
  readonly spot: CrewSpot;
  /** The station or fixture she is at (a cabin station, a deck seat, an interior fixture). */
  readonly at?: string;
}

export interface SpaceState {
  /** Days on board since the game began (fractional). */
  readonly boardDays: number;
  readonly crew: CrewPlace & { readonly member?: unknown };
  readonly lander: {
    readonly body: BodyState;
    readonly simTimeS: number;
    /** «nodriza», a station port's id, or null (free or landed). */
    readonly dockedTo: string | null;
    /** The asteroid it flies to (the expedition's target). */
    readonly target?: string;
    readonly landed?: boolean;
    readonly ship?: unknown;
  };
  readonly mothership: { readonly pose: PoseState; readonly dockedTo: string | null; readonly propellantKg?: number };
  readonly lifeSupport?: { readonly estacion?: unknown; readonly nodriza?: unknown; readonly modulo?: unknown };
  /** The galleys' stores: the Starship's (the habitat's larder) and the station's. */
  readonly larders?: { readonly nodriza?: unknown; readonly estacion?: unknown };
  readonly wallet?: unknown;
  readonly missions?: unknown;
  /** Nevaeh's letters: arrived, read, missions done. */
  readonly mailbox?: unknown;
  /** Each asteroid's rapport with her (persuaded, subjugated, levels). */
  readonly rapport?: unknown;
  readonly stationStock?: unknown;
  /** The AQH colonies: the Starship's and Kibo's (the animals adopted from the catalogue). */
  readonly aquariums?: { readonly nodriza?: unknown; readonly estacion?: unknown };
  /**
   * Trips under way (docs/design/partidas.md, «Viajes en marcha»): the Starship's cruise to Bennu after the launch
   * (navigation/domain/cruise.ts) and her programmed hop (Navigator.tripSnapshot). Read back, they go on at the
   * same point; missing or broken, nothing is flying (as before they were kept).
   */
  readonly trips?: { readonly crucero?: unknown; readonly nodriza?: unknown };
  /** The settings: the general ones (`codeship.ajustes`, as stored), the order challenges' mode and the landing mode. */
  readonly settings?: { readonly ajustes?: string; readonly pasoAPaso?: boolean; readonly aterrizaje?: string };
}

const VEHICLES: readonly CrewVehicle[] = ["modulo", "nodriza", "estacion"];
const SPOTS: readonly CrewSpot[] = ["asiento", "cabina", "cubierta-vuelo", "interior"];

const finite = (v: unknown, n: number): boolean => Array.isArray(v) && v.length === n && v.every((x) => typeof x === "number" && Number.isFinite(x));
const pose = (v: unknown): boolean => isRecord(v) && finite(v.p, 3) && finite(v.q, 4);

/** Why a level-6 state cannot be resumed, or undefined when it can (a hand-over from level 3's launch is one too). */
export function checkSpaceState(s: unknown): string | undefined {
  if (!isRecord(s)) return "sin estado";
  if (isRecord(s.fromLaunch)) return checkHandover(s);
  if (typeof s.boardDays !== "number" || !Number.isFinite(s.boardDays) || s.boardDays < 0) return "sin día a bordo";
  const c = s.crew;
  if (!isRecord(c) || !VEHICLES.includes(c.vehicle as CrewVehicle) || !SPOTS.includes(c.spot as CrewSpot) || (c.at !== undefined && typeof c.at !== "string")) return "sin el sitio de Doménica";
  const l = s.lander;
  if (!isRecord(l) || !pose(l.body) || !finite((l.body as Record<string, unknown>).v, 3) || !finite((l.body as Record<string, unknown>).w, 3)) return "sin la posición del módulo";
  if (typeof l.simTimeS !== "number" || !Number.isFinite(l.simTimeS) || (l.dockedTo !== null && typeof l.dockedTo !== "string")) return "sin el acople del módulo";
  const m = s.mothership;
  if (!isRecord(m) || !pose(m.pose) || (m.dockedTo !== null && typeof m.dockedTo !== "string")) return "sin la posición de la Starship";
  if (s.settings !== undefined && !isRecord(s.settings)) return "ajustes ilegibles";
  return undefined;
}

/** The vehicle's name in the saved games list. */
export const VEHICLE_NAME: Readonly<Record<CrewVehicle, string>> = { modulo: "Módulo lunar", nodriza: "Starship", estacion: "Estación" };

/** The day on board shown in the list: day 1 is the first. */
export const boardDayOf = (boardDays: number): number => Math.floor(Math.max(0, boardDays)) + 1;
