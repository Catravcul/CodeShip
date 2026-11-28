import type { Sourced } from "@core/units";
import type { MothershipEquipment, ShieldMaterial } from "../domain/equipment";

/**
 * The mothership's swappable equipment, from real components (docs/design/componentes.md).
 * Checked 2026-11-12.
 */

const ROSA = "https://rdw.com/product-archive/power/rosa/";
const KILOPOWER = "https://en.wikipedia.org/wiki/Kilopower";
const NAITO = "https://www.nature.com/articles/s41598-022-17079-1.pdf";
const NASA_LIMIT = "https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf";
const RAD = "https://www.swri.org/press-release/swri-led-team-calculates-radiation-exposure-associated-trip-mars";
const FISCHER_TROPSCH = "https://en.wikipedia.org/wiki/Fischer%E2%80%93Tropsch_process";

export const FREE_SPACE_GCR: Sourced<number> = {
  value: 523,
  source: NAITO,
  note: "Dosis efectiva sin blindaje en el mínimo solar (Naito y Kodaira 2022). El RAD de Curiosity midió 1,8 mSv/día (≈660 mSv/año) en crucero dentro de la nave",
};
export const CAREER_LIMIT: Sourced<number> = { value: 600, source: NASA_LIMIT, note: "NASA-STD-3001: dosis efectiva de toda la carrera menor de 600 mSv" };
export { RAD as RAD_SOURCE };

// --- Auxiliary power -------------------------------------------------------------

export const AUX_NONE: MothershipEquipment = {
  id: "aux-ninguna",
  name: "Sin energía auxiliar",
  slot: "energia-auxiliar",
  massKg: 0,
  powerKw: 0,
  materials: "—",
  flight: "—",
  basis: "Solo el reactor",
  sources: [ROSA],
};

const rosa = (id: string, name: string, n: number, kw: number, kg: number, lengthM: number): MothershipEquipment => ({
  id,
  name: `${n} alas ROSA ${name} (${n * kw} kW a 1 UA)`,
  slot: "energia-auxiliar",
  massKg: n * kg,
  powerKw: n * kw,
  solar: true,
  materials: "Mantas de células solares enrollables sobre mástiles de material compuesto (células importadas)",
  flight: "ROSA: prueba en la ISS (2017), DART (2021) y seis iROSA en la ISS",
  basis: `${n} × (${kw} kW al principio de vida, ${kg} kg, ${lengthM} m desplegada), copiado de la tabla de Redwire`,
  sources: [ROSA],
});

export const AUX_SUNSTONE = rosa("rosa-sunstone-x4", "SunStone", 4, 28, 331, 19.4);
export const AUX_PHENACITE = rosa("rosa-phenacite-x4", "Phenacite", 4, 37, 521, 18.5);
export const AUX_KILOPOWER: MothershipEquipment = {
  id: "kilopower-x4",
  name: "4 reactores Kilopower de 10 kWe",
  slot: "energia-auxiliar",
  massKg: 4 * 1500,
  powerKw: 4 * 10,
  materials: "Núcleo de uranio-235 y molibdeno, tubos de calor de sodio y motores Stirling (importados)",
  flight: "Prueba KRUSTY en tierra (2017–2018, TRL 5); no ha volado",
  basis: "4 × (10 kWe, unos 1500 kg el diseño para Marte). No depende del Sol",
  sources: [KILOPOWER],
};

export const AUX_POWER: readonly MothershipEquipment[] = [AUX_NONE, AUX_SUNSTONE, AUX_PHENACITE, AUX_KILOPOWER];

// --- Radiation shield ----------------------------------------------------------------

/**
 * Area the shield covers: the 60 t of water of the original estimate at 20 cm (200 kg/m²) wrap 300 m²
 * around the habitat module and the bunks. Derived from that estimate (estimación).
 */
export const SHIELD_AREA_M2 = 60000 / 200;

const MATERIAL_TEXT: Readonly<Record<ShieldMaterial, { name: string; materials: string; flight: string; sources: string[] }>> = {
  agua: {
    name: "agua",
    materials: "Agua de la roca en bolsas alrededor del módulo y las literas; también es la reserva del soporte vital",
    flight: "Las paredes de agua son la propuesta habitual para refugios de tormenta; la ISS usa bolsas de agua en los camarotes",
    sources: [NAITO],
  },
  polietileno: {
    name: "polietileno",
    materials: "Polietileno hecho con el carbono y el hidrógeno (del agua) de la roca",
    flight: "Paneles de polietileno en camarotes de la ISS; el mejor blindaje por kilo de la tabla",
    sources: [NAITO, FISCHER_TROPSCH],
  },
  escoria: {
    name: "escoria",
    materials: "Bloques de escoria y vidrio de la electrólisis de la roca",
    flight: "No ha volado: blindaje de regolito propuesto para bases",
    sources: [NAITO],
  },
  aluminio: { name: "aluminio", materials: "Aluminio", flight: "Estructuras de todas las naves", sources: [NAITO] },
  cfrp: { name: "fibra de carbono", materials: "CFRP", flight: "Estructuras de material compuesto", sources: [NAITO] },
};

export function radiationShield(material: ShieldMaterial, gcm2: number): MothershipEquipment {
  const t = MATERIAL_TEXT[material];
  const kg = gcm2 * 10 * SHIELD_AREA_M2;
  return {
    id: `blindaje-${material}-${gcm2}`,
    name: `Blindaje de ${t.name} de ${gcm2} g/cm²`,
    slot: "blindaje",
    massKg: kg,
    powerKw: 0,
    shield: { material, arealDensityGcm2: gcm2 },
    materials: t.materials,
    flight: t.flight,
    basis: `${SHIELD_AREA_M2} m² (estimación) × ${gcm2} g/cm² = ${(kg / 1000).toLocaleString("es-ES")} t. Dosis relativa de la tabla 2 de Naito y Kodaira 2022${material === "agua" ? " (el agua, interpolada por su hidrógeno: estimación)" : material === "escoria" ? " (la escoria, como el aluminio: estimación)" : ""}`,
    sources: t.sources,
  };
}

export const SHIELD_NONE: MothershipEquipment = {
  id: "blindaje-ninguno",
  name: "Sin blindaje: solo la pared del módulo",
  slot: "blindaje",
  massKg: 0,
  powerKw: 0,
  shield: { material: "aluminio", arealDensityGcm2: 0 },
  materials: "—",
  flight: "—",
  basis: "Nada que pesar; la dosis es la del espacio libre (la pared del módulo no se cuenta)",
  sources: [NAITO],
};

export const SHIELD_WATER_20 = radiationShield("agua", 20);
export const RADIATION_SHIELDS: readonly MothershipEquipment[] = [SHIELD_WATER_20, radiationShield("agua", 10), radiationShield("polietileno", 20), radiationShield("polietileno", 10), radiationShield("escoria", 20), SHIELD_NONE];

export const MOTHERSHIP_EQUIPMENT: readonly MothershipEquipment[] = [...AUX_POWER, ...RADIATION_SHIELDS];
export const mothershipEquipmentById = (id: string): MothershipEquipment | undefined => MOTHERSHIP_EQUIPMENT.find((e) => e.id === id);
