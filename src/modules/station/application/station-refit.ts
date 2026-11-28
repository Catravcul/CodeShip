import type { ChoiceExercise, CodeBlock, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Chore } from "@modules/chores/domain/chore";
import { toCall } from "@modules/chores/application/catalog";
import type { Hangar } from "../domain/hangar";
import type { StationComponent, StationOutfit, StationSlot } from "../domain/outfit";

/**
 * Use case: configuring the station's own components (solar wings, radiators, shield) from inside the
 * station, «Estación» tab. Same pattern as the ship bay: the new part comes from the hangar, the old
 * one goes back there, and the swap is a chain of code challenges generated from the change.
 */

export const STATION_SLOT_NAME: Readonly<Record<StationSlot, string>> = { alas: "Alas solares", radiadores: "Radiadores", escudo: "Escudo contra micrometeoritos" };

export interface StationComponentOption {
  readonly component: StationComponent;
  readonly label: string;
  readonly detail: string;
  /** Why it cannot be fitted now. */
  readonly locked?: string;
}

/** What could go in a slot instead of what is there, the ones that can be fitted first. */
export function stationOptions(outfit: StationOutfit, slot: StationSlot, catalog: readonly StationComponent[], hangar: Pick<Hangar, "count">): StationComponentOption[] {
  const now = outfit.component(slot);
  return catalog
    .filter((c) => c.slot === slot && c.id !== now?.id)
    .map((c): StationComponentOption => {
      const n = hangar.count(c.id);
      const locked = n < 1 ? "No hay en el hangar: fabrícalo en Planos → Componentes" : outfit.componentBlocker(c);
      return { component: c, label: `Montar ${c.name}`, detail: `${c.effect} · ${n} en el hangar`, ...(locked ? { locked } : {}) };
    })
    .sort((a, b) => Number(!!a.locked) - Number(!!b.locked));
}

/** Make the swap: the new one leaves the hangar, the old one goes back. Throws (changing nothing) if it cannot. */
export function applyStationRefit(outfit: StationOutfit, c: StationComponent, hangar: Pick<Hangar, "count" | "take" | "put">): void {
  if (hangar.count(c.id) < 1) throw new Error(`No ${c.id} in the hangar`);
  const before = outfit.fitComponent(c);
  hangar.take(c.id);
  if (before) hangar.put(before.id);
}

const hash = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};
const block = (id: string, pseudo: string, js = toCall(pseudo)): CodeBlock => ({ id, pseudo, js });
const num = (v: number) => (Math.round(v * 10) / 10).toLocaleString("es-ES", { maximumFractionDigits: 1 });

const STEPS: Readonly<Record<StationSlot, readonly string[]>> = {
  alas: ["gira las alas de canto al Sol", "desconecta las alas del bus", "monta las nuevas con el brazo", "despliega las alas", "comprueba la potencia que llega"],
  radiadores: ["pasa el calor al circuito de reserva", "vacía el amoníaco del panel viejo", "monta los paneles nuevos con el brazo", "llena el circuito de amoníaco", "comprueba la temperatura"],
  escudo: ["sal con el traje por la esclusa", "suelta los paneles viejos", "monta los paneles nuevos", "comprueba la separación del casco", "vuelve por la esclusa"],
};

/** The chain: predict what the station can run after the swap, then order the steps. */
export function stationRefitChore(outfit: StationOutfit, c: StationComponent): Chore {
  const id = `estacion-${c.id}`;
  const wings = c.slot === "alas" ? c.powerKw : outfit.supplyKw;
  const rads = c.slot === "radiadores" ? c.heatKw : outfit.rejectKw;
  const right = `${num(Math.min(wings, rads))} kW`;
  const wrongs = [...new Set([`${num(Math.max(wings, rads))} kW`, `${num(wings + rads)} kW`, `${num(Math.abs(wings - rads))} kW`])].filter((w) => w !== right);
  const options = wrongs.slice(0, 3);
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, right);
  const predict: ChoiceExercise = {
    kind: "choice",
    id: `${id}-energia`,
    concept: 4,
    skill: "predecir",
    idea: "Toda la electricidad acaba en calor: manda lo menos que dan las alas o expulsan los radiadores",
    question: "¿Cuánta potencia podrá usar la estación?",
    code: [block("a", `alas = ${num(wings)} kW`, `const alas = ${wings};`), block("r", `radiadores = ${num(rads)} kW`, `const radiadores = ${rads};`), block("c", "capacidad = min(alas, radiadores)", "const capacidad = Math.min(alas, radiadores);")],
    options,
    correct: at,
  };
  const blocks = STEPS[c.slot].map((s, i) => block(String.fromCharCode(97 + i), s));
  const steps: OrderExercise = { kind: "order", id: `${id}-pasos`, concept: 1, idea: "Paso a paso, sin dejar la estación sin energía", blocks, solution: blocks.map((b) => b.id) };
  return { id, kind: "cambiar-pieza", targetId: c.id, title: `Montar ${c.name}`, scenario: `${STATION_SLOT_NAME[c.slot]} · ${c.effect}`, exercises: [predict, steps] };
}
