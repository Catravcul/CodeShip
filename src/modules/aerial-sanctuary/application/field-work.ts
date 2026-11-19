import { procedureReto, type Reto } from "@modules/sanctuary-one/application/challenges";
import type { StepAct } from "@modules/chores/domain/step-visual";
import { CROWDS } from "../data/bioma-crowd";
import { FIELD, FIELD_GESTURES } from "../data/bioma-retos";
import { crowdCounts } from "../domain/bioma-crowd";
import type { BiomeState } from "../domain/bioma";

/**
 * THE FIELD WORK AT THE RESEARCH HUT (docs/design/bioma-s3.md §La estación): sanctuary 1's procedures-as-challenges
 * (sanctuary-one/application/challenges.ts `procedureReto`) on the island's own jobs. Each is open only in its real
 * season: the nests are counted while the gentoos sit on them (CEMP A3), the albatross chicks are ringed while they
 * are on the nest; the count asks for the colony's real total, the chain's crowd.
 */
export interface FieldJob {
  readonly reto: Reto;
  /** Open now; else why not («Sin nidos ocupados: …»). */
  readonly open: boolean;
  readonly why?: string;
  /** The nest count's right total (the colony's occupied nests when the job was set). */
  readonly total?: number;
}

const POOL = [...FIELD.nidos.steps, ...FIELD.anillar.steps].filter((s) => !s.includes("{"));
const crowd = (id: string) => CROWDS.find((c) => c.species === id)!;

/** The jobs of the hut now, with the colony's nest count in the count's last step. */
export function fieldJobs(st: BiomeState): FieldJob[] {
  const gentoo = crowdCounts(st, crowd("papua"));
  const albatross = crowdCounts(st, crowd("albatros"));
  const n = gentoo.nests;
  const wrong = [Math.max(1, Math.round(n / 2)), n * 2 + 7].filter((v) => v !== n);
  const nidos = { ...FIELD.nidos, steps: FIELD.nidos.steps.map((s) => s.replace("{NIDOS}", `{${n}|${wrong.join("|")}}`)) };
  const countOpen = (gentoo.phase === "huevos" || gentoo.phase === "pollos") && n > 0;
  const ringOpen = albatross.phase === "pollos" && albatross.young > 0;
  return [
    { reto: procedureReto(nidos, undefined, POOL), open: countOpen, total: n, ...(countOpen ? {} : { why: "Sin nidos ocupados ahora: se cuentan en la incubación (noviembre a enero en la colonia)" }) },
    { reto: procedureReto(FIELD.anillar, undefined, POOL), open: ringOpen, ...(ringOpen ? {} : { why: "Ningún pollo de albatros en su nido ahora: nacen en marzo y se anillan antes de volar" }) },
  ];
}

/** What she does at step `i` of a field job, at the hut's table (the ships' step player). */
export function fieldAct(procedure: string, i: number): StepAct[] {
  const a = FIELD_GESTURES[procedure]?.[i];
  return a ? [{ action: a, place: "objetivo" }] : [];
}
