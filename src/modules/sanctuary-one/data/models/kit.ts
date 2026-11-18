import type { Reality } from "@core/reality";


/**
 * THE MODEL CATALOGUE of sanctuary 1 (docs/design/santuario1.md §Catálogo). Every model the scene draws is one entry
 * here, and every placed thing is an instance that names its entry: so changing an entry (its size, colour or shape)
 * changes every copy, and a category or a group can be shown, hidden, recoloured or rescaled at once
 * (`CATEGORY`, `styleFor` in the scene). Sizes are true, in metres: x across, y up, z deep (the front faces −z).
 */
export type Category =
  /** Ice, land, sea, water trunks and acrylic walls (drawn from the walk world, not as instances). */
  | "terreno"
  /** Shells of the tree-buildings: struts, railings, tips. */
  | "edificio"
  /** Machines a person works at (gym machines, kitchen ranges, hospital beds). */
  | "maquina"
  /** Furniture and fittings (racks, benches, shelves, fountains). */
  | "mueble"
  /** Small things used by hand (towels, discs, bars). */
  | "utensilio"
  | "animal"
  | "persona"
  /** Plants, rocks, nests. */
  | "naturaleza"
  | "vehiculo"
  /** Signs over areas. */
  | "rotulo";

export type Shape = "caja" | "maquina" | "banco" | "jaula" | "figura" | "cuadrupedo" | "cetaceo" | "pinnipedo" | "pinguino" | "ave" | "piezas" | "cilindro" | "arbol";

/**
 * A box of a composite model («piezas»), in the model's frame (metres; y up from the floor, front towards −z):
 * centre x, y, z, size x, y, z and its colour (the model's own when left out). Cold Sanctuary builds its furniture
 * from boxes (`KitchenProps.C`), so its builders are copied box by box.
 */
export type Part = readonly [cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color?: number];

export interface ModelDef {
  readonly id: string;
  readonly category: Category;
  /** A finer group inside the category, for bulk changes (e.g. «gimnasio-placas», «fauna-marina»). */
  readonly group: string;
  readonly label: string;
  readonly size: { readonly x: number; readonly y: number; readonly z: number };
  readonly color: number;
  readonly shape: Shape;
  readonly reality: Reality;
  readonly source: string;
  /** The boxes of a composite model (shape «piezas»). */
  readonly parts?: readonly Part[];
}

export const CATEGORY: Readonly<Record<Category, { readonly label: string; readonly color?: number }>> = {
  terreno: { label: "Terreno y agua" },
  edificio: { label: "Edificios" },
  maquina: { label: "Máquinas" },
  mueble: { label: "Muebles" },
  utensilio: { label: "Utensilios" },
  animal: { label: "Animales" },
  persona: { label: "Personas" },
  naturaleza: { label: "Naturaleza" },
  vehiculo: { label: "Vehículos" },
  rotulo: { label: "Rótulos" },
};

export const m = (id: string, category: Category, group: string, label: string, x: number, y: number, z: number, color: number, shape: Shape, reality: Reality, source: string): ModelDef => ({
  id,
  category,
  group,
  label,
  size: { x, y, z },
  color,
  shape,
  reality,
  source,
});

/** A composite model: its size is the boxes' bounding box (walk solids and widening use it). */
export const pz = (id: string, category: Category, group: string, label: string, color: number, parts: readonly Part[], reality: Reality, source: string): ModelDef => {
  let x0 = Infinity, x1 = -Infinity, y1 = 0, z0 = Infinity, z1 = -Infinity;
  for (const [cx, cy, cz, sx, sy, sz] of parts) {
    x0 = Math.min(x0, cx - sx / 2); x1 = Math.max(x1, cx + sx / 2);
    y1 = Math.max(y1, cy + sy / 2);
    z0 = Math.min(z0, cz - sz / 2); z1 = Math.max(z1, cz + sz / 2);
  }
  return { id, category, group, label, size: { x: 2 * Math.max(-x0, x1), y: y1, z: 2 * Math.max(-z0, z1) }, color, shape: "piezas", reality, source, parts };
};

export const IRON = 0x5a5c66;
export const CHROME = 0xc7ccd6;
export const PAD = 0x1f1f24;
export const WOOD = 0xb3855a;
