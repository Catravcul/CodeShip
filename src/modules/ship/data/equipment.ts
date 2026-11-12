import type { Sourced } from "@core/units";
import { wallArealDensityKgM2, type Equipment, type PressureWall, type WhippleBumper } from "../domain/equipment";

/**
 * The probe's equipment, from real components (docs/design/componentes.md). Numbers copied from a
 * source say so; derived ones show the sum; estimates are marked «estimación» and game values
 * «valor de juego». Checked 2026-11-12.
 */

// --- Sources -----------------------------------------------------------------
export const EQ_SRC = {
  columbus: "https://en.wikipedia.org/wiki/2219_aluminium_alloy",
  al2195: "https://en.wikipedia.org/wiki/2195_aluminium_alloy",
  ti64: "https://en.wikipedia.org/wiki/Ti-6Al-4V",
  cellucci: "https://ar5iv.arxiv.org/html/1703.00044",
  lmStructure: "https://ntrs.nasa.gov/api/citations/19730010174/downloads/19730010174.pdf",
  lm: "https://en.wikipedia.org/wiki/Apollo_Lunar_Module",
  nds: "https://ntrs.nasa.gov/api/citations/20110011626/downloads/20110011626.pdf",
  rad750: "https://en.wikipedia.org/wiki/RAD750",
  iris: "https://en.wikipedia.org/wiki/Iris_(transponder)",
  bvad: "https://frontiersin.org/journals/space-technologies/articles/10.3389/frspt.2024.1461389/pdf",
  mli: "https://en.wikipedia.org/wiki/Multi-layer_insulation",
  rosa: "https://rdw.com/product-archive/power/rosa/",
  st8: "https://www.jpl.nasa.gov/nmp/st8/tech/solar_array2.html",
  mmrtg: "https://en.wikipedia.org/wiki/Multi-mission_radioisotope_thermoelectric_generator",
  ves16: "https://satnow.com/products/batteries/saft/98-1277-4s1p-ves16-battery",
  mmodHandbook: "https://ntrs.nasa.gov/citations/20090010053",
  hvit: "https://ntrs.nasa.gov/api/citations/20190001193/downloads/20190001193.pdf",
  shieldReview: "https://arxiv.org/pdf/2508.03957",
  bennu: "https://en.wikipedia.org/wiki/101955_Bennu",
} as const;

/** Where the probe works: Bennu's mean distance from the Sun. Solar output is worked out for it. */
export const REGION_SUN_AU: Sourced<number> = { value: 1.1264, source: EQ_SRC.bennu, note: "Semieje mayor de la órbita de Bennu" };

// --- Cabin -------------------------------------------------------------------

/** The cabin is 2.4 × 1.7 × 1.95 m (docs/design/interiores.md): its wall area, m². Game value (the drawn cabin). */
export const CABIN_AREA_M2 = 2 * (2.4 * 1.7 + 2.4 * 1.95 + 1.7 * 1.95);
/** Hatches, windows, floor and rings bolted to the shell. Estimate, the same for every shell. */
export const CABIN_FITTINGS_KG = 120;
/** Yield stress the 4 mm Columbus wall was sized against: Al-Li (504 MPa, Cellucci et al.) over 1.3 (2195 is 30 % stronger than 2219). Derived. */
const AL2219_YIELD_MPA = 504 / 1.3;
/** Thickness of a wall as strong as Columbus's in a material of yield `mpa` (not under `minMm`). Estimate: wall ∝ 1 / yield. */
const sameStrength = (mpa: number, minMm = 0) => Math.max(minMm, (4 * AL2219_YIELD_MPA) / mpa);

function cabin(id: string, name: string, wall: PressureWall, materials: string, flight: string, basis: string, sources: string[]): Equipment {
  const shell = wallArealDensityKgM2(wall) * CABIN_AREA_M2;
  return {
    id,
    name,
    kind: "cabina",
    massKg: Math.round(shell + CABIN_FITTINGS_KG),
    powerW: 0,
    wall,
    materials,
    size: "2,4 × 1,7 × 1,95 m, 8 m³ (valor de juego: la cabina dibujada)",
    flight,
    basis: `Casco: ${CABIN_AREA_M2.toFixed(1)} m² × ${wall.thicknessMm.toFixed(2)} mm × ${wall.densityKgM3} kg/m³ = ${Math.round(shell)} kg. ${basis} Más ${CABIN_FITTINGS_KG} kg de escotillas, ventanas, suelo y anillos (estimación)`,
    sources,
  };
}

export const CABIN_AL2219 = cabin(
  "cabina-al-2219",
  "Cabina de aluminio 2219",
  { material: "Al 2219", thicknessMm: 4, densityKgM3: 2840 },
  "Aluminio 2219 soldado (chapa importada)",
  "La pared cilíndrica del módulo Columbus de la ISS: 4 mm de 2219 (7 mm en los conos)",
  "Pared de 4 mm como la de Columbus; densidad 2,84 g/cm³.",
  [EQ_SRC.columbus],
);

export const CABIN_AL2195 = cabin(
  "cabina-al-li-2195",
  "Cabina de aluminio-litio 2195",
  { material: "Al-Li 2195", thicknessMm: 4 / 1.3, densityKgM3: 2840 * 0.95 },
  "Aluminio-litio 2195 soldado por fricción (chapa importada)",
  "El 2195 voló en el tanque superligero del transbordador y en los tanques del Falcon 9; Orion usa aluminio en su recipiente de presión",
  "El 2195 es un 30 % más resistente y un 5 % menos denso que el 2219: la pared de Columbus se adelgaza a 4 / 1,3 mm.",
  [EQ_SRC.al2195, EQ_SRC.columbus],
);

export const CABIN_TITANIUM = cabin(
  "cabina-titanio",
  "Cabina de titanio Ti-6Al-4V",
  { material: "Ti-6Al-4V", thicknessMm: sameStrength(880), densityKgM3: 4430 },
  "Titanio Ti-6Al-4V (chapa importada; la roca no da titanio en cantidad)",
  "Aleación aeroespacial corriente; el titanio aparece en recipientes y tanques a presión",
  "Límite elástico 880 MPa y densidad 4,43 g/cm³: la pared igual de resistente que la de Columbus mide 4 × 388 / 880 mm.",
  [EQ_SRC.ti64, EQ_SRC.cellucci, EQ_SRC.columbus],
);

export const CABIN_STEEL = cabin(
  "cabina-acero",
  "Cabina de acero de hierro y níquel",
  { material: "Acero Fe-Ni", thicknessMm: sameStrength(690), densityKgM3: 7862 },
  "Acero de hierro y níquel de carbonilo de la roca, impreso y soldado en la estación",
  "Starship usa acero inoxidable en su casco; el acero hecho con hierro de asteroide no ha volado",
  "Acero de 690 MPa y 7,862 g/cm³ (Cellucci et al.): pared de 4 × 388 / 690 mm.",
  [EQ_SRC.cellucci, EQ_SRC.columbus],
);

export const CABIN_CFRP = cabin(
  "cabina-cfrp",
  "Cabina de fibra de carbono (CFRP)",
  { material: "CFRP", thicknessMm: sameStrength(2500 * 0.28, 2.03), densityKgM3: 1620 },
  "Fibra de carbono de la roca con resina importada, curada en horno",
  "La NASA construyó el Composite Crew Module (2007–2009) como alternativa al recipiente metálico de Orion; no ha volado",
  "CFRP de 2500 MPa a lo largo de la fibra, del que un recipiente bobinado aprovecha como mucho el 28 %; espesor mínimo 2,03 mm y 1,62 g/cm³ (Cellucci et al.). Este modelo sencillo exagera la ventaja: no cuenta uniones ni insertos.",
  [EQ_SRC.cellucci, EQ_SRC.columbus],
);

export const CABINS: readonly Equipment[] = [CABIN_AL2195, CABIN_AL2219, CABIN_TITANIUM, CABIN_STEEL, CABIN_CFRP];

// --- Power source --------------------------------------------------------------

export const POWER_RIGID: Equipment = {
  id: "alas-rigidas-1500",
  name: "Alas rígidas de GaAs (1,5 kW)",
  kind: "energia",
  massKg: 19,
  powerW: 1500,
  solar: true,
  materials: "Células de arseniuro de galio sobre paneles de fibra de carbono",
  size: "2 alas de 3,2 × 1,4 m (valor de juego: las del modelo)",
  flight: "Paneles rígidos como los de Dawn (10,5 kW, 80 W/kg)",
  basis: "1500 W a 1 UA (estimación del tamaño) ÷ 80 W/kg de Dawn = 19 kg",
  sources: [EQ_SRC.st8],
};

export const POWER_ROSA: Equipment = {
  id: "rosa-diamond",
  name: "Ala enrollable ROSA Diamond (3,3 kW)",
  kind: "energia",
  massKg: 36,
  powerW: 3300,
  solar: true,
  materials: "Manta flexible de células sobre dos mástiles de material compuesto que se desenrollan",
  size: "8,6 m desplegada",
  flight: "Redwire ROSA: prueba en la ISS (2017), DART y las iROSA de la ISS",
  basis: "Copiado: 3,3 kW al principio de vida, 36 kg, 8,6 m (tabla de configuraciones de Redwire)",
  sources: [EQ_SRC.rosa],
};

export const POWER_MMRTG: Equipment = {
  id: "mmrtg-x2",
  name: "Dos generadores de radioisótopos MMRTG",
  kind: "energia",
  massKg: 2 * 45,
  powerW: 2 * 125,
  materials: "Dióxido de plutonio-238 (4,8 kg cada uno) y termopares; solo importado",
  size: "66,8 cm de largo y 64,2 cm de diámetro con las aletas, cada uno",
  flight: "Curiosity (2012) y Perseverance (2020)",
  basis: "2 × (125 W al principio, unos 100 W a los 14 años; 45 kg). No depende del Sol",
  sources: [EQ_SRC.mmrtg],
};

export const POWER_NONE: Equipment = {
  id: "sin-fuente",
  name: "Sin fuente: solo la batería",
  kind: "energia",
  massKg: 0,
  powerW: 0,
  materials: "—",
  flight: "La etapa de ascenso del módulo lunar volaba solo con baterías",
  basis: "Nada que pesar",
  sources: [EQ_SRC.lm],
};

export const POWER_SOURCES: readonly Equipment[] = [POWER_RIGID, POWER_ROSA, POWER_MMRTG, POWER_NONE];

// --- Battery -------------------------------------------------------------------

/** Saft 4S1P VES16 module: 64 Wh nominal, 0.7 kg, 14.8 V. */
const VES16_MODULE = { wh: 64, kg: 0.7 };
const liIon = (modules: number): Equipment => ({
  id: `li-ion-${modules}`,
  name: `Batería de ion-litio (${((modules * VES16_MODULE.wh) / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} kWh)`,
  kind: "bateria",
  massKg: Math.round(modules * VES16_MODULE.kg * 10) / 10,
  powerW: 0,
  storageWh: modules * VES16_MODULE.wh,
  rechargeable: true,
  materials: "Células de ion-litio VES16 (importadas) en cajas de metal",
  size: `${modules} módulos de 90 × 84 × 77 mm`,
  flight: "Células VES16 de Saft: hasta 18 años en órbita",
  basis: `${modules} módulos 4S1P VES16 × (64 Wh, 0,7 kg) = ${Math.round(modules * VES16_MODULE.wh)} Wh, ${Math.round(modules * VES16_MODULE.kg)} kg (unos 91 Wh/kg)`,
  sources: [EQ_SRC.ves16],
});

export const BATTERY_LI5 = liIon(78);
export const BATTERY_LI10 = liIon(156);
export const BATTERY_AGZN: Equipment = {
  id: "plata-zinc-lm",
  name: "Dos baterías de plata-zinc del módulo lunar",
  kind: "bateria",
  massKg: 2 * 57,
  powerW: 0,
  storageWh: 2 * 296 * 30,
  rechargeable: false,
  materials: "Plata y zinc (importados); primarias: no se recargan",
  flight: "Etapa de ascenso del módulo lunar Apolo",
  basis: "2 × 296 Ah a 28–32 V (30 V) = 17,8 kWh; 57 kg cada una",
  sources: [EQ_SRC.lm],
};

export const BATTERIES: readonly Equipment[] = [BATTERY_LI5, BATTERY_LI10, BATTERY_AGZN];

// --- Micrometeoroid shield -------------------------------------------------------

/** Non-ballistic hardware (fasteners, standoffs) is «up to 35 %» of a shield's mass: the top end is used. */
const SHIELD_OVERHEAD = 0.35;
function whipple(id: string, name: string, bumper: WhippleBumper, materials: string, flight: string, sources: string[]): Equipment {
  const ballistic = bumper.thicknessCm * bumper.densityGcm3 * 10 * CABIN_AREA_M2;
  return {
    id,
    name,
    kind: "escudo",
    massKg: Math.round(ballistic / (1 - SHIELD_OVERHEAD)),
    powerW: 0,
    bumper,
    materials,
    size: `Lámina de ${bumper.thicknessCm.toLocaleString("es-ES")} cm a ${bumper.standoffCm} cm de la pared`,
    flight,
    basis: `${CABIN_AREA_M2.toFixed(1)} m² × ${(bumper.thicknessCm * bumper.densityGcm3).toFixed(3)} g/cm² = ${Math.round(ballistic)} kg, más un 35 % de soportes (el máximo que da la revisión)`,
    sources: [...sources, EQ_SRC.shieldReview],
  };
}

export const SHIELD_NONE: Equipment = {
  id: "sin-escudo",
  name: "Sin escudo: la pared y las mantas",
  kind: "escudo",
  massKg: 0,
  powerW: 0,
  materials: "—",
  flight: "El módulo lunar solo llevaba mantas térmicas sobre la estructura",
  basis: "Nada que pesar",
  sources: [EQ_SRC.lm],
};
export const SHIELD_WHIPPLE = whipple(
  "whipple-al",
  "Escudo Whipple de aluminio",
  { material: "Al 6061-T6", thicknessCm: 0.12, densityGcm3: 2.7, standoffCm: 10 },
  "Aluminio 6061-T6 (chapa importada)",
  "La configuración de ejemplo del manual de la NASA (figura 4-4); la ISS lleva escudos Whipple en sus módulos",
  [EQ_SRC.mmodHandbook],
);
export const SHIELD_WHIPPLE_STEEL = whipple(
  "whipple-acero",
  "Escudo Whipple de acero",
  { material: "Acero", thicknessCm: 0.041, densityGcm3: 7.86, standoffCm: 10 },
  "Lámina de acero de hierro de la roca, la misma masa por metro cuadrado que el de aluminio",
  "No ha volado: el parachoques de acero rinde algo menos por su densidad (término ρ_b^−1/9)",
  [EQ_SRC.mmodHandbook],
);
export const SHIELD_WHIPPLE_NODE = whipple(
  "whipple-nodo",
  "Escudo Whipple de los nodos de la ISS",
  { material: "Al 6061-T6", thicknessCm: 0.16, densityGcm3: 2.7, standoffCm: 12 },
  "Aluminio 6061-T6 (chapa importada)",
  "Nodos 2 y 3 de la ISS: parachoques de 0,16 cm a 12 cm (manual de la NASA, figura 4-6)",
  [EQ_SRC.mmodHandbook],
);

export const SHIELDS: readonly Equipment[] = [SHIELD_NONE, SHIELD_WHIPPLE, SHIELD_WHIPPLE_STEEL, SHIELD_WHIPPLE_NODE];

// --- Fixed systems ---------------------------------------------------------------

/** O₂ per crew member and day (NASA BVAD, via Ichimura & Yamashiki 2025). */
const O2_KG_PER_CM_DAY = 0.818;
/** Crew and days of a sortie with reserve: game value. */
const SORTIE = { crew: 2, days: 3 };
/** Respiratory quotient 0.87 (estimate): kg of CO₂ per kg of O₂ = 0.87 × 44 / 32. */
const CO2_PER_O2 = (0.87 * 44.01) / 32;
/** 2 LiOH + CO₂ → Li₂CO₃ + H₂O: kg of LiOH per kg of CO₂ (stoichiometry). */
const LIOH_PER_CO2 = (2 * 23.95) / 44.01;
const O2_KG = O2_KG_PER_CM_DAY * SORTIE.crew * SORTIE.days;
const LIOH_KG = O2_KG * CO2_PER_O2 * LIOH_PER_CO2;
const ECLSS_HARDWARE_KG = 70;

export const FIXED_SYSTEMS: readonly Equipment[] = [
  {
    id: "estructura-primaria",
    name: "Estructura primaria",
    kind: "estructura",
    massKg: 120,
    powerW: 0,
    materials: "Celosía de aluminio y tubos de material compuesto que sujetan cabina, tanques, motor y patas",
    flight: "Como la estructura del módulo lunar",
    basis: "Estimación: el módulo lunar consiguió una estructura de 1/15 de su peso cargado; 1/15 de unos 1700 kg da ~115 kg",
    sources: [EQ_SRC.lmStructure],
  },
  {
    id: "nds",
    name: "Sistema de acople NDS (IDSS)",
    kind: "acople",
    massKg: 340,
    powerW: 0,
    materials: "Anillo de captura con pétalos guía, amortiguadores y cierres; electrónica de mando",
    size: "Paso de 69 cm con los pétalos (81 cm sin ellos)",
    flight: "Boeing Starliner; Orion a partir de Artemis III. El mismo estándar IDSS que usan la nodriza y la estación",
    basis: "Masa máxima de control de 750 lb (≈340 kg) de las versiones NDS-301 y -303 (por confirmar en el documento). Consume solo al acoplar: 0 W de media",
    sources: [EQ_SRC.nds],
  },
  {
    id: "tren-panal",
    name: "Tren de aterrizaje de cuatro patas",
    kind: "tren",
    massKg: 60,
    powerW: 0,
    materials: "Patas de aluminio con cartuchos de panal de aluminio que se aplastan al tocar",
    flight: "El sistema del módulo lunar: el panal del amortiguador principal se aplastaba con 9500 lb",
    basis: "Estimación de masa; el diseño es el del módulo lunar",
    sources: [EQ_SRC.lmStructure],
  },
  {
    id: "avionica",
    name: "Aviónica: tres ordenadores, navegación y pantallas",
    kind: "avionica",
    massKg: 60,
    powerW: -250,
    materials: "Placas RAD750 resistentes a la radiación, unidad inercial, buscador de estrellas, pantallas y cables (importados)",
    flight: "El RAD750 vuela desde 2005 (Deep Impact, Curiosity, Perseverance, JWST)",
    basis: "3 × 10 W de las placas RAD750 (copiado); el resto de potencia y la masa son estimación",
    sources: [EQ_SRC.rad750],
  },
  {
    id: "radio",
    name: "Radio: transpondedor de banda X y antenas",
    kind: "comunicaciones",
    massKg: 8,
    powerW: -60,
    materials: "Transpondedor Iris (1,2 kg), amplificador y antenas de baja ganancia (importados)",
    flight: "Iris voló en las MarCO (2018) hacia Marte",
    basis: "1,2 kg del Iris (copiado); amplificador, antenas, masa y potencia: estimación. Solo habla con la nodriza, a unos km",
    sources: [EQ_SRC.iris],
  },
  {
    id: "soporte-vital-abierto",
    name: "Soporte vital de ciclo abierto",
    kind: "soporte-vital",
    massKg: Math.round(O2_KG + LIOH_KG + ECLSS_HARDWARE_KG),
    powerW: -200,
    materials: "Oxígeno a presión, cartuchos de hidróxido de litio, ventiladores y bucle de los trajes",
    flight: "Como el módulo lunar y Orion: cartuchos que se cambian a mano",
    basis: `${SORTIE.crew} personas × ${SORTIE.days} días (valor de juego) × 0,818 kg de O₂ = ${O2_KG.toFixed(1)} kg; LiOH = O₂ × 1,20 (cociente respiratorio 0,87, estimación) × 1,09 (estequiometría) = ${LIOH_KG.toFixed(1)} kg; ${ECLSS_HARDWARE_KG} kg de equipos y 200 W: estimación`,
    sources: [EQ_SRC.bvad],
  },
  {
    id: "control-termico",
    name: "Control térmico: mantas, calentadores y sublimador",
    kind: "termico",
    massKg: Math.round(CABIN_AREA_M2 * 1 + 20),
    powerW: -150,
    materials: "Mantas multicapa de Kapton y Mylar aluminizados, calentadores de los lechos de catalizador y de las líneas, sublimador de agua",
    flight: "Mantas como las de casi todas las naves; el módulo lunar se enfriaba con un sublimador de agua",
    basis: `${CABIN_AREA_M2.toFixed(1)} m² × 1 kg/m² de mantas (estimación; Wikipedia da 12 kg/m² para 40 capas, que parece alto) + 20 kg de calentadores y sublimador; 150 W: estimación`,
    sources: [EQ_SRC.mli],
  },
];
