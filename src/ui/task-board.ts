import { groupTasks, shownVehicle, tasksIn, type Task, type TaskGroupId, type Vehicle } from "@modules/tasks/application/task-list";
import { settings } from "./settings-store";
import { settingsClick, travelHtml, vehicleHtml } from "./task-settings";
import { ICON } from "./icons";
import { onCloseRequest, windowState } from "./hud-windows";
import "./task-board.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const IN: Record<Vehicle, string> = { nodriza: "En la nave", estacion: "En la estación", modulo: "En el módulo" };
const NOTHING: Record<Vehicle, string> = { nodriza: "Nada pendiente en la nave", estacion: "Nada pendiente en la estación", modulo: "Nada pendiente en el módulo" };

/**
 * The task board with every task of the game (docs/design/habitaculo.md §Tareas), grouped (flight first),
 * each with «Ir» that takes her to the machine or the vehicle where it is done. Opened from the
 * «Tareas» button of the travel ship, the lander's cabin and the station.
 *
 * Two views, like a branch of the root menu (Berón, 2026-11-17; docs/design/viaje-a-una-tarea.md §Ajustes de tareas):
 * the list, and its settings behind the gear next to ✕. The settings hold «Viaje / Teletransporte»
 * (`taskTravel`), the vehicle (`taskVehicle`: automatic = where she is, the Starship, the station,
 * the lander or every one; both in `codeship.ajustes`, their only place) and the group chips.
 * In the settings the gear turns into a list icon that goes back to the list.
 */
export class TaskBoard {
  private readonly el: HTMLElement;
  private group: TaskGroupId | null = null;
  private view: "lista" | "ajustes" = "lista";
  private tasks: Task[] = [];
  /** Takes her to the task's place (set by main.ts). */
  onGo?: (t: Task) => void;

  constructor(
    root: HTMLElement,
    private readonly source: () => Task[],
    /** The vehicle she is in now: what «Automático» shows. */
    private readonly here: () => Vehicle = () => "nodriza",
  ) {
    this.el = document.createElement("div");
    this.el.className = "board task-board hidden";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-label", "Tareas");
    root.appendChild(this.el);
    this.el.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-close]")) return this.close();
      if (t.closest("[data-view]")) {
        this.view = this.view === "lista" ? "ajustes" : "lista";
        this.render();
        this.el.scrollTop = 0;
        return this.el.querySelector<HTMLElement>("[data-view]")?.focus();
      }
      if (settingsClick(t)) return this.render();
      const chip = t.closest<HTMLElement>("[data-group]");
      if (chip) {
        this.group = (chip.dataset.group || null) as TaskGroupId | null;
        return this.render();
      }
      const go = t.closest<HTMLElement>("[data-go]");
      const task = go && this.tasks.find((x) => x.id === go.dataset.go);
      if (task) {
        this.close();
        this.onGo?.(task);
      }
    });
    window.addEventListener("keydown", (e) => this.visible && e.code === "Escape" && this.close());
    // The menu's «Tareas» icon is an X while the list is open (reglas.md §5.8).
    onCloseRequest("tareas", () => this.close());
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  open(group: TaskGroupId | null = null): void {
    this.group = group;
    this.view = "lista";
    this.render();
    this.el.classList.remove("hidden");
    this.el.scrollTop = 0;
    document.body.classList.add("in-tasks");
    windowState("tareas", true);
  }

  close(): void {
    if (!this.visible) return;
    this.el.classList.add("hidden");
    document.body.classList.remove("in-tasks");
    windowState("tareas", false);
  }

  private render(): void {
    const all = this.source();
    const here = this.here();
    const filter = settings.value.taskVehicle;
    const vehicle = shownVehicle(filter, here);
    const inVehicle = tasksIn(all, vehicle);
    const groups = groupTasks(inVehicle);
    if (this.group && !groups.some((g) => g.id === this.group)) this.group = null;
    this.tasks = inVehicle;
    const settingsView = this.view === "ajustes";
    const toggle = settingsView
      ? `<button class="tb-view" data-view aria-label="Volver a la lista de tareas" title="Lista de tareas">${ICON.tasks}</button>`
      : `<button class="tb-view" data-view aria-label="Ajustes de tareas" title="Ajustes de tareas">${ICON.gear}</button>`;
    const head = `<div class="board-head"><b>${settingsView ? "Ajustes de tareas" : "Tareas"}</b><span class="tb-head-btns">${toggle}<button data-close aria-label="Cerrar tareas">✕</button></span>`;
    this.el.setAttribute("aria-label", settingsView ? "Ajustes de tareas" : "Tareas");
    if (settingsView) {
      this.el.innerHTML = `${head}</div>${this.settingsBody(all, here, groups, inVehicle.length)}`;
      return;
    }
    const groupLabel = this.group ? groups.find((g) => g.id === this.group)?.label : undefined;
    const shown = groups.filter((g) => !this.group || g.id === this.group);
    const count = shown.reduce((n, g) => n + g.tasks.length, 0);
    const where = vehicle ? `${IN[vehicle]}${filter === "auto" ? " (automático)" : ""}` : "Todos los vehículos";
    const scope = `<p class="tb-scope">${where}${groupLabel ? ` · ${groupLabel}` : ""} · ${count} de ${all.length}</p>`;
    const elsewhere = all.length - count;
    const hint = elsewhere > 0 ? `<p class="tb-hint">${elsewhere === 1 ? "Hay 1 tarea más" : `Hay ${elsewhere} tareas más`} fuera de este filtro: ⚙︎ Ajustes de tareas › Todos.</p>` : "";
    const body = shown
      .map(
        (g) =>
          `<h3 class="tb-group">${g.label}</h3>${g.tasks
            .map((t) => `<div class="tb-task"><div><b>${esc(t.title)}</b><span>${esc(t.detail)}</span></div><button class="tb-go" data-go="${esc(t.id)}" aria-label="Ir: ${esc(t.title)}">Ir</button></div>`)
            .join("")}`,
      )
      .join("");
    this.el.innerHTML = `${head}${scope}</div>${body || `<p class="tb-empty">${vehicle && !groupLabel ? NOTHING[vehicle] : "Nada pendiente"}</p>`}${hint}`;
  }

  /** The settings view: how «Ir» gets there, which vehicle, which group. */
  private settingsBody(all: Task[], here: Vehicle, groups: ReturnType<typeof groupTasks>, nShown: number): string {
    const travel = travelHtml("tb-s-travel");
    const vehicles = vehicleHtml("tb-s-vehicle", here, (v) => tasksIn(all, v).length);
    const chip = (id: TaskGroupId | null, text: string, k: number) => `<button class="chip ${this.group === id ? "on" : ""}" data-group="${id ?? ""}" aria-pressed="${this.group === id}">${text} <small>${k}</small></button>`;
    const chips = `<h3 class="tb-group">Grupo</h3><div class="chips tb-chips">${chip(null, "Todas", nShown)}${groups.map((g) => chip(g.id, g.label, g.tasks.length)).join("")}</div>`;
    return `<div class="tb-settings">${travel}${vehicles}${chips}</div>`;
  }
}
