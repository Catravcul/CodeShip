import type { Category, ModelDef } from "./catalog";

/**
 * CAMBIOS A GRAN ESCALA (docs/design/santuario1.md §Cambios a gran escala). One place to change many things at once
 * without touching the floors one by one: a rule for a whole category, a group, a model, a building, a floor or the
 * people. The most specific rule wins field by field: category < group < model < building < floor (a floor rule
 * may also name a model, `piso["entrenamiento:piso-1"].modelos["gym-jalon"]`).
 *
 * Examples (Berón's lists of fixes go here):
 *   categoria: { animal: { escala: 1.2 } }                    every animal 20 % bigger
 *   grupo: { "gimnasio-placas": { color: 0x335577 } }          every plate machine recoloured
 *   modelo: { "gym-toallas": { oculto: true } }                no towels anywhere
 *   modelo: { "gym-smith": { cambiarPor: "gym-jaula" } }       every Smith becomes a power rack
 *   edificio: { entrenamiento: { separacion: 1.2 } }           furniture of every floor of the building 20 % apart
 *   piso: { "servicios:piso-1": { separacion: 0.9 } }          only the restaurant
 *   personas: { todas: { altura: 1.05 }, nombres: { Kushal: { ropa: 0x884422 } } }
 */
export interface Override {
  /** Not drawn and not solid. */
  readonly oculto?: boolean;
  readonly color?: number;
  /** Uniform scale of the model (its walk solid too). */
  readonly escala?: number;
  /** Another catalogue model in its place (same position and turn). */
  readonly cambiarPor?: string;
  /** Multiplies the distances on the floor's plan from its centre (building or floor rules). */
  readonly separacion?: number;
}

export interface PersonOverride {
  readonly oculto?: boolean;
  /** Height factor of the figure. */
  readonly altura?: number;
  readonly piel?: number;
  readonly ropa?: number;
}

export interface Overrides {
  readonly categoria: Partial<Record<Category, Override>>;
  readonly grupo: Readonly<Record<string, Override>>;
  readonly modelo: Readonly<Record<string, Override>>;
  readonly edificio: Readonly<Record<string, Override & { readonly modelos?: Readonly<Record<string, Override>> }>>;
  readonly piso: Readonly<Record<string, Override & { readonly modelos?: Readonly<Record<string, Override>> }>>;
  readonly personas: { readonly todas?: PersonOverride; readonly nombres?: Readonly<Record<string, PersonOverride>> };
}

/** The rules in force. Empty: everything as Cold Sanctuary builds it. */
export const OVERRIDES: Overrides = {
  categoria: {},
  grupo: {},
  modelo: {},
  edificio: {},
  piso: {},
  personas: {},
};

/** The rule for one model on one floor (`piso` = area id «tower:piso-n», `edificio` = tower id), merged field by field. */
export function resolve(d: ModelDef, where: { edificio?: string; piso?: string } = {}, o: Overrides = OVERRIDES): Override {
  const b = where.edificio ? o.edificio[where.edificio] : undefined;
  const f = where.piso ? o.piso[where.piso] : undefined;
  const layers = [o.categoria[d.category], o.grupo[d.group], o.modelo[d.id], b, b?.modelos?.[d.id], f, f?.modelos?.[d.id]];
  const r: { -readonly [K in keyof Override]: Override[K] } = {};
  for (const l of layers) {
    if (!l) continue;
    if (l.oculto !== undefined) r.oculto = l.oculto;
    if (l.color !== undefined) r.color = l.color;
    if (l.escala !== undefined) r.escala = l.escala;
    if (l.cambiarPor !== undefined) r.cambiarPor = l.cambiarPor;
  }
  return r;
}

/** The plan spacing of a floor: its building's rule times its own. */
export function spacing(where: { edificio?: string; piso?: string }, o: Overrides = OVERRIDES): number {
  return (where.edificio ? o.edificio[where.edificio]?.separacion ?? 1 : 1) * (where.piso ? o.piso[where.piso]?.separacion ?? 1 : 1);
}

/** The rule for one person. */
export function personRule(name: string | undefined, o: Overrides = OVERRIDES): PersonOverride {
  return { ...o.personas.todas, ...(name ? o.personas.nombres?.[name] : undefined) };
}
