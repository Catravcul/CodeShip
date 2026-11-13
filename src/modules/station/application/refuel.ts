import type { Sourced } from "@core/units";
import { ChoreRun, type Chore } from "@modules/chores/domain/chore";
import { stepChain, stepPool, toCall } from "@modules/chores/application/catalog";
import type { ChoiceExercise, CodeBlock, Exercise } from "@modules/mind-duel/domain/exercise";
import type { Propellant } from "@modules/ship/domain/components";
import type { Ship } from "@modules/ship/domain/ship";
import { HELIUM_KG_M3, MMH_DENSITY, MMH_NTO_MIXTURE_RATIO, NTO_DENSITY, PROPELLANT_NAME, REGULATED_BAR } from "@modules/ship/data/propellants";
import type { Mothership } from "@modules/mothership/domain/mothership";
import type { Amounts } from "../domain/materials";
import { planRefuel, planTakes, transferHours, type LinePlan, type PropellantLine } from "../domain/refuel";
import type { Job, Station } from "../domain/station";
import { SRC } from "../data/sources";
import { fmtKg } from "./challenges";
import { StationSession } from "./station-ops";

/** Flow of the refuelling line, kg per game hour. Game values (the real precedent is in the doc). */
export const REFUEL_TUNING = {
  probeKgPerHour: { value: 60, source: SRC.tianzhouRefuel, note: "Valor de juego: los 438 kg del par en ~7 h. Tianzhou 1 tardó unos cinco días en su primer trasvase en órbita" },
  xenonKgPerHour: { value: 2500, source: SRC.tianzhouRefuel, note: "Valor de juego: 150 t de xenón en 60 h" },
} as const;

const FUEL_SHARE = 1 / (1 + MMH_NTO_MIXTURE_RATIO);
const OX_SHARE = MMH_NTO_MIXTURE_RATIO / (1 + MMH_NTO_MIXTURE_RATIO);
/**
 * Helium per kg of MMH/NTO loaded. A regulated pair cannot push its helium back into the bottle (the
 * check valves stop it), so the gas that filled the emptied tank volume at the regulated pressure is
 * vented in the purge and the bottle is topped up with as much: volume per kg × helium density.
 */
export const HELIUM_PER_KG_PAIR = (FUEL_SHARE / MMH_DENSITY + OX_SHARE / NTO_DENSITY) * HELIUM_KG_M3.tank.value;

/**
 * Station materials per kg loaded into each ship propellant. A blowdown tank (hydrazine, LMP-103S)
 * needs no gas: the liquid that goes in compresses its own ullage gas back to the starting pressure.
 */
export const PROPELLANT_MATERIALS: Readonly<Record<Propellant, Amounts>> = {
  "MMH/NTO": { mmh: FUEL_SHARE, nto: OX_SHARE, helio: HELIUM_PER_KG_PAIR },
  Hydrazine: { hidracina: 1 },
  "LMP-103S": { "lmp-103s": 1 },
};

/** A craft the refuelling line can fill. */
export interface RefuelTarget {
  readonly id: string;
  readonly name: string;
  /** Docked at the station now (only then the line can be connected). */
  docked(): boolean;
  lines(): PropellantLine[];
  /** Put the kg of each line on board (the transfer ended). */
  load(loads: Readonly<Record<string, number>>): void;
  readonly kgPerHour: number;
  /** The connection procedure, in order; `{right|wrong}` marks a real value. */
  readonly steps: Sourced<readonly string[]>;
}

const SHIP_STEPS: Sourced<readonly string[]> = {
  value: [
    "conecta la manguera a la válvula de servicio",
    "purga la manguera con helio",
    `comprueba que el regulador da {${REGULATED_BAR}|310|1} bar`,
    "trasvasa el combustible y el oxidante por líneas separadas",
    "busca fugas con el detector de helio",
    "cierra la válvula de servicio y desconecta",
  ],
  source: SRC.hydrazineLoading,
  note: "Carga por la válvula de servicio y purga de la manguera (JPL); fugas con helio y detector (ESA, Biomass). 20 bar es la presión regulada del juego (estimación)",
};

const XENON_STEPS: Sourced<readonly string[]> = {
  value: ["conecta la línea de xenón a la nodriza", "haz vacío en la línea para que no entre aire", "mantén la línea por encima de {17|-108|900} °C, el punto crítico del xenón", "trasvasa el xenón", "busca fugas con el detector de helio", "cierra la válvula y desconecta"],
  source: SRC.xenon,
  note: "Punto crítico del xenón 289,733 K (16,6 °C): por encima no hay líquido y el trasvase va en una sola fase",
};

/** The probe as a refuelling target: one line per propellant its tanks hold. */
export function shipRefuelTarget(ship: Ship, id: string, docked: () => boolean): RefuelTarget {
  return {
    id,
    get name() {
      return ship.name;
    },
    docked,
    lines: () =>
      ship.propellants.map((p) => ({ id: p, label: PROPELLANT_NAME[p], capacityKg: ship.propellantCapacityKg(p), onBoardKg: ship.propellantKg(p), perKg: PROPELLANT_MATERIALS[p] })),
    load: (loads) => {
      for (const p of ship.propellants) if (loads[p]) ship.refuel(p, loads[p]!);
    },
    kgPerHour: REFUEL_TUNING.probeKgPerHour.value,
    steps: SHIP_STEPS,
  };
}

/** The mothership as a refuelling target: its xenon. */
export function mothershipRefuelTarget(m: Mothership, docked: () => boolean): RefuelTarget {
  return {
    id: m.id,
    get name() {
      return m.spec.name;
    },
    docked,
    lines: () => [{ id: "xenon", label: "xenón", capacityKg: m.spec.propellantCapacityKg, onBoardKg: m.propellantKg, perKg: { xenon: 1 } }],
    load: (loads) => {
      if (loads.xenon) m.refuel(loads.xenon);
    },
    kgPerHour: REFUEL_TUNING.xenonKgPerHour.value,
    steps: XENON_STEPS,
  };
}

/** What the Repostar card shows for one craft. */
export interface RefuelStatus {
  readonly target: RefuelTarget;
  readonly docked: boolean;
  readonly plan: LinePlan[];
  readonly loadKg: number;
  readonly takes: Amounts;
  readonly hours: number;
  /** Transfer to this craft on the line now or waiting. */
  readonly jobs: readonly Job[];
  readonly canStart: boolean;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const block = (id: string, pseudo: string, js = toCall(pseudo)): CodeBlock => ({ id, pseudo, js });
const jsNum = (v: number) => String(Math.round(v * 100) / 100);
const hrs = (h: number) => `${fmtKg(h)} h`;

function choice(id: string, idea: string, question: string, code: readonly CodeBlock[], right: string, wrong: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrong.filter((w) => w !== right))];
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, concept: 4, skill: "predecir", idea, question, code, options, correct: at };
}

/**
 * Refuelling a craft: split the pair at its mixture ratio (when there is one to fill), work out how
 * long the transfer takes, then each step of the connection is one challenge.
 */
export function refuelChore(target: RefuelTarget, plan: readonly LinePlan[], pool: readonly string[] = []): Chore {
  const id = `repostar-${target.id}`;
  const loadKg = plan.reduce((s, p) => s + p.loadKg, 0);
  const exercises: Exercise[] = [];
  const pair = plan.find((p) => p.line.id === "MMH/NTO" && p.loadKg > 0);
  if (pair) {
    const r = MMH_NTO_MIXTURE_RATIO;
    const kg = pair.loadKg;
    exercises.push(
      choice(
        `${id}-mezcla`,
        "El oxidante pesa más que el combustible",
        "¿Cuánto NTO va al tanque de oxidante?",
        [
          block("a", `par = ${fmtKg(kg)} kg de MMH/NTO`, `const par = ${jsNum(kg)};`),
          block("b", `razonMezcla = ${fmtKg(r)} (oxidante / combustible)`, `const razonMezcla = ${r};`),
          block("c", "nto = par · razonMezcla / (1 + razonMezcla)", "const nto = par * razonMezcla / (1 + razonMezcla);"),
        ],
        `${fmtKg(kg * OX_SHARE)} kg`,
        [`${fmtKg(kg * FUEL_SHARE)} kg`, `${fmtKg(kg * r)} kg`],
      ),
    );
  }
  const h = transferHours(loadKg, target.kgPerHour);
  exercises.push(
    choice(
      `${id}-horas`,
      "El trasvase va al ritmo de la bomba",
      "¿Cuántas horas tardará el trasvase?",
      [
        block("a", `carga = ${fmtKg(loadKg)} kg`, `const carga = ${jsNum(loadKg)};`),
        block("b", `caudal = ${fmtKg(target.kgPerHour)} kg/h`, `const caudal = ${target.kgPerHour};`),
        block("c", "horas = carga / caudal", "const horas = carga / caudal;"),
      ],
      hrs(h),
      [hrs(loadKg * target.kgPerHour), hrs(target.kgPerHour / Math.max(1e-6, loadKg)), hrs(h * 2)],
    ),
  );
  exercises.push(...stepChain(id, 1, (i) => `Repostar: paso ${i + 1}`, target.steps.value, pool));
  return {
    id,
    kind: "repostar",
    targetId: target.id,
    machine: "repostaje",
    title: `Repostar ${target.name}`,
    scenario: `${plan
      .filter((p) => p.loadKg > 0)
      .map((p) => `${fmtKg(p.loadKg)} kg de ${p.line.label}`)
      .join(", ")} · ${hrs(h)}`,
    exercises,
  };
}

/**
 * Use case: refuelling the crafts docked at the station from its propellant store. The connection
 * is a chain of code challenges; when it is solved the propellant is taken from the store and the
 * transfer runs on the refuelling line for game hours, after which it is on board.
 */
export class RefuelOps {
  constructor(
    readonly station: Station,
    readonly targets: readonly RefuelTarget[],
  ) {
    for (const t of targets)
      station.setReceiver(t.id, (loads) => {
        if (!t.docked()) return false;
        t.load(loads);
        return true;
      });
  }

  private pending(id: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const tr of this.station.pendingTransfers(id)) for (const [line, kg] of Object.entries(tr.loads)) out[line] = (out[line] ?? 0) + kg;
    return out;
  }

  status(id: string): RefuelStatus {
    const target = this.targets.find((t) => t.id === id);
    if (!target) throw new Error(`Unknown craft ${id}`);
    const docked = target.docked();
    const plan = planRefuel(target.lines(), this.station.stock, this.pending(id));
    const loadKg = plan.reduce((s, p) => s + p.loadKg, 0);
    const jobs = this.station.queue("repostaje").filter((j) => j.output.kind === "transfer" && j.output.craftId === id);
    return { target, docked, plan, loadKg, takes: planTakes(plan), hours: transferHours(loadKg, target.kgPerHour), jobs, canStart: docked && loadKg > 0 };
  }

  /** Every craft, docked first. */
  all(): RefuelStatus[] {
    return this.targets.map((t) => this.status(t.id)).sort((a, b) => Number(b.docked) - Number(a.docked));
  }

  startRefuel(id: string): StationSession {
    const s = this.status(id);
    if (!s.docked) throw new Error(`${id} is not docked at the station`);
    if (s.loadKg <= 0) throw new Error(`Nothing to load into ${id}`);
    // Wrong answers come from the other connection procedure.
    const pool = stepPool([SHIP_STEPS.value, XENON_STEPS.value].filter((v) => v !== s.target.steps.value));
    const chore = refuelChore(s.target, s.plan, pool);
    return new StationSession(chore, new ChoreRun(chore, Math.max(2, Math.ceil(chore.exercises.length / 3))), () => {
      // The store may have changed while solving: plan again with what is there now.
      const now = this.status(id);
      if (!now.canStart) return;
      const loads: Record<string, number> = {};
      for (const p of now.plan) if (p.loadKg > 0) loads[p.line.id] = p.loadKg;
      this.station.transfer(`Repostar ${now.target.name}`, { craftId: id, loads, taken: now.takes }, now.hours);
    });
  }
}
