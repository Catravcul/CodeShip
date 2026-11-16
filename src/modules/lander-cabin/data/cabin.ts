import type { CabinLayout } from "../domain/cabin";

/**
 * The lander's crew cabin (docs/design/habitaculo.md): the capsule drawn in adapters/three/cockpit.ts,
 * 2.4 × 1.95 m of floor and 1.7 m to the roof, with its machines where the model has them.
 */
export const CABIN_SOURCES = {
  apolloLm: "Módulo lunar Apolo: 6,7 m³ de cabina, 4,5 m³ habitables; dos astronautas de pie; escotilla de acople en el techo y escotilla delantera para salir: https://en.wikipedia.org/wiki/Apollo_Lunar_Module",
  orion: "Orion: 8,9 m³ habitables para cuatro: https://en.wikipedia.org/wiki/Orion_(spacecraft)",
  dragon: "Crew Dragon: 9,3 m³ presurizados, puerto IDSS en el techo: https://en.wikipedia.org/wiki/SpaceX_Dragon_2",
  hls: "Starship HLS (Artemis III): cabina de cientos de m³ con esclusa aparte; aquí solo como contraste de tamaño: https://en.wikipedia.org/wiki/Starship_HLS",
} as const;

/**
 * How the walkable cabin departs from a real capsule (docs/design/habitaculo.md, «Tamaño»): to keep 2 m
 * between machines as played (the rule of src/core/spacing.ts, drawn at WORLD_SCALE = 1,5), the cabin runs
 * 1,93 m further aft than the capsule the pilot flies. Its floor goes from 1,9 × 1,42 m to 1,9 × 3,35 m and
 * its pressurised volume from about 8 m³ to about 16 m³: more than Crew Dragon (9,3 m³) and Orion (8,9 m³),
 * three times the Apollo LM's 4,5 m³ habitable. Game licence, like the forward window.
 */
export const CABIN_DEPARTURE = {
  aftM: 1.93,
  realFloorM: { w: 1.9, d: 1.42 },
  gameFloorM: { w: 1.9, d: 3.35 },
  realPressurisedM3: 8,
  gamePressurisedM3: 16,
} as const;

export const LANDER_CABIN: CabinLayout = {
  floor: {
    minX: -0.95,
    maxX: 0.95,
    // The console starts at z = −0.6; the rear bulkhead at z = 1.08 + aftM.
    minZ: -0.5,
    maxZ: 0.92 + CABIN_DEPARTURE.aftM,
    blocked: [
      { minX: -0.27, maxX: 0.27, minZ: 0.06, maxZ: 0.64 }, // pilot seat
      { minX: 0.49, maxX: 0.97, minZ: 0.06, maxZ: 0.74 }, // crew seat
      { minX: 0.8, maxX: 0.97, minZ: 0.6 + CABIN_DEPARTURE.aftM, maxZ: 0.92 + CABIN_DEPARTURE.aftM }, // hygiene bay behind its curtain
    ],
  },
  // In a zigzag down the cabin, each machine 1,34 m or more from the next (2 m as played at 1,5×).
  stations: [
    { id: "asiento", label: "Asiento del piloto", stand: { x: -0.65, z: 0.3 }, look: { x: 0, y: 0.35, z: 0.3 }, what: "Sentarse a pilotar: vista de cabina y cámaras" },
    { id: "mente", label: "Mente del asteroide", stand: { x: 0.6, z: -0.4 }, look: { x: 0.85, y: 0.75, z: -0.72 }, what: "Fase, confianza y niveles del asteroide; el duelo cuando se puede" },
    { id: "acople", label: "Consola de acople", stand: { x: 0.4, z: 2.6 }, look: { x: 0, y: 1.6, z: 2.6 }, what: "Desacoplar, asistente de acople y la escotilla del techo" },
    { id: "escotilla", label: "Escotilla EVA", stand: { x: -0.7, z: 1.65 }, look: { x: -1.15, y: 0.6, z: 1.65 }, what: "Ponerse el traje y salir (solo anclada)" },
    { id: "esterilla", label: "Esterilla", stand: { x: 0.65, z: 1.2 }, look: { x: 0.7, y: 0, z: 1.5 }, what: "Sentarse en loto: ajustes generales" },
  ],
  reachM: 0.25,
  heightM: 1.7,
  // 2.4 × 1.7 × 3.9 m ≈ 16 m³ pressurised (game licence, CABIN_DEPARTURE); seats, console and bags leave about 12 m³ (estimate).
  habitableM3: 12,
};
