import { Vec3 } from "@core/math/vec3";
import type { Sourced } from "@core/units";
import type { ChemicalDrive, MassItem, MothershipSpec } from "../domain/mothership";
import { CAREER_LIMIT, FREE_SPACE_GCR } from "./equipment";
import { STATION_LIFE_SUPPORT } from "@modules/life-support/data/hosts";
import type { LifeSupportConfig } from "@modules/life-support/domain/life-support";

/**
 * Starship as the mothership (docs/design/nodriza-starship.md). Real dimensions, engines and tanks
 * from the sources below; the crewed interior is not published, so its layout is ours («distribución
 * nuestra», data/starship-interior.ts) and so is the docking port the lander uses.
 *
 * Body frame like the rest of the game: x right, y up, z aft (the nose points to −z). The hull's
 * axis is z; the nose tip is at z = −26,05 and the engine skirt at +26,05.
 */
export const STARSHIP_SRC = {
  starship: "SpaceX Starship (nave): 52,1 m de alto (bloque 2), 9 m de diámetro, 85 t en vacío, 1500 t de propelente (≈ 1170 t de oxígeno y 330 t de metano), 614 m³, 3 Raptor + 3 Raptor de vacío, cuatro aletas, 17 m de envergadura: https://en.wikipedia.org/wiki/SpaceX_Starship_(spacecraft)",
  raptor: "SpaceX Raptor: Raptor 2 de 2260 kN a nivel del mar, 1630 kg; Raptor de vacío de 2530 kN e Isp ≈ 380 s; relación O/F 3,6: https://en.wikipedia.org/wiki/SpaceX_Raptor",
  hls: "Starship HLS: paneles solares en el casco, propulsores a media altura para el alunizaje, dos esclusas y ascensor; 2–4 tripulantes: https://en.wikipedia.org/wiki/Starship_HLS",
  idss: "International Docking System Standard (IDSS), puerto de acople andrógino de 800 mm de paso: https://ntrs.nasa.gov/citations/20220011643",
  ispr: "Bastidor ISPR de la ISS (unos 2 m × 1,05 m × 0,86 m): https://en.wikipedia.org/wiki/International_Standard_Payload_Rack",
  hayabusa2: "Hayabusa2 esperó en su «home position», a unos 20 km de Ryugu, y bajaba desde allí: https://en.wikipedia.org/wiki/Hayabusa2",
} as const;

const S = STARSHIP_SRC;

/** One Raptor 2, kg (also used for the vacuum engine: the source gives no RVac mass). */
export const RAPTOR_KG = 1630;
/** Empty Starship, block 2, kg. */
export const STARSHIP_EMPTY_KG = 85000;

export const STARSHIP_DRIVE: ChemicalDrive = {
  engines: [
    {
      id: "raptor-vacio",
      name: "Raptor de vacío (RVac)",
      shortName: "RVac",
      count: 3,
      thrustN: 2_530_000,
      ispS: 380,
      massKg: RAPTOR_KG,
      cruise: true,
      sources: [S.raptor, S.starship],
      note: "Empuje en vacío del RVac del Raptor 2; la fuente no da su masa y tomamos la del Raptor 2",
    },
    {
      id: "raptor-2",
      name: "Raptor 2 (nivel del mar)",
      shortName: "Raptor",
      count: 3,
      thrustN: 2_260_000,
      ispS: 327,
      massKg: RAPTOR_KG,
      cruise: false,
      sources: [S.raptor, S.starship],
      note: "Empuje e Isp a nivel del mar: en el vacío no se usan en el crucero (la tobera corta rinde menos); son los de aterrizar",
    },
  ],
  mixtureRatio: { value: 3.6, source: S.raptor, note: "Oxígeno / metano en masa" },
  oxygenKg: { value: 1_170_000, source: S.starship, note: "Del total de 1500 t" },
  methaneKg: { value: 330_000, source: S.starship, note: "Del total de 1500 t" },
  cruiseMS: {
    value: 500,
    source: S.starship,
    note: "Valor de juego: cada salto acelera hasta 500 m/s como mucho, va por inercia y frena (Δv 1 km/s por salto, unas 9 por depósito lleno). Empujar todo el camino a 4–5 m/s² gastaría el depósito en un salto",
  },
  coastS: { value: 1800, source: S.starship, note: "Valor de juego: un salto corto va por inercia una media hora en vez de encender a fondo; 10 km cuestan unos 11 m/s de Δv" },
};

/** Real crew: the HLS is announced for 2–4; we take 4, the largest published, like an ISS increment of four. */
export const STARSHIP_CREW: Sourced<number> = { value: 4, source: S.hls, note: "El HLS se anuncia para 2–4 tripulantes; tomamos 4, el máximo publicado. Doménica es la que se juega" };

/**
 * The Starship's own life support (docs/design/soporte-vital.md, «Anfitriones»), stepped on the same clock as
 * the station's: Doménica alone aboard (the HLS takes up to four), the 614 m³ of the published pressurised
 * volume as free air (a little less in truth, between racks and stores), and water, food, tanks and spares as
 * the station starts (game values: SpaceX has not published Starship's ECLSS).
 */
export const STARSHIP_LIFE_SUPPORT: LifeSupportConfig = {
  crew: 1,
  freeAirM3: 614,
  waterKg: STATION_LIFE_SUPPORT.waterKg,
  foodKg: STATION_LIFE_SUPPORT.foodKg,
  o2TankKg: STATION_LIFE_SUPPORT.o2TankKg,
  n2TankKg: STATION_LIFE_SUPPORT.n2TankKg,
  spares: STATION_LIFE_SUPPORT.spares,
};

export const STARSHIP_LIFE_SUPPORT_SOURCES = {
  freeAirM3: S.starship,
  crew: S.hls,
  waterFoodTanksAndSpares: "Valor de juego: los de la estación (src/modules/life-support/data/hosts.ts); el soporte vital de Starship no está publicado",
} as const;

const est = (id: string, label: string, kg: number, basis: string, sources: string[] = []): MassItem => ({ id, label, kg, basis, sources });

/** ISPR-type racks in our layout (data/starship-interior.ts: 16 racks on the three decks). */
export const STARSHIP_RACKS = 16;

const OTHER: MassItem[] = [
  est("casco", "Casco de acero, tanques, cabeza de los depósitos de cabecera y escudo térmico", STARSHIP_EMPTY_KG - 6 * RAPTOR_KG, `Derivado: 85 t en vacío (bloque 2) − 6 Raptor de ${RAPTOR_KG} kg`, [S.starship]),
  est("interior", "Interior presurizado (cubiertas, bastidores, cocina, camarotes, aseo, ejercicio)", STARSHIP_RACKS * 700, `Estimación nuestra: ${STARSHIP_RACKS} bastidores tipo ISPR de unos 700 kg cargados`, [S.ispr]),
  est("tripulacion", "Tripulación de cuatro", 4 * 75, "Estimación: unos 75 kg por persona"),
];

export const STARSHIP: MothershipSpec = {
  name: "Starship",
  label: "en-desarrollo",
  chemical: STARSHIP_DRIVE,
  propulsion: {
    propellant: "metano-oxigeno",
    mounts: [],
    fitted: [],
    hotelLoadKw: { value: 0, source: S.hls, note: "Sin publicar: la energía de los paneles del HLS no tiene cifra" },
  },
  equipment: [],
  sunDistanceAu: { value: 1.1264, source: "https://en.wikipedia.org/wiki/101955_Bennu", note: "Semieje mayor de la órbita de Bennu" },
  radiation: { freeSpaceMSvPerYear: FREE_SPACE_GCR, careerLimitMSv: CAREER_LIMIT },
  propellantCapacityKg: STARSHIP_DRIVE.oxygenKg.value + STARSHIP_DRIVE.methaneKg.value,
  habRingItems: [],
  otherItems: OTHER,
  layout: {
    lengthM: 52.1,
    // The lander's IDSS port, on the belly of the payload section by deck 3 (ours: the HLS's own
    // docking port is on the nose, and that one berths the ship at the station).
    port: { position: new Vec3(0, -4.6, -11), normal: new Vec3(0, -1, 0) },
    // The flight deck, under the header tanks of the nose: the deck camera looks out from here.
    nodeZ: -19,
    nodeRadiusM: 3,
    spine: { fromZ: -26.05 + 4.5, toZ: 26.05, radiusM: 4.5 },
    thrusterZ: 24,
    // 17 m of span over a 9 m hull: each flap reaches 4 m out. Positions along the hull: ours, from photos.
    flaps: [
      { fromZ: -21, toZ: -14, spanM: 3.2 },
      { fromZ: 15, toZ: 25, spanM: 4 },
    ],
    spineModules: [],
  },
  parkingDistanceM: { value: 1350, source: S.hayabusa2, note: "Valor de juego: la zona de vuelo está comprimida. Hayabusa2 esperaba a ~20 km de Ryugu" },
};

/** Starship's nose port (the HLS's IDSS port on the tip): it berths at the station nose first. */
export const STARSHIP_NOSE_PORT = { position: new Vec3(0, 0, -26.6), axis: new Vec3(0, 0, -1), forward: new Vec3(0, -1, 0) };
