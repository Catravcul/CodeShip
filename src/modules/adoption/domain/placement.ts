import { fit, loopStatus, type Fit, type LoopStatus, type Species } from "@modules/sanctuary/domain/fauna";
import type { LoopRole, SanctuaryArea } from "@modules/sanctuary/domain/area";

/** An area of the sanctuary as it is now: built or not, and who lives there (species ids). */
export interface AreaNow {
  readonly area: SanctuaryArea;
  readonly built: boolean;
  readonly residents: readonly string[];
}

/** How a species would do in one area. */
export interface AreaVerdict {
  readonly areaId: string;
  readonly areaName: string;
  readonly built: boolean;
  readonly fit: Fit;
  /** The area's loop with the newcomer in it. */
  readonly loop: LoopStatus;
  /** The loop is closed after, or the newcomer fills a role that was missing. */
  readonly loopOk: boolean;
}

export interface Placement {
  /** The area it would go to (built, it fits, the loop allows it), if any. */
  readonly area?: SanctuaryArea;
  readonly verdicts: readonly AreaVerdict[];
}

const withResidents = (a: AreaNow, more: readonly string[]): SanctuaryArea => ({ ...a.area, residents: [...a.residents, ...more] });

/**
 * Where a newcomer can live (docs/design/catalogo-especies.md, «Adoptar»): the first built area where it fits
 * (`fit()`, the sanctuary's rules for habitat, water, salt, gravity, light, pressure and temperature) and the
 * loop allows it (`loopStatus()`): after it arrives the area's loop is closed, or the newcomer fills one of
 * the missing roles. A second consumer in a tank with no decomposers is turned down: its ammonia would have
 * nowhere to go (the C.E.B.A.S. lesson: hornwort, animals and filter bacteria together).
 */
export function placeFor(species: Species, areas: readonly AreaNow[], catalog: readonly Species[]): Placement {
  const verdicts = areas.map((a): AreaVerdict => {
    const before = loopStatus(withResidents(a, []), catalog);
    const loop = loopStatus(withResidents(a, [species.id]), catalog);
    const fills = before.missing.includes(species.role);
    return { areaId: a.area.id, areaName: a.area.name, built: a.built, fit: fit(species, a.area), loop, loopOk: loop.closed || fills };
  });
  const ok = verdicts.find((v) => v.built && v.fit.ok && v.loopOk);
  return { ...(ok ? { area: areas.find((a) => a.area.id === ok.areaId)!.area } : {}), verdicts };
}

/** Why a fit fails, in Spanish for the card. */
export const FIT_REASON_TEXT: Readonly<Record<Fit["reasons"][number], string>> = {
  habitat: "no es su medio",
  "sin-agua": "no hay agua",
  "poca-agua": "poca agua",
  "ingravidez-a-oscuras": "en ingravidez y a oscuras no se orienta",
  "no-funciona-en-ingravidez": "no se vale en ingravidez",
  "ingravidez-sin-orientacion": "sin vista no se orienta en ingravidez",
  "sin-datos-en-ingravidez": "sin datos en ingravidez",
  "necesita-luz": "necesita luz",
  "falta-presion": "le falta presión",
  salinidad: "salinidad distinta",
  temperatura: "temperatura fuera de su rango",
};

export const ROLE_SHORT: Readonly<Record<LoopRole, string>> = { productor: "un productor", consumidor: "un consumidor", descomponedor: "un descomponedor" };
