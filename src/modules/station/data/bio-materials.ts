import type { MaterialInfo } from "./materials";
import { BIO_SRC } from "./bio-sources";

/**
 * What the crop fields and the bioreactors take and give (docs/design/autosustento.md). All in kg;
 * nitrogen fertiliser counts the kilograms of nitrogen it carries.
 */
export const BIO_MATERIALS: readonly MaterialInfo[] = [
  { id: "co2", name: "Dióxido de carbono", stage: "biologico", unit: "kg", note: "El que exhala la tripulación (lo recoge el aire de la estación, como el CDRA de la ISS) y el que sueltan las bacterias del bucle: lo comen los cultivos y los biorreactores", source: BIO_SRC.bvadTable },
  { id: "fertilizante", name: "Fertilizante nitrogenado (kg de N)", stage: "biologico", unit: "kg", note: "Nitrato que las bacterias nitrificantes del bucle MELiSSA hacen con los residuos; al principio llega importado", source: BIO_SRC.melissa },
  { id: "grano", name: "Cosecha comestible (seca)", stage: "biologico", unit: "kg", note: "Trigo y papa de los campos de cultivo: va a la despensa de la nodriza como harina", source: BIO_SRC.bpc },
  { id: "biomasa", name: "Biomasa no comestible (seca)", stage: "biologico", unit: "kg", note: "Paja, hojas y raíces; el bucle MELiSSA la convierte en CO₂ y fertilizante, como el fermentador del Palacio Lunar", source: BIO_SRC.lunarPalace365 },
  { id: "espirulina", name: "Espirulina seca", stage: "biologico", unit: "kg", note: "Cianobacteria del fotobiorreactor: 57 % de proteína; comida y pienso de las gallinas", source: BIO_SRC.spirulinaFood },
  { id: "proteina", name: "Proteína bacteriana (tipo Solein)", stage: "biologico", unit: "kg", note: "Bacterias que comen hidrógeno: polvo con un 50 % de proteína; pienso de los gatos", source: BIO_SRC.solein },
  { id: "resina", name: "Resina PHB", stage: "biologico", unit: "kg", note: "Poliéster que guardan las bacterias Cupriavidus: la matriz de los compuestos de fibra. Al principio llega importada en bidones", source: BIO_SRC.phb },
];

/** Bio stores the station starts with: imported fertiliser and resin (game values). */
export const BIO_STARTING_STOCK = { fertilizante: 4, resina: 120 } as const;
