/**
 * THE LARVAE OF THE PYRAMID'S LAKE (Berón 2026-11-26; docs/design/larvas-lago.md): the insects of the island lay
 * their eggs in the clear water of the hollow pyramid's lake, and there their young live their real cycle, seen when
 * she dives: the nymphs of the wandering glider (the island's dragonfly, Pantala flavescens: incomplete metamorphosis,
 * an aquatic nymph that hunts with its mask), mayfly nymphs (Baetis, with their gills and three tails), caddisfly
 * larvae in their cases (Limnephilidae: complete metamorphosis, the pupa in the sealed case) and the red larvae of the
 * non-biting midges (Chironomus, the island's «mosquitos y moscas pequeñas»). Like every insect of the island they are
 * drawn ×400 (data/bioma.ts INSECT_SCALE): a final nymph of 25 mm is 10 m long on the lake's 4 m-deep bottom.
 *
 * Each species' stages and days are real (its source); how many are drawn and how their cycles are spread so every
 * stage shows at once is ours (licencia). The lake is warm all year (inside the pyramid: ficción), so they develop
 * without a winter.
 */
export type LarvaStage = "huevo" | "ninfa" | "larva" | "pupa" | "subimago" | "emergencia";

export interface LakeLarvaSpec {
  readonly id: string;
  readonly name: string;
  readonly latin: string;
  readonly metamorphosis: "completa" | "incompleta";
  /** The body it is drawn with (fauna/domain/animal-body.ts insect ids). */
  readonly body: string;
  /** The grown larva or nymph, real m (length, width, height). */
  readonly size: { readonly x: number; readonly y: number; readonly z: number };
  readonly color: number;
  /** Its stages in order with their real days (the last, the adult leaving the water). */
  readonly stages: readonly { readonly stage: LarvaStage; readonly days: number; readonly label: string }[];
  /** What it eats down there (the food chain, in words). */
  readonly eats: string;
  /** Drawn at once (ours). */
  readonly drawn: number;
  readonly source: string;
  readonly ours: Readonly<Record<string, string>>;
}

const WIKI = (page: string) => `https://en.wikipedia.org/wiki/${page}`;
const OURS_DRAWN = "cuántas se dibujan a la vez y su reparto por etapas: nuestro";

export const LAKE_LARVAE: readonly LakeLarvaSpec[] = [
  {
    id: "libelula", name: "Ninfa de libélula migradora", latin: "Pantala flavescens", metamorphosis: "incompleta", body: "libelula-ninfa",
    size: { x: 0.008, y: 0.004, z: 0.025 }, color: 0x6a5a3a,
    stages: [
      { stage: "huevo", days: 5, label: "Huevos que la hembra suelta tocando el agua con el abdomen" },
      { stage: "ninfa", days: 50, label: "Ninfa: caza bajo el agua disparando su máscara (el labio articulado); muda unas 10 veces" },
      { stage: "emergencia", days: 1, label: "Sube por un tallo, se abre la espalda y sale la libélula adulta" },
    ],
    eats: "larvas de mosquito y de efímera, renacuajos",
    drawn: 4,
    source: `${WIKI("Pantala_flavescens")} (pone en charcas temporales y sus ninfas crecen en 38–65 días, de las más rápidas de las libélulas); ${WIKI("Dragonfly")} (la ninfa caza con la máscara, respira por branquias en el recto y muda unas 6–15 veces)`,
    ours: { size: "la ninfa final, del orden de 25 mm: nuestro", "stages.huevo": "días del huevo, del orden de los de las libélulas (licencia)", drawn: OURS_DRAWN },
  },
  {
    id: "efimera", name: "Ninfa de efímera", latin: "Baetis (Baetidae)", metamorphosis: "incompleta", body: "efimera-ninfa",
    size: { x: 0.003, y: 0.002, z: 0.009 }, color: 0x7a6a40,
    stages: [
      { stage: "huevo", days: 20, label: "Huevos pegados a las piedras del fondo" },
      { stage: "ninfa", days: 90, label: "Ninfa: raspa las algas de las piedras; branquias en láminas a los lados del abdomen y tres colas" },
      { stage: "subimago", days: 1, label: "Subimago: sale del agua con alas mates, el único insecto que muda otra vez después de tener alas" },
      { stage: "emergencia", days: 1, label: "Adulto: vive uno o dos días sin comer, se aparea en enjambre y pone en el agua" },
    ],
    eats: "algas y restos del fondo",
    drawn: 6,
    source: `${WIKI("Mayfly")} (ninfas acuáticas con branquias abdominales, de 10 a 50 mudas; el subimago alado muda otra vez; el adulto vive de minutos a un par de días); ${WIKI("Baetidae")} (las efímeras pequeñas de los ríos y lagos de todo el mundo, de 3 a 12 mm)`,
    ours: { latin: "el género en el lago de la pirámide: licencia (las Baetidae viven en las aguas del Himalaya, no citamos la especie)", "stages.huevo": "nuestro, del orden de las fuentes", "stages.ninfa": "nuestro: una generación de verano (2–3 al año en aguas templadas)", drawn: OURS_DRAWN },
  },
  {
    id: "tricoptero", name: "Larva de tricóptero en su estuche", latin: "Limnephilidae", metamorphosis: "completa", body: "larva-tricoptero",
    size: { x: 0.005, y: 0.004, z: 0.02 }, color: 0x8a7a50,
    stages: [
      { stage: "huevo", days: 15, label: "Una masa de huevos en gelatina junto a la orilla" },
      { stage: "larva", days: 120, label: "Larva: se hace un estuche de trocitos de hojas y granos de arena pegados con seda y lo arrastra; cinco estadios" },
      { stage: "pupa", days: 18, label: "Pupa: cierra el estuche y se transforma dentro (metamorfosis completa)" },
      { stage: "emergencia", days: 1, label: "La pupa corta el estuche, nada a la superficie y sale el adulto, peludo como una polilla" },
    ],
    eats: "hojas caídas y algas",
    drawn: 5,
    source: `${WIKI("Caddisfly")} (larvas acuáticas que construyen estuches de seda con arena, piedrecitas o trozos de plantas; pupan dentro del estuche y la pupa nada a la superficie para emerger; cinco estadios); ${WIKI("Limnephilidae")} (los de estuche, de aguas quietas y frías)`,
    ours: { latin: "la familia en el lago de la pirámide: licencia", "stages.larva": "nuestro, del orden de las fuentes", "stages.pupa": "nuestro, del orden de las fuentes", drawn: OURS_DRAWN },
  },
  {
    id: "quironomido", name: "Larva roja de quironómido", latin: "Chironomus", metamorphosis: "completa", body: "larva-quironomido",
    size: { x: 0.0012, y: 0.0012, z: 0.015 }, color: 0xb02a2a,
    stages: [
      { stage: "huevo", days: 3, label: "Un cordón de huevos en gelatina sobre el agua" },
      { stage: "larva", days: 30, label: "Larva roja (por su hemoglobina, que guarda oxígeno en el fango): vive en un tubo de barro; cuatro estadios" },
      { stage: "pupa", days: 2, label: "Pupa: sube a la superficie" },
      { stage: "emergencia", days: 1, label: "Sale el mosquito adulto, que no pica: forma nubes sobre el lago" },
    ],
    eats: "restos del fondo y algas",
    drawn: 6,
    source: `${WIKI("Chironomus")} (las larvas rojas, «gusanos de sangre», con hemoglobina; tubos en el fango; cuatro estadios; la pupa sube a la superficie y el adulto no pica); ${WIKI("Chironomidae")} (son los «mosquitos y moscas pequeñas» del banco de la cadena, data/bioma.ts voladores)`,
    ours: { "stages.larva": "nuestro: una generación de verano", drawn: OURS_DRAWN },
  },
];
