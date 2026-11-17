import type { Sourced } from "@core/units";

/**
 * Components by capability tier, and how a better one reaches the station (docs/design/componentes.md
 * §7, docs/design/importacion.md §5). Berón, 2026-11-17: «con los que se empieza deben ser los de menor
 * capacidad, de modo que los mejores se consigan mediante los recursos; como en la realidad no se crean
 * componentes en el espacio, la base es traer componentes y naves completas por importación».
 *
 * - Each category is a ladder of real hardware (flown or with a funded programme), lowest capacity first,
 *   ranked by one number that matters for the game (`metric`).
 * - What the vehicles in play carry is `deSerie` (the player has it from the start, it is not imported
 *   on its own). The player starts at the bottom: a tier opens when a part of the tier below is owned.
 * - Everything else arrives by import from Earth, paid in credits, inside a cargo vehicle (or on its own
 *   when nothing carries it), and is berthed with the arm. Nothing major is made at the station.
 */
export type SupplyCategory =
  | "motor-bipropelente"
  | "motor-monopropelente"
  | "motor-metano"
  | "rcs-bipropelente"
  | "rcs-monopropelente"
  | "propulsion-cubesat"
  | "tanque-par"
  | "tanque-mono"
  | "cabina"
  | "energia"
  | "bateria"
  | "escudo"
  | "soporte-vital"
  | "avionica"
  | "acople";

export interface CategoryInfo {
  readonly id: SupplyCategory;
  readonly name: string;
  /** What the ladder is ranked by, and why that number. */
  readonly metric: { readonly label: string; readonly unit: string; readonly why: string };
}

/** Real (flown or flying) or in development (funded programme with a date). Concepts never enter a ladder. */
export type SupplyReality = "real" | "en-desarrollo";

export interface SupplyItem {
  /** The same id the hangar, the bay and the vehicle recipes use. */
  readonly partId: string;
  readonly name: string;
  readonly category: SupplyCategory;
  /** 1 = lowest capacity. */
  readonly tier: number;
  /** Its value of the category's metric, with the source. */
  readonly capacity: Sourced<number>;
  readonly massKg: Sourced<number>;
  readonly reality: SupplyReality;
  /** Where it goes: inside a pressurised cargo hold (avionics, life support, batteries) or outside (engines, tanks, wings). */
  readonly stowage: "presurizada" | "exterior";
  /** Fitted on a vehicle in play from the start: which one. Not imported on its own (it is part of that vehicle). */
  readonly deSerie?: string;
  readonly sources: readonly string[];
}

/** A cargo vehicle that brings imports the last metres and is berthed or docked at the station. */
export interface Carrier {
  readonly id: string;
  readonly name: string;
  /** Up-mass it carries, kg. */
  readonly maxKg: Sourced<number>;
  readonly holds: readonly ("presurizada" | "exterior")[];
  /** How it reaches the station's ports. */
  readonly arrival: string;
  readonly source: string;
}

/** A launcher as the supply sees it: price and lift to low Earth orbit. */
export interface SupplyLauncher {
  readonly id: string;
  readonly name: string;
  readonly usdPerKg: { readonly value: number };
  readonly leoPayloadKg?: { readonly value: number };
  /** Price and lift are targets, not a public offer. */
  readonly target?: boolean;
}

/** What an import of `kg` needs: the vehicle that brings it and the launcher that lifts it (with its stages) to LEO. */
export interface Shipment {
  /** The cargo vehicle, or a free-flyer of its own (captured by the arm) when none carries it. */
  readonly carrier: Carrier | "libre";
  readonly launcher?: SupplyLauncher;
  /** kg in LEO (cargo × the transfer's multiplier). */
  readonly leoKg: number;
  /** Why it cannot go, if so. */
  readonly blocker?: string;
}

const es = (v: number) => Math.round(v).toLocaleString("es-ES");

/**
 * The cargo vehicle for `kg` in `stowage` (the first in `carriers` that carries it), and the cheapest launcher
 * that lifts it with its transfer stages (`leoKgPerKg` from the import quote); a target-only launcher
 * (Starship) is used only when no flying one can. Heavier than every cargo vehicle: it flies as a
 * free-flyer and the arm captures it (as Cygnus and HTV are captured), up to `armMaxKg`.
 */
export function planShipment(kg: number, stowage: SupplyItem["stowage"], leoKgPerKg: number, carriers: readonly Carrier[], launchers: readonly SupplyLauncher[], armMaxKg: number): Shipment {
  const carrier = carriers.find((c) => c.holds.includes(stowage) && kg <= c.maxKg.value + 1e-9) ?? "libre";
  const leoKg = kg * leoKgPerKg;
  if (carrier === "libre" && kg > armMaxKg) return { carrier, leoKg, blocker: `${es(kg)} kg: más de lo que mueve el brazo (${es(armMaxKg)} kg)` };
  const lifts = (l: SupplyLauncher) => !l.leoPayloadKg || leoKg <= l.leoPayloadKg.value + 1e-9;
  const byPrice = [...launchers].sort((a, b) => a.usdPerKg.value - b.usdPerKg.value);
  const launcher = byPrice.find((l) => !l.target && lifts(l)) ?? byPrice.find(lifts);
  if (!launcher) {
    const biggest = Math.max(...launchers.map((l) => l.leoPayloadKg?.value ?? 0));
    return { carrier, leoKg, blocker: `Hay que subir ${es(leoKg)} kg a la órbita baja y ningún lanzador sube más de ${es(biggest)} kg` };
  }
  return { carrier, launcher, leoKg };
}

/** Items of a category, lowest tier first. */
export const ladder = (items: readonly SupplyItem[], category: SupplyCategory): SupplyItem[] => items.filter((i) => i.category === category).sort((a, b) => a.tier - b.tier || a.capacity.value - b.capacity.value);

/**
 * Why a tier is still closed: the player climbs one tier at a time (game rule). A tier opens when the
 * station has (or has had) a part of the tier below in that category: fitted from the start, in the
 * hangar, or imported before. Tier 1 is always open.
 */
export function tierBlocker(item: SupplyItem, items: readonly SupplyItem[], owned: (partId: string) => boolean): string | undefined {
  if (item.tier <= 1) return undefined;
  const below = items.filter((i) => i.category === item.category && i.tier === item.tier - 1);
  if (!below.length || below.some((i) => owned(i.partId))) return undefined;
  return `Primero el nivel ${item.tier - 1}: ${below.map((i) => i.name.replace(/\s*\(.*\)$/, "")).join(" o ")}`;
}

/** Every item ranks above all items of lower tiers by its category's metric (a check the data must pass). */
export function laddersAreOrdered(items: readonly SupplyItem[]): string[] {
  const bad: string[] = [];
  for (const a of items)
    for (const b of items) if (a.category === b.category && a.tier > b.tier && a.capacity.value < b.capacity.value) bad.push(`${a.partId} (nivel ${a.tier}) < ${b.partId} (nivel ${b.tier})`);
  return bad;
}
