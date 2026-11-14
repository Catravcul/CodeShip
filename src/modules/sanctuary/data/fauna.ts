import type { Species } from "../domain/fauna";
import { SANCTUARY_SRC as S } from "./sources";

/**
 * First candidates for the space sanctuary, chosen because they have flown (docs/research/agua-y-fauna-en-ingravidez.md).
 * Temperature ranges are husbandry ranges rounded for the game (game values); minimum water volumes too.
 */
export const SANCTUARY_SPECIES: readonly Species[] = [
  // --- Water: the fish and the closed ecosystems that have flown.
  { id: "medaka", name: "Medaka", scientific: "Oryzias latipes", habitat: "agua", role: "consumidor", zeroG: "orienta-con-luz", tempC: [18, 30], minWaterL: 1, source: S.medakaIml2, note: "La cepa que voló no hacía bucles en vuelo parabólico y se guiaba por la vista. El AQH admite varias generaciones." },
  { id: "pez-cebra", name: "Pez cebra", scientific: "Danio rerio", habitat: "agua", role: "consumidor", zeroG: "orienta-con-luz", tempC: [20, 30], minWaterL: 1, source: S.zebrafishTiangong, note: "43 días en Tiangong (2024) con ceratófilo; giró y se volteó hacia el día 20 y luego se adaptó; puso huevos." },
  { id: "xifo", name: "Pez espada (xifo)", scientific: "Xiphophorus helleri", habitat: "agua", role: "consumidor", zeroG: "orienta-con-luz", tempC: [22, 28], minWaterL: 2, source: S.cebas, note: "C.E.B.A.S. en STS-89 y STS-90 (16 días). Las larvas criadas en órbita hicieron otolitos más grandes." },
  { id: "tilapia", name: "Tilapia", scientific: "Oreochromis mossambicus", habitat: "agua", role: "consumidor", zeroG: "sin-datos", tempC: [22, 32], minWaterL: 100, source: S.omegahab, note: "40 larvas en Omegahab (Bion-M1, 2013). Pez de granja; la conducta adulta en ingravidez no está publicada: solo en un anillo." },
  { id: "caracol", name: "Caracol de agua dulce", scientific: "Biomphalaria glabrata", habitat: "agua", role: "consumidor", zeroG: "ok", tempC: [20, 30], minWaterL: 0.5, source: S.cebas, note: "Voló en C.E.B.A.S. y Omegahab; se aparearon en órbita (Neurolab). Come algas y restos." },
  { id: "ceratofilo", name: "Ceratófilo (cola de zorro)", scientific: "Ceratophyllum demersum", habitat: "agua", role: "productor", zeroG: "ok", needsLight: true, tempC: [10, 30], minWaterL: 0.5, source: S.zebrafishTiangong, note: "La planta de C.E.B.A.S., Omegahab y Tiangong: no tiene raíces y flota." },
  { id: "euglena", name: "Euglena", scientific: "Euglena gracilis", habitat: "agua", role: "productor", zeroG: "ok", needsLight: true, tempC: [15, 30], source: S.omegahab },
  { id: "nitrificantes", name: "Bacterias nitrificantes del biofiltro", habitat: "agua", role: "descomponedor", zeroG: "ok", tempC: [5, 35], source: S.aqh, note: "Pasan el amonio de los peces a nitrito y nitrato, como el filtro biológico del AQH." },
  { id: "bacterias-hidrogeno", name: "Bacterias del hidrógeno", scientific: "Cupriavidus necator y afines", habitat: "agua", role: "productor", zeroG: "ok", tempC: [20, 37], source: S.solein, note: "Quimiosíntesis: fijan CO₂ con hidrógeno del electrolizador, sin luz. Es el reactor de proteína de la estación." },
  // --- Dark-adapted and nocturnal.
  { id: "pez-ciego", name: "Pez ciego de las cavernas", scientific: "Astyanax mexicanus", habitat: "agua", role: "consumidor", zeroG: "sin-datos-sin-vista", nocturnal: true, tempC: [18, 27], minWaterL: 40, source: S.cavefish, note: "Gasta un 27 % menos de energía que su forma de superficie. Sin ojos no puede orientarse por la luz: solo en un anillo." },
  { id: "calamar-bobtail", name: "Calamar bobtail hawaiano", scientific: "Euprymna scolopes", habitat: "agua", role: "consumidor", zeroG: "sin-datos", nocturnal: true, tempC: [20, 27], minWaterL: 20, source: S.bobtailIss, note: "Más de 120 crías al ISS en 2021 (UMAMI). Agua salada. Su órgano de luz con Vibrio fischeri lo contrailumina." },
  { id: "grillo", name: "Grillo", scientific: "Acheta domesticus", habitat: "tierra", role: "consumidor", zeroG: "ok", nocturnal: true, tempC: [20, 32], source: S.neurolabCrickets, note: "Huevos y larvas en Neurolab (STS-90) para estudiar sus sensores de gravedad. Especie: la habitual de laboratorio (estimación)." },
  { id: "polilla", name: "Polilla de la soja", scientific: "Anticarsia gemmatalis", habitat: "aire", role: "consumidor", zeroG: "ok", nocturnal: true, tempC: [15, 32], source: S.sts3Insects, note: "En STS-3 (1982) volaron sin problemas." },
  { id: "mosca", name: "Mosca doméstica", scientific: "Musca domestica", habitat: "aire", role: "descomponedor", zeroG: "ok", tempC: [15, 35], source: S.sts3Insects, note: "En STS-3 volaron mejor que las abejas y andaban por las paredes. Sus larvas comen residuos." },
  { id: "cucaracha", name: "Cucaracha", habitat: "tierra", role: "descomponedor", zeroG: "ok", nocturnal: true, tempC: [20, 32], source: S.nadezhda, note: "Nadezhda concibió en el Foton-M3 (2007) y tuvo 33 crías. Detritívora." },
  { id: "tardigrado", name: "Tardígrado", habitat: "agua", role: "consumidor", zeroG: "ok", tempC: [0, 30], minWaterL: 0.01, source: S.tardigrades, note: "Sobrevivieron secos al vacío en el FOTON-M3. Viven en la película de agua del musgo y comen algas." },
  { id: "cultivos", name: "Cultivos (trigo, papa, hortalizas)", habitat: "tierra", role: "productor", zeroG: "ok", needsLight: true, tempC: [15, 30], source: S.issCrops },
  // --- Counter-examples: kept so the rules can say no.
  { id: "abeja", name: "Abeja melífera", scientific: "Apis mellifera", habitat: "aire", role: "consumidor", zeroG: "no", needsLight: true, tempC: [15, 35], source: S.sts3Insects, note: "En STS-3 flotaban y daban tumbos: no pudieron volar con control. En un anillo con luz de día sí podría polinizar." },
  { id: "granadero", name: "Granadero abisal", scientific: "Coryphaenoides acrolepis", habitat: "agua", role: "consumidor", zeroG: "sin-datos", nocturnal: true, tempC: [2, 6], minWaterL: 200, minPressureKpa: 13000, source: S.deepSeaPressure, note: "Vivió 84 h a 13–14,5 MPa en una trampa presurizada; una bajada del 10 % lo mató." },
];

export const speciesById = (id: string): Species | undefined => SANCTUARY_SPECIES.find((s) => s.id === id);
