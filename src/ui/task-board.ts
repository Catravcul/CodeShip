import { groupTasks, type Task, type TaskGroupId } from "@modules/tasks/application/task-list";
import "./task-board.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * The task board with every task of the game (docs/design/habitaculo.md §Tareas), grouped (flight first),
 * each with «Ir» that takes her to the machine or the vehicle where it is done. Opened from the
 * «Tareas» button of the travel ship, the lander's cabin and the station.
 */
export class TaskBoard {
  private readonly el: HTMLElement;
  private group: TaskGroupId | null = null;
  private tasks: Task[] = [];
  /** Takes her to the task's place (set by main.ts). */
  onGo?: (t: Task) => void;

  constructor(
    root: HTMLElement,
    private readonly source: () => Task[],
  ) {
    this.el = document.createElement("div");
    this.el.className = "board task-board hidden";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-label", "Tareas");
    root.appendChild(this.el);
    this.el.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-close]")) return this.close();
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
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  open(group: TaskGroupId | null = null): void {
    this.group = group;
    this.render();
    this.el.classList.remove("hidden");
    document.body.classList.add("in-tasks");
  }

  close(): void {
    this.el.classList.add("hidden");
    document.body.classList.remove("in-tasks");
  }

  private render(): void {
    this.tasks = this.source();
    const groups = groupTasks(this.tasks);
    if (this.group && !groups.some((g) => g.id === this.group)) this.group = null;
    const chip = (id: TaskGroupId | null, label: string, n: number) => `<button class="chip ${this.group === id ? "on" : ""}" data-group="${id ?? ""}">${label} <small>${n}</small></button>`;
    const chips = `<div class="chips">${chip(null, "Todas", this.tasks.length)}${groups.map((g) => chip(g.id, g.label, g.tasks.length)).join("")}</div>`;
    const body = groups
      .filter((g) => !this.group || g.id === this.group)
      .map(
        (g) =>
          `<h3 class="tb-group">${g.label}</h3>${g.tasks
            .map((t) => `<div class="tb-task"><div><b>${esc(t.title)}</b><span>${esc(t.detail)}</span></div><button class="tb-go" data-go="${esc(t.id)}" aria-label="Ir: ${esc(t.title)}">Ir</button></div>`)
            .join("")}`,
      )
      .join("");
    this.el.innerHTML = `<div class="board-head"><b>Tareas</b><button data-close aria-label="Cerrar tareas">✕</button>${chips}</div>${body || "<p>Nada pendiente</p>"}`;
  }
}
