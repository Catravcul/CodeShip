import type { AreaMap, AreaNode, AreaVec } from "@modules/tasks/application/areas";
import type { Vehicle } from "@modules/tasks/application/task-list";
import { settings } from "./settings-store";
import { onCloseRequest, windowState } from "./hud-windows";
import { settingsClick, travelHtml, vehicleHtml, VEHICLE_NAME } from "./task-settings";
import { MapWindow, markPicked, optionsHtml, type MapOption } from "./map-window";
import { MapSelection, nearestPick, orbitProjector } from "./map-window-model";
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

interface Pt {
  x: number;
  y: number;
}

/** The convex hull of a box's projected corners (monotone chain), to fill it and to pick it. */
function hull(ps: Pt[]): Pt[] {
  const p = [...ps].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: Pt[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop();
    lo.push(q);
  }
  const hi: Pt[] = [];
  for (const q of p.reverse()) {
    while (hi.length >= 2 && cross(hi[hi.length - 2]!, hi[hi.length - 1]!, q) <= 0) hi.pop();
    hi.push(q);
  }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)];
}

const inside = (h: Pt[], x: number, y: number) => {
  let c = false;
  for (let i = 0, j = h.length - 1; i < h.length; j = i++) {
    const a = h[i]!;
    const b = h[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
};

/** «Harmony (Nodo 2)» → name «Harmony», what it is «Nodo 2». */
const split = (label: string) => {
  const m = /^(.*?)\s*\((.*)\)$/.exec(label);
  return { name: m ? m[1]! : label, sub: m?.[2] };
};

/**
 * «Áreas» of the tree menu (Berón, 2026-11-18; reglas.md §5.8, docs/design/areas.md): the map window
 * (map-window.ts), the same as Navigation. On top, a 3D map of the vehicle she is in (Starship, the station or
 * the LM), each area a box of the real plan and the hatches as lines; a finger drags to turn it and pinches to
 * zoom (reglas.md §5.7, its one exception), and so do its joystick and its + / − buttons. Under it, the areas
 * with what is there and «Ir», which takes her there walking the real way unless she chose teleport. Its gear
 * swaps both for the shared settings (Viaje/Teletransporte and the vehicle, the same as the task list's) and
 * turns into a list icon that goes back. It covers the screen, so the tree menu hides while it is open.
 */
export class AreasWindow {
  private readonly win: MapWindow;
  private readonly el: HTMLElement;
  private readonly side: HTMLElement;
  private shown: AreaMap | undefined;
  private readonly sel = new MapSelection(() => this.shown?.nodes.map((n) => ({ id: n.id })) ?? []);
  private screen: { id: string; hull: Pt[]; c: Pt; depth: number }[] = [];

  constructor(
    root: HTMLElement,
    private readonly d: AreasDeps,
  ) {
    this.win = new MapWindow(root, {
      className: "areas-window",
      label: "Áreas",
      canvasLabel: "Mapa del vehículo",
      hint: "Arrastra para girar · toca un área",
      view: { yaw: 0.6, elevation: 0.75, zoom: 1 },
      limits: { turnPerPx: 0.01, minElevation: 0.1, minZoom: 0.5, maxZoom: 8 },
      gear: { className: "ar-view", label: "Ajustes de áreas", backLabel: "Volver al mapa de áreas", settingsClass: "ar-settings tb-settings" },
      closeLabel: "Cerrar áreas",
      side: `<div class="nav-card ar-side"></div>`,
      draw: (g, w, h) => this.draw(g, w, h),
      tap: (x, y) => this.pickAt(x, y),
      click: (t) => this.onClick(t),
      onClose: () => this.close(),
      settings: () => this.render(),
    });
    this.el = this.win.el;
    this.side = this.el.querySelector(".ar-side")!;
    window.addEventListener("keydown", (e) => this.visible && e.code === "Escape" && this.close());
    window.addEventListener("resize", () => this.visible && this.win.draw());
    onCloseRequest("areas", () => this.close());
  }

  get visible(): boolean {
    return this.win.visible;
  }

  /** How the map is seen and what is picked (read by the journeys, tools/experiencia/tareas-ajustes.mjs). */
  get yaw(): number {
    return this.win.view.yaw;
  }
  get elevation(): number {
    return this.win.view.elevation;
  }
  get zoom(): number {
    return this.win.view.zoom;
  }
  get picked(): string | undefined {
    return this.sel.picked;
  }

  open(): void {
    this.win.showSettings(false);
    this.sel.clear();
    const at = this.d.at?.();
    this.win.view.zoom = 1;
    this.win.show(true);
    document.body.classList.add("in-areas");
    windowState("areas", true);
    this.render();
    // Where she is, picked (once the map is known).
    if (at) {
      this.sel.pick(at);
      this.renderSide(false);
    }
  }

  close(): void {
    if (!this.visible) return;
    this.win.show(false);
    document.body.classList.remove("in-areas");
    windowState("areas", false);
  }

  /** The vehicle shown: the setting, «Automático» (and «Todos», which one map cannot show) where she is. */
  private vehicle(): Vehicle {
    const f = settings.value.taskVehicle;
    return f === "auto" || f === "todos" ? this.d.here() : f;
  }

  private onClick(t: HTMLElement): void {
    if (settingsClick(t)) return this.render();
    const pick = t.closest<HTMLElement>("[data-pick]");
    if (pick) {
      this.sel.pick(pick.dataset.pick);
      return this.renderSide(false);
    }
    const area = t.closest<HTMLElement>("[data-area]");
    const node = area && this.shown?.nodes.find((n) => n.id === area.dataset.area);
    if (node && this.shown) {
      const map = this.shown;
      this.close();
      this.d.go(node, map);
    }
  }

  private render(): void {
    const settingsView = this.win.settingsShown;
    this.el.setAttribute("aria-label", settingsView ? "Ajustes de áreas" : "Áreas");
    this.el.classList.toggle("ar-in-settings", settingsView);
    if (settingsView) {
      this.win.settingsBox!.innerHTML = `<h2 class="ar-title">Ajustes de áreas</h2>${travelHtml("ar-s-travel")}${vehicleHtml("ar-s-vehicle", this.d.here(), undefined, false)}<small class="tb-travel-help">Los mismos ajustes que en Tareas.</small>`;
      return;
    }
    this.shown = this.d.map(this.vehicle());
    this.sel.keep();
    this.renderSide(true);
    this.win.draw();
  }

  /** The list under the map: what the map shows, then each area with what is there and «Ir». */
  private renderSide(rebuild: boolean): void {
    const v = this.vehicle();
    const map = this.shown;
    const auto = settings.value.taskVehicle === "auto" || settings.value.taskVehicle === "todos";
    const travel = settings.value.taskTravel === "viaje" ? "Viaje: el camino real" : "Teletransporte";
    const at = this.d.at?.();
    if (rebuild) {
      const scope = `<p class="tb-scope">${VEHICLE_NAME[v]}${auto ? " (automático)" : ""} · ${travel}</p>`;
      if (!map?.nodes.length) {
        this.side.innerHTML = `${scope}<p class="tb-empty">No hay plano de ${VEHICLE_NAME[v].toLowerCase()} ahora.</p>`;
        return;
      }
      const options: MapOption[] = map.nodes.map((n) => {
        const { name, sub } = split(n.label);
        const here = n.id === at;
        return {
          id: n.id,
          name,
          tag: here ? "Aquí" : undefined,
          sub: [sub, n.code].filter(Boolean).join(" · ") || undefined,
          desc: n.desc,
          action: "Ir",
          actionLabel: `Ir a ${n.label}${here ? " (aquí)" : ""}`,
          pickLabel: `Ver ${n.label} en el mapa`,
        };
      });
      this.side.innerHTML = `${scope}<div class="ar-list mw-list">${optionsHtml(options, { cls: "ar", goAttr: "area" })}</div>`;
    }
    markPicked(this.side, this.sel.picked);
    this.win.draw();
  }

  private pickAt(px: number, py: number): void {
    // The nearest box under the finger, else the nearest centre within a fingertip.
    const under = this.screen.filter((s) => inside(s.hull, px, py)).sort((a, b) => b.depth - a.depth)[0];
    const near = nearestPick(this.screen.map((s) => ({ s, x: s.c.x, y: s.c.y })), px, py, 28)?.s;
    const hit = near ?? under;
    if (!hit) return;
    this.sel.pick(hit.id);
    this.renderSide(false);
    this.side.querySelector(`[data-row="${CSS.escape(hit.id)}"]`)?.scrollIntoView({ block: "nearest" });
  }

  private draw(g: CanvasRenderingContext2D, w: number, h: number): void {
    const map = this.shown;
    this.screen = [];
    if (!this.visible || !map?.nodes.length) return;
    const chosen = this.sel.picked;
    // The map turns round the middle of the vehicle and fits it at zoom 1.
    const lo = { x: Infinity, y: Infinity, z: Infinity };
    const hi = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const n of map.nodes)
      for (const k of ["x", "y", "z"] as const) {
        lo[k] = Math.min(lo[k], n.centre[k] - n.half[k]);
        hi[k] = Math.max(hi[k], n.centre[k] + n.half[k]);
      }
    const o = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2, z: (lo.z + hi.z) / 2 };
    const R = Math.max(0.5, Math.hypot(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z) / 2);
    const s = ((0.48 * Math.min(w, h)) / R) * this.win.view.zoom;
    const P: (p: AreaVec) => Pt & { depth: number } = orbitProjector(this.win.view, s, w / 2, h / 2, o);
    // The floor under it all, as a faint grid.
    g.lineWidth = 1;
    g.strokeStyle = "#7fdcff1f";
    const step = Math.max(0.5, Math.round(R / 4));
    for (let x = Math.floor(lo.x / step) * step; x <= hi.x + 1e-6; x += step) {
      const a = P({ x, y: lo.y, z: lo.z });
      const b = P({ x, y: lo.y, z: hi.z });
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    for (let z = Math.floor(lo.z / step) * step; z <= hi.z + 1e-6; z += step) {
      const a = P({ x: lo.x, y: lo.y, z });
      const b = P({ x: hi.x, y: lo.y, z });
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    // The hatches that join the areas.
    const byId = new Map(map.nodes.map((n) => [n.id, n]));
    g.strokeStyle = "#7fdcff88";
    g.lineWidth = 2;
    g.setLineDash([5, 4]);
    for (const [a, b] of map.links) {
      const na = byId.get(a);
      const nb = byId.get(b);
      if (!na || !nb) continue;
      const p = P(na.centre);
      const q = P(nb.centre);
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(q.x, q.y);
      g.stroke();
    }
    g.setLineDash([]);
    // The areas, far ones first; the one she is in in green, the one picked in gold.
    const at = this.d.at?.();
    const boxes = map.nodes
      .map((n) => {
        const corners: (Pt & { depth: number })[] = [];
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push(P({ x: n.centre.x + sx * n.half.x, y: n.centre.y + sy * n.half.y, z: n.centre.z + sz * n.half.z }));
        const c0 = P(n.centre);
        return { n, corners, c: c0, depth: c0.depth };
      })
      .sort((a, b) => a.depth - b.depth);
    const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]] as const;
    for (const b of boxes) {
      const picked = b.n.id === chosen;
      const here = b.n.id === at;
      const hl = hull(b.corners);
      g.beginPath();
      hl.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.closePath();
      g.fillStyle = picked ? "#ffd23f3a" : here ? "#9fe8c430" : "#58d6ff1c";
      g.fill();
      g.strokeStyle = picked ? "#ffd23f" : here ? "#9fe8c4" : "#7fdcffaa";
      g.lineWidth = picked ? 2 : 1;
      g.beginPath();
      for (const [i, j] of EDGES) {
        g.moveTo(b.corners[i]!.x, b.corners[i]!.y);
        g.lineTo(b.corners[j]!.x, b.corners[j]!.y);
      }
      g.stroke();
      this.screen.push({ id: b.n.id, hull: hl, c: b.c, depth: b.depth });
    }
    // Names on top, each at its box's middle: the picked one and hers first, then the nearest; a name that would
    // cover one already written is left out (its box and its row in the list still say it).
    g.textAlign = "center";
    g.textBaseline = "middle";
    const written: { l: number; r: number; t: number; b: number }[] = [];
    const rank = (b: (typeof boxes)[number]) => (b.n.id === chosen ? 2 : b.n.id === at ? 1 : 0);
    for (const b of [...boxes].sort((p, q) => rank(q) - rank(p) || q.depth - p.depth)) {
      const picked = b.n.id === chosen;
      const here = b.n.id === at;
      const text = split(b.n.label).name + (here ? " · aquí" : "");
      g.font = `${picked ? "700 " : ""}12px system-ui, sans-serif`;
      const half = g.measureText(text).width / 2 + 2;
      const box = { l: b.c.x - half, r: b.c.x + half, t: b.c.y - 8, b: b.c.y + 8 };
      if (written.some((o) => box.l < o.r && o.l < box.r && box.t < o.b && o.t < box.b)) continue;
      written.push(box);
      g.lineWidth = 3;
      g.strokeStyle = "#02060acc";
      g.strokeText(text, b.c.x, b.c.y);
      g.fillStyle = picked ? "#ffd23f" : here ? "#c9ffe0" : "#d8f6ff";
      g.fillText(text, b.c.x, b.c.y);
    }
  }
}
