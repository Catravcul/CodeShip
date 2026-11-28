/**
 * HOW THE TREE-BUILDINGS ARE ORGANISED, AND THE RULES THAT REORGANISE THEM (Berón 2026-11-24: «debemos tener reglas
 * que permitan este tipo de cambios que reorganizan a los edificios y pisos, quizás por cálculos? Los pisos deberían
 * tener marcas que nos digan si eran mixtos o puros, los edificios-árbol nos deberían decir a qué categoría pertenecen
 * y su cantidad de pisos… quizás deberíamos usar tags?»). Pure.
 *
 * Tags: every floor carries its components (what shares it, each with its category and the share of the floor it
 * needs: 1 = a whole floor); a floor is «pura» with one component and «mixta» with more. A building's category is its
 * floors' most common one. The rules (`revisar`) read those tags and say what should change:
 *
 * 1. **Dónde cabe un componente** (`ubicar`): a share ≤ 1 fits a floor; ≤ 1 + RING_SHARE, a floor with its ring (like the
 *    restaurant); more goes to the tree's crown, a giant floor on top (≤ CROWN_SHARE), then the crown with its ring;
 *    more than that is split over floors.
 * 2. **Piso mixto desbordado**: when one component of a mixed floor needs the whole floor or more, the others look for a
 *    floor of their category with room (or the emptiest floor), so none stays on a half-empty floor.
 * 3. **Edificio solo con cima**: a building left with nothing but its crown hands the crown to the building with the
 *    fewest floors whose crown is free, and disappears (one tree less, shorter trips).
 * 4. **Edificios desequilibrados**: a building with less than half the floors of the fullest one is flagged, so its
 *    floors can be merged into others or others' floors moved to it.
 */

export type Categoria = "servicios" | "entrenamiento" | "ciencias" | "produccion" | "campos" | "vivienda";

/** A component of a floor: what it is, its category and the share of a floor it needs (1 = the whole floor). */
export interface Componente {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: Categoria;
  readonly cuota: number;
}

export interface PisoTag {
  /** The floor plan (furnish id). */
  readonly id: string;
  readonly componentes: readonly Componente[];
}

export interface EdificioTag {
  readonly id: string;
  readonly nombre: string;
  readonly pisos: readonly PisoTag[];
  /** The giant floor on its crown, if any. */
  readonly cima?: PisoTag;
}

/** A floor's ring adds this share of a floor (Levels.cs RingDeck on a 40 m floor: ~1 430 m² against 1 600). */
export const RING_SHARE = 0.9;
/** The crown's giant floor: up to 120 × 120 m on a 40 m tree (9 floors). */
export const CROWN_SHARE = 9;

export const tipoDePiso = (p: PisoTag): "pura" | "mixta" => (p.componentes.length > 1 ? "mixta" : "pura");
export const ocupacion = (p: PisoTag): number => p.componentes.reduce((s, c) => s + c.cuota, 0);

/** A building's category: its floors' (and crown's) most common one, by share. */
export function categoria(e: EdificioTag): Categoria | undefined {
  const by = new Map<Categoria, number>();
  for (const p of [...e.pisos, ...(e.cima ? [e.cima] : [])]) for (const c of p.componentes) by.set(c.categoria, (by.get(c.categoria) ?? 0) + c.cuota);
  let best: Categoria | undefined;
  let n = -1;
  for (const [c, v] of by) if (v > n) [best, n] = [c, v];
  return best;
}

export type Ubicacion = { readonly en: "piso" } | { readonly en: "piso+anillo" } | { readonly en: "cima" } | { readonly en: "cima+anillo" } | { readonly en: "repartir"; readonly pisos: number };

/** Rule 1: where a component of this share fits. */
export function ubicar(cuota: number): Ubicacion {
  if (cuota <= 1) return { en: "piso" };
  if (cuota <= 1 + RING_SHARE) return { en: "piso+anillo" };
  if (cuota <= CROWN_SHARE) return { en: "cima" };
  if (cuota <= CROWN_SHARE + RING_SHARE * 2.5) return { en: "cima+anillo" };
  return { en: "repartir", pisos: Math.ceil(cuota / (1 + RING_SHARE)) };
}

export type Hallazgo =
  | { readonly regla: "cima"; readonly componente: string; readonly edificio: string; readonly ubicacion: Ubicacion }
  | { readonly regla: "desbordado"; readonly piso: string; readonly crece: string; readonly mover: string; readonly a: string }
  | { readonly regla: "solo-cima"; readonly edificio: string; readonly a: string }
  | { readonly regla: "desequilibrio"; readonly edificio: string; readonly pisos: number; readonly maximo: number };

/** All the rules over a set of buildings: what they find. */
export function revisar(edificios: readonly EdificioTag[]): Hallazgo[] {
  const out: Hallazgo[] = [];
  const all = edificios.flatMap((e) => e.pisos.map((p) => ({ e, p })));
  for (const e of edificios)
    for (const p of e.pisos) {
      // Rule 1: a component that does not fit its floor.
      for (const c of p.componentes) {
        const u = ubicar(c.cuota);
        if (u.en !== "piso" && u.en !== "piso+anillo") out.push({ regla: "cima", componente: c.id, edificio: e.id, ubicacion: u });
      }
      // Rule 2: a mixed floor overflowed by one of its components.
      if (tipoDePiso(p) === "mixta" && ocupacion(p) > 1) {
        const crece = [...p.componentes].sort((a, b) => b.cuota - a.cuota)[0]!;
        for (const c of p.componentes) {
          if (c === crece) continue;
          const dest = all
            .filter((q) => q.p !== p && ocupacion(q.p) + c.cuota <= 1)
            .sort((a, b) => Number(b.p.componentes.some((k) => k.categoria === c.categoria)) - Number(a.p.componentes.some((k) => k.categoria === c.categoria)) || ocupacion(a.p) - ocupacion(b.p))[0];
          out.push({ regla: "desbordado", piso: p.id, crece: crece.id, mover: c.id, a: dest ? dest.p.id : "piso nuevo" });
        }
      }
    }
  // Rule 3: a building with nothing but its crown.
  for (const e of edificios)
    if (e.cima && e.pisos.length === 0) {
      const to = edificios.filter((q) => q !== e && !q.cima && q.pisos.length > 0).sort((a, b) => a.pisos.length - b.pisos.length)[0];
      if (to) out.push({ regla: "solo-cima", edificio: e.id, a: to.id });
    }
  // Rule 4: buildings with less than half the floors of the fullest.
  const max = Math.max(...edificios.map((e) => e.pisos.length));
  for (const e of edificios) if (e.pisos.length > 0 && e.pisos.length < max / 2) out.push({ regla: "desequilibrio", edificio: e.id, pisos: e.pisos.length, maximo: max });
  return out;
}

/**
 * Applies the rules until nothing more moves: components too big for a floor go up to their building's crown (their
 * floors emptied), a building left with only its crown hands it over and disappears. Returns the new buildings and
 * what was done, in order.
 */
export function reorganizar(edificios: readonly EdificioTag[]): { edificios: EdificioTag[]; hecho: string[] } {
  let es: EdificioTag[] = edificios.map((e) => ({ ...e, pisos: [...e.pisos] }));
  const hecho: string[] = [];
  for (let guard = 0; guard < 20; guard++) {
    const h = revisar(es);
    const up = h.find((x): x is Extract<Hallazgo, { regla: "cima" }> => x.regla === "cima" && (x.ubicacion.en === "cima" || x.ubicacion.en === "cima+anillo") && !es.find((e) => e.id === x.edificio)?.cima);
    if (up) {
      es = es.map((e) => {
        if (e.id !== up.edificio || e.cima) return e;
        // All the floors whose only components are the growing one's kind go up with it (its rooms and its plaza).
        const comp = e.pisos.flatMap((p) => p.componentes).find((c) => c.id === up.componente)!;
        const same = e.pisos.filter((p) => p.componentes.every((c) => c.categoria === comp.categoria));
        const cima: PisoTag = { id: `${comp.id}-cima`, componentes: [{ ...comp, cuota: comp.cuota }] };
        hecho.push(`«${comp.nombre}» no cabe en un piso (cuota ${comp.cuota.toFixed(1)}): pasa a la cima de ${e.nombre}${up.ubicacion.en === "cima+anillo" ? " con anillo" : ""}, con ${same.length} piso(s) de su categoría`);
        return { ...e, pisos: e.pisos.filter((p) => !same.includes(p)), cima };
      });
      continue;
    }
    const only = h.find((x): x is Extract<Hallazgo, { regla: "solo-cima" }> => x.regla === "solo-cima");
    if (only) {
      const from = es.find((e) => e.id === only.edificio)!;
      hecho.push(`${from.nombre} se queda solo con su cima: la cima pasa a ${es.find((e) => e.id === only.a)!.nombre}, el edificio con menos pisos, y ${from.nombre} desaparece`);
      es = es.filter((e) => e !== from).map((e) => (e.id === only.a ? { ...e, cima: from.cima } : e));
      continue;
    }
    break;
  }
  return { edificios: es, hecho };
}
