import type { Vehicle } from "@modules/tasks/application/task-list";
import { TASK_TRAVELS, TASK_VEHICLES, type TaskTravel, type TaskVehicle } from "@modules/settings/domain/settings";
import { settings } from "./settings-store";

/**
 * The two settings shared by the task list and the Áreas window (docs/design/viaje-a-una-tarea.md §Ajustes de
 * tareas, areas.md): how «Ir» gets there (`taskTravel`) and which vehicle (`taskVehicle`, automatic = where she
 * is). One source of truth, `codeship.ajustes`; both windows draw them with this and change them the same way.
 */
export const VEHICLE_NAME: Record<Vehicle, string> = { nodriza: "Nave (Starship)", estacion: "Estación", modulo: "Módulo" };
const TRAVEL: Record<TaskTravel, string> = { viaje: "Viaje", teletransporte: "Teletransporte" };

/** «Ir a una tarea»: Viaje / Teletransporte, with what it does. `id` names the heading for the radio group. */
export function travelHtml(id: string): string {
  const now = settings.value.taskTravel;
  return `<h3 class="tb-group" id="${id}">Ir a una tarea</h3><div class="tb-travel" role="radiogroup" aria-labelledby="${id}">${TASK_TRAVELS.map((m) => `<button role="radio" data-travel="${m}" aria-checked="${m === now}" class="${m === now ? "on" : ""}">${TRAVEL[m]}</button>`).join("")}</div><small class="tb-travel-help">${now === "viaje" ? "«Ir» hace el camino real: andando, saltando y abriendo escotillas" : "«Ir» aparece allí al momento"}</small>`;
}

/**
 * The vehicle: Automático (where she is) and each vehicle, with a count if given; «Todos» only where it makes
 * sense (the task list; a schematic shows one vehicle).
 */
export function vehicleHtml(id: string, here: Vehicle, count?: (v: Vehicle | null) => number, withAll = true): string {
  const filter = settings.value.taskVehicle;
  const n = (v: Vehicle | null) => (count ? ` <small>${count(v)}</small>` : "");
  const label = (v: TaskVehicle) => (v === "auto" ? `Automático: donde está ella <small>${VEHICLE_NAME[here]}${count ? ` · ${count(here)}` : ""}</small>` : v === "todos" ? `Todos${n(null)}` : `${VEHICLE_NAME[v]}${n(v)}`);
  const list = TASK_VEHICLES.filter((v) => withAll || v !== "todos");
  const checked = !withAll && filter === "todos" ? "auto" : filter;
  return `<h3 class="tb-group" id="${id}">Vehículo</h3><div class="tb-vehicles${withAll ? "" : " three"}" role="radiogroup" aria-labelledby="${id}">${list.map((v) => `<button role="radio" data-vehicle="${v}" aria-checked="${v === checked}" class="${v === checked ? "on" : ""}${v === "auto" ? " auto" : ""}">${label(v)}</button>`).join("")}</div>`;
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
