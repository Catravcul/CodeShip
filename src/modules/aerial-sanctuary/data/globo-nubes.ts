import type { Floor, Solid, Water } from "../domain/walk";
import { CELL } from "../domain/abeja";
import { BIOME_ISLAND, MOUNTAIN } from "./bioma-island";
import { fact } from "./sources";

/**
 * THE CLOUD GLOBE (Berón 2026-11-25; docs/design/globo-nubes.md): sanctuary 3's sibling of sanctuary 1's water globe.
 * A ball of cloud over the sea south of the Isla de las alturas; she swims inside it as in the water globe (its cloud
 * holds her like water: Cold Sanctuary's magic, ficción; a real cloud holds ~0,5 g of water per m³ and nobody), and at
 * its centre a worker of the Asian honeybee lives its real development in its wax cell, giant (domain/abeja.ts).
 *
 * Its volume is cloud-water in layers (boxes of `CELL_M` on the plan, `LAYER_M` high), each layer the sphere's section
 * there, so she swims up and through as in the whales' globe (walk.ts `surfaceAbove`). Its entry is a landing of dense
 * cloud at its lower edge: she steps off it into the cloud and swims; a carpet station will stand there (another
 * thread). Coordinates are data: everything here is world metres.
 */
const C = BIOME_ISLAND.centre.value;
const M = MOUNTAIN.value;

export const CLOUD_GLOBE = fact(
  {
    /** Its centre: over the sea, south of the mountain's foot (z −), 250 m up. */
    x: C.x,
    y: 250,
    z: C.z - M.half.z - 300,
    r: 140,
  },
  "ficcion",
  "nuestro (Berón 2026-11-25: «sobre el mar al sur, ~250 m de alto, ~140 m de radio», el mismo radio que el globo de agua del santuario 1); la montaña acaba en z = centro − 600 m y su isla a −690 m: queda a ~150 m de su orilla y lejos de la plataforma y de la isla de entrenamiento",
);

/** The cloud-water's grid: cells on the plan and layers, m. */
export const CELL_M = 12;
export const LAYER_M = 10;
/** The area of the globe (Áreas, the HUD). */
export const CLOUD_AREA = "bioma:globo-nubes";
export const CLOUD_POINT = "bioma:globo-nubes:entrada";

/** The landing at its lower edge: a slab of dense cloud she stands on (its walking face), m. */
export const CLOUD_LANDING = (() => {
  const G = CLOUD_GLOBE.value;
  return { x: G.x, y: G.y - G.r + 4, z: G.z, half: 10 };
})();

/** The entry (where she lands, and the carpet station's place): the landing's middle. */
export const CLOUD_ENTRY = { x: CLOUD_LANDING.x, y: CLOUD_LANDING.y, z: CLOUD_LANDING.z } as const;

/**
 * The bee's scale: its adult worker a third of the globe across (as the octopus's hatchling in the water globe,
 * sanctuary-one/data/globo.ts `embryo`), m. A real worker of A. cerana is ~1 cm: here ~9 000 times.
 */
export const BEE_LENGTH_M = (2 * CLOUD_GLOBE.value.r) / 3;

/** The comb: 7 worker cells (the bee's in the middle), their axis along +z (towards the island's sea), tilted up. */
export const COMB = (() => {
  const G = CLOUD_GLOBE.value;
  const w = CELL.width * BEE_LENGTH_M;
  const d = CELL.depth * BEE_LENGTH_M;
  return { x: G.x, y: G.y, z: G.z - d / 2, cellWidth: w, depth: d, tilt: CELL.tiltRad };
})();

/** The comb as a box she bumps into, swimming (its 7 cells and their walls). */
export function combSolid(): Solid {
  const c = COMB;
  const half = c.cellWidth * 1.7;
  return { x0: c.x - half, x1: c.x + half, z0: c.z - c.depth / 2, z1: c.z + c.depth / 2, y0: c.y - half, y1: c.y + half };
}

/** What the globe adds to the walk world: its cloud-water in layers, the landing, the comb; its area and point. */
export function cloudGlobeWorld(): { waters: Water[]; floors: Floor[]; solids: Solid[] } {
  const G = CLOUD_GLOBE.value;
  const L = CLOUD_LANDING;
  const waters: Water[] = [];
  // From the landing up: each layer the sphere's section at its middle, as rows of cells (one box a row).
  for (let y0 = L.y; y0 < G.y + G.r; y0 += LAYER_M) {
    const ym = y0 + LAYER_M / 2;
    const rr = G.r * G.r - (ym - G.y) ** 2;
    if (rr <= 0) break;
    const R = Math.sqrt(rr);
    const n = Math.floor(R / CELL_M);
    for (let j = -n; j < n; j++) {
      const zc = (j + 0.5) * CELL_M;
      const half = Math.sqrt(Math.max(0, R * R - zc * zc));
      const m = Math.floor(half / CELL_M);
      if (m < 1) continue;
      waters.push({ id: `${CLOUD_AREA}-${y0}-${j}`, x0: G.x - m * CELL_M, x1: G.x + m * CELL_M, z0: G.z + j * CELL_M, z1: G.z + (j + 1) * CELL_M, yBottom: y0, yTop: Math.min(y0 + LAYER_M, G.y + G.r), area: CLOUD_AREA });
    }
  }
  const floors: Floor[] = [{ id: `${CLOUD_AREA}:rellano`, x0: L.x - L.half, x1: L.x + L.half, z0: L.z - L.half, z1: L.z + L.half, y: L.y, area: CLOUD_AREA }];
  return { waters, floors, solids: [combSolid()] };
}

export const CLOUD_GLOBE_DESC = "Una esfera de nubes sobre el mar, al sur de la isla, en la que se nada como en el globo de agua; en su centro, una obrera de abeja melífera asiática (Apis cerana) gigante vive su desarrollo real en su celda de cera: huevo, larva, pupa y adulta";
