import type { Chore } from "@modules/chores/domain/chore";
import { DONNING_STEPS } from "@modules/eva/application/station-eva-chores";
import type { Beat, Beats } from "../domain/station-beat";
import { S3_SOURCES as S } from "../data/sources";
import { TRAINING } from "../data/facts";
import { block, choice, order } from "./challenge-kit";
import { phase5Stations } from "./stations-phase5";

/**
 * The challenges of posts 1–4 and 7 of the initiation (and, from stations-phase5.ts, 5, 6, 8, 9, 11 and 12) (docs/design/santuario3-iniciacion.md §4.1; phase 4,
 * `s3-iniciacion-1`). Each is a chore of real steps with the real numbers and their source, and its beats: what is
 * seen happening at the post as each step is answered right (domain/station-beat.ts). The NBL post reuses the EMU's
 * suit-up steps of the spacewalk (modules/eva).
 */
export interface Station {
  readonly post: number;
  readonly machine: string;
  readonly chore: Chore;
  readonly beats: Beats;
  /** Where the numbers come from (shown on the sheet's card). */
  readonly sources: readonly string[];
}

const B = (her: Beat["her"], pose: Beat["pose"], trainer: Beat["trainer"], caption: string, things: Beat["things"] = [], times?: number): Beat => ({ her, pose, trainer, things, caption, ...(times ? { times } : {}) });

// ── 1. Arrival and selection (NASA: Become an astronaut) ──
export const SELECTION = { minYears: 3, jetHours: 750 } as const;
const SELECTION_STEPS = ["enviar la solicitud por USAJOBS", "comprobar ciudadanía, máster STEM y experiencia", "primera ronda de entrevistas en Johnson", "segunda ronda: entrevistas y reconocimiento médico", "nombrarla candidata a astronauta"];

function selection(): Station {
  const years = 2;
  const hours = 900;
  return {
    post: 1,
    machine: "medico-tribunal",
    sources: [S.nasaApply],
    chore: {
      id: "s3:puesto-1",
      kind: "iniciacion",
      title: "Selección: la solicitud y las entrevistas",
      scenario: "Ante el tribunal: los requisitos reales de la NASA, en el orden en que se pasan",
      exercises: [
        order("s3-seleccion-pasos", "Primero la solicitud y los requisitos; después dos rondas de entrevistas en Johnson", SELECTION_STEPS, "pasar a la piscina NBL antes de la selección"),
        choice(
          "s3-seleccion-cumple",
          { concept: 3, skill: "predecir", idea: `Hace falta el máster STEM y, además, ${SELECTION.minYears} años de experiencia o ${SELECTION.jetHours} h al mando de reactores`, question: "¿Cumple esta solicitud los requisitos?", code: [block("a", "master = sí", "const master = true;"), block("b", `anos = ${years}`, `const anos = ${years};`), block("c", `horasReactor = ${hours}`, `const horasReactor = ${hours};`), block("d", `cumple = master y (anos >= ${SELECTION.minYears} o horasReactor >= ${SELECTION.jetHours})`, `const cumple = master && (anos >= ${SELECTION.minYears} || horasReactor >= ${SELECTION.jetHours});`)] },
          "Sí: por las horas de vuelo",
          ["No: le falta un año de experiencia", "No: hace falta un doctorado", "Sí: basta con el máster"],
        ),
      ],
    },
    beats: [
      [
        B("silla", "mano-adelante", "mira", "Deja la solicitud sobre la mesa", [{ thing: "carpeta", at: "mesa" }]),
        B("silla", "sentada", "escribe", "El tribunal repasa los requisitos", [{ thing: "carpeta", at: "mano-entrenador" }]),
        B("silla", "sentada", "mira", "Primera ronda de entrevistas", [{ thing: "carpeta", at: "mesa" }]),
        B("silla", "sentada", "escribe", "Segunda ronda, con el informe médico", [{ thing: "carpeta", at: "mesa" }, { thing: "lista", at: "mano-entrenador" }]),
        B("silla", "de-pie", "da", "Candidata a astronauta: le dan la acreditación", [{ thing: "carpeta", at: "mesa" }, { thing: "acreditacion", at: "pecho" }]),
      ],
      [B("silla", "sentada", "escribe", "El tribunal sella la solicitud: cumple por las 900 h", [{ thing: "carpeta", at: "mesa" }, { thing: "sello", at: "mano-entrenador" }, { thing: "acreditacion", at: "pecho" }])],
    ],
  };
}

// ── 2. Medical (the long-duration flight physical; NASA's sheet FS-2011-11-057-JSC) ──
export const MEDICAL = { bpMax: { sys: 140, dia: 90 }, heightCm: { min: 157, max: 190 }, vision: "20/20" } as const;
const MEDICAL_STEPS = ["medir la estatura y el peso en la báscula", "tomar la tensión sentada con el manguito", "hacer el ECG tumbada con los electrodos", "leer la tabla de la vista con cada ojo"];

function medical(): Station {
  return {
    post: 2,
    machine: "medico-camilla",
    sources: [S.training, S.nasaApply],
    chore: {
      id: "s3:puesto-2",
      kind: "iniciacion",
      title: "Reconocimiento médico",
      scenario: "El reconocimiento de larga duración: medidas, tensión, corazón y vista, y qué sale de rango",
      exercises: [
        order("s3-medico-pasos", "Cada prueba en su sitio: báscula, camilla sentada, camilla tumbada y la tabla", MEDICAL_STEPS, "hacer el ECG de pie andando"),
        choice(
          "s3-medico-rango",
          { concept: 3, skill: "predecir", idea: `Tensión sentada hasta ${MEDICAL.bpMax.sys}/${MEDICAL.bpMax.dia}; estatura de 62 a 75 pulgadas (${MEDICAL.heightCm.min}–${MEDICAL.heightCm.max} cm); vista corregible a ${MEDICAL.vision}`, question: "¿Qué constante sale de rango?", code: [block("a", "tension = 148/92", "const tension = [148, 92];"), block("b", "estatura = 160 cm", "const estatura = 160;"), block("c", "vista = 20/20 con gafas", 'const vista = "20/20";'), block("d", `fuera = tension > ${MEDICAL.bpMax.sys}/${MEDICAL.bpMax.dia}`, `const fuera = tension[0] > ${MEDICAL.bpMax.sys} || tension[1] > ${MEDICAL.bpMax.dia};`)] },
          "La tensión: 148/92 pasa de 140/90",
          ["La estatura: 160 cm es poco", "La vista: lleva gafas", "Ninguna: todo en rango"],
        ),
      ],
    },
    beats: [
      [
        B("bascula", "de-pie", "escribe", "Báscula y tallímetro: 160 cm", [{ thing: "lista", at: "mano-entrenador" }]),
        B("camilla-sentada", "mano-adelante", "ayuda", "El manguito en el brazo: tensión sentada", [{ thing: "manguito", at: "brazo" }]),
        B("camilla-tumbada", "tumbada", "ayuda", "Tumbada, los electrodos en el pecho: ECG", [{ thing: "electrodos", at: "pecho" }]),
        B("tabla-vista", "de-pie", "mira", "Lee la tabla con cada ojo: 20/20", [{ thing: "tabla-vista", at: "pared" }]),
      ],
      [B("camilla-sentada", "mano-adelante", "escribe", "▲ Tensión 148/92: fuera de rango; se repite en reposo", [{ thing: "manguito", at: "brazo" }, { thing: "lista", at: "mano-entrenador" }])],
    ],
  };
}

// ── 3. Swimming and water survival (NASA's swim test; Pensacola) ──
export const SWIM = { lengths: 3, lengthM: 25, suitLengths: 3, treadMin: 10 } as const;
const SWIM_STEPS = [`nadar ${SWIM.lengths} largos de ${SWIM.lengthM} m sin parar`, "ponerse el mono de vuelo y las zapatillas", `nadar otros ${SWIM.suitLengths} largos con el mono`, `flotar ${SWIM.treadMin} minutos sin parar`, "subir a la balsa salvavidas", "engancharse al arnés y que la icen"];

function swim(): Station {
  const total = (SWIM.lengths + SWIM.suitLengths) * SWIM.lengthM;
  return {
    post: 3,
    machine: "nbl-supervivencia",
    sources: [S.training, S.pensacola],
    chore: {
      id: "s3:puesto-3",
      kind: "iniciacion",
      title: "Natación y supervivencia en el agua",
      scenario: "La prueba de natación de la NASA y lo que se hace tras un amerizaje (Pensacola)",
      exercises: [
        order("s3-agua-pasos", "Primero la prueba de natación; después, como tras un amerizaje: balsa e izado", SWIM_STEPS, "quitarse el mono para flotar"),
        choice(
          "s3-agua-metros",
          { concept: 2, skill: "predecir", idea: "Un bucle repite: dos bucles de 3 largos de 25 m", question: "¿Cuántos metros nada en total?", code: [block("a", "metros = 0", "let metros = 0;"), block("b", `repetir ${SWIM.lengths} veces: metros = metros + ${SWIM.lengthM}`, `for (let i = 0; i < ${SWIM.lengths}; i++) metros += ${SWIM.lengthM};`), block("c", `repetir ${SWIM.suitLengths} veces: metros = metros + ${SWIM.lengthM}`, `for (let i = 0; i < ${SWIM.suitLengths}; i++) metros += ${SWIM.lengthM};`)] },
          `${total} m`,
          [`${SWIM.lengths * SWIM.lengthM} m`, `${total + SWIM.lengthM} m`, `${total * 2} m`],
        ),
      ],
    },
    beats: [
      [
        B("largo", "nadando", "mira", `${SWIM.lengths} largos de ${SWIM.lengthM} m`, [], SWIM.lengths),
        B("borde", "brazos-arriba", "da", "El mono de vuelo y las zapatillas", [{ thing: "mono", at: "cuerpo" }]),
        B("largo", "nadando", "mira", `Otros ${SWIM.suitLengths} largos, con el mono`, [{ thing: "mono", at: "cuerpo" }], SWIM.suitLengths),
        B("flotando", "flotando", "mira", `${SWIM.treadMin} minutos flotando con el mono`, [{ thing: "mono", at: "cuerpo" }]),
        B("balsa", "sentada", "ayuda", "Sube a la balsa salvavidas", [{ thing: "mono", at: "cuerpo" }, { thing: "balsa", at: "agua" }]),
        B("izada", "brazos-arriba", "ayuda", "El arnés del rescate: la izan", [{ thing: "mono", at: "cuerpo" }, { thing: "balsa", at: "agua" }, { thing: "arnes", at: "cuerpo" }]),
      ],
      [B("borde", "de-pie", "escribe", `${total} m: prueba superada`, [{ thing: "mono", at: "cuerpo" }, { thing: "lista", at: "mano-entrenador" }])],
    ],
  };
}

// ── 4. Hypobaric chamber (Sonny Carter; time of useful consciousness, FAA AC 61-107B) ──
export const HYPOXIA: readonly { readonly ft: number; readonly tuc: string }[] = [
  { ft: 30000, tuc: "1–2 min" },
  { ft: 25000, tuc: "3–5 min" },
  { ft: 18000, tuc: "20–30 min" },
];
const CHAMBER_STEPS = ["prerrespirar oxígeno puro con la máscara", "subir la cámara a 25 000 pies", "quitarse la máscara", "anotar sus síntomas de hipoxia", "ponerse la máscara de O₂", "bajar la cámara a nivel del mar"];

/** Time of useful consciousness at this height (feet), from the table. */
export const usefulConsciousness = (ft: number): string => (HYPOXIA.find((h) => ft >= h.ft) ?? HYPOXIA.at(-1)!).tuc;

function chamber(): Station {
  return {
    post: 4,
    machine: "medico-hipobarica",
    sources: [S.training, S.faaHypoxia],
    chore: {
      id: "s3:puesto-4",
      kind: "iniciacion",
      title: "Cámara hipobárica",
      scenario: "Conocer sus propios síntomas de hipoxia, a salvo, y ponerse la máscara a tiempo",
      exercises: [
        order("s3-hipobarica-pasos", "Se prerrespira, se sube, se quita la máscara, se reconocen los síntomas y se la vuelve a poner antes de bajar", CHAMBER_STEPS, "subir sin prerrespirar"),
        choice(
          "s3-hipobarica-tuc",
          { concept: 3, skill: "predecir", idea: "Cuanto más alto, menos tiempo de consciencia útil: unas condiciones de mayor a menor", question: "¿Cuánto tiempo útil tiene sin máscara?", code: [block("a", "altura = 25000 pies", "const altura = 25000;"), block("b", 'si altura >= 30000: tiempo = "1–2 min"', 'if (altura >= 30000) tiempo = "1–2 min";'), block("c", 'si no, si altura >= 25000: tiempo = "3–5 min"', 'else if (altura >= 25000) tiempo = "3–5 min";'), block("d", 'si no: tiempo = "20–30 min"', 'else tiempo = "20–30 min";')] },
          usefulConsciousness(25000),
          ["1–2 min", "20–30 min", "Sin límite"],
        ),
      ],
    },
    beats: [
      [
        B("camara", "sentada", "mira", "Oxígeno puro con la máscara", [{ thing: "mascara", at: "cara" }]),
        B("camara", "sentada", "mira", "La cámara sube a 25 000 pies", [{ thing: "mascara", at: "cara" }]),
        B("camara", "sentada", "mira", "Se quita la máscara", [{ thing: "mascara", at: "mano-ella" }]),
        B("camara", "mareada", "mira", "Anota: hormigueo, calor, torpeza", [{ thing: "mascara", at: "mano-ella" }, { thing: "lista", at: "mano-ella" }]),
        B("camara", "sentada", "mira", "La máscara de O₂, a tiempo", [{ thing: "mascara", at: "cara" }]),
        B("camara", "sentada", "mira", "La cámara baja a nivel del mar", [{ thing: "mascara", at: "cara" }]),
      ],
      [B("camara", "sentada", "escribe", "A 25 000 pies: 3–5 minutos de consciencia útil", [{ thing: "mascara", at: "cara" }])],
    ],
  };
}

// ── 7. Neutral buoyancy (the NBL; the EMU's suit-up steps of the spacewalk) ──
function nbl(): Station {
  const pool = TRAINING.nblPool.value;
  return {
    post: 7,
    machine: "nbl-piscina",
    sources: [S.nbl, S.nblSheet],
    chore: {
      id: "s3:puesto-7",
      kind: "iniciacion",
      title: "Piscina de flotabilidad neutra",
      scenario: `La NBL: ${pool.x} × ${pool.z} m y ${pool.depth} m de fondo; los buzos lastran el traje hasta que ni sube ni baja`,
      exercises: [
        order("s3-nbl-traje", "El traje se pone de dentro afuera y no se entra en el agua sin comprobar fugas (los mismos pasos que en Quest)", DONNING_STEPS, "meterse en el agua sin el casco"),
        choice(
          "s3-nbl-lastre",
          { concept: 3, skill: "completar", idea: "Flotabilidad neutra: si sube se añade plomo, si baja se añade espuma", question: "El traje sube con 2 kg de empuje: ¿qué hacen los buzos?", code: [block("a", "empuje = +2 kg (sube)", "const empuje = 2;"), block("b", "si empuje > 0: añadir plomo(empuje)", "if (empuje > 0) anadirPlomo(empuje);"), block("c", "si empuje < 0: añadir espuma(-empuje)", "else if (empuje < 0) anadirEspuma(-empuje);")] },
          "Añadir 2 kg de plomo",
          ["Añadir 2 kg de espuma", "Quitarle el casco", "Nada: ya es neutra"],
        ),
      ],
    },
    beats: [
      [
        B("banco-traje", "brazos-arriba", "ayuda", "La prenda de refrigeración (LCVG)", [{ thing: "prenda-lcvg", at: "cuerpo" }]),
        B("banco-traje", "de-pie", "ayuda", "El pantalón del traje", [{ thing: "prenda-lcvg", at: "cuerpo" }, { thing: "pantalon-emu", at: "cuerpo" }]),
        B("banco-traje", "brazos-arriba", "ayuda", "Por debajo en el torso rígido", [{ thing: "pantalon-emu", at: "cuerpo" }, { thing: "torso-emu", at: "cuerpo" }]),
        B("banco-traje", "de-pie", "ayuda", "Guantes y casco", [{ thing: "pantalon-emu", at: "cuerpo" }, { thing: "torso-emu", at: "cuerpo" }, { thing: "casco", at: "cara" }]),
        B("banco-traje", "mano-adelante", "mira", "Comprueba fugas en el pecho", [{ thing: "pantalon-emu", at: "cuerpo" }, { thing: "torso-emu", at: "cuerpo" }, { thing: "casco", at: "cara" }]),
      ],
      [B("fondo", "neutra", "ayuda", "Los buzos le ponen 2 kg de plomo: ni sube ni baja", [{ thing: "pantalon-emu", at: "cuerpo" }, { thing: "torso-emu", at: "cuerpo" }, { thing: "casco", at: "cara" }, { thing: "plomo", at: "cintura" }])],
    ],
  };
}

/** Posts 1–4 and 7, by post. */
export function stations(): Station[] {
  return [selection(), medical(), swim(), chamber(), nbl(), ...phase5Stations()].sort((a, b) => a.post - b.post);
}

export const stationFor = (post: number): Station | undefined => stations().find((s) => s.post === post);
