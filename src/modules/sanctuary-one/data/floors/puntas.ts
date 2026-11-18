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

export function orchardTip(size: number, col: Sq, step = 3.4): Placed[] {
  const out: Placed[] = [];
  let i = 0;
  const h = size / 2 - 1.2;
  for (let z = -h; z <= h + 1e-6; z += step)
    for (let x = -h; x <= h + 1e-6; x += step) {
      if (x > col.x0 - 1.5 && x < col.x1 + 1.5 && z > col.z0 - 1.5 && z < col.z1 + 1.5) continue;
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
