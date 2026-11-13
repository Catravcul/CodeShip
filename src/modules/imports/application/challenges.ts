import type { Chore } from "@modules/chores/domain/chore";
import { block, choice, fmtKg, jsNum, order } from "@modules/station/application/challenges";
import type { ImportQuote } from "../domain/quote";
import type { TowPlan } from "../domain/tug";
import type { MassDriverSpec } from "../domain/mass-driver";
import { USD_PER_CREDIT } from "../domain/wallet";

const es = (v: number, d = 0) => v.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
const kmS = (ms: number) => `${es(ms / 1000, 1)} km/s`;
const hrs = (h: number) => `${es(h, h < 10 ? 1 : 0)} h`;

/**
 * Ordering from the Sanctuary: work out what has to go up to low Earth orbit (the rocket equation's
 * multiplier), what that costs, then order the flight from the launch pad to the station's arm.
 */
export function orderChore(label: string, q: ImportQuote, launcherName: string): Chore {
  const id = `importar-${label.replace(/\W+/g, "-").toLowerCase()}`;
  const leo = choice(
    `${id}-leo`,
    4,
    "predecir",
    "Para llegar al cinturón, cada kilo necesita muchos kilos de propelente que se queman por el camino",
    "¿Cuántos kg hay que subir a la órbita baja?",
    [
      block("m", `masa = ${fmtKg(q.massKg)} kg`, `const masa = ${jsNum(q.massKg)};`),
      block("x", `multiplicador = ${fmtKg(q.leoKgPerKg)}  // dos etapas, ${kmS(q.transfer.departMs)} y ${kmS(q.transfer.arriveMs)}`, `const multiplicador = ${jsNum(q.leoKgPerKg)};`),
      block("l", "enLEO = masa · multiplicador", "const enLEO = masa * multiplicador;"),
    ],
    `${fmtKg(q.leoKg)} kg`,
    [`${fmtKg(q.massKg / q.leoKgPerKg)} kg`, `${fmtKg(q.massKg + q.leoKgPerKg)} kg`, `${fmtKg(q.massKg)} kg`],
  );
  const cost = choice(
    `${id}-coste`,
    4,
    "predecir",
    "Se paga cada kilo que sube, no solo el que llega",
    "¿Cuántos créditos cuesta el pedido?",
    [
      block("l", `enLEO = ${fmtKg(q.leoKg)} kg`, `const enLEO = ${jsNum(q.leoKg)};`),
      block("p", `precio = ${es(q.usdPerKgLeo)} US$/kg  // ${launcherName}`, `const precio = ${q.usdPerKgLeo};`),
      block("c", `credito = ${es(USD_PER_CREDIT)} US$`, `const credito = ${USD_PER_CREDIT};`),
      block("t", "coste = techo(enLEO · precio / credito)", "const coste = Math.ceil(enLEO * precio / credito);"),
    ],
    `${es(q.credits)} créditos`,
    [`${es(Math.ceil((q.massKg * q.usdPerKgLeo) / USD_PER_CREDIT))} créditos`, `${es(Math.ceil(q.usd))} créditos`, `${es(Math.ceil(q.credits / 10))} créditos`],
  );
  return {
    id,
    kind: "importar",
    title: `Pedir al Santuario: ${label}`,
    scenario: `${fmtKg(q.massKg)} kg en ${launcherName} · ${es(q.transitDays)} días de Hohmann`,
    exercises: [
      leo,
      cost,
      order(`${id}-pasos`, "Del Santuario a la estación", [
        `el Santuario carga el pedido en el ${launcherName}`,
        "el cohete lo sube a la órbita baja",
        `la etapa de salida enciende ${kmS(q.transfer.departMs)}`,
        "la etapa vacía se suelta",
        `la carga cruza ${es(q.transitDays)} días por la elipse de Hohmann`,
        `la etapa de llegada enciende ${kmS(q.transfer.arriveMs)}`,
        "el brazo de la estación atrapa la carga",
      ]),
    ],
  };
}

/** A tug haul: the boulder's mass from its size, the time back with it, then the capture in order. */
export function towChore(bodyName: string, diameterM: number, densityKgM3: number, distanceM: number, plan: TowPlan, tugDryKg: number): Chore {
  const id = `remolcar-${bodyName.replace(/\W+/g, "-").toLowerCase()}`;
  const mass = choice(
    `${id}-masa`,
    4,
    "predecir",
    "Una roca es casi una esfera: su masa crece con el cubo del diámetro",
    "¿Cuánto pesa la roca que vas a remolcar?",
    [
      block("d", `diametro = ${fmtKg(diameterM)} m`, `const diametro = ${jsNum(diameterM)};`),
      block("r", `densidad = ${es(densityKgM3)} kg/m³  // ${bodyName}`, `const densidad = ${densityKgM3};`),
      block("m", "masa = densidad · π / 6 · diametro³", "const masa = densidad * Math.PI / 6 * diametro ** 3;"),
    ],
    `${es(plan.boulderKg)} kg`,
    [`${es(densityKgM3 * (Math.PI / 6) * diameterM ** 2)} kg`, `${es(densityKgM3 * (4 / 3) * Math.PI * diameterM ** 3)} kg`, `${es(densityKgM3 * diameterM)} kg`],
  );
  const total = tugDryKg + plan.boulderKg;
  const a = plan.thrustN / total;
  const back = choice(
    `${id}-vuelta`,
    5,
    "predecir",
    "Empuja la mitad del camino y frena la otra mitad",
    "¿Cuántas horas tarda la vuelta con la roca?",
    [
      block("f", `empuje = ${fmtKg(plan.thrustN)} N`, `const empuje = ${jsNum(plan.thrustN)};`),
      block("m", `masa = ${es(total)} kg  // remolcador + roca`, `const masa = ${Math.round(total)};`),
      block("a", "aceleracion = empuje / masa", "const aceleracion = empuje / masa;"),
      block("d", `distancia = ${es(distanceM)} m`, `const distancia = ${Math.round(distanceM)};`),
      block("t", "horas = 2 · √(distancia / aceleracion) / 3600", "const horas = 2 * Math.sqrt(distancia / aceleracion) / 3600;"),
    ],
    hrs((2 * Math.sqrt(distanceM / a)) / 3600),
    [hrs(Math.sqrt(distanceM / a) / 3600), hrs(distanceM / a / 3600 / 1000), hrs((2 * distanceM) / Math.sqrt(a) / 3600 / 100)],
  );
  return {
    id,
    kind: "importar",
    title: `Remolcar una roca de ${bodyName}`,
    scenario: `Roca de ${fmtKg(diameterM)} m · ${hrs(plan.totalHours)} ida y vuelta`,
    exercises: [
      mass,
      back,
      order(`${id}-pasos`, "Como la opción B de ARM", [
        `vuela hasta ${bodyName} con los propulsores Hall`,
        "baja despacio sobre la roca elegida",
        "cierra los brazos alrededor de la roca",
        "levanta la roca con las patas",
        "enciende los propulsores hacia la estación",
        "da la vuelta a mitad de camino y frena",
        "deja la roca junto a la estación",
      ]),
    ],
  };
}

/** Installing a mass driver on a body: the packages' flight time, their energy, then the install steps. */
export function installChore(bodyName: string, distanceM: number, spec: MassDriverSpec): Chore {
  const id = `lanzador-${bodyName.replace(/\W+/g, "-").toLowerCase()}`;
  const v = spec.launchSpeedMs;
  const flight = choice(
    `${id}-vuelo`,
    4,
    "predecir",
    "Fuera del asteroide nada lo frena: vuela recto a velocidad constante",
    "¿Cuántos segundos tarda un paquete en llegar a la estación?",
    [
      block("d", `distancia = ${es(distanceM)} m`, `const distancia = ${Math.round(distanceM)};`),
      block("v", `velocidad = ${v} m/s`, `const velocidad = ${v};`),
      block("t", "segundos = distancia / velocidad", "const segundos = distancia / velocidad;"),
    ],
    `${es(distanceM / v)} s`,
    [`${es(distanceM * v)} s`, `${es(v / distanceM, 3)} s`, `${es((distanceM / v) * 2)} s`],
  );
  const energy = choice(
    `${id}-energia`,
    4,
    "predecir",
    "La energía de un disparo es la cinética del paquete",
    "¿Cuánta energía da cada disparo?",
    [
      block("m", `masa = ${fmtKg(spec.packageKg)} kg`, `const masa = ${jsNum(spec.packageKg)};`),
      block("v", `velocidad = ${v} m/s`, `const velocidad = ${v};`),
      block("e", "energia = ½ · masa · velocidad²", "const energia = 0.5 * masa * velocidad ** 2;"),
    ],
    `${es((0.5 * spec.packageKg * v * v) / 1000, 1)} kJ`,
    [`${es((spec.packageKg * v * v) / 1000, 1)} kJ`, `${es((0.5 * spec.packageKg * v) / 1000, 1)} kJ`, `${es((0.5 * spec.packageKg * v * v) / 1e6, 3)} kJ`],
  );
  return {
    id,
    kind: "importar",
    title: `Montar el lanzador de masas en ${bodyName}`,
    scenario: `Paquetes de ${fmtKg(spec.packageKg)} kg a ${v} m/s · uno cada ${hrs(spec.packHours)}`,
    exercises: [
      flight,
      energy,
      order(`${id}-pasos`, "Del hangar a la superficie", [
        `lleva el lanzador hasta ${bodyName}`,
        "ancla los raíles en la roca",
        "apunta las bobinas a la estación",
        "despliega el minero y la tolva",
        "dispara un cubo de prueba",
        "monta la red de captura en la estación",
      ]),
    ],
  };
}
