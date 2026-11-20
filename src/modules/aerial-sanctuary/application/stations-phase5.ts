import type { Chore } from "@modules/chores/domain/chore";
import { armChore } from "@modules/robotics/application/arm-chores";
import { IDSS_CONTACT_LIMITS } from "@modules/mothership/data/mothership";
import type { Beat } from "../domain/station-beat";
import { S3_SOURCES as S } from "../data/sources";
import { ANSMET, CENTRIFUGE, COLD, GLACIER, TRAINING, ZERO_G } from "../data/facts";
import { block, choice, num, order } from "./challenge-kit";
import type { Station } from "./stations";

/**
 * The challenges of posts 5, 6, 8, 9, 11 and 12 of the initiation (docs/design/santuario3-iniciacion.md §4.1; phase 5,
 * `s3-iniciacion-2`): the centrifuge, the parabolic flight from the glacier's blue-ice runway, the Dragon simulator,
 * the robotics trainer (the Canadarm2 capture of the Cupola, reused), the meteorite search on the blue ice and cold
 * survival. Real steps and numbers with their sources; the beats say what is seen at the post as each is answered.
 */
const B = (her: Beat["her"], pose: Beat["pose"], trainer: Beat["trainer"], caption: string, things: Beat["things"] = [], rig?: Beat["rig"], times?: number): Beat => ({ her, pose, trainer, things, caption, ...(rig ? { rig } : {}), ...(times ? { times } : {}) });

// ── 5. The centrifuge (TsF-18's standard test; Dragon's profiles at NASTAR) ──
const CENTRIFUGE_STEPS = [
  "ponerle los sensores del ECG y el mando con el botón",
  "sentarse recostada en la góndola, de cara al eje (Gx)",
  "subir a 4 g, 0,1 g cada segundo",
  "aguantar un minuto apagando las luces con el botón",
  "perfil de reentrada de Dragon: 4–5 g sobre el pecho",
  "bajar a 1 g y parar la centrífuga",
];

/** Seconds to ramp from 1 g to `g` at `rate` g/s (the loop of the question). */
export function rampSeconds(g: number, rate: number): number {
  let at = 1;
  let s = 0;
  while (at < g - 1e-9) {
    at += rate;
    s++;
  }
  return s;
}

function centrifuge(): Station {
  const c = CENTRIFUGE;
  const right = rampSeconds(c.testG.value, c.rampGs.value);
  const sensors = { thing: "sensores", at: "pecho" } as const;
  const button = { thing: "boton", at: "mano-ella" } as const;
  return {
    post: 5,
    machine: "centrifuga-gondola",
    sources: [S.tsf18, S.centrifuge, S.dragonReentry],
    chore: {
      id: "s3:puesto-5",
      kind: "iniciacion",
      title: "Centrífuga",
      scenario: `La góndola en la punta de un brazo de ${TRAINING.centrifugeArmM.value} m: Gx, del pecho a la espalda, como en la reentrada`,
      exercises: [
        order("s3-centrifuga-pasos", "Primero los sensores y el botón; la carga sube despacio y se aguanta un minuto; después el perfil de Dragon", CENTRIFUGE_STEPS, "sentarse erguida, de cara afuera (Gz hacia los pies)"),
        choice(
          "s3-centrifuga-rampa",
          { concept: 2, skill: "predecir", idea: `La TsF-18 sube ${num(c.rampGs.value)} g cada segundo: un bucle que cuenta segundos`, question: "¿Cuántos segundos tarda en llegar a 4 g?", code: [block("a", "g = 1", "let g = 1;"), block("b", "segundos = 0", "let segundos = 0;"), block("c", `mientras g < ${c.testG.value}: g = g + ${num(c.rampGs.value)}; segundos = segundos + 1`, `while (g < ${c.testG.value}) { g += ${c.rampGs.value}; segundos++; }`)] },
          `${right} s`,
          ["40 s", "4 s", "60 s"],
        ),
      ],
    },
    beats: [
      [
        B("junto-gondola", "de-pie", "ayuda", "Los electrodos del ECG y el mando con el botón", [sensors, button]),
        B("gondola", "recostada", "mira", "Recostada en la góndola, de cara al eje", [sensors, button], { kind: "centrifuga", g: 1 }),
        B("gondola", "recostada", "mira", "Sube a 4 g: 0,1 g cada segundo", [sensors, button], { kind: "centrifuga", g: c.testG.value }),
        B("gondola", "recostada", "mira", "Un minuto a 4 g: apaga cada luz con el botón", [sensors, button], { kind: "centrifuga", g: c.testG.value }),
        B("gondola", "recostada", "escribe", "Reentrada de Dragon: 4–5 g sobre el pecho", [sensors, button], { kind: "centrifuga", g: (c.reentryG.value.min + c.reentryG.value.max) / 2 }),
        B("gondola", "recostada", "mira", "Baja a 1 g y la centrífuga se para", [sensors, button], { kind: "centrifuga", g: 1 }),
      ],
      [B("gondola", "recostada", "escribe", `De 1 a 4 g a 0,1 g por segundo: ${right} s`, [sensors, button], { kind: "centrifuga", g: c.testG.value })],
    ],
  };
}

// ── 6. The parabolic flight (the Il-76MDK of the Gagarin centre, from the glacier's blue-ice runway) ──
const PARABOLIC_STEPS = [
  "subir por la escalerilla de la puerta lateral y atarse en los asientos de atrás",
  "despegar de la pista de hielo azul",
  "subir a 6000 m",
  "entrada a 2 g, tumbada en el suelo acolchado",
  "unos 25 s de ingravidez: soltarse y flotar",
  "salida a 2 g, tumbada otra vez",
  "repetir hasta 10 parábolas",
  "volver a los asientos y aterrizar",
];

/** «4 min 10 s». */
export const minSec = (s: number): string => `${Math.floor(s / 60)} min ${s % 60} s`;

function parabolic(): Station {
  const z = ZERO_G;
  const total = z.parabolas.value * z.weightlessS.value;
  return {
    post: 6,
    machine: "glaciar-avion",
    sources: [S.il76Gctc, S.il76Altitude, S.il76, S.training, S.blueIce],
    chore: {
      id: "s3:puesto-6",
      kind: "iniciacion",
      title: "Vuelo parabólico",
      scenario: `El Il-76MDK del Centro Gagarin desde una pista de hielo azul de ${GLACIER.runway.value.length} m: hasta ${z.parabolas.value} parábolas entre ${z.floorM.value} y ${z.topM.value} m, ${num(z.pullG.value)} g, unos ${z.weightlessS.value} s sin peso y ${num(z.pullG.value)} g`,
      exercises: [
        order("s3-parabolico-pasos", `Atada en el despegue y el aterrizaje; tumbada a ${num(z.pullG.value)} g; suelta solo en la ingravidez`, PARABOLIC_STEPS, `soltarse del suelo durante la entrada a ${num(z.pullG.value)} g`),
        choice(
          "s3-parabolico-total",
          { concept: 2, skill: "predecir", idea: "Un bucle por parábola: cada una suma su ingravidez", question: "¿Cuánta ingravidez suma el vuelo?", code: [block("a", "ingravidez = 0", "let ingravidez = 0;"), block("b", `para cada parábola de ${z.parabolas.value}: ingravidez = ingravidez + ${z.weightlessS.value} s`, `for (let p = 0; p < ${z.parabolas.value}; p++) ingravidez += ${z.weightlessS.value};`)] },
          minSec(total),
          [`${z.parabolas.value} s`, minSec(total * 2), minSec(total / 2)],
        ),
      ],
    },
    beats: [
      [
        B("avion-asiento", "sentada", "ayuda", "Sube por la escalerilla de la puerta lateral y se ata atrás", [], { kind: "avion", phase: "parado", g: 1 }),
        B("avion-asiento", "sentada", "mira", `Despega de la pista de hielo azul (${GLACIER.runway.value.length} m)`, [], { kind: "avion", phase: "despegue", g: 1 }),
        B("avion-asiento", "sentada", "mira", `Sube a ${z.floorM.value} m`, [], { kind: "avion", phase: "subida", g: 1 }),
        B("avion-suelo", "tumbada", "mira", `Entrada: ${num(z.pullG.value)} g, el morro arriba`, [], { kind: "avion", phase: "tiron", g: z.pullG.value }),
        B("avion-flotando", "neutra", "mira", `Unos ${z.weightlessS.value} s de ingravidez: flota`, [], { kind: "avion", phase: "ingravidez", g: 0 }),
        B("avion-suelo", "tumbada", "mira", `Salida: otra vez ${num(z.pullG.value)} g, tumbada`, [], { kind: "avion", phase: "salida", g: z.pullG.value }),
        B("avion-flotando", "neutra", "mira", `Así hasta ${z.parabolas.value} parábolas`, [], { kind: "avion", phase: "ingravidez", g: 0 }, 2),
        B("avion-asiento", "sentada", "mira", "Atada otra vez: aterriza en el hielo", [], { kind: "avion", phase: "aterrizaje", g: 1 }),
      ],
      [B("avion-flotando", "neutra", "escribe", `${z.parabolas.value} × ${z.weightlessS.value} s: ${minSec(total)} sin peso`, [], { kind: "avion", phase: "ingravidez", g: 0 })],
    ],
  };
}

// ── 8. The simulators (Dragon's at Hawthorne: rehearsals with failures ever harder; the IDSS contact limits) ──
const SIM_STEPS = [
  "ponerse los cascos y atarse en el asiento del comandante",
  "ensayo de lanzamiento: cuenta atrás y ascenso",
  "ensayo de aborto: los SuperDraco la apartan del cohete",
  "acople a mano con la pantalla táctil",
  "fallo inyectado: leer la alarma y seguir su procedimiento",
  "reentrada y amerizaje",
];

function simulators(): Station {
  const lim = IDSS_CONTACT_LIMITS;
  const closing = 0.08;
  const off = 0.12;
  const set = { thing: "casco-vuelo", at: "cara" } as const;
  return {
    post: 8,
    machine: "dragon-simulador",
    sources: [S.dragonTraining, S.spacexSims, S.mstf, lim.sources[0]!],
    chore: {
      id: "s3:puesto-8",
      kind: "iniciacion",
      title: "Simuladores de Dragon y del LM",
      scenario: "Ensayos encadenados en el simulador de Dragon, con fallos cada vez más difíciles; el acople, con los límites reales del IDSS",
      exercises: [
        order("s3-simulador-pasos", "Una misión entera en el simulador: lanzamiento, aborto, acople a mano, un fallo y el regreso", SIM_STEPS, "saltarse el ensayo de aborto porque nunca ha fallado"),
        choice(
          "s3-simulador-acople",
          { concept: 5, skill: "predecir", idea: `Al tocar: cierre entre ${num(lim.closingMinMs, 2)} y ${num(lim.closingMaxMs, 2)} m/s y como mucho ${num(lim.lateralMisalignM, 2)} m fuera del eje`, question: "¿Qué hace el programa al tocar?", code: [block("a", `al tocar(cierre, desvío): si cierre >= ${num(lim.closingMinMs, 2)} y cierre <= ${num(lim.closingMaxMs, 2)} y desvío <= ${num(lim.lateralMisalignM, 2)}: acoplar()`, `function alTocar(cierre, desvio) { if (cierre >= ${lim.closingMinMs} && cierre <= ${lim.closingMaxMs} && desvio <= ${lim.lateralMisalignM}) acoplar(); else apartarse(); }`), block("b", "si no: apartarse() y repetir", "// si no: apartarse()"), block("c", `al tocar(${num(closing, 2)}, ${num(off, 2)})`, `alTocar(${closing}, ${off});`)] },
          "apartarse(): está 0,12 m fuera del eje",
          ["acoplar(): el cierre está bien", "acoplar() y después apartarse()", "nada: no toca"],
        ),
      ],
    },
    beats: [
      [
        B("dragon-asiento", "sentada", "ayuda", "Cascos puestos, atada en el asiento del comandante", [set]),
        B("dragon-asiento", "manos-mandos", "mira", "Ensayo de lanzamiento: T−0 y ascenso", [set], { kind: "pantalla", show: "lanzamiento" }),
        B("dragon-asiento", "sentada", "escribe", "Aborto: los SuperDraco la apartan del cohete", [set], { kind: "pantalla", show: "aborto" }),
        B("dragon-asiento", "manos-mandos", "mira", "Acople a mano en la pantalla táctil", [set], { kind: "pantalla", show: "acople" }),
        B("dragon-asiento", "manos-mandos", "escribe", "Fallo inyectado: la alarma y su procedimiento", [set], { kind: "pantalla", show: "fallo" }),
        B("dragon-asiento", "sentada", "mira", "Reentrada y amerizaje", [set], { kind: "pantalla", show: "reentrada" }),
      ],
      [B("dragon-asiento", "manos-mandos", "escribe", "0,12 m fuera del eje: se aparta y lo intenta otra vez", [set], { kind: "pantalla", show: "acople" })],
    ],
  };
}

// ── 9. Robotics (the Generic Robotics Trainer: the Canadarm2 capture of the Cupola's RWS, in the simulator) ──
function robotics(): Station {
  const arm = armChore("captura");
  const chore: Chore = { ...arm, id: "s3:puesto-9", title: "Robótica: capturar un Cygnus en el simulador", scenario: `En el simulador del brazo, como el Generic Robotics Trainer: ${arm.scenario}` };
  const hands = { thing: "mandos", at: "sitio" } as const;
  const beats = chore.exercises.map((ex) =>
    ex.kind === "order"
      ? ex.solution.map((id, i) => B("robotica-puesto", "manos-mandos", i % 3 === 2 ? "escribe" : "mira", capital(ex.blocks.find((b) => b.id === id)!.pseudo), [hands]))
      : [B("robotica-puesto", "manos-mandos", "escribe", "Comprueba la hora en la pantalla", [hands])],
  );
  return { post: 9, machine: "robotica-puesto", sources: [S.robotics, S.csaRobotics], chore, beats };
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── 11. Geology: meteorites on the blue ice (ANSMET) ──
const ANSMET_STEPS = [
  "barrer el hielo azul en línea, con las motos a unos 30 m",
  "aparcar junto a la piedra oscura y tomar su GPS",
  "darle su número en una etiqueta de aluminio",
  "fotografiarla con el contador encima",
  "anotar tamaño, costra de fusión y tipo en el libro",
  "meterla con pinzas en una bolsa de teflón estéril",
  "cerrar la bolsa con cinta, con la etiqueta dentro",
  "clavar la bandera con su número",
];

function geology(): Station {
  const motos = 8;
  const right = (motos - 1) * ANSMET.spacingM.value;
  const stone = { thing: "meteorito", at: "sitio" } as const;
  const moto = { thing: "moto-nieve", at: "sitio" } as const;
  return {
    post: 11,
    machine: "glaciar-meteoritos",
    sources: [S.ansmet],
    chore: {
      id: "s3:puesto-11",
      kind: "iniciacion",
      title: "Geología: meteoritos en el hielo azul",
      scenario: `Como ANSMET: equipos de ${ANSMET.team.value.min} a ${ANSMET.team.value.max} en motos de nieve a ${ANSMET.spacingM.value} m; cada meteorito, sin tocarlo, a su bolsa estéril y congelado hasta Johnson`,
      exercises: [
        order("s3-meteoritos-pasos", "Primero dónde está y su número; después la foto y el libro; al final la bolsa, sin tocarla con los dedos", ANSMET_STEPS, "cogerla con la mano para verla mejor"),
        choice(
          "s3-meteoritos-linea",
          { concept: 1, skill: "predecir", idea: "Entre 8 motos hay 7 huecos de 30 m", question: "¿Qué ancho de hielo barre la línea de una pasada?", code: [block("a", `motos = ${motos}`, `const motos = ${motos};`), block("b", `separación = ${ANSMET.spacingM.value} m`, `const separacion = ${ANSMET.spacingM.value};`), block("c", "ancho = (motos - 1) × separación", "const ancho = (motos - 1) * separacion;")] },
          `${right} m`,
          [`${motos * ANSMET.spacingM.value} m`, `${motos + ANSMET.spacingM.value} m`, `${ANSMET.spacingM.value} m`],
        ),
      ],
    },
    beats: [
      [
        B("moto", "moto", "mira", "La línea de motos barre el hielo azul", [{ thing: "moto-nieve", at: "cintura" }, stone]),
        B("meteorito", "rodillas", "mira", "Aparca junto a la piedra: el GPS, a unos centímetros", [moto, stone, { thing: "gps", at: "sitio" }]),
        B("meteorito", "rodillas", "da", "Su número, en una etiqueta de aluminio", [moto, stone, { thing: "etiqueta", at: "mano-ella" }]),
        B("meteorito", "boca-abajo", "ayuda", "La foto, con el contador encima", [moto, stone, { thing: "contador", at: "mano-entrenador" }, { thing: "camara-foto", at: "mano-ella" }]),
        B("meteorito", "rodillas", "mira", "Tamaño, costra de fusión y tipo, en el libro", [moto, stone, { thing: "libro", at: "mano-ella" }]),
        B("meteorito", "rodillas", "ayuda", "Con pinzas estériles, a la bolsa de teflón", [moto, { thing: "meteorito", at: "mano-ella" }, { thing: "pinzas", at: "mano-ella" }, { thing: "bolsa", at: "mano-entrenador" }]),
        B("meteorito", "rodillas", "ayuda", "La bolsa cerrada con cinta, la etiqueta dentro", [moto, { thing: "bolsa", at: "mano-ella" }, { thing: "cinta", at: "mano-entrenador" }]),
        B("meteorito", "de-pie", "mira", "La bandera con su número, por si falla el GPS", [moto, { thing: "bolsa", at: "mano-ella" }, { thing: "bandera", at: "sitio" }]),
      ],
      [B("meteorito", "de-pie", "escribe", `8 motos, 7 huecos de 30 m: ${right} m de hielo`, [moto, { thing: "bolsa", at: "mano-ella" }, { thing: "bandera", at: "sitio" }])],
    ],
  };
}

// ── 12. Cold survival (the US Antarctic Program's field school, «Happy Camper») ──
const COLD_STEPS = [
  "montar la tienda Scott con anclajes de nieve",
  "cortar bloques y levantar un muro contra el viento",
  "cavar una zanja y techarla con bloques",
  "hervir nieve en el hornillo para beber y comer",
  "desplegar las dos antenas de 10 m de la radio de HF",
  "llamar al Polo Sur, a 1360 km",
];

/** Where the snow wall goes: on the side the wind comes from (the conditionals of the question). */
export function wallSide(wind: "norte" | "sur" | "este" | "oeste"): string {
  if (wind === "norte") return "al norte";
  else if (wind === "sur") return "al sur";
  else if (wind === "este") return "al este";
  return "al oeste";
}

function cold(): Station {
  const tent = { thing: "tienda-scott", at: "sitio" } as const;
  const wall = { thing: "muro-nieve", at: "sitio" } as const;
  const trench = { thing: "zanja-techo", at: "sitio" } as const;
  const stove = { thing: "hornillo", at: "sitio" } as const;
  const pot = { thing: "olla", at: "sitio" } as const;
  const radio = { thing: "radio-hf", at: "sitio" } as const;
  const aerial = { thing: "antena", at: "sitio" } as const;
  return {
    post: 12,
    machine: "glaciar-supervivencia",
    sources: [S.happyCamper],
    chore: {
      id: "s3:puesto-12",
      kind: "iniciacion",
      title: "Supervivencia en frío",
      scenario: `La escuela de campo antártica: ${COLD.days.value} días en el hielo con tienda, muro, zanja, agua y radio`,
      exercises: [
        order("s3-frio-pasos", "Primero el refugio; después el agua; y siempre la radio para que sepan dónde está", COLD_STEPS, "dormir al raso, sin muro ni tienda"),
        choice(
          "s3-frio-muro",
          { concept: 3, skill: "predecir", idea: "El muro se levanta del lado del que viene el viento", question: "El viento viene del sur: ¿dónde va el muro?", code: [block("a", 'viento = "sur"', 'const viento = "sur";'), block("b", 'si viento = "norte": muro al norte', 'if (viento === "norte") muro = "norte";'), block("c", 'si no, si viento = "sur": muro al sur', 'else if (viento === "sur") muro = "sur";'), block("d", "si no: muro al oeste", 'else muro = "oeste";')] },
          `El muro, ${wallSide("sur")}: contra el viento`,
          ["El muro, al norte", "El muro, al oeste", "No hace falta muro"],
        ),
      ],
    },
    beats: [
      [
        B("tienda", "mano-adelante", "ayuda", "La tienda Scott, bien anclada en la nieve", [tent]),
        B("muro", "brazos-arriba", "ayuda", "Bloques de nieve: el muro contra el viento", [tent, wall]),
        B("zanja", "rodillas", "ayuda", "La zanja, techada con bloques", [tent, wall, trench]),
        B("hornillo", "rodillas", "mira", "Nieve al hornillo: agua para beber y comer", [tent, wall, trench, stove, pot]),
        B("radio", "rodillas", "ayuda", "Las dos antenas de 10 m de la radio de HF", [tent, wall, trench, stove, aerial, radio]),
        B("radio", "mano-adelante", "mira", "Llama al Polo Sur, a 1360 km", [tent, wall, trench, stove, aerial, { thing: "radio-hf", at: "mano-ella" }]),
      ],
      [B("muro", "de-pie", "escribe", "Viento del sur: el muro, al sur", [tent, wall, trench, stove, aerial, radio])],
    ],
  };
}

/** Posts 5, 6, 8, 9, 11 and 12, by post. */
export function phase5Stations(): Station[] {
  return [centrifuge(), parabolic(), simulators(), robotics(), geology(), cold()];
}
