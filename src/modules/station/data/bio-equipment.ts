import type { EquipmentSpec } from "../domain/outfit";
import { BIO_SRC as S } from "./bio-sources";

/**
 * The biology lab and its bioreactors (docs/design/autosustento.md): what they weigh, draw and where
 * they fit. Kept apart from the processes (data/bio.ts) so the outfit catalogue can list them.
 */

const GAME = "Masa, potencia, receta y horas: valores de juego";

export const EQ_BIO_LAB: EquipmentSpec = {
  id: "laboratorio-bio",
  name: "Laboratorio de biología",
  fitsIn: ["agricola"],
  racks: 1,
  massKg: 450,
  powerKw: 1,
  panel: "vida",
  info: "Guantera sellada y banco de biología: guarda las cepas de los biorreactores y vigila cómo rinden; sin él no se montan",
  basis: { value: "Como la guantera de ciencias de la vida (LSG) del módulo Kibo de la ISS, desde 2018", source: S.lsg, note: GAME },
};
export const EQ_SPIRULINA: EquipmentSpec = {
  id: "fotobiorreactor-espirulina",
  name: "Fotobiorreactor de espirulina",
  fitsIn: ["agricola"],
  racks: 2,
  massKg: 1000,
  powerKw: 2.5,
  panel: "vida",
  info: "400 L de espirulina (Limnospira indica) en tubos bajo LED: come CO₂ y fertilizante, da oxígeno y comida, como el compartimento C4a de MELiSSA",
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
  info: "Tres reactores en fila, como los compartimentos C1–C3 de MELiSSA: entran paja y residuos, salen CO₂ y fertilizante para los cultivos",
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
  info: "10 L de Cupriavidus necator: come hidrógeno, oxígeno y CO₂ y da PHB, un poliéster que sirve de resina a la celda de compuestos",
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
  info: "Tanques donde las bacterias sacan níquel y hierro de los sulfuros con muy poca energía, sin horno ni monóxido de carbono",
  basis: { value: "BioRock (ISS, 2019): Sphingomonas desiccabilis sacó tierras raras del basalto en 21 días; en Tierra, biolixiviación de sulfuros de níquel en tanques", source: S.biorock, note: `Rendimientos (80 % del níquel, 60 % del hierro) y ritmo: valores de juego. ${GAME}` },
};
export const EQ_PROTEIN: EquipmentSpec = {
  id: "reactor-proteina",
  name: "Reactor de proteína (tipo Solein)",
  fitsIn: ["planta", "fabrica", "agricola"],
  racks: 1,
  massKg: 250,
  powerKw: 1.5,
  panel: "vida",
  info: "40 L de bacterias Xanthobacter que comen hidrógeno y CO₂: un polvo con la mitad de proteína para el pienso de los gatos",
  basis: { value: "Solein de Solar Foods: Xanthobacter sp. SoF1 con H₂, CO₂ y amonio; 40 L para la proteína de seis personas", source: S.solein, note: `0,72 kg al día (unos 360 g de proteína). Consumos con la estequiometría de Takeshita et al. 1993. ${GAME}` },
};

export const BIO_EQUIPMENT: readonly EquipmentSpec[] = [EQ_BIO_LAB, EQ_SPIRULINA, EQ_LOOP, EQ_PHB, EQ_BIOMINING, EQ_PROTEIN];

