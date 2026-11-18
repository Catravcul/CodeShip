import { MapWindow, markPicked, optionsHtml, type MapOption } from "./map-window";
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
    this.side.innerHTML = `<p class="tb-scope">Vuelos desde esta isla · se ve el vuelo entero</p><div class="mw-list">${optionsHtml(options, { cls: "in", goAttr: "fly" })}</div>`;
    markPicked(this.side, this.sel.picked);
    this.win.draw();
  }

  private onClick(t: HTMLElement): void {
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
    // The sea, as a faint grid every 250 m.
    g.lineWidth = 1;
    g.strokeStyle = "#7fdcff1a";
    for (let x = Math.floor(lo.x / 250) * 250; x <= hi.x; x += 250) {
      const a = P({ x, y: 0, z: lo.z });
      const b = P({ x, y: 0, z: hi.z });
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    for (let z = Math.floor(lo.z / 250) * 250; z <= hi.z; z += 250) {
      const a = P({ x: lo.x, y: 0, z });
      const b = P({ x: hi.x, y: 0, z });
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
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
    // Each island: its deck as a filled outline, at least a few px across so a small one still shows.
    for (const i of this.islands) {
      const picked = i.id === this.sel.picked;
      const corners = [P({ x: i.x0, y: i.y, z: i.z0 }), P({ x: i.x1, y: i.y, z: i.z0 }), P({ x: i.x1, y: i.y, z: i.z1 }), P({ x: i.x0, y: i.y, z: i.z1 })];
      g.beginPath();
      corners.forEach((p, k) => (k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.closePath();
      g.fillStyle = picked ? "#ffd23f40" : i.here ? "#9fe8c440" : "#58d6ff26";
      g.fill();
      g.strokeStyle = picked ? "#ffd23f" : i.here ? "#9fe8c4" : "#7fdcffaa";
      g.lineWidth = picked ? 2 : 1;
      g.stroke();
      const c = P({ x: (i.x0 + i.x1) / 2, y: i.y, z: (i.z0 + i.z1) / 2 });
      g.beginPath();
      g.arc(c.x, c.y, 4, 0, Math.PI * 2);
      g.fillStyle = picked ? "#ffd23f" : i.here ? "#9fe8c4" : "#d8f6ff";
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
