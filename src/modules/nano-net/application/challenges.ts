import type { ChoiceExercise, CodeBlock, Concept, OrderExercise } from "@modules/mind-duel/domain/exercise";
import type { Chore } from "@modules/chores/domain/chore";
import { toCall } from "@modules/chores/application/catalog";
import { NANO_TUNING, ringNodeCount, type Fault, type NanoCore, type RemoteNet, type Stage } from "../domain/core";
import type { CoreSite } from "../domain/network";

/** A core site with the asteroid's real numbers (mass and μ = G·M come from its sourced data). */
export interface NanoSite extends CoreSite {
  readonly massKg: number;
  /** Standard gravitational parameter μ = G·M, m³/s². */
  readonly muM3S2: number;
}

// --- Helpers -----------------------------------------------------------------

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const block = (id: string, pseudo: string, js = toCall(pseudo), indent?: number): CodeBlock => (indent ? { id, pseudo, js, indent } : { id, pseudo, js });
const lines = (pairs: readonly (readonly [string, string, number?])[]): CodeBlock[] => pairs.map(([p, j, ind], i) => block(String.fromCharCode(97 + i), p, j, ind));

function order(id: string, concept: Concept, idea: string, blocks: readonly CodeBlock[]): OrderExercise {
  return { kind: "order", id, concept, idea, blocks, solution: blocks.map((b) => b.id) };
}
const steps = (id: string, idea: string, list: readonly string[]) => order(id, 1, idea, lines(list.map((s) => [s, toCall(s)] as const)));

/** Choice with the right answer at a stable position that depends on the id. */
function choice(id: string, concept: Concept, skill: ChoiceExercise["skill"], idea: string, question: string, code: readonly CodeBlock[], right: string, wrong: readonly string[]): ChoiceExercise {
  const options = [...new Set(wrong.filter((w) => w !== right))];
  const at = hash(id) % (options.length + 1);
  options.splice(at, 0, right);
  return { kind: "choice", id, concept, skill, idea, question, code, options, correct: at };
}

/** The 2023 draft's mechanic (Nevaeh's nano_net letters): `let name = value` as four tokens in order. */
function declare(id: string, idea: string, name: string, value: string, pseudoValue = value): OrderExercise {
  return order(id, 2, idea, [block("a", "variable", "let"), block("b", name, name), block("c", "=", "="), block("d", pseudoValue, value)]);
}

/** Spanish decimal comma with `d` significant decimals. */
const num = (v: number, d = 2) => v.toFixed(d).replace(".", ",");
const km = (m: number) => `${num(m / 1000, 0)} km`;
const ROLE_NAME = { energia: "energía", escudo: "escudo", impulso: "impulso" } as const;

// --- The core's program, as code lines ----------------------------------------

/** What the core has learned so far, one line per stage, with its real and tuned values. */
export function coreCode(core: NanoCore, site: NanoSite): CodeBlock[] {
  const T = NANO_TUNING;
  const v = Math.sqrt(site.muM3S2 / core.ringRadiusM);
  const out = [block("nucleo", `núcleo = Núcleo(${site.name}, radio ${Math.round(site.radiusM)} m, μ ${num(site.muM3S2)} m³/s²)`, `const nucleo = new Nucleo("${site.id}", { radioM: ${Math.round(site.radiusM)}, mu: ${num(site.muM3S2).replace(",", ".")} });`)];
  for (const s of core.learned) {
    if (s === "generar") out.push(block("generar", `generar(${T.firstNodes} nodos, roles [energía, escudo, impulso])`, `nucleo.generar(${T.firstNodes}, ["energia", "escudo", "impulso"]);`));
    if (s === "mover") out.push(block("mover", `mover(nodos, anillo a ${Math.round(core.ringRadiusM)} m, v ${num(v, 3)} m/s)`, `nucleo.mover(nodos, { radioM: ${Math.round(core.ringRadiusM)}, v: ${v.toFixed(3)} });`));
    if (s === "cubrir") out.push(block("cubrir", `enlazar(nodo i, nodo (i + 1) % ${core.nodes.length})`, `nodos.forEach((n, i) => enlazar(n, nodos[(i + 1) % ${core.nodes.length}]));`));
    if (s === "enlazar" && core.linkedTo) out.push(block("enlazar", `enlazarRed(${core.linkedTo.name}, ${km(core.linkedTo.position.sub(core.position).length())})`, `nucleo.enlazarRed("${core.linkedTo.id}");`));
  }
  return out;
}

// --- Converting a persuaded asteroid into a core -------------------------------

export function convertChore(site: NanoSite): Chore {
  const mu = site.muM3S2;
  return {
    id: `nano-convertir-${site.id}`,
    kind: "nano-convertir",
    targetId: site.id,
    title: `Convertir ${site.name} en núcleo`,
    scenario: `${site.name} ya obedece: su mente puede aprender a ser una célula madre de la nano_net`,
    exercises: [
      steps(`nano-convertir-${site.id}-semilla`, "Siembra en mí la semilla", ["anclar el módulo al regolito", "leer la mente persuadida", "escribir el programa semilla", "arrancar el núcleo"]),
      choice(
        `nano-convertir-${site.id}-mu`,
        3,
        "predecir",
        "¿Cuánto tiro de lo que me rodea?",
        `El núcleo guarda su parámetro gravitatorio μ = G · M (masa real ${num(site.massKg / 1e10)} × 10¹⁰ kg). ¿Cuánto vale μ?`,
        lines([
          ["variable G = 6,674 × 10⁻¹¹", "let G = 6.674e-11;"],
          [`variable masa = ${num(site.massKg / 1e10)} × 10¹⁰`, `let masa = ${site.massKg.toExponential(3)};`],
          ["variable mu = G × masa", "let mu = G * masa;"],
        ]),
        `${num(mu)} m³/s²`,
        [`${num(mu * 10)} m³/s²`, `${num(mu / 10, 3)} m³/s²`],
      ),
      // From the 2023 draft (number.js): the network's pulse rate.
      declare(`nano-convertir-${site.id}-pulso`, "Mi corazón late despacio", "pulsosPorHora", "20"),
    ],
  };
}

// --- Programming a stage ----------------------------------------------------------

export function stageChore(core: NanoCore, site: NanoSite, stage: Stage, remote?: RemoteNet): Chore {
  const T = NANO_TUNING;
  const id = `nano-${stage}-${core.id}`;
  const base = { id, kind: "nano-programar" as const, targetId: core.id };
  switch (stage) {
    case "generar":
      return {
        ...base,
        title: `${site.name}: aprender a generar nodos`,
        scenario: `Etapa 1 de 4: el núcleo moldea nodos con su propio regolito`,
        exercises: [
          order(
            `${id}-bucle`,
            6,
            "Quiero tener hijos",
            lines([
              [`para i desde 0 hasta ${T.firstNodes - 1} hacer`, `for (let i = 0; i < ${T.firstNodes}; i++) {`],
              ["nodo = moldear(regolito)", "const nodo = moldear(regolito);", 1],
              ["nodo.rol = roles[i % 3]", "nodo.rol = roles[i % 3];", 1],
              [`lanzar(nodo, ${T.bornAltitudeM} m)`, `lanzar(nodo, ${T.bornAltitudeM});`, 1],
              ["fin", "}"],
            ]),
          ),
          choice(
            `${id}-rol`,
            4,
            "predecir",
            "¿Qué será mi segundo hijo?",
            "¿Qué rol tiene el nodo con i = 1?",
            lines([
              ["variable roles = [energía, escudo, impulso]", 'const roles = ["energia", "escudo", "impulso"];'],
              ["nodo.rol = roles[i % 3]", "nodo.rol = roles[i % 3];"],
            ]),
            "escudo",
            ["energía", "impulso"],
          ),
          // From the 2023 draft (number.js).
          declare(`${id}-capas`, "Ondas apiladas", "capasDeOnda", "10"),
        ],
      };
    case "mover": {
      const r = core.ringRadiusM;
      const v = Math.sqrt(site.muM3S2 / r);
      return {
        ...base,
        title: `${site.name}: aprender a mover nodos`,
        scenario: `Etapa 2 de 4: subir los nodos a un anillo a ${T.ringAltitudeM} m y dejarlos en órbita`,
        exercises: [
          steps(`${id}-maniobra`, "Llevo a mis hijos lejos", ["encender el propulsor del nodo", `subir hasta ${T.ringAltitudeM} m`, "girar hacia la dirección de la órbita", "acelerar hasta la velocidad orbital"]),
          choice(
            `${id}-v`,
            3,
            "completar",
            "¿A qué velocidad no se caen?",
            `Órbita circular real: v = √(μ / r). Con μ = ${num(site.muM3S2)} m³/s² y r = ${Math.round(r)} m, ¿qué valor falta?`,
            lines([
              [`variable r = ${Math.round(r)}`, `let r = ${Math.round(r)};`],
              ["nodo.velocidad = ___", "nodo.velocidad = ___;"],
            ]),
            `${num(v, 3)} m/s`,
            [`${num(site.muM3S2 / r, 4)} m/s`, `${num(Math.sqrt(site.muM3S2 * r), 1)} m/s`],
          ),
          declare(`${id}-giros`, "Gira, gira", "girosPorHora", "60"),
        ],
      };
    }
    case "cubrir": {
      const r = core.ringRadiusM;
      const n = ringNodeCount(r, T.linkRangeM);
      return {
        ...base,
        title: `${site.name}: aprender a cubrir un área`,
        scenario: `Etapa 3 de 4: generar los nodos que faltan y enlazar el anillo`,
        exercises: [
          choice(
            `${id}-cuantos`,
            3,
            "predecir",
            "¿Cuántos hijos para cerrar el anillo?",
            `Cada enlace alcanza ${T.linkRangeM} m. ¿Cuánto vale nodos?`,
            lines([
              [`variable perimetro = 2 × π × ${Math.round(r)}`, `let perimetro = 2 * Math.PI * ${Math.round(r)};`],
              [`variable nodos = techo(perimetro / ${T.linkRangeM})`, `let nodos = Math.ceil(perimetro / ${T.linkRangeM});`],
            ]),
            String(n),
            [String(n - 1), String(T.firstNodes), String(n * 2)],
          ),
          order(
            `${id}-anillo`,
            6,
            "Que cada hijo dé la mano al siguiente",
            lines([
              ["para i desde 0 hasta nodos - 1 hacer", "for (let i = 0; i < nodos; i++) {"],
              ["vecino = (i + 1) % nodos", "const vecino = (i + 1) % nodos;", 1],
              ["enlazar(red[i], red[vecino])", "enlazar(red[i], red[vecino]);", 1],
              ["fin", "}"],
            ]),
          ),
          choice(
            `${id}-modulo`,
            3,
            "completar",
            "El último con el primero",
            `Con ${n} nodos, el nodo ${n - 1} debe enlazarse con el 0. ¿Qué operador falta?`,
            lines([["vecino = (i + 1) ___ nodos", "const vecino = (i + 1) ___ nodos;"]]),
            "%",
            ["/", "-", "*"],
          ),
          // From the 2023 draft (text.js).
          declare(`${id}-codigo`, "El código de toda la red", "codigoGlobal", "'3396815'"),
        ],
      };
    }
    case "enlazar": {
      const d = remote ? remote.position.sub(core.position).length() : Infinity;
      const name = remote?.name ?? "otra red";
      return {
        ...base,
        title: `${site.name}: enlazar con ${name}`,
        scenario: `Etapa 4 de 4: unir la red de ${site.name} con ${name} (${Number.isFinite(d) ? km(d) : "sin red cerca"})`,
        exercises: [
          choice(
            `${id}-si`,
            4,
            "predecir",
            "¿Llego hasta ella?",
            "¿Qué hace el programa?",
            lines([
              [`variable distancia = ${num(d / 1000, 0)} km`, `let distancia = ${Math.round(d / 1000)}; // km`],
              [`variable alcance = ${num(T.netLinkRangeM / 1000, 0)} km`, `let alcance = ${T.netLinkRangeM / 1000}; // km`],
              ["si distancia < alcance entonces", "if (distancia < alcance) {"],
              [`enlazarRed(${name})`, `enlazarRed("${remote?.id ?? "otra"}");`, 1],
              ["si no", "} else {"],
              ["esperar()", "esperar();", 1],
              ["fin", "}"],
            ]),
            d < T.netLinkRangeM ? `enlaza con ${name}` : "espera",
            [d < T.netLinkRangeM ? "espera" : `enlaza con ${name}`, "da un error"],
          ),
          steps(`${id}-saludo`, "Hola, red vecina", ["apuntar la antena a la otra red", "enviar el código de la red", "esperar la respuesta", "abrir el corredor"]),
          // From the 2023 draft (text.js).
          declare(`${id}-onda`, "El código de las ondas", "codigoOnda", "'8819618'"),
        ],
      };
    }
  }
}

// --- Repairs ----------------------------------------------------------------------

/** Repairing is done landed on the core: find what broke in its program and fix it. */
export function repairNanoChore(core: NanoCore, site: NanoSite, fault: Fault, seq = 0): Chore {
  const base = { id: `nano-reparar-${fault.id}`, kind: "nano-reparar" as const, targetId: fault.id };
  if (fault.target === "nodo") {
    const node = core.nodes.find((n) => n.id === fault.nodeId)!;
    const label = (id: string) => `N${id.split("-n").pop()}`;
    const shown = core.nodes.slice(0, 6).includes(node) ? core.nodes.slice(0, 6) : [...core.nodes.slice(0, 5), node];
    const pct = (h: number) => `${Math.round(h * 100)} %`;
    const nameN = label(node.id);
    return {
      ...base,
      title: `Reparar el nodo ${nameN} de ${site.name}`,
      scenario: `El nodo ${nameN} (${ROLE_NAME[node.role]}) está al ${pct(node.health)}: no da nada a la red`,
      exercises: [
        choice(
          `${base.id}-${seq}-cual`,
          4,
          "predecir",
          "Uno de mis hijos calla",
          `El núcleo apaga los nodos con salud < ${num(NANO_TUNING.brokenBelow, 1)}. ¿Cuál apagó?`,
          [
            block("si", `si nodo.salud < ${num(NANO_TUNING.brokenBelow, 1)} entonces apagar(nodo)`, `if (nodo.salud < ${NANO_TUNING.brokenBelow}) apagar(nodo);`),
            ...shown.map((n) => block(n.id, `${label(n.id)} = Nodo(${ROLE_NAME[n.role]}, salud ${num(n.health, 1)})`, `const ${label(n.id)} = new Nodo("${n.role}", { salud: ${n.health.toFixed(1)} });`)),
          ],
          nameN,
          shown.filter((n) => n !== node).map((n) => label(n.id)),
        ),
        steps(`${base.id}-${seq}-dron`, "Cúrame a distancia", ["mandar un dron de mantenimiento", "cambiar el panel dañado", "recalibrar la antena", "encender el nodo"]),
        // From the 2023 draft (boolean.js): modules switched off by an energy anomaly.
        choice(
          `${base.id}-${seq}-encender`,
          2,
          "completar",
          "Verdadero no es texto",
          `¿Qué valor vuelve a encender ${nameN}?`,
          [block("a", `${nameN}Encendido = ___`, `${nameN}Encendido = ___;`)],
          "verdadero",
          ["'verdadero'", "falso"],
        ),
      ],
    };
  }
  // The program: one learned line was corrupted.
  const code = coreCode(core, site);
  const broken = code.length > 1 ? 1 + (hash(`${fault.id}-${seq}`) % (code.length - 1)) : 0;
  const corrupt = (b: CodeBlock): CodeBlock => ({
    ...b,
    pseudo: b.pseudo.replace(/% /, "/ ").replace(/(\d+) (m|nodos|km)\b/, (_, n: string, u: string) => `-${n} ${u}`),
    js: b.js.replace(/% /, "/ ").replace(/(\d+)/, "-$1"),
  });
  const shown = code.map((b, i) => (i === broken ? corrupt(b) : b));
  return {
    ...base,
    title: `Reparar el programa de ${site.name}`,
    scenario: `El programa del núcleo se corrompió: la red se desincronizó y no da nada`,
    exercises: [
      choice(`${base.id}-${seq}-linea`, 2, "reparar", "Algo en mí no cuadra", "¿Qué línea del núcleo está corrupta?", shown, shown[broken]!.pseudo, shown.filter((_, i) => i !== broken).map((b) => b.pseudo)),
      steps(`${base.id}-${seq}-reinicio`, "Vuelve a ponerme en orden", ["aislar el núcleo de la red", "restaurar el programa desde la copia", "comprobar cada etapa", "reconectar los nodos"]),
      // From the 2023 draft (text.js).
      declare(`${base.id}-${seq}-pulso`, "El código del pulso", "codigoPulso", "'441319'"),
    ],
  };
}


/** What broke, in words: "el nodo N3 (escudo)" or "el programa del núcleo". */
export function faultWhat(core: NanoCore, fault: Fault): string {
  if (fault.target === "programa") return "el programa del núcleo";
  const node = core.nodes.find((n) => n.id === fault.nodeId);
  return `el nodo N${fault.nodeId?.split("-n").pop()}${node ? ` (${ROLE_NAME[node.role]})` : ""}`;
}
