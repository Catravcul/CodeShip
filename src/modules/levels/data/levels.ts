import type { Level } from "../domain/level";

/** Cold Sanctuary's world design: the five sanctuaries on the «depth = danger» axis (decided there on 2026-07-23). */
const COLD_SANCTUARY = "Cold Sanctuary, docs/world-topology-and-planes.md §3";

/**
 * The six levels of the start screen (Berón, 2026-11-18; docs/design/santuario3-iniciacion.md §5): the five
 * sanctuaries of Cold Sanctuary on its «depth = danger» axis, and Codeship's space above them. Their worlds are
 * fiction (reglas.md §1.2); what is built in them is real where the rules say so. Danger and shape: Cold
 * Sanctuary's table; the map places them as it says (the core and the rock at the bottom, the sea, the land in
 * the middle, the air above it, and space at the top).
 */
export const LEVELS: readonly Level[] = [
  {
    id: "terrestre",
    number: 1,
    name: "Santuario Terrestre",
    danger: "bajo",
    topology: "unido alrededor de una plaza central",
    desc: "El origen y el centro permanente: un santuario unido alrededor de una plaza, con fauna como la real e inofensiva.",
    at: { x: 0, y: 0, z: 0 },
    state: "proximamente",
    reality: "ficcion",
    source: COLD_SANCTUARY,
  },
  {
    id: "marino",
    number: 2,
    name: "Santuario Marino",
    danger: "medio a alto, según la profundidad",
    topology: "vertical, bajo el agua",
    desc: "Una burbuja de aire bajo el mar que baja desde media profundidad hasta el fondo abisal; el peligro crece al descender.",
    at: { x: 1.7, y: -1.1, z: 0.9 },
    state: "proximamente",
    reality: "ficcion",
    source: COLD_SANCTUARY,
  },
  {
    id: "aereo",
    number: 3,
    name: "Santuario Aéreo",
    danger: "medio",
    topology: "muy disperso: islas y plataformas",
    desc: "Islas y plataformas separadas, con la lanzadera y el parque energético; se viaja entre ellas volando. Aquí se forma Doménica antes de subir, en la isla de entrenamiento. En construcción: los retos de los puestos de entrenamiento.",
    at: { x: -1.6, y: 1.4, z: -0.7 },
    state: "jugable",
    reality: "ficcion",
    source: COLD_SANCTUARY,
  },
  {
    id: "subterraneo",
    number: 4,
    name: "Santuario Subterráneo",
    danger: "alto",
    topology: "unido, en descenso vertical",
    desc: "Un descenso por roca cada vez más caliente que da paso al Núcleo.",
    at: { x: -1.1, y: -2.3, z: 1.2 },
    state: "proximamente",
    reality: "ficcion",
    source: COLD_SANCTUARY,
  },
  {
    id: "nucleo",
    number: 5,
    name: "Santuario Núcleo",
    danger: "máximo",
    topology: "todo en un castillo, en dos capas",
    desc: "Un castillo sobre diamante flotando en la lava y, debajo, el mundo invertido alrededor de un sol de plasma.",
    at: { x: 0.4, y: -3.4, z: -0.6 },
    state: "proximamente",
    reality: "ficcion",
    source: COLD_SANCTUARY,
  },
  {
    id: "espacio",
    number: 6,
    name: "Santuario Espacio",
    danger: "el de los asteroides",
    topology: "en órbita: la nodriza, la estación y los asteroides",
    desc: "La nodriza Starship, la estación y el módulo lunar junto a Bennu, con los asteroides y sus mentes: la partida de ahora.",
    at: { x: 0.6, y: 3.2, z: 0.4 },
    state: "jugable",
    reality: "ficcion",
    source: "Codeship, docs/design/santuario3-iniciacion.md §5 (el sexto, encima de los cinco de Cold Sanctuary)",
  },
];
