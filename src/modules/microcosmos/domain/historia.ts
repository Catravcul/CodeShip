/**
 * A microcosm's story, step by step (Cold Sanctuary's MicroStory, docs/microcosmos-musk-historia.md, with CodeShip's
 * pattern: each mission is solved by a challenge). A step is done by going to its place, and if it has a challenge, by
 * solving it there; a failed challenge leaves the step open to try again. Pure: the scene only reports what happened.
 */

export interface PasoHistoria {
  readonly id: string;
  /** What to do, in one line (shown as the current mission). */
  readonly text: string;
  /** The place (layout id) where it happens. */
  readonly at: string;
  /** The challenge solved there (a procedure id), if the step has one. */
  readonly reto?: string;
  /** Who is there for it (a person id of the roster), if anyone. */
  readonly with?: string;
}

export interface EstadoHistoria {
  /** The step now (steps.length when the story is over). */
  readonly step: number;
  /** She is at the current step's place. */
  readonly there: boolean;
}

export const START: EstadoHistoria = { step: 0, there: false };

export type Suceso = { readonly kind: "llega"; readonly at: string } | { readonly kind: "sale"; readonly at: string } | { readonly kind: "reto"; readonly id: string; readonly ok: boolean };

/** The state after something happened. */
export function avanzar(steps: readonly PasoHistoria[], s: EstadoHistoria, e: Suceso): EstadoHistoria {
  const cur = steps[s.step];
  if (!cur) return s;
  if (e.kind === "llega") {
    if (e.at !== cur.at) return s;
    // A step with no challenge is done by being there.
    return cur.reto ? { ...s, there: true } : { step: s.step + 1, there: false };
  }
  if (e.kind === "sale") return e.at === cur.at ? { ...s, there: false } : s;
  if (!cur.reto || e.id !== cur.reto || !s.there || !e.ok) return s;
  return { step: s.step + 1, there: false };
}

/** The story is over. */
export const acabada = (steps: readonly PasoHistoria[], s: EstadoHistoria) => s.step >= steps.length;

/** «Paso 3 de 8: …» for the mission line. */
export function linea(steps: readonly PasoHistoria[], s: EstadoHistoria): string {
  const cur = steps[s.step];
  return cur ? `Paso ${s.step + 1} de ${steps.length}: ${cur.text}` : "Historia completa: el día en la Academia ha terminado";
}
