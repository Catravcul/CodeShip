import { asteroidDecor, baseRings, MapWindow, markPicked, optionsHtml, outlinePath, type MapOption } from "./map-window";
import { MapSelection, nearestPick, orbitProjector, type MapVec } from "./map-window-model";
import "./task-board.css";

/** One island as the navigation machine shows it: its box on the plan and how to fly there from here. */
export interface IslandChoice {
  readonly id: string;
  readonly name: string;
  readonly desc: string;
  /** «Helicóptero · 52 s», «Alfombra y helicóptero · 1 min 20 s». */
  readonly how?: string;
  /** Why she cannot fly there («Estás aquí»). */
  readonly locked?: string;
  readonly here: boolean;
  /** Its deck on the plan, m (the sanctuary's frame, y up). */
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
  readonly y: number;
  /** Its pad, where the flight lands. */
  readonly pad: MapVec;
}

/** How an island flight is flown (reglas.md §3.6): programmed as a challenge and flown by itself, or by hand. */
export type FlightMode = "reto" | "manual";
const MODE_KEY = "codeship.s3.modo-vuelo";
export const FLIGHT_MODE_TEXT: Readonly<Record<FlightMode, string>> = { reto: "Por reto", manual: "Manual" };

/** The flight mode chosen in the window's gear (kept on this device). */
export function flightMode(): FlightMode {
  try {
    return localStorage.getItem(MODE_KEY) === "manual" ? "manual" : "reto";
  } catch {
    return "reto";
  }
}
export function setFlightMode(m: FlightMode): void {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* private mode: only for this visit */
  }
}

/**
 * The navigation machine of an island (Berón, 2026-11-18; santuario3-iniciacion.md §3): the map window (map-window.ts),
 * the same model as Navigation, Áreas and the start screen. On top the islands of the sanctuary on a 3D plan, hers in
 * green and the flights from her pad as dashed lines; under it each island with what is there, how she flies there and
 * «Volar». The flight is seen (no teleport): the window only chooses it.
 */
export class IslandNavWindow {
  private readonly win: MapWindow;
  private readonly side: HTMLElement;
  private islands: readonly IslandChoice[] = [];
  private readonly sel = new MapSelection(() => this.islands.map((i) => ({ id: i.id, ...(i.locked ? { locked: i.locked } : {}) })));
  private screen: { id: string; x: number; y: number }[] = [];
  /** «Volar» to an island. */
  onFly?: (id: string) => void;

  constructor(root: HTMLElement) {
    this.win = new MapWindow(root, {
      className: "island-nav",
      label: "Navegación entre islas",
      canvasLabel: "Plano de las islas",
      hint: "Arrastra para girar · toca una isla",
      view: { yaw: 0.5, elevation: 0.9, zoom: 1 },
      limits: { turnPerPx: 0.01, minElevation: 0.15, minZoom: 0.5, maxZoom: 10 },
      gear: { className: "in-gear", label: "Ajustes del vuelo", backLabel: "Volver a las islas", settingsClass: "in-settings tb-settings" },
      settings: () => this.render(),
      closeLabel: "Cerrar navegación",
      side: `<div class="nav-card in-side"></div>`,
      draw: (g, w, h) => this.draw(g, w, h),
      tap: (x, y) => this.pickAt(x, y),
      click: (t) => this.onClick(t),
      onClose: () => this.close(),
    });
    this.side = this.win.el.querySelector(".in-side")!;
    window.addEventListener("keydown", (e) => this.visible && e.code === "Escape" && this.close());
    window.addEventListener("resize", () => this.visible && this.win.draw());
  }

  get visible(): boolean {
    return this.win.visible;
  }

  get picked(): string | undefined {
    return this.sel.picked;
  }

  open(islands: readonly IslandChoice[]): void {
    this.win.showSettings(false);
    this.islands = islands;
    this.sel.clear();
    this.win.view.zoom = 1;
    this.win.show(true);
    document.body.classList.add("in-island-nav");
    this.render();
  }

  close(): void {
    if (!this.visible) return;
    this.win.show(false);
    document.body.classList.remove("in-island-nav");
  }

  private render(): void {
    if (this.win.settingsShown) {
      const now = flightMode();
      this.win.settingsBox!.innerHTML = `<h2 class="ar-title">Ajustes del vuelo</h2><h3 class="tb-group" id="in-s-mode">Modo de vuelo</h3><div class="tb-travel" role="radiogroup" aria-labelledby="in-s-mode">${(["reto", "manual"] as const).map((m) => `<button role="radio" data-mode="${m}" aria-checked="${m === now}" class="${m === now ? "on" : ""}">${FLIGHT_MODE_TEXT[m]}</button>`).join("")}</div><small class="tb-travel-help">${now === "reto" ? "Se programa el vuelo con un reto de código y el piloto automático lo vuela; se ve entero y la cámara gira" : "Pilotas tú: cíclico, colectivo y pedales en los botones; se aterriza despacio en el helipuerto o el andén"}</small>`;
      return;
    }
    const options: MapOption[] = this.islands.map((i) => ({
      id: i.id,
      name: i.name,
      ...(i.here ? { tag: "Aquí" } : {}),
      ...(i.how ? { sub: i.how } : {}),
      desc: i.desc,
      action: "Volar",
      actionLabel: `Volar a ${i.name}`,
      pickLabel: `Ver ${i.name} en el plano`,
      ...(i.locked ? { locked: i.locked } : {}),
    }));
    this.side.innerHTML = `<p class="tb-scope">Vuelos desde esta isla · ${FLIGHT_MODE_TEXT[flightMode()]} (engranaje) · se ve el vuelo entero</p><div class="mw-list">${optionsHtml(options, { cls: "in", goAttr: "fly" })}</div>`;
    markPicked(this.side, this.sel.picked);
    this.win.draw();
  }

  private onClick(t: HTMLElement): void {
    const mode = t.closest<HTMLElement>("[data-mode]");
    if (mode) {
      setFlightMode(mode.dataset.mode === "manual" ? "manual" : "reto");
      return this.render();
    }
    const pick = t.closest<HTMLElement>("[data-pick]");
    if (pick) {
      this.sel.pick(pick.dataset.pick);
      markPicked(this.side, this.sel.picked);
      return this.win.draw();
    }
    const fly = t.closest<HTMLButtonElement>("[data-fly]");
    if (fly && !fly.disabled) {
      const r = this.sel.act(fly.dataset.fly);
      if (!r.ok) return;
      this.close();
      this.onFly?.(r.id);
    }
  }

  private pickAt(px: number, py: number): void {
    const hit = nearestPick(this.screen, px, py, 40);
    if (!hit || !this.sel.pick(hit.id)) return;
    markPicked(this.side, this.sel.picked);
    this.side.querySelector(`[data-row="${CSS.escape(hit.id)}"]`)?.scrollIntoView({ block: "nearest" });
    this.win.draw();
  }

  private draw(g: CanvasRenderingContext2D, w: number, h: number): void {
    this.screen = [];
    if (!this.visible || !this.islands.length) return;
    const lo = { x: Infinity, z: Infinity };
    const hi = { x: -Infinity, z: -Infinity };
    for (const i of this.islands) {
      lo.x = Math.min(lo.x, i.x0);
      lo.z = Math.min(lo.z, i.z0);
      hi.x = Math.max(hi.x, i.x1);
      hi.z = Math.max(hi.z, i.z1);
    }
    const o = { x: (lo.x + hi.x) / 2, y: 0, z: (lo.z + hi.z) / 2 };
    const R = Math.max(50, Math.hypot(hi.x - lo.x, hi.z - lo.z) / 2);
    const s = ((0.46 * Math.min(w, h)) / R) * this.win.view.zoom;
    const P = orbitProjector(this.win.view, s, w / 2, h / 2, o);
    asteroidDecor(g, P, o, R);
    // A closed piece, like the start screen (Berón, 2026-11-20): the sea as rings round the middle.
    baseRings(g, P, o, R);
    const outline = (cx: number, cy: number, cz: number, rx: number, rz: number) => outlinePath(g, P, { x: cx, y: cy, z: cz }, rx, rz);
    // The flights from her island: dashed, from her pad to each island's.
    const here = this.islands.find((i) => i.here);
    if (here) {
      g.setLineDash([6, 5]);
      g.lineWidth = 2;
      for (const i of this.islands) {
        if (i.here || i.locked) continue;
        const a = P(here.pad);
        const b = P(i.pad);
        g.strokeStyle = i.id === this.sel.picked ? "#ffd23f" : "#7fdcff77";
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
      g.setLineDash([]);
    }
    // Each island: its deck as an outline round a sphere on a stalk from the sea, far ones first.
    const order = this.islands.map((i) => ({ i, c: P({ x: (i.x0 + i.x1) / 2, y: i.y, z: (i.z0 + i.z1) / 2 }) })).sort((a, b) => a.c.depth - b.c.depth);
    for (const { i, c } of order) {
      const picked = i.id === this.sel.picked;
      const col = picked ? "#ffd23f" : i.here ? "#9fe8c4" : i.locked ? "#6c7a86" : "#58d6ff";
      outline((i.x0 + i.x1) / 2, i.y, (i.z0 + i.z1) / 2, (i.x1 - i.x0) / 2, (i.z1 - i.z0) / 2);
      g.strokeStyle = `${col}aa`;
      g.lineWidth = picked ? 2 : 1;
      g.stroke();
      const foot = P({ x: (i.x0 + i.x1) / 2, y: 0, z: (i.z0 + i.z1) / 2 });
      g.strokeStyle = "#ffffff33";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(c.x, c.y);
      g.lineTo(foot.x, foot.y);
      g.stroke();
      g.beginPath();
      g.arc(c.x, c.y, picked ? 6 : 4.5, 0, Math.PI * 2);
      g.fillStyle = col;
      g.fill();
      this.screen.push({ id: i.id, x: c.x, y: c.y });
    }
    // Names, the picked one and hers first; one that would cover another is left out (the list says it).
    g.textAlign = "center";
    g.textBaseline = "bottom";
    const written: { l: number; r: number; t: number; b: number }[] = [];
    const rank = (i: IslandChoice) => (i.id === this.sel.picked ? 2 : i.here ? 1 : 0);
    for (const i of [...this.islands].sort((a, b) => rank(b) - rank(a))) {
      const c = this.screen.find((p) => p.id === i.id)!;
      const text = i.name + (i.here ? " · aquí" : "");
      g.font = `${i.id === this.sel.picked ? "700 " : ""}12px system-ui, sans-serif`;
      const half = g.measureText(text).width / 2 + 2;
      const box = { l: c.x - half, r: c.x + half, t: c.y - 22, b: c.y - 6 };
      if (written.some((q) => box.l < q.r && q.l < box.r && box.t < q.b && q.t < box.b)) continue;
      written.push(box);
      g.lineWidth = 3;
      g.strokeStyle = "#02060acc";
      g.strokeText(text, c.x, c.y - 7);
      g.fillStyle = i.id === this.sel.picked ? "#ffd23f" : i.here ? "#c9ffe0" : "#d8f6ff";
      g.fillText(text, c.x, c.y - 7);
    }
  }
}
