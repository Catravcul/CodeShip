import type { ChoiceExercise, CodeBlock, Concept, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Chore } from "@modules/chores/domain/chore";
import { stepChain, toCall } from "@modules/chores/application/catalog";
import { MACHINE_NAME, STATION_TUNING, batchScale, refineRun, type Blueprint, type RefineProcess } from "../domain/blueprint";
import type { MaterialId, MaterialStock } from "../domain/materials";
import type { StationOutfit } from "../domain/outfit";
import type { BioProcess } from "../domain/bioreactor";

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
export const block = (id: string, pseudo: string, js = toCall(pseudo)): CodeBlock => ({ id, pseudo, js });

export function choice(id: string, concept: Concept, skill: ChoiceExercise["skill"], idea: string, question: string, code: readonly CodeBlock[], right: string, wrong: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrong.filter((w) => w !== right))];
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, concept, skill, idea, question, code, options, correct: at };
}

export function order(id: string, idea: string, steps: readonly string[]): OrderExercise {
  const blocks = steps.map((s, i) => block(String.fromCharCode(97 + i), s));
  return { kind: "order", id, concept: 1, idea, blocks, solution: blocks.map((b) => b.id) };
}

/** Spanish number: up to two decimals, comma. */
export const fmtKg = (v: number): string => (Math.round(v * 100) / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 });
export const jsNum = (v: number) => String(Math.round(v * 100) / 100);
const camel = (id: string) => id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());

/** The input the blueprint needs most of (imported kits aside). */
export function mainInput(inputs: Readonly<Record<MaterialId, number>>): [MaterialId, number] {
  return Object.entries(inputs)
    .filter(([id]) => id !== "kit")
    .sort((a, b) => b[1] - a[1])[0]!;
}

/**
 * Fabricating a part: work out the feedstock from the part's mass and the yield, predict what is left
 * in the store afterwards (real stock numbers), then order the fabrication steps.
 */
export function fabricationChore(bp: Blueprint, stock: MaterialStock, materialName: (id: MaterialId) => string = (id) => id): Chore {
  const y = STATION_TUNING.fabricationYield;
  const feed = bp.massKg / y;
  const id = `fabricar-${bp.id}`;
  const massEx = choice(
    `${id}-masa`,
    4,
    "predecir",
    "Nada sale perfecto de la máquina",
    "¿Cuánto material hay que meter en la máquina?",
    [
      block("m", `masaPieza = ${fmtKg(bp.massKg)} kg`, `const masaPieza = ${jsNum(bp.massKg)};`),
      block("y", `rendimiento = ${fmtKg(y)}`, `const rendimiento = ${y};`),
      block("f", "material = masaPieza / rendimiento", "const material = masaPieza / rendimiento;"),
    ],
    `${fmtKg(feed)} kg`,
    [`${fmtKg(bp.massKg * y)} kg`, `${fmtKg(bp.massKg + y)} kg`],
  );
  const [mat, need] = mainInput(bp.inputs);
  const have = stock.amount(mat);
  const v = camel(mat);
  const leftEx = choice(
    `${id}-queda`,
    4,
    "predecir",
    `Cuento el ${materialName(mat).toLowerCase()} del almacén`,
    `¿Cuánto ${materialName(mat).toLowerCase()} quedará en el almacén?`,
    [
      block("a", `almacen.${v} = ${fmtKg(have)} kg`, `almacen.${v} = ${jsNum(have)};`),
      block("b", `almacen.${v} = almacen.${v} − ${fmtKg(need)} kg`, `almacen.${v} -= ${jsNum(need)};`),
    ],
    `${fmtKg(have - need)} kg`,
    [`${fmtKg(have + need)} kg`, `${fmtKg(need)} kg`],
  );
  return {
    id,
    kind: "fabricar",
    targetId: bp.id,
    machine: bp.machine,
    title: `Fabricar ${bp.name}`,
    scenario: `${fmtKg(bp.massKg)} kg · ${bp.hours} h en ${MACHINE_NAME[bp.machine].toLowerCase()}`,
    exercises: [massEx, leftEx, order(`${id}-pasos`, "Paso a paso, como dice el plano", bp.steps)],
  };
}

/** What is left in store of the material a blueprint uses most. */
function leftInStore(id: string, bp: Blueprint, stock: MaterialStock, materialName: (id: MaterialId) => string): ChoiceExercise {
  const [mat, need] = mainInput(bp.inputs);
  const have = stock.amount(mat);
  const v = camel(mat);
  return choice(
    `${id}-queda`,
    4,
    "predecir",
    `Cuento el ${materialName(mat).toLowerCase()} del almacén`,
    `¿Cuánto ${materialName(mat).toLowerCase()} quedará en el almacén?`,
    [
      block("a", `almacen.${v} = ${fmtKg(have)} kg`, `almacen.${v} = ${jsNum(have)};`),
      block("b", `almacen.${v} = almacen.${v} − ${fmtKg(need)} kg`, `almacen.${v} -= ${jsNum(need)};`),
    ],
    `${fmtKg(have - need)} kg`,
    [`${fmtKg(have + need)} kg`, `${fmtKg(need)} kg`],
  );
}

/**
 * Building a module or a piece of equipment: predict the power left once it runs (the wings give,
 * the radiators limit, the machines draw), what is left in store, then order the steps.
 */
export function growthChore(bp: Blueprint, outfit: StationOutfit, stock: MaterialStock, materialName: (id: MaterialId) => string = (id) => id): Chore {
  const p = bp.product;
  const addKw = p.kind === "module" ? p.module.powerKw : p.kind === "equipment" ? p.equipment.powerKw - (p.equipment.upgrades ? (outfit.equipment.find((e) => e.spec.id === (p.equipment as { upgrades?: string }).upgrades)?.spec.powerKw ?? 0) : 0) : 0;
  const cap = outfit.capacityKw;
  const draw = outfit.drawKw;
  const id = `construir-${bp.id}`;
  const kw = (v: number) => `${fmtKg(v)} kW`;
  const powerEx = choice(
    `${id}-energia`,
    4,
    "predecir",
    "Toda la electricidad acaba en calor: manda lo menos que dan las alas o expulsan los radiadores",
    "¿Cuánta energía quedará libre en la estación?",
    [
      block("a", `alas = ${kw(outfit.supplyKw)}`, `const alas = ${jsNum(outfit.supplyKw)};`),
      block("r", `radiadores = ${kw(outfit.rejectKw)}`, `const radiadores = ${jsNum(outfit.rejectKw)};`),
      block("g", `gasto = ${kw(draw)} + ${kw(addKw)}`, `const gasto = ${jsNum(draw)} + ${jsNum(addKw)};`),
      block("l", "libre = min(alas, radiadores) − gasto", "const libre = Math.min(alas, radiadores) - gasto;"),
    ],
    kw(cap - draw - addKw),
    [kw(Math.max(outfit.supplyKw, outfit.rejectKw) - draw - addKw), kw(cap - draw + addKw), kw(outfit.supplyKw + outfit.rejectKw - draw - addKw)],
  );
  return {
    id,
    kind: "fabricar",
    targetId: bp.id,
    machine: bp.machine,
    title: `${p.kind === "module" ? "Construir" : "Montar"} ${bp.name}`,
    scenario: `${bp.hours} h en ${MACHINE_NAME[bp.machine].toLowerCase()} · +${kw(addKw)}`,
    exercises: [powerEx, leftInStore(id, bp, stock, materialName), order(`${id}-pasos`, "Paso a paso, como dice el plano", bp.steps)],
  };
}

/**
 * Refining a batch: predict what comes out of the batch (real proportions of the process), then each
 * step of the process is one challenge; steps with a real value (temperatures) ask for it.
 */
export function refineChore(p: RefineProcess, stock: MaterialStock, materialName: (id: MaterialId) => string = (id) => id, pool: readonly string[] = []): Chore {
  const run = refineRun(p, batchScale(p, stock));
  const [inId, inKg] = Object.entries(run.inputs)[0]!;
  const [outId, outKg] = Object.entries(run.outputs)[0]!;
  const ratio = p.outputs[outId]! / p.inputs[inId]!;
  const id = `refinar-${p.id}`;
  const outEx = choice(
    `${id}-sale`,
    4,
    "predecir",
    "La roca guarda más de lo que parece",
    `¿Cuánto ${materialName(outId).toLowerCase()} saldrá de este lote?`,
    [
      block("a", `entra = ${fmtKg(inKg)} kg de ${materialName(inId).toLowerCase()}`, `const entra = ${jsNum(inKg)};`),
      block("b", `rendimiento = ${fmtKg(ratio)}`, `const rendimiento = ${jsNum(ratio)};`),
      block("c", "sale = entra · rendimiento", "const sale = entra * rendimiento;"),
    ],
    `${fmtKg(outKg)} kg`,
    [`${fmtKg(inKg / ratio)} kg`, `${fmtKg(inKg)} kg`],
  );
  return {
    id,
    kind: "refinar",
    targetId: p.id,
    machine: p.machine,
    title: p.name,
    scenario: `${fmtKg(inKg)} kg de ${materialName(inId).toLowerCase()} → ${Object.entries(run.outputs)
      .map(([m, n]) => `${fmtKg(n)} kg de ${materialName(m).toLowerCase()}`)
      .join(", ")} · ${fmtKg(run.hours)} h`,
    exercises: [outEx, ...stepChain(id, 1, (i) => `${p.name}: paso ${i + 1}`, p.steps.value, pool)],
  };
}

/** What a tuning chore needs to know about the process, its machine and the store. */
export interface BioTuneContext {
  /** Power the equipment draws, kW. */
  readonly powerKw: number;
  readonly stock: MaterialStock;
  /** Where each output goes («el aire de la estación»…). */
  readonly uses: Readonly<Record<MaterialId, string>>;
  readonly materialName?: (id: MaterialId) => string;
}

/**
 * Tuning a living machine: game quantities only. What each kg of its main output costs in power, which
 * input of the store runs out first at full speed (or how long the only one lasts), where the main
 * output goes, and the maintenance round in order (revisa, ajusta el caudal, recoge).
 */
export function bioTuneChore(p: BioProcess, ctx: BioTuneContext): Chore {
  const name = ctx.materialName ?? ((id: MaterialId) => id);
  const low = (id: MaterialId) => name(id).toLowerCase();
  const id = `ajustar-${p.id}`;
  const [outId, outRate] = Object.entries(p.outputs)[0]!;
  const kwhPerKg = ctx.powerKw / outRate;
  const energyEx = choice(
    `${id}-energia`,
    4,
    "predecir",
    "La luz y las bombas no son gratis: cada kilo cuesta su energía",
    `¿Cuántos kWh cuesta cada kg de ${low(outId)}?`,
    [
      block("p", `potencia = ${fmtKg(ctx.powerKw)} kW`, `const potencia = ${jsNum(ctx.powerKw)};`),
      block("s", `sale = ${fmtKg(outRate * 1000)} g por hora`, `const sale = ${jsNum(outRate)}; // kg/h`),
      block("e", "kWhPorKg = potencia / sale", "const kWhPorKg = potencia / sale;"),
    ],
    `${fmtKg(kwhPerKg)} kWh`,
    [`${fmtKg(ctx.powerKw * outRate)} kWh`, `${fmtKg(ctx.powerKw * 24)} kWh`, `${fmtKg(kwhPerKg / 24)} kWh`],
  );
  const ins = Object.entries(p.inputs).map(([m, rate]) => ({ m, rate, have: ctx.stock.amount(m), hours: ctx.stock.amount(m) / rate }));
  const v = (m: MaterialId) => camel(m);
  const stockBlocks = ins.map((x, i) => block(String.fromCharCode(97 + i), `almacen.${v(x.m)} = ${fmtKg(x.have)} kg · gasta ${fmtKg(x.rate * 1000)} g/h`, `almacen.${v(x.m)} = ${jsNum(x.have)}; // gasta ${x.rate} kg/h`));
  const sorted = [...ins].sort((a, b) => a.hours - b.hours);
  // Ask which input runs out first only when one clearly does; otherwise what comes out in a day.
  const clear = sorted.length > 1 && sorted[1]!.hours - sorted[0]!.hours > 1e-6 * Math.max(1, sorted[1]!.hours);
  const balanceEx = clear
    ? choice(
        `${id}-entrada`,
        4,
        "predecir",
        "La que se acaba antes frena todo el proceso",
        "A toda marcha, ¿qué entrada del almacén se acaba antes?",
        [...stockBlocks, block("h", "horas = almacen / gasto", "const horas = almacen / gasto;")],
        name(sorted[0]!.m),
        ins.filter((x) => x !== sorted[0]).map((x) => name(x.m)),
      )
    : choice(
        `${id}-dia`,
        4,
        "predecir",
        "Un proceso continuo: lo que sale por hora, por las horas del día",
        `A toda marcha, ¿cuánto ${low(outId)} sale en un día?`,
        [block("s", `sale = ${fmtKg(outRate * 1000)} g por hora`, `const sale = ${jsNum(outRate)}; // kg/h`), block("d", "dia = sale · 24", "const dia = sale * 24;")],
        `${fmtKg(outRate * 24)} kg`,
        [`${fmtKg(outRate)} kg`, `${fmtKg(outRate * 60)} kg`, `${fmtKg(outRate / 24)} kg`],
      );
  const use = ctx.uses[outId] ?? "el almacén";
  const others = [...new Set(Object.values(ctx.uses))].filter((u) => u !== use);
  const pick = (k: number) => others[(hash(`${id}-${k}`) % Math.max(1, others.length)) | 0];
  const wrong = [...new Set([pick(1), pick(2), pick(3)].filter((x): x is string => !!x))].slice(0, 2);
  const useEx = choice(`${id}-destino`, 1, "predecir", "Nada se tira: cada salida alimenta otro sistema", `¿A dónde va el ${low(outId)} que sale?`, [block("o", `sale ${low(outId)}`, `const sale = "${outId}";`)], use, wrong.length ? wrong : ["el espacio", "la basura"]);
  return {
    id,
    kind: "ajustar-biorreactor",
    targetId: p.id,
    title: `Ajustar ${p.name.charAt(0).toLowerCase()}${p.name.slice(1)}`,
    scenario: `${fmtKg(ctx.powerKw)} kW · ${Object.entries(p.inputs)
      .map(([m, n]) => `${fmtKg(n * 1000)} g/h de ${low(m)}`)
      .join(" + ")} → ${Object.entries(p.outputs)
      .map(([m, n]) => `${fmtKg(n * 1000)} g/h de ${low(m)}`)
      .join(" + ")}`,
    exercises: [energyEx, balanceEx, useEx, order(`${id}-pasos`, "La ronda de mantenimiento, en orden", p.steps)],
  };
}
