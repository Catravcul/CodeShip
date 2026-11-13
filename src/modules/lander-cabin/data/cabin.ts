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

export const LANDER_CABIN: CabinLayout = {
  floor: {
    minX: -0.95,
    maxX: 0.95,
    // The console starts at z = −0.6; the rear bulkhead at z = 1.08.
    minZ: -0.5,
    maxZ: 0.92,
    blocked: [
      { minX: -0.27, maxX: 0.27, minZ: 0.06, maxZ: 0.64 }, // pilot seat
      { minX: 0.49, maxX: 0.97, minZ: 0.06, maxZ: 0.74 }, // crew seat
      { minX: 0.8, maxX: 0.97, minZ: 0.6, maxZ: 0.92 }, // hygiene bay behind its curtain
    ],
  },
  stations: [
    { id: "asiento", label: "Asiento del piloto", stand: { x: -0.5, z: 0.3 }, look: { x: 0, y: 0.35, z: 0.3 }, what: "Sentarse a pilotar: vista de cabina y cámaras" },
    { id: "mente", label: "Mente del asteroide", stand: { x: 0.45, z: -0.3 }, look: { x: 0.85, y: 0.75, z: -0.72 }, what: "Fase, confianza y niveles del asteroide; el duelo cuando se puede" },
    { id: "acople", label: "Consola de acople", stand: { x: -0.1, z: 0.82 }, look: { x: 0, y: 1.6, z: 0.6 }, what: "Desacoplar, asistente de acople y la escotilla del techo" },
    { id: "escotilla", label: "Escotilla EVA", stand: { x: -0.75, z: 0.8 }, look: { x: -1.15, y: 0.6, z: 0.78 }, what: "Ponerse el traje y salir (solo anclada)" },
    { id: "esterilla", label: "Esterilla", stand: { x: 0.45, z: 0.84 }, look: { x: 0.45, y: 0, z: 0.84 }, what: "Sentarse en loto: ajustes generales" },
  ],
  reachM: 0.25,
  heightM: 1.7,
  // 2.4 × 1.7 × 1.95 m ≈ 8 m³ presurizados; seats, console and bags leave about 5.5 m³ (estimate).
  habitableM3: 5.5,
};
