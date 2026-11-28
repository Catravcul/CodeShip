import { CASTILLOS, CASTILLOS_SOURCE, CROWN } from "../castillos";
import type { FloorPlan, Placed } from "./kit";
import { MUSICA_AULAS_FLOORS } from "./musica-aulas";

/**
 * The Residencia on a tree's crown (Berón 2026-11-24: «este piso de habitaciones y plaza podría pasar a ser un piso más
 * grande que se encuentre en la cima del árbol… con el jardín bordeando dicho piso y la entrada en el centro»): one
 * giant floor round the trunk's top, with the pillow ring all round the way in, the four castles with the 30 aposentos
 * (castillos.ts), the classroom, the reading corner, the shared kitchen and the toilets in the corners between them,
 * and a garden along the edge. Crown frame: origin on the trunk's axis, +z the tree's first side.
 */
const SRC = "Cold Sanctuary, Assets/Editor/ResidentialBuilder.cs (FurnishPlaza, FurnishRoomFloor)";
/** The corners between the castles: their centres. */
const MID = (CROWN.path + CROWN.castles) / 2;
const CORNERS = [
  { x: MID, z: MID },
  { x: MID, z: -MID },
  { x: -MID, z: -MID },
  { x: -MID, z: MID },
] as const;

function cima(): FloorPlan {
  const items: Placed[] = [];
  // The aposentos of the castles, at their decks' heights.
  for (const c of CASTILLOS) for (const r of c.rooms) items.push({ model: r.model, x: r.x, y: r.y, z: r.z, rot: r.yaw, name: r.name });
  // Corner 1: the history classroom (Berón 2026-11-22: «el aula puede ir junto a la plaza»).
  const aula = MUSICA_AULAS_FLOORS.find((f) => f.id === "aula-historia")!;
  const k = CORNERS[0];
  for (const it of aula.items) if (!it.model.startsWith("suelo-")) items.push({ ...it, x: k.x + (it.x + 1.15) * 1.05, z: k.z + (it.z - 1.6) * 1.05, ...(it.model === "aula-mesa-profesor" ? { name: "Mesa del profesor del aula" } : {}) });
  // Corner 2: the reading corner and the Residencia's library.
  const r = CORNERS[1];
  [[-3, -5], [-3, 0], [-3, 5]].forEach(([dx, dz], i) => items.push({ model: "res-banco-lectura", x: r.x + dx!, z: r.z + dz!, rot: Math.PI / 2, name: `Banco de lectura ${i + 1}` }));
  items.push({ model: "aula-biblioteca", x: r.x + 5, z: r.z, rot: -Math.PI / 2, name: "Biblioteca de la residencia" });
  // Corner 3: the shared kitchen and its table.
  const q = CORNERS[2];
  items.push(
    { model: "cocina-encimera-ingredientes", x: q.x - 4, z: q.z - 5, name: "Cocina compartida" },
    { model: "cocina-estanteria", x: q.x - 7, z: q.z + 1, rot: Math.PI / 2, name: "Despensa compartida" },
    { model: "comedor-mesa", x: q.x + 1, z: q.z + 1, name: "Mesa de la cocina compartida" },
    { model: "comedor-mesa", x: q.x + 4.5, z: q.z + 1 },
    { model: "mus-sofa", x: q.x + 2, z: q.z + 6, name: "Sala común" },
  );
  // Corner 4: the toilets (two blocks of three).
  const w = CORNERS[3];
  items.push({ model: "aseos-3", x: w.x - 3.5, z: w.z, rot: Math.PI / 2 }, { model: "aseos-3", x: w.x + 3.5, z: w.z, rot: -Math.PI / 2 });
  // The garden along the edge: a fruit tree in its pot every 6 m, with potted plants between.
  const g = (CROWN.castles + CROWN.half) / 2;
  for (let s = -CROWN.half + 3; s <= CROWN.half - 3; s += 6)
    for (const [x, z] of [[s, g], [s, -g], [g, s], [-g, s]] as const) items.push({ model: Math.round(s / 6) % 2 ? "planta-arbolito" : "planta-maceta", x, z });
  return { id: "residencia-cima", size: { x: 2 * CROWN.half, z: 2 * CROWN.half }, items, source: `${SRC}; ${CASTILLOS_SOURCE}` };
}

export const CIMA_RESIDENCIA: FloorPlan = cima();
