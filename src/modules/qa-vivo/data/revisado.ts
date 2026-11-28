/**
 * WHAT HAS BEEN REVIEWED LIVE, AND WHEN (Berón 2026-11-24: «las animaciones deben ser al detalle y revisarse en vivo…
 * debería tener una lista de los que tenemos creado y si ha sido revisado o no, junto a su fecha, la lista debe
 * actualizarse conforme avanzamos en el desarrollo»).
 *
 * One entry per thing seen working in the game (Playwright on an iPhone 13, or by Berón): its date and what was seen.
 * What is not here is «pendiente». The list of everything created is built from the catalogues themselves
 * (application/lista.ts), and docs/qa/revision-en-vivo.md is generated from both: a test fails when the document is
 * out of date, so a new animation, room or system appears there as pending the moment it is added.
 */
export interface Revision {
  readonly fecha: string;
  readonly visto: string;
}

export const REVISADO: Readonly<Record<string, Revision>> = {
  // Systems.
  "sistema:castillos": { fecha: "2026-11-24", visto: "La cima de 110 × 110 m sobre Ciencias: ring con almohadas, los 4 castillos con cubiertas, torres, escaleras, barandas y postes, jardín al borde; subida a pie por la escalera hasta la cubierta baja (prueba)" },
  "sistema:toboganes": { fecha: "2026-11-24", visto: "Bajada por el tobogán corto y por el de hélice desde la torre hasta el ring" },
  "sistema:guerra-almohadas": { fecha: "2026-11-24", visto: "Empezar la guerra junto al tesoro rojo, coger el azul (lo lleva sobre la cabeza) y el marcador en el HUD" },
  "piso:residencia-cima": { fecha: "2026-11-24", visto: "Aposentos, aula, lectura, cocina, aseos y jardín de la cima" },
  "sistema:pulpo": { fecha: "2026-11-24", visto: "Las fases del huevo de pulpo en el globo (segmentación, primera inversión, órganos, ojos, cromatóforos, segunda inversión, eclosión y la paralarva nadando); transición fluida" },
  "sistema:pecera": { fecha: "2026-11-24", visto: "La gran pecera de la plaza: entrada animada, seis personajes flotando en estrella dentro, paso al microcosmos" },
  "sistema:retos-equipo": { fecha: "2026-11-24", visto: "Ensayo de la banda desde la estación de alfombras de Salas: cuatro personajes en sus instrumentos" },
  "sistema:carga": { fecha: "2026-11-24", visto: "La pantalla de carga del santuario 1 y su desaparición al primer fotograma" },
  "sistema:caidas": { fecha: "2026-11-24", visto: "Caer desde el borde de los pisos andando recto (65 de 72 lados) y en diagonal (prueba de dominio)" },
  "sistema:ropa": { fecha: "2026-11-24", visto: "A las 10 (tareas): ella con chaqueta y gorro de cocina en el restaurante y con pijama y gorro en el hospital; Fausto de cocinero. En el microcosmos: quitón y manto, exomis en la palestra" },
  "sistema:literas": { fecha: "2026-11-24", visto: "Literas sin tobogán" },
  "sistema:portal-microcosmos": { fecha: "2026-11-24", visto: "El portal de vuelta (agujero negro y galaxia) junto al final del Dromos" },
  "sistema:misiones-microcosmos": { fecha: "2026-11-24", visto: "La ventana de misiones del microcosmos: plano con los pasos numerados, dónde está ella, «Ir» y el portal" },
  "sistema:camara-retos-microcosmos": { fecha: "2026-11-24", visto: "La lucha en la palestra: la cámara mira a los dos sobre la hoja, gira con el dedo y se acerca con el pellizco" },
  // The Academy: what was seen in the live captures.
  "microcosmos:museo": { fecha: "2026-11-24", visto: "Fachada con pórtico de dos columnas dóricas, frontón y gradas; dentro, estanterías de rollos" },
  "microcosmos:palestra": { fecha: "2026-11-24", visto: "Entrada con hermas, muros pintados y tejado de tejas; patio con su columnata" },
  "microcosmos:casa": { fecha: "2026-11-24", visto: "Patio con pozo y herma; andrón con lechos y muros pintados" },
  "microcosmos:carro": { fecha: "2026-11-24", visto: "El carro con el asno delante y el carretero guiándolo" },
  "persona:paidotriba": { fecha: "2026-11-24", visto: "Enseña la lucha en el patio de la palestra (uchikomi en el reto)" },
  // Motions seen in the challenges played live.
  "movimiento:tocar-guitarra": { fecha: "2026-11-24", visto: "Ensayo de la banda en equipo" },
  "movimiento:tocar-bajo": { fecha: "2026-11-24", visto: "Ensayo de la banda en equipo" },
  "movimiento:tocar-bateria": { fecha: "2026-11-24", visto: "Ensayo de la banda en equipo" },
  "movimiento:tocar-teclado": { fecha: "2026-11-24", visto: "Ensayo de la banda en equipo" },
  "movimiento:derribo": { fecha: "2026-11-24", visto: "Ella en la lucha de la palestra (microcosmos)" },
  "movimiento:uchikomi": { fecha: "2026-11-24", visto: "El paidotriba en la lucha (microcosmos)" },
};
