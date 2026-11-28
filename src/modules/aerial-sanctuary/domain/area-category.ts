import type { AreaDef } from "../data/layout";

/**
 * The category chips of sanctuary 3's Áreas (Berón 2026-11-19: «en la lista de áreas nos faltan los filtros de
 * categoría», the same chips as sanctuary 1 and the ships): the tree-buildings' trunks and roofs, their floors and
 * tips, the training island's facilities and rooms, and the outdoors (the island, the helipads, the caps, the dock,
 * the platform and the crown's pad).
 */
export type S3AreaCategory = "Troncos" | "Pisos" | "Instalaciones" | "Exterior";

export function s3AreaCategory(a: Pick<AreaDef, "id" | "label" | "island"> & Partial<Pick<AreaDef, "tower">>): S3AreaCategory {
  if (/^(Tronco de agua|Techo) \(/.test(a.label)) return "Troncos";
  if (/, nivel \d+\)$/.test(a.label)) return "Pisos";
  // Inside the mountain (montana-hueca.md): the tree-buildings' bases, floors, rings and crowns are Pisos; the gates,
  // the lake, the shore and the hall, Exterior; the rooms on the floors (they name their building), Instalaciones.
  if (/^entrenamiento:(compuerta-[a-z]+(:muelle)?|lago|orilla|montana)$/.test(a.id)) return "Exterior";
  if (a.tower && (!a.id.startsWith("entrenamiento:") || /^entrenamiento:[a-z-]+:pie$/.test(a.id))) return "Pisos";
  if (a.tower && /^entrenamiento:piso-\d+$/.test(a.id)) return "Pisos";
  if (a.island === "entrenamiento" && a.id !== "entrenamiento:isla" && a.id !== "entrenamiento:helipuerto") return "Instalaciones";
  return "Exterior";
}
