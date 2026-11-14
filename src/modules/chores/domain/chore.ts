import { isCorrect, type Answer, type Exercise } from "@modules/mind-duel/domain/exercise";
import { Attempts } from "@modules/mind-duel/domain/attempts";

export type ChoreKind =
  | "regar"
  | "agitar"
  | "cosechar"
  | "curar-planta"
  | "alimentar-gato"
  | "calmar-gato"
  | "cocinar"
  | "yoga"
  | "ejercicio"
  | "reparar-nave"
  | "cambiar-pieza"
  | "programar-animal"
  | "alimentar-perro"
  | "jugar-perro"
  | "abrir-gallinero"
  | "alimentar-gallinas"
  | "recoger-huevos"
  | "procesar"
  | "cultivo-sembrar"
  | "cultivo-renovar"
  | "cultivo-diferenciar"
  | "cultivo-cosechar"
  | "cultivo-esterilizar"
  | "reparar-maquina"
  | "atender-paciente"
  | "nano-convertir"
  | "nano-programar"
  | "nano-reparar"
  | "salir-eva"
  | "fabricar"
  | "refinar"
  | "repostar"
  | "ajustar-biorreactor"
  | "programar-viaje"
  /** Programming a landing for the guidance computer (docs/design/aterrizaje.md). */
  | "programar-aterrizaje"
  /** Ordering from the Sanctuary, a tug haul or a mass driver install (modules/imports). */
  | "importar"
  /** The ring aquarium (modules/sanctuary): care, befriending the school, asking the snails or fish for help. */
  | "cuidar-acuario"
  | "amistad-acuario"
  | "ayuda-acuario";

/** Groups for filtering the task board. */
export type ChoreCategory = "comida" | "plantas" | "animales" | "nave" | "salud" | "misiones";

export const CHORE_CATEGORY: Readonly<Record<ChoreKind, ChoreCategory>> = {
  regar: "plantas",
  agitar: "plantas",
  cosechar: "plantas",
  "curar-planta": "plantas",
  "cultivo-sembrar": "comida",
  "cultivo-renovar": "comida",
  "cultivo-diferenciar": "comida",
  "cultivo-cosechar": "comida",
  "cultivo-esterilizar": "comida",
  cocinar: "comida",
  procesar: "comida",
  "alimentar-gato": "animales",
  "calmar-gato": "animales",
  "programar-animal": "animales",
  "alimentar-perro": "animales",
  "jugar-perro": "animales",
  "abrir-gallinero": "animales",
  "alimentar-gallinas": "animales",
  "recoger-huevos": "animales",
  yoga: "salud",
  ejercicio: "salud",
  "atender-paciente": "salud",
  "reparar-nave": "nave",
  "reparar-maquina": "nave",
  "cambiar-pieza": "nave",
  "nano-convertir": "misiones",
  "nano-programar": "misiones",
  "nano-reparar": "misiones",
  "salir-eva": "nave",
  fabricar: "nave",
  refinar: "nave",
  repostar: "nave",
  "ajustar-biorreactor": "plantas",
  "programar-viaje": "misiones",
  "programar-aterrizaje": "misiones",
  importar: "nave",
  "cuidar-acuario": "animales",
  "amistad-acuario": "animales",
  "ayuda-acuario": "animales",
};

/** A task on board, done by solving code challenges in order. */
export interface Chore {
  readonly id: string;
  readonly kind: ChoreKind;
  readonly title: string;
  /** Why it is needed now ("Luna mordió la lechuga", "la sacudida volcó la maceta"…). */
  readonly scenario: string;
  readonly targetId?: string;
  /** Condition being treated, for sickbay chores. */
  readonly conditionId?: string;
  /** Machine the chore needs (or repairs). */
  readonly machine?: string;
  /** In order: for yoga each exercise is the next posture of the sequence. */
  readonly exercises: readonly Exercise[];
}

export type ChoreStatus = "doing" | "done" | "failed";

/**
 * Doing a chore: exercises in the given order (unlike an asteroid duel, never shuffled).
 * Each solved exercise is a step done; too many mistakes and the chore must be retried.
 * A wrong answer stays recorded for its step: giving the same wrong answer again is not a new
 * mistake (a repeated tap on the same wrong option costs nothing and changes nothing).
 */
export class ChoreRun {
  private _step = 0;
  private _mistakes = 0;
  private _status: ChoreStatus = "doing";
  private readonly attempts = new Attempts();

  constructor(
    readonly chore: Chore,
    readonly maxMistakes = 2,
  ) {
    if (chore.exercises.length === 0) throw new Error(`Chore ${chore.id} has no exercises`);
  }

  get status(): ChoreStatus {
    return this._status;
  }
  get step(): number {
    return this._step;
  }
  get steps(): number {
    return this.chore.exercises.length;
  }
  get mistakes(): number {
    return this._mistakes;
  }
  get mistakesLeft(): number {
    return this.maxMistakes - this._mistakes;
  }
  get current(): Exercise | undefined {
    return this._status === "doing" ? this.chore.exercises[this._step] : undefined;
  }

  /** Whether this answer was already given, wrong, to the current step. */
  tried(answer: Answer): boolean {
    this.attempts.on(this.current);
    return this.attempts.repeated(answer);
  }

  /** Returns whether the answer was right. A repeated wrong answer returns false and counts nothing. */
  submit(answer: Answer): boolean {
    const ex = this.current;
    if (!ex) throw new Error("Chore is over");
    if (this.tried(answer)) return false;
    const ok = isCorrect(ex, answer);
    this.attempts.record(answer, ok);
    if (ok) {
      this._step++;
      if (this._step >= this.steps) this._status = "done";
    } else {
      this._mistakes++;
      if (this._mistakes >= this.maxMistakes) this._status = "failed";
    }
    return ok;
  }
}
