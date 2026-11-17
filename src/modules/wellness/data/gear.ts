import type { Sourced } from "@core/units";

/**
 * The real equipment of the crew areas (docs/design/equipos.md; reglas.md §4.5: «cada equipo se ve como el real»):
 * what each machine is, its size in metres and the label of its data. Starship has no published interior, so on
 * its decks they are the ISS's own machines («licencia: equivalente de la ISS»); on the station they are real.
 *
 * Sizes: the ones published are cited; the rest are read from NASA/JAXA photos («medida nuestra» in `note`).
 */
export type GearKind = "t2" | "cevis" | "ared" | "aqh" | "refugio" | "whc" | "estiba" | "esterilla" | "checs";

export interface GearSpec {
  readonly kind: GearKind;
  readonly name: string;
  /** Size as it stands: width (across her), height (up from what it is fixed to), depth (along where she faces), m. */
  readonly size: Sourced<{ readonly w: number; readonly h: number; readonly d: number }>;
  /** real: flies on the ISS (or flew); licencia: the ISS's machine put on Starship, whose interior is unpublished; en-desarrollo: proposed. */
  readonly label: "real" | "licencia" | "en-desarrollo";
  readonly what: string;
}

export const GEAR_SRC = {
  sprint: "English, K. L. et al. (2020), NASA Sprint Study, npj Microgravity 6:21 (T2, CEVIS, ARED en la ISS): https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884",
  t2: "Treadmill with Vibration Isolation Stabilization / T2 (COLBERT): arnés de hombros y cintura con gomas, aislamiento por muelles; en Tranquility: https://en.wikipedia.org/wiki/Treadmill_with_Vibration_Isolation_Stabilization",
  cevis: "CEVIS (Danish Aerospace): cicloergómetro de 26,8 kg en el laboratorio de EE. UU. (Destiny), carga por freno de banda en un volante: https://danishaerospace.com/en/products-sep/cevis",
  ared: "ARED: pistones en cilindros de vacío y volantes de inercia, hasta 2700 N con barra; sentadilla, peso muerto y talones: https://en.wikipedia.org/wiki/Advanced_Resistive_Exercise_Device",
  aqh: "Aquatic Habitat (AQH) de JAXA: dos cámaras de unos 15 × 7 × 7 cm (unos 700 cm³), luz LED día/noche, dos cámaras de vídeo, filtro de bacterias y comedero automático: https://www.universetoday.com/96475/fish-in-space-space-station-gets-an-aquarium/",
  shelter: "RadWorks Storm Shelter (NASA, NTRS 20150001237): paredes de agua de 9,3–10,8 g/cm² reducen a la mitad la dosis de una tormenta solar: https://ntrs.nasa.gov/api/citations/20150001237/downloads/20150001237.pdf",
  orionShelter: "Orion (Artemis II): ante una tormenta solar la tripulación saca la estiba de las bahías centrales y la pone contra la pared menos blindada para hacerse un refugio: https://www.space.com/space-exploration/artemis/how-the-artemis-2-astronauts-could-weather-a-solar-storm-during-their-moon-mission",
  whc: "Waste and Hygiene Compartment de la ISS en Tranquility (UWMS desde 2020): embudo con aire, asiento con sujeción de muslos y cortinas: https://en.wikipedia.org/wiki/Tranquility_(ISS_module)",
  ctb: "Bolsas de transferencia de carga (CTB) de la ISS, la unidad de estiba; una sencilla mide unos 0,5 × 0,43 × 0,25 m (NASA, «Logistics Reduction»): https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20160002631.pdf",
  checs: "Sistema médico de la ISS (bastidor CHeCS): bolsa médica ambulatoria, bolsa de soporte vital avanzado, desfibrilador LifePak 1000 y ecógrafo: https://newspaceeconomy.ca/2025/09/20/life-above-earth-emergency-procedures-and-medical-capabilities-on-the-international-space-station",
  mat: "Ejercicio en la ISS (sujeciones de pies y cintas para el ejercicio sin gravedad): https://pmc.ncbi.nlm.nih.gov/articles/PMC7434884",
} as const;

export const GEAR: Readonly<Record<GearKind, GearSpec>> = {
  t2: { kind: "t2", name: "Cinta T2 (COLBERT)", size: { value: { w: 0.8, h: 0.35, d: 1.9 }, source: GEAR_SRC.t2, note: "Medida nuestra de las fotos de la NASA; la T2 es una Woodway Path modificada" }, label: "real", what: "Cinta con arnés de hombros y cintura: dos gomas a cada lado la tiran contra la banda" },
  cevis: { kind: "cevis", name: "Bicicleta CEVIS", size: { value: { w: 0.5, h: 1.3, d: 0.8 }, source: GEAR_SRC.cevis, note: "Medida nuestra de las fotos; 26,8 kg (real)" }, label: "real", what: "Cicloergómetro sin sillín: zapatillas enganchadas a los pedales, manos en el manillar y una cinta a la cintura" },
  ared: { kind: "ared", name: "ARED", size: { value: { w: 1.6, h: 1.9, d: 1.0 }, source: GEAR_SRC.ared, note: "Medida nuestra de las fotos" }, label: "real", what: "Plataforma, barra en un brazo con bisagra, dos cilindros de vacío que hacen la carga y volantes de inercia" },
  aqh: { kind: "aqh", name: "Hábitat acuático (AQH)", size: { value: { w: 0.15, h: 0.07, d: 0.07 }, source: GEAR_SRC.aqh, note: "Cada una de las dos cámaras de peces" }, label: "real", what: "Dos cámaras con medakas y caracoles, LED de día y noche, cámaras de vídeo, filtro de bacterias y comedero" },
  refugio: { kind: "refugio", name: "Refugio de tormenta solar", size: { value: { w: 1.05, h: 2.0, d: 0.86 }, source: GEAR_SRC.shelter, note: "Un camarote del tamaño de un bastidor forrado de bolsas de agua: el concepto de RadWorks; Orion se lo hace con la estiba" }, label: "en-desarrollo", what: "Un hueco forrado de bolsas de agua de 10 g/cm² donde la tripulación se mete durante una tormenta solar" },
  whc: { kind: "whc", name: "Aseo (WHC)", size: { value: { w: 1.0, h: 1.9, d: 0.75 }, source: GEAR_SRC.whc, note: "El tamaño de un bastidor (medida nuestra)" }, label: "real", what: "Embudo y manguera con aire, asiento pequeño con barras para los muslos y una cortina" },
  estiba: { kind: "estiba", name: "Estiba (bolsas CTB)", size: { value: { w: 0.5, h: 0.25, d: 0.43 }, source: GEAR_SRC.ctb, note: "Una bolsa CTB sencilla" }, label: "real", what: "Bolsas de carga blancas sujetas con cintas" },
  checs: { kind: "checs", name: "Sistema médico (CHeCS)", size: { value: { w: 1.05, h: 2.0, d: 0.86 }, source: GEAR_SRC.checs, note: "El tamaño de un bastidor ISPR (medida nuestra del bastidor; sus bolsas, de las fotos)" }, label: "real", what: "Bastidor con la bolsa médica ambulatoria (azul), la de soporte vital avanzado (roja), el desfibrilador, el ecógrafo y la tabla de inmovilización" },
  esterilla: { kind: "esterilla", name: "Esterilla", size: { value: { w: 0.6, h: 0.006, d: 1.8 }, source: GEAR_SRC.mat, note: "Esterilla de yoga corriente; las sujeciones de pies son como las de la ISS" }, label: "licencia", what: "Esterilla sujeta a la pared con cintas, con lazos para los pies" },
};
