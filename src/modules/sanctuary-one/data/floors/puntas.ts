import type { Placed } from "./kit";

/**
 * What grows on the tips at the end of the branches, in the tip's own frame (centre of the square, the same axes as its
 * side): the potted fruit trees, ONE OF EACH SPECIES and round again until no more fit (Orchards.cs PlantRoof, FruitCare.All,
 * 2 m of way between them), or on the Árbol de los Campos the guild's bed (Tree.cs TreeTip: 7,2 × 15 m beside the column).
 * `col` is the water column's square in the same frame, kept clear with 1,5 m.
 */
export const FRUITS: readonly (readonly [species: string, form: "arbol" | "palmera" | "arbusto" | "herbacea" | "rastrera"])[] = [
  ["Mango", "arbol"], ["Aguacate", "arbol"], ["Guanábana", "arbol"], ["Cacao", "arbol"], ["Almendro", "arbol"], ["Olivo", "arbol"], ["Naranja", "arbol"], ["Limón", "arbol"], ["Lima", "arbol"],
  ["Coco (enano)", "palmera"], ["Dátil", "palmera"], ["Café", "arbusto"], ["Babaco", "arbusto"], ["Banana (enana)", "arbusto"], ["Naranjilla", "arbusto"], ["Mortiño", "arbusto"],
  ["Piña", "herbacea"], ["Frutilla", "herbacea"], ["Sandía", "rastrera"],
];

type Sq = { x0: number; x1: number; z0: number; z1: number };

/** The care line's length (Orchards.cs BuildCareEquipment) and how deep its working strip is: the expert's room or a care point. */
const CARE = { sala: { model: "frutal-sala-cuidados", len: 14.8, depth: 3.6 }, punto: { model: "frutal-punto-cuidados", len: 4.9, depth: 2.6 } } as const;

/**
 * The pots of a tip and, first, its care point against a free edge, facing in (Orchards.cs PlaceCareStation: the
 * first edge whose line and working strip miss the water column); no pot within its strip and 2 m of way.
 */
export function orchardTip(size: number, col: Sq, step = 3.4, care: keyof typeof CARE = "punto"): Placed[] {
  const out: Placed[] = [];
  const c = CARE[care];
  const half = size / 2;
  const back = 0.95;
  // Each edge: the strip the line and its work take (in the tip's frame), where the line goes and its turn.
  const edges = [
    { r: { x0: -c.len / 2, x1: c.len / 2, z0: -half, z1: -half + back + c.depth }, x: 0, z: -half + back, rot: 0 },
    { r: { x0: -c.len / 2, x1: c.len / 2, z0: half - back - c.depth, z1: half }, x: 0, z: half - back, rot: Math.PI },
    { r: { x0: -half, x1: -half + back + c.depth, z0: -c.len / 2, z1: c.len / 2 }, x: -half + back, z: 0, rot: Math.PI / 2 },
    { r: { x0: half - back - c.depth, x1: half, z0: -c.len / 2, z1: c.len / 2 }, x: half - back, z: 0, rot: -Math.PI / 2 },
  ];
  const hits = (a: Sq, b: Sq, m: number) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  const edge = c.len <= size - 0.8 ? edges.find((e) => !hits(e.r, col, 1.5)) : undefined;
  if (edge) out.push({ model: c.model, x: edge.x, z: edge.z, rot: edge.rot, name: care === "sala" ? "Sala de cuidados de los frutales" : "Punto de cuidados de los frutales" });
  let i = 0;
  const h = half - 1.2;
  for (let z = -h; z <= h + 1e-6; z += step)
    for (let x = -h; x <= h + 1e-6; x += step) {
      if (x > col.x0 - 1.5 && x < col.x1 + 1.5 && z > col.z0 - 1.5 && z < col.z1 + 1.5) continue;
      if (edge && hits({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.6, z1: z + 0.6 }, edge.r, 1)) continue;
      const [species, form] = FRUITS[i++ % FRUITS.length]!;
      out.push({ model: `maceta-${form}`, x, z, name: `Frutal en maceta: ${species}` });
    }
  return out;
}

/** The tips' guilds of the Árbol de los Campos (TreeSpec.Guilds at the tip platforms 3, 4, 7, 8), with their crops. */
export const TIP_GUILDS: readonly (readonly [title: string, rows: readonly string[][]])[] = [
  ["Arrozal", [["Arroz"], ["Arroz"], ["Soja", "Cebollín"]]],
  ["Milpa (las Tres Hermanas)", [["Maíz", "Frijol", "Calabaza"], ["Amaranto", "Chile"]]],
  ["Chacra andina", [["Quinoa", "Haba"], ["Tarwi", "Melloco"], ["Maíz", "Maíz morado"], ["Huacatay", "Chile", "Hierbaluisa"]]],
  ["Campo de rotación: legumbres y granos", [["Trigo"], ["Lenteja", "Arveja"], ["Trigo", "Avena"], ["Garbanzo", "Haba"]]],
];
const TALL = new Set(["Maíz", "Maíz morado", "Quinoa", "Amaranto", "Trigo", "Avena", "Tarwi", "Arroz"]);

/** A tip's bed (TreeTip): 7,2 m across × 15 m, its rows along the 15 m, in the free band beside the column. */
export function bedTip(size: number, col: Sq, guild: number): Placed[] {
  const [, rows] = TIP_GUILDS[guild % TIP_GUILDS.length]!;
  const free = col.x1 + 1.5;
  const w = Math.min(7.2, size / 2 - 0.6 - free);
  const cx = free + w / 2;
  const out: Placed[] = [{ model: "campo-bancal", x: cx, z: 0 }];
  let r = 0;
  for (let x = cx - w / 2 + 0.6; x <= cx + w / 2 - 0.6 + 1e-6; x += 1.2, r++) {
    const row = rows[r % rows.length]!;
    let i = 0;
    for (let z = -6.9; z <= 6.9; z += 0.8, i++) {
      const k = row[i % row.length]!;
      out.push({ model: TALL.has(k) ? "cultivo-alto" : "cultivo-bajo", x, z, name: k });
    }
  }
  return out;
}
