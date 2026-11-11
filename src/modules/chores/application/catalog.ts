import type { ChoiceExercise, CodeBlock, Concept, Exercise, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Plant } from "@modules/garden/domain/plant";
import { PLANT_TUNING } from "@modules/garden/domain/plant";
import { MER_FACTOR, RER, type Cat } from "@modules/pets/domain/cat";
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
          "¿Qué orden poliniza el chile en la nave?",
          [],
          "Agita la planta con suavidad para que el polen caiga en sus flores",
          ["Corta las flores para que salgan frutos", "Riega las flores directamente"],
        ),
        order(`agitar-${p.id}-pasos`, 1, "Muévete con cuidado", ["sujetar la maceta", "agitar el tallo con suavidad", "repetir en cada flor abierta"]),
      ],
    });
  }
  if (p.readyToHarvest) {
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

export function catChores(c: Cat, scenario?: string): Chore[] {
  const out: Chore[] = [];
  if (c.satiety < 0.5) {
    const rer = RER.value(c.massKg);
    const factor = MER_FACTOR.value[c.lifeStage];
    const meal = Math.round((rer * factor) / 2);
    out.push({
      id: `alimentar-${c.id}`,
      kind: "alimentar-gato",
      targetId: c.id,
      title: `Dar de comer a ${c.name}`,
      scenario: `${c.name} maúlla junto a su comedero`,
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
          `${meal} kcal`,
          [`${Math.round(rer / 2)} kcal`, `${Math.round(rer * factor)} kcal`, `${Math.round(meal * 2.5)} kcal`],
        ),
        order(`alimentar-${c.id}-pasos`, 1, "Así me gusta", ["medir la ración", "servirla en su comedero", "cambiar el agua"]),
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

// --- Kitchen -----------------------------------------------------------------

/** Each recipe becomes ordering challenges: its steps split into halves (Parsons problems). */
export function cookingChore(r: Recipe): Chore {
  const steps = r.steps.value;
  const half = Math.ceil(steps.length / 2);
  return {
    id: `cocinar-${r.id}`,
    kind: "cocinar",
    targetId: r.id,
    title: `Cocinar ${r.name}`,
    scenario: `Hay ingredientes para ${r.name.toLowerCase()} (${r.portions} porciones)`,
    exercises: [order(`cocinar-${r.id}-1`, 1, "Primero, preparar", steps.slice(0, half)), order(`cocinar-${r.id}-2`, 1, "Después, cocinar y servir", steps.slice(half))],
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

export const allChoreExercises = (chores: readonly Chore[]): Exercise[] => chores.flatMap((c) => c.exercises);
