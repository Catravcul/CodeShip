import type { Vehicle } from "@modules/tasks/application/task-list";
import { TASK_TRAVELS, TASK_VEHICLES, type TaskTravel, type TaskVehicle } from "@modules/settings/domain/settings";
import { settings } from "./settings-store";

/**
 * The two settings shared by the task list and the Áreas window (docs/design/viaje-a-una-tarea.md §Ajustes de
 * tareas, areas.md): how «Ir» gets there (`taskTravel`) and which vehicle (`taskVehicle`, automatic = where she
 * is). One source of truth, `codeship.ajustes`; both windows draw them with this and change them the same way.
 */
export const VEHICLE_NAME: Record<Vehicle, string> = { nodriza: "Nave (Starship)", estacion: "Estación", modulo: "Módulo", entrenamiento: "Isla de entrenamiento", lanzadera: "Lanzadera", parque: "Parque energético", muelle: "Muelle aéreo", plataforma: "Plataforma de tripulación", glaciar: "Glaciar", bioma: "Isla de las alturas", "santuario-1": "Santuario 1" };

/**
 * Which «vehículos» the shared settings offer and what their heading says: the space game's vehicles, or in
 * sanctuary 3 its islands (set once by the level that runs).
 */
let offered: { readonly list: readonly TaskVehicle[]; readonly heading: string } = { list: TASK_VEHICLES, heading: "Vehículo" };
export function offerVehicles(list: readonly TaskVehicle[], heading: string): void {
  offered = { list, heading };
  place = undefined;
}

/**
 * A level whose services are not repeated in several places (sanctuaries 1 and 3; Berón 2026-11-28: «en sanctuary3 y
 * sanctuary1 no existen servicios repetidos por lo que vamos a retirar los filtros de ajustes, nos quedamos solo con el
 * de viaje/teletransporte y mostramos la lista de todo el santuario»): the settings of Tareas, Áreas and the carpets
 * offer only Viaje/Teletransporte, and the lists show the whole place, named `name`. The space game (nodriza and
 * station, whose services are alike) keeps its vehicle filter.
 */
let place: string | undefined;
export function wholePlace(name: string): void {
  place = name;
}
/** The whole place's name when the level has no vehicle filter (see `wholePlace`). */
export function wholePlaceName(): string | undefined {
  return place;
}
const TRAVEL: Record<TaskTravel, string> = { viaje: "Viaje", teletransporte: "Teletransporte" };

/** «Ir a una tarea»: Viaje / Teletransporte, with what it does. `id` names the heading for the radio group. */
export function travelHtml(id: string, now: TaskTravel = settings.value.taskTravel, heading = "Ir a una tarea"): string {
  return `<h3 class="tb-group" id="${id}">${heading}</h3><div class="tb-travel" role="radiogroup" aria-labelledby="${id}">${TASK_TRAVELS.map((m) => `<button role="radio" data-travel="${m}" aria-checked="${m === now}" class="${m === now ? "on" : ""}">${TRAVEL[m]}</button>`).join("")}</div><small class="tb-travel-help">${now === "viaje" ? "«Ir» hace el camino real: andando, saltando y abriendo escotillas" : "«Ir» aparece allí al momento"}</small>`;
}

/**
 * The vehicle: Automático (where she is) and each vehicle, with a count if given; «Todos» only where it makes
 * sense (the task list; a schematic shows one vehicle).
 */
export function vehicleHtml(id: string, here: Vehicle, count?: (v: Vehicle | null) => number, withAll = true): string {
  if (place) return "";
  const filter = settings.value.taskVehicle;
  const n = (v: Vehicle | null) => (count ? ` <small>${count(v)}</small>` : "");
  const label = (v: TaskVehicle) => (v === "auto" ? `Automático: donde está ella <small>${VEHICLE_NAME[here]}${count ? ` · ${count(here)}` : ""}</small>` : v === "todos" ? `Todos${n(null)}` : `${VEHICLE_NAME[v]}${n(v)}`);
  const list = offered.list.filter((v) => withAll || v !== "todos");
  const checked = !withAll && filter === "todos" ? "auto" : filter;
  return `<h3 class="tb-group" id="${id}">${offered.heading}</h3><div class="tb-vehicles${withAll ? "" : " three"}" role="radiogroup" aria-labelledby="${id}">${list.map((v) => `<button role="radio" data-vehicle="${v}" aria-checked="${v === checked}" class="${v === checked ? "on" : ""}${v === "auto" ? " auto" : ""}">${label(v)}</button>`).join("")}</div>`;
}

/** A tap on one of those choices: changes the shared setting and says so (the window redraws). */
export function settingsClick(t: HTMLElement): boolean {
  const mode = t.closest<HTMLElement>("[data-travel]");
  if (mode) {
    settings.set("taskTravel", mode.dataset.travel as TaskTravel);
    return true;
  }
  const vehicle = t.closest<HTMLElement>("[data-vehicle]");
  if (vehicle) {
    settings.set("taskVehicle", vehicle.dataset.vehicle as TaskVehicle);
    return true;
  }
  return false;
}
