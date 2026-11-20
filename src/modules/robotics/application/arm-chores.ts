import type { Chore } from "@modules/chores/domain/chore";
import { toCall } from "@modules/chores/application/catalog";
import type { ChoiceExercise, CodeBlock, OrderExercise } from "@modules/mind-duel/domain/exercise";
import { ARM_PROCEDURES, type ArmMove, type ArmProcedure, type ArmProcedureId, type ArmStep } from "../data/procedures";
import { CAPTURE, MBS, SSRMS } from "../data/robotics";

/**
 * The arm's procedures as code challenges at the Cupola's RWS (docs/design/brazo-robotico.md): the real steps
 * to put in order (with a real mistake as the trap) and a question on the real numbers. Long procedures are
 * split in two order challenges around the question, so each fits on a phone. `moves(chore, i)` says which
 * arm motion each block of step i plays outside.
 */

const block = (id: string, pseudo: string, js = toCall(pseudo)): CodeBlock => ({ id, pseudo, js });
const num = (v: number, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString("es-ES", { maximumFractionDigits: d });

/** An order challenge of some steps of a procedure, with the trap. */
function orderOf(p: ArmProcedure, part: string, steps: readonly ArmStep[], idea: string): OrderExercise {
  const blocks = steps.map((s) => block(s.id, s.pseudo));
  return { kind: "order", id: `brazo-${p.id}-${part}`, concept: 1, idea, blocks: [...blocks, block("x", p.trap.pseudo)], solution: blocks.map((b) => b.id) };
}

/** The right option at a stable place (by id) among the wrong ones. */
function choice(id: string, c: Omit<ChoiceExercise, "kind" | "id" | "options" | "correct">, right: string, wrongs: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrongs)].filter((w) => w !== right).slice(0, 3);
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const at = h % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, ...c, options, correct: at };
}

const hhmm = (h: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

/** What the question of each procedure needs from the game now. */
export interface ArmContext {
  /** The lander's mass, kg (berthing it). */
  readonly landerKg?: number;
  /** How far the MBS rides to the camera's worksite, m. */
  readonly rideM?: number;
}

function question(p: ArmProcedure, ctx: ArmContext): ChoiceExercise {
  const id = `brazo-${p.id}-cuenta`;
  switch (p.id) {
    case "captura": {
      // NG-19: caught at 09:52 UTC, bolts home 2,5 h later.
      const at = 9 + 52 / 60;
      const right = hhmm(at + CAPTURE.captureToBoltsH.value);
      return choice(id, { concept: 4, skill: "predecir", idea: "Del agarre a los pernos pasan horas: el brazo va despacio con 7 t colgando", question: "¿A qué hora (UTC) queda atracado?", code: [block("a", "captura = 09:52", "const captura = 9 + 52 / 60;"), block("b", `atracado = captura + ${num(CAPTURE.captureToBoltsH.value)} h`, `const atracado = captura + ${CAPTURE.captureToBoltsH.value};`)] }, right, [hhmm(at + 0.5), hhmm(at + 1.5), hhmm(at + 4)]);
    }
    case "suelta-cygnus": {
      // NG-19: berthed on 4 August, released on 22 December 2023.
      const right = `${CAPTURE.stayDays.value} días`;
      return choice(id, { concept: 4, skill: "predecir", idea: "Un Cygnus se queda meses: la tripulación lo vacía y lo llena de basura", question: "¿Cuántos días estuvo atracado el NG-19?", code: [block("a", "atracado = 4 de agosto (día 216)", "const atracado = 216;"), block("b", "suelto = 22 de diciembre (día 356)", "const suelto = 356;"), block("c", "días = suelto - atracado", "const dias = suelto - atracado;")] }, right, ["120 días", "150 días", "572 días"]);
    }
    case "atraque-modulo": {
      const t = (ctx.landerKg ?? 15000) / 1000;
      const max = SSRMS.maxPayloadKg.value / 1000;
      return choice(id, { concept: 3, skill: "predecir", idea: "El brazo mueve hasta 116 t en ingravidez: lo que cuesta es pararlo", question: "¿Qué hace el programa?", code: [block("a", `masa = ${num(t)} t`, `const masa = ${t};`), block("b", `si masa <= ${num(max, 0)} t: mover()`, `if (masa <= ${max}) mover();`), block("c", "si no: avisar()", "else avisar();")] }, "mover(): pesa menos de lo que puede mover", ["avisar(): pesa demasiado", "nada: el brazo no mueve vehículos", "mover() y luego avisar()"]);
    }
    case "desatraque-modulo":
      return choice(id, { concept: 6, skill: "completar", idea: "Un CBM cierra con 16 pernos motorizados: hay que soltarlos todos", question: "¿Qué número completa el bucle?", code: [block("a", "para perno de 1 a ___", "for (let perno = 1; perno <= ___; perno++) {"), block("b", "soltar(perno)", "soltar(perno); }")] }, String(CAPTURE.bolts.value), [String(CAPTURE.latches.value), "8", "12"]);
    case "bishop":
      return choice(id, { concept: 5, skill: "reparar", idea: "Con aire en el vestíbulo, al soltar los pernos la presión empujaría la Bishop", question: "¿Qué línea tiene el fallo?", code: [block("a", "cerrarEscotilla()", "cerrarEscotilla();"), block("b", "soltarPernos()", "soltarPernos();"), block("c", "bombearAire()", "bombearAire();")] }, "soltarPernos(): va después de bombear el aire", ["cerrarEscotilla(): sobra", "bombearAire(): sobra", "Ninguna"]);
    case "dextre-camara": {
      const d = ctx.rideM ?? 9;
      const right = `${num(d / MBS.speedMPerMin.value)} min`;
      return choice(id, { concept: 4, skill: "predecir", idea: "La base móvil va por los raíles a unos 1,5 m por minuto", question: "¿Cuánto tarda la MBS en llegar?", code: [block("a", `distancia = ${num(d)} m`, `const distancia = ${d};`), block("b", `velocidad = ${num(MBS.speedMPerMin.value)} m/min`, `const velocidad = ${MBS.speedMPerMin.value};`), block("c", "minutos = distancia / velocidad", "const minutos = distancia / velocidad;")] }, right, [`${num(d * MBS.speedMPerMin.value)} min`, `${num(d)} min`, `${num(d / 60)} min`]);
    }
  }
}

/** Order, question, order: the long procedures are split at their middle. */
export function armChore(id: ArmProcedureId, ctx: ArmContext = {}): Chore {
  const p = ARM_PROCEDURES[id];
  const half = p.steps.length > 5 ? Math.ceil(p.steps.length / 2) : p.steps.length;
  const first = orderOf(p, "pasos", p.steps.slice(0, half), p.idea);
  const q = question(p, ctx);
  const rest = p.steps.slice(half);
  const exercises = rest.length ? [first, q, orderOf(p, "pasos-2", rest, p.idea)] : [first, q];
  return { id: `brazo:${p.id}`, kind: "brazo-robotico", title: p.title, scenario: p.licence ?? p.idea, targetId: p.id, exercises };
}

/** The procedure of an arm chore. */
export const procedureOf = (chore: Chore): ArmProcedure | undefined => (chore.kind === "brazo-robotico" ? ARM_PROCEDURES[chore.targetId as ArmProcedureId] : undefined);

/** The arm moves of step `index`'s blocks, in order (a question plays a check on the camera). */
export function armMoves(chore: Chore, index: number): readonly ArmMove[] {
  const p = procedureOf(chore);
  const ex = chore.exercises[index];
  if (!p || !ex) return [];
  if (ex.kind === "choice") return ["comprobar"];
  return ex.solution.map((b) => p.steps.find((s) => s.id === b)?.move ?? "comprobar");
}
