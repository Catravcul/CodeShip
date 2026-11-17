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

/** Where outside a job is done. */
export type EvaSite = "alas" | "radiadores" | "escudo";

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
export const EVA_ROUTES: Readonly<Record<EvaSite, readonly RailPoint[]>> = {
  radiadores: [...UP, { at: new Vec3(rad.centre.x - rad.half.x - 0.6, under, front), label: "S1, raíz del radiador", anchor: true }, { at: new Vec3(rad.centre.x, under, front + 3), label: "Radiador de S1 (sitio de trabajo)" }],
  alas: [...UP, { at: new Vec3(14, under, front), label: "S1", anchor: true }, { at: new Vec3(26, under, front), label: "S3", anchor: true }, { at: new Vec3(wing.centre.x - wing.half.x - 0.8, under, wing.centre.z + 0.6), label: "Base del ala de S4 (sitio de trabajo)" }],
  escudo: [
    { at: EVA_HATCH, label: "Escotilla EVA de Quest", anchor: true },
    { at: new Vec3(quest.to.x - 0.6, OUT, quest.to.z), label: "Asideros de Quest" },
    { at: new Vec3(0, OUT + 0.2, 1.2), label: "Sobre Unity", anchor: true },
    { at: new Vec3(node3.to.x + 1.2, node3.radiusM + 0.4, 0), label: "Tranquility, puerto de babor (sitio de trabajo)" },
  ],
};

/** What each job outside is, how the ISS does it and what she does there. */
export interface EvaJob {
  readonly site: EvaSite;
  readonly title: string;
  readonly how: string;
  readonly steps: readonly string[];
  readonly trap: string;
  readonly source: string;
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
};
