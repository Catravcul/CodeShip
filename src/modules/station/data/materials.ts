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
}

export const MATERIALS: readonly MaterialInfo[] = [
  { id: "agua-hidratada", name: "Agua en minerales hidratados", stage: "bruto", unit: "kg", note: "Agua atrapada en la serpentina y la esmectita de la roca", source: SRC.serpentineWater },
  { id: "carbono", name: "Carbono", stage: "bruto", unit: "kg", note: "Compuestos orgánicos y carbonatos; se usa tal cual (fibra y acero) y para hacer monóxido de carbono", source: SRC.bennuSample },
  { id: "mineral-hierro", name: "Hierro en magnetita y sulfuros", stage: "bruto", unit: "kg", note: "Hierro ligado como óxido y sulfuro, todavía no es metal", source: SRC.bennuSample },
  { id: "mineral-niquel", name: "Níquel en sulfuros", stage: "bruto", unit: "kg", note: "Pentlandita y otros sulfuros de hierro y níquel", source: SRC.bennuSample },
  { id: "silicatos", name: "Silicatos (filosilicatos)", stage: "bruto", unit: "kg", note: "El grueso de la roca: serpentina y esmectita ricas en magnesio", source: SRC.bennuSample },
  { id: "agua", name: "Agua", stage: "refinado", unit: "kg", note: "Condensada en la trampa fría del horno", source: SRC.thermalExtraction },
  { id: "hierro", name: "Hierro (carbonilo)", stage: "refinado", unit: "kg", note: "Polvo de hierro muy puro del pentacarbonilo", source: SRC.carbonylAsteroid },
  { id: "niquel", name: "Níquel (carbonilo)", stage: "refinado", unit: "kg", note: "Níquel puro del tetracarbonilo", source: SRC.mond },
  { id: "oxigeno", name: "Oxígeno", stage: "refinado", unit: "kg", note: "Sale en el ánodo al electrolizar el regolito fundido", source: SRC.mre },
  { id: "ceramica", name: "Cerámica de escoria", stage: "refinado", unit: "kg", note: "Vidrio y escoria de la electrólisis, molidos para aislantes y soportes", source: SRC.oxygenFromMinerals },
  {
    id: "kit",
    name: "Kits importados",
    stage: "importado",
    unit: "kits",
    note: "Electrónica, válvulas y lecho catalizador S-405 (iridio sobre alúmina): aún no se pueden hacer con roca",
    source: SRC.bootstrapping,
  },
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
};
export const cargoMaterial = (cargo: string): MaterialId | undefined => FROM_CARGO[cargo];
