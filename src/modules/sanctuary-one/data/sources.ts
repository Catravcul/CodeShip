/**
 * Where every number of sanctuary 1 comes from (docs/design/santuario1.md). Cold Sanctuary is read at its master of
 * 2026-11-18: its Santuario 1 (the ice sanctuary, «Mesocosmos») keeps all its magic in Codeship (reglas.md §1.2), so
 * its coordinates, sizes and game values come with it and name the file. Real equipment names its maker's sheet.
 */
export const S1_SOURCES = {
  csLandscape: "Cold Sanctuary, Assets/Editor/PolarLandscapeBuilder.cs (Islands: 6 casquetes de lóbulos (x, z, radio), mapa de ±250 m, agua a −0,25 m, laguna en (60, 25) de 28 m)",
  csTowers: "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Towers.cs (torres-árbol: Servicios (55, 102) 40 × 38, Entrenamiento (−77, 52) 36 × 26 girada 90°, Ciencias (92, −117) 32 × 20 girada 90°, Producción (−180, −140) 26 × 20 girada 90°)",
  csTree: "Cold Sanctuary, Assets/Scripts/World/TreeSpec.cs (HelixTower: tronco de agua de 20 m y pared de acrílico de 1 m, primer piso a 64 m, un nivel cada 22 m, puntas de 20 m que suben 12 m, puertas de 7 × 7 m; Árbol de los Campos en (−50, −84))",
  csFloors: "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.cs BuildAreaStructures y docs/plano-edificios.md (pisos de cada torre, en orden)",
  csResidence: "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.ResidenceTower.cs y ResidentialBuilder.cs (Residencia en (−66, −215), 40 × 38, 30 habitaciones a 7 por piso y la plaza)",
  csFauna: "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.ColdFauna.cs BuildWildlifePopulation (nidos) y Assets/Scripts/World/PopulationPlan.cs (animales por humano y grupos)",
  csStaff: "Cold Sanctuary, Assets/Scripts/Progression/WorkdayDirector.cs (Staff: el personal en su orden fijo) y docs/personajes/",
  csGym: "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Training.cs FurnishGym (piso 0 del gimnasio, 36 × 26 m: posiciones de cada equipo) y docs/entrenamiento-areas.md §3.2",
  gymMachines: "Cold Sanctuary, docs/gimnasio-maquinas.md (huellas de fabricante: Life Fitness Insignia 110 × 140 × 148 cm, Precor Vitality 147 × 145 × 155 cm, Life Fitness Axiom 152 × 140 × 185 cm, Precor Vitality 142 × 122 × 178 cm, Force USA 212 × 115 × 152 cm, Body-Solid Pro Select 137 × 137 × 180 cm, Body-Solid Powerline 157 × 64 × 69 cm)",
  csTerritory: "Cold Sanctuary, Assets/Editor/SampleSceneBuilder.Territorio.cs (colonia de pingüinos emperador en (50, −55))",
  // Real animals: adult sizes.
  polarBear: "Polar Bears International, «Polar bear facts»: machos de 2,4–3 m de largo y hasta 1,6 m a la cruz: https://polarbearsinternational.org/polar-bears-changing-arctic/polar-bear-facts/",
  orca: "NOAA Fisheries, Killer whale: hasta 9,8 m (machos) y 6 t: https://www.fisheries.noaa.gov/species/killer-whale",
  dolphin: "NOAA Fisheries, Common bottlenose dolphin: 1,8–3,8 m y hasta 650 kg: https://www.fisheries.noaa.gov/species/common-bottlenose-dolphin",
  humpback: "NOAA Fisheries, Humpback whale: hasta 18 m y 36 t: https://www.fisheries.noaa.gov/species/humpback-whale",
  sealWeddell: "NOAA Fisheries / Wikipedia, Foca de Weddell: 2,5–3,5 m: https://en.wikipedia.org/wiki/Weddell_seal",
  walrus: "NOAA Fisheries, Pacific walrus: 2,2–3,6 m, hasta 1 900 kg: https://www.fisheries.noaa.gov/species/pacific-walrus",
  emperor: "British Antarctic Survey, Emperor penguin: 1,15 m de alto: https://www.bas.ac.uk/about/antarctica/wildlife/penguins/emperor-penguin/",
  adelie: "British Antarctic Survey, Adélie penguin: 70 cm de alto: https://www.bas.ac.uk/about/antarctica/wildlife/penguins/adelie-penguin/",
  reindeer: "Wikipedia, Reno: 1,6–2,1 m de largo y 0,85–1,5 m a la cruz: https://en.wikipedia.org/wiki/Reindeer",
  muskox: "Wikipedia, Buey almizclero: 1,9–2,3 m de largo y 1,1–1,5 m a la cruz: https://en.wikipedia.org/wiki/Muskox",
  arcticHare: "Wikipedia, Liebre ártica: 43–70 cm: https://en.wikipedia.org/wiki/Arctic_hare",
  arcticFox: "Wikipedia, Zorro ártico: 46–68 cm (más cola de 30 cm), 25–30 cm a la cruz: https://en.wikipedia.org/wiki/Arctic_fox",
  arcticWolf: "Wikipedia, Lobo ártico: 1–1,8 m de largo y 64–79 cm a la cruz: https://en.wikipedia.org/wiki/Arctic_wolf",
  snowPetrel: "Wikipedia, Petrel níveo: 30–40 cm, envergadura de 75–95 cm: https://en.wikipedia.org/wiki/Snow_petrel",
  human: "NCD-RisC (2016), estatura media de adultos: 1,60–1,78 m: https://ncdrisc.org/",
} as const;

/** A Cold Sanctuary builder as a source: `cs("Training", "FurnishGymCardio")`. */
export const cs = (file: string, what: string): string => `Cold Sanctuary, Assets/Editor/SampleSceneBuilder.${file}.cs ${what}`;

/** An object of Cold Sanctuary's scene as exported from Unity (2026-11-19, branch `codeship-export`, Tools › Codeship). */
export const csx = (path: string): string => `Cold Sanctuary, escena exportada de Unity el 2026-11-19 (rama codeship-export, export/codeship-export.jsonl.gz): ${path}`;
