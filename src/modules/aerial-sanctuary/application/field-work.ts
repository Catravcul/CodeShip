import { procedureReto, type Reto } from "@modules/sanctuary-one/application/challenges";
import type { StepAct } from "@modules/chores/domain/step-visual";
import { CROWDS } from "../data/bioma-crowd";
import { FIELD, FIELD_GESTURES } from "../data/bioma-retos";
import { crowdCounts } from "../domain/bioma-crowd";
import { monthOfDay, stageOfIndividual, type BiomeState } from "../domain/bioma";

/**
 * THE FIELD WORK AT THE RESEARCH HUT (docs/design/bioma-s3.md §La estación): sanctuary 1's procedures-as-challenges
 * (sanctuary-one/application/challenges.ts `procedureReto`) on the island's own jobs, each open only in its real
 * season: the hives while the colonies fly (not in their winter cluster), the butterfly transect while the Apollos fly
 * (summer), the pitfall traps while the beetles walk. Each asks for the island's real total: the hives of the
 * honeybees' colonies, the Apollo adults of the chain, its beetles.
 */
export interface FieldJob {
  readonly reto: Reto;
  /** Open now; else why not. */
  readonly open: boolean;
  readonly why?: string;
  /** The job's right total (when it was set). */
  readonly total?: number;
}

const POOL = [...FIELD.colmenas.steps, ...FIELD.mariposas.steps, ...FIELD.trampas.steps].filter((s) => !s.includes("{"));
const crowd = (id: string) => CROWDS.find((c) => c.species === id)!;
/** The right total and two wrong ones, as a step's choice. */
const choice = (n: number) => `{${n}|${[Math.max(1, Math.round(n / 2)) === n ? n + 3 : Math.max(1, Math.round(n / 2)), n * 2 + 7].join("|")}}`;
const fill = <P extends { readonly steps: readonly string[] }>(p: P, key: string, n: number): P => ({ ...p, steps: p.steps.map((s) => s.replace(`{${key}}`, choice(n))) });

/** The jobs of the hut now, with the island's totals in their last steps. */
export function fieldJobs(st: BiomeState): FieldJob[] {
  const hives = crowdCounts(st, crowd("abeja"));
  const grown = (sp: string) => st.animals.filter((a) => a.species === sp && !a.dead && ["adulto", "anciano"].includes(stageOfIndividual(a))).length;
  const apollos = grown("mariposa");
  const month = monthOfDay(st.day, st.def.startDayOfYear);
  const beetles = month >= 4 && month <= 10 ? grown("carronero") + grown("pelotero") : 0;
  const hiveOpen = !hives.asleep && hives.nests > 0;
  const walkOpen = apollos > 0 && month >= 6 && month <= 8;
  const trapOpen = beetles > 0;
  return [
    { reto: procedureReto(fill(FIELD.colmenas, "COLMENAS", hives.nests), undefined, POOL), open: hiveOpen, total: hives.nests, ...(hiveOpen ? {} : { why: "En diciembre y enero las colonias se apiñan dentro: no se abren" }) },
    { reto: procedureReto(fill(FIELD.mariposas, "APOLOS", apollos), undefined, POOL), open: walkOpen, total: apollos, ...(walkOpen ? {} : { why: "Las apolo vuelan en verano, de junio a agosto: ahora son huevos, orugas o crisálidas" }) },
    { reto: procedureReto(fill(FIELD.trampas, "ESCARABAJOS", beetles), undefined, POOL), open: trapOpen, total: beetles, ...(trapOpen ? {} : { why: "Los escarabajos pasan el invierno bajo tierra: las trampas se ponen de abril a octubre" }) },
  ];
}

/** What she does at step `i` of a field job, at the hut's table (the ships' step player). */
export function fieldAct(procedure: string, i: number): StepAct[] {
  const a = FIELD_GESTURES[procedure]?.[i];
  return a ? [{ action: a, place: "objetivo" }] : [];
}
