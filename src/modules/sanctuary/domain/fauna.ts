import { gravityRegime, type LoopRole, type SanctuaryArea } from "./area";

/** Where a species lives. */
export type Habitat = "tierra" | "agua" | "aire";

/**
 * How a species copes with weightlessness, from what has flown:
 * - `ok`: behaved normally (moths on STS-3, cockroaches on Foton-M3, hornwort on Tiangong);
 * - `orienta-con-luz`: loops at first and then keeps its back to the light (mummichog on Skylab, medaka on IML-2);
 * - `no`: cannot function (honeybees on STS-3 tumbled and floated);
 * - `sin-datos-sin-vista`: never flown and blind, so it has no light to lean on;
 * - `sin-datos`: never flown.
 */
export type ZeroGResponse = "ok" | "orienta-con-luz" | "no" | "sin-datos-sin-vista" | "sin-datos";

export interface Species {
  readonly id: string;
  readonly name: string;
  readonly scientific?: string;
  readonly habitat: Habitat;
  readonly role: LoopRole;
  readonly zeroG: ZeroGResponse;
  /** Needs light: to photosynthesise, or to find its way (a diurnal forager). */
  readonly needsLight?: boolean;
  readonly nocturnal?: boolean;
  /** Temperature it lives in, °C (min, max). */
  readonly tempC: readonly [number, number];
  /** Smallest water volume for a viable group, L (aquatic species). */
  readonly minWaterL?: number;
  /** Pressure it needs to live, kPa (deep-sea species). */
  readonly minPressureKpa?: number;
  /** Where the facts come from (flight, behaviour, needs). */
  readonly source: string;
  readonly note?: string;
}

export type FitReason =
  | "habitat"
  | "sin-agua"
  | "poca-agua"
  | "ingravidez-a-oscuras"
  | "no-funciona-en-ingravidez"
  | "ingravidez-sin-orientacion"
  | "sin-datos-en-ingravidez"
  | "necesita-luz"
  | "falta-presion"
  | "temperatura";

export interface Fit {
  readonly ok: boolean;
  readonly reasons: readonly FitReason[];
}

/**
 * Whether a species can live in an area. Cold Sanctuary's rule «primero el bioma real, luego las mutaciones»:
 * in 0 g only species with a flight record (or a clear reason) are admitted; the rest wait for a ring.
 */
export function fit(species: Species, area: SanctuaryArea): Fit {
  const reasons: FitReason[] = [];
  // A land or air animal does not go into a marine area (it would live on its walls, not in its water).
  if (species.habitat !== "agua" && area.kind === "marino") reasons.push("habitat");
  if (species.habitat === "agua") {
    if (area.waterM3 <= 0) reasons.push("sin-agua");
    else if (species.minWaterL !== undefined && area.waterM3 * 1000 < species.minWaterL) reasons.push("poca-agua");
  }
  if (gravityRegime(area.gravityG) === "ingravidez") {
    if (species.zeroG === "orienta-con-luz" && area.light === "oscuridad") reasons.push("ingravidez-a-oscuras");
    if (species.zeroG === "no") reasons.push("no-funciona-en-ingravidez");
    if (species.zeroG === "sin-datos-sin-vista") reasons.push("ingravidez-sin-orientacion");
    if (species.zeroG === "sin-datos") reasons.push("sin-datos-en-ingravidez");
  }
  if (species.needsLight && area.light === "oscuridad") reasons.push("necesita-luz");
  if (species.minPressureKpa !== undefined && area.pressureKpa < species.minPressureKpa) reasons.push("falta-presion");
  const [lo, hi] = species.tempC;
  if (area.tempC[0] < lo || area.tempC[1] > hi) reasons.push("temperatura");
  return { ok: reasons.length === 0, reasons };
}

export interface LoopStatus {
  readonly closed: boolean;
  readonly missing: readonly LoopRole[];
}

const ROLES: readonly LoopRole[] = ["productor", "consumidor", "descomponedor"];

/**
 * Cold Sanctuary's sanctuaries sustain themselves (garden → kitchen → compost). A closed aquatic ecosystem in
 * orbit needs the same three roles: C.E.B.A.S. flew hornwort (producer), swordtails and snails (consumers) and
 * filter bacteria (decomposers). A machine can fill a role (`area.support`).
 */
export function loopStatus(area: SanctuaryArea, catalog: readonly Species[]): LoopStatus {
  const have = new Set<LoopRole>(area.support);
  for (const id of area.residents) {
    const s = catalog.find((c) => c.id === id);
    if (!s) throw new Error(`Especie desconocida en ${area.id}: ${id}`);
    have.add(s.role);
  }
  const missing = ROLES.filter((r) => !have.has(r));
  return { closed: missing.length === 0, missing };
}
