import { placeNodes, type AreaMap, type AreaNode } from "@modules/tasks/application/areas";
import type { Vehicle } from "@modules/tasks/application/task-list";
import { settings } from "./settings-store";
import { ICON } from "./icons";
import { onCloseRequest, windowState } from "./hud-windows";
import { settingsClick, travelHtml, vehicleHtml, VEHICLE_NAME } from "./task-settings";
import "./task-board.css";
import "./areas-window.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export interface AreasDeps {
  /** The vehicle she is in now («Automático»). */
  here(): Vehicle;
  /** The schematic of a vehicle (undefined: not there, e.g. no Starship). */
  map(v: Vehicle): AreaMap | undefined;
  /** The node she is in now, to mark it «Aquí». */
  at?(): string | undefined;
  /** Take her there, by the real way or by teleport (the shared setting). */
  go(node: AreaNode, map: AreaMap): void;
}

/**
 * «Áreas» of the tree menu (Berón, 2026-11-17; docs/design/areas.md): the schematic of the vehicle she is in
 * (Starship, the station or the LM), like the navigation map abstracts ships and rocks: each area a node, the
 * hatches as lines. A tap on a node takes her there, walking the real way unless she chose teleport. Its gear
 * swaps the schematic for the shared settings (Viaje/Teletransporte and the vehicle, the same as the task list's)
 * and turns into a list icon that goes back.
 */
export class AreasWindow {
  private readonly el: HTMLElement;
  private view: "mapa" | "ajustes" = "mapa";
  private shown: AreaMap | undefined;

  constructor(
    root: HTMLElement,
    private readonly d: AreasDeps,
  ) {
    this.el = document.createElement("div");
    this.el.className = "board task-board areas-window hidden";
    this.el.setAttribute("role", "dialog");
    this.el.setAttribute("aria-label", "Áreas");
    root.appendChild(this.el);
    this.el.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-close]")) return this.close();
      if (t.closest("[data-view]")) {
        this.view = this.view === "mapa" ? "ajustes" : "mapa";
        this.render();
        return this.el.querySelector<HTMLElement>("[data-view]")?.focus();
      }
      if (settingsClick(t)) return this.render();
      const area = t.closest<HTMLElement>("[data-area]");
      const node = area && this.shown?.nodes.find((n) => n.id === area.dataset.area);
      if (node && this.shown) {
        const map = this.shown;
        this.close();
        this.d.go(node, map);
      }
    });
    window.addEventListener("keydown", (e) => this.visible && e.code === "Escape" && this.close());
    window.addEventListener("resize", () => this.visible && this.render());
    onCloseRequest("areas", () => this.close());
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }

  open(): void {
    this.view = "mapa";
    this.el.classList.remove("hidden");
    this.render();
    this.el.scrollTop = 0;
    document.body.classList.add("in-tasks");
    windowState("areas", true);
  }

  close(): void {
    if (!this.visible) return;
    this.el.classList.add("hidden");
    document.body.classList.remove("in-tasks");
    windowState("areas", false);
  }

  /** The vehicle shown: the setting, «Automático» (and «Todos», which a schematic cannot show) where she is. */
  private vehicle(): Vehicle {
    const f = settings.value.taskVehicle;
    return f === "auto" || f === "todos" ? this.d.here() : f;
  }

  private render(): void {
    const here = this.d.here();
    const v = this.vehicle();
    const settingsView = this.view === "ajustes";
    const toggle = settingsView
      ? `<button class="tb-view" data-view aria-label="Volver al mapa de áreas" title="Mapa de áreas">${ICON.tasks}</button>`
      : `<button class="tb-view" data-view aria-label="Ajustes de áreas" title="Ajustes de áreas">${ICON.gear}</button>`;
    const auto = settings.value.taskVehicle === "auto" || settings.value.taskVehicle === "todos";
    const travel = settings.value.taskTravel === "viaje" ? "Viaje: el camino real" : "Teletransporte";
    const scope = settingsView ? "" : `<p class="tb-scope">${VEHICLE_NAME[v]}${auto ? " (automático)" : ""} · ${travel}</p>`;
    const head = `<div class="board-head"><b>${settingsView ? "Ajustes de áreas" : "Áreas"}</b><span class="tb-head-btns">${toggle}<button data-close aria-label="Cerrar áreas">✕</button></span>${scope}</div>`;
    this.el.setAttribute("aria-label", settingsView ? "Ajustes de áreas" : "Áreas");
    if (settingsView) {
      this.shown = undefined;
      this.el.innerHTML = `${head}<div class="tb-settings">${travelHtml("ar-s-travel")}${vehicleHtml("ar-s-vehicle", here, undefined, false)}<small class="tb-travel-help">Los mismos ajustes que en Tareas.</small></div>`;
      return;
    }
    const map = this.d.map(v);
    this.shown = map;
    if (!map?.nodes.length) {
      this.el.innerHTML = `${head}<p class="tb-empty">No hay plano de ${VEHICLE_NAME[v].toLowerCase()} ahora.</p>`;
      return;
    }
    // The schematic fills the window's width; its height follows the plan's shape, within the screen.
    this.el.innerHTML = `${head}<div class="ar-map"></div><p class="tb-hint">Toca un área para ir${settings.value.taskTravel === "viaje" ? " por el camino real" : " al momento"}.</p>`;
    const box = this.el.querySelector<HTMLElement>(".ar-map")!;
    const width = Math.max(200, box.clientWidth);
    const height = Math.round(Math.min(Math.max(260, width * 1.1), innerHeight * 0.62));
    const placed = placeNodes(map, width, height, 44, 6, 64);
    const at = this.d.at?.();
    const centre = new Map(placed.nodes.map((p) => [p.node.id, { x: p.left + p.width / 2, y: p.top + p.height / 2 }]));
    const lines = map.links
      .map(([a, b]) => {
        const p = centre.get(a);
        const q = centre.get(b);
        return p && q ? `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${q.x.toFixed(1)}" y2="${q.y.toFixed(1)}"/>` : "";
      })
      .join("");
    const nodes = placed.nodes
      .map((p) => {
        const here2 = p.node.id === at;
        // «Harmony (Nodo 2)»: the name on the node, what it is under it with its code.
        const m = /^(.*?)\s*\((.*)\)$/.exec(p.node.label);
        const name = m ? m[1]! : p.node.label;
        const sub = [m?.[2], p.node.code].filter(Boolean).join(" · ");
        return `<button class="ar-node${here2 ? " here" : ""}" data-area="${esc(p.node.id)}" aria-label="Ir a ${esc(p.node.label)}${here2 ? " (aquí)" : ""}" style="left:${p.left.toFixed(1)}px;top:${p.top.toFixed(1)}px;width:${p.width.toFixed(1)}px;height:${p.height.toFixed(1)}px"><b>${esc(name)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}${here2 ? `<em>Aquí</em>` : ""}</button>`;
      })
      .join("");
    box.style.height = `${Math.ceil(placed.height)}px`;
    box.innerHTML = `<svg class="ar-links" width="${width}" height="${Math.ceil(placed.height)}" aria-hidden="true">${lines}</svg>${nodes}`;
  }
}
