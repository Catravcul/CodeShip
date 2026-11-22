import { ROOM_OWNERS } from "../models/residencia";
import { FRUITS } from "./puntas";
import type { FloorPlan, Placed } from "./kit";
import { MUSICA_AULAS_FLOORS } from "./musica-aulas";

/**
 * The Residencia floors (ResidentialBuilder.FurnishPlaza / FurnishRoomFloor): the plaza with the pillow ring and the
 * reading benches, and 5 floors of rooms (7 per floor: 2 columns × 4 rows minus the toilets' place, 30 rooms in all,
 * the last 5 free for newcomers), each with its fruit terrace on the outer side. Plan 40 × 38 m.
 */
const SIZE = { x: 40, z: 38 } as const;
const SRC = "Cold Sanctuary, Assets/Editor/ResidentialBuilder.cs";
export const ROOMS = 30;
export const ROOMS_PER_FLOOR = 7;

/**
 * The plaza, with the classroom on its trunk-side left (Berón 2026-11-22: «el aula y música no encajan… la música hace
 * ruido y el aula necesita más silencio… quizás el aula puede ir junto a la plaza, pues se usarían en horarios
 * distintos»): the pillow ring on the right, the reading benches behind the classroom, the carpets by the trunk. The
 * classroom is the history one (musica-aulas.ts) at 1,5 times its spacing, so there is room to run between desks.
 */
const AULA = { x: -10.5, z: -9.5, spread: 1.5 } as const;
function plaza(): FloorPlan {
  const items: Placed[] = [{ model: "plaza-suelo", x: 0, z: 0 }, { model: "res-ring", x: 9.6, z: 5.5 }, { model: "res-ring-colchon", x: 9.6, z: 5.5 }, { model: "res-alfombras", x: 9, z: -11 }];
  [[-14, 7], [-5, 7], [-14, 13], [-5, 13]].forEach(([x, z], r) => items.push({ model: "res-banco-lectura", x: x!, z: z!, name: `Banco de lectura ${r + 1}` }));
  const aula = MUSICA_AULAS_FLOORS.find((f) => f.id === "aula-historia")!;
  for (const it of aula.items) if (!it.model.startsWith("suelo-")) items.push({ ...it, x: AULA.x + it.x * AULA.spread, z: AULA.z + it.z * AULA.spread, ...(it.model === "aula-mesa-profesor" ? { name: "Mesa del profesor del aula" } : {}) });
  return { id: "residencia-plaza", size: SIZE, items, source: `${SRC} FurnishPlaza; ${aula.source}; el aula en la plaza (Berón 2026-11-22)` };
}

/** The residents' shared kitchen and common room, where a floor has rooms to spare (ours: a residence hall's). */
const COMMON: readonly Placed[] = [
  { model: "cocina-encimera-ingredientes", x: -5.5, z: -6, name: "Cocina compartida" },
  { model: "cocina-estanteria", x: -9.5, z: 1.5, rot: Math.PI / 2, name: "Despensa compartida" },
  { model: "comedor-mesa", x: -5.5, z: -0.5, name: "Mesa de la cocina compartida" },
  { model: "comedor-mesa", x: -1.5, z: -0.5 },
  { model: "mus-sofa", x: 4, z: 4, name: "Sala común" },
  { model: "mus-sofa", x: 7, z: 4 },
  { model: "mus-sofa", x: 5.5, z: 8.5, rot: Math.PI },
  { model: "comedor-mesa", x: 5.5, z: 6.3, name: "Mesa de juegos" },
  { model: "res-banco-lectura", x: 0, z: 12.5, name: "Banco de lectura de la sala común" },
  { model: "aula-biblioteca", x: 9.5, z: 9, name: "Biblioteca de la residencia" },
  ...[[-9.5, -9], [9.5, -1], [1.5, 6], [-9.5, 9]].map(([x, z]) => ({ model: "planta-maceta", x: x!, z: z! })),
];

function rooms(index: number): FloorPlan {
  const items: Placed[] = [];
  const rows = [-11.5, -2.5, 6.5, 15.5];
  let room = index * ROOMS_PER_FLOOR;
  for (let r = 0; r < rows.length; r++)
    for (const side of [-1, 1]) {
      if (r === rows.length - 1 && side < 0) continue;
      if (room >= ROOMS) continue;
      const who = ROOM_OWNERS[room];
      items.push({ model: `res-habitacion-${(room % 2) + 1}`, x: side * 5.5, z: rows[r]!, name: who ? `Habitación de ${who}` : `Habitación libre ${room + 1}` });
      // Its fruit: the small ones, a different one in each house (FRUITS[last − room % (n/2)]: Sandía, Frutilla, Piña…).
      const [fruit, form] = FRUITS[FRUITS.length - 1 - (room % Math.floor(FRUITS.length / 2))]!;
      items.push({ model: `res-terraza-${form}`, x: side * 13.5, z: rows[r]!, name: `Terraza frutal: ${fruit}`, ...(side < 0 ? { rot: Math.PI } : {}) });
      room++;
    }
  items.push({ model: "aseos-3", x: -5.5, z: 15.5, rot: Math.PI });
  // The floor with the last rooms keeps the rest for everyone (a residence hall's shared kitchen and common room).
  if (room - index * ROOMS_PER_FLOOR <= 3) items.push(...COMMON);
  return { id: `habitaciones-${index + 1}`, size: SIZE, items, source: `${SRC} FurnishRoomFloor (piso ${index + 1})` };
}

export const RESIDENCIA_FLOORS: readonly FloorPlan[] = [plaza(), ...[0, 1, 2, 3, 4].map(rooms)];
