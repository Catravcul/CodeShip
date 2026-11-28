import type { BioProcess, CrewNeeds } from "../domain/bioreactor";
import { BIO_SRC as S } from "./bio-sources";
import { EQ_CROPS } from "./outfit";
import { EQ_BIOMINING, EQ_LOOP, EQ_PHB, EQ_PROTEIN, EQ_SPIRULINA } from "./bio-equipment";

export { BIO_EQUIPMENT, EQ_BIO_LAB } from "./bio-equipment";

/**
 * The station's living machines (docs/design/autosustento.md): the crop fields of the agricultural
 * module and the bioreactors the biology lab unlocks. Every rate per hour comes from a measured one
 * (NASA's Biomass Production Chamber, the MELiSSA pilot plant, Lunar Palace 365, autotrophic PHB,
 * BioRock, Solein) scaled to the size of the equipment; what is scaled or made up says so.
 */

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

// --- What one crew member needs ---------------------------------------------------------------

export const CREW_NEEDS: CrewNeeds = {
  o2KgPerDay: 0.816,
  co2KgPerDay: 1.04,
  // About a gallon a day for drink, food and hygiene (NASA 2023); the BVAD's drinking water alone is 2,5 kg.
  waterKgPerDay: 3.8,
  waterRecovered: 0.98,
};

/** kcal per kg of each food the station grows (USDA; Solein from its composition with Atwater factors 4/9/4). */
export const BIO_KCAL_PER_KG: Readonly<Record<string, number>> = {
  grano: 3400,
  espirulina: 2900,
  // 50 % protein, 7,5 % fat, 22,5 % carbohydrate: 0,5·4 + 0,075·9 + 0,225·4 = 3,575 kcal/g.
  proteina: 3575,
};

// --- Measured rates --------------------------------------------------------------------------

/** NASA BPC: 20 m² run for 1200 days (24 000 m²·day). */
const BPC = { m2Days: 20 * 1200, dryKg: 481, edibleKg: 196, o2Kg: 540, co2Kg: 739 };
/** Nitrogen in dry plant biomass (game value: plant tissue holds a few per cent). */
const PLANT_N = 0.03;
const cropsPerHour = (m2: number) => {
  const perM2h = (kg: number) => (kg / BPC.m2Days / 24) * m2;
  return {
    inputs: { co2: r6(perM2h(BPC.co2Kg)), fertilizante: r6(perM2h(BPC.dryKg) * PLANT_N) },
    outputs: { oxigeno: r6(perM2h(BPC.o2Kg)), grano: r6(perM2h(BPC.edibleKg)), biomasa: r6(perM2h(BPC.dryKg - BPC.edibleKg)) },
  };
};

/** L. indica in the MELiSSA pilot plant: 0,58 g/L/day of biomass, 1,19 mmol O₂/L/h. */
const SPIRULINA = { litres: 400, gPerLDay: 0.58, o2MmolPerLH: 1.19, nFraction: 57.47 / 100 / 6.25 };
const spirulinaPerHour = () => {
  const molO2 = (SPIRULINA.o2MmolPerLH / 1000) * SPIRULINA.litres;
  const bio = (SPIRULINA.gPerLDay * SPIRULINA.litres) / 1000 / 24;
  return {
    // Photosynthesis takes one CO₂ for each O₂ it gives (photosynthetic quotient ≈ 1).
    inputs: { co2: r6(molO2 * 0.04401), fertilizante: r6(bio * SPIRULINA.nFraction) },
    outputs: { oxigeno: r6(molO2 * 0.032), espirulina: r6(bio) },
  };
};

/** Lunar Palace 365 solid-waste fermenter: degrades 67 %, ~400 g dry a day, ~670 g CO₂ a day. */
const LOOP = { degradedKgDay: 0.4, degradedShare: 0.67, co2KgDay: 0.67, nRecovered: 0.997 };
const loopPerHour = () => {
  const feed = LOOP.degradedKgDay / LOOP.degradedShare / 24;
  return { inputs: { biomasa: r6(feed) }, outputs: { co2: r6(LOOP.co2KgDay / 24), fertilizante: r6(feed * PLANT_N * LOOP.nRecovered) } };
};

/** Cell biomass CH1,8O0,5N0,2: 24,63 g per C-mol, 11,4 % nitrogen. */
const CELL = { gPerCmol: 24.63, nFraction: (0.2 * 14.007) / 24.63 };
const M = { h2: 2.016, o2: 32.0, co2: 44.01, nh3: 17.03, phbMonomer: 86.09 };

/** Autotrophic C. necator H16: 62 g/L of PHB and 91,3 g/L of cells in 40 h (Tanaka et al. 1995). */
const PHB = { litres: 10, phbGPerL: 62, cellsGPerL: 91.3, hours: 40 };
const phbPerHour = () => {
  const phb = (PHB.phbGPerL * PHB.litres) / PHB.hours / 1000;
  const rest = (phb * (PHB.cellsGPerL - PHB.phbGPerL)) / PHB.phbGPerL;
  // 33 H₂ : 12 O₂ : 4 CO₂ per C₄H₆O₂ unit of PHB (Takeshita et al. 1993).
  const per = (n: number, molar: number) => (phb * n * molar) / M.phbMonomer;
  return {
    inputs: { hidrogeno: r6(per(33, M.h2)), oxigeno: r6(per(12, M.o2)), co2: r6(per(4, M.co2)), fertilizante: r6(rest * CELL.nFraction) },
    outputs: { resina: r6(phb), biomasa: r6(rest) },
  };
};

/** Hydrogen-oxidising bacteria growing: 21,36 H₂ : 6,21 O₂ : 4,09 CO₂ (Takeshita et al. 1993). */
const PROTEIN = { kgPerHour: 0.03 };
const proteinPerHour = () => {
  const cell = (4.09 * CELL.gPerCmol) / 1000;
  const per = (n: number, molar: number) => (PROTEIN.kgPerHour * n * molar) / 1000 / cell;
  const nKg = PROTEIN.kgPerHour * CELL.nFraction;
  return {
    inputs: { hidrogeno: r6(per(21.36, M.h2)), oxigeno: r6(per(6.21, M.o2)), co2: r6(per(4.09, M.co2)), amoniaco: r6((nKg * M.nh3) / 14.007) },
    outputs: { proteina: PROTEIN.kgPerHour },
  };
};

// --- Processes ---------------------------------------------------------------------------------

const crops = cropsPerHour(EQ_CROPS.cropAreaM2 ?? 60);
export const BIO_PROCESSES: readonly BioProcess[] = [
  {
    id: "cultivo",
    name: "Campos de cultivo",
    equipmentId: EQ_CROPS.id,
    organism: "Trigo y papa",
    ...crops,
    startsWhenBuilt: true,
    basis: { value: "Cámara de producción de biomasa de la NASA (BPC): 20 m² durante 1200 días dieron 540 kg de O₂, 196 kg comestibles y 285 kg no comestibles secos, y fijaron 739 kg de CO₂", source: S.bpc, note: "Escalado a 60 m². Nitrógeno: 3 % de la biomasa seca (valor de juego)" },
    steps: ["revisa las bandejas y los LED", "ajusta el caudal de agua y de CO₂", "recoge la cosecha", "manda la paja al bucle"],
  },
  {
    id: "espirulina",
    name: "Fotobiorreactor de espirulina",
    equipmentId: EQ_SPIRULINA.id,
    organism: "Limnospira indica (espirulina)",
    ...spirulinaPerHour(),
    basis: { value: "Planta piloto MELiSSA: 0,58 g/L·día de biomasa y 1,19 mmol de O₂ por litro y hora", source: S.limnospira, note: "Escalado a 400 L. Un CO₂ por cada O₂; nitrógeno: 57,47 % de proteína / 6,25 (USDA)" },
    steps: ["revisa el fotobiorreactor", "ajusta el caudal de CO₂", "recoge la espirulina"],
  },
  {
    id: "bucle",
    name: "Bucle de residuos MELiSSA",
    equipmentId: EQ_LOOP.id,
    organism: "Termófilas anaerobias, Rhodospirillum rubrum, Nitrosomonas y Nitrobacter",
    ...loopPerHour(),
    basis: { value: "Fermentador de residuos del Palacio Lunar 365: degradó el 67 %, unos 400 g secos al día, y soltó unos 670 g de CO₂; compartimentos C1–C3 de MELiSSA", source: S.lunarPalace365, note: "Nitrógeno recuperado al 99,7 %, como el de la orina en el Palacio Lunar" },
    steps: ["revisa los tres reactores", "ajusta el caudal de residuos", "recoge el CO₂ y el fertilizante"],
  },
  {
    id: "phb",
    name: "Biorreactor de resina PHB",
    equipmentId: EQ_PHB.id,
    organism: "Cupriavidus necator",
    ...phbPerHour(),
    basis: { value: "C. necator H16 autótrofo: 62 g/L de PHB y 91,3 g/L de células en 40 h; H₂ : O₂ : CO₂ = 33 : 12 : 4 para hacer PHB", source: S.phbAutotrophic, note: "Escalado a 10 L. Las células que quedan van como biomasa al bucle" },
    steps: ["revisa el reactor", "ajusta el caudal de gas", "recoge la resina", "manda las células al bucle"],
  },
  {
    id: "biomineria",
    name: "Tanques de biominería",
    equipmentId: EQ_BIOMINING.id,
    organism: "Sphingomonas desiccabilis y acidófilas del hierro",
    inputs: { "mineral-niquel": 0.02, "mineral-hierro": 0.08, agua: 0.01, fertilizante: 0.00005 },
    outputs: { niquel: 0.016, hierro: 0.048 },
    basis: { value: "BioRock (ISS, 21 días): S. desiccabilis sacó tierras raras del basalto al 111,9–429,2 % de los controles estériles", source: S.biorock, note: "Ritmo y rendimientos (80 % del níquel, 60 % del hierro): valores de juego. En BioRock salió solo el 0,02–0,12 % de las tierras raras" },
    steps: ["revisa los tanques", "ajusta el caudal de mineral", "recoge el níquel y el hierro"],
  },
  {
    id: "proteina",
    name: "Reactor de proteína (tipo Solein)",
    equipmentId: EQ_PROTEIN.id,
    organism: "Xanthobacter sp. SoF1",
    ...proteinPerHour(),
    basis: { value: "Solein (Solar Foods): bacterias que comen H₂ y CO₂, ~50 % de proteína", source: S.solein, note: "0,72 kg al día: valor de juego" },
    steps: ["revisa el reactor", "ajusta el caudal de gas", "recoge la proteína"],
  },
];

/** Where each output of the living machines goes: the «which system does it feed» challenge and the Vida tab. */
export const BIO_OUTPUT_USE: Readonly<Record<string, string>> = {
  oxigeno: "el aire de la estación",
  grano: "la despensa de la nodriza, como harina",
  biomasa: "el bucle de residuos",
  co2: "los cultivos y los biorreactores",
  fertilizante: "los cultivos y la espirulina",
  espirulina: "el pienso de las gallinas",
  proteina: "el pienso de los gatos",
  resina: "la celda de compuestos",
  niquel: "la fundición y la impresora",
  hierro: "la fundición y la impresora",
};

/**
 * Station food into the mothership's larder (kitchen/data/items.ts units). Game values: a larder
 * portion of flour is 120 g (two 60 g chapatis, kitchen/data/recipes.ts); a day of hen feed is the
 * flock's 3 × ~110 g; the cats' kibble is counted in grams.
 */
export const LARDER_UNITS: readonly { readonly material: string; readonly item: string; readonly kgPerUnit: number; readonly label: string }[] = [
  { material: "grano", item: "harina", kgPerUnit: 0.12, label: "porciones de harina" },
  { material: "espirulina", item: "pienso-gallinas", kgPerUnit: 0.33, label: "días de pienso de gallinas" },
  { material: "proteina", item: "pienso-gatos", kgPerUnit: 0.001, label: "g de pienso de gatos" },
];

/** Crew living at the station for the gauge and the exhaled CO₂: Doménica (game value). */
export const STATION_CREW = 1;
