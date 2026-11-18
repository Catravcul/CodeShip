import { ROOM_OWNERS } from "../models/residencia";
import type { FloorPlan, Placed } from "./kit";

/**
 * The Residencia floors (ResidentialBuilder.FurnishPlaza / FurnishRoomFloor): the plaza with the pillow ring and the
 * reading benches, and 5 floors of rooms (7 per floor: 2 columns × 4 rows minus the toilets' place, 30 rooms in all,
 * the last 5 free for newcomers), each with its fruit terrace on the outer side. Plan 40 × 38 m.
 */
const SIZE = { x: 40, z: 38 } as const;
const SRC = "Cold Sanctuary, Assets/Editor/ResidentialBuilder.cs";
export const ROOMS = 30;
export const ROOMS_PER_FLOOR = 7;

function plaza(): FloorPlan {
  const items: Placed[] = [{ model: "plaza-suelo", x: 0, z: 0 }, { model: "res-ring", x: -5, z: 4 }, { model: "res-ring-colchon", x: -5, z: 4 }, { model: "res-alfombras", x: 9, z: -11 }];
  for (let r = 0; r < 4; r++) items.push({ model: "res-banco-lectura", x: r < 2 ? 12 : 16, z: r % 2 === 0 ? 0 : 10, rot: Math.PI / 2, name: `Banco de lectura ${r + 1}` });
  return { id: "residencia-plaza", size: SIZE, items, source: `${SRC} FurnishPlaza` };
}

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
      items.push({ model: "res-terraza", x: side * 13.5, z: rows[r]!, ...(side < 0 ? { rot: Math.PI } : {}) });
      room++;
    }
  items.push({ model: "aseos-3", x: -5.5, z: 15.5, rot: Math.PI });
  return { id: `habitaciones-${index + 1}`, size: SIZE, items, source: `${SRC} FurnishRoomFloor (piso ${index + 1})` };
}

export const RESIDENCIA_FLOORS: readonly FloorPlan[] = [plaza(), ...[0, 1, 2, 3, 4].map(rooms)];
