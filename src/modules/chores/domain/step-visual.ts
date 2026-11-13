import type { Exercise } from "@modules/mind-duel/domain/exercise";

/**
 * Step visuals: a challenge step answered right shows what it does, right away (designer: «cada reto debe
 * mostrar el paso correcto ocurriendo»; docs/design/vida-a-bordo.md, «Pasos visibles»).
 *
 * One port for every challenge sheet (chores on board, trips, landings…): `StepVisual`. The sheet calls
 * `stepDone(i)` after step i is solved and `clear()` when it closes; how it looks is up to the adapter
 * (the habitat acts chores out with Doménica and pooled props, the flight view draws trip and landing plans).
 *
 * For areas that act steps out with a figure, a source turns each solved step into `StepAct`s from a small
 * shared vocabulary of actions (`StepActSource`, chained with `firstSource`): the domain says *what*
 * happens, the adapter decides *how* it looks.
 */
export interface StepVisual {
  /** Step `index` (0-based, in chain order) was just answered right. */
  stepDone(index: number): void;
  /** «Paso a paso» in an order challenge: block `part` of step `index` was placed right (optional). */
  partDone?(index: number, part: number): void;
  /** The chain was solved: keep the result on screen a little, then clear it. */
  finish(): void;
  /** Closed or failed: remove everything now. */
  clear(): void;
}

/** Kitchen verbs (after Cold Sanctuary's KitchenCook: take, wash, cut, cook, stir, season, plate). */
export type KitchenAction =
  | "tomar"
  | "lavar"
  | "cortar"
  | "cascar"
  | "batir"
  | "remover"
  | "verter"
  | "calentar"
  | "hervir"
  | "hornear"
  | "moler"
  | "amasar"
  | "sazonar"
  | "reposar"
  | "emplatar";

/** Care verbs: plants, animals, sickbay, lab, machines. */
export type CareAction = "regar" | "agitar" | "cosechar" | "servir" | "mimar" | "jugar" | "programar" | "revisar" | "reparar" | "curar" | "postura" | "entrenar";

/**
 * The shared vocabulary. `gesto` is the fallback: a hands-on gesture with no prop.
 * Another area (flight, landing) may extend this union with its own verbs and give them a player.
 */
export type StepAction = KitchenAction | CareAction | "gesto";

export interface StepAct {
  readonly action: StepAction;
  /**
   * Where it happens: `objetivo` is the challenge's own target (the pot, the cat, the machine the camera
   * frames); any other value is a named spot its player knows (the kitchen's `nevera`, `fogon`…).
   */
  readonly place: string;
  /** What it acts on, as a colour key for the props ("huevo", "agua", "hojas"…). */
  readonly tint?: string;
  /** The container it happens in ("sarten", "olla", "bol", "plato", "tarro", "bandeja"…). */
  readonly vessel?: string;
  /** Heat shows (hob or oven glow, steam). */
  readonly heat?: boolean;
}

/**
 * A challenge source turns its solved steps into acts. `index` is the step just solved
 * (0-based, the run's step before the answer). Returns undefined when the source does not know the challenge,
 * so sources can be chained with `firstSource`.
 */
export interface StepActSource<C> {
  acts(challenge: C, index: number): readonly StepAct[] | undefined;
}

/** The first source that knows the challenge answers. */
export function firstSource<C>(...sources: readonly StepActSource<C>[]): StepActSource<C> {
  return {
    acts(c, i) {
      for (const s of sources) {
        const v = s.acts(c, i);
        if (v) return v;
      }
      return undefined;
    },
  };
}

/** Lower case, no accents (ñ → n), braces of a `{right|wrong}` value kept as the right value. */
export const normalizeStep = (text: string): string =>
  text
    .replace(/\{([^}|]*)[^}]*\}/g, "$1")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** Whole-step patterns that win over the leading verb. */
const PHRASES: readonly (readonly [StepAction, RegExp])[] = [
  ["revisar", /^haz (una ecografia|un ciclo|un encendido)/],
  ["calentar", /^cuaja .*(sarten|lado)/],
  ["reparar", /^corta la corriente/],
  ["sazonar", /^(anade|echa) (sal|pimienta|comino)/],
  ["emplatar", /^cubre(las|los)? con /],
  ["amasar", /^prepara la masa/],
];

/** Leading verb (imperative or infinitive, as the data writes them) → action. Order matters. */
const VERBS: readonly (readonly [StepAction, RegExp])[] = [
  ["mimar", /^(habla|dejarle|acarici|pedirle|baja$|lleva$|calma)/],
  ["cascar", /^(casca|rompe)/],
  ["tomar", /^(ve|toma|tomar|saca|sacar|recoge|recoger|mide|medir|coge|pesa|pesar)$/],
  ["regar", /^(regar|riega)$/],
  ["agitar", /^(agit|sujet|repeti)/],
  ["lavar", /^(lav|limpi|enjuag|irrig|remoj|seca|sec[ao]l|vacia|purga)/],
  ["cortar", /^(cort|pica|pela|quita|divid|separ|poda)/],
  ["batir", /^(bate|batir|mezcl|haz$|prepar)/],
  ["remover", /^(revuelv|remuev|cuaja)/],
  ["calentar", /^(calient|cocin|fri|salte|sofri|dora|dale|descongel|cuecel)/],
  ["hervir", /^(hierv|cuec)/],
  ["hornear", /^(tuest|asa|afloj|horne|esteriliz)/],
  ["moler", /^(muel|tritur|ajusta$)/],
  ["amasar", /^(amas|estir|aplast|forma|prens)/],
  ["sazonar", /^(especi|sazon|alin|sal|salala)$/],
  ["sazonar", /^(especi|sazon|alin)/],
  ["reposar", /^(deja|dejalos|dejar|espera|esperar|vigila|reposa)$/],
  ["servir", /^servir/],
  ["emplatar", /^(emplat|sirve|arma|enroll|envas|guard)/],
  ["verter", /^(anad|viert|unta|esparc|cubr|filtr|extiend|ponlos|ponlas|tamiz|llen|siembra|ofrec|corrig)/],
  ["jugar", /^(jug|lanz|pase|ponerle)/],
  ["programar", /^(fija|program|activa|para|reanud|consult|cuando|abrir|cerrar)$/],
  ["revisar", /^(revis|comprob|comprueb|prueb|identific|asegur|cuenta|contar|mira)/],
  ["reparar", /^(desconect|conect|cambi|mont|desmont|atornill|desatasc|enciend|vuelve|despresuriz|suelt|cierr|carga|gira|despliega)/],
  ["curar", /^(ponte|presion|inmoviliz|aplic|da|seda|abre|pon)$/],
];

/** The action a step's text names, from its leading verb; undefined when it names none (a number, code). */
export function classifyStep(text: string): StepAction | undefined {
  const s = normalizeStep(text).replace(/^\d+\.\s*/, "");
  for (const [a, r] of PHRASES) if (r.test(s)) return a;
  const verb = s.split(/[\s,]+/)[0] ?? "";
  for (const [a, r] of VERBS) if (r.test(verb)) return a;
  return undefined;
}

/** The texts a solved exercise acts out: the blocks in their solved order, or the right option. */
export function exerciseTexts(ex: Exercise): string[] {
  if (ex.kind === "order") return ex.solution.map((id) => ex.blocks.find((b) => b.id === id)?.pseudo ?? "");
  return [ex.options[ex.correct] ?? ""];
}

/** The fallback visual: a hands-on gesture at the target. */
export const FALLBACK_ACT: StepAct = { action: "gesto", place: "objetivo" };
