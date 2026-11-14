import type { ChoiceExercise, CodeBlock, OrderExercise } from "@modules/mind-duel/domain/exercise";
import { ChoreRun, type Chore, type ChoreKind } from "@modules/chores/domain/chore";
import { toCall } from "@modules/chores/application/catalog";
import { ChoreSession } from "@modules/habitat/application/habitat";
import { AQUARIUM_HELPERS, AQUARIUM_TUNING, RingAquarium, type AquariumEvent, type AquariumHelper } from "../domain/aquarium";
import { BEFRIEND_SCHOOL, HELP_LESSONS } from "../data/aquarium-lessons";

/** The chore kinds the ring aquarium owns. */
export const AQUARIUM_CHORE_KINDS: ReadonlySet<ChoreKind> = new Set<ChoreKind>(["cuidar-acuario", "amistad-acuario", "ayuda-acuario"]);
export const isAquariumChore = (c: Chore): boolean => AQUARIUM_CHORE_KINDS.has(c.kind);

/** Whoever feels calmer with friends in the tank (the crew member). */
export interface CalmPort {
  startle(amount: number): void;
}

/** Share of the water replaced in a water change. */
export const WATER_CHANGE = 0.2;

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ","));
const block = (id: string, pseudo: string, js = toCall(pseudo), indent?: number): CodeBlock => (indent ? { id, pseudo, js, indent } : { id, pseudo, js });
const order = (id: string, idea: string, steps: readonly string[]): OrderExercise => {
  const blocks = steps.map((s, i) => block(String.fromCharCode(97 + i), s));
  return { kind: "order", id, concept: 1, idea, blocks, solution: blocks.map((b) => b.id) };
};
const choice = (id: string, skill: ChoiceExercise["skill"], idea: string, question: string, code: readonly CodeBlock[], options: readonly string[], correct: number): ChoiceExercise => ({
  kind: "choice",
  id,
  concept: 4,
  skill,
  idea,
  question,
  code,
  options,
  correct,
});

/**
 * Use cases of the ring aquarium (docs/design/santuario-espacial.md, «Acuario del anillo»): its chores as
 * chains of code challenges, run with the chores engine, and their effects on the tank, the bond with the
 * school and the crew's calm. Time in days.
 */
export class AquariumOps {
  private events: AquariumEvent[] = [];

  constructor(
    readonly tank: RingAquarium = new RingAquarium(),
    private readonly crew?: CalmPort,
  ) {}

  tick(days: number): void {
    this.events.push(...this.tank.tick(days));
    // Watching friends in a tank calms (Cracknell et al. 2016).
    if (this.crew && this.tank.calmPerDay > 0) this.crew.startle(-this.tank.calmPerDay * days);
  }

  drainEvents(): AquariumEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** What the aquarium needs or offers right now. */
  chores(): Chore[] {
    const t = this.tank;
    const out: Chore[] = [];
    if (t.needs.feed) out.push(this.feedChore());
    if (t.needs.cleanGlass) out.push(this.glassChore());
    if (t.needs.changeWater) out.push(this.waterChore());
    if (t.canBefriend)
      out.push({
        id: "acuario-amistad",
        kind: "amistad-acuario",
        targetId: "acuario",
        title: "Hacer amistad con las medakas",
        scenario: "Ya te conocen de cuidarlas: escribe en su mente que eres amiga",
        exercises: BEFRIEND_SCHOOL.exercises,
      });
    if (t.friends)
      for (const h of AQUARIUM_HELPERS)
        if (!t.helping(h)) {
          const l = HELP_LESSONS[h];
          out.push({
            id: `acuario-ayuda-${h}`,
            kind: "ayuda-acuario",
            targetId: h,
            title: `Pedir ayuda a ${l.who}: ${l.task}`,
            scenario: `Son tus amigos: prográmalos para ${l.task}`,
            exercises: l.exercises,
          });
        }
    return out;
  }

  /** Start one of its chores; the effect applies when every challenge is solved. */
  start(chore: Chore): ChoreSession {
    if (!isAquariumChore(chore)) throw new Error(`No es una tarea del acuario: ${chore.id}`);
    const run = new ChoreRun(chore, Math.max(2, Math.ceil(chore.exercises.length / 3)));
    const done = () => {
      const t = this.tank;
      if (chore.id === "acuario-comer") t.feed();
      else if (chore.id === "acuario-cristal") t.cleanGlass();
      else if (chore.id === "acuario-agua") t.changeWater(WATER_CHANGE);
      else if (chore.kind === "amistad-acuario") {
        this.events.push(...t.befriend());
        this.crew?.startle(-0.1);
      } else if (chore.kind === "ayuda-acuario") this.events.push(...t.ask(chore.targetId as AquariumHelper));
    };
    return new ChoreSession(run, () => {}, done, () => {});
  }

  private feedChore(): Chore {
    const t = this.tank;
    const daily = t.fishCount * AQUARIUM_TUNING.fishMassG * AQUARIUM_TUNING.feedFraction;
    const meal = Math.round((daily / 2) * 100) / 100;
    return {
      id: "acuario-comer",
      kind: "cuidar-acuario",
      targetId: "acuario",
      title: "Dar de comer a las medakas",
      scenario: "El banco ronda la superficie esperando su comida",
      exercises: [
        choice(
          "acuario-comer-racion",
          "predecir",
          "Somos pequeñas: poquito y dos veces al día",
          `${t.fishCount} medakas de ${fmt(AQUARIUM_TUNING.fishMassG)} g: 3 % de su peso al día, en dos tomas. ¿Gramos por toma?`,
          [block("a", `guardar ${t.fishCount} × ${fmt(AQUARIUM_TUNING.fishMassG)} × 0,03 en diario`, `const diario = ${t.fishCount} * ${AQUARIUM_TUNING.fishMassG} * 0.03;`), block("b", "guardar diario ÷ 2 en toma", "const toma = diario / 2;")],
          [`${fmt(meal * 2)} g`, `${String(meal).replace(".", ",")} g`, "20 g"],
          1,
        ),
        order("acuario-comer-pasos", "Que no sobre nada en el fondo", ["toma la ración de escamas", "esparce las escamas en la superficie", "mira que coman todo en dos minutos", "limpia lo que sobre"]),
      ],
    };
  }

  private glassChore(): Chore {
    const a = Math.round(this.tank.algae * 100) / 100;
    return {
      id: "acuario-cristal",
      kind: "cuidar-acuario",
      targetId: "acuario",
      title: "Limpiar el cristal del acuario",
      scenario: "Las algas verdean el cristal y no se ve el banco",
      exercises: [
        choice(
          "acuario-cristal-umbral",
          "completar",
          "No vemos tu cara",
          `El cristal tiene ${fmt(a)} de algas. ¿Qué valor falta para limpiarlo cuando pase del 40 %?`,
          [block("a", "si cristal.algas > ___ entonces", "if (cristal.algas > ___) {"), block("b", "limpiar(cristal)", "limpiar(cristal);", 1), block("c", "fin", "}")],
          ["40", "0,4", "\"verde\""],
          1,
        ),
        order("acuario-cristal-pasos", "Despacio, sin asustarnos", ["revisa las algas del cristal", "limpia el cristal con el imán", "deja los caracoles en su sitio", "comprueba que el agua sigue clara"]),
      ],
    };
  }

  private waterChore(): Chore {
    const n = Math.round(this.tank.nitrateMgL);
    const after = Math.round(n * (1 - WATER_CHANGE));
    const litres = Math.round(this.tank.volumeL * WATER_CHANGE);
    return {
      id: "acuario-agua",
      kind: "cuidar-acuario",
      targetId: "acuario",
      title: `Cambiar el ${Math.round(WATER_CHANGE * 100)} % del agua del acuario`,
      scenario: `El nitrato está en ${n} mg/L: el ceratófilo no da abasto`,
      exercises: [
        choice(
          "acuario-agua-nitrato",
          "predecir",
          "El agua pesa",
          `Hay ${n} mg/L de nitrato. Cambias el ${Math.round(WATER_CHANGE * 100)} % del agua por agua limpia. ¿Cuánto queda?`,
          [block("a", `guardar ${n} en nitrato`, `let nitrato = ${n};`), block("b", `nitrato = nitrato × (1 − ${fmt(WATER_CHANGE)})`, `nitrato = nitrato * (1 - ${WATER_CHANGE});`)],
          [`${n} mg/L`, `${after} mg/L`, `${Math.round(n * WATER_CHANGE)} mg/L`],
          1,
        ),
        order("acuario-agua-pasos", "Que el agua nueva no nos asuste", ["mide el nitrato", `saca ${litres} L con el sifón`, "llena con agua limpia a 26 °C", "comprueba la temperatura"]),
      ],
    };
  }
}
