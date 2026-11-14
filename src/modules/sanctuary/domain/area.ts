/**
 * Rules for the areas of a space sanctuary (docs/design/santuario-espacial.md), ported from Cold Sanctuary's
 * rules for areas and floors (world-topology-and-planes.md, plano-edificios.md, construcciones-elevadas.md,
 * world-simulation.md) and adapted to a station: gravity comes from spin, «down» is the rim of the ring,
 * and in 0 g water has no buoyancy.
 */

/** The four kinds, parallel to Cold Sanctuary's land, marine, aerial and underground sanctuaries. */
export type SanctuaryKind = "terrestre" | "marino" | "aereo" | "subterraneo";
/** Where the area is built: a deck of the mothership's ring or a module of the station. */
export type Host = "nodriza" | "estacion";
/** Light regime: a day/night cycle under LEDs, dim light, or none at all. */
export type Light = "fotoperiodo" | "penumbra" | "oscuridad";
/** Role in the self-sufficiency loop (producer → consumer → decomposer → producer). */
export type LoopRole = "productor" | "consumidor" | "descomponedor";

export interface SanctuaryArea {
  readonly id: string;
  readonly name: string;
  readonly kind: SanctuaryKind;
  readonly host: Host;
  /** Spin gravity where the fauna lives, in g. 0 = weightlessness. */
  readonly gravityG: number;
  readonly light: Light;
  /** Water the area holds, m³ (0 for a dry area). 1 m³ = 1 t. */
  readonly waterM3: number;
  /** Absolute pressure of the air or water the fauna lives in, kPa. */
  readonly pressureKpa: number;
  /** Temperature the area keeps, °C (min, max). */
  readonly tempC: readonly [number, number];
  /** Species living there (ids of the fauna catalogue). */
  readonly residents: readonly string[];
  /** Loop roles a machine fills (a biofilter decomposes, a gas-exchange membrane «produces» oxygen). */
  readonly support: readonly LoopRole[];
  /** Areas of the sanctuary and pieces of the station (outfit ids) that must exist first. */
  readonly requires: { readonly areas: readonly string[]; readonly station: readonly string[] };
  /** The origin: the area every other one hangs from (Cold Sanctuary: «nunca perder el origen»). */
  readonly hub?: boolean;
}

/** The hub of the space sanctuary: the farm deck of the mothership's ring, which already exists. */
export const HUB_AREA_ID = "jardin-anillo";

export type Missing = { readonly kind: "area" | "station"; readonly id: string };

/**
 * What is still missing to build `area`, given the ids already built (areas and station pieces in one set).
 * Every area but the hub needs the hub, even if it does not list it: the sanctuary grows from its origin.
 */
export function missingRequirements(area: SanctuaryArea, built: ReadonlySet<string>): Missing[] {
  if (area.hub) return [];
  const areas = area.requires.areas.includes(HUB_AREA_ID) ? area.requires.areas : [HUB_AREA_ID, ...area.requires.areas];
  return [
    ...areas.filter((id) => !built.has(id)).map((id) => ({ kind: "area" as const, id })),
    ...area.requires.station.filter((id) => !built.has(id)).map((id) => ({ kind: "station" as const, id })),
  ];
}

export type GravityRegime = "anillo" | "ingravidez";
export const gravityRegime = (g: number): GravityRegime => (g > 0 ? "anillo" : "ingravidez");

export interface RingDecks {
  /** Radius of the rim floor, m. */
  readonly floorRadiusM: number;
  /** Height of each deck (floor to floor), m. */
  readonly deckHeightM: number;
  /** Gravity on the rim floor, g. */
  readonly rimG: number;
}

/**
 * Gravity on deck `n` of a ring (0 = rim). Decks stack toward the axis, like Cold Sanctuary's floors stack
 * upward (11 m apart there); a = ω²r, so each deck has less weight: g(n) = rimG · (R − n·h) / R.
 */
export function deckGravityG(ring: RingDecks, deck: number): number {
  const r = Math.max(0, ring.floorRadiusM - deck * ring.deckHeightM);
  return (ring.rimG * r) / ring.floorRadiusM;
}

export interface DeckLoad {
  readonly id: string;
  /** Floor load, kg/m² (water 1 m deep = 1000 kg/m²). */
  readonly loadKgM2: number;
}
export type DeckOrderError = { readonly deck: number; readonly id: string; readonly below: string };

/**
 * Cold Sanctuary puts the heavy on the ground floor (soil below, clean lab above; machines below, yoga above).
 * In a ring «below» is the rim: water and soil go outward, where the structure is built for the load and where
 * the gravity is strongest. `decks` go from the rim toward the axis; a deck heavier than the one under it is an error.
 */
export function checkDeckOrder(decks: readonly DeckLoad[]): DeckOrderError[] {
  const errors: DeckOrderError[] = [];
  for (let i = 1; i < decks.length; i++) {
    const d = decks[i]!;
    const under = decks[i - 1]!;
    if (d.loadKgM2 > under.loadKgM2) errors.push({ deck: i, id: d.id, below: under.id });
  }
  return errors;
}

export interface WaterHandling {
  /** In a ring, air bubbles rise and aerate; in 0 g they stay where they are made, so gas goes through a membrane (the AQH «artificial lung»). */
  readonly aeration: "burbujas" | "membrana";
  /** Water must be pumped: there is no convection in 0 g, and a biofilter needs flow anyway (AQH: 0–0.5 L/min per tank). */
  readonly forcedCirculation: boolean;
  /** In 0 g, a stray bubble does not leave the water: it has to be caught (a centrifuge or a trap). */
  readonly bubbleTrap: boolean;
  /** In a ring the water has a free surface; in 0 g it must be sealed or it drifts as blobs that cling to faces (EVA 23). */
  readonly containment: "superficie-libre" | "cerrado";
}

/** How the water of an area must be handled; null for a dry area. */
export function waterHandling(area: SanctuaryArea): WaterHandling | null {
  if (area.waterM3 <= 0) return null;
  return gravityRegime(area.gravityG) === "anillo"
    ? { aeration: "burbujas", forcedCirculation: true, bubbleTrap: false, containment: "superficie-libre" }
    : { aeration: "membrana", forcedCirculation: true, bubbleTrap: true, containment: "cerrado" };
}
