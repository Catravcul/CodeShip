import { procedureReto, type Reto } from "@modules/sanctuary-one/application/challenges";
import type { StepAct } from "@modules/chores/domain/step-visual";
import { CROWDS } from "../data/bioma-crowd";
import { FIELD, FIELD_GESTURES } from "../data/bioma-retos";
import { crowdCounts } from "../domain/bioma-crowd";
import { monthOfDay, type BiomeState } from "../domain/bioma";

/**
 * THE FIELD WORK AT THE RESEARCH HUT (docs/design/bioma-s3.md §La estación): sanctuary 1's procedures-as-challenges
 * (sanctuary-one/application/challenges.ts `procedureReto`) on the island's own jobs, each open only in its real
 * season: the camera traps in winter (January to March, as in Hemis), the double-observer count whenever the ibex are
 * there, the griffons' nests while they are sat or have a chick. Each asks for the island's real total: the chain's
 * leopards, the ibex its crowd draws, the griffons' occupied nests.
 */
export interface FieldJob {
  readonly reto: Reto;
  /** Open now; else why not. */
  readonly open: boolean;
  readonly why?: string;
  /** The job's right total (when it was set). */
  readonly total?: number;
}

const POOL = [...FIELD.camaras.steps, ...FIELD.doble.steps, ...FIELD.buitres.steps].filter((s) => !s.includes("{"));
const crowd = (id: string) => CROWDS.find((c) => c.species === id)!;
/** The right total and two wrong ones, as a step's choice. */
const choice = (n: number) => `{${n}|${[Math.max(1, Math.round(n / 2)) === n ? n + 3 : Math.max(1, Math.round(n / 2)), n * 2 + 7].join("|")}}`;
const fill = <P extends { readonly steps: readonly string[] }>(p: P, key: string, n: number): P => ({ ...p, steps: p.steps.map((s) => s.replace(`{${key}}`, choice(n))) });

/** The jobs of the hut now, with the island's totals in their last steps. */
export function fieldJobs(st: BiomeState): FieldJob[] {
  const month = monthOfDay(st.day, st.def.startDayOfYear);
  const leopards = st.animals.filter((a) => a.species === "leopardo" && !a.dead).length;
  const ibex = crowdCounts(st, crowd("ibice"));
  const griffons = crowdCounts(st, crowd("buitre"));
  const ibexN = ibex.adults + ibex.young;
  const camOpen = month >= 1 && month <= 3 && leopards > 0;
  const countOpen = ibexN > 0;
  const nestOpen = (griffons.phase === "huevos" || griffons.phase === "pollos") && griffons.nests > 0;
  return [
    { reto: procedureReto(fill(FIELD.camaras, "LEOPARDOS", leopards), undefined, POOL), open: camOpen, total: leopards, ...(camOpen ? {} : { why: "Las cámaras se revisan en invierno, de enero a marzo, cuando los leopardos bajan por las crestas" }) },
    { reto: procedureReto(fill(FIELD.doble, "IBICES", ibexN), undefined, POOL), open: countOpen, total: ibexN, ...(countOpen ? {} : { why: "No hay íbices que contar ahora" }) },
    { reto: procedureReto(fill(FIELD.buitres, "NIDOS", griffons.nests), undefined, POOL), open: nestOpen, total: griffons.nests, ...(nestOpen ? {} : { why: "Sin nidos ocupados ahora: los buitres ponen de finales de diciembre a marzo" }) },
  ];
}

/** What she does at step `i` of a field job, at the hut's table (the ships' step player). */
export function fieldAct(procedure: string, i: number): StepAct[] {
  const a = FIELD_GESTURES[procedure]?.[i];
  return a ? [{ action: a, place: "objetivo" }] : [];
}
