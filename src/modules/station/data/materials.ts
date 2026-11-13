import type { MaterialId } from "../domain/materials";
import { SRC } from "./sources";

export interface MaterialInfo {
  readonly id: MaterialId;
  readonly name: string;
  /** bruto: rock straight from a hold; refinado: out of the refinery; importado: cannot be made here yet. */
  readonly stage: "bruto" | "refinado" | "importado";
  readonly unit: "kg" | "kits";
  readonly note: string;
  readonly source?: string;
  /** A propellant or pressurant a craft's tanks take (the refuelling line draws on these). */
  readonly propellant?: boolean;
}

export const MATERIALS: readonly MaterialInfo[] = [
  { id: "agua-hidratada", name: "Agua en minerales hidratados", stage: "bruto", unit: "kg", note: "Agua atrapada en la serpentina y la esmectita de la roca", source: SRC.serpentineWater },
  { id: "carbono", name: "Carbono", stage: "bruto", unit: "kg", note: "Compuestos orgánicos y carbonatos; se usa tal cual (fibra y acero) y para hacer monóxido de carbono", source: SRC.bennuSample },
  { id: "mineral-hierro", name: "Hierro en magnetita y sulfuros", stage: "bruto", unit: "kg", note: "Hierro ligado como óxido y sulfuro, todavía no es metal", source: SRC.bennuSample },
  { id: "mineral-niquel", name: "Níquel en sulfuros", stage: "bruto", unit: "kg", note: "Pentlandita y otros sulfuros de hierro y níquel", source: SRC.bennuSample },
  { id: "nitrogeno-roca", name: "Nitrógeno en sales de amonio y orgánicos", stage: "bruto", unit: "kg", note: "El 0,23–0,25 % de la roca de Bennu: poco, pero es todo el nitrógeno que hay para hacer amoníaco", source: SRC.bennuNitrogen },
  { id: "silicatos", name: "Silicatos (filosilicatos)", stage: "bruto", unit: "kg", note: "El grueso de la roca: serpentina y esmectita ricas en magnesio", source: SRC.bennuSample },
  { id: "agua", name: "Agua", stage: "refinado", unit: "kg", note: "Condensada en la trampa fría del horno", source: SRC.thermalExtraction },
  { id: "hierro", name: "Hierro (carbonilo)", stage: "refinado", unit: "kg", note: "Polvo de hierro muy puro del pentacarbonilo", source: SRC.carbonylAsteroid },
  { id: "niquel", name: "Níquel (carbonilo)", stage: "refinado", unit: "kg", note: "Níquel puro del tetracarbonilo", source: SRC.mond },
  { id: "oxigeno", name: "Oxígeno", stage: "refinado", unit: "kg", note: "Sale en el ánodo al electrolizar el regolito fundido", source: SRC.mre },
  { id: "ceramica", name: "Cerámica de escoria", stage: "refinado", unit: "kg", note: "Vidrio y escoria de la electrólisis, molidos para aislantes y soportes", source: SRC.oxygenFromMinerals },
  { id: "hidrogeno", name: "Hidrógeno", stage: "refinado", unit: "kg", note: "Del cátodo del electrolizador de agua: 1 kg por cada 9 kg de agua", source: SRC.pemElectrolysis },
  { id: "amoniaco", name: "Amoníaco", stage: "refinado", unit: "kg", note: "Del nitrógeno de la roca y el hidrógeno; materia prima de la hidracina y del NTO", source: SRC.bennuNitrogen },
  { id: "hidracina", name: "Hidracina anhidra", stage: "refinado", unit: "kg", note: "Monopropelente de los propulsores de actitud; se hace aquí, pero el nitrógeno da para poca, y también llega importada", source: SRC.peroxideProcess, propellant: true },
  { id: "nto", name: "Tetróxido de nitrógeno (NTO)", stage: "refinado", unit: "kg", note: "Oxidante del par MMH/NTO: amoníaco quemado con oxígeno; el nitrógeno da para poco, y también llega importado", source: SRC.ostwald, propellant: true },
  {
    id: "kit",
    name: "Kits importados",
    stage: "importado",
    unit: "kits",
    note: "Electrónica, válvulas y lecho catalizador S-405 (iridio sobre alúmina): aún no se pueden hacer con roca",
    source: SRC.bootstrapping,
  },
  { id: "mmh", name: "Monometilhidracina (MMH)", stage: "importado", unit: "kg", note: "Combustible del par MMH/NTO: se hace con cloramina y metilamina, y aquí no hay cloro para eso", source: SRC.mmhProcess, propellant: true },
  { id: "lmp-103s", name: "LMP-103S", stage: "importado", unit: "kg", note: "Monopropelente de dinitramida de amonio: su síntesis pide ácidos nítrico y sulfúrico concentrados", source: SRC.adn, propellant: true },
  { id: "helio", name: "Helio", stage: "importado", unit: "kg", note: "Presurizante del par: la roca solo guarda trazas, 9,17 ng/g", source: SRC.ciAbundances, propellant: true },
  { id: "xenon", name: "Xenón", stage: "importado", unit: "kg", note: "Propelente de la nodriza: la roca guarda 0,17 ng/g, nada que se pueda sacar", source: SRC.ciAbundances, propellant: true },
];

export const materialInfo = (id: MaterialId): MaterialInfo | undefined => MATERIALS.find((m) => m.id === id);
export const materialName = (id: MaterialId): string => materialInfo(id)?.name ?? id;

/** Which store a hold's material goes to (names as `CompositionEntry.material`). */
const FROM_CARGO: Readonly<Record<string, MaterialId>> = {
  "Water (in hydrated minerals)": "agua-hidratada",
  Water: "agua",
  Carbon: "carbono",
  "Iron (in magnetite and Fe-Ni sulfides)": "mineral-hierro",
  "Nickel (in Fe-Ni sulfides)": "mineral-niquel",
  "Silicates (phyllosilicates)": "silicatos",
  "Nitrogen (in ammonium salts and organics)": "nitrogeno-roca",
};
export const cargoMaterial = (cargo: string): MaterialId | undefined => FROM_CARGO[cargo];
