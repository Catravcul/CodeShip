import type { Blueprint } from "../domain/blueprint";
import type { BioProcess, CrewNeeds } from "../domain/bioreactor";
import type { EquipmentSpec } from "../domain/outfit";
import { BIO_SRC as S } from "./bio-sources";
import { EQ_CROPS } from "./outfit";

/**
 * The station's living machines (docs/design/autosustento.md): the crop fields of the agricultural
 * module and the bioreactors the biology lab unlocks. Every rate per hour comes from a measured one
 * (NASA's Biomass Production Chamber, the MELiSSA pilot plant, Lunar Palace 365, autotrophic PHB,
 * BioRock, Solein) scaled to the size of the equipment; what is scaled or made up says so.
 */

const GAME = "Masa, potencia, receta y horas: valores de juego";
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

// --- Equipment ---------------------------------------------------------------------------------

export const EQ_BIO_LAB: EquipmentSpec = {
  id: "laboratorio-bio",
  name: "Laboratorio de biología",
  fitsIn: ["fabrica", "agricola", "planta"],
  racks: 1,
  massKg: 450,
  powerKw: 1,
  panel: "vida",
  info: "Guantera sellada para cultivos, microscopio, autoclave y congelador de cepas: aquí empiezan la espirulina, las bacterias del bucle y las que comen hidrógeno",
  basis: { value: "Como la guantera de ciencias de la vida (LSG) del módulo Kibo de la ISS, desde 2018", source: S.lsg, note: GAME },
};
export const EQ_SPIRULINA: EquipmentSpec = {
  id: "fotobiorreactor-espirulina",
  name: "Fotobiorreactor de espirulina",
  fitsIn: ["agricola", "fabrica"],
  racks: 2,
  massKg: 1000,
  powerKw: 2.5,
  panel: "vida",
  info: "Tubos de vidrio con 400 L de Limnospira indica (espirulina) bajo LED: hace oxígeno y comida, como el compartimento C4a de MELiSSA",
  basis: { value: "Limnospira indica en el fotobiorreactor de la planta piloto MELiSSA (0,58 g/L·día, 1,19 mmol O₂/L·h); en la ISS, ArtEMISS (2017) y PBR@LSR (2019)", source: S.limnospira, note: `400 L en dos bastidores. El mínimo físico de luz para su oxígeno es ~0,45 kW (10 fotones por O₂, LED de 3 µmol/J); 2,5 kW con pérdidas. ${GAME}` },
};
export const EQ_LOOP: EquipmentSpec = {
  id: "bucle-melissa",
  name: "Bucle de residuos MELiSSA",
  fitsIn: ["agricola", "planta"],
  racks: 3,
  massKg: 1500,
  powerKw: 2,
  panel: "vida",
  info: "Tres reactores en fila: bacterias termófilas que licúan los residuos a 55 °C, Rhodospirillum rubrum que se come sus ácidos y nitrificantes que hacen nitrato para las plantas",
  basis: { value: "Compartimentos C1, C2 y C3 de MELiSSA; ritmo del fermentador de residuos del Palacio Lunar 365 (~400 g secos al día, 670 g de CO₂)", source: S.lunarPalace365, note: `Nitrógeno: 3 % de la biomasa (valor de juego), recuperado al 99,7 % como el de la orina en el Palacio Lunar. ${GAME}` },
};
export const EQ_PHB: EquipmentSpec = {
  id: "biorreactor-phb",
  name: "Biorreactor de resina PHB",
  fitsIn: ["fabrica", "planta"],
  racks: 1,
  massKg: 250,
  powerKw: 1,
  panel: "vida",
  info: "Cupriavidus necator en 10 L con hidrógeno, oxígeno y CO₂: guarda PHB, un poliéster que sirve de resina para la celda de compuestos",
  basis: { value: "C. necator autótrofo: 62 g/L de PHB en 40 h (Tanaka et al. 1995); 33 H₂ : 12 O₂ : 4 CO₂ por unidad de PHB", source: S.phbAutotrophic, note: `Respira mucho oxígeno: casi 4,5 kg por kg de resina. ${GAME}` },
};
export const EQ_BIOMINING: EquipmentSpec = {
  id: "tanques-biomineria",
  name: "Tanques de biominería",
  fitsIn: ["fabrica", "planta"],
  racks: 2,
  massKg: 900,
  powerKw: 0.5,
  panel: "vida",
  info: "Tanques a 20 °C donde las bacterias disuelven el níquel y el hierro de los sulfuros sin horno ni monóxido de carbono",
  basis: { value: "BioRock (ISS, 2019): Sphingomonas desiccabilis sacó tierras raras del basalto en 21 días a 20 °C; en Tierra, biolixiviación de sulfuros de níquel en tanques", source: S.biorock, note: `Rendimientos (80 % del níquel, 60 % del hierro) y ritmo: valores de juego. ${GAME}` },
};
export const EQ_PROTEIN: EquipmentSpec = {
  id: "reactor-proteina",
  name: "Reactor de proteína (tipo Solein)",
  fitsIn: ["planta", "fabrica", "agricola"],
  racks: 1,
  massKg: 250,
  powerKw: 1.5,
  panel: "vida",
  info: "Bacterias Xanthobacter que comen hidrógeno y CO₂ en 40 L: un polvo con la mitad de proteína para el pienso de los gatos y la despensa",
  basis: { value: "Solein de Solar Foods: Xanthobacter sp. SoF1 con H₂, CO₂ y amonio; 40 L para la proteína de seis personas", source: S.solein, note: `0,72 kg al día (unos 360 g de proteína). Consumos con la estequiometría de Takeshita et al. 1993. ${GAME}` },
};

export const BIO_EQUIPMENT: readonly EquipmentSpec[] = [EQ_BIO_LAB, EQ_SPIRULINA, EQ_LOOP, EQ_PHB, EQ_BIOMINING, EQ_PROTEIN];

// --- Processes ---------------------------------------------------------------------------------

const crops = cropsPerHour(EQ_CROPS.cropAreaM2 ?? 60);
export const BIO_PROCESSES: readonly BioProcess[] = [
  {
    id: "cultivo",
    name: "Campos de cultivo",
    equipmentId: EQ_CROPS.id,
    organism: "Trigo y papa",
    ...crops,
    basis: { value: "Cámara de producción de biomasa de la NASA (BPC): 20 m² durante 1200 días dieron 540 kg de O₂, 196 kg comestibles y 285 kg no comestibles secos, y fijaron 739 kg de CO₂", source: S.bpc, note: "Escalado a 60 m². Nitrógeno: 3 % de la biomasa seca (valor de juego)" },
    settings: [
      { name: "fotoperiodo", question: "¿Cuántas horas de luz al día?", value: "16 h", wrong: ["24 h", "6 h"], source: S.bpc },
      { name: "pH", question: "¿Qué pH lleva la solución nutritiva?", value: "5,8", wrong: ["8,5", "3"], source: S.bpc },
      { name: "co2Aire", question: "¿A cuánto CO₂ crecen mejor?", value: "1200 ppm", wrong: ["10 000 ppm", "100 ppm"], source: S.cropsPerPerson },
    ],
    steps: ["llena las bandejas con solución nutritiva", "siembra el trigo y la papa", "enciende los LED rojos y azules", "sube el CO₂ del aire", "recoge el agua que transpiran en el condensador"],
  },
  {
    id: "espirulina",
    name: "Fotobiorreactor de espirulina",
    equipmentId: EQ_SPIRULINA.id,
    organism: "Limnospira indica (espirulina)",
    ...spirulinaPerHour(),
    basis: { value: "Planta piloto MELiSSA: 0,58 g/L·día de biomasa y 1,19 mmol de O₂ por litro y hora a 932 µmol/m²·s", source: S.limnospira, note: "Escalado a 400 L. Un CO₂ por cada O₂; nitrógeno: 57,47 % de proteína / 6,25 (USDA)" },
    settings: [
      { name: "temperatura", question: "¿A qué temperatura crece la espirulina?", value: "33 °C", wrong: ["55 °C", "4 °C"], source: S.limnospira },
      { name: "luz", question: "¿Cuánta luz le das sin quemarla?", value: "930 µmol/m²·s", wrong: ["1800 µmol/m²·s", "35 µmol/m²·s"], source: S.limnospiraAirlift },
      { name: "dilucion", question: "¿Qué parte del cultivo se cosecha cada hora?", value: "0,025 h⁻¹", wrong: ["0,5 h⁻¹", "0 h⁻¹"], source: S.limnospiraAirlift },
    ],
    steps: ["esteriliza los tubos", "llena con medio y nitrato", "siembra la espirulina", "enciende los LED", "haz burbujear el CO₂", "cosecha y seca la biomasa"],
  },
  {
    id: "bucle",
    name: "Bucle de residuos MELiSSA",
    equipmentId: EQ_LOOP.id,
    organism: "Termófilas anaerobias, Rhodospirillum rubrum, Nitrosomonas y Nitrobacter",
    ...loopPerHour(),
    basis: { value: "Fermentador de residuos del Palacio Lunar 365: degradó el 67 %, unos 400 g secos al día, y soltó unos 670 g de CO₂; compartimentos C1–C3 de MELiSSA", source: S.lunarPalace365, note: "Nitrógeno recuperado al 99,7 %, como el de la orina en el Palacio Lunar" },
    settings: [
      { name: "temperaturaC1", question: "¿A qué temperatura licúan los residuos las bacterias del C1?", value: "55 °C", wrong: ["33 °C", "121 °C"], source: S.melissa },
      { name: "nitrificantes", question: "¿Quién pasa el amonio a nitrato en el C3?", value: "Nitrosomonas y Nitrobacter", wrong: ["Limnospira indica", "Sphingomonas desiccabilis"], source: S.melissa },
    ],
    steps: ["C1: licúa los residuos a 55 °C sin oxígeno", "C2: Rhodospirillum se come los ácidos grasos con luz", "C3: las nitrificantes pasan el amonio a nitrato", "C4: la espirulina y las plantas se comen el CO₂ y el nitrato", "C5: la tripulación respira el oxígeno"],
  },
  {
    id: "phb",
    name: "Biorreactor de resina PHB",
    equipmentId: EQ_PHB.id,
    organism: "Cupriavidus necator",
    ...phbPerHour(),
    basis: { value: "C. necator H16 autótrofo: 62 g/L de PHB y 91,3 g/L de células en 40 h; H₂ : O₂ : CO₂ = 33 : 12 : 4 para hacer PHB", source: S.phbAutotrophic, note: "Escalado a 10 L. Las células que quedan van como biomasa al bucle" },
    settings: [
      { name: "oxigenoMax", question: "¿Cuánto oxígeno puede haber en el gas sin riesgo de explosión?", value: "4 %", wrong: ["21 %", "50 %"], source: S.phbAutotrophic },
      { name: "proporcion", question: "¿En qué proporción H₂ : O₂ : CO₂ hace PHB?", value: "33 : 12 : 4", wrong: ["1 : 1 : 1", "2 : 1 : 0"], source: S.knallgasStoichiometry },
      { name: "lote", question: "¿Cuánto tarda un lote en llenarse de PHB?", value: "40 h", wrong: ["4 h", "400 h"], source: S.phbAutotrophic },
    ],
    steps: ["esteriliza el reactor", "siembra Cupriavidus necator", "mete H₂, O₂ y CO₂ con el O₂ bajo el 4 %", "deja que crezcan", "corta el nitrógeno para que guarden PHB", "extrae y seca la resina"],
  },
  {
    id: "biomineria",
    name: "Tanques de biominería",
    equipmentId: EQ_BIOMINING.id,
    organism: "Sphingomonas desiccabilis y acidófilas del hierro",
    inputs: { "mineral-niquel": 0.02, "mineral-hierro": 0.08, agua: 0.01, fertilizante: 0.00005 },
    outputs: { niquel: 0.016, hierro: 0.048 },
    basis: { value: "BioRock (ISS, 21 días a ~20 °C): S. desiccabilis sacó tierras raras del basalto al 111,9–429,2 % de los controles estériles", source: S.biorock, note: "Ritmo y rendimientos (80 % del níquel, 60 % del hierro): valores de juego. En BioRock salió solo el 0,02–0,12 % de las tierras raras" },
    settings: [
      { name: "bacteria", question: "¿Qué bacteria sacó más tierras raras en BioRock?", value: "Sphingomonas desiccabilis", wrong: ["Bacillus subtilis", "Cupriavidus metallidurans"], source: S.biorock },
      { name: "temperatura", question: "¿A qué temperatura trabajaron en la ISS?", value: "20 °C", wrong: ["55 °C", "1600 °C"], source: S.biorock },
      { name: "tiempo", question: "¿Cuánto duró el lavado en BioRock?", value: "21 días", wrong: ["21 horas", "2 años"], source: S.biorock },
    ],
    steps: ["muele la roca de sulfuros", "llena los tanques con agua y nutrientes", "siembra las bacterias", "remueve a 20 °C", "saca el líquido con los metales", "deposita el níquel y el hierro con corriente"],
  },
  {
    id: "proteina",
    name: "Reactor de proteína (tipo Solein)",
    equipmentId: EQ_PROTEIN.id,
    organism: "Xanthobacter sp. SoF1",
    ...proteinPerHour(),
    basis: { value: "Solein (Solar Foods): bacterias que comen H₂ y CO₂, ~50 % de proteína", source: S.solein, note: "0,72 kg al día: valor de juego" },
    settings: [
      { name: "proteina", question: "¿Qué parte de Solein es proteína?", value: "~50 %", wrong: ["~5 %", "~95 %"], source: S.solein },
    ],
    steps: ["revisa el reactor", "ajusta el caudal de gas", "recoge la proteína"],
  },
];
