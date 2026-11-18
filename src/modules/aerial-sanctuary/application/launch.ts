import type { Chore } from "@modules/chores/domain/chore";
import type { Beat, Beats } from "../domain/station-beat";
import { tClock, type LaunchStep } from "../domain/launch-sequence";
import { safetyDistanceM } from "../domain/safety";
import { S3_SOURCES as S } from "../data/sources";
import { CREW_DAY, ELECTRON, ELECTRON_COUNTDOWN, ELECTRON_FLIGHT, FALCON9_CREW, RENDEZVOUS, type Mark } from "../data/facts";
import { block, choice, num, order } from "./challenge-kit";
import type { Station } from "./stations";

/**
 * Phase 6 of the initiation (`s3-lanzamiento`; docs/design/santuario3-lanzamiento.md): post 10, an Electron's launch
 * watched from the flight director's console, and her own launch day, as a Crew Dragon crew's (Crew-5 and Demo-2):
 * post 13's suit-up with its trainer, then, at the crew pad, the tower and the white room, the countdown, the ascent
 * and the rendezvous with the Starship in low orbit. Every step is a challenge of real steps and numbers with their
 * sources, and its beats are what is seen as each is answered. The suit-up keeps the EMU's rule (station-eva-chores.ts):
 * nobody goes on without the leak check.
 */
const B = (her: Beat["her"], pose: Beat["pose"], trainer: Beat["trainer"], caption: string, things: Beat["things"] = [], rig?: Beat["rig"]): Beat => ({ her, pose, trainer, things, caption, ...(rig ? { rig } : {}) });

const steps = (m: readonly Mark[]) => m.map((x) => x.what);
/** «T−2 h 35 min: entrar en la Dragon». */
const at = (m: Mark) => `${tClock(m.s)}: ${m.what}`;
/** «8 min 49 s». */
const minSec = (s: number) => `${Math.floor(s / 60)} min ${s % 60} s`;
/** «1 h 55 min». */
const hMin = (s: number) => `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;

// ── 10. An Electron from mission control (Rocket Lab's countdown; the safety distance of Cold Sanctuary's rule). The
// launch tree is inside its 300 m, so it is followed from the training island's control room, as Rocket Lab's own
// control is far from its pad. ──
function electron(): Station {
  // Seven of the nine marks (a phone fits seven blocks): the aviation notice at T−1 h and the final preparations at
  // T−10 min are said in the caption of the LOX beat.
  const all = ELECTRON_COUNTDOWN.value;
  const count = [all[0]!, all[1]!, all[2]!, all[3]!, all[6]!, all[7]!, all[8]!];
  const flight = ELECTRON_FLIGHT.value;
  const prop = ELECTRON.propellantKg.value;
  const away = safetyDistanceM(prop);
  const her = (caption: string, phase: "parado" | "carga" | "despegue" | "vuelo", pose: Beat["pose"] = "sentada"): Beat => B("director", pose, "mira", caption, [], { kind: "electron", phase });
  return {
    post: 10,
    machine: "control-director",
    sources: [S.electronCountdown, S.electron, S.csLaunch],
    chore: {
      id: "s3:puesto-10",
      kind: "iniciacion",
      title: "Control de misión: un Electron",
      scenario: `Director de vuelo: la cuenta atrás de Rocket Lab y la distancia de seguridad (${num(prop / 1000)} t de propulsante)`,
      exercises: [
        order("s3-electron-cuenta", "Despejar la zona, cargar el oxígeno sin nadie y al final la secuencia automática", steps(count), "cargar el oxígeno con gente en la plataforma"),
        choice(
          "s3-electron-distancia",
          {
            concept: 4,
            skill: "predecir",
            idea: "Si estalla en la plataforma: el 20 % del propulsante en TNT; la distancia a lo habitado es 15,87 × ∛TNT, y un 50 % más por los cascotes",
            question: "¿A qué distancia de lo habitado tiene que estar la plataforma del Electron?",
            code: [block("a", `propulsante = ${prop} kg`, `const propulsante = ${prop};`), block("b", "tnt = propulsante × 0,2", "const tnt = propulsante * 0.2;"), block("c", "distancia = 15,87 × raízCúbica(tnt) × 1,5", "const distancia = 15.87 * Math.cbrt(tnt) * 1.5;")],
          },
          `Unos ${Math.round(away / 100) * 100} m`,
          ["Unos 30 m", "Unos 1,1 km", "Unos 5 km"],
        ),
      ],
    },
    beats: [
      [
        her(`${at(count[0]!)}`, "parado"),
        her(`${at(count[1]!)}`, "carga"),
        her(`${at(count[2]!)}: la plataforma, vacía`, "carga"),
        her(`${at(count[3]!)}; después, ${at(all[4]!)} y ${at(all[5]!)}`, "carga", "mano-adelante"),
        her(`${at(count[4]!)}`, "carga", "manos-mandos"),
        her(`${at(count[5]!)}`, "despegue", "manos-mandos"),
        her("¡Despegue! En la pantalla grande, el Electron sube", "despegue", "brazos-arriba"),
      ],
      [her(`En vuelo: ${flight.map((m) => `${tClock(m.s)} ${m.what}`).join(" · ")}. La plataforma, a ${Math.round(away)} m de todo`, "vuelo")],
    ],
  };
}

// ── 13. The suit-up at the crew building (Crew-5: «suit donning and checkouts»; Demo-2 took about 38 min) ──
const SUIT_STEPS = [
  "ponerse el traje de la Dragon, hecho a su medida",
  "ponerse los guantes y el casco",
  "conectar el umbilical del traje al puesto de pruebas",
  "comprobar que el traje no pierde presión (fugas)",
  "salir del edificio hacia la plataforma",
];

function suitUp(): Station {
  const day = CREW_DAY.suitUp.value;
  const walk = -day[1]!.s;
  const suit = { thing: "traje-ss" as const, at: "cuerpo" as const };
  const helmet = { thing: "casco-ss" as const, at: "cara" as const };
  return {
    post: 13,
    machine: "trajes-puesto",
    sources: [S.crew5Timeline, S.crewDay],
    chore: {
      id: "s3:puesto-13",
      kind: "iniciacion",
      title: "Integración: el traje de la Crew Dragon",
      scenario: `${at(day[0]!)}, en unos ${CREW_DAY.suitMin.value} min, como en el edificio de la tripulación; como con el EMU, nadie sigue sin comprobar las fugas`,
      exercises: [
        order("s3-traje-pasos", "El traje, de dentro afuera; con el casco y los guantes puestos se conecta y se comprueba; sin fugas, se sale", SUIT_STEPS, "salir hacia la plataforma sin comprobar las fugas"),
        choice(
          "s3-traje-salida",
          { concept: 4, skill: "predecir", idea: "La cuenta atrás se cuenta hacia el despegue: lo que falta es la distancia a cero", question: `Sale del edificio a ${tClock(day[1]!.s)}: ¿cuánto falta para el despegue?`, code: [block("a", `salida = ${day[1]!.s} s`, `const salida = ${day[1]!.s};`), block("b", "despegue = 0", "const despegue = 0;"), block("c", "falta = despegue − salida", "const falta = despegue - salida;")] },
          hMin(walk),
          [hMin(walk - 1800), "4 h 0 min", "38 min"],
        ),
      ],
    },
    beats: [
      [
        B("traje-pie", "brazos-arriba", "ayuda", "El traje de la Dragon, hecho a su medida", [suit]),
        B("traje-pie", "mano-adelante", "ayuda", "Guantes y casco", [suit, helmet]),
        B("sillon-traje", "recostada", "da", "El umbilical, al puesto de pruebas", [suit, helmet, { thing: "umbilical", at: "pecho" }]),
        B("sillon-traje", "recostada", "escribe", "Presión estable: sin fugas", [suit, helmet, { thing: "umbilical", at: "pecho" }, { thing: "lista", at: "mano-entrenador" }]),
        B("traje-pie", "de-pie", "mira", `${at(day[1]!)}`, [suit, { thing: "casco-ss", at: "mano-ella" }]),
      ],
      [B("traje-pie", "de-pie", "mira", `Faltan ${hMin(walk)} para el despegue`, [suit, { thing: "casco-ss", at: "mano-ella" }])],
    ],
  };
}

/** A step of her launch day after the suit-up, at the crew pad (no trainer: the crew is hers; ours, a crew of one). */
export interface LaunchChallenge {
  readonly step: Exclude<LaunchStep, "traje">;
  readonly chore: Chore;
  readonly beats: Beats;
  readonly sources: readonly string[];
}

const SEAT = { thing: "traje-ss" as const, at: "cuerpo" as const };
const HELM = { thing: "casco-ss" as const, at: "cara" as const };
type Flight = Exclude<Extract<NonNullable<Beat["rig"]>, { kind: "falcon" }>["phase"], "cita">;
const F = (her: Beat["her"], pose: Beat["pose"], caption: string, phase: Flight): Beat => B(her, pose, "mira", caption, [SEAT, HELM], { kind: "falcon", phase });

function tower(): LaunchChallenge {
  const b = CREW_DAY.boarding.value;
  const close = b[b.length - 1]!;
  return {
    step: "torre",
    sources: [S.crew5Timeline, S.crewDay, S.whiteRoom, S.crewArm],
    chore: {
      id: "s3:lanzamiento-torre",
      kind: "iniciacion",
      title: "La torre, el brazo de acceso y la sala blanca",
      scenario: `Por el brazo de acceso (${CREW_DAY.armM.value} m) a la sala blanca y a su asiento; la escotilla se cierra a ${tClock(close.s)}`,
      exercises: [
        order("s3-torre-pasos", "Subir, cruzar, entrar con el asiento recto; comunicaciones, asiento reclinado y fugas; después, la escotilla", steps(b), "cerrar la escotilla antes de comprobar las fugas"),
        choice(
          "s3-torre-espera",
          { concept: 4, skill: "predecir", idea: "Con la escotilla cerrada se espera, atada, hasta el despegue", question: `La escotilla se cierra a ${tClock(close.s)}: ¿cuánto espera dentro hasta el despegue?`, code: [block("a", `cierre = ${close.s} s`, `const cierre = ${close.s};`), block("b", "espera = 0 − cierre", "const espera = 0 - cierre;")] },
          hMin(-close.s),
          [hMin(-b[0]!.s), "45 min", "2 h 35 min"],
        ),
      ],
    },
    beats: [
      [
        F("brazo-acceso", "de-pie", at(b[0]!), "brazo"),
        F("brazo-acceso", "de-pie", `${at(b[1]!)} (${CREW_DAY.armM.value} m de brazo)`, "brazo"),
        F("sala-blanca", "de-pie", `${at(b[2]!)}`, "brazo"),
        F("dragon-real", "sentada", at(b[3]!), "brazo"),
        F("dragon-real", "recostada", at(b[4]!), "brazo"),
        F("dragon-real", "recostada", at(b[5]!), "brazo"),
        F("dragon-real", "recostada", at(b[6]!), "brazo"),
      ],
      [F("dragon-real", "recostada", `Atada en su asiento: ${hMin(-close.s)} hasta el despegue`, "brazo")],
    ],
  };
}

function countdown(): LaunchChallenge {
  const c = CREW_DAY.countdown.value;
  const prop = FALCON9_CREW.propellantKg.value;
  const away = safetyDistanceM(prop);
  return {
    step: "cuenta-atras",
    sources: [S.crew5Timeline, S.falcon9, S.csLaunch],
    chore: {
      id: "s3:lanzamiento-cuenta",
      kind: "iniciacion",
      title: "La cuenta atrás del Falcon 9",
      scenario: `Desde ${tClock(c[0]!.s)}: el brazo fuera y el escape armado antes de cargar ${num(prop / 1000, 0)} t de propulsante`,
      exercises: [
        order("s3-cuenta-pasos", "El brazo se retira y el escape se arma antes de cargar el propulsante: si algo va mal, la Dragon se va sola", steps(c), "cargar el propulsante con el escape sin armar"),
        choice(
          "s3-cuenta-distancia",
          {
            concept: 4,
            skill: "predecir",
            idea: "La misma regla que la del Electron, con el propulsante del Falcon 9: por eso la plataforma está en el mar",
            question: "¿A qué distancia de lo habitado tiene que estar el Falcon 9 tripulado?",
            code: [block("a", `propulsante = ${prop} kg`, `const propulsante = ${prop};`), block("b", "tnt = propulsante × 0,2", "const tnt = propulsante * 0.2;"), block("c", "distancia = 15,87 × raízCúbica(tnt) × 1,5", "const distancia = 15.87 * Math.cbrt(tnt) * 1.5;")],
          },
          `Unos ${num(away / 1000)} km`,
          ["Unos 300 m", "Unos 100 m", "Unos 11 km"],
        ),
      ],
    },
    beats: [
      [
        F("dragon-real", "recostada", at(c[0]!), "brazo"),
        F("dragon-real", "recostada", at(c[1]!), "brazo-fuera"),
        F("dragon-real", "recostada", at(c[2]!), "brazo-fuera"),
        F("dragon-real", "recostada", at(c[3]!), "brazo-fuera"),
        F("dragon-real", "recostada", at(c[4]!), "brazo-fuera"),
        F("dragon-real", "recostada", "¡Despegue!", "despegue"),
      ],
      [F("dragon-real", "recostada", `Todo lo habitado, a más de ${num(away / 1000)} km`, "despegue")],
    ],
  };
}

function ascent(): LaunchChallenge {
  const a = CREW_DAY.ascent.value;
  const seco = a.find((m) => m.what.startsWith("apagado de la 2.ª"))!.s;
  return {
    step: "ascenso",
    sources: [S.crew5Timeline],
    chore: {
      id: "s3:lanzamiento-ascenso",
      kind: "iniciacion",
      title: "El ascenso: las etapas y la órbita",
      scenario: "Del despegue a la órbita, como la Crew-5: la máxima presión, las dos etapas y la Dragon sola",
      exercises: [
        order("s3-ascenso-pasos", "Primero se apagan los motores, después se separan las etapas; con la 2.ª apagada ya está en órbita", steps(a), "separar las etapas con los motores encendidos"),
        choice(
          "s3-ascenso-orbita",
          { concept: 4, skill: "predecir", idea: "Un minuto son 60 s: los minutos enteros y lo que sobra", question: `La 2.ª etapa se apaga a ${tClock(seco)}: ¿cuánto tarda en llegar a la órbita?`, code: [block("a", `t = ${seco} s`, `const t = ${seco};`), block("b", "min = parteEntera(t / 60)", "const min = Math.floor(t / 60);"), block("c", "s = t − min × 60", "const s = t - min * 60;")] },
          minSec(seco),
          [minSec(seco - 60), minSec(a[2]!.s), "12 min 0 s"],
        ),
      ],
    },
    beats: [
      [
        F("dragon-real", "recostada", at(a[0]!), "maxq"),
        F("dragon-real", "recostada", at(a[1]!), "maxq"),
        F("dragon-real", "recostada", at(a[2]!), "separacion"),
        F("dragon-real", "recostada", at(a[3]!), "orbita"),
        F("dragon-real", "recostada", at(a[4]!), "orbita"),
      ],
      [F("dragon-real", "recostada", `En órbita a los ${minSec(seco)}`, "orbita")],
    ],
  };
}

/** The rendezvous's steps: the burns, then the waypoints in to the port (Demo-2's, at the Starship's port here). */
export function rendezvousSteps(): string[] {
  const [phase, raise, circ] = RENDEZVOUS.burnsMs.value;
  const wp = RENDEZVOUS.waypoints.value;
  return [
    `encendido de fase: ${num(phase, 2)} m/s`,
    `subir la órbita y circularizar: ${num(raise, 1)} y ${num(circ, 2)} m/s`,
    `«go» para entrar en la esfera de ${RENDEZVOUS.keepOutM.value} m`,
    ...wp.map((w) => `${w.name}: a ${w.m} m${w.m === RENDEZVOUS.keepOutM.value ? " bajo la Starship" : w.m <= 20 ? ", la última espera" : ", en el eje del puerto"}`),
    "acercarse a 0,05–0,10 m/s y acoplar",
  ];
}

function rendezvous(): LaunchChallenge {
  const burns = RENDEZVOUS.burnsMs.value;
  const total = burns.reduce((a, b) => a + b, 0);
  const st = rendezvousSteps();
  const wp = RENDEZVOUS.waypoints.value;
  // What Dragon's display shows at each step: the burns far off, then the range at each waypoint and contact.
  const ranges: (number | undefined)[] = [undefined, undefined, RENDEZVOUS.keepOutM.value, ...wp.map((w) => w.m), 0];
  const cita = (i: number): NonNullable<Beat["rig"]> => ({ kind: "falcon", phase: "cita", step: st[Math.min(i, st.length - 1)]!, ...(ranges[i] !== undefined ? { rangeM: ranges[i] } : {}) });
  return {
    step: "acople",
    sources: [S.crewDay],
    chore: {
      id: "s3:lanzamiento-acople",
      kind: "iniciacion",
      title: "La cita con la Starship en órbita baja",
      scenario: `Como la Dragon con la ISS: tres encendidos, la esfera de ${RENDEZVOUS.keepOutM.value} m y los waypoints hasta el puerto de la Starship`,
      exercises: [
        order("s3-acople-pasos", "Primero la órbita; dentro de la esfera, de waypoint en waypoint, con un «go» antes de entrar", st, `entrar en la esfera de ${RENDEZVOUS.keepOutM.value} m sin el «go»`),
        choice(
          "s3-acople-dv",
          { concept: 2, skill: "predecir", idea: "Un bucle por encendido: cada uno suma su Δv", question: "¿Cuánto Δv suman los tres encendidos?", code: [block("a", "dv = 0", "let dv = 0;"), block("b", `para cada encendido de [${burns.map((b) => num(b, 2)).join("; ")}]: dv = dv + encendido`, `for (const e of [${burns.join(", ")}]) dv += e;`)] },
          `${num(total, 2)} m/s`,
          [`${num(burns[2]!, 2)} m/s`, `${num(total * 2, 2)} m/s`, `${num(burns[0]! + burns[1]!, 2)} m/s`],
        ),
      ],
    },
    beats: [st.map((s, i) => B("dragon-real", "manos-mandos", "mira", s, [SEAT], cita(i))), [B("dragon-real", "manos-mandos", "mira", `Acoplada: ${num(total, 2)} m/s de Δv en tres encendidos`, [SEAT], cita(st.length - 1))]],
  };
}

/** Posts 10 and 13 (its suit-up), by post. */
export function launchStations(): Station[] {
  return [electron(), suitUp()];
}

/** Her launch day at the crew pad, step by step after the suit-up. */
export function launchChallenges(): LaunchChallenge[] {
  return [tower(), countdown(), ascent(), rendezvous()];
}
