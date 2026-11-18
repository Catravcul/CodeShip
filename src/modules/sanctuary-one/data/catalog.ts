import type { Reality } from "@core/reality";
import { S1_SOURCES as S } from "./sources";

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

export type Shape = "caja" | "maquina" | "banco" | "jaula" | "figura" | "cuadrupedo" | "cetaceo" | "pinnipedo" | "pinguino" | "ave";

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

const m = (id: string, category: Category, group: string, label: string, x: number, y: number, z: number, color: number, shape: Shape, reality: Reality, source: string): ModelDef => ({
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

const IRON = 0x5a5c66;
const CHROME = 0xc7ccd6;
const PAD = 0x1f1f24;
const WOOD = 0xb3855a;

export const MODELS: readonly ModelDef[] = [
  // ── Gym, floor 0: plate-loaded machines (10 types; footprints of real machines, docs/gimnasio-maquinas.md) ──
  m("gym-press-pecho", "maquina", "gimnasio-placas", "Press de pecho", 1.4, 1.48, 1.1, IRON, "maquina", "real", `${S.gymMachines}: Life Fitness Insignia`),
  m("gym-press-hombros", "maquina", "gimnasio-placas", "Press de hombros", 1.45, 1.55, 1.47, IRON, "maquina", "real", `${S.gymMachines}: Precor Vitality`),
  m("gym-jalon", "maquina", "gimnasio-placas", "Jalón al pecho (espalda)", 1.4, 1.85, 1.52, IRON, "maquina", "real", `${S.gymMachines}: Life Fitness Axiom`),
  m("gym-remo", "maquina", "gimnasio-placas", "Remo sentado", 1.22, 1.78, 1.42, IRON, "maquina", "real", `${S.gymMachines}: Precor Vitality`),
  m("gym-prensa", "maquina", "gimnasio-placas", "Prensa de piernas 45°", 1.15, 1.52, 2.12, IRON, "maquina", "real", `${S.gymMachines}: Force USA`),
  m("gym-extension", "maquina", "gimnasio-placas", "Extensión de cuádriceps", 1.37, 1.8, 1.37, IRON, "maquina", "real", `${S.gymMachines}: Body-Solid Pro Select`),
  m("gym-curl-femoral", "maquina", "gimnasio-placas", "Curl femoral tumbado", 0.64, 0.69, 1.57, IRON, "maquina", "real", `${S.gymMachines}: Body-Solid Powerline`),
  m("gym-hip-thrust", "maquina", "gimnasio-placas", "Hip thrust (glúteos)", 1.52, 0.89, 1.57, IRON, "maquina", "real", `${S.gymMachines}: Nautilus Glute Drive`),
  m("gym-gemelos", "maquina", "gimnasio-placas", "Gemelos sentado", 0.6, 1.0, 1.22, IRON, "maquina", "real", `${S.gymMachines}: Titan`),
  m("gym-curl-biceps", "maquina", "gimnasio-placas", "Curl de bíceps y tríceps", 1.23, 1.4, 1.34, IRON, "maquina", "real", `${S.gymMachines}: Hoist HD-3100`),
  // ── Gym, floor 0: free weights (docs/entrenamiento-areas.md §3.2) ──
  m("gym-estante-mancuernas", "mueble", "gimnasio-peso-libre", "Estante de mancuernas (pares de 2 a 40 kg)", 2.3, 0.95, 0.7, IRON, "caja", "real", `${S.csGym}; estante real de 1,5–2,3 × 0,5–0,85 × 0,85–1,0 m`),
  m("gym-banco-fid", "mueble", "gimnasio-peso-libre", "Banco regulable FID (0–85°)", 0.71, 0.79, 1.4, PAD, "banco", "real", `${S.csGym}; Body-Solid FID46: 191 × 71 × 79 cm`),
  m("gym-jaula", "maquina", "gimnasio-peso-libre", "Jaula de sentadillas (power rack)", 2.2, 2.3, 1.4, IRON, "jaula", "real", `${S.csGym}; caja de 1,2–1,3 × 1,2–1,5 × 2,1–2,3 m con barra de 2,2 m`),
  m("gym-press-banca", "maquina", "gimnasio-peso-libre", "Press de banca plano olímpico", 2.2, 1.3, 1.7, PAD, "banco", "real", `${S.csGym}; Life Fitness: 130 × 132 × 130 cm, área de uso 191 × 305 cm`),
  m("gym-press-inclinado", "maquina", "gimnasio-peso-libre", "Press de banca inclinado", 2.2, 1.4, 1.7, PAD, "banco", "real", S.csGym),
  m("gym-smith", "maquina", "gimnasio-peso-libre", "Máquina Smith", 2.0, 2.2, 1.5, CHROME, "maquina", "real", `${S.csGym}; Smith: 137–145 × 178 × 211–230 cm`),
  m("gym-plataforma", "mueble", "gimnasio-peso-libre", "Plataforma de peso muerto (madera y caucho)", 2.4, 0.05, 2.4, 0xcca36b, "caja", "real", `${S.csGym}; plataforma de halterofilia de 8 × 8 ft`),
  m("gym-arbol-discos", "utensilio", "gimnasio-peso-libre", "Árbol de discos", 0.6, 1.3, 0.6, IRON, "caja", "real", S.csGym),
  m("gym-soporte-barras", "utensilio", "gimnasio-peso-libre", "Soporte de barras olímpicas", 0.6, 1.2, 0.6, IRON, "caja", "real", S.csGym),
  m("gym-fuente", "mueble", "gimnasio-servicios", "Fuente de agua", 0.5, 1.05, 0.4, CHROME, "caja", "real", `${S.csGym} (Fuente_de_agua: 0,5 × 1 × 0,4 m)`),
  m("gym-toallas", "mueble", "gimnasio-servicios", "Toallas", 0.8, 1.32, 0.4, WOOD, "caja", "real", `${S.csGym} (Toallas: mueble de 0,8 × 1,2 × 0,4 m)`),
  m("gym-suelo-caucho", "mueble", "gimnasio-servicios", "Suelo de caucho", 1, 0.02, 1, 0x2e2e33, "caja", "real", S.csGym),
  m("alfombras-zona", "mueble", "transporte", "Zona de alfombras voladoras (7,6 × 4,4 m)", 7.6, 0.03, 4.4, 0x9a3b3b, "caja", "ficcion", `${S.csGym} (GymCarpetSpot)`),

  // ── Animals (adults, true size: body length along z, height to the top along y) ──
  m("oso-polar", "animal", "fauna-tierra", "Oso polar", 0.9, 1.5, 2.5, 0xf2efe6, "cuadrupedo", "real", S.polarBear),
  m("lobo-artico", "animal", "fauna-tierra", "Lobo ártico", 0.35, 0.75, 1.4, 0xe8e6df, "cuadrupedo", "real", S.arcticWolf),
  m("zorro-artico", "animal", "fauna-tierra", "Zorro ártico", 0.18, 0.3, 0.6, 0xf5f5f2, "cuadrupedo", "real", S.arcticFox),
  m("liebre-artica", "animal", "fauna-tierra", "Liebre ártica", 0.2, 0.3, 0.6, 0xf7f7f4, "cuadrupedo", "real", S.arcticHare),
  m("reno", "animal", "fauna-tierra", "Reno", 0.5, 1.2, 1.9, 0x8a7560, "cuadrupedo", "real", S.reindeer),
  m("buey-almizclero", "animal", "fauna-tierra", "Buey almizclero", 0.9, 1.3, 2.1, 0x4a3b2f, "cuadrupedo", "real", S.muskox),
  m("foca", "animal", "fauna-marina", "Foca de Weddell", 0.7, 0.6, 3.0, 0x5d6670, "pinnipedo", "real", S.sealWeddell),
  m("morsa", "animal", "fauna-marina", "Morsa", 1.2, 1.0, 3.0, 0x9a6f55, "pinnipedo", "real", S.walrus),
  m("orca", "animal", "fauna-marina", "Orca", 1.6, 1.8, 8.0, 0x15161a, "cetaceo", "real", S.orca),
  m("ballena", "animal", "fauna-marina", "Ballena jorobada", 3.0, 3.0, 15.0, 0x3b4450, "cetaceo", "real", S.humpback),
  m("pinguino", "animal", "fauna-aves", "Pingüino de Adelia", 0.3, 0.7, 0.3, 0x1c1c22, "pinguino", "real", S.adelie),
  m("pinguino-emperador", "animal", "fauna-aves", "Pingüino emperador", 0.45, 1.15, 0.45, 0x22232a, "pinguino", "real", S.emperor),
  m("petrel-niveo", "animal", "fauna-aves", "Petrel níveo", 0.85, 0.2, 0.35, 0xfafafa, "ave", "real", S.snowPetrel),

  // ── People: one model each, drawn as the cube figure (CubeFigure) at true height ──
  m("persona", "persona", "personal", "Persona del santuario", 0.45, 1.7, 0.3, 0xe0b48c, "figura", "real", S.human),
];

const BY_ID = new Map(MODELS.map((d) => [d.id, d]));

export function model(id: string): ModelDef {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Modelo desconocido: ${id}`);
  return d;
}
