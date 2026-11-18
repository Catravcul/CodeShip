import type { Reality } from "@core/reality";
import type { Shift } from "../domain/roster";
import { S3_SOURCES as S } from "./sources";

/**
 * The trainers of the initiation: Cold Sanctuary's people whose trade fits a post (its Professions.cs and
 * docs/personajes), recreated with their looks as simple cube figures. Each has her shift (domain/roster.ts); with
 * nobody on shift a post pauses. Who works where is ours (licence): Cold Sanctuary gives the trades, not these
 * posts. The glacier's crew (posts 6, 11 and 12) lives at the glacier's camp, as field parties on the ice do: they
 * train and eat there.
 */
export interface Trainer {
  readonly id: string;
  readonly name: string;
  /** Her trade in Cold Sanctuary, and what she does here. */
  readonly trade: string;
  readonly heightM: number;
  readonly skin: number;
  readonly hair: number;
  readonly longHair: boolean;
  /** The top she wears (the cube figure has one colour for the clothes). */
  readonly clothes: number;
  readonly looks: string;
  readonly shift: Shift;
  /** Where she lives her day: the training island, or the glacier's camp. */
  readonly base: "entrenamiento" | "glaciar";
  readonly reality: Reality;
  readonly source: string;
}

const who = `${S.csPeople}; ${S.csRoster}`;

export const TRAINERS: readonly Trainer[] = [
  { id: "karen", name: "Karen", trade: "Asuntos legales y lenguas: lleva el tribunal de selección", heightM: 1.58, skin: 0x9a6440, hair: 0x3a2416, longHair: true, clothes: 0xf7f4ef, looks: "piel morena cálida, melena castaña oscura, blusa blanca y falda berenjena", shift: { manana: 1 }, base: "entrenamiento", reality: "licencia", source: who },
  { id: "julian", name: "Julian", trade: "Dirección de proyectos: el tribunal a mediodía", heightM: 1.76, skin: 0xe2b896, hair: 0xa07850, longHair: false, clothes: 0x3d6fb8, looks: "pelo castaño claro hacia atrás, camisa azul y pantalón oscuro (provisional en Cold Sanctuary)", shift: { mediodia: 1 }, base: "entrenamiento", reality: "licencia", source: who },
  { id: "linduarda", name: "Linduarda", trade: "La doctora de la iniciación: el reconocimiento y, a mediodía, la cámara hipobárica", heightM: 1.6, skin: 0xc68e5e, hair: 0x141414, longHair: true, clothes: 0x8fd3f0, looks: "coleta alta negra, gafas redondas doradas, pijama sanitario azul cielo sobre camiseta blanca", shift: { manana: 2, mediodia: 4 }, base: "entrenamiento", reality: "licencia", source: who },
  { id: "lizmibet", name: "Lizmibet", trade: "Médica: la cámara hipobárica y, a mediodía, el reconocimiento", heightM: 1.55, skin: 0xf0c8a8, hair: 0x8a4b2a, longHair: false, clothes: 0xfafafa, looks: "pelo corto rizado castaño cobrizo, gafas plateadas, vestido blanco largo", shift: { manana: 4, mediodia: 2 }, base: "entrenamiento", reality: "licencia", source: who },
  { id: "adaguchi", name: "Adaguchi", trade: "Submarinismo: los buzos de la piscina NBL", heightM: 1.65, skin: 0xc89a6e, hair: 0x3b2a1e, longHair: false, clothes: 0x1c1c1c, looks: "pelo corto ondulado castaño oscuro, sudadera negra sin mangas", shift: { manana: 7, mediodia: 7 }, base: "entrenamiento", reality: "licencia", source: who },
  { id: "luciana", name: "Luciana", trade: "Piloto: la natación y la supervivencia en el agua tras un amerizaje", heightM: 1.63, skin: 0xe8c09c, hair: 0x2a1a12, longHair: true, clothes: 0xeee6d6, looks: "pelo largo liso oscuro, vestido hueso", shift: { manana: 3, mediodia: 3 }, base: "entrenamiento", reality: "licencia", source: who },
  // Phase 5 (s3-iniciacion-2): the centrifuge, the simulators and robotics on the island; the glacier's crew.
  { id: "fausto", name: "Fausto", trade: "Mecánico: maneja la centrífuga desde su consola", heightM: 1.7, skin: 0xd9a882, hair: 0x5a3a22, longHair: false, clothes: 0x7d8a72, looks: "pelo rizado castaño, ropa de taller gris verdosa (provisional en Cold Sanctuary)", shift: { manana: 5, mediodia: 5 }, base: "entrenamiento", reality: "licencia", source: who },
  { id: "david", name: "David", trade: "Informática: los simuladores de Dragon y del LM", heightM: 1.75, skin: 0xe0b090, hair: 0x1a1410, longHair: false, clothes: 0x2f8f8a, looks: "pelo oscuro en puntas, camiseta verde azulada, pantalón azul oscuro (provisional)", shift: { manana: 8, mediodia: 8 }, base: "entrenamiento", reality: "licencia", source: who },
  { id: "adonis", name: "Adonis", trade: "Informática: el simulador de robótica", heightM: 1.8, skin: 0x9a6a45, hair: 0x0e0e0e, longHair: false, clothes: 0x7a1f2a, looks: "pelo negro degradado, piel morena, ropa granate (provisional)", shift: { manana: 9, mediodia: 9 }, base: "entrenamiento", reality: "licencia", source: who },
  { id: "ivelyna", name: "Ivelyna", trade: "Pediatra: la médica a bordo del vuelo parabólico por la mañana", heightM: 1.6, skin: 0xe6c0a0, hair: 0x141414, longHair: true, clothes: 0xf5f5f5, looks: "pelo largo negro ondulado, camiseta blanca con un coche rojo, falda blanca de volantes", shift: { manana: 6 }, base: "glaciar", reality: "licencia", source: who },
  { id: "malena", name: "Malena", trade: "Pediatra: la médica a bordo del vuelo parabólico a mediodía", heightM: 1.63, skin: 0xeccaa8, hair: 0x3a2618, longHair: false, clothes: 0xd8c3a0, looks: "pelo recogido con gafas de sol en la cabeza, abrigo largo beige, pantalón blanco", shift: { mediodia: 6 }, base: "glaciar", reality: "licencia", source: who },
  { id: "amykhuz", name: "Amykhuz", trade: "Química: la búsqueda de meteoritos en el hielo azul y su clasificación", heightM: 1.76, skin: 0xc99a70, hair: 0x3a2414, longHair: false, clothes: 0x1f2c4f, looks: "delgado, bigote fino, polo azul marino y bolso negro cruzado", shift: { manana: 11, mediodia: 11 }, base: "glaciar", reality: "licencia", source: who },
  { id: "gohageneis", name: "Gohageneis", trade: "Guardia: la supervivencia en frío por la mañana", heightM: 1.76, skin: 0xc89068, hair: 0x1a1410, longHair: false, clothes: 0xf5f5f5, looks: "atlético, pelo corto, gorra azul con la «V» de Venezuela, camiseta blanca y pantalón corto rojo", shift: { manana: 12 }, base: "glaciar", reality: "licencia", source: who },
  { id: "nesvitor", name: "Nesvitor", trade: "Guardia y agricultor: la supervivencia en frío a mediodía", heightM: 1.68, skin: 0xb07a50, hair: 0x8a8a8a, longHair: false, clothes: 0x1c1c1c, looks: "mayor, pelo canoso peinado hacia atrás, bigote canoso, forro polar negro sobre camisa de cuadros", shift: { mediodia: 12 }, base: "glaciar", reality: "licencia", source: who },
];

export const trainerById = (id: string): Trainer => TRAINERS.find((t) => t.id === id)!;
