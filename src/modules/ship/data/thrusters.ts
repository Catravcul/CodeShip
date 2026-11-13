import type { ThrusterModel } from "../domain/components";

/**
 * Real thruster models (docs/design/componentes.md, «Motores principales» and «RCS»). Values are
 * copied from the cited sheets (checked 2026-11-13). When a sheet gives a range, the conservative end
 * is used and the range is noted. Thrust is the class (nominal) value.
 */
export const THR_SRC = {
  biprop: "https://www.l3harris.com/sites/default/files/2025-05/l3harris-ar-bipropellant-rocket-engines.pdf",
  mono: "https://www.l3harris.com/sites/default/files/2025-10/l3harris-ar-monopropellant-rocket-engines.pdf",
  r4d: "https://en.wikipedia.org/wiki/R-4D",
  cassini: "https://en.wikipedia.org/wiki/Cassini%E2%80%93Huygens",
  oms: "https://en.wikipedia.org/wiki/Orbital_Maneuvering_System",
  ariane: "https://ariane.group/app/uploads/2024/09/ArianeGroup_Chemical_Bipropellant_Thruster_Family.pdf",
  mr106l: "https://satcatalog.com/component/mr-106l-22n",
  mr104h: "https://satcatalog.com/component/mr-104h-510n/",
  mr111g: "https://satcatalog.com/component/mr-111g-4n/",
  mr107t: "https://satcatalog.com/component/mr-107t-110n/",
  mr107s: "https://satcatalog.com/component/mr-107s-275n",
  osirisRex: "https://www.spacefoundation.org/2016/09/09/aerojet-rocketdyne-supports-launch-of-osiris-rex-spacecraft-to-explore-near-earth-asteroid/",
  msl: "https://www.spacefoundation.org/2012/08/05/aerojet-propulsion-helps-land-mars-science-laboratory/",
  marshallSoa: "https://ntrs.nasa.gov/api/citations/20205006456/downloads/Marshall%20StateoftheArt_2020Final%20%28AFRL%20PA%20Approved%29-Final.pdf",
  hpgp22: "https://ntrs.nasa.gov/api/citations/20210022261/downloads/HPGP_22N_Abstract_Space_Prop_2022_10012021_Final.pdf",
  ecaps: "https://soff.se/app/uploads/2023/11/ECAPS-Brochure-1.0-2023.pdf",
  hydrazineCatalyst: "https://en.wikipedia.org/wiki/Hydrazine",
} as const;

const PULSED = "Empuje fijo: se regula a pulsos (en el juego, el acelerador es el ciclo de trabajo)";
const CATALYST = "Cámara con lecho catalizador de iridio sobre alúmina; el lecho se calienta antes de encender";

// --- Main engines: MMH/NTO (MON-3) -------------------------------------------------------------

/** R-4D-11: the R-4D still in production. Cassini flew two R-4D as its main engines. */
export const R4D: ThrusterModel = {
  id: "aerojet-r-4d",
  name: "Aerojet Rocketdyne R-4D-11 (490 N)",
  thrustN: 490, // "110 lbf"
  ispS: 315, // steady state
  dryMassKg: 4.31, // "9.5 lb"
  propellant: "MMH/NTO",
  sources: [THR_SRC.biprop, THR_SRC.r4d, THR_SRC.cassini],
  sheet: {
    thrustRange: "490 N (110 lbf) nominal",
    ispRange: "315 s",
    mixtureRatio: 1.65,
    inletPressure: "15,2 bar (220 psia); 4,1 a 29,3 bar",
    power: "Válvulas de solenoide de doble bobina; la hoja no da los vatios",
    chamber: "Aleación de niobio con recubrimiento de siliciuro (el R-4D original era de molibdeno)",
    life: "59 000 encendidos; la combustión más larga, 12 000 s",
    throttle: PULSED,
    flight: "RCS del Apolo (desde 1966); ATV, HTV, Orion. Motor principal de Cassini (dos R-4D)",
    status: "Calificado, ha volado, en producción",
    importedChamber: true,
  },
};

/** R-4D-15 HiPAT: rhenium chamber lined with iridium, the highest Isp of the family on MMH. */
export const HIPAT: ThrusterModel = {
  id: "aerojet-r-4d-15-hipat",
  name: "Aerojet Rocketdyne R-4D-15 HiPAT (445 N)",
  thrustN: 445, // "100 lbf (85-115)"
  ispS: 322,
  dryMassKg: 5.44, // "12.0 lb"
  propellant: "MMH/NTO",
  sources: [THR_SRC.biprop, THR_SRC.r4d],
  sheet: {
    thrustRange: "378 a 512 N (85 a 115 lbf)",
    ispRange: "322 s",
    mixtureRatio: 1.65,
    inletPressure: "15,2 bar (220 psia); 6,9 a 27,6 bar",
    power: "Válvula de solenoide de un asiento y doble bobina; la hoja no da los vatios",
    chamber: "Renio con forro de iridio (desde el R-4D-14), que aguanta mejor la oxidación a alta temperatura",
    life: "391 encendidos; la combustión más larga, 7200 s; 2 927 000 lbf·s de impulso total",
    throttle: PULSED,
    flight: "Motor de apogeo de satélites geoestacionarios: la familia R-4D suma más de 300 misiones de apogeo sin fallo",
    status: "Calificado, ha volado, en producción",
    importedChamber: true,
  },
};

/** ArianeGroup 400 N apogee motor: the European equivalent, platinum chamber. */
export const S400: ThrusterModel = {
  id: "arianegroup-s400",
  name: "ArianeGroup 400N (425 N)",
  thrustN: 425,
  ispS: 321,
  dryMassKg: 4.3, // "4.30 kg (with valve)"
  propellant: "MMH/NTO",
  sources: [THR_SRC.ariane],
  sheet: {
    thrustRange: "340 a 450 N",
    ispRange: "321 s",
    mixtureRatio: 1.65,
    inletPressure: "12,5 a 18,5 bar",
    power: "35 W por bobina, solo al abrir o cerrar (válvula biestable)",
    chamber: "Cámara y garganta de aleación de platino; tobera de Nimonic",
    life: "La hoja no da encendidos ni horas",
    throttle: PULSED,
    flight: "Más de 40 años en el espacio (misiones de 2000 a 2016 en la hoja)",
    status: "En producción",
    importedChamber: true,
  },
};

/** R-42: twice the thrust of an R-4D for a little more mass. */
export const R42: ThrusterModel = {
  id: "aerojet-r-42",
  name: "Aerojet Rocketdyne R-42 (890 N)",
  thrustN: 890, // "200 lbf (140-305)"
  ispS: 305,
  dryMassKg: 6.58, // "14.5 lb"
  propellant: "MMH/NTO",
  sources: [THR_SRC.biprop],
  sheet: {
    thrustRange: "623 a 1357 N (140 a 305 lbf)",
    ispRange: "305 s",
    mixtureRatio: 1.65,
    inletPressure: "15,2 bar (220 psia); 10 a 25,5 bar",
    power: "Válvula de solenoide de doble asiento; la hoja no da los vatios",
    chamber: "La hoja no lo da",
    life: "134 encendidos; la combustión más larga, 3940 s",
    throttle: PULSED,
    flight: "Calificado y ha volado (hoja de L3Harris)",
    status: "Calificado, ha volado, en producción",
    importedChamber: true,
  },
};

/** The Space Shuttle's OMS engine, now on Orion's service module: far more than the probe needs. */
export const AJ10_190: ThrusterModel = {
  id: "aerojet-aj10-190",
  name: "Aerojet AJ10-190 OMS (26,7 kN)",
  thrustN: 26700,
  ispS: 316,
  dryMassKg: 118, // "118 kg (260 lb)"
  propellant: "MMH/NTO",
  sources: [THR_SRC.oms, THR_SRC.biprop],
  sheet: {
    thrustRange: "26,7 kN (6000 lbf)",
    ispRange: "316 s",
    mixtureRatio: 1.65,
    inletPressure: "Cámara a 8,6 bar",
    power: "La fuente no lo da",
    chamber: "La fuente no lo da",
    life: "1000 encendidos, 15 h en total, 100 misiones",
    throttle: "Empuje fijo",
    flight: "Sistema de maniobra orbital del transbordador (desde STS-1, 1981); módulo de servicio europeo de Orion (Artemis)",
    status: "Ha volado; L3Harris lo rehace como AR-40 para Orion",
    importedChamber: false,
  },
};

// --- Main engines: hydrazine -------------------------------------------------------------------

/**
 * Hydrazine monopropellant engine in the 510 N class: a main engine that drinks from the RCS tank.
 * Steady state "201.0 to 554.2 N" depending on feed pressure; Isp "223 to 237 seconds" (low end used).
 */
export const MR104H: ThrusterModel = {
  id: "aerojet-mr-104h",
  name: "Aerojet Rocketdyne MR-104H (clase de 510 N)",
  thrustN: 510,
  ispS: 223,
  dryMassKg: 2.4, // "total mass of 2.4 kg" (engine and valves)
  propellant: "Hydrazine",
  sources: [THR_SRC.mr104h, THR_SRC.hydrazineCatalyst],
  sheet: {
    thrustRange: "201 a 554 N según la presión",
    ispRange: "223 a 237 s",
    power: "60,1 W de media (satcatalog)",
    chamber: CATALYST,
    life: "satcatalog no lo da",
    throttle: "Baja con la presión del tanque (purga); a pulsos",
    flight: "Ha volado (satcatalog)",
    status: "En producción",
    importedChamber: false,
  },
};

/** OSIRIS-REx flew four of these as its main engines and left Bennu with them. */
export const MR107S: ThrusterModel = {
  id: "aerojet-mr-107s",
  name: "Aerojet Rocketdyne MR-107S (clase de 275 N)",
  thrustN: 275,
  ispS: 225, // "225 to 236 sec" (satcatalog); the L3Harris sheet gives 232-237
  dryMassKg: 1.01,
  propellant: "Hydrazine",
  sources: [THR_SRC.mr107s, THR_SRC.mono, THR_SRC.osirisRex, THR_SRC.hydrazineCatalyst],
  sheet: {
    thrustRange: "85 a 360 N según la presión",
    ispRange: "225 a 236 s",
    power: "52 W de media (satcatalog)",
    chamber: CATALYST,
    life: "87 encendidos y 8764 pulsos calificados",
    throttle: "Baja con la presión del tanque (purga); a pulsos",
    flight: "OSIRIS-REx: cuatro como motores principales (encendieron para salir de Bennu)",
    status: "En producción",
    importedChamber: false,
  },
};

/** The throttleable lander engine: eight landed Curiosity. Only ten starts are qualified. */
export const MR80B: ThrusterModel = {
  id: "aerojet-mr-80b",
  name: "Aerojet Rocketdyne MR-80B (3,6 kN, regulable)",
  thrustN: 3600, // "7-810 lbf (31-3600 N)"
  ispS: 200, // "200-230"
  dryMassKg: 8.6, // "19 lbm (8.6 kg)"
  propellant: "Hydrazine",
  sources: [THR_SRC.mono, THR_SRC.msl, THR_SRC.hydrazineCatalyst],
  sheet: {
    thrustRange: "31 a 3600 N",
    ispRange: "200 a 230 s",
    power: "La hoja no lo da",
    chamber: CATALYST,
    life: "Solo 10 encendidos calificados (650 000 N·s)",
    throttle: "Regulable más de 100:1: es un motor de aterrizaje",
    flight: "Mars Science Laboratory: ocho en la etapa de descenso que bajó a Curiosity (2012)",
    status: "Ha volado",
    importedChamber: false,
  },
};

// --- RCS ---------------------------------------------------------------------------------------

export const MR106L: ThrusterModel = {
  id: "aerojet-mr-106l",
  name: "Aerojet Rocketdyne MR-106L (clase de 22 N)",
  thrustN: 22, // nominal class; steady state "10 to 34 N" depending on feed pressure
  ispS: 228, // "228 to 235 sec"
  dryMassKg: 0.59, // "total mass of 0.59 kg" (the L3Harris sheet rounds to 0.60)
  propellant: "Hydrazine",
  sources: [THR_SRC.mr106l, THR_SRC.mono, THR_SRC.osirisRex, THR_SRC.hydrazineCatalyst],
  sheet: {
    thrustRange: "10 a 34 N según la presión",
    ispRange: "228 a 236 s",
    power: "36,2 W de media (satcatalog)",
    chamber: CATALYST,
    life: "1483 encendidos y 120 511 pulsos; pulso mínimo de 0,1 N·s",
    throttle: "A pulsos",
    flight: "OSIRIS-REx llevaba seis para corregir la trayectoria",
    status: "En producción",
    importedChamber: false,
  },
};

/** Small attitude thruster: gentle, light and frugal with mass. */
export const MR111G: ThrusterModel = {
  id: "aerojet-mr-111g",
  name: "Aerojet Rocketdyne MR-111G (clase de 4 N)",
  thrustN: 4, // class thrust; steady state "1.8 to 4.9 N"
  ispS: 219, // "219 to 229 sec"
  dryMassKg: 0.37, // engine, valves and heaters
  propellant: "Hydrazine",
  sources: [THR_SRC.mr111g, THR_SRC.mono, THR_SRC.osirisRex, THR_SRC.hydrazineCatalyst],
  sheet: {
    thrustRange: "1,8 a 4,9 N según la presión",
    ispRange: "219 a 230 s",
    power: "16,1 W de media (satcatalog)",
    chamber: CATALYST,
    life: "1777 encendidos y 420 145 pulsos; pulso mínimo de 0,061 N·s",
    throttle: "A pulsos",
    flight: "OSIRIS-REx llevaba dieciséis para la actitud",
    status: "En producción",
    importedChamber: false,
  },
};

/** Heavy attitude thruster: five times the push of the MR-106L, for a nimble but thirsty ship. */
export const MR107T: ThrusterModel = {
  id: "aerojet-mr-107t",
  name: "Aerojet Rocketdyne MR-107T (clase de 110 N)",
  thrustN: 110, // class thrust; steady state "54 to 125 N"
  ispS: 222, // "222 to 225 sec"
  dryMassKg: 1.01, // "total mass of 1.01 kg (includes engine, valves, and heaters)"
  propellant: "Hydrazine",
  sources: [THR_SRC.mr107t, THR_SRC.mono, THR_SRC.hydrazineCatalyst],
  sheet: {
    thrustRange: "54 a 125 N según la presión",
    ispRange: "222 a 225 s",
    power: "52 W de media (satcatalog)",
    chamber: CATALYST,
    life: "Solo 44 encendidos y 36 500 pulsos calificados",
    throttle: "A pulsos",
    flight: "Ha volado (satcatalog)",
    status: "En producción",
    importedChamber: false,
  },
};

/** ArianeGroup 10 N: the European workhorse RCS thruster, on MMH/NTO from the main tanks. */
export const S10: ThrusterModel = {
  id: "arianegroup-10n",
  name: "ArianeGroup 10N (MMH/NTO)",
  thrustN: 10, // "6.0 to 12.5 N"
  ispS: 292,
  dryMassKg: 0.35, // "350 g (single seat)"
  propellant: "MMH/NTO",
  sources: [THR_SRC.ariane],
  sheet: {
    thrustRange: "6 a 12,5 N",
    ispRange: "292 s",
    mixtureRatio: 1.65,
    inletPressure: "10 a 23 bar (ha volado hasta 6 bar en purga)",
    power: "Válvula de motor de par; la hoja no da los vatios",
    chamber: "Aleación de platino y rodio",
    life: "1 100 000 ciclos y 69 h de combustión calificadas",
    throttle: "A pulsos",
    flight: "Vuela desde 1974: GAIA, BepiColombo, Solar Orbiter",
    status: "En producción",
    importedChamber: true,
  },
};

/** R-1E: a 111 N bipropellant RCS thruster. */
export const R1E: ThrusterModel = {
  id: "aerojet-r-1e",
  name: "Aerojet Rocketdyne R-1E (111 N)",
  thrustN: 111, // "25 lbf (14.5-31)"
  ispS: 280.5,
  dryMassKg: 2.0, // "4.4 lb"
  propellant: "MMH/NTO",
  sources: [THR_SRC.biprop],
  sheet: {
    thrustRange: "64 a 138 N (14,5 a 31 lbf)",
    ispRange: "280,5 s",
    mixtureRatio: 1.65,
    inletPressure: "16,5 bar (240 psia); 8,6 a 24,1 bar",
    power: "Válvula de solenoide de un asiento; la hoja no da los vatios",
    chamber: "La hoja no lo da",
    life: "330 000 pulsos; la combustión más larga, 3600 s",
    throttle: "A pulsos",
    flight: "Calificado y ha volado (hoja de L3Harris)",
    status: "En producción",
    importedChamber: true,
  },
};

/** ECAPS HPGP 22 N on LMP-103S: the green alternative to hydrazine, still in qualification at this size. */
export const HPGP22: ThrusterModel = {
  id: "ecaps-hpgp-22n",
  name: "Bradford-ECAPS HPGP 22N (LMP-103S)",
  thrustN: 22, // "5.5-22"
  ispS: 243, // "243-255"
  dryMassKg: 1.1,
  propellant: "LMP-103S",
  sources: [THR_SRC.marshallSoa, THR_SRC.hpgp22, THR_SRC.ecaps],
  sheet: {
    thrustRange: "5,5 a 22 N",
    ispRange: "243 a 255 s",
    power: "25 a 50 W: el lecho se precalienta más que con hidracina",
    chamber: "Lecho catalizador caliente y cámara de material refractario (sin detalle en la fuente)",
    life: "El modelo de calificación EQM-2 llegó a unos 150 kg de propelente",
    throttle: "A pulsos",
    flight: "El HPGP de 1 N voló en PRISMA (2010); el de 22 N está en calificación con la NASA",
    status: "En calificación",
    importedChamber: true,
  },
};

/** ECAPS HPGP 5 N: the light green thruster. */
export const HPGP5: ThrusterModel = {
  id: "ecaps-hpgp-5n",
  name: "Bradford-ECAPS HPGP 5N (LMP-103S)",
  thrustN: 5, // "1.5-5.5"
  ispS: 239, // "239-253"
  dryMassKg: 0.48,
  propellant: "LMP-103S",
  sources: [THR_SRC.marshallSoa, THR_SRC.ecaps],
  sheet: {
    thrustRange: "1,5 a 5,5 N",
    ispRange: "239 a 253 s",
    power: "15 a 25 W",
    chamber: "Lecho catalizador caliente (sin detalle en la fuente)",
    life: "La fuente no lo da",
    throttle: "A pulsos",
    flight: "La familia HPGP: más de 100 propulsores en 26 satélites (ECAPS)",
    status: "Ha volado la familia; este tamaño, en desarrollo",
    importedChamber: true,
  },
};

export const MAIN_ENGINES: readonly ThrusterModel[] = [HIPAT, R4D, S400, R42, AJ10_190, MR104H, MR107S, MR80B];
export const RCS_THRUSTERS: readonly ThrusterModel[] = [MR106L, MR111G, MR107T, S10, R1E, HPGP22, HPGP5];
