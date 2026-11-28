/**
 * The insect-humans' days and lives in a microcosm (Berón 2026-11-23: «los insectos humanos realizan sus días y su
 * ciclo de vida»). Pure: who is where at what hour, and how old each is now.
 *
 * - The day: each part of the day has an activity and the place it happens at, by role (docs/design/microcosmos.md).
 * - The life: the named people of the story keep their real age (it is one day of their history); the others live at
 *   the insects' pace, `YEARS_PER_HOUR` years for each hour of the microcosm's clock (ficción), and when one dies a
 *   child of the same family is born in their place, so the place never empties.
 */

/** What someone does in a part of the day. */
export type Quehacer = "dormir" | "llegar" | "lavarse" | "entrenar" | "aprender" | "ensenar" | "comer" | "pasear" | "estudiar" | "trabajar" | "correr" | "volver" | "cenar" | "cuidar";

/** Who someone is in the place (their day follows it). */
export type Papel = "bebe" | "maestro" | "discipulo" | "joven" | "nino" | "entrenador" | "jardinero" | "casa" | "carretero" | "anciano";

/** A block of the day: from this hour, this, at this place (a place id of the layout). */
export interface Tramo {
  readonly from: number;
  readonly what: Quehacer;
  readonly at: string;
}

/**
 * The day of each role (summer, 360 a. C.; data/academia.ts gives the places). Morning exercise and lessons, the main
 * meal at midday, walks and study in the afternoon, the evening run and the way home before dark. Sources: Diogenes
 * Laertius III–IV (the school's day in the gymnasium and the garden); Plutarch, Cimon 13.8 (the walks and the tracks);
 * the hours themselves are «supuesto».
 */
export const JORNADA: Readonly<Record<Papel, readonly Tramo[]>> = {
  // Babies stay at home in the city (they are not seen in the Academy).
  bebe: [{ from: 0, what: "dormir", at: "ciudad" }],
  maestro: [
    { from: 0, what: "dormir", at: "casa-dormitorio" },
    { from: 6, what: "lavarse", at: "fuente" },
    { from: 7, what: "ensenar", at: "exedra" },
    { from: 11, what: "comer", at: "casa-andron" },
    { from: 13, what: "pasear", at: "paseo-platanos" },
    { from: 16, what: "estudiar", at: "museo" },
    { from: 19, what: "cenar", at: "casa-andron" },
    { from: 22, what: "dormir", at: "casa-dormitorio" },
  ],
  discipulo: [
    { from: 0, what: "dormir", at: "chozas" },
    { from: 6, what: "lavarse", at: "fuente" },
    { from: 6.5, what: "entrenar", at: "palestra-patio" },
    { from: 8, what: "aprender", at: "exedra" },
    { from: 11, what: "comer", at: "casa-andron" },
    { from: 13, what: "pasear", at: "paseo-platanos" },
    { from: 15, what: "estudiar", at: "museo" },
    { from: 17.5, what: "correr", at: "pista" },
    { from: 19, what: "cenar", at: "casa-andron" },
    { from: 21.5, what: "dormir", at: "chozas" },
  ],
  joven: [
    { from: 0, what: "dormir", at: "ciudad" },
    { from: 6, what: "llegar", at: "puerta" },
    { from: 6.5, what: "entrenar", at: "palestra-patio" },
    { from: 9, what: "lavarse", at: "palestra-banos" },
    { from: 10, what: "pasear", at: "paseo-platanos" },
    { from: 12, what: "volver", at: "ciudad" },
    { from: 16, what: "llegar", at: "puerta" },
    { from: 16.5, what: "correr", at: "pista" },
    { from: 19, what: "volver", at: "ciudad" },
  ],
  nino: [
    { from: 0, what: "dormir", at: "ciudad" },
    { from: 7, what: "llegar", at: "puerta" },
    { from: 7.5, what: "entrenar", at: "palestra-patio" },
    { from: 10, what: "volver", at: "ciudad" },
  ],
  entrenador: [
    { from: 0, what: "dormir", at: "ciudad" },
    { from: 5.5, what: "llegar", at: "puerta" },
    { from: 6, what: "trabajar", at: "palestra-patio" },
    { from: 12, what: "comer", at: "palestra-aceite" },
    { from: 13, what: "trabajar", at: "palestra-patio" },
    { from: 16, what: "trabajar", at: "pista" },
    { from: 19.5, what: "volver", at: "ciudad" },
  ],
  jardinero: [
    { from: 0, what: "dormir", at: "ciudad" },
    { from: 5, what: "llegar", at: "puerta" },
    { from: 5.5, what: "cuidar", at: "olivar" },
    { from: 10, what: "cuidar", at: "acequia" },
    { from: 12, what: "comer", at: "olivar" },
    { from: 14, what: "cuidar", at: "huerto" },
    { from: 18, what: "volver", at: "ciudad" },
  ],
  casa: [
    { from: 0, what: "dormir", at: "casa-dormitorio" },
    { from: 5, what: "trabajar", at: "casa-cocina" },
    { from: 7, what: "trabajar", at: "fuente" },
    { from: 8, what: "trabajar", at: "casa-cocina" },
    { from: 14, what: "cuidar", at: "huerto" },
    { from: 17, what: "trabajar", at: "casa-cocina" },
    { from: 22, what: "dormir", at: "casa-dormitorio" },
  ],
  carretero: [
    { from: 0, what: "dormir", at: "ciudad" },
    { from: 5, what: "trabajar", at: "dromos" },
    { from: 20, what: "volver", at: "ciudad" },
  ],
  anciano: [
    { from: 0, what: "dormir", at: "ciudad" },
    { from: 8, what: "llegar", at: "puerta" },
    { from: 8.5, what: "pasear", at: "paseo-platanos" },
    { from: 11, what: "aprender", at: "exedra" },
    { from: 12, what: "volver", at: "ciudad" },
  ],
};

/** What a role does at an hour (0–24) and where. */
export function tramoAt(papel: Papel, hour: number): Tramo {
  const day = JORNADA[papel];
  const h = ((hour % 24) + 24) % 24;
  let now = day[0]!;
  for (const t of day) if (t.from <= h) now = t;
  return now;
}

/** Years of an insect-human's life for each hour of the microcosm's clock (the insects' pace: ficción). */
export const YEARS_PER_HOUR = 1;

/** The stages of a life, and the role each stage takes in the place. */
export type Etapa = "bebe" | "nino" | "joven" | "adulto" | "anciano";

export function etapa(age: number): Etapa {
  if (age < 6) return "bebe";
  if (age < 14) return "nino";
  if (age < 20) return "joven";
  if (age < 60) return "adulto";
  return "anciano";
}

/** Someone who lives at the insects' pace: a family name, when they were born (in microcosm hours) and their span. */
export interface Vida {
  readonly family: string;
  /** Their number in the family's line (1 the first, 2 their child…). */
  readonly gen: number;
  /** Born at this microcosm hour (negative: before the visit began). */
  readonly bornH: number;
  /** Years they will live. */
  readonly span: number;
}

/** A deterministic span from 55 to 85 years (the ancient Greeks who reached adulthood: Golden 2015, «supuesto»). */
export function spanOf(family: string, gen: number): number {
  let h = 2166136261;
  for (const c of `${family}:${gen}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return 55 + ((h >>> 0) % 31);
}

/** Their age now (years). */
export const ageAt = (v: Vida, hour: number) => (hour - v.bornH) * YEARS_PER_HOUR;

/**
 * Who lives in that family's line at `hour`: the one alive now (each dies at their span and their child is born then).
 * The figure stays one per line: the place keeps its people as the generations pass.
 */
export function lineAt(first: Vida, hour: number): Vida {
  let v = first;
  // Bounded: a visit of years of microcosm time is still only a few hundred generations.
  for (let i = 0; i < 1000 && ageAt(v, hour) >= v.span; i++) {
    const gen = v.gen + 1;
    v = { family: v.family, gen, bornH: v.bornH + v.span / YEARS_PER_HOUR, span: spanOf(v.family, gen) };
  }
  return v;
}

/** The role of a generic person by their age (the named ones keep theirs). */
export function papelPorEdad(age: number, adulto: Papel): Papel {
  const e = etapa(age);
  if (e === "bebe") return "bebe";
  if (e === "nino") return "nino";
  if (e === "joven") return "joven";
  if (e === "anciano") return "anciano";
  return adulto;
}

/** Their size (a child is smaller): 1 for a grown-up. */
export function tallaPorEdad(age: number): number {
  if (age >= 16) return 1;
  return 0.45 + (0.55 * Math.max(0, age)) / 16;
}
