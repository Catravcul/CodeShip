import { levelChoices, type Level, type LevelChoice, type SavedGame } from "@modules/levels/domain/level";
import { MapWindow, markPicked, optionsHtml, type MapOption } from "./map-window";
import { MapSelection, nearestPick, orbitProjector, type MapPoint } from "./map-window-model";
import "./start-screen.css";

interface Box {
  l: number;
  r: number;
  t: number;
  b: number;
}

const overlaps = (a: Box, o: Box) => a.l < o.r && o.l < a.r && a.t < o.b && o.t < a.b;

/** Half the height of the level axis, in map units (levels.ts `at`). */
const AXIS_R = 3.8;

/**
 * The start screen (Berón, 2026-11-18; docs/design/santuario3-iniciacion.md §5): the map window with the six
 * sanctuaries on Cold Sanctuary's «depth = danger» axis on top, and a card for each under it. It shows on every
 * load, before the game. Only 6 starts (with «Continuar» when there is a kept game); 3 shows its card, being
 * built; the others come later. No tree menu here: there is no game yet.
 */
export class StartScreen {
  private readonly win: MapWindow;
  private readonly list: HTMLElement;
  private readonly choices: readonly LevelChoice[];
  private readonly sel: MapSelection;
  private screen: { id: string; x: number; y: number }[] = [];

  constructor(
    root: HTMLElement,
    private readonly levels: readonly Level[],
    save: SavedGame | undefined,
    private readonly play: (level: Level) => void,
  ) {
    this.choices = levelChoices(levels, save);
    this.sel = new MapSelection(() => this.choices);
    this.win = new MapWindow(root, {
      className: "start-screen",
      label: "Codeship · elegir santuario",
      title: "Codeship",
      canvasLabel: "Mapa de los santuarios: arriba el espacio, abajo el núcleo",
      hint: "Arrastra para girar · toca un santuario",
      view: { yaw: 0.5, elevation: 0.32, zoom: 1 },
      limits: { turnPerPx: 0.01, minElevation: 0.05, minZoom: 0.6, maxZoom: 4 },
      side: `<div class="nav-card ss-side"><p class="ss-intro">Elige santuario. Cuanto más hondo, más peligro.</p><div class="mw-list ss-list"></div><p class="ss-src">Del 1 al 5, los santuarios de Cold Sanctuary (docs/world-topology-and-planes.md §3); el 6 es de Codeship. Mundos de ficción.</p></div>`,
      draw: (g, w, h) => this.draw(g, w, h),
      tap: (x, y) => {
        const hit = nearestPick(this.screen, x, y, 32);
        if (hit && this.sel.pick(hit.id)) this.mark(true);
      },
      click: (t) => this.onClick(t),
    });
    this.list = this.win.el.querySelector(".ss-list")!;
    // The cards in the map's order, from space at the top down to the core: the playable one first.
    const options: MapOption[] = [...levels].sort((a, b) => b.at.y - a.at.y).map((l) => {
      const c = this.choices.find((x) => x.id === l.id)!;
      return {
        id: l.id,
        name: `${l.number} · ${l.name}`,
        sub: `Peligro ${l.danger} · ${l.topology}`,
        desc: l.desc,
        action: c.action,
        actionLabel: `${c.action}: ${l.name}${c.locked ? ` (${c.locked})` : ""}`,
        pickLabel: `Ver ${l.name} en el mapa`,
        selectable: c.selectable,
        locked: c.locked,
      };
    });
    this.list.innerHTML = optionsHtml(options, { cls: "ss" });
    // The playable level is picked to start with (with a kept game, its level).
    this.sel.pick(this.choices.find((c) => c.action === "Continuar")?.id ?? this.choices.find((c) => !c.locked)?.id);
    window.addEventListener("resize", this.onResize);
  }

  private readonly onResize = () => this.win.visible && this.win.draw();

  get visible(): boolean {
    return this.win.visible;
  }

  /** How the map is seen, what is picked and where each node is drawn (read by tools/experiencia/inicio.mjs). */
  get state(): { yaw: number; elevation: number; zoom: number; picked: string | undefined; nodes: { id: string; x: number; y: number }[] } {
    const r = this.win.canvas.getBoundingClientRect();
    return { ...this.win.view, picked: this.sel.picked, nodes: this.screen.map((n) => ({ id: n.id, x: r.left + n.x, y: r.top + n.y })) };
  }

  open(): void {
    this.win.show(true);
    document.body.classList.add("in-start");
    this.mark(false);
  }

  /** Gone for good: the game is starting. */
  close(): void {
    window.removeEventListener("resize", this.onResize);
    document.body.classList.remove("in-start");
    this.win.el.remove();
  }

  private onClick(t: HTMLElement): void {
    const pick = t.closest<HTMLElement>("[data-pick]");
    if (pick) {
      if (this.sel.pick(pick.dataset.pick)) this.mark(false);
      return;
    }
    const go = t.closest<HTMLElement>("[data-go]");
    if (!go) return;
    const r = this.sel.act(go.dataset.go);
    const level = r.ok ? this.levels.find((l) => l.id === r.id) : undefined;
    if (level) this.play(level);
  }

  private mark(scroll: boolean): void {
    markPicked(this.list, this.sel.picked);
    if (scroll && this.sel.picked) this.list.querySelector(`[data-row="${CSS.escape(this.sel.picked)}"]`)?.scrollIntoView({ block: "nearest" });
    this.win.draw();
  }

  private draw(g: CanvasRenderingContext2D, w: number, h: number): void {
    this.screen = [];
    const view = this.win.view;
    const s = ((0.4 * Math.min(w * 1.1, h)) / AXIS_R) * view.zoom;
    const P = orbitProjector(view, s, w / 2, h * 0.47);
    // The ground (sea level) as rings: the land's plane, with the axis through it.
    g.lineWidth = 1;
    for (const r of [1, 2, 3]) {
      g.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const p = P({ x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r });
        if (i) g.lineTo(p.x, p.y);
        else g.moveTo(p.x, p.y);
      }
      g.strokeStyle = r === 3 ? "#9fe8c455" : "#7fdcff22";
      g.setLineDash(r === 3 ? [] : [4, 6]);
      g.stroke();
    }
    g.setLineDash([]);
    // The «depth = danger» axis: from the core to space, its colour from calm to danger.
    const top = P({ x: 0, y: AXIS_R, z: 0 });
    const bottom = P({ x: 0, y: -AXIS_R, z: 0 });
    const grad = g.createLinearGradient(top.x, top.y, bottom.x, bottom.y);
    grad.addColorStop(0, "#7fdcff");
    grad.addColorStop(0.5, "#9fe8c4");
    grad.addColorStop(1, "#ff6b5a");
    g.strokeStyle = grad;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(top.x, top.y);
    g.lineTo(bottom.x, bottom.y);
    g.stroke();
    g.font = "11px ui-monospace, Menlo, monospace";
    g.fillStyle = "#ff8a7a";
    g.textAlign = "right";
    // The hint's corner is taken: no text over it.
    const hint = this.win.el.querySelector(".nav-hint")?.getBoundingClientRect();
    const box = this.win.canvas.getBoundingClientRect();
    const taken: Box[] = hint?.width ? [{ l: hint.left - box.left, r: hint.right - box.left, t: hint.top - box.top - 2, b: hint.bottom - box.top }] : [];
    const danger: Box = { l: bottom.x - 8 - g.measureText("más peligro ▼").width, r: bottom.x - 8, t: bottom.y - 10, b: bottom.y + 3 };
    if (!taken.some((o) => overlaps(danger, o))) {
      g.fillText("más peligro ▼", bottom.x - 8, bottom.y);
      taken.push(danger);
    }
    // The launch: from the air (3) up to space (6).
    const byId = new Map(this.levels.map((l) => [l.id, l]));
    const a3 = byId.get("aereo");
    const a6 = byId.get("espacio");
    if (a3 && a6) {
      const p = P(a3.at);
      const q = P(a6.at);
      g.setLineDash([5, 5]);
      g.strokeStyle = "#ffd27f99";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(q.x, q.y);
      g.stroke();
      g.setLineDash([]);
    }
    // Each sanctuary on its stalk from the ground, far ones first.
    const nodes = this.levels.map((l, i) => ({ l, c: this.choices[i]!, p: P(l.at) })).sort((a, b) => a.p.depth - b.p.depth);
    for (const { l, c, p } of nodes) this.drawNode(g, l, c.locked, c.selectable, p, l.id === this.sel.picked);
    this.drawLabels(g, nodes, taken);
  }

  private drawNode(g: CanvasRenderingContext2D, l: Level, locked: string | undefined, selectable: boolean, p: MapPoint, picked: boolean): void {
    // The stalk to the ground, and its foot.
    g.strokeStyle = "#ffffff33";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(p.x, p.gy);
    g.lineTo(p.x, p.y);
    g.stroke();
    const r = l.state === "jugable" ? 11 : 9;
    const fill = l.state === "jugable" ? "#58d6ff" : l.state === "en-construccion" ? "#ffd27f" : "#5d6b73";
    g.beginPath();
    if (l.id === "espacio") {
      // Space: a ring for the orbit round its node.
      g.ellipse(p.x, p.y, r + 7, (r + 7) * 0.4, -0.3, 0, Math.PI * 2);
      g.strokeStyle = "#58d6ff88";
      g.stroke();
      g.beginPath();
    }
    g.arc(p.x, p.y, r, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
    if (!selectable) {
      // Later: a struck-through ring (shape, not only colour: reglas.md §5.6).
      g.strokeStyle = "#c9d4da";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(p.x - r * 0.7, p.y + r * 0.7);
      g.lineTo(p.x + r * 0.7, p.y - r * 0.7);
      g.stroke();
    } else if (locked) {
      // Being built: a dashed ring.
      g.setLineDash([3, 3]);
      g.strokeStyle = "#ffd27f";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
    }
    if (picked) {
      g.beginPath();
      g.arc(p.x, p.y, r + 7, 0, Math.PI * 2);
      g.strokeStyle = "#ffd23f";
      g.lineWidth = 2;
      g.stroke();
    }
    g.fillStyle = "#001018";
    g.font = "bold 11px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(l.number), p.x, p.y + 0.5);
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    this.screen.push({ id: l.id, x: p.x, y: p.y });
  }

  /**
   * The names beside the nodes: the picked one first, then the playable one, then the nearest; a name that would
   * cover one already written, or the hint, is left out (its node's number and its card still say it).
   */
  private drawLabels(g: CanvasRenderingContext2D, nodes: readonly { l: Level; c: LevelChoice; p: MapPoint }[], taken: Box[]): void {
    const rank = (n: { l: Level }) => (n.l.id === this.sel.picked ? 2 : n.l.state === "jugable" ? 1 : 0);
    g.textBaseline = "middle";
    g.textAlign = "left";
    for (const n of [...nodes].sort((a, b) => rank(b) - rank(a) || b.p.depth - a.p.depth)) {
      const picked = n.l.id === this.sel.picked;
      const r = n.l.state === "jugable" ? 11 : 9;
      const text = n.l.name.replace(/^Santuario /, "");
      g.font = `${picked ? "700 " : ""}12px system-ui, sans-serif`;
      const x = n.p.x + r + 8;
      const box = { l: x - 2, r: x + g.measureText(text).width + 2, t: n.p.y - 8, b: n.p.y + 8 };
      if (taken.some((o) => overlaps(box, o))) continue;
      taken.push(box);
      g.lineWidth = 3;
      g.strokeStyle = "#02060acc";
      g.strokeText(text, x, n.p.y);
      g.fillStyle = picked ? "#ffd23f" : n.c.selectable ? "#e6f6ff" : "#9fb3bd";
      g.fillText(text, x, n.p.y);
    }
    g.textBaseline = "alphabetic";
  }
}
