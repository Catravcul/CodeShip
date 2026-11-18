import type { Reality } from "@core/reality";
import type { Shift } from "../domain/roster";
import { S3_SOURCES as S } from "./sources";

/**
 * The trainers of the initiation: Cold Sanctuary's people whose trade fits a post (its Professions.cs and
 * docs/personajes), recreated with their looks as simple cube figures. Each has her shift (domain/roster.ts); the
 * Magnate gives a challenge when nobody is on shift at that post. Who works where is ours (licence): Cold Sanctuary
 * gives the trades, not these posts.
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
  readonly reality: Reality;
  readonly source: string;
}

const who = `${S.csPeople}; ${S.csRoster}`;

export const TRAINERS: readonly Trainer[] = [
  { id: "karen", name: "Karen", trade: "Asuntos legales y lenguas: lleva el tribunal de selección", heightM: 1.58, skin: 0x9a6440, hair: 0x3a2416, longHair: true, clothes: 0xf7f4ef, looks: "piel morena cálida, melena castaña oscura, blusa blanca y falda berenjena", shift: { manana: 1 }, reality: "licencia", source: who },
  { id: "julian", name: "Julian", trade: "Dirección de proyectos: el tribunal a mediodía", heightM: 1.76, skin: 0xe2b896, hair: 0xa07850, longHair: false, clothes: 0x3d6fb8, looks: "pelo castaño claro hacia atrás, camisa azul y pantalón oscuro (provisional en Cold Sanctuary)", shift: { mediodia: 1 }, reality: "licencia", source: who },
  { id: "linduarda", name: "Linduarda", trade: "La doctora de la iniciación: el reconocimiento y, a mediodía, la cámara hipobárica", heightM: 1.6, skin: 0xc68e5e, hair: 0x141414, longHair: true, clothes: 0x8fd3f0, looks: "coleta alta negra, gafas redondas doradas, pijama sanitario azul cielo sobre camiseta blanca", shift: { manana: 2, mediodia: 4 }, reality: "licencia", source: who },
  { id: "lizmibet", name: "Lizmibet", trade: "Médica: la cámara hipobárica y, a mediodía, el reconocimiento", heightM: 1.55, skin: 0xf0c8a8, hair: 0x8a4b2a, longHair: false, clothes: 0xfafafa, looks: "pelo corto rizado castaño cobrizo, gafas plateadas, vestido blanco largo", shift: { manana: 4, mediodia: 2 }, reality: "licencia", source: who },
  { id: "adaguchi", name: "Adaguchi", trade: "Submarinismo: los buzos de la piscina NBL y, a mediodía, la prueba de natación", heightM: 1.65, skin: 0xc89a6e, hair: 0x3b2a1e, longHair: false, clothes: 0x1c1c1c, looks: "pelo corto ondulado castaño oscuro, sudadera negra sin mangas", shift: { manana: 7, mediodia: 3 }, reality: "licencia", source: who },
  { id: "luciana", name: "Luciana", trade: "Piloto: la supervivencia en el agua tras un amerizaje y, a mediodía, la piscina NBL", heightM: 1.63, skin: 0xe8c09c, hair: 0x2a1a12, longHair: true, clothes: 0xeee6d6, looks: "pelo largo liso oscuro, vestido hueso", shift: { manana: 3, mediodia: 7 }, reality: "licencia", source: who },
];

/** The Magnate: she gives the challenge when nobody is on shift (she can teleport, so she is always there). */
export const MAGNATE: Trainer = { id: "magnate", name: "La Magnate", trade: "Da el reto cuando no hay nadie de turno en el puesto", heightM: 1.66, skin: 0xf3d9b0, hair: 0x1b2a5c, longHair: false, clothes: 0x6a2c91, looks: "bob azul noche, bolero morado y bombacho celeste", shift: {}, reality: "licencia", source: who };

export const trainerById = (id: string): Trainer => (id === MAGNATE.id ? MAGNATE : TRAINERS.find((t) => t.id === id)!);
