import type { ChoiceExercise, CodeBlock, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Chore } from "@modules/chores/domain/chore";
import { toCall } from "@modules/chores/application/catalog";
import type { Mothership } from "../domain/mothership";
import { auxPowerKw, relativeDose, type MothershipEquipment, type MothershipSlot } from "../domain/equipment";
import type { DriveStore } from "./drive-refit";

/**
 * Use case: swapping the mothership's auxiliary power or its radiation shield in the ship bay. Like the
 * thrusters: the new part comes from the station's hangar, the old one goes back there, and doing it
 * is a chain of code challenges generated from the change.
 */

export const SLOT_NAME: Readonly<Record<MothershipSlot, string>> = { "energia-auxiliar": "Energía auxiliar", blindaje: "Blindaje contra la radiación" };

const num = (v: number, d = 0) => v.toLocaleString("es-ES", { maximumFractionDigits: d });
/** Nothing in the slot: fitting it needs nothing from the hangar. */
export const isEmptyEquipment = (e: MothershipEquipment): boolean => e.massKg === 0;

export interface EquipmentOption {
  readonly equipment: MothershipEquipment;
  readonly label: string;
  readonly detail: string;
  readonly locked?: string;
}

/** What a piece of equipment does, in one line. */
export function equipmentEffect(m: Mothership, e: MothershipEquipment): string {
  const t = `${num(e.massKg / 1000, 1)} t`;
  if (e.slot === "energia-auxiliar") return `${t} · +${num(auxPowerKw(e, m.spec.sunDistanceAu.value))} kW aquí${e.solar ? ` (${num(e.powerKw)} kW a 1 UA)` : ""}`;
  const s = e.shield!;
  const dose = m.spec.radiation.freeSpaceMSvPerYear.value * relativeDose(s.material, s.arealDensityGcm2);
  return `${t} · ${num(dose)} mSv/año`;
}

/** Everything that could go in a slot instead of what is there, the ones in the hangar first. */
export function equipmentOptions(m: Mothership, slot: MothershipSlot, catalog: readonly MothershipEquipment[], store?: Pick<DriveStore, "count">): EquipmentOption[] {
  const now = m.equipment(slot);
  const out = catalog
    .filter((e) => e.slot === slot && e.id !== now?.id)
    .map((e): EquipmentOption => {
      const free = isEmptyEquipment(e);
      const n = store ? store.count(e.id) : 1;
      const detail = `${equipmentEffect(m, e)}${store && !free ? ` · ${n} en el hangar` : ""}`;
      return { equipment: e, label: free ? (slot === "blindaje" ? "Quitar el blindaje" : "Quitar la energía auxiliar") : `Montar ${e.name}`, detail, ...(free || n > 0 ? {} : { locked: "No hay en el hangar: fabrícalo en la estación (Planos)" }) };
    });
  return out.sort((a, b) => Number(!!a.locked) - Number(!!b.locked));
}

/** Make the swap on the ship and in the store. Throws (changing nothing) if the part is not in the hangar. */
export function applyEquipmentRefit(m: Mothership, e: MothershipEquipment, store?: DriveStore): void {
  if (store && !isEmptyEquipment(e) && store.count(e.id) < 1) throw new Error(`No ${e.id} in the hangar`);
  const before = m.fitEquipment(e);
  if (!store) return;
  if (!isEmptyEquipment(e)) store.take(e.id);
  if (before && !isEmptyEquipment(before)) store.put(before.id);
}

// --- The chain of challenges ------------------------------------------------------

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const block = (id: string, pseudo: string, js = toCall(pseudo)): CodeBlock => ({ id, pseudo, js });
function choice(id: string, skill: ChoiceExercise["skill"], concept: ChoiceExercise["concept"], idea: string, question: string, code: readonly CodeBlock[], right: string, wrong: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrong.filter((w) => w !== right))].slice(0, 3);
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, concept, skill, idea, question, code, options, correct: at };
}
function order(id: string, idea: string, steps: readonly string[]): OrderExercise {
  const blocks = steps.map((s, i) => block(String.fromCharCode(97 + i), s));
  return { kind: "order", id, concept: 1, idea, blocks, solution: blocks.map((b) => b.id) };
}

const STEPS: Readonly<Record<MothershipSlot, readonly string[]>> = {
  "energia-auxiliar": ["desconecta la fuente auxiliar del bus de alta tensión", "pliega o apaga lo que hay", "desmonta los soportes viejos", "monta la fuente nueva en la espina", "conecta los cables al bus", "comprueba la potencia que llega"],
  blindaje: ["avisa a la tripulación: el camarote queda sin blindaje un rato", "vacía o desmonta el blindaje viejo", "monta los soportes del nuevo", "coloca el blindaje alrededor del módulo y las literas", "mide la dosis dentro"],
};

/**
 * Swapping a slot: say what the new part weighs (its real mass), predict its effect (thrusters that
 * fire with the added power, or the crew's yearly dose behind the new shield), then order the fitting.
 */
export function equipmentRefitChore(m: Mothership, e: MothershipEquipment): Chore {
  const next = m.withEquipment(e);
  const before = m.equipment(e.slot);
  const id = `cambiar-nodriza-${e.slot}-${e.id}`;
  const t = Math.round(e.massKg / 100) / 10;
  const massEx = choice(
    `${id}-masa`,
    "completar",
    2,
    "Una pieza nueva en la nodriza",
    `¿Cuántas toneladas pesa ${e.name.toLowerCase()}?`,
    [block("old", `− ${e.slot} = ${before?.name ?? "nada"}`, `// this.${e.slot} = ${JSON.stringify(before?.id ?? null)};`), block("new", `+ ${e.slot} = ${e.name}(___ t)`, `this.${e.slot.replace("-", "")} = new Pieza("${e.id}", { masaT: ___ });`)],
    `${num(t, 1)} t`,
    [`${num(t * 10, 1)} t`, `${num(t / 10, 2)} t`, `${num(t + 60, 1)} t`],
  );
  let effectEx: ChoiceExercise;
  if (e.slot === "energia-auxiliar") {
    const reactor = m.spec.power.electricKw.value;
    const hotel = m.spec.propulsion.hotelLoadKw.value;
    const aux = Math.round(next.auxiliaryKw);
    const d = next.drive;
    effectEx = choice(
      `${id}-potencia`,
      "predecir",
      4,
      "Más energía, más propulsores encendidos",
      "¿Cuántos propulsores podrán encenderse a la vez ahora?",
      [
        block("r", `libres = ${num(reactor)} kW del reactor + ${num(aux)} kW auxiliares − ${num(hotel)} kW del resto`, `const libres = ${reactor} + ${aux} - ${hotel};`),
        ...next.fitted.filter((f) => f.count).map((f, i) => block(`m${i}`, `${f.mountId}: ${f.count} × ${f.thruster.shortName} de ${num(f.thruster.powerKw, 1)} kW`, `const ${f.mountId} = { n: ${f.count}, kw: ${f.thruster.powerKw} };`)),
        block("e", "encender de uno en uno, alternando módulos, mientras quepan en libres", "const encendidos = encenderMientrasQuepan(libres);"),
      ],
      String(d.firingUnits),
      [String(d.fittedUnits + 1), String(d.firingUnits + 2), String(Math.max(0, d.firingUnits - 1))],
    );
  } else {
    const s = e.shield!;
    const base = m.spec.radiation.freeSpaceMSvPerYear.value;
    const k = relativeDose(s.material, s.arealDensityGcm2);
    const dose = Math.round(base * k);
    effectEx = choice(
      `${id}-dosis`,
      "predecir",
      3,
      "¿Cuánta radiación atraviesa el blindaje?",
      "¿Qué dosis recibirá Doménica en un año?",
      [
        block("b", `sinBlindaje = ${base} mSv/año (rayos cósmicos, mínimo solar)`, `const sinBlindaje = ${base};`),
        block("k", `paso = ${num(k, 2)} (${num(s.arealDensityGcm2)} g/cm² de ${s.material})`, `const paso = ${Math.round(k * 100) / 100};`),
        block("d", "dosis = sinBlindaje · paso", "const dosis = sinBlindaje * paso;"),
      ],
      `${dose} mSv`,
      [`${Math.round(base * (1 - k))} mSv`, `${Math.round(base / Math.max(k, 0.05))} mSv`, `${base} mSv`],
    );
  }
  const dv = Math.round(next.deltaV());
  const isp = Math.round(next.drive.ispS);
  const m0 = Math.round(next.massKg / 1000);
  const mf = Math.round(next.dryMassKg / 1000);
  const dvEx = choice(
    `${id}-dv`,
    "predecir",
    3,
    "La masa también cuenta",
    "Con el xenón lleno, ¿qué Δv tendrá la nodriza?",
    [
      block("isp", `isp = ${isp} s; g0 = 9,81 m/s²`, `const isp = ${isp}, g0 = 9.80665;`),
      block("m", `m0 = ${num(m0)} t; mf = ${num(mf)} t`, `const m0 = ${m0}, mf = ${mf};`),
      block("dv", "dv = isp · g0 · ln(m0 / mf)", "const dv = isp * g0 * Math.log(m0 / mf);"),
    ],
    `${num(dv)} m/s`,
    [`${num(Math.round(dv / 9.80665))} m/s`, `${num(Math.round(dv * 1.5))} m/s`, `${num(Math.round(isp * 9.80665 * (m0 / mf - 1)))} m/s`],
  );
  return {
    id,
    kind: "cambiar-pieza",
    targetId: `nodriza:${e.slot}:${e.id}`,
    title: `${SLOT_NAME[e.slot]} de la nodriza: ${e.name}`,
    scenario: `${before?.name ?? "nada"} → ${e.name} · ${equipmentEffect(m, e)}`,
    exercises: [massEx, effectEx, dvEx, order(`${id}-montaje`, e.slot === "blindaje" ? "Con cuidado: son toneladas" : "Con cuidado: hay alta tensión", STEPS[e.slot])],
  };
}
