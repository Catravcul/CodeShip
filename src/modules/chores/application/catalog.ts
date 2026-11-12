import type { ChoiceExercise, CodeBlock, Concept, Exercise, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Plant } from "@modules/garden/domain/plant";
import { PLANT_TUNING } from "@modules/garden/domain/plant";
import { FOOD_KCAL_PER_G, MER_FACTOR, RER, type Cat } from "@modules/pets/domain/cat";
import type { AnimalLesson } from "@modules/pets/data/rules";
import { DOG_DIET, type Dog } from "@modules/pets/domain/dog";
import type { Process } from "@modules/kitchen/data/processes";
import { itemName } from "@modules/kitchen/data/items";
import { portionNutrients } from "@modules/kitchen/data/nutrition";
import { Bioreactor, CULTURE } from "@modules/cultured-meat/domain/bioreactor";
import { HEN_TUNING, LAYING_LIGHT_HOURS, type Hen } from "@modules/poultry/domain/hen";
import type { Machine } from "@modules/life-support/domain/machine";
import type { Condition, Patient } from "@modules/medical/domain/health";
import { ABCDE, PROTOCOLS } from "@modules/medical/data/protocols";
import type { ShipDesign } from "@modules/ship/domain/ship";
import type { Recipe } from "@modules/kitchen/data/recipes";
import type { Breath, YogaSequence } from "@modules/wellness/data/yoga";
import type { Chore } from "../domain/chore";

// --- Helpers that turn data into exercises -----------------------------------

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

/** "lava las hojas" → "lavaLasHojas();" */
export function toCall(step: string): string {
  const words = step
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 4);
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase())).join("") + "();";
}

const block = (id: string, pseudo: string, js = toCall(pseudo), indent?: number): CodeBlock => (indent ? { id, pseudo, js, indent } : { id, pseudo, js });

function order(id: string, concept: Concept, idea: string, steps: readonly string[]): OrderExercise {
  const blocks = steps.map((s, i) => block(String.fromCharCode(97 + i), s));
  return { kind: "order", id, concept, idea, blocks, solution: blocks.map((b) => b.id) };
}

/** Choice with the right answer at a stable position that depends on the id. */
function choice(
  id: string,
  concept: Concept,
  skill: ChoiceExercise["skill"],
  idea: string,
  question: string,
  code: readonly CodeBlock[],
  right: string,
  wrong: readonly string[],
): ChoiceExercise {
  const options = [...new Set([...wrong.filter((w) => w !== right)])];
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, concept, skill, idea, question, code, options, correct: at };
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ","));

// --- Plants ------------------------------------------------------------------

export function plantChores(p: Plant, scenario?: string): Chore[] {
  if (!p.alive) return [];
  const name = `${p.species.name} (${p.id})`;
  const out: Chore[] = [];
  if (p.health < 0.7) {
    const h = Math.round(p.health * 10) / 10;
    out.push({
      id: `curar-${p.id}`,
      kind: "curar-planta",
      targetId: p.id,
      title: `Curar ${name}`,
      scenario: scenario ?? `${name} está dañada`,
      exercises: [
        order(`curar-${p.id}-pasos`, 1, "Mis hojas rotas me quitan fuerza", ["revisar las hojas", "cortar las hojas dañadas", "asegurar la maceta", "regar la base"]),
        choice(
          `curar-${p.id}-salud`,
          2,
          "predecir",
          "¿Cuánto me recupero?",
          "¿Cuánto vale salud al final?",
          [block("a", `guardar ${fmt(h)} en salud`, `let salud = ${h};`), block("b", `sumar ${fmt(PLANT_TUNING.tendHeal)} a salud`, `salud = salud + ${PLANT_TUNING.tendHeal};`)],
          fmt(Math.min(1, Math.round((h + PLANT_TUNING.tendHeal) * 10) / 10)),
          [fmt(h), fmt(PLANT_TUNING.tendHeal), `${fmt(h)}${fmt(PLANT_TUNING.tendHeal)}`],
        ),
      ],
    });
  }
  if (p.water < 0.4) {
    out.push({
      id: `regar-${p.id}`,
      kind: "regar",
      targetId: p.id,
      title: `Regar ${name}`,
      scenario: `El sustrato de ${name} se está secando`,
      exercises: [
        choice(
          `regar-${p.id}-umbral`,
          4,
          "completar",
          "Tengo sed",
          "¿Qué valor falta para regar cuando le quede menos del 40 % de agua?",
          [block("a", "si maceta.agua < ___ entonces", "if (maceta.agua < ___) {"), block("b", "regar(maceta)", "regar(maceta);", 1), block("c", "fin", "}")],
          "0,4",
          ["40", "\"poca\""],
        ),
        order(`regar-${p.id}-pasos`, 1, "Que el agua llegue a las raíces", ["llenar la regadera", "regar la base del tallo", "comprobar que drena"]),
      ],
    });
  }
  if (p.flowering && !p.shaken) {
    out.push({
      id: `agitar-${p.id}`,
      kind: "agitar",
      targetId: p.id,
      title: `Polinizar ${name}`,
      scenario: `${name} ha florecido: sin agitarla no dará fruto`,
      exercises: [
        choice(
          `agitar-${p.id}-orden`,
          10,
          "especificar",
          "Mis flores esperan",
          `¿Qué orden poliniza ${p.species.name.toLowerCase()} en la nave?`,
          [],
          "Agita la planta con suavidad para que el polen caiga en sus flores",
          ["Corta las flores para que salgan frutos", "Riega las flores directamente"],
        ),
        order(`agitar-${p.id}-pasos`, 1, "Muévete con cuidado", ["sujetar la maceta", "agitar el tallo con suavidad", "repetir en cada flor abierta"]),
      ],
    });
  }
  if (p.readyToHarvest && !p.species.forCats) {
    const fruit = !p.species.needsShaking.value || p.shaken;
    const portions = fruit ? (p.health >= 0.5 ? 2 : 1) : 0;
    out.push({
      id: `cosechar-${p.id}`,
      kind: "cosechar",
      targetId: p.id,
      title: `Cosechar ${name}`,
      scenario: `${name} está lista para cosechar`,
      exercises: [
        order(`cosechar-${p.id}-pasos`, 1, "Ya estoy madura", ["comprobar que está madura", "cortar con tijeras limpias", "guardar en la despensa"]),
        choice(
          `cosechar-${p.id}-porciones`,
          5,
          "predecir",
          "¿Cuánto doy?",
          "¿Cuántas porciones dará?",
          [
            block("a", `guardar ${fmt(Math.round(p.health * 10) / 10)} en salud`, `let salud = ${Math.round(p.health * 10) / 10};`),
            block("b", `guardar ${fruit ? "verdadero" : "falso"} en dioFruto`, `let dioFruto = ${fruit};`),
            block("c", "si no dioFruto entonces porciones = 0", "if (!dioFruto) porciones = 0;"),
            block("d", "si no, si salud >= 0,5 entonces porciones = 2", "else if (salud >= 0.5) porciones = 2;"),
            block("e", "si no porciones = 1", "else porciones = 1;"),
          ],
          String(portions),
          ["0", "1", "2"],
        ),
      ],
    });
  }
  return out;
}

// --- Cats --------------------------------------------------------------------

/** What the cats can eat right now (grams). Cats are obligate carnivores: no crops. */
export interface CatFood {
  readonly meatG: number;
  readonly kibbleG: number;
}

/** Grams of a cat's meal: half its daily energy, from meat if there is enough, else stored kibble. */
export function catMeal(c: Cat, food: CatFood): { kcal: number; food: "meat" | "kibble"; grams: number } | undefined {
  const kcal = Math.round((RER.value(c.massKg) * MER_FACTOR.value[c.lifeStage]) / 2);
  const meat = Math.round(kcal / FOOD_KCAL_PER_G.value.meat);
  if (food.meatG >= meat) return { kcal, food: "meat", grams: meat };
  const kibble = Math.round(kcal / FOOD_KCAL_PER_G.value.kibble);
  if (food.kibbleG >= kibble) return { kcal, food: "kibble", grams: kibble };
  return undefined;
}

export function catChores(c: Cat, scenario?: string, food: CatFood = { meatG: Infinity, kibbleG: Infinity }): Chore[] {
  const out: Chore[] = [];
  const meal = catMeal(c, food);
  if (c.satiety < 0.5 && meal) {
    const rer = RER.value(c.massKg);
    const factor = MER_FACTOR.value[c.lifeStage];
    const kcalPerG = FOOD_KCAL_PER_G.value[meal.food];
    const what = meal.food === "meat" ? "carne cultivada" : "pienso";
    out.push({
      id: `alimentar-${c.id}`,
      kind: "alimentar-gato",
      targetId: c.id,
      title: `Dar de comer a ${c.name}`,
      scenario: `${c.name} maúlla junto a su comedero (${what})`,
      exercises: [
        choice(
          `alimentar-${c.id}-racion`,
          4,
          "predecir",
          "Tengo hambre, humano",
          `¿Cuántas kcal lleva esta comida para ${c.name} (${fmt(c.massKg)} kg)?`,
          [
            block("a", `guardar 70 × ${fmt(c.massKg)}^0,75 en reposo`, `const reposo = 70 * ${c.massKg} ** 0.75; // ≈ ${Math.round(rer)}`),
            block("b", `guardar reposo × ${fmt(factor)} en diario`, `const diario = reposo * ${factor};`),
            block("c", "guardar diario ÷ 2 en comida", "const comida = diario / 2; // dos comidas al día"),
          ],
          `${meal.kcal} kcal`,
          [`${Math.round(rer / 2)} kcal`, `${Math.round(rer * factor)} kcal`, `${Math.round(meal.kcal * 2.5)} kcal`],
        ),
        choice(
          `alimentar-${c.id}-gramos`,
          4,
          "predecir",
          "Soy carnívoro: nada de lechuga",
          `La ${what} da ${fmt(kcalPerG)} kcal por gramo. ¿Cuántos gramos sirves?`,
          [block("a", `guardar ${meal.kcal} ÷ ${fmt(kcalPerG)} en gramos`, `const gramos = Math.round(${meal.kcal} / ${kcalPerG});`)],
          `${meal.grams} g`,
          [`${Math.round(meal.kcal * kcalPerG)} g`, `${meal.kcal} g`, `${Math.round(meal.grams / 3)} g`],
        ),
        order(`alimentar-${c.id}-pasos`, 1, "Así me gusta", ["pesar la ración", "servirla en su comedero", "cambiar el agua"]),
      ],
    });
  }
  if (c.stress > 0.5) {
    out.push({
      id: `calmar-${c.id}`,
      kind: "calmar-gato",
      targetId: c.id,
      title: `Calmar a ${c.name}`,
      scenario: scenario ?? `${c.name} está asustado`,
      exercises: [
        choice(
          `calmar-${c.id}-orejas`,
          5,
          "predecir",
          "No me toques todavía",
          `${c.name} tiene las orejas hacia atrás. ¿Qué hace el programa?`,
          [
            block("a", 'si gato.orejas == "atrás" entonces', "if (gato.orejas === 'atrás') {"),
            block("b", "esperar a distancia", "esperar();", 1),
            block("c", "si no", "} else {"),
            block("d", "jugar con la caña", "jugar(gato);", 1),
            block("e", "fin", "}"),
          ],
          "Espera a distancia",
          ["Juega con la caña", "Lo coge en brazos"],
        ),
        order(`calmar-${c.id}-pasos`, 1, "Necesito sentirme a salvo", ["hablar en voz baja", "dejarle su escondite", "jugar con la caña cuando se acerque"]),
      ],
    });
  }
  return out;
}

// --- Step chains: one challenge per step ------------------------------------

const PARAM = /\{([^}]+)\}/;
/** "cocina hasta {71|50|100} °C" → "cocina hasta 71 °C" */
export const plainStep = (step: string): string => step.replace(PARAM, (_, g: string) => g.split("|")[0]!);

/**
 * A procedure where each step is one challenge: pick the step that comes next (the last two are shown
 * as code), or fill in the real value when the step carries one (`{right|wrong|wrong}`).
 */
export function stepChain(idBase: string, concept: Concept, idea: (i: number) => string, steps: readonly string[], pool: readonly string[]): Exercise[] {
  const plain = steps.map(plainStep);
  return steps.map((step, i) => {
    const prev = plain.slice(Math.max(0, i - 2), i).map((q, k) => {
      const n = Math.max(0, i - 2) + k;
      return block(String(n), `${n + 1}. ${q}`, toCall(q));
    });
    const id = `${idBase}-${i + 1}`;
    const param = PARAM.exec(step);
    if (param) {
      const [right, ...wrong] = param[1]!.split("|");
      const unit = step.slice(param.index + param[0].length).trim().split(" ")[0] ?? "";
      const u = (v: string) => (unit ? `${v} ${unit}` : v);
      const gap = step.replace(PARAM, "___");
      return choice(id, 2, "completar", idea(i), `Paso ${i + 1} de ${steps.length}: ¿qué valor falta?`, [...prev, block("x", `${i + 1}. ${gap}`, toCall(gap.replace("___", "")).replace("();", "(___);"))], u(right!), wrong.map(u));
    }
    const later = plain[i + 1] ?? plain.find((_, k) => k < i - 2);
    const foreign = pool.find((x) => !plain.includes(x) && x !== later) ?? "tira todo a la basura";
    const wrong = [later, foreign].filter((x): x is string => !!x && x !== plain[i]);
    if (wrong.length < 2) wrong.push("espera sin hacer nada");
    return choice(id, concept, "predecir", idea(i), i === 0 ? `¿Con qué paso empieza? (${steps.length} pasos)` : `Paso ${i + 1} de ${steps.length}: ¿qué viene ahora?`, prev, plain[i]!, wrong);
  });
}

// --- Kitchen -----------------------------------------------------------------

/** Steps of other procedures, used as plausible wrong answers. */
export const stepPool = (lists: readonly (readonly string[])[]): string[] => [...new Set(lists.flat().map(plainStep))];

const listItems = (r: Readonly<Record<string, number>>) =>
  Object.entries(r)
    .map(([k, n]) => `${n} ${itemName(k)}`)
    .join(", ");

/** Each recipe step is one challenge. */
export function cookingChore(r: Recipe, pool: readonly string[] = []): Chore {
  const uses = Object.keys(r.ingredients).length ? listItems(r.ingredients) : "solo despensa seca";
  return {
    id: `cocinar-${r.id}`,
    kind: "cocinar",
    targetId: r.id,
    machine: "cocina",
    title: `Cocinar ${r.name}`,
    scenario: `Usa ${uses} → ${r.portions} ${r.portions === 1 ? "porción" : "porciones"} de ${Math.round(portionNutrients(r).kcal)} kcal`,
    exercises: stepChain(`cocinar-${r.id}`, 1, (i) => `${r.name}: paso ${i + 1}`, r.steps.value, pool),
  };
}

/** A machine turns a harvest into an ingredient; each step is one challenge. */
export function processChore(p: Process, pool: readonly string[] = []): Chore {
  return {
    id: `procesar-${p.id}`,
    kind: "procesar",
    targetId: p.id,
    machine: p.machine,
    title: p.name,
    scenario: `${listItems(p.inputs)} → ${listItems(p.outputs)}`,
    exercises: stepChain(`procesar-${p.id}`, 1, (i) => `${p.name}: paso ${i + 1}`, p.steps.value, pool),
  };
}

// --- Yoga --------------------------------------------------------------------

const BREATHS: readonly Breath[] = ["inhala", "exhala", "retén"];

/** One challenge per posture: pick what comes next (posture and breath). Solving it moves the body into it. */
export function yogaChore(seq: YogaSequence): Chore {
  const ps = seq.postures.value;
  const label = (i: number) => `${ps[i]!.name} · ${ps[i]!.breath}`;
  const exercises = ps.map((p, i) => {
    const prev = ps.slice(Math.max(0, i - 2), i).map((q, k) => {
      const n = Math.max(0, i - 2) + k;
      return block(String(n), `${n + 1}. ${q.name} · ${q.breath}`, `postura(${n + 1}, "${q.name}", "${q.breath}");`);
    });
    const otherBreath = BREATHS.find((b) => b !== p.breath)!;
    const other = ps.find((q) => q.name !== p.name && q.name !== ps[i - 1]?.name) ?? ps[(i + 1) % ps.length]!;
    return choice(
      `yoga-${seq.id}-${i + 1}`,
      1,
      "predecir",
      p.cue,
      i === 0 ? `¿Con qué postura empieza ${seq.name}?` : `Postura ${i + 1} de ${ps.length}: ¿qué viene ahora?`,
      prev,
      label(i),
      [`${p.name} · ${otherBreath}`, `${other.name} · ${other.breath}`],
    );
  });
  return { id: `yoga-${seq.id}`, kind: "yoga", targetId: seq.id, title: seq.name, scenario: `${ps.length} posturas, una por reto`, exercises };
}

// --- Ship --------------------------------------------------------------------

/** The ship's class as code lines, with real values from its design. */
const shortName = (n: string) => n.replace(/^Aerojet Rocketdyne /, "").replace(/\s*\(.*\)$/, "");

export function shipCode(design: ShipDesign): CodeBlock[] {
  const main = { ...design.mainEngines[0]!.model, name: shortName(design.mainEngines[0]!.model.name) };
  const rcs = { ...design.rcs[0]!.model, name: shortName(design.rcs[0]!.model.name) };
  const tank = (i: number) => design.tanks[i]!;
  return [
    block("motor", `motor = ${main.name}(empuje ${main.thrustN} N, Isp ${main.ispS} s)`, `this.motor = new Propulsor("${main.id}", { empujeN: ${main.thrustN}, ispS: ${main.ispS} });`),
    block("rcs", `rcs = ${design.rcs.length} × ${rcs.name}(empuje ${rcs.thrustN} N, Isp ${rcs.ispS} s)`, `this.rcs = repetir(${design.rcs.length}, () => new Propulsor("${rcs.id}", { empujeN: ${rcs.thrustN}, ispS: ${rcs.ispS} }));`),
    ...[0, 1].map((i) =>
      block(`tanque${i}`, `tanque${i + 1} = Tanque(${tank(i).spec.propellant}, ${tank(i).spec.capacityKg} kg)`, `this.tanque${i + 1} = new Tanque("${tank(i).spec.propellant}", { capacidadKg: ${tank(i).spec.capacityKg} });`),
    ),
    block("casco", `casco = Casco(${design.hull.dryMassKg} kg)`, `this.casco = new Casco({ masaKg: ${design.hull.dryMassKg} });`),
  ];
}

/** Repair = find the line the damage corrupted in the ship's code, then restore its real value. */
export function repairChore(design: ShipDesign, hull: number, seed: number, scenario?: string): Chore {
  const code = shipCode(design);
  const main = { ...design.mainEngines[0]!.model, name: shortName(design.mainEngines[0]!.model.name) };
  const broken = seed % code.length;
  const corrupt = (b: CodeBlock): CodeBlock => ({
    ...b,
    pseudo: b.pseudo.replace(/(\d+)( N| kg)/, (_, n: string, u: string) => `${Number(n) * 10}${u}`).replace(/Isp (\d+)/, "Isp -$1"),
    js: b.js.replace(/(\d+)(?=[,} ])/, (n) => String(Number(n) * 10)),
  });
  const shown = code.map((b, i) => (i === broken ? corrupt(b) : b));
  return {
    id: `reparar-nave-${seed}`,
    kind: "reparar-nave",
    title: "Reparar la nave",
    scenario: scenario ?? `Casco al ${Math.round(hull * 100)} %`,
    exercises: [
      choice(`reparar-${seed}-linea`, 2, "reparar", "Algo en mí no cuadra", "¿Qué línea de la nave está dañada?", shown, shown[broken]!.pseudo, shown.filter((_, i) => i !== broken).map((b) => b.pseudo)),
      choice(
        `reparar-${seed}-valor`,
        2,
        "completar",
        "Recuérdame quién soy",
        `¿Qué empuje real tiene el motor ${main.name}?`,
        [block("a", "motor.empuje = ___ N", "this.motor.empujeN = ___;")],
        String(main.thrustN),
        [String(main.thrustN * 10), String(Math.round(main.thrustN / 10))],
      ),
    ],
  };
}

// --- Cats: programming their minds ------------------------------------------

/** Writing a rule into a cat's mind is a chore too: the lesson's ideas, in order. */
/** Write a rule into any animal's mind (cat, dog or hen): one challenge per idea of the lesson. */
export function lessonChore(a: { id: string; name: string }, lesson: AnimalLesson, scenario: string): Chore {
  return {
    id: `programar-${a.id}-${lesson.rule.id}`,
    kind: "programar-animal",
    targetId: a.id,
    title: `Programar a ${a.name}: ${lesson.rule.id.replace(/^(gato|perro|gallina)-/, "").replace(/-/g, " ")}`,
    scenario,
    exercises: lesson.exercises,
  };
}
/** @deprecated name kept for older call sites. */
export const catLessonChore = lessonChore;

// --- Dogs --------------------------------------------------------------------

export interface DogFood {
  readonly meatG: number;
  readonly eggs: number;
}

/** Half a day's energy: cultured meat if there is enough, otherwise eggs (dogs are not obligate carnivores). */
export function dogMeal(d: Dog, food: DogFood): { kcal: number; food: "meat" | "egg"; amount: number } | undefined {
  const kcal = Math.round(d.dailyKcal / 2);
  const meat = Math.round(kcal / DOG_DIET.value.meatKcalPerG);
  if (food.meatG >= meat) return { kcal, food: "meat", amount: meat };
  const eggs = Math.max(1, Math.round(kcal / DOG_DIET.value.eggKcal));
  if (food.eggs >= eggs) return { kcal, food: "egg", amount: eggs };
  return undefined;
}

export function dogChores(d: Dog, scenario?: string, food: DogFood = { meatG: Infinity, eggs: Infinity }): Chore[] {
  const out: Chore[] = [];
  const meal = dogMeal(d, food);
  if (d.satiety < 0.5 && meal) {
    const rer = RER.value(d.massKg);
    const factor = Math.round((d.dailyKcal / rer) * 10) / 10;
    const right = meal.food === "meat" ? `${meal.amount} g de carne` : `${meal.amount} ${meal.amount === 1 ? "huevo" : "huevos"}`;
    out.push({
      id: `alimentar-${d.id}`,
      kind: "alimentar-perro",
      targetId: d.id,
      title: `Dar de comer a ${d.name}`,
      scenario: `${d.name} gimotea y da vueltas junto a su cuenco`,
      exercises: [
        choice(
          `alimentar-${d.id}-racion`,
          4,
          "predecir",
          "¡Comida, comida!",
          `${d.name} es un ${d.breed} de ${fmt(d.massKg)} kg. ¿Cuántas kcal lleva su comida?`,
          [
            block("a", `guardar 70 × ${fmt(d.massKg)}^0,75 en reposo`, `const reposo = 70 * ${d.massKg} ** 0.75; // ≈ ${Math.round(rer)}`),
            block("b", `guardar reposo × ${fmt(factor)} en diario`, `const diario = reposo * ${factor};`),
            block("c", "guardar diario ÷ 2 en comida", "const comida = diario / 2;"),
          ],
          `${meal.kcal} kcal`,
          [`${Math.round(rer / 2)} kcal`, `${Math.round(rer * factor)} kcal`, `${meal.kcal * 3} kcal`],
        ),
        choice(
          `alimentar-${d.id}-que`,
          5,
          "predecir",
          "Como de todo, pero poquito",
          meal.food === "meat"
            ? `La carne cultivada da ${fmt(DOG_DIET.value.meatKcalPerG)} kcal/g. ¿Qué sirves?`
            : `No queda carne; un huevo da ${DOG_DIET.value.eggKcal} kcal. ¿Qué sirves?`,
          [
            block("a", "si despensa.carne ≥ comida ÷ 1,2 entonces", "if (despensa.carne >= comida / 1.2) {"),
            block("b", "servir carne", "servir('carne', Math.round(comida / 1.2));", 1),
            block("c", "si no", "} else {"),
            block("d", "servir huevos cocidos", `servir('huevo', Math.round(comida / ${DOG_DIET.value.eggKcal}));`, 1),
            block("e", "fin", "}"),
          ],
          right,
          meal.food === "meat" ? [`${meal.kcal} g de carne`, `${Math.round(meal.amount / 4)} g de carne`, "un plato de lechuga"] : [`${meal.amount + 3} huevos`, "un huevo crudo con cáscara", "nada"],
        ),
        order(`alimentar-${d.id}-pasos`, 1, "Siéntate… ¡bien!", ["pedirle que se siente", "servir la ración", "cambiar el agua"]),
      ],
    });
  }
  if (d.stress > 0.5 || d.play < 0.4) {
    out.push({
      id: `jugar-${d.id}`,
      kind: "jugar-perro",
      targetId: d.id,
      title: `Jugar con ${d.name}`,
      scenario: scenario ?? (d.stress > 0.5 ? `${d.name} tiembla y ladra a todo` : `${d.name} te trae su pelota`),
      exercises: [
        choice(
          `jugar-${d.id}-cola`,
          5,
          "predecir",
          "¿Jugamos?",
          `${d.name} baja el pecho y levanta la cola (reverencia de juego). ¿Qué hace el programa?`,
          [
            block("a", "si perro.reverencia entonces", "if (perro.reverencia) {"),
            block("b", "lanzar la pelota", "lanzar('pelota');", 1),
            block("c", "si no", "} else {"),
            block("d", "acariciarlo despacio", "acariciar(perro);", 1),
            block("e", "fin", "}"),
          ],
          "Lanza la pelota",
          ["Lo acaricia despacio", "Lo ignora"],
        ),
        order(`jugar-${d.id}-pasos`, 1, "Un paseo por la cubierta", ["ponerle el arnés", "pasear por la cubierta de cultivo", "jugar a la pelota", "darle agua al volver"]),
      ],
    });
  }
  return out;
}

/** Program the automatic coop door so the hens range free by day and are shut in at night. */
export function coopDoorChore(): Chore {
  return {
    id: "abrir-gallinero",
    kind: "abrir-gallinero",
    machine: "gallinero",
    title: "Programar la puerta del gallinero",
    scenario: "Las gallinas pueden vivir libres por la nave: escarbar en la cubierta de cultivo y volver a dormir al gallinero",
    exercises: [
      {
        kind: "order",
        id: "puerta-gallinero-orden",
        concept: 9,
        idea: "Al amanecer queremos salir",
        blocks: [
          block("a", "cuando amanezca", "on('amanecer', () => {"),
          block("b", "abrir la puerta", "puerta.abrir();", 1),
          block("c", "fin", "});"),
          block("d", "cuando anochezca", "on('anochecer', () => {"),
          block("e", "contar las gallinas dentro", "const dentro = sensor.contar();", 1),
          block("f", "cerrar la puerta si están todas", "if (dentro === gallinas.length) puerta.cerrar();", 1),
          block("g", "fin", "});"),
        ],
        solution: ["a", "b", "c", "d", "e", "f", "g"],
      },
      choice(
        "puerta-gallinero-predecir",
        5,
        "predecir",
        "Clara se quedó fuera",
        "Al anochecer hay 2 gallinas dentro de 3. ¿Qué hace la puerta?",
        [block("a", "si dentro == gallinas.longitud entonces", "if (dentro === gallinas.length) {"), block("b", "cerrar()", "puerta.cerrar();", 1), block("c", "fin", "}")],
        "Se queda abierta hasta que entre la que falta",
        ["Se cierra", "Se cierra y vuelve a abrir"],
      ),
    ],
  };
}

// --- Hens --------------------------------------------------------------------

export function henChores(hens: readonly Hen[], nestEggs: number, feedDays: number, lightHours: number): Chore[] {
  const out: Chore[] = [];
  if (hens.length === 0) return out;
  const hungry = hens.filter((h) => h.satiety < 0.5);
  if (hungry.length && feedDays >= 1) {
    const grams = hens.length * HEN_TUNING.feedPerHenG;
    out.push({
      id: "alimentar-gallinas",
      kind: "alimentar-gallinas",
      machine: "gallinero",
      title: "Dar de comer a las gallinas",
      scenario: `${hungry.map((h) => h.name).join(", ")} picotean el comedero vacío`,
      exercises: [
        choice(
          "gallinas-racion",
          4,
          "predecir",
          "Co-co-co",
          `¿Cuánto pienso al día para ${hens.length} gallinas?`,
          [block("a", `guardar ${hens.length} en gallinas`, `const gallinas = ${hens.length};`), block("b", `guardar gallinas × ${HEN_TUNING.feedPerHenG} g en pienso`, `const pienso = gallinas * ${HEN_TUNING.feedPerHenG}; // g`)],
          `${grams} g`,
          [`${HEN_TUNING.feedPerHenG} g`, `${grams * 10} g`, `${hens.length} g`],
        ),
        choice(
          "gallinas-luz",
          4,
          "completar",
          "Sin luz no hay huevos",
          "¿Cuántas horas de luz como mínimo para que pongan?",
          [block("a", "si horasDeLuz >= ___ entonces", "if (horasDeLuz >= ___) {"), block("b", "poner(huevo)", "poner(huevo);", 1), block("c", "fin", "}")],
          `${LAYING_LIGHT_HOURS.value[0]} h`,
          ["6 h", "24 h"],
        ),
        order("gallinas-pasos", 1, "Comida, agua y calma", ["llenar el comedero", "limpiar el bebedero", "revisar que todas comen"]),
      ],
    });
  }
  if (nestEggs > 0) {
    out.push({
      id: "recoger-huevos",
      kind: "recoger-huevos",
      machine: "gallinero",
      title: "Recoger huevos",
      scenario: `Hay ${nestEggs} ${nestEggs === 1 ? "huevo" : "huevos"} en los ponederos${lightHours < LAYING_LIGHT_HOURS.value[0] ? " (con poca luz pondrán menos)" : ""}`,
      exercises: [
        choice(
          "huevos-bucle",
          6,
          "predecir",
          "Con cuidado, que se rompen",
          "¿Cuántos huevos hay en la cesta al final?",
          [
            block("a", "guardar 0 en cesta", "let cesta = 0;"),
            block("b", `para cada ponedero de ${nestEggs} con huevo`, `for (const p of ponederosConHuevo) { // ${nestEggs}`),
            block("c", "sumar 1 a cesta", "cesta = cesta + 1;", 1),
            block("d", "fin", "}"),
          ],
          String(nestEggs),
          [String(nestEggs + 1), "0", "1"].filter((x) => x !== String(nestEggs)),
        ),
        order("huevos-pasos", 1, "Del nido a la nevera", ["recoger los huevos con cuidado", "limpiar los que estén sucios", "guardarlos en la nevera"]),
      ],
    });
  }
  return out;
}

// --- Cultured meat -----------------------------------------------------------

const sci = (n: number) => {
  const e = Math.floor(Math.log10(n));
  const m = n / 10 ** e;
  return `${fmt(Math.round(m * 10) / 10)}·10^${e}`;
};

/** Each stage of the bioreactor is a chore; each of its steps is a challenge. */
export function bioreactorChores(b: Bioreactor, mediumLots: number, scenario?: string): Chore[] {
  const C = CULTURE.value;
  const base = { machine: "biorreactor" as const };
  switch (b.stage) {
    case "vacio":
      if (mediumLots < 1) return [];
      return [
        {
          ...base,
          id: "cultivo-sembrar",
          kind: "cultivo-sembrar",
          title: "Sembrar el biorreactor",
          scenario: `Descongelar un vial de ${sci(C.vialCells)} células. Queda${mediumLots === 1 ? "" : "n"} ${mediumLots} lote${mediumLots === 1 ? "" : "s"} de medio`,
          exercises: [
            ...stepChain("cultivo-sembrar", 1, () => "Despierto del frío", ["saca un vial del tanque de nitrógeno", "descongélalo a 37 °C", "filtra el medio a 0,2 µm", "llena el biorreactor con medio", "siembra las células con microportadores", "fija la temperatura a {37|20|60} °C"], []),
            choice(
              "cultivo-duplicaciones",
              6,
              "predecir",
              "¿Cuántas veces tengo que dividirme?",
              `Empiezas con ${sci(C.vialCells)} células y necesitas ${sci(C.targetCells)}. ¿Cuántas duplicaciones?`,
              [block("a", `guardar ${sci(C.vialCells)} en células`, "let celulas = 1e9;"), block("b", "mientras células < 5·10^11", "while (celulas < 5e11) {"), block("c", "duplicar células", "celulas = celulas * 2;", 1), block("d", "fin", "}")],
              "9",
              ["500", "2", "30"],
            ),
          ],
        },
      ];
    case "proliferando":
      if (!b.needsMedium || mediumLots < 1) return [];
      return [
        {
          ...base,
          id: "cultivo-renovar",
          kind: "cultivo-renovar",
          title: "Renovar el medio del cultivo",
          scenario: scenario ?? `pH ${fmt(Math.round(b.ph * 100) / 100)}, glucosa ${Math.round(b.glucose * 100)} %: las células comen glucosa y sueltan lactato`,
          exercises: [
            choice(
              "cultivo-ph",
              4,
              "completar",
              "Me ahoga el ácido",
              "¿Por debajo de qué pH hay que renovar el medio?",
              [block("a", "si sonda.pH < ___ entonces", "if (sonda.pH < ___) {"), block("b", "renovarMedio()", "renovarMedio();", 1), block("c", "añadirBicarbonato()", "anadirBicarbonato();", 1), block("d", "fin", "}")],
              fmt(C.ph[0]),
              ["5", "9"],
            ),
            order("cultivo-renovar-pasos", 1, "Comida fresca, por favor", ["para la agitación un momento", "saca el medio gastado", "añade medio fresco", "corrige el pH con bicarbonato", "reanuda la agitación"]),
          ],
        },
      ];
    case "listo-para-diferenciar":
      return [
        {
          ...base,
          id: "cultivo-diferenciar",
          kind: "cultivo-diferenciar",
          title: "Diferenciar en fibras musculares",
          scenario: `${sci(b.cells)} células: hora de convertirlas en músculo`,
          exercises: stepChain("cultivo-diferenciar", 1, () => "Quiero ser fibra", ["baja los factores de crecimiento", "pasa las células al andamio comestible", "activa el estirador", "deja que se fusionen en miotubos"], []),
        },
      ];
    case "listo":
      return [
        {
          ...base,
          id: "cultivo-cosechar",
          kind: "cultivo-cosechar",
          title: "Cosechar carne cultivada",
          scenario: `${b.yieldG} g de carne, sin sacrificar a ningún animal`,
          exercises: [
            choice(
              "cultivo-gramos",
              2,
              "predecir",
              "¿Cuánto peso?",
              `Un gramo de músculo tiene ${sci(C.cellsPerGram)} células. ¿Cuántos gramos dan ${sci(b.cells)}?`,
              [block("a", `guardar ${sci(b.cells)} ÷ ${sci(C.cellsPerGram)} en gramos`, `const gramos = ${b.cells.toExponential(1)} / ${C.cellsPerGram.toExponential(1)};`)],
              `${b.yieldG} g`,
              [`${Math.round(b.yieldG / 10)} g`, `${b.yieldG * 10} g`],
            ),
            ...stepChain("cultivo-cosechar", 1, () => "Listo para la cámara fría", ["separa el tejido del andamio", "lávalo en la centrífuga", "forma las piezas", "guárdalas en la cámara fría a {4|20|-80} °C"], []),
          ],
        },
      ];
    case "contaminado":
    case "perdido":
      return [
        {
          ...base,
          id: "cultivo-esterilizar",
          kind: "cultivo-esterilizar",
          title: "Esterilizar el biorreactor",
          scenario: scenario ?? (b.stage === "perdido" ? "El pH bajó demasiado: el cultivo murió" : "Entraron bacterias: hay que tirar el lote"),
          exercises: stepChain("cultivo-esterilizar", 1, () => "Empezar de cero, limpio", ["vacía el biorreactor", "desmonta las sondas", "esteriliza en el autoclave a {121|60|300} °C", "monta y prueba el tanque"], []),
        },
      ];
    default:
      return [];
  }
}

// --- Machines ----------------------------------------------------------------

/** Repairing a machine: its repair steps in order, then restoring one of its real settings. */
export function machineRepairChore(m: Machine, seed: number, scenario?: string): Chore {
  const s = m.spec.settings[seed % m.spec.settings.length]!;
  const u = (v: number) => `${fmt(v)}${s.unit ? ` ${s.unit}` : ""}`;
  return {
    id: `reparar-${m.id}`,
    kind: "reparar-maquina",
    targetId: m.id,
    machine: m.id,
    title: `Reparar ${m.spec.name.toLowerCase()}`,
    scenario: scenario ?? `${m.spec.name} al ${Math.round(m.condition * 100)} %`,
    exercises: [
      order(`reparar-${m.id}-pasos`, 1, "Algo se soltó dentro de mí", m.spec.repairSteps),
      choice(
        `reparar-${m.id}-ajuste`,
        2,
        "completar",
        "Recuérdame cómo funciono",
        `¿Qué valor real lleva ${s.name}?`,
        [block("a", `${s.name} = ___`, `this.${toCall(s.name).replace("();", "")} = ___;`)],
        u(s.value),
        s.wrong.map(u),
      ),
    ],
  };
}

// --- Sickbay -----------------------------------------------------------------

/** Treating a patient: triage with ABCDE, then the protocol for the condition, one step per challenge. */
export function patientChore(p: Patient, c: Condition, pool: readonly string[] = []): Chore {
  const protocol = PROTOCOLS[c.kind];
  const sev = Math.round(c.severity * 100);
  return {
    id: `atender-${c.id}`,
    kind: "atender-paciente",
    targetId: p.id,
    conditionId: c.id,
    machine: "enfermeria",
    title: `Enfermería: ${protocol.name.toLowerCase()} de ${p.name}`,
    scenario: `${c.cause} (gravedad ${sev} %)`,
    exercises: [
      choice(
        `atender-${c.id}-triaje`,
        1,
        "predecir",
        "Primero, lo que mata antes",
        `Triaje ABCDE de ${p.name}: ¿qué revisas primero?`,
        [],
        ABCDE.value[0]!,
        [ABCDE.value[2]!, "la herida que más se ve"],
      ),
      ...stepChain(`atender-${c.id}`, 1, (i) => `${p.name}: paso ${i + 1}`, protocol.steps.value, pool),
    ],
  };
}

export const allChoreExercises = (chores: readonly Chore[]): Exercise[] => chores.flatMap((c) => c.exercises);
