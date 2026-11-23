import type { ICON } from "./icons";

/**
 * The catalog of icons (Berón 2026-11-19: «deberíamos tener una lista de los iconos y con un campo que diga donde se
 * usan, así sabemos si alguno está libre o hay que usar otro»), organised like the catalogs of models: one entry per
 * icon of icons.ts, what it means and every place it is used. An icon with `usedIn: []` is free. icon-catalog.test.ts
 * checks this list against the code, so it cannot go stale.
 */
export interface IconEntry {
  /** What the drawing shows. */
  readonly drawing: string;
  /** What it means wherever it is used: one meaning per icon. */
  readonly meaning: string;
  /** Where it is used: the button and its level or mode, and the source files that draw it. */
  readonly usedIn: readonly { readonly where: string; readonly file: string }[];
}

export const ICON_CATALOG: Readonly<Record<keyof typeof ICON, IconEntry>> = {
  eye: {
    drawing: "Un ojo",
    meaning: "La vista: cambiar de cámara o de 1.ª a 3.ª persona",
    usedIn: [
      { where: "Menú de vuelo: vista", file: "src/adapters/three/flight-view.ts" },
      { where: "Santuario 3: vista", file: "src/aerial-sanctuary.ts" },
      { where: "Interiores: vista", file: "src/interior.ts" },
      { where: "Santuario 1: vista", file: "src/sanctuary-one.ts" },
      { where: "Estación: vista", file: "src/station-interior.ts" },
      { where: "Salas a pie: vista", file: "src/walk-room.ts" },
    ],
  },
  root: { drawing: "Una semilla con tres brotes", meaning: "La raíz del menú en árbol", usedIn: [{ where: "Menú de vuelo: raíz", file: "src/adapters/three/flight-view.ts" }] },
  standUp: { drawing: "Una persona que se levanta", meaning: "Levantarse del asiento del piloto", usedIn: [{ where: "Cabina: levantarse", file: "src/main.ts" }] },
  land: { drawing: "Una nave sobre el suelo", meaning: "Ayuda al aterrizaje", usedIn: [{ where: "Módulo lunar: aterrizar", file: "src/main.ts" }] },
  dock: { drawing: "Dos anillos que se juntan", meaning: "Acoplar", usedIn: [{ where: "Nodriza y estación: acoplar", file: "src/main.ts" }] },
  undock: { drawing: "Dos anillos que se separan", meaning: "Desacoplar", usedIn: [{ where: "Nodriza y estación: desacoplar", file: "src/main.ts" }] },
  warp: { drawing: "El reloj acelerado", meaning: "Acelerar el tiempo del viaje", usedIn: [{ where: "Menú de vuelo: acelerar", file: "src/adapters/three/flight-view.ts" }] },
  center: { drawing: "Centrar", meaning: "Centrar la vista", usedIn: [] },
  tasks: {
    drawing: "Una lista con marcas",
    meaning: "La lista de tareas",
    usedIn: [
      { where: "Menú de vuelo: tareas", file: "src/adapters/three/flight-view.ts" },
      { where: "Santuario 3: tareas", file: "src/aerial-sanctuary.ts" },
      { where: "Estación: tareas", file: "src/station-interior.ts" },
      { where: "Ventanas de mapa: volver a la lista", file: "src/ui/map-window.ts" },
      { where: "Lista de tareas: volver", file: "src/ui/task-board.ts" },
      { where: "Salas a pie: tareas", file: "src/walk-room.ts" },
    ],
  },
  gear: {
    drawing: "Un engranaje",
    meaning: "Ajustes",
    usedIn: [
      { where: "Ventanas de mapa: ajustes", file: "src/ui/map-window.ts" },
      { where: "Menú en árbol: botón raíz", file: "src/ui/root-menu.ts" },
      { where: "Lista de tareas: ajustes", file: "src/ui/task-board.ts" },
    ],
  },
  close: {
    drawing: "Una X",
    meaning: "Cerrar",
    usedIn: [
      { where: "Elegir reto: cerrar", file: "src/ui/reto-picker.ts" },
      { where: "Menú en árbol: cerrar", file: "src/ui/root-menu.ts" },
    ],
  },
  areas: {
    drawing: "Tres salas unidas",
    meaning: "La ventana de Áreas (mapa e «Ir»)",
    usedIn: [
      { where: "Santuario 3: Áreas", file: "src/aerial-sanctuary.ts" },
      { where: "Santuario 6: Áreas", file: "src/main.ts" },
      { where: "Santuario 1: Áreas", file: "src/sanctuary-one.ts" },
    ],
  },
  route: { drawing: "Un camino de puntos a una meta", meaning: "Un viaje o una ruta", usedIn: [{ where: "Santuario 6: navegación", file: "src/main.ts" }] },
  door: { drawing: "Una escotilla cuadrada con su volante", meaning: "Abrir o cruzar una escotilla", usedIn: [{ where: "Estación: escotilla", file: "src/station-interior.ts" }] },
  locked: { drawing: "La escotilla con un candado", meaning: "Cerrado o bloqueado", usedIn: [{ where: "Estación: escotilla cerrada", file: "src/station-interior.ts" }] },
  food: { drawing: "Un cuenco humeante", meaning: "Comer o cocinar", usedIn: [{ where: "Estación: comida", file: "src/station-interior.ts" }] },
  bed: { drawing: "Un saco de dormir", meaning: "Dormir", usedIn: [{ where: "Estación: dormir", file: "src/station-interior.ts" }] },
  wash: { drawing: "Una gota de agua", meaning: "Asearse", usedIn: [{ where: "Estación: aseo", file: "src/station-interior.ts" }] },
  exercise: { drawing: "Una pesa", meaning: "Hacer ejercicio", usedIn: [{ where: "Estación: ejercicio", file: "src/station-interior.ts" }] },
  medical: { drawing: "Una cruz en un maletín", meaning: "Salud y botiquín", usedIn: [{ where: "Estación: botiquín", file: "src/station-interior.ts" }] },
  mat: { drawing: "Una esterilla enrollada", meaning: "Yoga", usedIn: [{ where: "Estación: yoga", file: "src/station-interior.ts" }] },
  hangar: { drawing: "Una nave bajo un techo", meaning: "La plataforma y el brazo robótico", usedIn: [{ where: "Estación: plataforma", file: "src/station-interior.ts" }] },
  machine: {
    drawing: "Una consola",
    meaning: "El panel de una máquina",
    usedIn: [
      { where: "Estación: máquina", file: "src/station-interior.ts" },
      { where: "Naves y santuario 3: botón naranja de una máquina o consola sin reto (puerta, pantalla, ascensor)", file: "src/ui/machine-panel.ts" },
      { where: "Microcosmos de la Academia: botón naranja «Subir al carro»", file: "src/microcosmos-academia.ts" },
    ],
  },
  suit: { drawing: "Un traje espacial", meaning: "Trajes y esclusa (EVA)", usedIn: [{ where: "Estación: esclusa", file: "src/station-interior.ts" }] },
  info: { drawing: "Una i en un círculo", meaning: "Algo que mirar o leer", usedIn: [{ where: "Estación: información", file: "src/station-interior.ts" }] },
  reto: { drawing: "Llaves de código con una chispa", meaning: "Un reto de código a mano (botón naranja)", usedIn: [{ where: "Botón naranja «Reto: …» de todos los niveles (santuarios 1 y 3, naves y estación)", file: "src/ui/interaction.ts" }] },
  missions: { drawing: "Una hoja de calendario con un reloj", meaning: "Las misiones de la jornada", usedIn: [{ where: "Santuario 1: Misiones", file: "src/sanctuary-one.ts" }] },
  carpet: { drawing: "Una alfombra ondeando con sus flecos y el aire debajo", meaning: "Volar en alfombra desde una estación de alfombras", usedIn: [{ where: "Santuario 1: botón naranja (o Y) sobre una estación", file: "src/sanctuary-one.ts" }] },
};
