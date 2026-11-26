import type { Reality } from "@core/reality";
import type { Floor, Rect, Solid } from "../domain/walk";
import { wallWithGaps } from "../domain/walk";
import type { WayPoint } from "../domain/route";
import type { AreaDef, MachineDef } from "./layout";
import { CAMPUS_SRC } from "./campus";
import { S3_SOURCES as S } from "./sources";

/**
 * The training island in detail (Berón, 2026-11-18: «las áreas se ven vacías»; docs/design/santuario3-detalle.md):
 * every real facility with its real equipment, furniture and fixtures, at true size, each with its source and its
 * label (real, en desarrollo, licencia, ficción). Where no source gives a layout or a size, the item says so
 * (`S.ours` / `S.generic`) instead of filling the gap silently.
 *
 * Rooms are drawn `k` times wider on the plan («Escala de interiores», §2.4): a fixture's place is scaled with its
 * room, its size stays true (a chair is a chair), except what spans the room (partitions, mezzanines, screens, mats),
 * which is stretched with it. What sits against a wall stays against it at any scale (`snap`).
 */

export type FixtureKind =
  | "caja"
  | "vidrio"
  | "pavimento"
  | "taquillas"
  | "banco"
  | "silla"
  | "silla-alta"
  | "mesa"
  | "archivador"
  | "estanteria"
  | "mostrador"
  | "fuente"
  | "lavabo"
  | "armario"
  | "camilla-exam"
  | "ecg"
  | "ecografo"
  | "audiometro"
  | "monitor-carro"
  | "soporte-emu"
  | "carro-traje"
  | "consola-ecs"
  | "botellas"
  | "puesto-buzos"
  | "camaras-buceo"
  | "grua-pluma"
  | "grua-puente"
  | "carril-grua"
  | "hiperbarica"
  | "maqueta-modulo"
  | "maqueta-viga"
  | "maqueta-dragon"
  | "maqueta-cygnus"
  | "luz-techo"
  | "barandilla"
  | "consola-fcr"
  | "silla-fcr"
  | "pantallas-frente"
  | "consola-camara"
  | "asiento-camara"
  | "cinta"
  | "bici"
  | "jaula"
  | "mancuernas"
  | "banco-pesas"
  | "remo"
  | "polea"
  | "ared"
  | "espejo"
  | "mets"
  | "balsa"
  | "izado"
  | "silla-socorrista"
  | "escalerilla"
  | "chalecos"
  | "luz-pista"
  | "manga"
  | "foco"
  | "surtidor"
  | "extintor"
  | "rotulo-suelo"
  | "farola"
  | "poste-senal"
  | "tussac"
  | "banco-exterior"
  | "papelera"
  | "noray"
  | "salvavidas"
  | "pilote"
  | "rack-ispr"
  | "trineo"
  | "banco-trabajo"
  | "puerta-industrial"
  | "capsula-orion"
  | "escalon"
  | "techo"
  | "vaso"
  | "cortina"
  | "tallimetro"
  | "diagnostico-pared"
  | "carro-paradas"
  | "reloj"
  | "pizarra"
  | "tele-pared"
  | "planta"
  | "discos"
  | "cajones-salto"
  | "elevadora"
  | "carro-herramientas"
  | "mesa-reunion"
  | "cama"
  | "cocina"
  | "nevera"
  | "sofa"
  | "guantera"
  | "camara-cultivo"
  | "estante-cultivo"
  | "colmena"
  | "insectario"
  | "impresora-3d"
  | "torno"
  | "fresadora"
  | "pupitre"
  | "sillon-dental";

export interface PlacedFixture {
  readonly kind: FixtureKind;
  /** The middle of its base, world metres. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** True size along its own x (w), y (h) and z (d), before the turn. */
  readonly w: number;
  readonly d: number;
  readonly h: number;
  /** Quarter turns about y: its front (+z) turned 0, 90°, 180°, 270° (counter-clockwise from above). */
  readonly rot: 0 | 1 | 2 | 3;
  readonly area: string;
  readonly reality: Reality;
  readonly source: string;
  /** What it is, in Spanish (the plate on it, when `plate`). */
  readonly name: string;
  readonly plate?: boolean;
  /** She cannot go through it (its box is a solid of the walk world). */
  readonly solid: boolean;
  /** Against a wall or hanging from the roof: it may touch the wall it hangs on. */
  readonly mounted: boolean;
  readonly color?: number;
  /** Plan scale of a shell drawn with its compartment (the Orion capsule). */
  readonly plan?: number;
  /** A count or a text the model needs (screens, lockers, a painted mark). */
  readonly n?: number;
  readonly text?: string;
}

export interface WalkCheck {
  readonly id: string;
  readonly pts: readonly { readonly x: number; readonly y: number; readonly z: number }[];
}

/** What the layout's builder offers the furnishing. */
export interface FurnishSink {
  floor(area: string, y: number, r: Rect): void;
  solid(s: Solid): void;
  fixture(f: PlacedFixture, solids?: readonly Solid[]): void;
  point(id: string, x: number, y: number, z: number): string;
  link(...ids: string[]): void;
  area(a: AreaDef): void;
  cut(area: string, y: number, hole: Rect): void;
  walkCheck(c: WalkCheck): void;
  readonly points: readonly WayPoint[];
  readonly links: readonly (readonly [string, string])[];
  readonly machines: readonly MachineDef[];
  readonly floors: readonly Floor[];
}

export interface RoomFrame {
  readonly id: string;
  readonly k: number;
  readonly centre: { readonly x: number; readonly z: number };
  /** Half sizes on the plan as drawn (k times the real ones). */
  readonly half: { readonly x: number; readonly z: number };
  readonly height: number;
  readonly area: string;
  /** The door's inside way point. */
  readonly inside: string;
  readonly compartments: readonly { id: string; x: number; z: number; hx: number; hz: number; floorY: number; h: number; hatch: "w" | "e" }[];
  /** The pool, real size (drawn k times wider like the room). */
  readonly pool?: { readonly x: number; readonly z: number; readonly depth: number };
}

// ── The catalogue: each kind with its true size, its label and its source ──
interface Spec {
  readonly w: number;
  readonly d: number;
  readonly h: number;
  readonly name: string;
  readonly reality: Reality;
  readonly source: string;
  readonly solid?: boolean;
  readonly mounted?: boolean;
}
const G = S.generic;
const CAT: Readonly<Record<FixtureKind, Spec>> = {
  // The campus (data/campus.ts): its furniture and equipment.
  cama: { w: 1.0, d: 2.05, h: 0.55, name: "Cama", reality: "real", source: CAMPUS_SRC.crewQuarters },
  cocina: { w: 1.8, d: 0.7, h: 0.92, name: "Cocina: fogones, horno y campana", reality: "real", source: G, mounted: true },
  nevera: { w: 0.8, d: 0.75, h: 1.9, name: "Frigorífico", reality: "real", source: G, mounted: true },
  sofa: { w: 2.2, d: 0.9, h: 0.85, name: "Sofá de la sala común", reality: "real", source: CAMPUS_SRC.crewQuarters },
  guantera: { w: 1.6, d: 0.9, h: 1.9, name: "Guantera de nitrógeno", reality: "real", source: CAMPUS_SRC.glovebox, mounted: true },
  "camara-cultivo": { w: 1.2, d: 0.6, h: 1.8, name: "Cámara de cultivo (como Veggie)", reality: "real", source: CAMPUS_SRC.veggie, mounted: true },
  "estante-cultivo": { w: 1.8, d: 0.6, h: 2.0, name: "Estantería de cultivo con luz LED", reality: "real", source: CAMPUS_SRC.veggie },
  colmena: { w: 0.9, d: 0.4, h: 1.1, name: "Colmena de observación con ventana", reality: "real", source: CAMPUS_SRC.bees, mounted: true },
  insectario: { w: 1.6, d: 0.6, h: 1.8, name: "Insectario: cajas ventiladas con viales de moscas", reality: "real", source: CAMPUS_SRC.flyLab, mounted: true },
  "impresora-3d": { w: 0.7, d: 0.7, h: 1.2, name: "Impresora 3D", reality: "real", source: CAMPUS_SRC.aaf },
  torno: { w: 1.8, d: 0.7, h: 1.3, name: "Torno", reality: "real", source: G },
  fresadora: { w: 1.3, d: 1.2, h: 2.0, name: "Fresadora", reality: "real", source: G },
  pupitre: { w: 1.2, d: 0.6, h: 0.75, name: "Pupitre", reality: "real", source: G },
  "sillon-dental": { w: 0.8, d: 1.9, h: 1.0, name: "Sillón de odontología", reality: "real", source: CAMPUS_SRC.flightMed },
  caja: { w: 1, d: 1, h: 1, name: "Tabique", reality: "real", source: S.ours },
  vidrio: { w: 1, d: 0.05, h: 1, name: "Cristal", reality: "real", source: S.ours, solid: false, mounted: true },
  pavimento: { w: 1, d: 1, h: 0.02, name: "Pavimento", reality: "real", source: S.ours, solid: false },
  taquillas: { w: 0.38, d: 0.5, h: 1.8, name: "Taquillas", reality: "real", source: G, mounted: true },
  banco: { w: 1.8, d: 0.4, h: 0.45, name: "Banco de vestuario", reality: "real", source: G },
  silla: { w: 0.5, d: 0.5, h: 0.9, name: "Silla", reality: "real", source: G },
  "silla-alta": { w: 0.55, d: 0.55, h: 1.2, name: "Silla alta del operador", reality: "real", source: S.altitudeChamber },
  mesa: { w: 1.6, d: 0.8, h: 0.75, name: "Mesa con ordenador", reality: "real", source: G },
  archivador: { w: 0.5, d: 0.65, h: 1.3, name: "Archivador de historiales", reality: "real", source: G, mounted: true },
  estanteria: { w: 1.0, d: 0.45, h: 2.0, name: "Estantería", reality: "real", source: G, mounted: true },
  mostrador: { w: 2.4, d: 0.7, h: 1.1, name: "Recepción", reality: "real", source: G },
  fuente: { w: 0.45, d: 0.35, h: 1.0, name: "Fuente de agua", reality: "real", source: G, mounted: true },
  lavabo: { w: 0.8, d: 0.55, h: 0.9, name: "Lavabo y armario", reality: "real", source: G, mounted: true },
  armario: { w: 1.0, d: 0.45, h: 1.9, name: "Armario de material", reality: "real", source: G, mounted: true },
  "camilla-exam": { w: 0.7, d: 1.9, h: 0.75, name: "Camilla de exploración", reality: "real", source: `${S.training}; ${G}` },
  ecg: { w: 0.55, d: 0.5, h: 1.1, name: "Electrocardiógrafo", reality: "real", source: `${S.training}; ${G}` },
  ecografo: { w: 0.6, d: 0.8, h: 1.45, name: "Ecógrafo", reality: "real", source: `${S.ascr}; ${G}` },
  audiometro: { w: 1.2, d: 0.6, h: 0.75, name: "Audiómetro", reality: "real", source: `${S.training}; ${G}` },
  "monitor-carro": { w: 1.2, d: 0.7, h: 1.75, name: "Monitores del borde", reality: "real", source: S.nblPodcast },
  "soporte-emu": { w: 1.2, d: 1.2, h: 2.4, name: "Soporte de vestirse (EMU)", reality: "real", source: S.nblPodcast, solid: true },
  "carro-traje": { w: 1.0, d: 0.6, h: 1.0, name: "Carro de piezas del traje", reality: "real", source: G },
  "consola-ecs": { w: 1.5, d: 0.7, h: 1.4, name: "Panel del ECS (umbilicales del traje)", reality: "real", source: S.nblPodcast },
  botellas: { w: 2.0, d: 0.5, h: 1.5, name: "Botellas de buceo", reality: "real", source: S.nblPage, mounted: true },
  "puesto-buzos": { w: 1.8, d: 0.8, h: 0.95, name: "Puesto de los buzos de seguridad", reality: "real", source: S.nblPodcast },
  "camaras-buceo": { w: 1.6, d: 0.7, h: 0.95, name: "Puesto de los buzos de cámara", reality: "real", source: `${S.nblPodcast}; ${S.nblCranes}` },
  "grua-pluma": { w: 0.6, d: 0.6, h: 6, name: "Grúa de pluma de 1,6 t", reality: "real", source: S.nblCranes },
  "grua-puente": { w: 1.2, d: 1, h: 1.4, name: "Grúa puente de 10 t", reality: "real", source: S.nblCranes, solid: false, mounted: true },
  "carril-grua": { w: 1, d: 0.6, h: 0.5, name: "Carril de la grúa puente", reality: "real", source: S.nblCranes, solid: false, mounted: true },
  hiperbarica: { w: 7, d: 2.6, h: 2.6, name: "Cámara hiperbárica", reality: "real", source: `${S.nblCranes}; ${S.nblPage} (medidas de una cámara de dos esclusas corriente)`, solid: false },
  "maqueta-modulo": { w: 5.47, d: 4.57, h: 4.57, name: "Maqueta de módulo", reality: "real", source: S.nbl },
  "maqueta-viga": { w: 14, d: 3, h: 3, name: "Maqueta de la viga (truss)", reality: "real", source: `${S.nbl} (medidas nuestras, aproximadas)` },
  "maqueta-dragon": { w: 4, d: 4, h: 4.4, name: "Maqueta de Dragon", reality: "real", source: `${S.nbl}; ${S.dragon}` },
  "maqueta-cygnus": { w: 6.39, d: 3.07, h: 3.07, name: "Maqueta de Cygnus", reality: "real", source: `${S.nbl}; ${S.cygnus}` },
  "luz-techo": { w: 1.2, d: 0.3, h: 0.08, name: "Luz del techo", reality: "real", source: G, solid: false, mounted: true },
  barandilla: { w: 1, d: 0.06, h: 1.05, name: "Barandilla", reality: "real", source: S.ours, solid: false },
  "consola-fcr": { w: 2.2, d: 0.9, h: 1.25, name: "Consola", reality: "real", source: `${S.fcr1}; ${S.mccRestore}` },
  "silla-fcr": { w: 0.6, d: 0.6, h: 1.0, name: "Silla de consola", reality: "real", source: S.mccRestore },
  "pantallas-frente": { w: 1, d: 0.25, h: 4, name: "Pantallas del frente", reality: "real", source: S.mccRestore, solid: false, mounted: true },
  "consola-camara": { w: 2.4, d: 0.6, h: 1.3, name: "Panel de control de la cámara", reality: "real", source: S.altitudeChamber },
  "asiento-camara": { w: 0.6, d: 0.5, h: 1.5, name: "Asiento con su panel de O₂", reality: "real", source: S.altitudeChamber },
  cinta: { w: 0.9, d: 2.0, h: 1.45, name: "Cinta de correr", reality: "real", source: `${S.ascr}; ${G}` },
  bici: { w: 0.6, d: 1.2, h: 1.3, name: "Cicloergómetro", reality: "real", source: `${S.ascr}; ${G}` },
  jaula: { w: 1.4, d: 1.4, h: 2.3, name: "Jaula de sentadillas", reality: "real", source: `${S.ascr}; ${G}` },
  mancuernas: { w: 2.0, d: 0.6, h: 1.0, name: "Mancuernas", reality: "real", source: G, mounted: true },
  "banco-pesas": { w: 0.5, d: 1.3, h: 0.45, name: "Banco de pesas", reality: "real", source: G },
  remo: { w: 0.6, d: 2.4, h: 0.9, name: "Remo", reality: "real", source: G },
  polea: { w: 1.6, d: 1.2, h: 2.2, name: "Máquina de poleas", reality: "real", source: G, mounted: true },
  ared: { w: 1.8, d: 2.8, h: 2.3, name: "ARED de entrenamiento", reality: "real", source: S.ascr },
  espejo: { w: 1, d: 0.03, h: 1.8, name: "Espejo", reality: "real", source: G, solid: false, mounted: true },
  mets: { w: 2.2, d: 4.0, h: 2.0, name: "Simulador de amerizaje (METS)", reality: "real", source: `${S.mets} (medidas nuestras)` },
  balsa: { w: 2.0, d: 2.0, h: 0.5, name: "Balsa salvavidas", reality: "real", source: S.pensacola, solid: false },
  izado: { w: 0.4, d: 16, h: 0.4, name: "Izado de rescate (collar)", reality: "real", source: S.pensacola, solid: false, mounted: true },
  "silla-socorrista": { w: 0.9, d: 0.9, h: 2.0, name: "Silla del instructor", reality: "real", source: G },
  escalerilla: { w: 0.6, d: 0.3, h: 1.0, name: "Escalerilla", reality: "real", source: G, solid: false, mounted: true },
  chalecos: { w: 1.6, d: 0.5, h: 1.8, name: "Chalecos y cascos", reality: "real", source: S.pensacola, mounted: true },
  "luz-pista": { w: 0.25, d: 0.25, h: 0.12, name: "Luz verde del perímetro", reality: "real", source: S.heliport, solid: false },
  manga: { w: 0.3, d: 0.3, h: 6, name: "Manga de viento", reality: "real", source: S.heliport },
  foco: { w: 0.3, d: 0.3, h: 6, name: "Foco", reality: "real", source: S.heliport },
  surtidor: { w: 1.2, d: 0.8, h: 1.8, name: "Punto de repostaje", reality: "real", source: `${S.heliport} (sitio nuestro)` },
  extintor: { w: 0.35, d: 0.35, h: 1.0, name: "Extintor", reality: "real", source: S.heliport },
  "rotulo-suelo": { w: 4, d: 2, h: 0.01, name: "Marca pintada", reality: "real", source: S.heliport, solid: false },
  farola: { w: 0.25, d: 0.25, h: 7, name: "Farola", reality: "real", source: S.ours },
  "poste-senal": { w: 0.2, d: 0.2, h: 3, name: "Señal de caminos", reality: "real", source: S.ours },
  tussac: { w: 1.0, d: 1.0, h: 1.4, name: "Tussac", reality: "licencia", source: `${S.tussock} (sitio nuestro)` },
  "banco-exterior": { w: 1.8, d: 0.6, h: 0.8, name: "Banco", reality: "real", source: S.ours },
  papelera: { w: 0.45, d: 0.45, h: 0.9, name: "Papelera", reality: "real", source: S.ours },
  noray: { w: 0.35, d: 0.35, h: 0.6, name: "Noray", reality: "licencia", source: S.ours },
  salvavidas: { w: 0.8, d: 0.2, h: 1.6, name: "Aro salvavidas", reality: "licencia", source: S.ours },
  pilote: { w: 0.4, d: 0.4, h: 4, name: "Pilote", reality: "licencia", source: S.ours, solid: false },
  "rack-ispr": { w: 1.05, d: 0.86, h: 2.01, name: "Bastidor ISPR de entrenamiento", reality: "real", source: `${S.svmfPage}; ISPR 2,01 × 1,05 × 0,86 m` },
  trineo: { w: 1.5, d: 1.5, h: 1.2, name: "Trineo de cojinetes de aire", reality: "real", source: S.svmfPage },
  "banco-trabajo": { w: 2.0, d: 0.8, h: 0.9, name: "Banco de trabajo", reality: "real", source: G, mounted: true },
  "puerta-industrial": { w: 10, d: 0.2, h: 8, name: "Puerta industrial (norte)", reality: "real", source: S.svmfWiki, solid: false, mounted: true },
  "capsula-orion": { w: 5.02, d: 5.02, h: 3.3, name: "Maqueta de Orion", reality: "real", source: `${S.svmfPage}; ${S.orion}`, solid: false },
  escalon: { w: 1.2, d: 0.6, h: 0.3, name: "Escalón de acceso", reality: "real", source: S.ours, solid: false },
  techo: { w: 1, d: 1, h: 0.03, name: "Falso techo con luz", reality: "real", source: G, solid: false, mounted: true },
  vaso: { w: 1, d: 1, h: 1, name: "Vaso de la piscina (azulejo)", reality: "real", source: S.nbl, solid: false, mounted: true },
  cortina: { w: 2.6, d: 0.05, h: 2.2, name: "Cortina de la camilla", reality: "real", source: G, solid: false, mounted: true },
  tallimetro: { w: 0.3, d: 0.1, h: 2.1, name: "Tallímetro (estatura de 62 a 75 pulgadas)", reality: "real", source: S.training, mounted: true },
  "diagnostico-pared": { w: 0.7, d: 0.12, h: 0.45, name: "Tensiómetro y otoscopio de pared", reality: "real", source: G, solid: false, mounted: true },
  "carro-paradas": { w: 0.6, d: 0.5, h: 1.1, name: "Carro de paradas con desfibrilador", reality: "real", source: G },
  reloj: { w: 0.35, d: 0.05, h: 0.35, name: "Reloj", reality: "real", source: G, solid: false, mounted: true },
  pizarra: { w: 1.8, d: 0.04, h: 1.1, name: "Pizarra", reality: "real", source: G, solid: false, mounted: true },
  "tele-pared": { w: 1.2, d: 0.08, h: 0.7, name: "Pantalla de pared", reality: "real", source: G, solid: false, mounted: true },
  planta: { w: 0.5, d: 0.5, h: 1.2, name: "Planta", reality: "real", source: S.ours },
  discos: { w: 0.6, d: 0.6, h: 1.3, name: "Árbol de discos", reality: "real", source: G },
  "cajones-salto": { w: 0.8, d: 0.6, h: 0.75, name: "Cajones de salto", reality: "real", source: G },
  elevadora: { w: 1.2, d: 2.4, h: 2.2, name: "Plataforma elevadora", reality: "real", source: G },
  "carro-herramientas": { w: 0.9, d: 0.5, h: 1.0, name: "Carro de herramientas", reality: "real", source: G },
  "mesa-reunion": { w: 2.4, d: 1.1, h: 0.75, name: "Mesa de preparación de la sesión", reality: "real", source: S.ours },
};

/** A fixture's footprint on the plan (its box turned). */
export function footprint(f: Pick<PlacedFixture, "x" | "z" | "w" | "d" | "rot">): Rect {
  const across = f.rot % 2 === 1;
  const hx = (across ? f.d : f.w) / 2;
  const hz = (across ? f.w : f.d) / 2;
  return { x0: f.x - hx, x1: f.x + hx, z0: f.z - hz, z1: f.z + hz };
}

type Side = "n" | "s" | "e" | "w";
export interface Put {
  readonly k: FixtureKind;
  readonly x: number;
  readonly z: number;
  readonly y?: number;
  readonly rot?: 0 | 1 | 2 | 3;
  readonly w?: number;
  readonly d?: number;
  readonly h?: number;
  /** Against this wall of the room (or of compartment `in`), at any scale; `gap` m off it. */
  readonly snap?: Side;
  readonly in?: string;
  /** Snapped to the compartment's outer face instead of its inner one. */
  readonly outside?: boolean;
  readonly gap?: number;
  readonly solid?: boolean;
  readonly plate?: boolean;
  readonly name?: string;
  readonly color?: number;
  readonly area?: string;
  readonly n?: number;
  readonly text?: string;
  readonly plan?: number;
  readonly reality?: Reality;
  readonly source?: string;
}

const box = (x0: number, x1: number, z0: number, z1: number, y0: number, y1: number): Solid => ({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1 });

/** Put a fixture in the world (world coordinates already). */
export function put(sink: FurnishSink, area: string, p: Put & { wx: number; wz: number }): PlacedFixture {
  const c = CAT[p.k];
  const f: PlacedFixture = {
    kind: p.k,
    x: p.wx,
    y: p.y ?? 0,
    z: p.wz,
    w: p.w ?? c.w,
    d: p.d ?? c.d,
    h: p.h ?? c.h,
    rot: p.rot ?? 0,
    area: p.area ?? area,
    reality: p.reality ?? c.reality,
    source: p.source ?? c.source,
    name: p.name ?? c.name,
    solid: p.solid ?? c.solid ?? true,
    mounted: c.mounted ?? false,
    ...(p.plate ? { plate: true } : {}),
    ...(p.color !== undefined ? { color: p.color } : {}),
    ...(p.n !== undefined ? { n: p.n } : {}),
    ...(p.text !== undefined ? { text: p.text } : {}),
    ...(p.plan !== undefined ? { plan: p.plan } : {}),
  };
  const r = footprint(f);
  sink.fixture(f, f.solid ? [{ ...r, y0: f.y, y1: f.y + f.h }] : []);
  return f;
}

/** A room's furnishing helpers: local plan coordinates (as the room's data) to the world. */
export function roomKit(sink: FurnishSink, fr: RoomFrame) {
  const { k, centre: c, half } = fr;
  const P = (x: number, z: number) => ({ x: c.x + x * k, z: c.z + z * k });
  /** The inner face of a wall: the room's (0,4 m thick) or a compartment's (0,2 m thick). */
  const face = (side: Side, inId?: string, outside = false): number => {
    if (inId) {
      const cp = fr.compartments.find((q) => q.id === inId)!;
      const t = outside ? 0 : 0.2;
      return side === "n" ? cp.z + cp.hz - t : side === "s" ? cp.z - cp.hz + t : side === "e" ? cp.x + cp.hx - t : cp.x - cp.hx + t;
    }
    return side === "n" ? c.z + half.z - 0.4 : side === "s" ? c.z - half.z + 0.4 : side === "e" ? c.x + half.x - 0.4 : c.x - half.x + 0.4;
  };
  const at = (p: Put): PlacedFixture => {
    let { x: wx, z: wz } = P(p.x, p.z);
    if (p.snap) {
      const spec = CAT[p.k];
      const rot = p.rot ?? 0;
      const w = p.w ?? spec.w;
      const d = p.d ?? spec.d;
      const across = rot % 2 === 1;
      const hx = (across ? d : w) / 2;
      const hz = (across ? w : d) / 2;
      const g = (p.gap ?? 0) + 0.02;
      const out = p.outside ? -1 : 1;
      const f = face(p.snap, p.in, p.outside);
      if (p.snap === "n") wz = f - out * (hz + g);
      else if (p.snap === "s") wz = f + out * (hz + g);
      else if (p.snap === "e") wx = f - out * (hx + g);
      else wx = f + out * (hx + g);
    }
    return put(sink, fr.area, { ...p, wx, wz });
  };
  /** A slab or panel spanning local corners (stretched with the room). */
  const span = (p: { k?: FixtureKind; x0: number; x1: number; z0: number; z1: number; y0: number; y1: number; color?: number; solid?: boolean; name?: string; area?: string; source?: string; reality?: Reality; n?: number; rot?: 0 | 2 }): PlacedFixture => {
    const a = P(p.x0, p.z0);
    const b = P(p.x1, p.z1);
    return put(sink, fr.area, { k: p.k ?? "caja", x: 0, z: 0, wx: (a.x + b.x) / 2, wz: (a.z + b.z) / 2, y: p.y0, w: Math.abs(b.x - a.x), d: Math.abs(b.z - a.z), h: p.y1 - p.y0, ...(p.color !== undefined ? { color: p.color } : {}), ...(p.solid !== undefined ? { solid: p.solid } : {}), ...(p.name ? { name: p.name } : {}), ...(p.area ? { area: p.area } : {}), ...(p.source ? { source: p.source } : {}), ...(p.reality ? { reality: p.reality } : {}), ...(p.n !== undefined ? { n: p.n } : {}), ...(p.rot ? { rot: p.rot } : {}) });
  };
  /** A partition along a local line, with doorways (their middle scaled, their width true: her body's). */
  const partition = (axis: "x" | "z", at: number, from: number, to: number, y0: number, y1: number, gaps: readonly { at: number; w: number; y1?: number }[], color = 0xe9edf0, name = "Tabique", thick = 0.12) => {
    const A = axis === "x" ? c.z + at * k : c.x + at * k;
    const F = axis === "x" ? c.x + from * k : c.z + from * k;
    const T = axis === "x" ? c.x + to * k : c.z + to * k;
    const g = gaps.map((q) => {
      const m = axis === "x" ? c.x + q.at * k : c.z + q.at * k;
      return { from: m - q.w / 2, to: m + q.w / 2, ...(q.y1 !== undefined ? { y1: q.y1 } : {}) };
    });
    for (const s of wallWithGaps({ axis, at: A, from: F, to: T, y0, y1, thick, gaps: g })) put(sink, fr.area, { k: "caja", x: 0, z: 0, wx: (s.x0 + s.x1) / 2, wz: (s.z0 + s.z1) / 2, y: s.y0, w: s.x1 - s.x0, d: s.z1 - s.z0, h: s.y1 - s.y0, color, name, source: S.ours });
  };
  /** Ceiling lights in a grid over the room. */
  const lights = (nx: number, nz: number, y: number) => {
    span({ k: "techo", x0: -half.x / k + 0.4 / k, x1: half.x / k - 0.4 / k, z0: -half.z / k + 0.4 / k, z1: half.z / k - 0.4 / k, y0: fr.height - 0.06, y1: fr.height - 0.03, solid: false });
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = -half.x / k + ((i + 0.5) * (2 * half.x)) / k / nx;
        const z = -half.z / k + ((j + 0.5) * (2 * half.z)) / k / nz;
        at({ k: "luz-techo", x, z, y, w: 1.2, d: 0.3 });
      }
  };
  /** The pool's tiled basin under the water (drawn only: the water and the deck are the layout's). */
  const basin = () => {
    const q = fr.pool;
    if (!q) return;
    const hx = q.x / 2;
    const hz = q.z / 2;
    const t = 0.1 / k;
    span({ k: "vaso", x0: -hx, x1: hx, z0: -hz, z1: hz, y0: -q.depth - 0.1, y1: -q.depth, solid: false });
    span({ k: "vaso", x0: -hx - t, x1: -hx, z0: -hz, z1: hz, y0: -q.depth, y1: 0, solid: false });
    span({ k: "vaso", x0: hx, x1: hx + t, z0: -hz, z1: hz, y0: -q.depth, y1: 0, solid: false });
    span({ k: "vaso", x0: -hx, x1: hx, z0: -hz - t, z1: -hz, y0: -q.depth, y1: 0, solid: false });
    span({ k: "vaso", x0: -hx, x1: hx, z0: hz, z1: hz + t, y0: -q.depth, y1: 0, solid: false });
  };
  return { P, at, span, partition, lights, face, basin };
}

/** A straight stair (floors she climbs, a stringer under it that she cannot walk into, and its steps drawn). */
function stair(sink: FurnishSink, area: string, o: { x: number; z: number; dir: "+x" | "-x"; width: number; y0: number; y1: number }): { foot: { x: number; z: number }; top: { x: number; z: number } } {
  const rise = 0.18;
  const tread = 0.28;
  const n = Math.ceil((o.y1 - o.y0) / rise - 1e-9);
  const s = o.dir === "+x" ? 1 : -1;
  const z0 = o.z - o.width / 2;
  const z1 = o.z + o.width / 2;
  for (let i = 1; i <= n; i++) {
    const y = Math.min(o.y1, o.y0 + i * rise);
    const a = o.x + s * (i - 1) * tread;
    const b = o.x + s * i * tread;
    const r = { x0: Math.min(a, b), x1: Math.max(a, b), z0, z1 };
    sink.floor(area, y, r);
    // Under the steps she cannot walk in (where it is too low for her); on them nothing stops her.
    const under = y - 0.6;
    put(sink, area, { k: "caja", x: 0, z: 0, wx: (r.x0 + r.x1) / 2, wz: o.z, y: o.y0, w: tread, d: o.width, h: y - o.y0 - 0.02, color: 0x6c737a, name: "Escalera", source: S.ours, solid: false });
    if (under > o.y0 + 0.05) sink.solid({ ...r, y0: o.y0, y1: under });
  }
  const end = o.x + s * n * tread;
  return { foot: { x: o.x - s * 0.8, z: o.z }, top: { x: end + s * 0.9, z: o.z } };
}

// ── The rooms ──

function nbl(sink: FurnishSink, fr: RoomFrame): void {
  const { P, at, span, partition, lights, face, basin } = roomKit(sink, fr);
  const k = fr.k;
  const A = fr.area;
  // Overhead: two 10 t bridge cranes on rails along the long walls, four 1,6 t jib cranes round the pool (FS-NBL-508c).
  for (const z of [face("s") + 0.3, face("n") - 0.3]) span({ k: "carril-grua", x0: -fr.half.x / k + 0.5, x1: fr.half.x / k - 0.5, z0: (z - fr.centre.z) / k - 0.3 / k, z1: (z - fr.centre.z) / k + 0.3 / k, y0: 14.6, y1: 15.1, solid: false, name: "Carril de la grúa puente" });
  for (const x of [-20, 20]) span({ k: "grua-puente", x0: x - 0.6 / k, x1: x + 0.6 / k, z0: -fr.half.z / k + 0.6, z1: fr.half.z / k - 0.6, y0: 15.1, y1: 16.5, solid: false, name: "Grúa puente de 10 t" });
  for (const [x, z, r] of [[-23.5, -16.5, 0], [23.5, -16.5, 0], [-23.5, 16.6, 2], [23.5, 16.6, 2]] as const) at({ k: "grua-pluma", x, z, rot: r, plate: x < 0 && z < 0 });
  // The ISS on the bottom with Dragon and Cygnus (Wikipedia, NBL): the lab (layout.ts) with Unity and Quest at its ends, a truss segment.
  const bottom = -12;
  at({ k: "maqueta-modulo", x: 8.6, z: 0, y: bottom, name: "Maqueta de Unity (nodo 1)", source: `${S.nbl}; ${S.unity}`, plate: false });
  at({ k: "maqueta-modulo", x: -8.6, z: 0, y: bottom, w: 5.5, d: 4.0, h: 4.0, name: "Maqueta de Quest (esclusa)", source: `${S.nbl}; ${S.quest}` });
  at({ k: "maqueta-viga", x: -1, z: 10, y: bottom });
  at({ k: "maqueta-dragon", x: -22, z: 6, y: bottom });
  at({ k: "maqueta-cygnus", x: 22, z: 6, y: bottom });
  at({ k: "maqueta-modulo", x: 15, z: -8, y: bottom, w: 6.9, d: 4.5, h: 4.5, name: "Maqueta de Columbus", source: `${S.nbl}; ${S.columbus}` });
  at({ k: "maqueta-modulo", x: -20, z: -8, y: bottom, w: 11.2, d: 4.4, h: 4.4, name: "Maqueta de Kibo", source: `${S.nbl}; ${S.kibo}` });
  basin();
  at({ k: "pizarra", x: 34, z: 0, snap: "s", y: 1.0, name: "Plan de la inmersión" });
  at({ k: "reloj", x: 0, z: 0, snap: "s", y: 3.4 });
  // The suit-up area by the south-west jib crane: two donning stands with the EMU, the parts carts, the ECS panel.
  at({ k: "soporte-emu", x: -20.5, z: -18.6, rot: 2, plate: true });
  at({ k: "soporte-emu", x: -26.5, z: -18.6, rot: 2 });
  at({ k: "carro-traje", x: -31, z: -18.8 });
  at({ k: "consola-ecs", x: -34.5, z: -18.6, rot: 2, plate: true });
  at({ k: "botellas", x: -16, z: 0, snap: "s", name: "Botellas de aire del traje", source: S.nblPodcast });
  at({ k: "banco-trabajo", x: -30, z: 0, snap: "s", name: "Banco del laboratorio de trajes" });
  at({ k: "armario", x: -25, z: 0, snap: "s", name: "Armario de guantes y cascos" });
  at({ k: "estanteria", x: -40.5, z: -20, snap: "w", rot: 1, name: "Repuestos del EMU" });
  // The pool deck's video monitors (the run is watched from the deck too).
  at({ k: "monitor-carro", x: -17, z: -19.4, rot: 2 });
  at({ k: "monitor-carro", x: 18, z: -19.4, rot: 2, plate: true });
  // The divers: each suited subject has two safety divers, a utility diver and a camera diver.
  at({ k: "puesto-buzos", x: 24, z: -19.2, rot: 2, plate: true });
  at({ k: "camaras-buceo", x: 30, z: -19.2, rot: 2, plate: true });
  for (const z of [-12, -6, 0, 6]) at({ k: "botellas", x: 0, z, snap: "e", rot: 3 });
  at({ k: "estanteria", x: 0, z: 11.5, snap: "e", rot: 3, name: "Aletas, chalecos y reguladores" });
  for (let i = 0; i < 3; i++) at({ k: "banco", x: 22 + i * 4, z: 0, snap: "s", gap: 0.1 });
  // Lockers under the control room.
  for (let i = 0; i < 6; i++) at({ k: "taquillas", x: -6 + i * 3.1, z: 0, snap: "n", rot: 2, w: 0.38 * 7, n: 7, name: "Taquillas de los buzos" });
  // The control room upstairs, overlooking the pool through its windows (podcast): video, test director and ECS,
  // and the test controller's room next door. A mezzanine at 4,5 m (its height is ours) reached by a stair.
  const M = 4.5;
  const mz0 = 21;
  const mx0 = -10;
  const mx1 = 14;
  const mid = 4;
  const north = (face("n") - fr.centre.z) / k;
  const mA = "entrenamiento:nbl-control";
  const deck = { x0: P(mx0, 0).x, x1: P(mx1, 0).x, z0: P(0, mz0).z, z1: face("n") };
  sink.floor(mA, M, deck);
  span({ x0: mx0, x1: mx1, z0: mz0, z1: north, y0: M - 0.3, y1: M - 0.01, color: 0x9aa3ab, solid: false, name: "Forjado de la sala de control" });
  span({ x0: mx0, x1: mx1, z0: mz0, z1: north, y0: M + 3.2, y1: M + 3.4, color: 0xb9c0c7, solid: false, name: "Techo de la sala de control" });
  for (const x of [mx0, (mx0 + mid) / 2, mid, mx1]) {
    const p = P(x, mz0);
    put(sink, A, { k: "caja", x: 0, z: 0, wx: p.x + (x === mx0 ? 0.2 : x === mx1 ? -0.2 : 0), wz: p.z + 0.2, y: 0, w: 0.4, d: 0.4, h: M - 0.3, color: 0x8c949b, name: "Pilar" });
  }
  // Its walls: the windows on the pool side over a parapet, the end walls, the partition with its door.
  span({ x0: mx0, x1: mx1, z0: mz0, z1: mz0 + 0.15 / k, y0: M, y1: M + 1.0, color: 0xd9dde2, name: "Antepecho" });
  span({ k: "vidrio", x0: mx0, x1: mx1, z0: mz0 + 0.05 / k, z1: mz0 + 0.1 / k, y0: M + 1.0, y1: M + 3.2, solid: false, name: "Ventanas sobre la piscina", source: S.nblPodcast, n: 12 });
  const stairZ = (face("n") - 0.85 - fr.centre.z) / k;
  partition("z", mx0, mz0 + 0.15 / k, north, M, M + 3.2, [{ at: stairZ, w: 1.0, y1: M + 2.2 }], 0xd9dde2, "Pared de la sala de control");
  partition("z", mx1, mz0 + 0.15 / k, north, M, M + 3.2, [], 0xd9dde2, "Pared de la sala de control");
  partition("z", mid, mz0 + 0.15 / k, north, M, M + 3.2, [{ at: stairZ, w: 0.9, y1: M + 2.1 }], 0xd9dde2, "Tabique entre las dos salas");
  // The control room's three positions at the windows, and the test controller's next door.
  const winZ = P(0, mz0).z + 0.15;
  for (const [x, name] of [[-7, "Puesto de vídeo"], [-3.5, "Director de la prueba"], [0, "Operador del ECS"]] as const) {
    const p = P(x, 0);
    put(sink, mA, { k: "consola-fcr", x: 0, z: 0, wx: p.x, wz: winZ + 0.47, y: M, w: 1.8, rot: 0, name, source: S.nblPodcast, plate: true, area: mA });
    put(sink, mA, { k: "silla-fcr", x: 0, z: 0, wx: p.x, wz: winZ + 1.5, y: M, area: mA, rot: 2 });
  }
  const tc = P(9, 0);
  put(sink, mA, { k: "consola-fcr", x: 0, z: 0, wx: tc.x, wz: winZ + 0.47, y: M, w: 2.2, rot: 0, name: "Controlador de la prueba", source: S.nblPodcast, plate: true, area: mA });
  put(sink, mA, { k: "silla-fcr", x: 0, z: 0, wx: tc.x, wz: winZ + 1.5, y: M, area: mA, rot: 2 });
  put(sink, mA, { k: "pantallas-frente", x: 0, z: 0, wx: P(-3.5, 0).x, wz: face("n") - 0.15, y: M + 1.0, w: 6, h: 1.6, rot: 2, n: 4, name: "Vídeo de los buzos de cámara", source: S.nblPodcast, area: mA });
  const st = stair(sink, A, { x: P(mx0, 0).x - Math.ceil(M / 0.18 - 1e-9) * 0.28, z: P(0, stairZ).z, dir: "+x", width: 1.4, y0: 0, y1: M });
  span({ k: "barandilla", x0: (st.foot.x + 0.8 - fr.centre.x) / k, x1: mx0, z0: stairZ - 0.75 / k, z1: stairZ - 0.69 / k, y0: 0.9, y1: M + 1.0, solid: false, name: "Barandilla de la escalera" });
  // Way points: round the pool by the west deck to the stair, up, through both rooms; round the east deck to the chamber.
  const p = (id: string, x: number, y: number, z: number) => sink.point(`${A}:${id}`, x, y, z);
  const sw = P(-37, -24);
  const nw = P(-37, 23.5);
  const a = p("oeste-sur", sw.x, 0, sw.z);
  const b = p("oeste-norte", nw.x, 0, nw.z);
  const foot = p("escalera-pie", st.foot.x, 0, st.foot.z);
  const top = sink.point(`${mA}:escalera`, st.top.x, M, st.top.z);
  const cr = P(-3.5, 0);
  const croom = sink.point(`${mA}:centro`, cr.x, M, st.top.z);
  const troom = sink.point(`${mA}:controlador`, tc.x, M, st.top.z);
  sink.link(fr.inside, a, b, foot, top, croom, troom);
  sink.area({ id: mA, island: "entrenamiento", label: "Sala de control de la NBL", desc: "En el piso alto, con ventanas sobre la piscina: los puestos de vídeo, del director de la prueba y del ECS que alimenta los trajes, y al lado la sala del controlador de la prueba", reality: "real", centre: { x: (deck.x0 + deck.x1) / 2, y: M + 1.6, z: (deck.z0 + deck.z1) / 2 }, half: { x: (deck.x1 - deck.x0) / 2, y: 1.6, z: (deck.z1 - deck.z0) / 2 }, point: croom });
  // The hyperbaric chamber in the north-east corner (on site at the NBL; its place in our hall is ours).
  const hc = { x: face("e") - 0.8 - 3.5, z: P(0, 22).z };
  hyperbaric(sink, A, hc);
  const se = P(37, -24);
  const ne = P(37, 18);
  const c1 = p("este-sur", se.x, 0, se.z);
  const c2 = p("este-norte", ne.x, 0, ne.z);
  const c3 = p("camara-fuera", hc.x - 3.5 - 1.3, 0, ne.z);
  const c4 = p("camara-puerta", hc.x - 3.5 - 1.3, 0, hc.z);
  const hA = "entrenamiento:nbl-hiperbarica";
  const c5 = sink.point(`${hA}:centro`, hc.x + 1.4, 0.5, hc.z);
  sink.link(fr.inside, c1, c2, c3, c4, c5);
  sink.area({ id: hA, island: "entrenamiento", label: "Cámara hiperbárica (NBL)", desc: "La cámara de dos esclusas para tratar a buzos y astronautas con enfermedad descompresiva: se entra por la esclusa pequeña", reality: "real", centre: { x: hc.x, y: 1.3, z: hc.z }, half: { x: 3.5, y: 1.3, z: 1.3 }, point: c5 });
  lights(6, 4, fr.height - 0.4);
}

/** A double-lock hyperbaric chamber along x (door at its −x end), walkable inside on its grating. */
function hyperbaric(sink: FurnishSink, area: string, c: { x: number; z: number }): void {
  const L = 7;
  const R = 1.3;
  const hA = "entrenamiento:nbl-hiperbarica";
  put(sink, area, { k: "hiperbarica", x: 0, z: 0, wx: c.x, wz: c.z, plate: true });
  const x0 = c.x - L / 2;
  const x1 = c.x + L / 2;
  sink.floor(hA, 0.5, { x0: x0 - 0.6, x1: x1 - 0.3, z0: c.z - 0.6, z1: c.z + 0.6 });
  // Its shell as solids: the long sides, the far end, the near end round the door, and the lock's inner door.
  sink.solid(box(x0, x1, c.z + 0.75, c.z + R, 0, 2 * R));
  sink.solid(box(x0, x1, c.z - R, c.z - 0.75, 0, 2 * R));
  sink.solid(box(x1 - 0.3, x1, c.z - R, c.z + R, 0, 2 * R));
  for (const s of wallWithGaps({ axis: "z", at: x0 + 0.1, from: c.z - 0.75, to: c.z + 0.75, y0: 0, y1: 2 * R, thick: 0.2, gaps: [{ from: c.z - 0.45, to: c.z + 0.45, y1: 2.45 }] })) sink.solid(s);
  for (const s of wallWithGaps({ axis: "z", at: x0 + 2.4, from: c.z - 0.75, to: c.z + 0.75, y0: 0, y1: 2 * R, thick: 0.1, gaps: [{ from: c.z - 0.45, to: c.z + 0.45, y1: 2.45 }] })) sink.solid(s);
  // Its benches along both sides inside (drawn by the chamber's model).
  sink.walkCheck({ id: "nbl: dentro de la cámara hiperbárica", pts: [{ x: x0 - 1.3, y: 0, z: c.z }, { x: x0 + 1.2, y: 0.5, z: c.z }, { x: c.x + 1.4, y: 0.5, z: c.z }] });
}

/** An access step at a compartment's hatch, half its floor's height. */
function hatchStep(sink: FurnishSink, fr: RoomFrame, id: string, side: "w" | "e"): void {
  const cp = fr.compartments.find((q) => q.id === id)!;
  const hx = side === "e" ? cp.x + cp.hx : cp.x - cp.hx;
  const s = side === "e" ? 1 : -1;
  const x = hx + s * 0.9;
  const y = cp.floorY / 2;
  sink.floor(fr.area, y, { x0: x - 0.3, x1: x + 0.3, z0: cp.z - 0.6, z1: cp.z + 0.6 });
  put(sink, fr.area, { k: "escalon", x: 0, z: 0, wx: x, wz: cp.z, h: y, rot: side === "e" ? 1 : 3, w: 1.2, d: 0.6 });
}

function svmf(sink: FurnishSink, fr: RoomFrame): void {
  const { P, at, span, lights, face } = roomKit(sink, fr);
  const k = fr.k;
  const A = fr.area;
  // The overhead crane that sets the mock-ups in place (Wikipedia, SVMF), and the industrial door of the north end.
  span({ k: "carril-grua", x0: -fr.half.x / k + 0.5, x1: fr.half.x / k - 0.5, z0: (face("s") + 0.3 - fr.centre.z) / k - 0.3 / k, z1: (face("s") + 0.3 - fr.centre.z) / k + 0.3 / k, y0: 12.8, y1: 13.3, solid: false });
  span({ k: "carril-grua", x0: -fr.half.x / k + 0.5, x1: fr.half.x / k - 0.5, z0: (face("n") - 0.3 - fr.centre.z) / k - 0.3 / k, z1: (face("n") - 0.3 - fr.centre.z) / k + 0.3 / k, y0: 12.8, y1: 13.3, solid: false });
  span({ k: "grua-puente", x0: 4 - 0.6 / k, x1: 4 + 0.6 / k, z0: -fr.half.z / k + 0.6, z1: fr.half.z / k - 0.6, y0: 13.3, y1: 14.7, solid: false, name: "Grúa puente" });
  at({ k: "puerta-industrial", x: 20, z: 0, snap: "n", rot: 2, plate: true });
  // Access steps at each mock-up's hatch, and their stands.
  const step = (id: string, side: "w" | "e") => hatchStep(sink, fr, id, side);
  step("svmf-destiny", "e");
  step("svmf-orion", "w");
  const orion = fr.compartments.find((q) => q.id === "svmf-orion")!;
  put(sink, A, { k: "capsula-orion", x: 0, z: 0, wx: orion.x, wz: orion.z, plan: k, plate: true });
  // A work platform along Destiny's north side, with its stair (the mock-ups are worked on from platforms).
  const destiny = fr.compartments.find((q) => q.id === "svmf-destiny")!;
  const pz = destiny.z + destiny.hz + 0.3 + 0.7;
  const px0 = destiny.x - 4;
  const px1 = destiny.x + 2.2;
  const PY = 1.2;
  sink.floor(A, PY, { x0: px0, x1: px1, z0: pz - 0.7, z1: pz + 0.7 });
  put(sink, A, { k: "caja", x: 0, z: 0, wx: (px0 + px1) / 2, wz: pz, y: 0, w: px1 - px0, d: 1.4, h: PY - 0.02, color: 0x8a8f96, name: "Plataforma de trabajo", source: S.ours, solid: false });
  sink.solid(box(px0, px1, pz - 0.7, pz + 0.7, 0, PY - 0.6));
  put(sink, A, { k: "barandilla", x: 0, z: 0, wx: (px0 + px1) / 2, wz: pz + 0.68, y: PY, w: px1 - px0, rot: 0 });
  // The stair down from the platform's east end: steps of 0,2 m to the floor.
  for (let i = 1; i <= 5; i++) {
    const y = PY - i * 0.2;
    const x0 = px1 + (i - 1) * 0.28;
    sink.floor(A, y, { x0, x1: x0 + 0.28, z0: pz - 0.6, z1: pz + 0.6 });
    put(sink, A, { k: "caja", x: 0, z: 0, wx: x0 + 0.14, wz: pz, y: 0, w: 0.28, d: 1.2, h: y - 0.02, color: 0x6c737a, name: "Escalera de la plataforma", source: S.ours, solid: false });
  }
  sink.walkCheck({ id: "svmf: plataforma de Destiny", pts: [P(-3, 8), { x: px1 + 2.2, z: pz }, { x: px0 + 0.8, z: pz }].map((q, i) => ({ x: q.x, y: i === 2 ? PY : 0, z: q.z })) });
  // The precision air-bearing floor with a sled, and the part-task trainers and racks (NASA, SVMF).
  span({ k: "pavimento", x0: -27, x1: -16, z0: -16.5, z1: -6, y0: 0.0, y1: 0.03, color: 0xd8dfe6, name: "Suelo de cojinetes de aire (PABF)", source: S.svmfPage });
  at({ k: "trineo", x: -21.5, z: -11.2, plate: true });
  // Node 1 and the Joint Airlock, two more of the ISS mock-ups NASA lists in the SVMF (whole-shell trainers, not entered here).
  at({ k: "maqueta-modulo", x: -7.5, z: -11, name: "Maqueta de Unity (nodo 1)", source: `${S.svmfPage}; ${S.unity}`, plate: true });
  at({ k: "maqueta-modulo", x: 7, z: -11, w: 5.5, d: 4.0, h: 4.0, name: "Maqueta de Quest (esclusa conjunta)", source: `${S.svmfPage}; ${S.quest}`, plate: true });
  for (let i = 0; i < 5; i++) at({ k: "rack-ispr", x: 0, z: 4 + i * 1.12, snap: "w", rot: 1, plate: i === 2 });
  for (let i = 0; i < 4; i++) at({ k: "banco-trabajo", x: -4 + i * 3, z: 0, snap: "s" });
  for (let i = 0; i < 2; i++) at({ k: "armario", x: 9 + i * 1.3, z: 0, snap: "s", name: "Armario de herramientas" });
  at({ k: "elevadora", x: 24, z: 6 });
  at({ k: "carro-herramientas", x: 21.5, z: 9 });
  at({ k: "carro-herramientas", x: -20, z: -3, rot: 1 });
  at({ k: "mesa-reunion", x: -20, z: 12 });
  for (const [dx, dz, r] of [[-0.6, -0.85, 0], [0.6, -0.85, 0], [-0.6, 0.85, 2], [0.6, 0.85, 2]] as const) {
    const q = P(-20, 12);
    put(sink, A, { k: "silla", x: 0, z: 0, wx: q.x + dx, wz: q.z + dz * 1.0, rot: r });
  }
  lights(6, 3, fr.height - 0.4);
}

function control(sink: FurnishSink, fr: RoomFrame): void {
  const { P, at, span, lights, face } = roomKit(sink, fr);
  const k = fr.k;
  const A = fr.area;
  // Four rows of four consoles, the front two lower: the «trench» and the second row (NSF 2006; MOCR rows).
  const rows = [
    { z: -5, y: 0, name: "Cuarta fila" },
    { z: -1, y: 0, name: "Tercera fila" },
    { z: 3, y: -0.3, name: "Segunda fila" },
    { z: 6.4, y: -0.6, name: "Trinchera (primera fila)" },
  ];
  const edge2 = 0.7;
  const edge1 = 4.7;
  const x0 = -fr.half.x / k + 0.4 / k;
  const x1 = fr.half.x / k - 0.4 / k;
  const zN = (face("n") - fr.centre.z) / k;
  const hole = { x0: P(x0, 0).x, x1: P(x1, 0).x, z0: P(0, edge2).z, z1: face("n") };
  sink.cut(A, 0, hole);
  sink.floor(A, -0.3, { ...hole, z1: P(0, edge1).z });
  sink.floor(A, -0.6, { ...hole, z0: P(0, edge1).z });
  // The risers, and the railing along each step with the aisles at both ends open.
  span({ x0, x1, z0: edge2, z1: edge2 + 0.02 / k, y0: -0.3, y1: 0, color: 0x6b5a48, solid: false, name: "Escalón de la fila" });
  span({ x0, x1, z0: edge1, z1: edge1 + 0.02 / k, y0: -0.6, y1: -0.3, color: 0x6b5a48, solid: false, name: "Escalón de la fila" });
  for (const [e, y] of [[edge2, 0], [edge1, -0.3]] as const) span({ k: "barandilla", x0: -9.6, x1: 9.6, z0: e - 0.1 / k, z1: e - 0.04 / k, y0: y, y1: y + 0.9, solid: true, name: "Barandilla de madera de la fila", source: S.fcr1 });
  // The consoles (each with its CRTs and keyboard) and their chairs; none where the posts' machines stand.
  const labels: Record<string, string> = { "-2.5,-1": "FLIGHT", "-7.5,3": "CAPCOM" };
  for (const r of rows)
    for (const x of [-7.5, -2.5, 2.5, 7.5]) {
      const p = P(x, r.z);
      const lab = labels[`${x},${r.z}`];
      put(sink, A, { k: "consola-fcr", x: 0, z: 0, wx: p.x, wz: p.z, y: r.y, rot: 2, ...(lab ? { name: `Consola ${lab}`, plate: true, text: lab } : { name: `Consola (${r.name})` }) });
      const free = sink.machines.some((m) => Math.hypot(m.x - p.x, m.z - (p.z - 1.1)) < 1.2);
      if (!free) put(sink, A, { k: "silla-fcr", x: 0, z: 0, wx: p.x, wz: p.z - 1.15, y: r.y });
    }
  // The front: five big rear-projection screens across the room and nine small ones above (clocks and numbers).
  span({ k: "pantallas-frente", x0: x0 + 0.2, x1: x1 - 0.2, z0: zN - 0.25 / k, z1: zN, y0: 0.6, y1: 4.9, solid: false, n: 5, rot: 2, name: "Las cinco pantallas grandes y las nueve pequeñas" });
  lights(4, 3, fr.height - 0.3);
}

function medical(sink: FurnishSink, fr: RoomFrame): void {
  const { P, at, span, partition, lights } = roomKit(sink, fr);
  const A = fr.area;
  const H = 2.7;
  // The two consulting rooms on the west (audiometry, ultrasound), off the main examination room.
  const inX = (fr.half.x - 0.4) / fr.k;
  const inZ = (fr.half.z - 0.4) / fr.k;
  partition("z", -12.5, -inZ, inZ, 0, H, [{ at: 4.6, w: 1.0, y1: 2.1 }, { at: -5, w: 1.0, y1: 2.1 }]);
  partition("x", 0.5, -inX, -12.5 - 0.06 / fr.k, 0, H, []);
  // The audiometry booth (a sound-proof room of its own) and the audiometer outside its window.
  const bc = P(-17.2, 5.6);
  const bw = 2.2;
  const bx0 = bc.x - bw / 2;
  const bx1 = bc.x + bw / 2;
  const bz0 = bc.z - bw / 2;
  const bz1 = bc.z + bw / 2;
  const panel = (s: Solid, name: string, color = 0xc9cfd4) => put(sink, A, { k: "caja", x: 0, z: 0, wx: (s.x0 + s.x1) / 2, wz: (s.z0 + s.z1) / 2, y: s.y0, w: s.x1 - s.x0, d: s.z1 - s.z0, h: s.y1 - s.y0, color, name, source: `${S.training}; ${G}` });
  for (const s of [
    ...wallWithGaps({ axis: "x", at: bz1 - 0.05, from: bx0, to: bx1, y0: 0, y1: 2.1, thick: 0.1 }),
    ...wallWithGaps({ axis: "x", at: bz0 + 0.05, from: bx0, to: bx1, y0: 0, y1: 2.1, thick: 0.1 }),
    ...wallWithGaps({ axis: "z", at: bx0 + 0.05, from: bz0 + 0.1, to: bz1 - 0.1, y0: 0, y1: 2.1, thick: 0.1 }),
    ...wallWithGaps({ axis: "z", at: bx1 - 0.05, from: bz0 + 0.1, to: bz1 - 0.1, y0: 0, y1: 2.1, thick: 0.1, gaps: [{ from: bc.z - 0.45, to: bc.z + 0.45, y1: 1.95 }] }),
  ])
    panel(s, "Cabina de audiometría");
  put(sink, A, { k: "caja", x: 0, z: 0, wx: bc.x, wz: bc.z, y: 2.1, w: bw, d: bw, h: 0.1, color: 0xc9cfd4, solid: false, name: "Techo de la cabina", plate: true, text: "Cabina de audiometría" });
  put(sink, A, { k: "vidrio", x: 0, z: 0, wx: bc.x, wz: bz0 - 0.03, y: 1.0, w: 0.8, h: 0.6, name: "Ventanilla de la cabina" });
  put(sink, A, { k: "silla", x: 0, z: 0, wx: bx0 + 0.42, wz: bc.z, rot: 1 });
  at({ k: "audiometro", x: -16.2, z: 1.3, plate: true });
  at({ k: "silla", x: -16.2, z: 2.1, rot: 2 });
  sink.walkCheck({ id: "médico: dentro de la cabina de audiometría", pts: [P(0, 4.6), P(-6, 4.6), P(-11.2, 4.6), P(-14.5, 4.6), { x: bx1 + 0.7, z: bc.z }, { x: bx1 - 0.6, z: bc.z }].map((q) => ({ x: q.x, y: 0, z: q.z })) });
  // The ultrasound room: its table, the ultrasound beside it, the sink and the cupboard.
  at({ k: "camilla-exam", x: -17.2, z: -5, rot: 1 });
  at({ k: "ecografo", x: -17.2, z: -6.6, rot: 0, plate: true });
  at({ k: "lavabo", x: -14.6, z: 0, snap: "s" });
  at({ k: "armario", x: -18.6, z: 0, snap: "s", name: "Armario de material médico" });
  sink.walkCheck({ id: "médico: consulta de ecografía", pts: [P(0, 4.6), P(-6, 4.6), P(-6, -5), P(-11.2, -5), P(-14.2, -5)].map((q) => ({ x: q.x, y: 0, z: q.z })) });
  // The main examination room (post 2's couch, scale and the Snellen chart at 6,1 m): the ECG at the couch, a sink, the doctor's desk.
  at({ k: "ecg", x: -3.9, z: 3.5, rot: 1, plate: true });
  at({ k: "lavabo", x: -6.5, z: 0, snap: "s" });
  at({ k: "mesa", x: -10, z: 0, snap: "s", gap: 0.05, name: "Mesa de la doctora" });
  at({ k: "armario", x: -4.5, z: 0, snap: "s", name: "Armario de material médico" });
  // The waiting area by the door, the reception and the records.
  for (let i = 0; i < 6; i++) at({ k: "silla", x: 4.6 + i * 0.6, z: 0, snap: "n", rot: 2 });
  for (let i = 0; i < 6; i++) at({ k: "silla", x: 4.6 + i * 0.6, z: 6.4, rot: 0 });
  at({ k: "mesa", x: 6.1, z: 7.6, w: 1.2, d: 0.5, h: 0.45, name: "Mesa baja de la sala de espera", source: G });
  at({ k: "mostrador", x: 14.5, z: 6.4, rot: 3, plate: true, name: "Recepción y archivo de historiales" });
  at({ k: "silla", x: 15.6, z: 6.4, rot: 3 });
  for (let i = 0; i < 6; i++) at({ k: "archivador", x: 0, z: -7.8 + i * 0.55, snap: "e", rot: 3 });
  for (let i = 0; i < 4; i++) at({ k: "estanteria", x: 13.2 + i * 1.1, z: 0, snap: "s", name: "Estantería del archivo" });
  at({ k: "mesa", x: 15, z: -4.2, rot: 0, name: "Mesa del archivo" });
  at({ k: "fuente", x: 0, z: 2.6, snap: "e", rot: 3 });
  at({ k: "cortina", x: -2, z: 4.0, y: 0.2 });
  at({ k: "tallimetro", x: -3.6, z: 0, snap: "s" });
  at({ k: "diagnostico-pared", x: -8.2, z: 0, snap: "s", y: 1.2 });
  at({ k: "carro-paradas", x: -9.5, z: -7.4 });
  at({ k: "reloj", x: -6, z: 0, snap: "n", rot: 2, y: 2.2 });
  at({ k: "tele-pared", x: 6, z: 0, snap: "n", rot: 2, y: 1.6, name: "Pantalla de turnos" });
  at({ k: "planta", x: 11, z: 8.7 });
  // The hypobaric chamber (layout.ts's compartment): its airlock outside the hatch, the seats along both long walls,
  // each with its O₂ panel, the window, and outside the operators' panel with their high chairs and the red dump lever.
  const ch = fr.compartments.find((q) => q.id === "medico-hipobarica")!;
  const ax0 = P(3, 0).x;
  const ax1 = ch.x - ch.hx;
  const steel = 0x9ea7ad;
  for (const s of [
    ...wallWithGaps({ axis: "x", at: P(0, -2).z, from: ax0, to: ax1, y0: 0, y1: 2.4, thick: 0.2 }),
    ...wallWithGaps({ axis: "x", at: P(0, 0).z, from: ax0, to: ax1, y0: 0, y1: 2.4, thick: 0.2 }),
    ...wallWithGaps({ axis: "z", at: ax0 + 0.1, from: P(0, -2).z + 0.1, to: P(0, 0).z - 0.1, y0: 0, y1: 2.4, thick: 0.2, gaps: [{ from: ch.z - 0.5, to: ch.z + 0.5, y1: 2.0 }] }),
  ])
    panel(s, "Esclusa de la cámara hipobárica", steel);
  put(sink, A, { k: "caja", x: 0, z: 0, wx: (ax0 + ax1) / 2, wz: ch.z, y: 2.4, w: ax1 - ax0, d: P(0, 0).z - P(0, -2).z, h: 0.12, color: steel, solid: false, name: "Esclusa de la cámara hipobárica", source: S.altitudeChamber, plate: true, text: "Esclusa" });
  for (let i = 0; i < 4; i++) {
    at({ k: "asiento-camara", x: 6.9 + i * 0.7, z: 0, snap: "n", in: ch.id, rot: 2, y: ch.floorY, area: `entrenamiento:${ch.id}` });
    at({ k: "asiento-camara", x: 6.9 + i * 0.7, z: 0, snap: "s", in: ch.id, rot: 0, y: ch.floorY, area: `entrenamiento:${ch.id}` });
  }
  put(sink, A, { k: "vidrio", x: 0, z: 0, wx: P(8, 0).x, wz: ch.z + ch.hz + 0.03, y: 1.1, w: 1.2, h: 0.6, name: "Ventana reforzada de la cámara", source: S.altitudeChamber });
  at({ k: "consola-camara", x: 8, z: 0, snap: "n", in: ch.id, outside: true, gap: 0.05, rot: 0, plate: true });
  for (const dx of [-0.8, 0, 0.8]) at({ k: "silla-alta", x: 8 + dx / fr.k, z: 0, snap: "n", in: ch.id, outside: true, gap: 0.9, rot: 2 });
  sink.walkCheck({ id: "médico: por la esclusa hasta los asientos de la cámara", pts: [P(0, 4.6), P(2.5, 4.6), P(2.5, -1), P(3.6, -1), { x: ch.x - ch.hx + 0.8, z: ch.z }, { x: ch.x, z: ch.z }].map((q, i) => ({ x: q.x, y: i >= 4 ? ch.floorY : 0, z: q.z })) });
  lights(5, 3, fr.height - 0.1);
  void span;
}

function gym(sink: FurnishSink, fr: RoomFrame): void {
  const { at, span, lights } = roomKit(sink, fr);
  // Cardio along the north wall (treadmills, cycle ergometers), strength to the south (racks, bench, dumbbells,
  // cables), the rower, the ground ARED trainer, the floor mat, the lockers and benches by the door (ASCR, Johnson).
  for (const x of [0.5, 3.2]) at({ k: "cinta", x, z: 0, snap: "n", rot: 2 });
  for (const x of [5.8, 7.4, 9]) at({ k: "bici", x, z: 0, snap: "n", rot: 2, gap: 0.3 });
  for (const x of [-2, 2]) at({ k: "jaula", x, z: 0, snap: "s", plate: x === -2 });
  at({ k: "banco-pesas", x: -5.5, z: -6.5, rot: 1 });
  at({ k: "mancuernas", x: 0, z: -5.5, snap: "e", rot: 3 });
  at({ k: "polea", x: 0, z: 1.5, snap: "e", rot: 3 });
  at({ k: "remo", x: 7.2, z: 3.2, rot: 1 });
  at({ k: "ared", x: 6.8, z: -5.6, rot: 1, plate: true });
  span({ k: "pavimento", x0: -4.2, x1: 11.4, z0: -8.5, z1: -3.6, y0: 0, y1: 0.02, color: 0x2b2f33, name: "Suelo de caucho de las pesas", source: G });
  span({ k: "pavimento", x0: 0.8, x1: 5.2, z0: -3.4, z1: 0.4, y0: 0, y1: 0.03, color: 0x3d6e8f, name: "Tapiz de ejercicios", source: G });
  at({ k: "espejo", x: 0, z: -2.2, w: 4, snap: "e", rot: 3, gap: 0.0, y: 0.3 });
  for (const s of ["n", "s"] as const) {
    for (let i = 0; i < 2; i++) at({ k: "taquillas", x: -10.2 + i * 2.8, z: 0, snap: s, rot: s === "n" ? 2 : 0, w: 0.38 * 7, n: 7, name: "Taquillas del vestuario" });
    at({ k: "banco", x: -8.8, z: 0, snap: s, rot: s === "n" ? 2 : 0, gap: 0.9 });
  }
  at({ k: "fuente", x: 0, z: 4.6, snap: "w", rot: 1 });
  at({ k: "discos", x: -3.6, z: -5.2 });
  at({ k: "cajones-salto", x: 9.4, z: -2.2 });
  at({ k: "tele-pared", x: -3.5, z: 0, snap: "n", rot: 2, y: 1.9, name: "Pantalla del plan de ejercicio" });
  at({ k: "reloj", x: 0, z: -5, snap: "w", rot: 1, y: 2.6 });
  at({ k: "pizarra", x: 6.5, z: 0, snap: "s", y: 1.0, name: "Pizarra de las sesiones" });
  lights(4, 3, fr.height - 0.1);
}

function survival(sink: FurnishSink, fr: RoomFrame): void {
  const { P, at, span, lights, face, basin } = roomKit(sink, fr);
  const k = fr.k;
  const A = fr.area;
  basin();
  // The METS over the pool's east end: its gantry on the decks, the cabin at the surface (NAVAIR).
  const g = P(9, 0);
  const halfSpan = 7.2 * k;
  put(sink, A, { k: "mets", x: 0, z: 0, wx: g.x, wz: g.z, y: -1.2, plate: true, n: halfSpan });
  for (const s of [-1, 1]) put(sink, A, { k: "caja", x: 0, z: 0, wx: g.x, wz: g.z + s * halfSpan, y: 0, w: 0.5, d: 0.5, h: 6.5, color: 0xd8b02a, name: "Pórtico del METS", source: `${S.mets} (medidas nuestras)` });
  // The rescue hoist over the pool with its horse-collar, a raft afloat and the packed ones, the instructors' chairs.
  put(sink, A, { k: "izado", x: 0, z: 0, wx: P(-4, 0).x, wz: g.z, y: 8, d: 12 * k, plate: true });
  at({ k: "balsa", x: -7, z: 2.5, y: -0.45, plate: true });
  at({ k: "silla-socorrista", x: -14.2, z: -7.4 });
  at({ k: "silla-socorrista", x: 15.5, z: -8.5 });
  for (const [x, z] of [[-13, -5.6], [13, 5.6]] as const) put(sink, A, { k: "escalerilla", x: 0, z: 0, wx: P(x, 0).x + (x < 0 ? 0.35 : -0.35), wz: P(0, z).z, y: -0.3, rot: x < 0 ? 1 : 3 });
  for (let i = 0; i < 5; i++) at({ k: "banco", x: -8 + i * 4, z: 0, snap: "n", rot: 2, gap: 0.1 });
  for (let i = 0; i < 3; i++) at({ k: "chalecos", x: -6 + i * 3.2, z: 0, snap: "s" });
  at({ k: "estanteria", x: 6, z: 0, snap: "s", name: "Balsas plegadas" });
  sink.walkCheck({ id: "supervivencia: por el borde hasta el METS", pts: [{ x: P(-18, 6).x, z: P(-18, 6).z }, P(-15, 9.6), P(9, 9.6), P(16, 9.6)].map((q) => ({ x: q.x, y: 0, z: q.z })) });
  lights(4, 3, fr.height - 0.3);
  void span;
  void face;
}

/** The Crew Dragon sims, as SpaceX's in Hawthorne (Wired): the full-scale one (the compartment) and the two-seat cockpit. */
function dragonSims(sink: FurnishSink, fr: RoomFrame): void {
  const { at, lights } = roomKit(sink, fr);
  hatchStep(sink, fr, "simulador-dragon-capsula", "w");
  at({ k: "caja", x: -6, z: 3, w: 2.6, d: 2.2, h: 2.2, color: 0xe8eaec, name: "Simulador de cabina de dos asientos", source: S.spacexSims, reality: "real", plate: true });
  // The instructors who put the failures in: their console (its place and shape are not published: ours).
  at({ k: "consola-fcr", x: 0, z: 0, snap: "n", rot: 2, w: 2.4, name: "Consola de los instructores", source: `${S.spacexSims} (sitio y forma nuestros)`, reality: "licencia", plate: true });
  at({ k: "silla-fcr", x: 0, z: 0, snap: "n", gap: 1.0 });
  lights(3, 2, fr.height - 0.3);
}

/** The Apollo LM simulator, as the LMS of Building 5 (NASA): the cabin (drawn by the scene) and the control console. */
function lmSim(sink: FurnishSink, fr: RoomFrame): void {
  const { at, lights } = roomKit(sink, fr);
  at({ k: "consola-fcr", x: -7, z: 0, rot: 1, w: 3.2, name: "Consola de control del LMS", source: `${S.mstf} (sitio nuestro)`, plate: true });
  at({ k: "silla-fcr", x: -7.9, z: -0.6, rot: 1 });
  at({ k: "silla-fcr", x: -7.9, z: 0.6, rot: 1 });
  lights(3, 2, fr.height - 0.3);
}

/** The CSA's Robotics Training Centre: the classroom (scale models, three interactive whiteboards) and the 3/4 Destiny. */
function robotics(sink: FurnishSink, fr: RoomFrame): void {
  const { P, at, lights } = roomKit(sink, fr);
  hatchStep(sink, fr, "robotica-destiny", "w");
  for (const x of [-9.5, -6.5, -3.5]) at({ k: "pizarra", x, z: 0, snap: "s", y: 0.9, name: "Pizarra interactiva", source: S.csaRobotics, plate: x === -6.5 });
  for (const x of [-8, -5]) {
    at({ k: "mesa", x, z: -2.4, name: "Mesa del aula", source: S.ours, reality: "licencia" });
    for (const dx of [-0.4, 0.4]) at({ k: "silla", x: x + dx, z: -1.6, rot: 2 });
  }
  at({ k: "caja", x: -9, z: 4.2, w: 2.6, d: 0.7, h: 1.1, color: 0xf0f0f0, name: "Maqueta a escala de Canadarm2", source: S.csaRobotics, plate: true });
  at({ k: "caja", x: -5.5, z: 4.2, w: 1.4, d: 0.7, h: 1.1, color: 0xf0f0f0, name: "Maqueta a escala de Dextre", source: S.csaRobotics, plate: true });
  // The ISS robotics workstation in the Destiny mock-up: its desk with the laptop and the two hand controllers
  // (not solid: she sits at it, her knees under it).
  const cp = fr.compartments.find((q) => q.id === "robotica-destiny")!;
  const d = P(4.4, 0.75);
  put(sink, fr.area, { k: "mesa", x: 0, z: 0, wx: d.x, wz: d.z, y: cp.floorY, w: 1.9, d: 0.6, h: 0.75, solid: false, name: "Estación de robótica (portátil y dos mandos)", source: S.csaRobotics, area: `entrenamiento:${cp.id}`, plate: true });
  lights(4, 2, fr.height - 0.3);
}

/**
 * The crew's suit-up room on launch day (Crew-5: «suit donning and checkouts» in the Neil Armstrong O&C building): the
 * crew sit in recliners while their suits are plugged in and leak-checked, the suits are hung by the lockers. The
 * recliners are drawn by the stage (data/stages.ts, post 13's «sillon-traje»); the room's plan is ours.
 */
function suitRoom(sink: FurnishSink, fr: RoomFrame): void {
  const { at, lights } = roomKit(sink, fr);
  for (let i = 0; i < 6; i++) at({ k: "taquillas", x: -10 + i * 0.42, z: 0, snap: "s", ...(i === 0 ? { plate: true } : {}) });
  at({ k: "caja", x: -4.5, z: 0, snap: "s", w: 1.6, d: 0.5, h: 1.9, color: 0xe9ecef, name: "Trajes de la Crew Dragon colgados, cada uno a la medida de quien lo lleva", source: S.crew5Timeline, reality: "real", plate: true });
  at({ k: "consola-fcr", x: 8.5, z: 0, snap: "s", w: 1.6, name: "Puesto de pruebas del traje (aire y comunicaciones por el umbilical)", source: `${S.crewDay} (sitio y forma nuestros)`, reality: "licencia", plate: true });
  at({ k: "mesa", x: -6, z: 3, name: "Mesa de los técnicos de trajes", source: S.ours, reality: "licencia" });
  lights(3, 2, fr.height - 0.3);
}

const ROOM_FURNISH: Readonly<Record<string, (sink: FurnishSink, fr: RoomFrame) => void>> = { nbl, svmf, control, medico: medical, gimnasio: gym, supervivencia: survival, "simulador-dragon": dragonSims, "simulador-lm": lmSim, robotica: robotics, trajes: suitRoom };

/** Furnish one training room (none for the centrifuge: its machines come with its own branch). */
export function furnishRoom(sink: FurnishSink, fr: RoomFrame): void {
  ROOM_FURNISH[fr.id]?.(sink, fr);
}

/**
 * A helipad's own furniture (FAA AC 150/5390-2D): the TLOF's edge lights in green, the weight and size painted on it
 * (S-92: 12,0 t and D = 21 m), the wind cone, two floodlights, the fuel point with its extinguisher. At height `y`.
 */
export function furnishHelipad(sink: FurnishSink, area: string, heli: { x: number; z: number }, half: number, y: number): void {
  const P = (x: number, z: number, p: Omit<Put, "x" | "z">) => put(sink, area, { ...p, y: (p.y ?? 0) + y, x: 0, z: 0, wx: x, wz: z });
  const R = half - 0.3;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    P(heli.x + Math.cos(a) * R, heli.z + Math.sin(a) * R, { k: "luz-pista", y: 0.05 });
  }
  P(heli.x, heli.z - 6.2, { k: "rotulo-suelo", y: 0.07, text: "12 t · 21", plate: false, name: "Peso máximo y tamaño (S-92: 12,0 t; 1 D = 21 m)" });
  P(heli.x + half + 3, heli.z - 12, { k: "manga", plate: true });
  P(heli.x - half - 2, heli.z + 10, { k: "foco" });
  P(heli.x + half + 2, heli.z + 10, { k: "foco" });
  P(heli.x + half + 4, heli.z + 3, { k: "surtidor", rot: 3, plate: true });
  P(heli.x + half + 4, heli.z + 5, { k: "extintor" });
}

// ── Outdoors ──

interface IslandFrame {
  readonly heli: { x: number; z: number };
  readonly heliHalf: number;
  readonly rooms: readonly ({ id: string } & Rect)[];
  readonly island: Rect;
  readonly road: { x: number; z: number };
}

/** Distance from (x, z) to the segment a–b on the plan. */
function segDist(x: number, z: number, a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L)) : 0;
  return Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz));
}

/** A small, repeatable random (the island looks the same every time). */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The island outside: paths, lights, signs, the helipad's markings, lights, wind cone and fuel point, the landing stage and the tussock. */
export function furnishIsland(sink: FurnishSink, k: number, o: IslandFrame): void {
  const A = "entrenamiento:isla";
  const H = "entrenamiento:helipuerto";
  const P = (x: number, z: number, p: Omit<Put, "x" | "z">, area = A) => put(sink, area, { ...p, x: 0, z: 0, wx: x, wz: z });
  const pt = (id: string) => sink.points.find((q) => q.id === id);
  // The landing stage on the north shore, at the end of the x road (ours: the brief asks for the docks).
  const ti = o.island;
  const roadEnd = sink.points.filter((q) => q.id.endsWith(":camino") && Math.abs(q.x - o.road.x) < 1e-6).sort((a, b) => b.z - a.z)[0];
  const pier = { x0: o.road.x - 2, x1: o.road.x + 2, z0: ti.z1, z1: ti.z1 + 30 };
  sink.floor(A, 0, pier);
  P(o.road.x, (pier.z0 + pier.z1) / 2, { k: "pavimento", w: 4, d: 30, h: 0.25, y: -0.25, color: 0x8a6a48, name: "Embarcadero", reality: "licencia", source: S.ours });
  for (let z = pier.z0 + 3; z < pier.z1; z += 6) for (const x of [pier.x0 + 0.2, pier.x1 - 0.2]) P(x, z, { k: "pilote", y: -4.2 });
  for (let z = pier.z0 + 6; z < pier.z1; z += 8) for (const x of [pier.x0 + 0.25, pier.x1 - 0.25]) P(x, z, { k: "noray" });
  P(pier.x1 - 0.15, pier.z0 + 4, { k: "salvavidas", rot: 3 });
  const p1 = sink.point("entrenamiento:embarcadero:orilla", o.road.x, 0, ti.z1 - 3);
  const p2 = sink.point("entrenamiento:embarcadero:punta", o.road.x, 0, pier.z1 - 2);
  if (roadEnd) sink.link(roadEnd.id, p1, p2);
  sink.walkCheck({ id: "isla: hasta la punta del embarcadero", pts: [{ x: o.road.x, y: 0, z: ti.z1 - 3 }, { x: o.road.x, y: 0, z: pier.z1 - 2 }] });
  // Paths: the two roads (6 m) and each door's path to them (3 m), paved (drawn only: the ground is walkable).
  const island = sink.points.filter((q) => q.id.startsWith("entrenamiento:") && q.y < 0.1);
  const roadXs = island.filter((q) => Math.abs(q.x - o.road.x) < 1e-6).map((q) => q.z);
  const roadZs = island.filter((q) => Math.abs(q.z - o.road.z) < 1e-6).map((q) => q.x);
  const zMin = Math.min(...roadXs, o.road.z);
  const zMax = Math.max(...roadXs, ti.z1);
  const xMin = Math.min(...roadZs, o.road.x);
  const xMax = Math.max(...roadZs, o.road.x);
  P(o.road.x, (zMin + zMax) / 2, { k: "pavimento", w: 6, d: zMax - zMin + 6, color: 0x55595e, name: "Camino x = 170" });
  P((xMin + xMax) / 2, o.road.z, { k: "pavimento", w: xMax - xMin + 6, d: 6, color: 0x55595e, name: "Camino z = −5" });
  for (const q of sink.points.filter((p) => /^entrenamiento:[a-z]+:fuera$/.test(p.id))) {
    const r = pt(q.id.replace(/:fuera$/, ":camino"));
    if (!r) continue;
    const vertical = Math.abs(r.x - q.x) < 1e-6;
    P((q.x + r.x) / 2, (q.z + r.z) / 2, { k: "pavimento", w: vertical ? 3 : Math.abs(r.x - q.x) + 3, d: vertical ? Math.abs(r.z - q.z) + 3 : 3, color: 0x6a6e73, name: "Acera" });
  }
  const heliRoad = pt("entrenamiento:helipuerto:camino");
  const heliEdge = pt("entrenamiento:helipuerto:borde");
  if (heliRoad && heliEdge) P((heliRoad.x + heliEdge.x) / 2, heliRoad.z, { k: "pavimento", w: Math.abs(heliEdge.x - heliRoad.x), d: 3, color: 0x6a6e73, name: "Acera del helipuerto" });

  // What must stay clear: every way of the island (and her and the trainers on them), the buildings, the pad, the crossroads.
  const ways: [{ x: number; z: number }, { x: number; z: number }][] = [];
  for (const [a, b] of sink.links) {
    const p = pt(a);
    const q = pt(b);
    if (p && q && p.id.startsWith("entrenamiento") && q.id.startsWith("entrenamiento") && p.y < 0.6 && q.y < 0.6) ways.push([p, q]);
  }
  for (const m of sink.machines) if (m.island === "entrenamiento") ways.push([m, m]);
  const cross = pt("entrenamiento:cruce")!;
  const free = (x: number, z: number, r: number) => {
    if (x < ti.x0 + 2 || x > ti.x1 - 2 || z < ti.z0 + 2 || z > ti.z1 - 2) return false;
    if (o.rooms.some((q) => x > q.x0 - r - 2 && x < q.x1 + r + 2 && z > q.z0 - r - 2 && z < q.z1 + r + 2)) return false;
    // The pad and its floodlights at its corners (about 20 m from its middle).
    if (Math.hypot(x - o.heli.x, z - o.heli.z) < o.heliHalf + 10 + r) return false;
    if (Math.hypot(x - cross.x - 3, z - cross.z) < 7 + r) return false;
    if (Math.abs(x - o.road.x) < 4 + r || Math.abs(z - o.road.z) < 4 + r) return false;
    if (x > pier.x0 - 4 && x < pier.x1 + 4 && z > ti.z1 - 8) return false;
    return ways.every(([a, b]) => segDist(x, z, a, b) > 2.5 + r);
  };
  // Street lights along both roads, 4,5 m off their middle, every 24 m where nothing is in the way.
  const lampOk = (x: number, z: number) => !o.rooms.some((q) => x > q.x0 - 2 && x < q.x1 + 2 && z > q.z0 - 2 && z < q.z1 + 2) && ways.every(([a, b]) => segDist(x, z, a, b) > 1.2) && Math.hypot(x - cross.x - 3, z - cross.z) > 7 && Math.hypot(x - o.heli.x, z - o.heli.z) > o.heliHalf + 4;
  for (let z = zMin; z <= zMax; z += 24) if (lampOk(o.road.x + 4.5, z)) P(o.road.x + 4.5, z, { k: "farola" });
  for (let x = xMin; x <= xMax; x += 24) if (lampOk(x, o.road.z - 4.5)) P(x, o.road.z - 4.5, { k: "farola" });
  // The signpost at the crossroads, benches and a bin by it.
  P(cross.x - 5, cross.z - 8, { k: "poste-senal", plate: true, text: "↑ NBL · centrífuga   ↓ SVMF · médico   → control · gimnasio", name: "Señal de caminos" });
  P(cross.x + 9, cross.z - 10, { k: "banco-exterior" });
  P(cross.x + 11.5, cross.z - 10, { k: "papelera" });
  // The helipad (FAA AC 150/5390-2D): the TLOF's edge lights in green, the wind cone, floodlights, the fuel point
  // with its extinguisher, and the weight and size painted on it (S-92: 12,0 t and D = 21 m).
  const R = o.heliHalf - 0.3;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    P(o.heli.x + Math.cos(a) * R, o.heli.z + Math.sin(a) * R, { k: "luz-pista", y: 0.05 }, H);
  }
  P(o.heli.x, o.heli.z - 6.2, { k: "rotulo-suelo", y: 0.07, text: "12 t · 21", plate: false, name: "Peso máximo y tamaño (S-92: 12,0 t; 1 D = 21 m)" }, H);
  P(o.heli.x + 15, o.heli.z - 12, { k: "manga", plate: true });
  P(o.heli.x - 14, o.heli.z - 14, { k: "foco" });
  P(o.heli.x + 14, o.heli.z + 14, { k: "foco" });
  P(o.heli.x + 16.5, o.heli.z + 3, { k: "surtidor", rot: 3, plate: true });
  P(o.heli.x + 16.5, o.heli.z + 5, { k: "extintor" });
  // The island's own grass in clumps (tussock, as on the sub-Antarctic islands), away from every way and building.
  const rand = rng(7);
  for (let x = ti.x0 + 6; x < ti.x1 - 4; x += 9)
    for (let z = ti.z0 + 6; z < ti.z1 - 4; z += 9) {
      const jx = x + (rand() - 0.5) * 6;
      const jz = z + (rand() - 0.5) * 6;
      const s = 0.7 + rand() * 0.7;
      if (free(jx, jz, s)) P(jx, jz, { k: "tussac", w: s, d: s, h: 0.9 + s * 0.6, rot: (Math.floor(rand() * 4) % 4) as 0 | 1 | 2 | 3 });
    }
  void k;
}
