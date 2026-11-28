import type { Sourced } from "@core/units";
import { Vec3 } from "@core/math/vec3";
import { POLANA_LAYOUT } from "@modules/station/data/structure";

/**
 * A spacewalk from Quest as on the ISS (docs/design/paseo-espacial.md, «Desde Quest»): the EMU on in the
 * equipment lock, the ISLE prebreathe, the crew lock depressed, out through the EVA hatch on the safety tether,
 * hand over hand along the handrails to the worksite, feet in a foot restraint, the job with the pistol-grip
 * tool, and back in. Durations are real and pass on the board clock (a board hour every real minute,
 * src/core/board-time.ts). Checked 2026-11-17.
 */
export const STATION_EVA_SOURCES = {
  isle: "Space.com (2011, STS-134): el protocolo ISLE empieza con una hora de mascarilla de oxígeno y sigue con unos 100 minutos respirando oxígeno a la presión del traje, 50 de ejercicio suave dentro del traje alternados con 50 de reposo; sustituye a la acampada de la noche en la esclusa: https://www.space.com/11776-shuttle-astronauts-spacewalk-hokey-pokey-endeavour.html",
  ochmo: "NASA OCHMO, enfermedad descompresiva: ISLE es ejercicio suave en el EMU tras 40 min de mascarilla y una despresurización de 20 min a 10,2 psia; la acampada pasa la noche en la esclusa a 10,2 psia; el EMU va a 4,3 psia: https://www.nasa.gov/sites/default/files/atoms/files/dcs_technical_brief_ochmo.pdf",
  eva6h27: "Space.com: paseo de 6 h 27 min para preparar las alas iROSA; Menon trabajó sobre un pie articulado (APFR) en una interfaz de sitio de trabajo (WIF); recogieron sus herramientas y volvieron a la esclusa Quest: https://www.space.com/space-exploration/international-space-station/1-more-step-nasa-astronauts-conduct-6-5-hour-spacewalk-to-prep-iss-for-solar-array-upgrade",
  irosa: "Roll Out Solar Array (Wikipedia): las iROSA llegaron en el maletero del Dragon de carga; Canadarm2 ayudó a mover la de 2023; cada una se monta en paseos espaciales: https://en.wikipedia.org/wiki/Roll_Out_Solar_Array",
  mmod: "Spaceflight Now, EVA del 30 de marzo de 2017: Whitson y Kimbrough montan escudos contra micrometeoritos en el puerto de Tranquility; uno se les escapó flotando: https://spaceflightnow.com/2017/03/30/spacewalkers-improvise-after-fabric-shield-floats-away/",
  eatcs: "EATCS de la ISS (Wikipedia): radiadores de amoníaco en S1 y P1; la bomba del lazo se cambió en paseos espaciales: https://en.wikipedia.org/wiki/External_Active_Thermal_Control_System",
  emu: "NASA 2014, EVA del EMU: cable de seguridad de 55 y 85 pies, ganchos de cintura, PGT y llaves; METOX y batería: https://ntrs.nasa.gov/api/citations/20140009556/downloads/20140009556.pdf",
  hlsAirlock: "Axiom Space, 4 de junio de 2024: primera prueba integrada de Artemis III con los trajes AxEMU dentro de maquetas del HLS de SpaceX, atados a un sistema justo fuera de la esclusa del HLS que presurizaba los trajes (en desarrollo): https://axiomspace.com/news/first-artemis-iii-integrated-test-complete",
  oru: "Orbital replacement unit (Wikipedia): las piezas reemplazables de fuera de la ISS las cambian astronautas en paseos espaciales o Dextre; Canadarm2 mueve las que tienen accesorio de agarre: https://en.wikipedia.org/wiki/Orbital_replacement_unit",
} as const;

const url = (s: string) => s.split(": ").pop()!;
const S = STATION_EVA_SOURCES;

/** The prebreathe and the spacewalk, in board minutes. */
export const QUEST_EVA = {
  maskMin: { value: 60, source: url(S.isle), note: "Una hora de mascarilla (OCHMO: 40 min antes de bajar a 10,2 psia)" },
  inSuitMin: { value: 100, source: url(S.isle), note: "Unos 100 min en el traje: 50 de ejercicio suave y 50 de reposo" },
  lowPressureKPa: { value: 70.3, source: url(S.ochmo), note: "10,2 psia" },
  /** Crew lock from 10,2 psia to vacuum, minutes: no source gives it (game value). */
  depressMin: { value: 15, source: url(S.ochmo), note: "Valor de juego: la fuente no da el tiempo de la despresurización final" },
  /** Back to cabin pressure, minutes (game value). */
  repressMin: { value: 15, source: url(S.ochmo), note: "Valor de juego" },
  /** A typical US spacewalk, hours. */
  typicalH: { value: 6 + 27 / 60, source: url(S.eva6h27), note: "6 h 27 min" },
  /** Hand over hand along the handrails, m per real second (game value: board minutes still pass at ×60). */
  translateMs: { value: 0.5, source: url(S.emu), note: "Valor de juego" },
} as const satisfies Record<string, Sourced<number>>;

/** Prebreathe at the ISLE: mask then in-suit, minutes. */
export const PREBREATHE_MIN = QUEST_EVA.maskMin.value + QUEST_EVA.inSuitMin.value;

/** A point of the handrail route; `anchor`: a place to hook the safety tether's reel. */
export interface RailPoint {
  readonly at: Vec3;
  readonly label: string;
  readonly anchor?: boolean;
}

/** Where outside a job is done: the station's own parts, the lander's, or the Starship's (from its own airlock). */
export type StationSite = "alas" | "radiadores" | "escudo";
export type VehicleSite = "modulo" | "nodriza-motores" | "nodriza-energia";
export type EvaSite = StationSite | VehicleSite;
/** The spacewalks done from the Starship's airlock (the rest from Quest). */
export const STARSHIP_SITES: readonly EvaSite[] = ["nodriza-motores", "nodriza-energia"];

const quest = POLANA_LAYOUT.modules.find((m) => m.id === "quest")!;
const node3 = POLANA_LAYOUT.modules.find((m) => m.id === "nodo-3")!;
const truss = POLANA_LAYOUT.parts.find((p) => p.id === "celosia")!;
const rad = POLANA_LAYOUT.parts.find((p) => p.id === "radiador-estribor-1")!;
const wing = POLANA_LAYOUT.parts.find((p) => p.id === "ala-estribor-1-abajo")!;
/** The EVA hatch: the outboard end of Quest's crew lock. */
export const EVA_HATCH = new Vec3(quest.to.x + 0.2, 0, quest.to.z);
const under = truss.centre.y - truss.half.y - 0.4;
const front = truss.centre.z + truss.half.z + 0.4;
const OUT = quest.radiusM + 0.4;

/** Out of the hatch, up Quest's hull to the truss (handrails on the hull: distribución nuestra). */
const UP: readonly RailPoint[] = [
  { at: EVA_HATCH, label: "Escotilla EVA de Quest", anchor: true },
  { at: new Vec3(quest.to.x - 0.6, OUT, quest.to.z), label: "Asideros de Quest" },
  { at: new Vec3(quest.to.x - 1.5, under, 0), label: "Bajo la celosía, S0" },
];

/**
 * The handrail route to each worksite (distribución nuestra on the real layout; the jobs are where they are on
 * the ISS: the arrays outboard, the radiators on S1, the shields on Tranquility).
 */
export const EVA_ROUTES: Readonly<Record<StationSite, readonly RailPoint[]>> = {
  radiadores: [...UP, { at: new Vec3(rad.centre.x - rad.half.x - 0.6, under, front), label: "S1, raíz del radiador", anchor: true }, { at: new Vec3(rad.centre.x, under, front + 3), label: "Radiador de S1 (sitio de trabajo)" }],
  alas: [...UP, { at: new Vec3(14, under, front), label: "S1", anchor: true }, { at: new Vec3(26, under, front), label: "S3", anchor: true }, { at: new Vec3(wing.centre.x - wing.half.x - 0.8, under, wing.centre.z + 0.6), label: "Base del ala de S4 (sitio de trabajo)" }],
  escudo: [
    { at: EVA_HATCH, label: "Escotilla EVA de Quest", anchor: true },
    { at: new Vec3(quest.to.x - 0.6, OUT, quest.to.z), label: "Asideros de Quest" },
    { at: new Vec3(0, OUT + 0.2, 1.2), label: "Sobre Unity", anchor: true },
    { at: new Vec3(node3.to.x + 1.2, node3.radiusM + 0.4, 0), label: "Tranquility, puerto de babor (sitio de trabajo)" },
  ],
};

/** A box in the station's frame (the lander as it sits on its port). */
export interface Box {
  readonly centre: Vec3;
  readonly half: Vec3;
}

const destiny = POLANA_LAYOUT.modules.find((m) => m.id === "destiny")!;
const node2 = POLANA_LAYOUT.modules.find((m) => m.id === "nodo-2")!;

/**
 * From Quest to the lander (distribución nuestra): on its zenith IDA, along Destiny's starboard side and over
 * Harmony to the lander's aft side; berthed on Unity's nadir CBM, under Quest to its side.
 */
export function landerRoute(at: "ida" | "cbm", box: Box): readonly RailPoint[] {
  const out = { at: EVA_HATCH, label: "Escotilla EVA de Quest", anchor: true };
  if (at === "cbm")
    return [
      out,
      { at: new Vec3(quest.to.x - 0.6, -OUT, quest.to.z), label: "Bajo Quest" },
      { at: new Vec3(quest.from.x + 0.6, -OUT, 0), label: "Bajo Quest, junto a Unity", anchor: true },
      { at: new Vec3(box.centre.x + box.half.x + 0.6, box.centre.y, box.centre.z), label: "Costado del módulo (sitio de trabajo)" },
    ];
  const side = destiny.radiusM + 0.45;
  const top = node2.radiusM + 0.45;
  return [
    out,
    { at: new Vec3(quest.to.x - 1.2, 0, -quest.radiusM - 0.4), label: "Costado de proa de Quest" },
    { at: new Vec3(side, 0, destiny.from.z - 0.8), label: "Costado de Destiny", anchor: true },
    { at: new Vec3(side, 0, destiny.to.z + 0.6), label: "Proa de Destiny" },
    { at: new Vec3(1.0, top, node2.from.z - 0.6), label: "Sobre Harmony", anchor: true },
    { at: new Vec3(0, box.centre.y, box.centre.z + box.half.z + 0.6), label: "Costado del módulo (sitio de trabajo)" },
  ];
}

/** The Starship's hull, m (52,1 × 9 m; the nose cone, about 14 m, narrower). */
export const STARSHIP_HULL = { lengthM: 52.1, radiusM: 4.5, noseM: 14, noseRadiusM: 2.5 } as const;
/** Its airlock's outer hatch on the hull, metres aft of the nose tip (distribución nuestra: by deck 3). */
const HATCH_AFT_M = 18;

/** The Starship's hull as cylinders in the station's frame, berthed nose-on at the forward IDA (`nose`). */
export function starshipHull(nose: Vec3): readonly { from: Vec3; to: Vec3; radiusM: number }[] {
  const H = STARSHIP_HULL;
  return [
    { from: nose, to: nose.add(new Vec3(0, 0, -H.noseM)), radiusM: H.noseRadiusM },
    { from: nose.add(new Vec3(0, 0, -H.noseM)), to: nose.add(new Vec3(0, 0, -H.lengthM)), radiusM: H.radiusM },
  ];
}

/** The Starship airlock's outer hatch (station frame). */
export function starshipHatch(nose: Vec3): Vec3 {
  return nose.add(new Vec3(0, STARSHIP_HULL.radiusM + 0.15, -HATCH_AFT_M));
}

/** From the Starship's airlock along its hull: aft to the engine skirt, or round to the solar panels (distribución nuestra). */
export function starshipRoute(site: "nodriza-motores" | "nodriza-energia", nose: Vec3): readonly RailPoint[] {
  const r = STARSHIP_HULL.radiusM + 0.25;
  const at = (aft: number, angle = 0) => nose.add(new Vec3(r * Math.sin(angle), r * Math.cos(angle), -aft));
  const hatch = { at: starshipHatch(nose), label: "Escotilla de la esclusa de la Starship", anchor: true };
  if (site === "nodriza-energia")
    return [hatch, { at: at(HATCH_AFT_M + 2, 0.4), label: "Asideros del casco" }, { at: at(HATCH_AFT_M + 4, Math.PI / 4), label: "Paneles solares del casco (sitio de trabajo)" }];
  return [hatch, { at: at(30), label: "Casco, sección de carga", anchor: true }, { at: at(42), label: "Casco, depósitos", anchor: true }, { at: at(STARSHIP_HULL.lengthM - 2.5), label: "Faldón de popa: los motores (sitio de trabajo)" }];
}

/** What each job outside is, how the ISS does it and what she does there. */
export interface EvaJob {
  readonly site: EvaSite;
  readonly title: string;
  readonly how: string;
  readonly steps: readonly string[];
  readonly trap: string;
  readonly source: string;
  /** Not done this way yet: the licence, said with the job. */
  readonly licence?: string;
}

export const EVA_JOBS: Readonly<Record<EvaSite, EvaJob>> = {
  alas: {
    site: "alas",
    title: "Montar el ala nueva",
    how: "Como las iROSA: Canadarm2 trae el rollo desde la plataforma expuesta y ella lo monta en la base del ala, de pie en el APFR",
    steps: ["Canadarm2 trae el rollo nuevo desde la JEM-EF", "atar el rollo con un cable de equipo", "soltarlo del brazo y llevarlo a su soporte", "apretar los pernos con la llave PGT", "conectar los cables de potencia", "desenrollar el ala y comprobar la corriente"],
    trap: "soltar el rollo del brazo sin atarlo antes",
    source: url(S.irosa),
  },
  radiadores: {
    site: "radiadores",
    title: "Cambiar el radiador de S1",
    how: "Como los cambios del lazo de amoníaco: Canadarm2 trae la pieza y ella la cambia en un paseo",
    steps: ["Canadarm2 trae el panel nuevo desde la JEM-EF", "cerrar las válvulas de amoníaco del panel viejo", "soltar los acoples rápidos con la llave PGT", "dar el panel viejo al brazo", "montar el nuevo y apretar los pernos", "abrir las válvulas y comprobar que no fuga"],
    trap: "soltar los acoples con las válvulas de amoníaco abiertas",
    source: url(S.eatcs),
  },
  escudo: {
    site: "escudo",
    title: "Montar los escudos contra micrometeoritos",
    how: "Como en el paseo del 30 de marzo de 2017: ella monta los paneles en el puerto de Tranquility",
    steps: ["sacar el panel de la bolsa con su cable de equipo puesto", "encajar el panel en sus soportes", "apretar los cierres con la llave PGT", "comprobar la separación con el casco", "guardar la bolsa vacía"],
    trap: "sacar el panel de la bolsa sin cable de equipo",
    source: url(S.mmod),
  },
  modulo: {
    site: "modulo",
    title: "Cambiar una pieza de fuera del módulo",
    how: "Como un ORU de la ISS: Canadarm2 trae la pieza desde la JEM-EF y ella la cambia en un paseo desde Quest",
    steps: ["Canadarm2 trae la pieza nueva desde la JEM-EF", "atar la pieza con un cable de equipo", "soltar los pernos de la vieja con la llave PGT", "dar la pieza vieja al brazo", "montar la nueva y apretar los pernos", "conectar y comprobar"],
    trap: "soltar los pernos de la vieja sin tenerla atada",
    source: url(S.oru),
    licence: "Licencia: nadie ha cambiado aún piezas de un módulo de aterrizaje en órbita; se hace como los ORU de la ISS",
  },
  "nodriza-motores": {
    site: "nodriza-motores",
    title: "Cambiar los motores de la Starship",
    how: "Desde la esclusa de la Starship: ella saca la pieza atada y la cambia en el faldón de popa",
    steps: ["sacar la pieza por la esclusa con su cable de equipo", "llevarla por los asideros hasta el faldón", "soltar los pernos del viejo con la llave PGT", "atar el viejo y apartarlo", "montar el nuevo y apretar los pernos", "conectar y comprobar"],
    trap: "soltar los pernos del viejo sin tenerlo atado",
    source: url(S.oru),
    licence: "Licencia: ninguna nave ha cambiado un motor en órbita; la esclusa del HLS está en desarrollo",
  },
  "nodriza-energia": {
    site: "nodriza-energia",
    title: "Cambiar la energía de la Starship",
    how: "Desde la esclusa de la Starship, como las iROSA: ella saca el panel atado y lo monta en el casco",
    steps: ["sacar el panel por la esclusa con su cable de equipo", "llevarlo a su soporte en el casco", "apretar los pernos con la llave PGT", "conectar los cables de potencia", "desenrollar y comprobar la corriente"],
    trap: "sacar el panel sin cable de equipo",
    source: url(S.irosa),
    licence: "En desarrollo: la esclusa del HLS y los trajes AxEMU se prueban en maquetas (Axiom, 2024)",
  },
};
